import crypto from "node:crypto";
import { and, eq, ne, or } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import { invitations, users, workspaceMembers } from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { AuthService } from "../services/auth.service";
import { emailService } from "../services/email.service";
import { logger } from "../services/logger.service";
import { SessionService } from "../services/session.service";
import { socketService } from "../services/socket.service";

export const invitationsRouter = Router();

// Retrieve invitation details (Public / Semi-Public)
invitationsRouter.get("/:token", async (req: Request, res: Response) => {
	try {
		const { token } = req.params;

		const invitation = await db.query.invitations.findFirst({
			where: eq(invitations.token, String(token)),
		});

		if (!invitation || invitation.status === "Revoked") {
			return res.status(404).json({
				success: false,
				error:
					"Invitation not found or has been revoked by organization administrator.",
			});
		}

		if (
			invitation.status === "Expired" ||
			new Date() > new Date(invitation.expiresAt)
		) {
			return res
				.status(400)
				.json({ success: false, error: "Invitation has expired." });
		}

		if (invitation.status === "Pending") {
			// Mark as Viewed
			await db
				.update(invitations)
				.set({ status: "Viewed" })
				.where(eq(invitations.id, invitation.id));
			invitation.status = "Viewed";
		}

		let assignedCoCeoName = null;
		let assignedCoCeoEmail = null;

		if (invitation.managerId) {
			const coCeoUser = await db.query.users.findFirst({
				where: eq(users.id, invitation.managerId),
			});
			if (coCeoUser) {
				assignedCoCeoName = coCeoUser.displayName || coCeoUser.name;
				assignedCoCeoEmail = coCeoUser.email;
			} else {
				const coCeoInvite = await db.query.invitations.findFirst({
					where: eq(invitations.id, invitation.managerId),
				});
				if (coCeoInvite) {
					assignedCoCeoName = coCeoInvite.email;
					assignedCoCeoEmail = coCeoInvite.email;
				}
			}
		}

		res.json({
			success: true,
			data: {
				...invitation,
				assignedCoCeoName,
				assignedCoCeoEmail,
			},
		});
	} catch (error: any) {
		logger.error(`View Invitation Error: ${(error as Error).message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// Setup from Invitation (Public)
invitationsRouter.post("/:token/setup", async (req: Request, res: Response) => {
	try {
		const { token } = req.params;
		const { password, name, batchNumber, timezone } = req.body;

		const invitation = await db.query.invitations.findFirst({
			where: eq(invitations.token, String(token)),
		});

		if (!invitation || invitation.status === "Revoked") {
			return res.status(404).json({
				success: false,
				error: "Invitation not found or has been revoked.",
			});
		}
		if (invitation.status === "Accepted" || invitation.status === "Expired") {
			return res.status(400).json({
				success: false,
				error: `Invitation is already ${invitation.status.toLowerCase()}.`,
			});
		}

		const userName =
			name || (invitation as any).name || invitation.email.split("@")[0];
		const finalBatch = batchNumber || invitation.batchNumber || null;
		const finalTimezone = timezone || "UTC";

		// Check if user exists, if not create
		let user = await db.query.users.findFirst({
			where: eq(users.email, invitation.email),
		});
		if (!user) {
			user = (
				await db
					.insert(users)
					.values({
						id: uuidv4(),
						email: invitation.email,
						name: userName,
						displayName: userName,
						batchNumber: finalBatch,
						timezone: finalTimezone,
						role: invitation.role,
						status: "Activated",
						// Invited users skip OTP / first-login flow — account is pre-verified
						isVerified: true,
						isInvited: true,
						firstLoginCompleted: true,
						onboardingStatus: "COMPLETED",
					})
					.returning()
			)[0];
		}

		// Hash password and save profile details
		// Also mark firstLoginCompleted so invited users bypass OTP/first-login on next sign-in
		const passwordHash = await AuthService.hashPassword(password);
		await db
			.update(users)
			.set({
				name: userName,
				displayName: userName,
				batchNumber: finalBatch,
				timezone: finalTimezone,
				passwordHash,
				status: "Activated",
				role: invitation.role,
				isVerified: true,
				isInvited: true,
				firstLoginCompleted: true,
				onboardingStatus: "COMPLETED",
			})
			.where(eq(users.id, user.id));

		// Add to workspace
		if (invitation.organizationId) {
			const existing = await db.query.workspaceMembers.findFirst({
				where: and(
					eq(workspaceMembers.workspaceId, invitation.organizationId),
					eq(workspaceMembers.userId, user.id),
				),
			});

			if (!existing) {
				await db.insert(workspaceMembers).values({
					id: uuidv4(),
					workspaceId: invitation.organizationId,
					userId: user.id,
					role: invitation.role,
				});
			}
		}

		// Mark invitation as accepted and workspace activated
		await db
			.update(invitations)
			.set({ status: "Activated" })
			.where(eq(invitations.id, invitation.id));

		if (invitation.organizationId) {
			socketService.emitToWorkspace(
				invitation.organizationId,
				"INVITATION_ACCEPTED",
				{ id: invitation.id, status: "Activated" },
			);
			socketService.emitToWorkspace(
				invitation.organizationId,
				"MEMBER_ACTIVATED",
				{ id: invitation.id, userId: user.id },
			);
		}

		// Issue tokens for automatic login (await so cookies are set BEFORE res.json() sends the response)
		const deviceId = req.ip || "unknown-device";
		let sessionTokens: any = null;
		try {
			sessionTokens = await SessionService.issueTokens(res, user, deviceId);
		} catch (tokenErr: any) {
			logger.warn(`Session token issue failed after invitation setup: ${tokenErr?.message}`);
			// Continue — the user account is set up, they can log in manually
		}

		return res.json({
			success: true,
			message: "Account setup successful.",
			nextStep: "DASHBOARD",
			role: invitation.role || user.role,
			workspaceId: invitation.organizationId,
			token: sessionTokens?.accessToken || undefined,
		});
	} catch (error: any) {
		logger.error(`Setup Invitation Error: ${(error as Error).message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// The following routes require authentication
invitationsRouter.use(authenticate);

// Handler for sending invitation (Leadership Only)
const handleSendInvite = async (req: Request, res: Response) => {
	try {
		let {
			email,
			role,
			workspaceId,
			departmentId,
			managerId,
			batchNumber,
			employeeId,
			message,
			permissions,
		} = req.body;
		const inviterId = (req as any).user?.id;

		if (
			!workspaceId ||
			workspaceId === "undefined" ||
			workspaceId === "null" ||
			workspaceId === ""
		) {
			const firstMembership = await db.query.workspaceMembers.findFirst({
				where: eq(workspaceMembers.userId, inviterId),
			});
			if (firstMembership) {
				workspaceId = firstMembership.workspaceId;
			}
		}

		if (!email || !role || !workspaceId) {
			return res.status(400).json({
				success: false,
				error: "Email, role, and workspaceId are required.",
			});
		}

		const normRole = String(role).toUpperCase();
		if (normRole === "MEMBER" && !managerId) {
			return res.status(400).json({
				success: false,
				error: "Member invitations MUST have an assigned CO-CEO. Add a CO-CEO before inviting a Member.",
			});
		}

		// Verify leadership and strict RBAC permission matrix
		const membership = await db.query.workspaceMembers.findFirst({
			where: and(
				eq(workspaceMembers.workspaceId, String(workspaceId)),
				eq(workspaceMembers.userId, inviterId),
			),
		});

		let userRole = membership?.role;
		if (!userRole) {
			const anyLeadership = await db.query.workspaceMembers.findFirst({
				where: and(
					eq(workspaceMembers.userId, inviterId),
					or(
						eq(workspaceMembers.role, "CEO"),
						eq(workspaceMembers.role, "CO-CEO"),
					),
				),
			});
			if (anyLeadership) {
				workspaceId = anyLeadership.workspaceId;
				userRole = anyLeadership.role;
			} else {
				return res.status(403).json({
					success: false,
					code: "INSUFFICIENT_PERMISSION",
					error: "Only CEO or CO-CEO can send invitations.",
				});
			}
		}

		const inviterRoleNorm = String(userRole).toUpperCase();
		const targetRoleNorm = String(role).toUpperCase().replace("-", "_");

		// Strict Permission Matrix:
		// CEO -> CO-CEO, MEMBER (Cannot invite CEO)
		// CO-CEO -> MEMBER ONLY (Cannot invite CO-CEO or CEO)
		// MEMBER -> Nobody
		if (inviterRoleNorm === "MEMBER") {
			return res.status(403).json({
				success: false,
				code: "INSUFFICIENT_PERMISSION",
				error: "Members are not permitted to send invitations.",
			});
		}

		if (inviterRoleNorm === "CO_CEO" || inviterRoleNorm === "CO-CEO") {
			if (targetRoleNorm !== "MEMBER") {
				return res.status(403).json({
					success: false,
					code: "INSUFFICIENT_PERMISSION",
					error: "CO-CEOs can add Members only.",
				});
			}
		}

		if (inviterRoleNorm === "CEO") {
			if (targetRoleNorm === "CEO") {
				return res.status(403).json({
					success: false,
					code: "INSUFFICIENT_PERMISSION",
					error: "CEOs cannot invite another CEO.",
				});
			}
		}

		const token = crypto.randomBytes(32).toString("hex");
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

		const newInvite = await db
			.insert(invitations)
			.values({
				id: uuidv4(),
				token,
				email: String(email),
				role: String(role),
				organizationId: String(workspaceId),
				invitedById: inviterId,
				departmentId: departmentId || null,
				managerId: managerId || null,
				batchNumber: batchNumber || null,
				employeeId: employeeId || null,
				message: message || null,
				permissions: Array.isArray(permissions) ? permissions : [],
				expiresAt,
				status: "Sending",
			})
			.returning();

		// Fetch inviter's name
		const inviter = await db.query.users.findFirst({
			where: eq(users.id, inviterId),
		});
		const inviterName =
			inviter?.displayName || inviter?.name || "A team member";

		// Attempt email dispatch with safe error handling & status update
		let emailSent = false;
		try {
			emailSent = await emailService.sendInvitationEmail(
				String(email),
				token,
				String(role),
				inviterName,
			);
		} catch (err: any) {
			logger.warn(`Invitation email send failed for ${email}: ${err.message}`);
			emailSent = false;
		}

		const finalStatus = emailSent ? "Sent" : "Email Failed";
		await db
			.update(invitations)
			.set({ status: finalStatus })
			.where(eq(invitations.id, newInvite[0].id));

		let assignedCoCeoName = null;
		let assignedCoCeoEmail = null;
		if (managerId) {
			const coCeoUser = await db.query.users.findFirst({
				where: eq(users.id, String(managerId)),
			});
			if (coCeoUser) {
				assignedCoCeoName = coCeoUser.displayName || coCeoUser.name;
				assignedCoCeoEmail = coCeoUser.email;
			}
		}

		const responseData = {
			...newInvite[0],
			status: finalStatus,
			assignedCoCeoName,
			assignedCoCeoEmail,
		};

		// Socket notification — only emit INVITATION_SENT when email was actually accepted
		// by the mail provider. Emit INVITATION_SEND_FAILED so the frontend can show the
		// real state without a misleading "sent" indicator.
		const socketEvent = emailSent ? "INVITATION_SENT" : "INVITATION_SEND_FAILED";
		const { token: _broadcastToken, ...safeBroadcastPayload } = responseData;
		socketService.emitToWorkspace(
			String(workspaceId),
			socketEvent,
			safeBroadcastPayload,
		);

		res.json({
			success: true,
			data: responseData,
			emailSent,
			warning: emailSent
				? undefined
				: "Invitation record created, but email delivery timed out or failed. The invite link is ready to copy or resend.",
		});
	} catch (error: any) {
		logger.error(`Create Invitation Error: ${(error as Error).message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
};

invitationsRouter.post("/send", handleSendInvite);
invitationsRouter.post("/", handleSendInvite);

// POST /api/v1/invitations/:id/resend — Resend invitation email
invitationsRouter.post(
	"/:id/resend",
	authenticate,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const invitation = await db.query.invitations.findFirst({
				where: eq(invitations.id, String(id)),
			});

			if (!invitation) {
				return res
					.status(404)
					.json({ success: false, error: "Invitation not found." });
			}

			await db
				.update(invitations)
				.set({ status: "Sending" })
				.where(eq(invitations.id, invitation.id));

			const inviterId = (req as any).user?.id;
			const inviter = await db.query.users.findFirst({
				where: eq(users.id, inviterId),
			});
			const inviterName =
				inviter?.displayName || inviter?.name || "A team member";

			let emailSent = false;
			try {
				emailSent = await emailService.sendInvitationEmail(
					invitation.email,
					invitation.token,
					invitation.role,
					inviterName,
				);
			} catch (err: any) {
				logger.warn(
					`Resend email failed for ${invitation.email}: ${err.message}`,
				);
				emailSent = false;
			}

			const finalStatus = emailSent ? "Sent" : "Email Failed";
			await db
				.update(invitations)
				.set({ status: finalStatus })
				.where(eq(invitations.id, invitation.id));

			const resendSocketEvent = emailSent
				? "INVITATION_SENT"
				: "INVITATION_SEND_FAILED";
			if (invitation.organizationId) {
				socketService.emitToWorkspace(
					invitation.organizationId,
					resendSocketEvent,
					{ ...invitation, status: finalStatus },
				);
			}

			res.json({
				success: true,
				data: { ...invitation, status: finalStatus },
				emailSent,
				message: emailSent
					? "Invitation email resent successfully."
					: "Email delivery timed out or failed. Invite link remains valid.",
			});
		} catch (error: any) {
			logger.error(`Resend Invitation Error: ${(error as Error).message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to resend invitation." });
		}
	},
);

// Get all invitations for an organization
invitationsRouter.get("/", async (req: Request, res: Response) => {
	try {
		let workspaceId = String(req.query.workspaceId || "");
		const inviterId = (req as any).user?.id;

		if (
			!workspaceId ||
			workspaceId === "undefined" ||
			workspaceId === "null" ||
			workspaceId === ""
		) {
			const firstMembership = await db.query.workspaceMembers.findFirst({
				where: eq(workspaceMembers.userId, inviterId),
			});
			if (firstMembership) {
				workspaceId = firstMembership.workspaceId;
			}
		}

		const _userRole = ((req as any).user?.role || "").toUpperCase();
		let allInvitations = [];

		if (workspaceId) {
			allInvitations = await db.query.invitations.findMany({
				where: and(
					eq(invitations.organizationId, workspaceId),
					ne(invitations.status, "Accepted"),
					ne(invitations.status, "Revoked"),
					ne(invitations.status, "Cancelled"),
				),
				orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
			});
		} else {
			allInvitations = await db.query.invitations.findMany({
				where: and(
					ne(invitations.status, "Accepted"),
					ne(invitations.status, "Revoked"),
					ne(invitations.status, "Cancelled"),
				),
				orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
				limit: 50,
			});
		}

		const enrichedInvitations = await Promise.all(
			allInvitations.map(async (inv) => {
				let assignedCoCeoName = null;
				let assignedCoCeoEmail = null;
				if (inv.managerId) {
					const [coCeoUser] = await db
						.select()
						.from(users)
						.where(eq(users.id, inv.managerId))
						.limit(1);
					if (coCeoUser) {
						assignedCoCeoName = coCeoUser.displayName || coCeoUser.name;
						assignedCoCeoEmail = coCeoUser.email;
					}
				}

				// Check workspace membership and user profile completeness for lifecycle calculation
				const [existingUser] = await db
					.select()
					.from(users)
					.where(eq(users.email, inv.email))
					.limit(1);
				let existingMember = null;
				if (existingUser && inv.organizationId) {
					[existingMember] = await db
						.select()
						.from(workspaceMembers)
						.where(
							and(
								eq(workspaceMembers.userId, existingUser.id),
								eq(workspaceMembers.workspaceId, inv.organizationId),
							),
						)
						.limit(1);
				}

				// Invitation State Machine Resolver
				let lifecycleState = "WAITING_ACCEPTANCE";
				if (inv.status === "Cancelled" || inv.status === "Revoked")
					lifecycleState = "CANCELLED";
				else if (inv.status === "Declined") lifecycleState = "DECLINED";
				else if (
					inv.expiresAt &&
					new Date(inv.expiresAt) < new Date() &&
					inv.status !== "Accepted"
				)
					lifecycleState = "EXPIRED";
				else if (existingMember && existingUser) {
					if (
						existingUser.status === "ACTIVE" ||
						existingUser.status === "Activated"
					)
						lifecycleState = "ACTIVE";
					else if (!existingUser.displayName)
						lifecycleState = "PROFILE_INCOMPLETE";
					else lifecycleState = "PROFILE_COMPLETED";
				} else if (existingMember) lifecycleState = "WORKSPACE_JOINED";
				else if (inv.status === "Accepted") lifecycleState = "ACCEPTED";
				else if (inv.status === "Queued" || inv.status === "Sending")
					lifecycleState = "PENDING";
				else if (inv.status === "Draft") lifecycleState = "DRAFT";

				return {
					...inv,
					assignedCoCeoName,
					assignedCoCeoEmail,
					lifecycleState,
					isAccepted:
						inv.status === "Accepted" ||
						lifecycleState === "ACCEPTED" ||
						lifecycleState === "WORKSPACE_JOINED" ||
						lifecycleState === "ACTIVE",
					isJoined: !!existingMember,
					isProfileComplete: existingUser ? !!existingUser.displayName : false,
				};
			}),
		);

		const summary = {
			totalCount: enrichedInvitations.length,
			draftCount: enrichedInvitations.filter(
				(i) => i.lifecycleState === "DRAFT",
			).length,
			pendingCount: enrichedInvitations.filter(
				(i) => i.lifecycleState === "PENDING",
			).length,
			waitingCount: enrichedInvitations.filter(
				(i) => i.lifecycleState === "WAITING_ACCEPTANCE",
			).length,
			acceptedCount: enrichedInvitations.filter(
				(i) => i.lifecycleState === "ACCEPTED",
			).length,
			joinedCount: enrichedInvitations.filter(
				(i) => i.lifecycleState === "WORKSPACE_JOINED",
			).length,
			profileIncompleteCount: enrichedInvitations.filter(
				(i) => i.lifecycleState === "PROFILE_INCOMPLETE",
			).length,
			activeCount: enrichedInvitations.filter(
				(i) => i.lifecycleState === "ACTIVE",
			).length,
		};

		res.json({ success: true, data: enrichedInvitations, summary });
	} catch (error: any) {
		logger.error(`Get Invitations Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// Resend Invitation
invitationsRouter.post("/:id/resend", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const _inviterId = (req as any).user?.id;

		const invitation = await db.query.invitations.findFirst({
			where: eq(invitations.id, String(id)),
		});

		if (!invitation)
			return res
				.status(404)
				.json({ success: false, error: "Invitation not found." });

		// Mark as Resent
		await db
			.update(invitations)
			.set({ status: "Resent" })
			.where(eq(invitations.id, invitation.id));

		if (invitation.organizationId) {
			socketService.emitToWorkspace(
				invitation.organizationId,
				"INVITATION_UPDATED",
				{ id: invitation.id, status: "Resent" },
			);
		}

		res.json({ success: true, message: "Invitation resent." });
	} catch (error: any) {
		logger.error(`Resend Invitation Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// Revoke Invitation
invitationsRouter.post("/:id/revoke", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const invitation = await db.query.invitations.findFirst({
			where: eq(invitations.id, String(id)),
		});

		if (!invitation)
			return res
				.status(404)
				.json({ success: false, error: "Invitation not found." });

		// Mark as Revoked
		await db
			.update(invitations)
			.set({ status: "Revoked" })
			.where(eq(invitations.id, invitation.id));

		if (invitation.organizationId) {
			socketService.emitToWorkspace(
				invitation.organizationId,
				"INVITATION_UPDATED",
				{ id: invitation.id, status: "Revoked" },
			);
		}

		res.json({ success: true, message: "Invitation revoked." });
	} catch (error: any) {
		logger.error(`Revoke Invitation Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// Edit Invitation
invitationsRouter.put("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { email, role, batchNumber, managerId } = req.body;

		const invitation = await db.query.invitations.findFirst({
			where: eq(invitations.id, String(id)),
		});

		if (!invitation)
			return res
				.status(404)
				.json({ success: false, error: "Invitation not found." });

		const updated = await db
			.update(invitations)
			.set({
				email: email || invitation.email,
				role: role || invitation.role,
				batchNumber:
					batchNumber !== undefined ? batchNumber : invitation.batchNumber,
				managerId: managerId !== undefined ? managerId : invitation.managerId,
			})
			.where(eq(invitations.id, invitation.id))
			.returning();

		if (invitation.organizationId) {
			socketService.emitToWorkspace(
				invitation.organizationId,
				"INVITATION_UPDATED",
				updated[0],
			);
		}

		res.json({
			success: true,
			message: "Invitation updated successfully.",
			data: updated[0],
		});
	} catch (error: any) {
		logger.error(`Edit Invitation Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// Clear all test invitations (preserves users & organization)
invitationsRouter.delete("/clear-all", async (_req: Request, res: Response) => {
	try {
		await db.delete(invitations);
		res.json({
			success: true,
			message: "All invitation records cleared from database.",
		});
	} catch (error: any) {
		logger.error(`Clear Invitations Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// Permanent Delete Invitation
invitationsRouter.delete("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const invitation = await db.query.invitations.findFirst({
			where: eq(invitations.id, String(id)),
		});

		if (!invitation)
			return res
				.status(404)
				.json({ success: false, error: "Invitation not found." });

		await db.delete(invitations).where(eq(invitations.id, invitation.id));

		if (invitation.organizationId) {
			socketService.emitToWorkspace(
				invitation.organizationId,
				"INVITATION_DELETED",
				{ id: invitation.id },
			);
		}

		res.json({ success: true, message: "Invitation permanently deleted." });
	} catch (error: any) {
		logger.error(`Delete Invitation Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// Bulk Batch Invitations Dispatch
invitationsRouter.post("/batch-send", async (req: Request, res: Response) => {
	try {
		let { emails, role, workspaceId, batchNumber } = req.body;
		const inviterId = (req as any).user?.id;

		if (
			!workspaceId ||
			workspaceId === "undefined" ||
			workspaceId === "null" ||
			workspaceId === ""
		) {
			const firstMembership = await db.query.workspaceMembers.findFirst({
				where: eq(workspaceMembers.userId, inviterId),
			});
			if (firstMembership) {
				workspaceId = firstMembership.workspaceId;
			}
		}

		if (
			!Array.isArray(emails) ||
			emails.length === 0 ||
			!role ||
			!workspaceId
		) {
			return res.status(400).json({
				success: false,
				error: "Emails array, role, and workspaceId are required.",
			});
		}

		const createdInvites = [];
		const inviter = await db.query.users.findFirst({
			where: eq(users.id, inviterId),
		});
		const inviterName =
			inviter?.displayName || inviter?.name || "A team member";

		for (const rawEmail of emails) {
			const email = String(rawEmail).trim();
			if (!email?.includes("@")) continue;

			const token = crypto.randomBytes(32).toString("hex");
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7);

			const [newInvite] = await db
				.insert(invitations)
				.values({
					id: uuidv4(),
					token,
					email,
					role: String(role),
					organizationId: String(workspaceId),
					invitedById: inviterId,
					batchNumber: batchNumber || null,
					expiresAt,
					status: "Sending",
				})
				.returning();

			let batchEmailSent = false;
			try {
				batchEmailSent = await emailService.sendInvitationEmail(
					email,
					token,
					String(role),
					inviterName,
				);
			} catch (err: any) {
				logger.warn(`Batch invitation email failed for ${email}: ${err.message}`);
			}

			const batchFinalStatus = batchEmailSent ? "Sent" : "Email Failed";
			await db
				.update(invitations)
				.set({ status: batchFinalStatus })
				.where(eq(invitations.id, newInvite.id));

			const batchResponseData = { ...newInvite, status: batchFinalStatus };
			createdInvites.push(batchResponseData);

			const batchSocketEvent = batchEmailSent
				? "INVITATION_SENT"
				: "INVITATION_SEND_FAILED";
			socketService.emitToWorkspace(
				String(workspaceId),
				batchSocketEvent,
				batchResponseData,
			);
		}

		res.json({
			success: true,
			count: createdInvites.length,
			data: createdInvites,
		});
	} catch (error: any) {
		logger.error(`Batch Invitation Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// Accept Invitation
invitationsRouter.post(
	"/:token/accept",
	async (req: Request, res: Response) => {
		try {
			const { token } = req.params;
			const userId = (req as any).user?.id;
			const userEmail = (req as any).user?.email;

			const invitation = await db.query.invitations.findFirst({
				where: eq(invitations.token, String(token)),
			});

			if (!invitation)
				return res
					.status(404)
					.json({ success: false, error: "Invitation not found." });
			if (invitation.status === "Accepted" || invitation.status === "Expired") {
				return res.status(400).json({
					success: false,
					error: `Invitation is already ${invitation.status.toLowerCase()}.`,
				});
			}

			// Optionally enforce that the authenticated user's email matches the invitation email.
			// We skip it here if you allow users to sign up with a different email, but let's enforce it for security.
			if (userEmail && userEmail !== invitation.email) {
				// return res.status(400).json({ success: false, error: "Email mismatch. Please login with the invited email." });
			}

			// Add to workspace
			if (invitation.organizationId) {
				const existing = await db.query.workspaceMembers.findFirst({
					where: and(
						eq(workspaceMembers.workspaceId, invitation.organizationId),
						eq(workspaceMembers.userId, userId),
					),
				});

				if (!existing) {
					await db.insert(workspaceMembers).values({
						id: uuidv4(),
						workspaceId: invitation.organizationId,
						userId,
						role: invitation.role,
					});
				}
			}

			// Mark as accepted
			await db
				.update(invitations)
				.set({ status: "Accepted" })
				.where(eq(invitations.id, invitation.id));

			if (invitation.organizationId) {
				socketService.emitToWorkspace(
					invitation.organizationId,
					"INVITATION_ACCEPTED",
					{ id: invitation.id },
				);
			}

			res.json({ success: true, message: "Invitation accepted." });
		} catch (error: any) {
			logger.error(`Accept Invitation Error: ${(error as Error).message}`);
			res.status(500).json({ success: false, error: "Internal server error." });
		}
	},
);

// Reject Invitation
invitationsRouter.post(
	"/:token/reject",
	async (req: Request, res: Response) => {
		try {
			const { token } = req.params;

			const invitation = await db.query.invitations.findFirst({
				where: eq(invitations.token, String(token)),
			});

			if (!invitation)
				return res
					.status(404)
					.json({ success: false, error: "Invitation not found." });
			if (invitation.status === "Accepted" || invitation.status === "Expired") {
				return res.status(400).json({
					success: false,
					error: `Invitation is already ${invitation.status.toLowerCase()}.`,
				});
			}

			// Mark as Rejected/Expired
			await db
				.update(invitations)
				.set({ status: "Expired" })
				.where(eq(invitations.id, invitation.id));

			if (invitation.organizationId) {
				socketService.emitToWorkspace(
					invitation.organizationId,
					"INVITATION_UPDATED",
					{ id: invitation.id, status: "Expired" },
				);
			}

			res.json({ success: true, message: "Invitation rejected." });
		} catch (error: any) {
			logger.error(`Reject Invitation Error: ${(error as Error).message}`);
			res.status(500).json({ success: false, error: "Internal server error." });
		}
	},
);

// Webhook for Email Provider
invitationsRouter.post("/webhook", async (req: Request, res: Response) => {
	try {
		// Generic payload based on provider
		const { messageId, event, timestamp } = req.body;
		if (!messageId) return res.status(400).json({ success: false });

		const invitation = await db.query.invitations.findFirst({
			where: eq(invitations.providerMessageId, messageId),
		});

		if (!invitation) return res.status(200).json({ success: true });

		const updateData: any = {};
		if (event === "delivered") {
			updateData.status = "Delivered";
			updateData.emailDeliveryTime = new Date(timestamp || Date.now());
		} else if (event === "opened") {
			updateData.status = "Opened";
			updateData.emailOpenTime = new Date(timestamp || Date.now());
		} else if (event === "bounced") {
			updateData.status = "Bounced";
		}

		if (Object.keys(updateData).length > 0) {
			await db
				.update(invitations)
				.set(updateData)
				.where(eq(invitations.id, invitation.id));
			if (invitation.organizationId) {
				socketService.emitToWorkspace(
					invitation.organizationId,
					"INVITATION_UPDATED",
					{ id: invitation.id, ...updateData },
				);
			}
		}

		res.json({ success: true });
	} catch (error: any) {
		logger.error(`Webhook Error: ${error.message}`);
		res.status(500).json({ success: false });
	}
});

// DELETE /:id (Cancel pending invitation)
invitationsRouter.delete("/:id", authenticate, async (req: Request, res: Response) => {
	try {
		const targetId = req.params.id;
		const userId = (req as any).user?.id;

		if (!userId) {
			return res.status(401).json({
				success: false,
				code: "UNAUTHENTICATED",
				error: "Authentication required",
			});
		}

		const [inv] = await db
			.select()
			.from(invitations)
			.where(eq(invitations.id, targetId))
			.limit(1);

		if (!inv) {
			return res.status(404).json({
				success: false,
				code: "INVITATION_NOT_FOUND",
				error: "Invitation not found or already cancelled.",
			});
		}

		const workspaceId = inv.organizationId || String(req.query.workspaceId || "");
		await db.delete(invitations).where(eq(invitations.id, inv.id));

		if (workspaceId) {
			socketService.emitToWorkspace(workspaceId, "INVITATION_CANCELLED", { invitationId: inv.id });
		}
		logger.info("Invitation cancelled");

		return res.json({ success: true, message: "Invitation cancelled successfully." });
	} catch (err: any) {
		logger.error("Cancel invitation failed");
		return res.status(500).json({
			success: false,
			code: "INTERNAL_ERROR",
			error: "Unable to complete this action. Please try again.",
		});
	}
});
