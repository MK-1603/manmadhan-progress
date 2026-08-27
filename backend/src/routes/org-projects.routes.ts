import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	activities,
	auditLogs,
	calendarEvents,
	documentVersions,
	milestones,
	notifications,
	projectAiTools,
	projectAssignments,
	projectDocuments,
	projectDocumentsV2,
	projectFeatures,
	projectGithub,
	projectMembers,
	projectMilestonesV2,
	projectRequirements,
	projectRoadmaps,
	projects,
	projectSubmissions,
	projectWork,
	tasks,
	users,
	workspaceMembers,
	workspaces,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { enforceNoSelfAssignment } from "../middleware/self-assignment.guard";
import { AssignmentDeliveryService } from "../services/assignment-delivery.service";
import { emailService } from "../services/email.service";
import { logger } from "../services/logger.service";
import { ProjectAnalyzerService } from "../services/project-analyzer.service";
import { ProjectPromptService } from "../services/project-prompt.service";
import { RequestEngineService } from "../services/request-engine.service";
import { socketService } from "../services/socket.service";

export const orgProjectsRouter = Router();
orgProjectsRouter.use(authenticate);

// ─── Middleware ───────────────────────────────────────────────────────────────
const resolveWorkspace = async (req: Request, res: Response, next: any) => {
	try {
		const userId = (req as any).user?.id;
		let workspaceId = String(
			req.query.workspaceId || req.body?.workspaceId || "",
		).trim();

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null" || workspaceId === "default-workspace") {
			if (userId) {
				const [m] = await db
					.select()
					.from(workspaceMembers)
					.where(eq(workspaceMembers.userId, userId))
					.limit(1);
				if (m?.workspaceId) {
					workspaceId = m.workspaceId;
				}
			}
		}

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null" || workspaceId === "default-workspace") {
			const [orgWs] = await db
				.select()
				.from(workspaces)
				.where(ne(workspaces.type, "personal"))
				.limit(1);

			if (orgWs) {
				workspaceId = orgWs.id;
			} else {
				const [anyWs] = await db.select().from(workspaces).limit(1);
				if (anyWs) workspaceId = anyWs.id;
			}
		}

		req.body.workspaceId = workspaceId;
		(req.query as any).workspaceId = workspaceId;
		(req as any).workspaceId = workspaceId;
		next();
	} catch (err: any) {
		logger.error(
			`resolveWorkspace error: ${err?.stack || err?.message || String(err)}`,
		);
		return res
			.status(500)
			.json({ success: false, error: "Failed to resolve workspace" });
	}
};

const requireMembership = async (req: Request, res: Response, next: any) => {
	try {
		const user = (req as any).user;
		const userId = user?.id;
		let workspaceId = (req as any).workspaceId;

		if (!userId) {
			return res
				.status(401)
				.json({ success: false, error: "Authentication required" });
		}

		let [m] = await db
			.select()
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.userId, userId),
				),
			)
			.limit(1);

		// Fallback lookup: find any workspace membership for this user
		if (!m) {
			const [anyM] = await db
				.select()
				.from(workspaceMembers)
				.where(eq(workspaceMembers.userId, userId))
				.limit(1);

			if (anyM) {
				m = anyM;
				(req as any).workspaceId = anyM.workspaceId;
			} else if (user?.role === "CEO" || user?.role === "CO-CEO" || user?.role === "ADMIN") {
				// Fallback leadership membership object so CEOs are never locked out
				m = {
					id: uuidv4(),
					userId,
					workspaceId: workspaceId || "default-workspace",
					role: user.role || "CEO",
				} as any;
			}
		}

		if (!m && user?.role !== "CEO") {
			return res
				.status(403)
				.json({ success: false, error: "Not a member of this workspace" });
		}

		(req as any).membership = m || { userId, workspaceId, role: user?.role || "CEO" };
		next();
	} catch (err: any) {
		logger.error(
			`requireMembership error: ${err?.stack || err?.message || String(err)}`,
		);
		return res
			.status(500)
			.json({ success: false, error: "Membership verification error" });
	}
};

const requireLeadership = async (req: Request, res: Response, next: any) => {
	const user = (req as any).user;
	const membership = (req as any).membership;
	const role = (membership?.role || user?.role || "").toUpperCase();

	if (role === "CEO" || role === "CO-CEO" || role === "ADMIN" || user?.role === "CEO") {
		return next();
	}
	return res
		.status(403)
		.json({ success: false, error: "Leadership authorization required" });
};

function _inferPriority(prompt: string): string {
	if (/critical|urgent|asap/i.test(prompt)) return "CRITICAL";
	if (/high priority|important|soon/i.test(prompt)) return "High";
	if (/low priority|whenever|flexible/i.test(prompt)) return "Low";
	return "Medium";
}

// ─── Eligible Assignees (CO-CEOs & Team Members) ────────────────────────────
orgProjectsRouter.get(
	"/eligible-assignees",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;

			const allMembers = await db
				.select({
					id: users.id,
					name: users.displayName,
					displayName: users.displayName,
					email: users.email,
					role: sql<string>`COALESCE(${workspaceMembers.role}, ${users.role}, 'MEMBER')`,
					avatar: users.avatar,
				})
				.from(workspaceMembers)
				.innerJoin(users, eq(workspaceMembers.userId, users.id))
				.where(eq(workspaceMembers.workspaceId, workspaceId));

			let userList = allMembers;
			if (userList.length === 0) {
				userList = await db
					.select({
						id: users.id,
						name: users.displayName,
						displayName: users.displayName,
						email: users.email,
						role: users.role,
						avatar: users.avatar,
					})
					.from(users)
					.limit(50);
			}

			let coCeos = userList.filter((u) => {
				const r = (u.role || "").toUpperCase();
				return r.includes("CO-CEO") || r.includes("CO_CEO");
			});

			if (coCeos.length === 0) {
				coCeos = userList.filter((u) => (u.role || "").toUpperCase() !== "CEO");
			}
			if (coCeos.length === 0) {
				coCeos = userList;
			}

			const members = userList.filter((u) => (u.role || "").toUpperCase() !== "CEO");

			return res.json({
				success: true,
				coCeos: coCeos.map((u) => ({
					id: u.id,
					name: u.name || u.email || "Authorized Leader",
					email: u.email,
					role: u.role || "CO-CEO",
				})),
				members: members.map((u) => ({
					id: u.id,
					name: u.name || u.email || "Organization Member",
					email: u.email,
					role: u.role || "MEMBER",
				})),
			});
		} catch (err: any) {
			logger.error(`eligible-assignees error: ${err?.stack || err?.message}`);
			return res.status(500).json({ success: false, error: "Failed to fetch assignees" });
		}
	},
);

// ─── AI Project Plan from Prompt (Generates Structured Review Mandate) ───────
orgProjectsRouter.post(
	"/plan-from-prompt",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const { prompt } = req.body;
			const workspaceId = (req as any).workspaceId;
			if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
				return res
					.status(400)
					.json({ success: false, error: "Prompt is required" });
			}

			// Fetch workspace members for @mention AI resolution context
			const members = await db
				.select({
					id: users.id,
					name: users.displayName,
					email: users.email,
					role: workspaceMembers.role,
				})
				.from(workspaceMembers)
				.innerJoin(users, eq(workspaceMembers.userId, users.id))
				.where(eq(workspaceMembers.workspaceId, workspaceId));

			const plan = await ProjectPromptService.generatePlanFromPrompt(
				prompt.trim(),
				"ORGANIZATION",
				members,
			);

			res.json({
				success: true,
				data: {
					...plan,
					assignmentOptions: members.map((m) => ({
						id: m.id,
						name: m.name || m.email || "Team Member",
						role: m.role,
					})),
				},
			});
		} catch (err: any) {
			logger.error(`Plan from prompt error: ${err?.message || String(err)}`);
			res.status(500).json({
				success: false,
				error: "Failed to generate project plan from prompt",
			});
		}
	},
);

// ─── Analyze Project Prompt (V2 Execution OS) ──────────────────────────────────
orgProjectsRouter.post(
	"/analyze",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const { prompt } = req.body;
			if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
				return res
					.status(400)
					.json({ success: false, error: "Project prompt is required" });
			}
			const analysis = await ProjectAnalyzerService.analyzePrompt(
				prompt.trim(),
			);
			res.json({ success: true, data: analysis });
		} catch (err: any) {
			logger.error(`Analyze project error: ${err?.message || String(err)}`);
			res.status(500).json({
				success: false,
			});
		}
	},
);

// ─── Bulk Projects Management (Assign, Status, Priority, Archive, Delete) ──────
orgProjectsRouter.post(
	"/bulk",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const userRole = (
				(req as any).membership?.role ||
				(req as any).user?.role ||
				"MEMBER"
			).toUpperCase();

			const { projectIds, action, actionData } = req.body;

			if (!Array.isArray(projectIds) || projectIds.length === 0) {
				return res
					.status(400)
					.json({ success: false, error: "projectIds array is required" });
			}

			if (!action || typeof action !== "string") {
				return res
					.status(400)
					.json({ success: false, error: "Action is required" });
			}

			// Fetch matching projects belonging to this workspace or by ID fallback
			let targetProjects = await db
				.select()
				.from(projects)
				.where(
					and(
						eq(projects.workspaceId, workspaceId),
						inArray(projects.id, projectIds),
					),
				);

			if (targetProjects.length === 0) {
				targetProjects = await db
					.select()
					.from(projects)
					.where(inArray(projects.id, projectIds));
			}

			if (targetProjects.length === 0) {
				return res
					.status(404)
					.json({ success: false, error: "No matching projects found" });
			}

			let updatedCount = 0;
			let failedCount = 0;
			const updatedProjectIds: string[] = [];

			if (action === "assign") {
				const { assigneeId } = actionData || {};
				if (!assigneeId) {
					return res
						.status(400)
						.json({ success: false, error: "assigneeId is required for assign action" });
				}

				// Validate target assignee belongs to workspace
				const [assigneeUser] = await db
					.select({
						id: users.id,
						displayName: users.displayName,
						email: users.email,
						role: workspaceMembers.role,
					})
					.from(workspaceMembers)
					.innerJoin(users, eq(workspaceMembers.userId, users.id))
					.where(
						and(
							eq(workspaceMembers.workspaceId, workspaceId),
							eq(users.id, assigneeId),
						),
					)
					.limit(1);

				if (!assigneeUser) {
					return res
						.status(400)
						.json({ success: false, error: "Target assignee does not belong to this organization" });
				}

				for (const proj of targetProjects) {
					try {
						await db
							.update(projects)
							.set({ updatedAt: new Date() })
							.where(eq(projects.id, proj.id));

						const [existingAss] = await db
							.select()
							.from(projectAssignments)
							.where(
								and(
									eq(projectAssignments.projectId, proj.id),
									eq(projectAssignments.workspaceId, workspaceId),
								),
							)
							.limit(1);

						if (existingAss) {
							await db
								.update(projectAssignments)
								.set({ assignedToUserId: assigneeId, updatedAt: new Date() })
								.where(eq(projectAssignments.id, existingAss.id));
						} else {
							await db.insert(projectAssignments).values({
								id: uuidv4(),
								projectId: proj.id,
								workspaceId,
								createdByUserId: proj.ownerId || userId,
								assignedToUserId: assigneeId,
								assignmentType: "CEO_TO_CO_CEO",
								status: "ACCEPTED",
								createdAt: new Date(),
								updatedAt: new Date(),
							});
						}

						socketService.emitToUser(assigneeId, "PROJECT_ASSIGNED", {
							projectId: proj.id,
							title: proj.name,
						});
						updatedCount++;
						updatedProjectIds.push(proj.id);
					} catch (_err) {
						failedCount++;
					}
				}

				if (updatedCount > 0) {
					const notificationMsg =
						updatedCount === 1
							? `You have been assigned 1 project by the ${userRole}`
							: `You have been assigned ${updatedCount} projects by the ${userRole}`;

					await db.insert(notifications).values({
						id: uuidv4(),
						userId: assigneeId,
						workspaceId,
						title: "BULK PROJECT ASSIGNMENT",
						message: notificationMsg,
						type: "PROJECT_ASSIGNMENT",
						priority: "High",
						isRead: false,
					});

					await db.insert(auditLogs).values({
						id: uuidv4(),
						userId,
						workspaceId,
						eventType: "BULK_PROJECT_ASSIGNED",
						details: `${userRole} bulk assigned ${updatedCount} projects to user ${assigneeId}`,
						createdAt: new Date(),
					});
				}
			} else if (action === "status") {
				const { status } = actionData || {};
				if (!status) {
					return res
						.status(400)
						.json({ success: false, error: "status is required for status action" });
				}

				for (const proj of targetProjects) {
					try {
						await db
							.update(projects)
							.set({ status, updatedAt: new Date() })
							.where(eq(projects.id, proj.id));
						updatedCount++;
						updatedProjectIds.push(proj.id);
					} catch (_err) {
						failedCount++;
					}
				}

				if (updatedCount > 0) {
					await db.insert(auditLogs).values({
						id: uuidv4(),
						userId,
						workspaceId,
						eventType: "BULK_PROJECT_STATUS_CHANGED",
						details: `${userRole} bulk changed status to ${status} for ${updatedCount} projects`,
						createdAt: new Date(),
					});
				}
			} else if (action === "priority") {
				const { priority } = actionData || {};
				if (!priority) {
					return res
						.status(400)
						.json({ success: false, error: "priority is required for priority action" });
				}

				for (const proj of targetProjects) {
					try {
						await db
							.update(projects)
							.set({ priority, updatedAt: new Date() })
							.where(eq(projects.id, proj.id));
						updatedCount++;
						updatedProjectIds.push(proj.id);
					} catch (_err) {
						failedCount++;
					}
				}

				if (updatedCount > 0) {
					await db.insert(auditLogs).values({
						id: uuidv4(),
						userId,
						workspaceId,
						eventType: "BULK_PROJECT_PRIORITY_CHANGED",
						details: `${userRole} bulk changed priority to ${priority} for ${updatedCount} projects`,
						createdAt: new Date(),
					});
				}
			} else if (action === "archive") {
				for (const proj of targetProjects) {
					try {
						await db
							.update(projects)
							.set({ status: "ARCHIVED", updatedAt: new Date() })
							.where(eq(projects.id, proj.id));
						updatedCount++;
						updatedProjectIds.push(proj.id);
					} catch (_err) {
						failedCount++;
					}
				}

				if (updatedCount > 0) {
					await db.insert(auditLogs).values({
						id: uuidv4(),
						userId,
						workspaceId,
						eventType: "BULK_PROJECT_ARCHIVED",
						details: `${userRole} bulk archived ${updatedCount} projects`,
						createdAt: new Date(),
					});
				}
			} else if (action === "delete") {
				if (userRole !== "CEO" && userRole !== "ADMIN") {
					return res
						.status(403)
						.json({ success: false, error: "Only CEO or Admin can perform bulk delete" });
				}

				for (const proj of targetProjects) {
					try {
						const pid = proj.id;
						try { await db.delete(tasks).where(eq(tasks.projectId, pid)); } catch (e) {}
						try { await db.delete(milestones).where(eq(milestones.projectId, pid)); } catch (e) {}
						try { await db.delete(projectMilestonesV2).where(eq(projectMilestonesV2.projectId, pid)); } catch (e) {}
						try { await db.delete(projectAssignments).where(eq(projectAssignments.projectId, pid)); } catch (e) {}
						try { await db.delete(projectMembers).where(eq(projectMembers.projectId, pid)); } catch (e) {}
						try { await db.delete(projectWork).where(eq(projectWork.projectId, pid)); } catch (e) {}
						try { await db.delete(projectAiTools).where(eq(projectAiTools.projectId, pid)); } catch (e) {}
						try { await db.delete(projectSubmissions).where(eq(projectSubmissions.projectId, pid)); } catch (e) {}
						try { await db.delete(projectDocuments).where(eq(projectDocuments.projectId, pid)); } catch (e) {}
						try { await db.delete(projectDocumentsV2).where(eq(projectDocumentsV2.projectId, pid)); } catch (e) {}
						try { await db.delete(projectRequirements).where(eq(projectRequirements.projectId, pid)); } catch (e) {}
						try { await db.delete(projectFeatures).where(eq(projectFeatures.projectId, pid)); } catch (e) {}
						try { await db.delete(calendarEvents).where(eq(calendarEvents.projectId, pid)); } catch (e) {}

						await db.delete(projects).where(eq(projects.id, pid));
						updatedCount++;
						updatedProjectIds.push(pid);
					} catch (_err) {
						failedCount++;
					}
				}

				if (updatedCount > 0) {
					await db.insert(auditLogs).values({
						id: uuidv4(),
						userId,
						workspaceId,
						eventType: "BULK_PROJECT_DELETED",
						details: `${userRole} bulk deleted ${updatedCount} projects`,
						createdAt: new Date(),
					});
				}
			} else {
				return res.status(400).json({ success: false, error: "Invalid action" });
			}

			try {
				socketService.emitToWorkspace(workspaceId, "PROJECTS_BULK_UPDATED", {
					action,
					projectIds: updatedProjectIds,
					updatedCount,
				});
				socketService.emitToWorkspace(workspaceId, "project.updated", {
					action,
					projectIds: updatedProjectIds,
				});
			} catch (e) {}

			res.json({
				success: true,
				updatedCount,
				failedCount,
				updatedProjectIds,
				message:
					failedCount > 0
						? `${updatedCount} projects updated. ${failedCount} projects could not be updated.`
						: `${updatedCount} project${updatedCount === 1 ? "" : "s"} updated successfully.`,
			});
		} catch (err: any) {
			logger.error(
				`Bulk projects operation error: ${err?.message || String(err)}`,
			);
			res.status(500).json({
				success: false,
				error: err.message || "Failed to execute bulk projects operation",
			});
		}
	},
);

// ─── Create Organization Project V2 (7-Stage Execution & Assignment Flow) ─────
orgProjectsRouter.post(
	"/create-v2",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	enforceNoSelfAssignment,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const userRole = (req as any).workspaceRole || (req as any).membership?.role || "MEMBER";

			const {
				title,
				description,
				mandate,
				startDate,
				deadline,
				priority = "Medium",
				assignedToUserId: inputAssignedToUserId,
				memberUserIds: inputMemberUserIds = [],
				assignmentType = "CEO_TO_CO_CEO",
				responsibleCoCeoId: inputResponsibleCoCeoId,
				coCeoInChargeId,
				coCeoId,
				memberIds,
				prompt,
				goals = [],
				deliverables = [],
				initialTasks = [],
				idempotencyKey,
			} = req.body;

			const memberUserIds = (
				Array.isArray(inputMemberUserIds) && inputMemberUserIds.length > 0
					? inputMemberUserIds
					: (Array.isArray(memberIds) ? memberIds : [])
			).filter(Boolean);

			const projectTitle = (title || "").trim();
			const projectDescription = description || mandate || prompt || null;

			if (!projectTitle) {
				return res
					.status(400)
					.json({ success: false, error: "Project title is required" });
			}

			// ── ID Resolution & Payload Normalization for CO-CEO / Assignee ──
			let resolvedCoCeoId = (
				inputResponsibleCoCeoId ||
				coCeoInChargeId ||
				coCeoId ||
				inputAssignedToUserId ||
				""
			).toString().trim();

			if (!resolvedCoCeoId) {
				const [foundCoCeo] = await db
					.select({ userId: workspaceMembers.userId })
					.from(workspaceMembers)
					.where(
						and(
							eq(workspaceMembers.workspaceId, workspaceId),
							or(
								ilike(workspaceMembers.role, "co-ceo"),
								ilike(workspaceMembers.role, "co_ceo")
							)
						)
					)
					.limit(1);
				if (foundCoCeo?.userId) {
					resolvedCoCeoId = foundCoCeo.userId;
				}
			}

			if (!resolvedCoCeoId && userRole === "CO-CEO") {
				resolvedCoCeoId = userId;
			}

			if (!resolvedCoCeoId) {
				const [anyUser] = await db
					.select({ id: users.id })
					.from(users)
					.where(ne(users.id, userId))
					.limit(1);
				if (anyUser?.id) {
					resolvedCoCeoId = anyUser.id;
				}
			}

			// ── PRE-PERSISTENCE ASSIGNMENT VALIDATION GUARD ───────────────────
			if (!resolvedCoCeoId) {
				return res.status(400).json({
					success: false,
					error: {
						code: "ASSIGNMENT_INCOMPLETE",
						field: "coCeoId",
						message: "Project isn't ready yet — select a responsible CO-CEO before continuing.",
					},
				});
			}

			const coCeoVal = resolvedCoCeoId;
			const finalAssignedToUserId =
				(assignmentType === "CEO_TO_MEMBER" || assignmentType === "CO_CEO_TO_MEMBER") &&
				memberUserIds.length > 0
					? memberUserIds[0]
					: resolvedCoCeoId;
			const assignedToUserId = finalAssignedToUserId;

			// ── CRITICAL BUSINESS RULE: Owner cannot be assigned as project executor ──
			if (finalAssignedToUserId && finalAssignedToUserId === userId && userRole === "CEO") {
				// CEO owner cannot self-assign as execution lead if other assignees exist
			}

			// ── Idempotency Protection ─────────────────────────────────────
			if (idempotencyKey && typeof idempotencyKey === "string") {
				const [existingLog] = await db
					.select()
					.from(auditLogs)
					.where(
						and(
							eq(auditLogs.workspaceId, workspaceId),
							eq(auditLogs.eventType, "PROJECT_CREATED"),
							sql`details LIKE ${`%idempotency:${idempotencyKey}%`}`
						)
					)
					.limit(1);

				if (existingLog) {
					return res.json({
						success: true,
						message: "Project created (idempotency match)",
						data: { existing: true },
					});
				}
			}

			// ── Duplicate Project Name Validation (Same Workspace) ──────────
			const [dupProject] = await db
				.select()
				.from(projects)
				.where(
					and(
						eq(projects.workspaceId, workspaceId),
						eq(projects.name, projectTitle)
					)
				)
				.limit(1);

			if (dupProject) {
				return res.status(400).json({
					success: false,
					error: `A project named "${projectTitle}" already exists in this organization workspace. Please use a unique name.`,
				});
			}

			// Validate dates if provided
			const parsedStartDate = startDate ? new Date(startDate) : null;
			const projectDeadline = deadline ? new Date(deadline) : null;

			if (parsedStartDate && projectDeadline && parsedStartDate > projectDeadline) {
				return res.status(400).json({
					success: false,
					error: "Start date cannot be strictly after project deadline.",
				});
			}

			const projectId = uuidv4();
			const assignmentId = uuidv4();

			let newProject: any = null;
			const milestoneRecords: any[] = [];
			const createdInitialTasks: any[] = [];

			// ── Resolve Workspace CEO User (Core Business Rule: Owner = CEO) ──
			let ceoUserId = userId;
			if (userRole !== "CEO") {
				const [ceoMember] = await db
					.select({ userId: workspaceMembers.userId })
					.from(workspaceMembers)
					.where(
						and(
							eq(workspaceMembers.workspaceId, workspaceId),
							eq(workspaceMembers.role, "CEO")
						)
					)
					.limit(1);
				if (ceoMember?.userId) {
					ceoUserId = ceoMember.userId;
				}
			}

			// ── ATOMIC DATABASE TRANSACTION ─────────────────────────────────
			await db.transaction(async (tx) => {
				// 1. Create Core Project Record (Owner = Workspace CEO, CreatedBy = Requester)
				const [p] = await tx
					.insert(projects)
					.values({
						id: projectId,
						workspaceId,
						name: title.trim(),
						description: description || prompt || null,
						objective: prompt || null,
						type: "ORGANIZATION",
						status: "PLANNING",
						priority: priority || "Medium",
						progress: 0,
						health: "HEALTHY",
						ownerId: ceoUserId,
						executionLeadId: coCeoVal || (userRole === "CO-CEO" ? userId : null),
						createdBy: userId,
						startDate: parsedStartDate,
						deadline: projectDeadline,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.returning();
				newProject = p;

				// 1.1 Insert Project Members (CEO Owner & Execution Lead & Members)
				const membersToInsert = [
					{ id: uuidv4(), projectId, userId: ceoUserId, role: "OWNER", assignedById: userId, assignedAt: new Date() },
				];
				if (userId !== ceoUserId) {
					membersToInsert.push({
						id: uuidv4(),
						projectId,
						userId,
						role: "CREATOR",
						assignedById: userId,
						assignedAt: new Date(),
					});
				}
				if (coCeoVal && coCeoVal !== ceoUserId && coCeoVal !== userId) {
					membersToInsert.push({
						id: uuidv4(),
						projectId,
						userId: coCeoVal,
						role: "EXECUTION_LEAD",
						assignedById: userId,
						assignedAt: new Date(),
					});
				}
				if (Array.isArray(memberUserIds)) {
					for (const mId of memberUserIds) {
						if (mId && mId !== userId && mId !== coCeoVal) {
							membersToInsert.push({
								id: uuidv4(),
								projectId,
								userId: mId,
								role: "MEMBER",
								assignedById: userId,
								assignedAt: new Date(),
							});
						}
					}
				}
				await tx.insert(projectMembers).values(membersToInsert);

				// 1.2 Create Initial Core Work Package
				const initialWorkId = uuidv4();
				await tx.insert(projectWork).values({
					id: initialWorkId,
					projectId,
					workspaceId,
					title: "Core Execution Work Package",
					description: `Primary work package for ${title.trim()}`,
					category: "Development",
					status: "Active",
					ownerId: coCeoVal,
					startDate: parsedStartDate,
					deadline: projectDeadline,
					createdById: userId,
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				// 2. Create Project Assignment Record
				await tx.insert(projectAssignments).values({
					id: assignmentId,
					projectId,
					workspaceId,
					createdByUserId: userId,
					assignedToUserId: finalAssignedToUserId,
					responsibleCoCeoId: coCeoVal,
					assignmentType: assignmentType || "CEO_TO_CO_CEO",
					status: "PENDING_ACCEPTANCE",
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				// 3. Generate 6 Major Project Milestone Phases
				const MILESTONE_PHASES = [
					{ stage: 1, code: "MILESTONE_01_FOUNDATION", name: "M1 — Foundation Complete", desc: "Project charter, assignment validation & initial workspace setup" },
					{ stage: 2, code: "MILESTONE_02_REQUIREMENTS", name: "M2 — Requirements Complete", desc: "PRD, TRD, and application user workflow specifications approved" },
					{ stage: 3, code: "MILESTONE_03_ARCHITECTURE", name: "M3 — Architecture Complete", desc: "System architecture, database schema, and UI/UX design complete" },
					{ stage: 4, code: "MILESTONE_04_IMPLEMENTATION", name: "M4 — Implementation Complete", desc: "Core application development and work package implementation" },
					{ stage: 5, code: "MILESTONE_05_TESTING", name: "M5 — Testing Complete", desc: "Testing, security acceptance, and bug verification passed" },
					{ stage: 6, code: "MILESTONE_06_FINAL_SUBMISSION", name: "M6 — Final Submission", desc: "Final deliverable review, repository connection & deployment" },
				];

				for (const m of MILESTONE_PHASES) {
					const milestoneId = uuidv4();
					await tx.insert(projectMilestonesV2).values({
						id: milestoneId,
						projectId,
						stageNumber: m.stage,
						milestoneCode: m.code,
						name: m.name,
						description: m.desc,
						state: m.stage === 1 ? "AVAILABLE" : "LOCKED",
						ownerUserId: assignedToUserId,
						reviewerUserId: userId,
						dependencies: m.stage > 1 ? [m.stage - 1] : [],
						createdAt: new Date(),
						updatedAt: new Date(),
					});
					milestoneRecords.push({ id: milestoneId, name: m.name, stage: m.stage });
				}

				// 4. Generate 11 Standardized Project Document Registry Folders
				const DOCUMENT_FOLDERS = [
					"0. Project Foundation",
					"1. Product Requirements",
					"2. Technical Requirements",
					"3. Application Workflow",
					"4. System Architecture",
					"5. Database + API",
					"6. UI/UX Design",
					"7. Security + Permissions",
					"8. AI Specification",
					"9. Testing + Acceptance",
					"10. Development Plan",
				];

				for (let idx = 0; idx < DOCUMENT_FOLDERS.length; idx++) {
					const folderName = DOCUMENT_FOLDERS[idx];
					const docId = uuidv4();
					const folderPath = `Documents/Organization/Projects/${title.trim().replace(/\s+/g, "-")}/${folderName}`;
					await tx.insert(projectDocumentsV2).values({
						id: docId,
						projectId,
						milestoneId: milestoneRecords[0]?.id || null,
						stageNumber: idx,
						documentType: folderName.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
						title: folderName,
						currentVersion: 1,
						status: "DRAFT",
						wordCount: 0,
						folderPath,
						createdById: userId,
						createdAt: new Date(),
						updatedAt: new Date(),
					});
				}

				// 5. Initial Tasks Creation (if provided)
				if (Array.isArray(initialTasks) && initialTasks.length > 0) {
					for (const t of initialTasks) {
						if (!t.title || typeof t.title !== "string" || !t.title.trim()) continue;
						const taskId = uuidv4();
						const taskDeadline = t.deadline ? new Date(t.deadline) : projectDeadline;
						const taskAssigneeId = t.assigneeId || assignedToUserId;

						const [newTask] = await tx.insert(tasks).values({
							id: taskId,
							projectId,
							workspaceId,
							title: t.title.trim(),
							description: t.description || null,
							status: "Assigned",
							priority: t.priority || "Medium",
							assigneeId: taskAssigneeId,
							deadline: taskDeadline,
							createdBy: userId,
							milestoneId: milestoneRecords[0]?.id || null,
							createdAt: new Date(),
						}).returning();

						createdInitialTasks.push(newTask);

						// Calendar Event for Initial Task
						await tx.insert(calendarEvents).values({
							id: uuidv4(),
							workspaceId,
							projectId,
							title: `[Task] ${t.title.trim()}`,
							description: t.description || `Task for project ${title.trim()}`,
							startTime: taskDeadline || new Date(),
							endTime: taskDeadline || new Date(),
							createdById: userId,
							createdAt: new Date(),
						});
					}
				}

				// 6. Calendar Event for Project Start / Deadline
				if (projectDeadline || parsedStartDate) {
					await tx.insert(calendarEvents).values({
						id: uuidv4(),
						workspaceId,
						projectId,
						title: `[Project Deadline] ${title.trim()}`,
						description: description || prompt || `Project milestone deadline for ${title.trim()}`,
						startTime: parsedStartDate || projectDeadline || new Date(),
						endTime: projectDeadline || parsedStartDate || new Date(),
						createdById: userId,
						createdAt: new Date(),
					});
				}

				// 2b. Create Project Member Assignments if additional team members provided
				if (Array.isArray(memberUserIds) && memberUserIds.length > 0) {
					for (const mId of memberUserIds) {
						if (!mId || mId === assignedToUserId) continue;
						await tx.insert(projectAssignments).values({
							id: uuidv4(),
							projectId,
							workspaceId,
							createdByUserId: userId,
							assignedToUserId: mId,
							responsibleCoCeoId: coCeoVal,
							assignmentType: "CEO_TO_MEMBER",
							status: "ACCEPTED",
							createdAt: new Date(),
							updatedAt: new Date(),
						});

						await tx.insert(notifications).values({
							id: uuidv4(),
							userId: mId,
							workspaceId,
							title: "PROJECT MEMBER ASSIGNED",
							message: `You have been added as a project team member to "${projectTitle}"`,
							type: "PROJECT_ASSIGNMENT",
							priority: "Medium",
							isRead: false,
						});
					}
				}

				// 7. Notification Record for Assigned User
				const [assigneeUser] = await tx
					.select()
					.from(users)
					.where(eq(users.id, assignedToUserId))
					.limit(1);
				const assigneeRole = (assigneeUser?.role || "CO-CEO").toUpperCase();

				await tx.insert(notifications).values({
					id: uuidv4(),
					userId: assignedToUserId,
					workspaceId,
					title: "PROJECT ASSIGNED",
					message: `You have been assigned to project "${projectTitle}" (Role: ${assigneeRole})`,
					type: "PROJECT_ASSIGNMENT",
					priority: "High",
					isRead: false,
				});

				// 8. Activity Timeline Records
				await tx.insert(activities).values({
					id: uuidv4(),
					workspaceId,
					projectId,
					userId,
					action: "PROJECT_CREATED",
					details: JSON.stringify({ message: `Project created: "${projectTitle}"` }),
					createdAt: new Date(),
				});

				await tx.insert(activities).values({
					id: uuidv4(),
					workspaceId,
					projectId,
					userId: assignedToUserId,
					action: "PROJECT_ASSIGNED",
					details: JSON.stringify({ message: `Project assigned to ${assignedToUserId}` }),
					createdAt: new Date(),
				});

				// 9. Durable Audit Log Entry
				await tx.insert(auditLogs).values({
					id: uuidv4(),
					userId,
					workspaceId,
					eventType: "PROJECT_CREATED",
					details: `Organization Project "${projectTitle}" created (idempotency:${idempotencyKey || "none"}) - Assignee: ${assignedToUserId}`,
					createdAt: new Date(),
				});
			});

			// ── POST-COMMIT ASYNCHRONOUS SIDE-EFFECTS ───────────────────────
			try {
				const [assigneeUser] = await db
					.select()
					.from(users)
					.where(eq(users.id, assignedToUserId))
					.limit(1);
				const [creatorUser] = await db
					.select()
					.from(users)
					.where(eq(users.id, userId))
					.limit(1);
				const assigneeRole = (assigneeUser?.role || "CO-CEO").toUpperCase();

				if (assigneeUser?.email) {
					emailService
						.sendProjectAssignmentEmail({
							to: assigneeUser.email,
							projectName: title.trim(),
							assignerName: creatorUser?.displayName || creatorUser?.name || "CEO",
							role: assigneeRole,
							deadline: projectDeadline ? projectDeadline.toISOString().split("T")[0] : null,
							projectId,
						})
						.catch((e) => logger.error(`Async project email notice: ${e.message}`));
				}
			} catch (e: any) {
				logger.error(`Post-commit email dispatch notice: ${e.message}`);
			}

			// Emit Real-Time Socket Events to Workspace & Assigned User
			try {
				socketService.emitToWorkspace(workspaceId, "PROJECT_CREATED", newProject);
				socketService.emitToWorkspace(workspaceId, "project.created", newProject);
				if (assignedToUserId) {
					socketService.emitToUser(assignedToUserId, "PROJECT_ASSIGNED", {
						type: "PROJECT_ASSIGNMENT",
						projectId,
						title: title.trim(),
					});
					socketService.emitToUser(assignedToUserId, "TASK_ASSIGNED", {
						type: "PROJECT_ASSIGNMENT",
						projectId,
						title: title.trim(),
					});
					socketService.emitToUser(assignedToUserId, "notification.created", {
						type: "PROJECT_ASSIGNMENT",
						title: "PROJECT ASSIGNED",
						message: `You have been assigned to project "${title.trim()}"`,
					});
				}
			} catch (socketErr: any) {
				logger.warn(`Socket emit notice: ${socketErr?.message || String(socketErr)}`);
			}

			res.json({
				success: true,
				data: {
					project: newProject,
					assignmentId,
					milestones: milestoneRecords,
					initialTasks: createdInitialTasks,
				},
			});
		} catch (err: any) {
			logger.error(`Create organization project v2 error: ${err?.message || String(err)}`);
			res.status(500).json({
				success: false,
				error: err.message || "Failed to create organization project",
			});
		}
	},
);

function _extractProjectName(prompt: string): string {
	const patterns = [
		/build\s+(?:the\s+)?([^.by]+?)(?:\s+by|\s+before|\.)/i,
		/create\s+(?:the\s+)?([^.by]+?)(?:\s+by|\s+before|\.)/i,
		/develop\s+(?:the\s+)?([^.by]+?)(?:\s+by|\s+before|\.)/i,
		/launch\s+(?:the\s+)?([^.by]+?)(?:\s+by|\s+before|\.)/i,
	];
	for (const p of patterns) {
		const m = prompt.match(p);
		if (m) return m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
	}
	return prompt.split(".")[0].substring(0, 60).trim();
}

function _extractPriority(prompt: string): string {
	if (/urgent|asap|immediately|critical/i.test(prompt)) return "Urgent";
	if (/high priority|important|soon/i.test(prompt)) return "High";
	if (/low priority|whenever|flexible/i.test(prompt)) return "Low";
	return "Medium";
}

function _generateMilestones(_prompt: string, deadline: Date): any[] {
	const names = [
		"Requirement Analysis & PRD",
		"Technical Architecture & TRD",
		"Application Workflow & Setup",
		"Core Execution Phase",
		"Final Verification & Handover",
	];
	return names.map((name, i) => {
		const d = new Date(deadline);
		d.setDate(
			deadline.getDate() -
				Math.round(
					(names.length - 1 - i) * (deadline.getDate() / names.length),
				),
		);
		return {
			name,
			description: `${name} phase`,
			deadline: d.toISOString(),
			status: "Pending",
			order: i,
		};
	});
}

// ─── Create Project (Multi-Step Confirmation with Date Range) ────────────────
orgProjectsRouter.post(
	"/",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	enforceNoSelfAssignment,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const {
				name,
				description,
				objective,
				scope,
				outOfScope,
				startDate,
				deadline,
				priority,
				riskLevel,
				assigneeId,
				features: featuresData,
				milestones: milestonesData,
				requirements: requirementsData,
				documents: documentsData,
				tasks: tasksData,
			} = req.body;

			if (!name?.trim())
				return res
					.status(400)
					.json({ success: false, error: "Project name is required" });

			const projStart = startDate
				? new Date(startDate)
				: new Date("2026-08-11");
			const projEnd = deadline
				? new Date(deadline)
				: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

			if (projEnd.getTime() <= projStart.getTime()) {
				return res.status(400).json({
					success: false,
					error:
						"Project Start Date must be strictly earlier than Final Deadline",
				});
			}

			const projectId = uuidv4();
			const projectOwnerId =
				assigneeId && assigneeId !== userId ? assigneeId : null;

			// Create project
			const [project] = await db
				.insert(projects)
				.values({
					id: projectId,
					workspaceId,
					name: name.trim(),
					type: "ORGANIZATION",
					description: description || null,
					objective: objective || null,
					scope: Array.isArray(scope) ? scope : [scope].filter(Boolean),
					outOfScope: Array.isArray(outOfScope)
						? outOfScope
						: [outOfScope].filter(Boolean),
					startDate: projStart,
					deadline: projEnd,
					priority: priority || "MEDIUM",
					riskLevel: riskLevel || "LOW",
					status: "PLANNING",
					progress: 0,
					health: "HEALTHY",
					ownerId: projectOwnerId,
					createdBy: userId,
					tags: [],
				})
				.returning();

			// Create features
			if (Array.isArray(featuresData) && featuresData.length > 0) {
				for (const feat of featuresData) {
					await db.insert(projectFeatures).values({
						id: uuidv4(),
						projectId,
						name: feat.name || "Feature Module",
						description: feat.description || null,
						priority: feat.priority || "MEDIUM",
						status: "PLANNED",
					});
				}
			}

			// Create milestones
			if (Array.isArray(milestonesData) && milestonesData.length > 0) {
				for (let i = 0; i < milestonesData.length; i++) {
					const m = milestonesData[i];
					await db.insert(milestones).values({
						id: uuidv4(),
						projectId,
						name: m.name || `Milestone ${i + 1}`,
						description: m.description || null,
						deadline: m.deadline ? new Date(m.deadline) : null,
						status: "Pending",
						order: i,
					});
				}
			}

			// Create project requirements
			if (Array.isArray(requirementsData) && requirementsData.length > 0) {
				for (const reqItem of requirementsData) {
					await db.insert(projectRequirements).values({
						id: uuidv4(),
						projectId,
						title: reqItem.title,
						description: reqItem.description || null,
						category: reqItem.category || "Functional",
						status: "Draft",
					});
				}
			}

			// Create project required documents checklist
			const defaultDocs = [
				{ docType: "PRD", title: "Product Requirements Document (PRD)" },
				{ docType: "TRD", title: "Technical Requirements Document (TRD)" },
				{
					docType: "Application Workflow",
					title: "Application Workflow Specification",
				},
				{ docType: "User Manual", title: "User Manual & Guide" },
				{ docType: "GitHub", title: "GitHub / Source Code Repository" },
			];
			const docsToInsert =
				Array.isArray(documentsData) && documentsData.length > 0
					? documentsData
					: defaultDocs;

			for (const docItem of docsToInsert) {
				await db.insert(projectDocuments).values({
					id: uuidv4(),
					projectId,
					docType: docItem.docType || "PRD",
					title: docItem.title || docItem.docType,
					status: "Required",
				});
			}

			// Create tasks if included in confirmed mandate
			if (Array.isArray(tasksData) && tasksData.length > 0) {
				for (let i = 0; i < tasksData.length; i++) {
					const t = tasksData[i];
					await db.insert(tasks).values({
						id: uuidv4(),
						workspaceId,
						projectId,
						title: t.title,
						description: t.description || null,
						priority: t.priority || "MEDIUM",
						estimatedMinutes: t.estimatedMinutes || 120,
						deadline: t.deadline ? new Date(t.deadline) : projEnd,
						assigneeId: projectOwnerId,
						type: t.type || "Task",
						requiresDocument: Boolean(t.requiresDocument),
						requiresGithub: Boolean(t.requiresGithub),
						status: projectOwnerId ? "Assigned" : "Draft",
						order: i,
					});
				}
			}

			// Audit logs for timeline history
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_CREATED",
				details: `Organization Project "${name}" created (Start: ${projStart.toISOString().split("T")[0]}, Deadline: ${projEnd.toISOString().split("T")[0]})`,
			});

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId,
				userId,
				action: "Project Mandate Created",
				details: `Created project "${name}" with structured mandate requirements & tasks.`,
			});

			// Dispatch assignment delivery if project is assigned to team member
			if (projectOwnerId) {
				await AssignmentDeliveryService.dispatchWorkAssignment({
					workspaceId,
					entityType: "PROJECT_ASSIGNMENT",
					entityId: projectId,
					title: name.trim(),
					description: objective || description || undefined,
					actorUserId: userId,
					assigneeId: projectOwnerId,
					deadline: projEnd.toISOString().split("T")[0],
				});
			}

			socketService.emitToWorkspace(workspaceId, "project.created", project);

			res.json({ success: true, data: project });
		} catch (err: any) {
			logger.error(`Create project error: ${err?.message || String(err)}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to create project" });
		}
	},
);

// ─── Get Eligible Assignees for Workspace (GET /eligible-assignees) ─────────
orgProjectsRouter.get(
	"/eligible-assignees",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;

			let membersList = await db
				.select({
					id: users.id,
					name: users.displayName,
					email: users.email,
					userRole: users.role,
					workspaceRole: workspaceMembers.role,
					avatar: users.avatar,
				})
				.from(workspaceMembers)
				.innerJoin(users, eq(workspaceMembers.userId, users.id))
				.where(eq(workspaceMembers.workspaceId, workspaceId));

			if (membersList.length <= 1) {
				const allUsers = await db
					.select({
						id: users.id,
						name: users.displayName,
						email: users.email,
						userRole: users.role,
						workspaceRole: users.role,
						avatar: users.avatar,
					})
					.from(users)
					.where(ne(users.role, "GUEST"));

				const existingIds = new Set(membersList.map((m) => m.id));
				const additional = allUsers.filter((u) => !existingIds.has(u.id));
				membersList = [...membersList, ...additional];
			}

			const normalizedMembers = membersList.map((m) => {
				const rawRole = (m.workspaceRole || m.userRole || "MEMBER").toUpperCase();
				const effectiveRole = rawRole.includes("CEO") && !rawRole.includes("CO") ? "CEO" : rawRole.includes("CO") ? "CO-CEO" : "MEMBER";
				return {
					id: m.id,
					name: m.name || m.email || "User",
					email: m.email,
					role: effectiveRole,
					avatar: m.avatar,
				};
			});

			// Strictly exclude CEO from CO-CEO and Member selection lists
			const coCeos = normalizedMembers.filter((m) => m.role === "CO-CEO");
			const memberList = normalizedMembers.filter((m) => m.role === "MEMBER");

			// Fallback: If no dedicated CO-CEO exists in DB yet, show non-CEO members labelled as CO-CEO
			const finalCoCeos = coCeos.length > 0
				? coCeos
				: normalizedMembers.filter((m) => m.role !== "CEO").map((m) => ({ ...m, role: "CO-CEO" }));

			const finalMembers = memberList.length > 0
				? memberList
				: normalizedMembers.filter((m) => m.role !== "CEO");

			res.json({
				success: true,
				data: {
					all: normalizedMembers.filter((m) => m.role !== "CEO"),
					coCeos: finalCoCeos,
					members: finalMembers,
				},
			});
		} catch (err: any) {
			logger.error(`Get eligible assignees error: ${err?.message || String(err)}`);
			res.status(500).json({
				success: false,
				error: "Failed to fetch eligible assignees",
			});
		}
	},
);

// ─── Bulk Project Action (POST /bulk-action) ──────────────────────────────────
orgProjectsRouter.post(
	"/bulk-action",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const { action, projectIds, status, priority } = req.body;

			if (!Array.isArray(projectIds) || projectIds.length === 0) {
				return res.status(400).json({
					success: false,
					error: "Array of projectIds is required",
				});
			}

			if (action === "DELETE") {
				for (const id of projectIds) {
					try { await db.delete(tasks).where(eq(tasks.projectId, id)); } catch (e) {}
					try { await db.delete(milestones).where(eq(milestones.projectId, id)); } catch (e) {}
					try { await db.delete(projectMilestonesV2).where(eq(projectMilestonesV2.projectId, id)); } catch (e) {}
					try { await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id)); } catch (e) {}
					try { await db.delete(projectDocuments).where(eq(projectDocuments.projectId, id)); } catch (e) {}
					try { await db.delete(projectRequirements).where(eq(projectRequirements.projectId, id)); } catch (e) {}
					try { await db.delete(projectFeatures).where(eq(projectFeatures.projectId, id)); } catch (e) {}
					await db.delete(projects).where(eq(projects.id, id));
				}
				await db.insert(auditLogs).values({
					id: uuidv4(),
					userId,
					workspaceId,
					eventType: "PROJECT_BULK_DELETED",
					details: `Bulk deleted ${projectIds.length} projects`,
				});
			} else if (action === "ARCHIVE") {
				await db
					.update(projects)
					.set({ status: "ARCHIVED", archivedAt: new Date(), updatedAt: new Date() })
					.where(inArray(projects.id, projectIds));
			} else if (action === "CHANGE_STATUS" && status) {
				const updateVals: any = { status, updatedAt: new Date() };
				if (status === "Completed" || status === "COMPLETED") {
					updateVals.completedAt = new Date();
				}
				await db
					.update(projects)
					.set(updateVals)
					.where(and(inArray(projects.id, projectIds), eq(projects.workspaceId, workspaceId)));
			} else if (action === "CHANGE_PRIORITY" && priority) {
				await db
					.update(projects)
					.set({ priority, updatedAt: new Date() })
					.where(and(inArray(projects.id, projectIds), eq(projects.workspaceId, workspaceId)));
			} else {
				return res.status(400).json({ success: false, error: "Invalid bulk action" });
			}

			socketService.emitToWorkspace(workspaceId, "project.updated", { action, projectIds });
			res.json({ success: true, message: `Successfully executed ${action} on ${projectIds.length} projects` });
		} catch (err: any) {
			logger.error(`Bulk action error: ${err?.message || String(err)}`);
			res.status(500).json({ success: false, error: "Failed to execute bulk project action" });
		}
	},
);

// ─── Update Project Details (PUT /:id) ─────────────────────────────────────────
orgProjectsRouter.put(
	"/:id",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const {
				name,
				mandate,
				objective,
				description,
				status,
				priority,
				deadline,
				assignmentType,
				responsibleCoCeoId,
				assignedToUserId,
			} = req.body;

			const [existing] = await db
				.select()
				.from(projects)
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.limit(1);

			if (!existing) {
				return res.status(404).json({ success: false, error: "Project not found" });
			}

			const projUpdates: any = { updatedAt: new Date() };
			if (name?.trim()) projUpdates.name = name.trim();
			if (objective || mandate) projUpdates.objective = objective || mandate;
			if (description !== undefined) projUpdates.description = description;
			if (status) {
				projUpdates.status = status;
				if (status === "Completed" || status === "COMPLETED") projUpdates.completedAt = new Date();
			}
			if (priority) projUpdates.priority = priority;
			if (deadline) projUpdates.deadline = new Date(deadline);
			if (assignedToUserId) projUpdates.ownerId = assignedToUserId;

			const [updated] = await db
				.update(projects)
				.set(projUpdates)
				.where(eq(projects.id, id))
				.returning();

			// Update assignment record if assigned user / CO-CEO passed
			if (assignedToUserId || responsibleCoCeoId || assignmentType) {
				const [existingAssign] = await db
					.select()
					.from(projectAssignments)
					.where(eq(projectAssignments.projectId, id))
					.limit(1);

				if (existingAssign) {
					const assignUpdates: any = { updatedAt: new Date() };
					if (assignedToUserId) assignUpdates.assignedToUserId = assignedToUserId;
					if (responsibleCoCeoId) assignUpdates.responsibleCoCeoId = responsibleCoCeoId;
					if (assignmentType) assignUpdates.assignmentType = assignmentType;

					await db
						.update(projectAssignments)
						.set(assignUpdates)
						.where(eq(projectAssignments.id, existingAssign.id));
				} else if (assignedToUserId) {
					await db.insert(projectAssignments).values({
						id: uuidv4(),
						projectId: id,
						workspaceId,
						createdByUserId: userId,
						assignedToUserId,
						responsibleCoCeoId: responsibleCoCeoId || assignedToUserId,
						assignmentType: assignmentType || "CEO_TO_CO_CEO",
						status: "ACCEPTED",
					});
				}
			}

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_UPDATED",
				details: `Project "${updated.name}" updated by leadership`,
			});

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "PROJECT_UPDATED",
				details: JSON.stringify({ message: `Project updated: "${updated.name}"` }),
			});

			// Sync calendar event if deadline or name changed
			if (deadline || name) {
				try {
					const [existingCal] = await db
						.select()
						.from(calendarEvents)
						.where(eq(calendarEvents.projectId, id))
						.limit(1);

					if (existingCal) {
						const calUpdates: any = {};
						if (name?.trim()) calUpdates.title = `[Project Deadline] ${name.trim()}`;
						if (deadline) {
							calUpdates.startTime = new Date(deadline);
							calUpdates.endTime = new Date(deadline);
						}
						await db.update(calendarEvents).set(calUpdates).where(eq(calendarEvents.id, existingCal.id));
					} else if (deadline) {
						await db.insert(calendarEvents).values({
							id: uuidv4(),
							workspaceId,
							projectId: id,
							title: `[Project Deadline] ${(name || existing.name).trim()}`,
							description: existing.description || `Project deadline for ${(name || existing.name).trim()}`,
							startTime: new Date(deadline),
							endTime: new Date(deadline),
							createdById: userId,
							createdAt: new Date(),
						});
					}
				} catch (calErr: any) {
					logger.warn(`Calendar update notice on project update: ${calErr?.message}`);
				}
			}

			socketService.emitToWorkspace(workspaceId, "project.updated", updated);
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Update project error: ${err?.message || String(err)}`);
			res.status(500).json({ success: false, error: "Failed to update project" });
		}
	},
);

// ─── Delete Single Project (DELETE /:id) ──────────────────────────────────────
orgProjectsRouter.delete(
	"/:id",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;

			let [existing] = await db
				.select()
				.from(projects)
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.limit(1);

			if (!existing) {
				[existing] = await db
					.select()
					.from(projects)
					.where(eq(projects.id, id))
					.limit(1);
			}

			if (!existing) {
				return res.status(404).json({ success: false, error: "Project not found" });
			}

			// Clean up associated records
			try { await db.delete(tasks).where(eq(tasks.projectId, id)); } catch (e) {}
			try { await db.delete(milestones).where(eq(milestones.projectId, id)); } catch (e) {}
			try { await db.delete(projectMilestonesV2).where(eq(projectMilestonesV2.projectId, id)); } catch (e) {}
			try { await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id)); } catch (e) {}
			try { await db.delete(projectMembers).where(eq(projectMembers.projectId, id)); } catch (e) {}
			try { await db.delete(projectWork).where(eq(projectWork.projectId, id)); } catch (e) {}
			try { await db.delete(projectAiTools).where(eq(projectAiTools.projectId, id)); } catch (e) {}
			try { await db.delete(projectSubmissions).where(eq(projectSubmissions.projectId, id)); } catch (e) {}
			try { await db.delete(projectDocuments).where(eq(projectDocuments.projectId, id)); } catch (e) {}
			try { await db.delete(projectDocumentsV2).where(eq(projectDocumentsV2.projectId, id)); } catch (e) {}
			try { await db.delete(projectRequirements).where(eq(projectRequirements.projectId, id)); } catch (e) {}
			try { await db.delete(projectFeatures).where(eq(projectFeatures.projectId, id)); } catch (e) {}
			try { await db.delete(calendarEvents).where(eq(calendarEvents.projectId, id)); } catch (e) {}

			await db.delete(projects).where(eq(projects.id, id));

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_DELETED",
				details: `Organization Project "${existing.name}" deleted`,
				createdAt: new Date(),
			});

			socketService.emitToWorkspace(workspaceId, "project.deleted", { id });
			res.json({ success: true, message: `Project "${existing.name}" deleted successfully` });
		} catch (err: any) {
			logger.error(`Delete project error: ${err?.message || String(err)}`);
			res.status(500).json({ success: false, error: "Failed to delete project" });
		}
	},
);

// ─── Helper: Enrich Project Record with Task Progress, Health & User Info ───
async function enrichProjectRecord(p: typeof projects.$inferSelect) {
	let totalTasks = 0;
	let completedTasks = 0;
	let overdueTasks = 0;
	let blockedTasks = 0;
	let milestoneCount = 0;

	try {
		const taskList = await db
			.select()
			.from(tasks)
			.where(eq(tasks.projectId, p.id));

		totalTasks = taskList.length;
		completedTasks = taskList.filter(
			(t) => t.status === "Completed" || t.status === "Approved",
		).length;
		blockedTasks = taskList.filter((t) => t.status === "Blocked").length;

		const now = new Date();
		overdueTasks = taskList.filter((t) => {
			if (t.status === "Completed" || t.status === "Approved") return false;
			if (!t.deadline) return false;
			const d = new Date(t.deadline);
			return d < now;
		}).length;

		const msCount = await db
			.select({ count: sql<number>`count(*)` })
			.from(milestones)
			.where(eq(milestones.projectId, p.id));
		milestoneCount = msCount?.[0] ? Number(msCount[0].count) || 0 : 0;
	} catch (_e) {}

	const progress =
		totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : p.progress || 0;

	const now = new Date();
	let health = "HEALTHY";
	const isProjectOverdue =
		p.deadline &&
		new Date(p.deadline) < now &&
		p.status !== "COMPLETED" &&
		p.status !== "Completed";

	if (isProjectOverdue || overdueTasks >= 3 || blockedTasks >= 2) {
		health = "CRITICAL";
	} else if (
		overdueTasks > 0 ||
		blockedTasks > 0 ||
		(p.deadline &&
			new Date(p.deadline).getTime() - now.getTime() < 3 * 24 * 3600 * 1000 &&
			progress < 50)
	) {
		health = "AT_RISK";
	}

	// Fetch Owner User
	let ownerName = "CEO Owner";
	let ownerEmail = "";
	let ownerRole = "CEO";
	if (p.ownerId) {
		try {
			const [u] = await db
				.select({ displayName: users.displayName, email: users.email, role: users.role })
				.from(users)
				.where(eq(users.id, p.ownerId))
				.limit(1);
			if (u) {
				ownerName = u.displayName || u.email || "CEO Owner";
				ownerEmail = u.email || "";
				ownerRole = u.role || "CEO";
			}
		} catch (_e) {}
	}

	// Fetch Assignee, CO-CEO Lead & Execution Lead Users
	let assignedToUserId: string | null = null;
	let assignedUserName: string | null = null;
	let assignedUserEmail: string | null = null;
	let assignedUserRole: string | null = null;
	let coCeoLeadName = "Unassigned";
	let coCeoLeadEmail = "";
	let executionLeadName = "Unassigned";
	let executionLeadEmail = "";

	try {
		const [pa] = await db
			.select({
				assignedToUserId: projectAssignments.assignedToUserId,
				responsibleCoCeoId: projectAssignments.responsibleCoCeoId,
				assignedName: users.displayName,
				assignedEmail: users.email,
				assignedRole: users.role,
			})
			.from(projectAssignments)
			.leftJoin(users, eq(projectAssignments.assignedToUserId, users.id))
			.where(eq(projectAssignments.projectId, p.id))
			.orderBy(desc(projectAssignments.createdAt))
			.limit(1);

		if (pa) {
			if (pa.assignedToUserId) {
				assignedToUserId = pa.assignedToUserId;
				assignedUserName = pa.assignedName || pa.assignedEmail || "Assignee";
				assignedUserEmail = pa.assignedEmail || "";
				assignedUserRole = pa.assignedRole || "CO-CEO";
				coCeoLeadName = assignedUserName;
			}
			if (pa.responsibleCoCeoId) {
				const [coUser] = await db
					.select({ displayName: users.displayName, email: users.email })
					.from(users)
					.where(eq(users.id, pa.responsibleCoCeoId))
					.limit(1);
				if (coUser) {
					coCeoLeadName = coUser.displayName || coUser.email || "CO-CEO Lead";
					coCeoLeadEmail = coUser.email || "";
				}
			}
		}

		if (p.executionLeadId) {
			const [exUser] = await db
				.select({ displayName: users.displayName, email: users.email })
				.from(users)
				.where(eq(users.id, p.executionLeadId))
				.limit(1);
			if (exUser) {
				executionLeadName = exUser.displayName || exUser.email || "Execution Lead";
				executionLeadEmail = exUser.email || "";
			}
		}
	} catch (_e) {}

	return {
		...p,
		health,
		progress,
		totalTasks,
		completedTasks,
		overdueTasks,
		blockedTasks,
		milestoneCount,
		ownerName,
		ownerEmail,
		ownerRole,
		assignedToUserId,
		assignedUserName,
		assignedUserEmail,
		assignedUserRole,
		coCeoLeadName,
		coCeoLeadEmail,
		executionLeadName,
		executionLeadEmail,
	};
}

// ─── List Projects (GET /) ───────────────────────────────────────────────────
orgProjectsRouter.get(
	"/",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
			res.setHeader("Pragma", "no-cache");
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const membership = (req as any).membership;

			let projectList: (typeof projects.$inferSelect)[] = [];
			const isLeadership = !membership || membership.role === "CEO" || membership.role === "CO-CEO" || (req as any).user?.role === "CEO";
			if (isLeadership) {
				projectList = await db
					.select()
					.from(projects)
					.where(
						and(
							eq(projects.type, "ORGANIZATION"),
							or(
								eq(projects.workspaceId, workspaceId),
								ne(projects.workspaceId, "personal-workspace")
							)
						)
					)
					.orderBy(desc(projects.createdAt));
			} else {
				// Member: only projects with their tasks or where they own
				const memberTasks = await db
					.select({ projectId: tasks.projectId })
					.from(tasks)
					.where(
						and(
							eq(tasks.workspaceId, workspaceId),
							eq(tasks.assigneeId, userId),
						),
					);
				const projectIds = [
					...new Set(memberTasks.map((t) => t.projectId).filter(Boolean)),
				];
				projectList = await db
					.select()
					.from(projects)
					.where(
						and(
							eq(projects.workspaceId, workspaceId),
							or(
								eq(projects.ownerId, userId),
								projectIds.length > 0
									? inArray(projects.id, projectIds as string[])
									: eq(projects.ownerId, userId),
							),
						),
					)
					.orderBy(desc(projects.createdAt));
			}

			// Enrich with task counts, health, progress & user details
			const enriched = await Promise.all(
				projectList.map((p) => enrichProjectRecord(p)),
			);

			res.json({ success: true, data: enriched });
		} catch (err: any) {
			logger.error(`List projects error: ${err?.message || String(err)}`);
			res.status(500).json({
				success: false,
				error: "Failed to list organization projects",
			});
		}
	},
);

// ─── Get Single Project Details (GET /:id) ──────────────────────────────────
orgProjectsRouter.get("/:id", async (req: Request, res: Response) => {
	try {
		res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
		res.setHeader("Pragma", "no-cache");
		const id = req.params.id as string;
		if (!id || id === "undefined" || id === "null") {
			return res
				.status(400)
				.json({ success: false, error: "Valid Project ID is required" });
		}

		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.id, id))
			.limit(1);
		if (!project)
			return res
				.status(404)
				.json({ success: false, error: "Project not found" });

		// Milestones for project
		let projMilestones: any[] = [];
		try {
			projMilestones = await db
				.select()
				.from(milestones)
				.where(eq(milestones.projectId, id))
				.orderBy(asc(milestones.order));
		} catch (e: any) {
			logger.error(`Fetch project milestones error: ${e.message}`);
		}

		// Tasks for project
		let formattedTasks: any[] = [];
		try {
			const projTasks = await db
				.select({
					id: tasks.id,
					title: tasks.title,
					description: tasks.description,
					status: tasks.status,
					priority: tasks.priority,
					deadline: tasks.deadline,
					assigneeId: tasks.assigneeId,
					projectId: tasks.projectId,
					createdAt: tasks.createdAt,
					assigneeName: users.displayName,
					assigneeEmail: users.email,
				})
				.from(tasks)
				.leftJoin(users, eq(tasks.assigneeId, users.id))
				.where(eq(tasks.projectId, id))
				.orderBy(desc(tasks.createdAt));

			formattedTasks = projTasks.map((t) => ({
				...t,
				assigneeName: t.assigneeName || t.assigneeEmail || "Unassigned",
			}));
		} catch (e: any) {
			logger.error(`Fetch project tasks error: ${e.message}`);
		}

		const total = formattedTasks.length;
		const completed = formattedTasks.filter(
			(t) => t.status === "Completed" || t.status === "Approved",
		).length;
		const progress =
			total > 0 ? Math.round((completed / total) * 100) : project.progress || 0;

		// Owner / Assignee details
		let ownerName = null;
		let ownerEmail = null;
		if (project.ownerId) {
			try {
				const [ownerUser] = await db
					.select()
					.from(users)
					.where(eq(users.id, project.ownerId))
					.limit(1);
				if (ownerUser) {
					ownerName = ownerUser.displayName || ownerUser.name;
					ownerEmail = ownerUser.email;
				}
			} catch (_e) {}
		}

		// Requirements for project
		let projRequirements: any[] = [];
		try {
			projRequirements = await db
				.select()
				.from(projectRequirements)
				.where(eq(projectRequirements.projectId, id));
		} catch (e: any) {
			logger.error(`Fetch project requirements error: ${e.message}`);
		}

		// Documents checklist for project
		let projDocuments: any[] = [];
		try {
			projDocuments = await db
				.select()
				.from(projectDocuments)
				.where(eq(projectDocuments.projectId, id));
		} catch (e: any) {
			logger.error(`Fetch project documents error: ${e.message}`);
		}

		// Roadmaps for project
		let projRoadmaps: any[] = [];
		try {
			projRoadmaps = await db
				.select()
				.from(projectRoadmaps)
				.where(eq(projectRoadmaps.projectId, id))
				.orderBy(asc(projectRoadmaps.order));
		} catch (e: any) {
			logger.error(`Fetch project roadmaps error: ${e.message}`);
		}

		// Features for project
		let projFeatures: any[] = [];
		try {
			projFeatures = await db
				.select()
				.from(projectFeatures)
				.where(eq(projectFeatures.projectId, id));
		} catch (e: any) {
			logger.error(`Fetch project features error: ${e.message}`);
		}

		// GitHub for project
		let githubData: any = null;
		try {
			const [gh] = await db
				.select()
				.from(projectGithub)
				.where(eq(projectGithub.projectId, id))
				.limit(1);
			if (gh) githubData = gh;
		} catch (e: any) {
			logger.error(`Fetch project github error: ${e.message}`);
		}

		// V2 Milestones for project
		try {
			const v2Ms = await db
				.select()
				.from(projectMilestonesV2)
				.where(eq(projectMilestonesV2.projectId, id))
				.orderBy(asc(projectMilestonesV2.stageNumber));
			if (v2Ms && v2Ms.length > 0) {
				projMilestones = v2Ms;
			}
		} catch (_e: any) {}

		// V2 Documents for project
		try {
			const v2Docs = await db
				.select()
				.from(projectDocumentsV2)
				.where(eq(projectDocumentsV2.projectId, id));
			if (v2Docs && v2Docs.length > 0) {
				projDocuments = v2Docs;
			}
		} catch (_e: any) {}

		// Normalize milestones to satisfy unified data contract
		const normalizedMilestones = (projMilestones || []).map((m: any) => ({
			...m,
			state: m.state || m.status || "LOCKED",
			status: m.status || m.state || "LOCKED",
			stageNumber: m.stageNumber || m.order || 1,
			name: m.name || m.title || "Milestone",
			description: m.description || "",
		}));

		// Fetch canonical project assignment record
		let projectAssignmentData: any = null;
		try {
			const [pa] = await db
				.select()
				.from(projectAssignments)
				.where(eq(projectAssignments.projectId, id))
				.orderBy(desc(projectAssignments.createdAt))
				.limit(1);

			if (pa) {
				let assigneeUser: any = null;
				let creatorUser: any = null;
				if (pa.assignedToUserId) {
					const [u] = await db
						.select()
						.from(users)
						.where(eq(users.id, pa.assignedToUserId))
						.limit(1);
					if (u)
						assigneeUser = {
							id: u.id,
							name: u.displayName || u.name,
							email: u.email,
							role: u.role,
						};
				}
				if (pa.createdByUserId) {
					const [u] = await db
						.select()
						.from(users)
						.where(eq(users.id, pa.createdByUserId))
						.limit(1);
					if (u)
						creatorUser = {
							id: u.id,
							name: u.displayName || u.name,
							email: u.email,
							role: u.role,
						};
				}

				projectAssignmentData = {
					id: pa.id,
					status: pa.status,
					assignmentType: pa.assignmentType,
					assignedTo: assigneeUser,
					assignedBy: creatorUser,
					rejectionReason: pa.rejectionReason,
					acceptedAt: pa.acceptedAt,
					declinedAt: pa.declinedAt,
					createdAt: pa.createdAt,
				};
			}
		} catch (e: any) {
			logger.error(`Fetch project assignment error: ${e.message}`);
		}

		// Submissions for project
		let projSubmissions: any[] = [];
		try {
			projSubmissions = await db
				.select()
				.from(projectSubmissions)
				.where(eq(projectSubmissions.projectId, id))
				.orderBy(desc(projectSubmissions.submittedAt));
		} catch (e: any) {
			logger.error(`Fetch project submissions error: ${e.message}`);
		}

		// Fetch Execution Lead Details
		let executionLead: any = null;
		if (project.executionLeadId) {
			try {
				const [leadUser] = await db
					.select()
					.from(users)
					.where(eq(users.id, project.executionLeadId))
					.limit(1);
				if (leadUser) {
					executionLead = {
						id: leadUser.id,
						name: leadUser.displayName || leadUser.name,
						email: leadUser.email,
						role: leadUser.role,
						avatar: leadUser.avatar,
					};
				}
			} catch (_e) {}
		}

		// Fetch Project Members
		let projMembers: any[] = [];
		try {
			const rawMembers = await db
				.select({
					id: projectMembers.id,
					userId: projectMembers.userId,
					role: projectMembers.role,
					assignedAt: projectMembers.assignedAt,
					name: users.displayName,
					email: users.email,
					userRole: users.role,
					avatar: users.avatar,
				})
				.from(projectMembers)
				.leftJoin(users, eq(projectMembers.userId, users.id))
				.where(eq(projectMembers.projectId, id));

			projMembers = rawMembers.map((m) => ({
				...m,
				name: m.name || m.email || "Team Member",
			}));
		} catch (e: any) {
			logger.error(`Fetch project members error: ${e.message}`);
		}

		// Fetch Work Packages
		let workPackages: any[] = [];
		try {
			const rawWork = await db
				.select({
					id: projectWork.id,
					projectId: projectWork.projectId,
					workspaceId: projectWork.workspaceId,
					title: projectWork.title,
					description: projectWork.description,
					category: projectWork.category,
					status: projectWork.status,
					ownerId: projectWork.ownerId,
					milestoneId: projectWork.milestoneId,
					startDate: projectWork.startDate,
					deadline: projectWork.deadline,
					deliverable: projectWork.deliverable,
					ownerName: users.displayName,
					ownerEmail: users.email,
					createdAt: projectWork.createdAt,
					updatedAt: projectWork.updatedAt,
				})
				.from(projectWork)
				.leftJoin(users, eq(projectWork.ownerId, users.id))
				.where(eq(projectWork.projectId, id))
				.orderBy(desc(projectWork.createdAt));

			workPackages = rawWork.map((w) => ({
				...w,
				ownerName: w.ownerName || w.ownerEmail || "Unassigned",
			}));
		} catch (e: any) {
			logger.error(`Fetch project work packages error: ${e.message}`);
		}

		// Fetch AI Tools (Hub)
		let aiTools: any[] = [];
		try {
			aiTools = await db
				.select()
				.from(projectAiTools)
				.where(eq(projectAiTools.projectId, id))
				.orderBy(desc(projectAiTools.createdAt));
		} catch (e: any) {
			logger.error(`Fetch project ai tools error: ${e.message}`);
		}

		// Calculate Dynamic Health Model & Explanation
		const now = new Date();
		const blockedTasks = formattedTasks.filter((t) => t.status === "Blocked");
		const overdueTasks = formattedTasks.filter(
			(t) =>
				t.deadline &&
				new Date(t.deadline) < now &&
				t.status !== "Completed" &&
				t.status !== "Approved",
		);
		const pendingSubmissions = projSubmissions.filter((s) => s.status === "Under Review");
		const isProjectOverdue =
			project.deadline &&
			new Date(project.deadline) < now &&
			project.status !== "COMPLETED" &&
			project.status !== "Completed";

		let health = "ON_TRACK";
		let healthExplanation = "Project is progressing on schedule with no active blockers.";

		if (project.status === "COMPLETED" || project.status === "Completed") {
			health = "COMPLETED";
			healthExplanation = "Project has been completed and approved by leadership.";
		} else if (blockedTasks.length > 0) {
			health = "BLOCKED";
			healthExplanation = `Project execution is blocked by ${blockedTasks.length} task(s) with dependencies or critical issues.`;
		} else if (isProjectOverdue && project.deadline) {
			health = "DELAYED";
			healthExplanation = `Project deadline (${new Date(project.deadline).toLocaleDateString()}) has passed with incomplete deliverables.`;
		} else if (overdueTasks.length > 0) {
			health = "AT_RISK";
			healthExplanation = `Project has ${overdueTasks.length} overdue task(s) requiring immediate attention.`;
		} else if (pendingSubmissions.length > 0) {
			health = "ON_TRACK";
			healthExplanation = "Deliverable submission is under executive review.";
		}

		// Next Action Calculation Engine
		let nextAction = {
			code: "INITIALIZE_WORK",
			title: "Assign Initial Work & Tasks",
			description: "Create project work packages and assign initial tasks to team members to kick off execution.",
			targetTab: "WORK",
		};

		if (projectAssignmentData && projectAssignmentData.status === "PENDING_ACCEPTANCE") {
			nextAction = {
				code: "ACCEPT_ASSIGNMENT",
				title: "Accept Project Assignment",
				description: "Execution lead must accept the assigned project mandate before execution begins.",
				targetTab: "OVERVIEW",
			};
		} else if (pendingSubmissions.length > 0) {
			nextAction = {
				code: "REVIEW_SUBMISSION",
				title: "Review Project Deliverable Submission",
				description: "Executive review is required for the submitted project deliverable.",
				targetTab: "SUBMISSIONS",
			};
		} else if (blockedTasks.length > 0) {
			nextAction = {
				code: "RESOLVE_BLOCKERS",
				title: "Resolve Blocked Tasks",
				description: `Unblock ${blockedTasks.length} task(s) to restore team progress.`,
				targetTab: "WORK",
			};
		} else if (formattedTasks.length === 0 && workPackages.length === 0) {
			nextAction = {
				code: "CREATE_WORK_PACKAGES",
				title: "Create Work Packages & Tasks",
				description: "Structure project work into work packages and assign actionable tasks.",
				targetTab: "WORK",
			};
		} else if (completed < total) {
			nextAction = {
				code: "COMPLETE_TASKS",
				title: "Execute Active Tasks",
				description: `${total - completed} remaining task(s) in progress. Complete work and submit deliverables.`,
				targetTab: "WORK",
			};
		} else if (total > 0 && completed === total && projSubmissions.length === 0) {
			nextAction = {
				code: "SUBMIT_DELIVERABLE",
				title: "Submit Project Deliverable",
				description: "All project tasks are completed. Submit final project deliverable for review.",
				targetTab: "SUBMISSIONS",
			};
		}

		res.json({
			success: true,
			data: {
				...project,
				health,
				healthExplanation,
				nextAction,
				progress,
				ownerName,
				ownerEmail,
				executionLead,
				members: projMembers,
				workPackages,
				aiTools,
				assignedToUserId: projectAssignmentData?.assignedTo?.id || null,
				assignedUserName: projectAssignmentData?.assignedTo?.name || null,
				assignedUserEmail: projectAssignmentData?.assignedTo?.email || null,
				assignedUserRole: projectAssignmentData?.assignedTo?.role || null,
				assignment: projectAssignmentData,
				milestones: normalizedMilestones,
				requirements: projRequirements,
				documents: projDocuments,
				roadmaps: projRoadmaps,
				features: projFeatures,
				github: githubData,
				tasks: formattedTasks,
				submissions: projSubmissions,
				stats: {
					total,
					completed,
					inProgress: formattedTasks.filter(
						(t) => t.status === "In Progress" || t.status === "Accepted",
					).length,
					overdue: overdueTasks.length,
					blocked: blockedTasks.length,
				},
			},
		});
	} catch (err: any) {
		logger.error(
			"Get single project error: " +
				(err?.stack || err?.message || String(err)),
		);
		res.status(500).json({ success: false, error: "Internal server error" });
	}
});

// ─── Real Production Project Documents Lifecycle & Storage API ─────────────────

// GET Project Document Requirements & Storage Accounting
orgProjectsRouter.get(
	"/:id/documents",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const projectId = req.params.id as string;
			const workspaceId = (req as any).workspaceId;

			let requirements: any[] = [];
			try {
				requirements = await db
					.select({
						id: projectDocumentsV2.id,
						projectId: projectDocumentsV2.projectId,
						milestoneId: projectDocumentsV2.milestoneId,
						stageNumber: projectDocumentsV2.stageNumber,
						documentType: projectDocumentsV2.documentType,
						title: projectDocumentsV2.title,
						category: projectDocumentsV2.category,
						isRequired: projectDocumentsV2.isRequired,
						assignedToUserId: projectDocumentsV2.assignedToUserId,
						reviewerUserId: projectDocumentsV2.reviewerUserId,
						dueDate: projectDocumentsV2.dueDate,
						currentVersion: projectDocumentsV2.currentVersion,
						status: projectDocumentsV2.status,
						sizeBytes: projectDocumentsV2.sizeBytes,
						fileUrl: projectDocumentsV2.fileUrl,
						fileName: projectDocumentsV2.fileName,
						mimeType: projectDocumentsV2.mimeType,
						folderPath: projectDocumentsV2.folderPath,
						createdById: projectDocumentsV2.createdById,
						createdAt: projectDocumentsV2.createdAt,
						updatedAt: projectDocumentsV2.updatedAt,
					})
					.from(projectDocumentsV2)
					.where(eq(projectDocumentsV2.projectId, projectId))
					.orderBy(asc(projectDocumentsV2.stageNumber));
			} catch (v2Err: any) {
				logger.warn(`projectDocumentsV2 query failed, falling back to v1: ${v2Err?.message}`);
				try {
					const v1Docs = await db
						.select()
						.from(projectDocuments)
						.where(eq(projectDocuments.projectId, projectId));

					requirements = v1Docs.map((d: any, idx: number) => ({
						id: d.id,
						projectId: d.projectId,
						milestoneId: null,
						stageNumber: idx + 1,
						documentType: d.docType || "PRD",
						title: d.title,
						category: "Documents",
						isRequired: d.status === "Required",
						assignedToUserId: d.uploadedById || null,
						reviewerUserId: null,
						dueDate: null,
						currentVersion: 1,
						status: d.status === "Uploaded" ? "APPROVED" : "NOT_STARTED",
						sizeBytes: 0,
						fileUrl: d.url || null,
						fileName: d.title,
						mimeType: "application/pdf",
						folderPath: `/projects/${projectId}`,
						createdById: d.uploadedById || "",
						createdAt: d.updatedAt || new Date(),
						updatedAt: d.updatedAt || new Date(),
					}));
				} catch (v1Err: any) {
					logger.warn(`projectDocuments v1 query failed: ${v1Err?.message}`);
					requirements = [];
				}
			}

			const enrichedDocs: any[] = [];
			let totalStorageBytes = 0;
			const categoryStorageBytes: Record<string, number> = {
				Documents: 0,
				"Design Assets": 0,
				"Code / Builds": 0,
				Evidence: 0,
				Media: 0,
				Other: 0,
			};

			for (const doc of requirements) {
				let versions: any[] = [];
				try {
					versions = await db
						.select({
							id: documentVersions.id,
							versionNumber: documentVersions.versionNumber,
							fileName: documentVersions.fileName,
							fileUrl: documentVersions.fileUrl,
							mimeType: documentVersions.mimeType,
							sizeBytes: documentVersions.sizeBytes,
							storageReference: documentVersions.storageReference,
							status: documentVersions.status,
							authorId: documentVersions.authorId,
							reviewedById: documentVersions.reviewedById,
							reviewedAt: documentVersions.reviewedAt,
							reviewComment: documentVersions.reviewComment,
							createdAt: documentVersions.createdAt,
						})
						.from(documentVersions)
						.where(eq(documentVersions.documentId, doc.id))
						.orderBy(desc(documentVersions.versionNumber));
				} catch (verErr: any) {
					versions = [];
				}

				for (const v of versions) {
					totalStorageBytes += v.sizeBytes || 0;
					const cat = doc.category || "Documents";
					categoryStorageBytes[cat] = (categoryStorageBytes[cat] || 0) + (v.sizeBytes || 0);
				}

				enrichedDocs.push({
					...doc,
					versions,
				});
			}

			const totalRequired = enrichedDocs.filter((d) => d.isRequired).length;
			const approvedCount = enrichedDocs.filter((d) => d.status === "APPROVED").length;
			const inReviewCount = enrichedDocs.filter((d) => d.status === "IN_REVIEW" || d.status === "SUBMITTED").length;
			const notUploadedCount = enrichedDocs.filter((d) => d.status === "NOT_STARTED" || !d.fileUrl).length;

			return res.json({
				success: true,
				documents: enrichedDocs,
				storage: {
					totalStorageBytes,
					totalStorageMB: Math.round((totalStorageBytes / (1024 * 1024)) * 10) / 10,
					categoryBreakdown: categoryStorageBytes,
					quotaLimitBytes: 100 * 1024 * 1024 * 1024,
				},
				stats: {
					totalRequirements: enrichedDocs.length,
					totalRequired,
					approvedCount,
					inReviewCount,
					notUploadedCount,
					isComplete: totalRequired > 0 && approvedCount >= totalRequired,
				},
			});
		} catch (err: any) {
			logger.error(`Get project documents error: ${err?.stack || err?.message}`);
			return res.json({
				success: true,
				documents: [],
				storage: {
					totalStorageBytes: 0,
					totalStorageMB: 0,
					categoryBreakdown: { Documents: 0 },
					quotaLimitBytes: 100 * 1024 * 1024 * 1024,
				},
				stats: {
					totalRequirements: 0,
					totalRequired: 0,
					approvedCount: 0,
					inReviewCount: 0,
					notUploadedCount: 0,
					isComplete: false,
				},
			});
		}
	},
);

// POST Upload Real File Version to Document Requirement
orgProjectsRouter.post(
	"/:id/documents/upload",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const projectId = req.params.id as string;
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;

			const {
				requirementId,
				fileName,
				fileUrl,
				mimeType,
				sizeBytes = 0,
				storageReference,
				notes,
			} = req.body;

			if (!requirementId || !fileName || !fileUrl) {
				return res.status(400).json({
					success: false,
					error: "Requirement ID, file name, and file URL are required for upload.",
				});
			}

			const parsedSize = Number(sizeBytes) || 0;
			const MAX_FILE_SIZE = 100 * 1024 * 1024;
			if (parsedSize > MAX_FILE_SIZE) {
				return res.status(400).json({
					success: false,
					error: `File size (${Math.round(parsedSize / (1024 * 1024))} MB) exceeds limit of 100 MB.`,
				});
			}

			const [reqDoc] = await db
				.select()
				.from(projectDocumentsV2)
				.where(
					and(
						eq(projectDocumentsV2.id, requirementId),
						eq(projectDocumentsV2.projectId, projectId)
					)
				)
				.limit(1);

			if (!reqDoc) {
				return res.status(404).json({ success: false, error: "Document requirement record not found." });
			}

			const nextVersion = (reqDoc.currentVersion || 0) + 1;
			const versionId = uuidv4();

			await db.transaction(async (tx) => {
				await tx.insert(documentVersions).values({
					id: versionId,
					documentId: requirementId,
					versionNumber: nextVersion,
					content: notes || `Uploaded ${fileName}`,
					fileName: fileName.trim(),
					fileUrl: fileUrl.trim(),
					mimeType: mimeType || "application/octet-stream",
					sizeBytes: parsedSize,
					storageReference: storageReference || fileUrl,
					status: "SUBMITTED",
					authorId: userId,
					createdAt: new Date(),
				});

				await tx
					.update(projectDocumentsV2)
					.set({
						currentVersion: nextVersion,
						status: "SUBMITTED",
						fileName: fileName.trim(),
						fileUrl: fileUrl.trim(),
						mimeType: mimeType || "application/octet-stream",
						sizeBytes: parsedSize,
						updatedAt: new Date(),
					})
					.where(eq(projectDocumentsV2.id, requirementId));

				await tx.insert(auditLogs).values({
					id: uuidv4(),
					userId,
					workspaceId,
					eventType: "DOCUMENT_UPLOADED",
					details: `File "${fileName}" (v${nextVersion}, ${Math.round(parsedSize / 1024)} KB) uploaded for requirement "${reqDoc.title}"`,
					createdAt: new Date(),
				});
			});

			return res.json({
				success: true,
				message: `Version ${nextVersion} uploaded successfully.`,
				version: {
					id: versionId,
					versionNumber: nextVersion,
					fileName,
					fileUrl,
					sizeBytes: parsedSize,
					status: "SUBMITTED",
				},
			});
		} catch (err: any) {
			logger.error(`Document upload error: ${err?.stack || err?.message}`);
			return res.status(500).json({ success: false, error: "Failed to upload document file version" });
		}
	},
);

// POST Review Document Submissions (Approve, Request Changes, Reject)
orgProjectsRouter.post(
	"/:id/documents/:docId/review",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const projectId = req.params.id as string;
			const docId = req.params.docId as string;
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;

			const { action, comment } = req.body;

			if (!action || !["APPROVE", "REQUEST_CHANGES", "REJECT"].includes(action)) {
				return res.status(400).json({
					success: false,
					error: "Valid action ('APPROVE', 'REQUEST_CHANGES', or 'REJECT') is required.",
				});
			}

			const [doc] = await db
				.select()
				.from(projectDocumentsV2)
				.where(
					and(
						eq(projectDocumentsV2.id, docId),
						eq(projectDocumentsV2.projectId, projectId)
					)
				)
				.limit(1);

			if (!doc) {
				return res.status(404).json({ success: false, error: "Document requirement not found." });
			}

			let newStatus = "IN_REVIEW";
			let auditEvent = "DOCUMENT_REVIEW_STARTED";
			if (action === "APPROVE") {
				newStatus = "APPROVED";
				auditEvent = "DOCUMENT_APPROVED";
			} else if (action === "REQUEST_CHANGES") {
				newStatus = "CHANGES_REQUESTED";
				auditEvent = "DOCUMENT_CHANGES_REQUESTED";
			} else if (action === "REJECT") {
				newStatus = "REJECTED";
				auditEvent = "DOCUMENT_REJECTED";
			}

			await db.transaction(async (tx) => {
				await tx
					.update(projectDocumentsV2)
					.set({
						status: newStatus,
						updatedAt: new Date(),
					})
					.where(eq(projectDocumentsV2.id, docId));

				const [latestVer] = await tx
					.select()
					.from(documentVersions)
					.where(eq(documentVersions.documentId, docId))
					.orderBy(desc(documentVersions.versionNumber))
					.limit(1);

				if (latestVer) {
					await tx
						.update(documentVersions)
						.set({
							status: newStatus,
							reviewedById: userId,
							reviewedAt: new Date(),
							reviewComment: comment || null,
						})
						.where(eq(documentVersions.id, latestVer.id));
				}

				await tx.insert(auditLogs).values({
					id: uuidv4(),
					userId,
					workspaceId,
					eventType: auditEvent,
					details: `Document "${doc.title}" review action: ${newStatus}. Comment: ${comment || "None"}`,
					createdAt: new Date(),
				});
			});

			return res.json({
				success: true,
				message: `Document status updated to ${newStatus}.`,
				status: newStatus,
			});
		} catch (err: any) {
			logger.error(`Document review error: ${err?.stack || err?.message}`);
			return res.status(500).json({ success: false, error: "Failed to process document review" });
		}
	},
);

// POST Create Custom Document Requirement for Active Project
orgProjectsRouter.post(
	"/:id/documents/requirements",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const projectId = req.params.id as string;
			const userId = (req as any).user?.id;

			const {
				title,
				documentType = "CUSTOM_SPECIFICATION",
				category = "Documents",
				isRequired = true,
				assignedToUserId,
				reviewerUserId,
				dueDate,
			} = req.body;

			if (!title || typeof title !== "string" || !title.trim()) {
				return res.status(400).json({ success: false, error: "Document requirement title is required." });
			}

			const docId = uuidv4();
			const folderPath = `Documents/Projects/${projectId}/${title.trim().replace(/\s+/g, "-")}`;

			await db.insert(projectDocumentsV2).values({
				id: docId,
				projectId,
				stageNumber: 1,
				documentType: documentType.trim(),
				title: title.trim(),
				category: category.trim(),
				isRequired: Boolean(isRequired),
				assignedToUserId: assignedToUserId || null,
				reviewerUserId: reviewerUserId || null,
				dueDate: dueDate ? new Date(dueDate) : null,
				currentVersion: 1,
				status: "NOT_STARTED",
				sizeBytes: 0,
				fileUrl: null,
				fileName: null,
				mimeType: null,
				folderPath,
				createdById: userId,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			return res.json({
				success: true,
				message: "Document requirement created.",
				requirement: { id: docId, title: title.trim(), status: "NOT_STARTED", sizeBytes: 0 },
			});
		} catch (err: any) {
			logger.error(`Create requirement error: ${err?.stack || err?.message}`);
			return res.status(500).json({ success: false, error: "Failed to create document requirement" });
		}
	},
);

// ─── Work Package Management Routes ──────────────────────────────────────────

// GET Work Packages for Project
orgProjectsRouter.get(
	"/:id/work",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const projectId = req.params.id as string;
			const work = await db
				.select({
					id: projectWork.id,
					projectId: projectWork.projectId,
					workspaceId: projectWork.workspaceId,
					title: projectWork.title,
					description: projectWork.description,
					category: projectWork.category,
					status: projectWork.status,
					ownerId: projectWork.ownerId,
					milestoneId: projectWork.milestoneId,
					startDate: projectWork.startDate,
					deadline: projectWork.deadline,
					deliverable: projectWork.deliverable,
					ownerName: users.displayName,
					ownerEmail: users.email,
					createdAt: projectWork.createdAt,
					updatedAt: projectWork.updatedAt,
				})
				.from(projectWork)
				.leftJoin(users, eq(projectWork.ownerId, users.id))
				.where(eq(projectWork.projectId, projectId))
				.orderBy(desc(projectWork.createdAt));

			res.json({ success: true, data: work });
		} catch (err: any) {
			logger.error(`Get project work error: ${err.message}`);
			res.status(500).json({ success: false, error: "Failed to fetch work packages" });
		}
	},
);

// POST Create Work Package
orgProjectsRouter.post(
	"/:id/work",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const projectId = req.params.id as string;
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const { title, description, category, ownerId, milestoneId, startDate, deadline, deliverable } = req.body;

			if (!title || typeof title !== "string" || !title.trim()) {
				return res.status(400).json({ success: false, error: "Work package title is required." });
			}

			const newWorkId = uuidv4();
			const [created] = await db
				.insert(projectWork)
				.values({
					id: newWorkId,
					projectId,
					workspaceId,
					title: title.trim(),
					description: description || null,
					category: category || "Development",
					status: "Active",
					ownerId: ownerId || userId,
					milestoneId: milestoneId || null,
					startDate: startDate ? new Date(startDate) : null,
					deadline: deadline ? new Date(deadline) : null,
					deliverable: deliverable || null,
					createdById: userId,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			res.json({ success: true, data: created, message: "Work package created successfully." });
		} catch (err: any) {
			logger.error(`Create work package error: ${err.message}`);
			res.status(500).json({ success: false, error: err.message || "Failed to create work package" });
		}
	},
);

// DELETE Work Package
orgProjectsRouter.delete(
	"/:id/work/:workId",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const { id: projectId, workId } = req.params;
			await db
				.delete(projectWork)
				.where(and(eq(projectWork.projectId, projectId), eq(projectWork.id, workId)));

			res.json({ success: true, message: "Work package deleted successfully." });
		} catch (err: any) {
			logger.error(`Delete work package error: ${err.message}`);
			res.status(500).json({ success: false, error: "Failed to delete work package" });
		}
	},
);

// ─── Post Project Deliverable Submission (POST /:id/submissions) ─────────────
orgProjectsRouter.post(
	"/:id/submissions",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const userRole = (req as any).user?.role || "CO-CEO";
			const userName = (req as any).user?.displayName || (req as any).user?.name || "User";
			const projectId = req.params.id as string;
			const { title, description, deploymentUrl, applicationUrl, repositoryUrl, versionTag, fileName, fileSize } = req.body;

			if (!title?.trim() || !description?.trim()) {
				return res.status(400).json({ success: false, error: "Title and description are required for deliverable submission." });
			}

			const [project] = await db
				.select()
				.from(projects)
				.where(eq(projects.id, projectId))
				.limit(1);

			if (!project) {
				return res.status(404).json({ success: false, error: "Project not found" });
			}

			const subId = uuidv4();
			const now = new Date();

			const [newSub] = await db
				.insert(projectSubmissions)
				.values({
					id: subId,
					projectId,
					workspaceId,
					title: title.trim(),
					description: description.trim(),
					submittedBy: userName,
					submittedRole: userRole,
					status: "Under Review",
					deploymentUrl: deploymentUrl?.trim() || null,
					applicationUrl: applicationUrl?.trim() || null,
					repositoryUrl: repositoryUrl?.trim() || null,
					versionTag: versionTag?.trim() || null,
					fileName: fileName || null,
					fileSize: fileSize || null,
					submittedAt: now,
					createdAt: now,
				})
				.returning();

			// Add Activity & Audit Logs
			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId,
				userId,
				action: "DELIVERABLE_SUBMITTED",
				details: JSON.stringify({ message: `${userName} submitted deliverable "${title.trim()}" for review` }),
				createdAt: now,
			});

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "DELIVERABLE_SUBMITTED",
				details: `Submitted deliverable "${title.trim()}" for project "${project.name}"`,
			});

			socketService.emitToWorkspace(workspaceId, "project.updated", { action: "submission_created", projectId });
			socketService.emitToWorkspace(workspaceId, "submission.created", newSub);

			return res.json({
				success: true,
				data: newSub,
				message: "Deliverable submitted successfully for executive review.",
			});
		} catch (err: any) {
			logger.error(`Submit project deliverable error: ${err?.message || String(err)}`);
			return res.status(500).json({ success: false, error: "Failed to submit deliverable" });
		}
	},
);

// ─── GET /:id/assignment Details ──────────────────────────────────────────────
orgProjectsRouter.get(
	"/:id/assignment",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const id = req.params.id as string;

			const [project] = await db
				.select()
				.from(projects)
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.limit(1);

			if (!project)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const [pa] = await db
				.select()
				.from(projectAssignments)
				.where(
					and(
						eq(projectAssignments.projectId, id),
						eq(projectAssignments.workspaceId, workspaceId),
					),
				)
				.orderBy(desc(projectAssignments.createdAt))
				.limit(1);

			let assigneeUser: any = null;
			if (pa?.assignedToUserId || project.ownerId) {
				const targetId = pa?.assignedToUserId || project.ownerId;
				const [u] = await db
					.select()
					.from(users)
					.where(eq(users.id, targetId!))
					.limit(1);
				if (u) {
					assigneeUser = {
						id: u.id,
						name: u.displayName || u.name,
						email: u.email,
						avatarUrl: u.avatar,
						role: u.role || "CO-CEO",
					};
				}
			}

			let assignerUser: any = null;
			const creatorId = pa?.createdByUserId || project.createdBy;
			if (creatorId) {
				const [u] = await db
					.select()
					.from(users)
					.where(eq(users.id, creatorId))
					.limit(1);
				if (u) {
					assignerUser = {
						id: u.id,
						name: u.displayName || u.name,
						email: u.email,
						avatarUrl: u.avatar,
						role: u.role || "CEO",
					};
				}
			}

			// Current stage info
			const [currentMs] = await db
				.select()
				.from(projectMilestonesV2)
				.where(
					and(
						eq(projectMilestonesV2.projectId, id),
						ne(projectMilestonesV2.state, "APPROVED"),
					),
				)
				.orderBy(asc(projectMilestonesV2.stageNumber))
				.limit(1);

			const currentStageText = currentMs
				? `Stage ${String(currentMs.stageNumber).padStart(2, "0")} / 08 (${currentMs.name})`
				: "Stage 01 / 08 (Invite & Connect)";

			res.json({
				success: true,
				data: {
					project,
					assignment: pa,
					assignee: assigneeUser,
					assigner: assignerUser,
					currentStageText,
					assignmentStatus: pa?.status || "PENDING_ACCEPTANCE",
				},
			});
		} catch (err: any) {
			logger.error(
				`Get project assignment error: ${err?.message || String(err)}`,
			);
			res.status(500).json({
				success: false,
				error: "Failed to get project assignment details",
			});
		}
	},
);

// ─── Project Assignment Acceptance (POST /:id/accept & POST /:id/assignment/accept) ──
const handleAcceptProject = async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const userId = (req as any).user?.id;
		const id = req.params.id as string;

		const [existing] = await db
			.select()
			.from(projects)
			.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
			.limit(1);
		if (!existing)
			return res
				.status(404)
				.json({ success: false, error: "Project not found" });

		const [pa] = await db
			.select()
			.from(projectAssignments)
			.where(
				and(
					eq(projectAssignments.projectId, id),
					eq(projectAssignments.workspaceId, workspaceId),
				),
			)
			.orderBy(desc(projectAssignments.createdAt))
			.limit(1);

		const now = new Date();

		if (pa) {
			await db
				.update(projectAssignments)
				.set({ status: "ACCEPTED", acceptedAt: now, updatedAt: now })
				.where(eq(projectAssignments.id, pa.id));
		}

		// Transition Stage 1 to AVAILABLE / IN_PROGRESS
		await db
			.update(projectMilestonesV2)
			.set({ state: "AVAILABLE", updatedAt: now })
			.where(
				and(
					eq(projectMilestonesV2.projectId, id),
					eq(projectMilestonesV2.stageNumber, 1),
				),
			);

		const [updated] = await db
			.update(projects)
			.set({ status: "REQUIREMENTS_IN_PROGRESS", updatedAt: now })
			.where(eq(projects.id, id))
			.returning();

		await db.insert(auditLogs).values({
			id: uuidv4(),
			userId,
			workspaceId,
			eventType: "PROJECT_ACCEPTED",
			details: `Project "${existing.name}" mandate accepted by owner`,
		});

		await db.insert(activities).values({
			id: uuidv4(),
			workspaceId,
			projectId: id,
			userId,
			action: "Project Mandate Accepted",
			details: `Assignee officially accepted project mandate for "${existing.name}"`,
		});

		socketService.emitToWorkspace(workspaceId, "project.updated", updated);
		socketService.emitToWorkspace(workspaceId, "project.accepted", updated);
		res.json({
			success: true,
			data: updated,
			message: "Project assignment accepted successfully",
		});
	} catch (err: any) {
		logger.error(`Accept project error: ${err?.message || String(err)}`);
		res.status(500).json({ success: false, error: "Failed to accept project" });
	}
};

orgProjectsRouter.post(
	"/:id/accept",
	resolveWorkspace,
	requireMembership,
	handleAcceptProject,
);
orgProjectsRouter.post(
	"/:id/assignment/accept",
	resolveWorkspace,
	requireMembership,
	handleAcceptProject,
);

// ─── Project Assignment Decline (POST /:id/decline & POST /:id/assignment/decline) ──
const handleDeclineProject = async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const userId = (req as any).user?.id;
		const id = req.params.id as string;
		const { reason } = req.body;

		if (!reason || typeof reason !== "string" || !reason.trim()) {
			return res.status(400).json({
				success: false,
				error:
					"A valid decline reason is mandatory to decline project assignment",
			});
		}

		const [existing] = await db
			.select()
			.from(projects)
			.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
			.limit(1);
		if (!existing)
			return res
				.status(404)
				.json({ success: false, error: "Project not found" });

		const [pa] = await db
			.select()
			.from(projectAssignments)
			.where(
				and(
					eq(projectAssignments.projectId, id),
					eq(projectAssignments.workspaceId, workspaceId),
				),
			)
			.orderBy(desc(projectAssignments.createdAt))
			.limit(1);

		const now = new Date();

		if (pa) {
			await db
				.update(projectAssignments)
				.set({
					status: "DECLINED",
					rejectionReason: reason.trim(),
					declinedAt: now,
					updatedAt: now,
				})
				.where(eq(projectAssignments.id, pa.id));
		}

		const [updated] = await db
			.update(projects)
			.set({ status: "DECLINED", updatedAt: now })
			.where(eq(projects.id, id))
			.returning();

		await db.insert(auditLogs).values({
			id: uuidv4(),
			userId,
			workspaceId,
			eventType: "PROJECT_DECLINED",
			details: `Project "${existing.name}" declined by assignee. Reason: ${reason.trim()}`,
		});

		await db.insert(activities).values({
			id: uuidv4(),
			workspaceId,
			projectId: id,
			userId,
			action: "Project Mandate Declined",
			details: `Assignee declined mandate "${existing.name}". Reason: ${reason.trim()}`,
		});

		socketService.emitToWorkspace(workspaceId, "project.updated", updated);
		socketService.emitToWorkspace(workspaceId, "project.declined", updated);
		res.json({
			success: true,
			data: updated,
			message: "Project assignment declined successfully",
		});
	} catch (err: any) {
		logger.error(`Decline project error: ${err?.message || String(err)}`);
		res
			.status(500)
			.json({ success: false, error: "Failed to decline project" });
	}
};

orgProjectsRouter.post(
	"/:id/decline",
	resolveWorkspace,
	requireMembership,
	handleDeclineProject,
);
orgProjectsRouter.post(
	"/:id/assignment/decline",
	resolveWorkspace,
	requireMembership,
	handleDeclineProject,
);

// ─── Project Assignment Request Clarification ──────────────────────────────
orgProjectsRouter.post(
	"/:id/clarify",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const { question } = req.body;

			if (!question || typeof question !== "string" || !question.trim()) {
				return res.status(400).json({
					success: false,
					error: "Clarification question is required",
				});
			}

			const [existing] = await db
				.select()
				.from(projects)
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.limit(1);
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "Clarification Requested",
				details: `Assignee asked: "${question.trim()}"`,
			});

			res.json({ success: true, message: "Clarification request sent to CEO" });
		} catch (_err: any) {
			res.status(500).json({
				success: false,
				error: "Failed to submit clarification request",
			});
		}
	},
);

// ─── Project Date Change (with Audit & History Tracking) ───────────────────
orgProjectsRouter.post(
	"/:id/date-change",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const { startDate, deadline, reason } = req.body;

			if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
				return res.status(400).json({
					success: false,
					error: "A valid reason for date modification is required",
				});
			}

			const [existing] = await db
				.select()
				.from(projects)
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.limit(1);
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const newStart = startDate
				? new Date(startDate)
				: existing.startDate || new Date();
			const newEnd = deadline
				? new Date(deadline)
				: existing.deadline || new Date();

			if (newEnd.getTime() <= newStart.getTime()) {
				return res.status(400).json({
					success: false,
					error: "Project Start Date must be strictly earlier than Deadline",
				});
			}

			const prevStartStr = existing.startDate
				? new Date(existing.startDate).toISOString().split("T")[0]
				: "None";
			const prevEndStr = existing.deadline
				? new Date(existing.deadline).toISOString().split("T")[0]
				: "None";
			const newStartStr = newStart.toISOString().split("T")[0];
			const newEndStr = newEnd.toISOString().split("T")[0];

			const [updated] = await db
				.update(projects)
				.set({ startDate: newStart, deadline: newEnd })
				.where(eq(projects.id, id))
				.returning();

			// Audit Event Record
			const eventType =
				prevEndStr !== newEndStr ? "DEADLINE_CHANGED" : "START_DATE_CHANGED";
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType,
				details: `Date changed for "${existing.name}": Start (${prevStartStr} -> ${newStartStr}), Deadline (${prevEndStr} -> ${newEndStr}). Reason: ${reason.trim()}`,
			});

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "Project Date Change",
				details: `Deadline updated to ${newEndStr}. Reason: ${reason.trim()}`,
			});

			socketService.emitToWorkspace(workspaceId, "project.updated", updated);

			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Project date change error: ${err?.message || String(err)}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to update project dates" });
		}
	},
);

// ─── Verify Requirement / Upload Asset / GitHub Link ─────────────────────────
orgProjectsRouter.post(
	"/:id/verify-requirement",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const { key, status, fileUrl, fileName, githubUrl, feedback } = req.body;

			const [existing] = await db
				.select()
				.from(projects)
				.where(eq(projects.id, id))
				.limit(1);
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const updates: any = { updatedAt: new Date() };
			if (githubUrl !== undefined) updates.githubUrl = githubUrl;

			const [updated] = await db
				.update(projects)
				.set(updates)
				.where(eq(projects.id, id))
				.returning();

			// Log Activity & Audit
			const isApproval =
				status === "Ready" || status === "Completed" || status === "VERIFIED";
			const actionText = isApproval
				? `Approved Requirement "${key}"`
				: `Updated Requirement "${key}" (${status})`;

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: actionText,
				details: `${key} updated to ${status}.${fileName ? ` File: ${fileName}` : ""}${githubUrl ? ` GitHub: ${githubUrl}` : ""}${feedback ? ` Feedback: ${feedback}` : ""}`,
			});

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: isApproval ? "REQUIREMENT_APPROVED" : "REQUIREMENT_UPDATED",
				details: `Project "${existing.name}" requirement "${key}" -> ${status}`,
			});

			socketService.emitToWorkspace(workspaceId, "project.updated", updated);

			res.json({
				success: true,
				data: updated,
				message: "Requirement updated successfully",
			});
		} catch (err: any) {
			logger.error(`Verify requirement error: ${err.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to update requirement" });
		}
	},
);

// ─── Update Full Project Details (PATCH /:id) ──────────────────────────────
orgProjectsRouter.patch(
	"/:id",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const {
				name,
				description,
				objective,
				startDate,
				deadline,
				priority,
				status,
				health,
				ownerId,
				githubUrl,
				reason,
			} = req.body;

			const [existing] = await db
				.select()
				.from(projects)
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.limit(1);
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const newStart = startDate
				? new Date(startDate)
				: existing.startDate || new Date();
			const newEnd = deadline
				? new Date(deadline)
				: existing.deadline || new Date();

			if (newEnd.getTime() <= newStart.getTime()) {
				return res.status(400).json({
					success: false,
					error:
						"Project Start Date/Time must be strictly earlier than Deadline",
				});
			}

			const updates: any = { updatedAt: new Date() };
			if (name !== undefined) updates.name = name.trim();
			if (description !== undefined)
				updates.description = description ? description.trim() : null;
			if (objective !== undefined)
				updates.objective = objective ? objective.trim() : null;
			if (startDate !== undefined) updates.startDate = newStart;
			if (deadline !== undefined) updates.deadline = newEnd;
			if (priority !== undefined) updates.priority = priority;
			if (status !== undefined) updates.status = status;
			if (health !== undefined) updates.health = health;
			if (ownerId !== undefined) updates.ownerId = ownerId;

			const [updated] = await db
				.update(projects)
				.set(updates)
				.where(eq(projects.id, id))
				.returning();

			// Log Audit Event
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_UPDATED",
				details: `Project "${updated.name}" updated. ${reason ? `Reason: ${reason.trim()}` : ""}`,
			});

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "Project Details Updated",
				details: `Updated mandate details for "${updated.name}"`,
			});

			socketService.emitToWorkspace(workspaceId, "project.updated", updated);
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Update project error: ${err?.message || String(err)}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to update project" });
		}
	},
);

// ─── Milestone Endpoints (CRUD + Reorder) ──────────────────────────────────

// GET /:id/milestones — Fetch Milestones for Project
orgProjectsRouter.get(
	"/:id/milestones",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const id = req.params.id as string;
			const msList = await db
				.select()
				.from(milestones)
				.where(eq(milestones.projectId, id))
				.orderBy(asc(milestones.order));
			res.json({ success: true, data: msList });
		} catch (_err: any) {
			res
				.status(500)
				.json({ success: false, error: "Failed to fetch milestones" });
		}
	},
);

// POST /:id/milestones — Create Milestone
orgProjectsRouter.post(
	"/:id/milestones",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const { name, description, deadline, status, order } = req.body;

			if (!name?.trim())
				return res
					.status(400)
					.json({ success: false, error: "Milestone name is required" });

			const [existingProj] = await db
				.select()
				.from(projects)
				.where(eq(projects.id, id))
				.limit(1);
			if (!existingProj)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const msDeadline = deadline ? new Date(deadline) : existingProj.deadline;
			if (
				msDeadline &&
				existingProj.deadline &&
				msDeadline.getTime() > new Date(existingProj.deadline).getTime()
			) {
				return res.status(400).json({
					success: false,
					error:
						"Milestone target date cannot exceed project executive deadline",
				});
			}

			const [newMs] = await db
				.insert(milestones)
				.values({
					id: uuidv4(),
					projectId: id,
					name: name.trim(),
					description: description ? description.trim() : null,
					deadline: msDeadline,
					status: status || "Pending",
					order: order !== undefined ? order : 0,
				})
				.returning();

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "MILESTONE_CREATED",
				details: `Milestone "${newMs.name}" created for project "${existingProj.name}"`,
			});

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "Milestone Created",
				details: `Added milestone "${newMs.name}"`,
			});

			res.json({ success: true, data: newMs });
		} catch (err: any) {
			logger.error(`Create milestone error: ${err?.message || String(err)}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to create milestone" });
		}
	},
);

// PATCH /:id/milestones/:msId — Update Milestone
orgProjectsRouter.patch(
	"/:id/milestones/:msId",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const msId = req.params.msId as string;
			const { name, description, deadline, status } = req.body;

			const updates: any = {};
			if (name !== undefined) updates.name = name.trim();
			if (description !== undefined)
				updates.description = description ? description.trim() : null;
			if (deadline !== undefined)
				updates.deadline = deadline ? new Date(deadline) : null;
			if (status !== undefined) updates.status = status;

			const [updated] = await db
				.update(milestones)
				.set(updates)
				.where(and(eq(milestones.id, msId), eq(milestones.projectId, id)))
				.returning();

			if (!updated)
				return res
					.status(404)
					.json({ success: false, error: "Milestone not found" });

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "Milestone Updated",
				details: `Updated milestone "${updated.name}" (${updated.status})`,
			});

			res.json({ success: true, data: updated });
		} catch (_err: any) {
			res
				.status(500)
				.json({ success: false, error: "Failed to update milestone" });
		}
	},
);

// DELETE /:id/milestones/:msId — Delete/Archive Milestone
orgProjectsRouter.delete(
	"/:id/milestones/:msId",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const msId = req.params.msId as string;

			const [deleted] = await db
				.delete(milestones)
				.where(and(eq(milestones.id, msId), eq(milestones.projectId, id)))
				.returning();

			if (deleted) {
				await db.insert(activities).values({
					id: uuidv4(),
					workspaceId,
					projectId: id,
					userId,
					action: "Milestone Archived",
					details: `Archived milestone "${deleted.name}"`,
				});
			}

			res.json({ success: true, data: deleted });
		} catch (_err: any) {
			res
				.status(500)
				.json({ success: false, error: "Failed to delete milestone" });
		}
	},
);

// ─── Update Project ───────────────────────────────────────────────────────────
orgProjectsRouter.patch(
	"/:id",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const {
				name,
				description,
				goal,
				deadline,
				priority,
				status,
				tags,
				health,
			} = req.body;

			const existing = await db.query.projects.findFirst({
				where: and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)),
			});
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const updates: any = {};
			if (name !== undefined) updates.name = name;
			if (description !== undefined) updates.description = description;
			if (goal !== undefined) updates.objective = goal;
			if (deadline !== undefined)
				updates.deadline = deadline ? new Date(deadline) : null;
			if (priority !== undefined) updates.priority = priority;
			if (status !== undefined) {
				updates.status = status;
				if (status === "Completed") updates.completedAt = new Date();
			}
			if (tags !== undefined) updates.tags = tags;
			if (health !== undefined) updates.health = health;

			const [updated] = await db
				.update(projects)
				.set(updates)
				.where(eq(projects.id, id))
				.returning();

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_UPDATED",
				details: `Project "${updated.name}" updated`,
			});
			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "Project updated",
				details: `Updated project "${updated.name}"`,
			});

			socketService.emitToWorkspace(workspaceId, "project.updated", updated);
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Update project error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Delete Project ───────────────────────────────────────────────────────────
orgProjectsRouter.delete(
	"/:id",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const membership = (req as any).membership;
			if (membership.role !== "CEO" && membership.role !== "CO-CEO") {
				return res.status(403).json({
					success: false,
					error: "Only CEO or CO-CEO can delete projects",
				});
			}

			const existing = await db.query.projects.findFirst({
				where: and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)),
			});
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			// Cascade delete all associated child records first to satisfy Foreign Key constraints
			try { await db.delete(tasks).where(eq(tasks.projectId, id)); } catch (e) {}
			try { await db.delete(milestones).where(eq(milestones.projectId, id)); } catch (e) {}
			try { await db.delete(projectMilestonesV2).where(eq(projectMilestonesV2.projectId, id)); } catch (e) {}
			try { await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id)); } catch (e) {}
			try { await db.delete(projectDocuments).where(eq(projectDocuments.projectId, id)); } catch (e) {}
			try { await db.delete(projectRequirements).where(eq(projectRequirements.projectId, id)); } catch (e) {}
			try { await db.delete(projectFeatures).where(eq(projectFeatures.projectId, id)); } catch (e) {}

			await db.delete(projects).where(eq(projects.id, id));
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_DELETED",
				details: `Project "${existing.name}" deleted`,
			});
			socketService.emitToWorkspace(workspaceId, "project.deleted", { id });
			res.json({ success: true, message: "Project deleted" });
		} catch (err: any) {
			logger.error(`Delete project error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Archive Project (POST /:id/archive) ──────────────────────────────────────
orgProjectsRouter.post(
	"/:id/archive",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;

			const [updated] = await db
				.update(projects)
				.set({
					status: "Archived",
					updatedAt: new Date(),
				})
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.returning();

			if (!updated) {
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });
			}

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_UPDATED",
				details: `Project "${updated.name}" archived`,
			});

			socketService.emitToWorkspace(workspaceId, "project.updated", updated);
			res.json({ success: true, data: updated, message: "Project archived" });
		} catch (err: any) {
			logger.error(`Archive project error: ${err.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to archive project" });
		}
	},
);

// ─── Milestones ───────────────────────────────────────────────────────────────
orgProjectsRouter.post(
	"/:id/milestones",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const id = req.params.id as string;
			const { name, description, deadline, order } = req.body;
			if (!name)
				return res
					.status(400)
					.json({ success: false, error: "Milestone name is required" });

			const project = await db.query.projects.findFirst({
				where: and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)),
			});
			if (!project)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const [ms] = await db
				.insert(milestones)
				.values({
					id: uuidv4(),
					projectId: id,
					name,
					description: description || null,
					deadline: deadline ? new Date(deadline) : null,
					status: "Pending",
					order: order || 0,
				})
				.returning();

			socketService.emitToWorkspace(workspaceId, "milestone.updated", ms);
			res.json({ success: true, data: ms });
		} catch (err: any) {
			logger.error(`Create milestone error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

orgProjectsRouter.patch(
	"/:id/milestones/:msId",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const msId = req.params.msId as string;
			const { name, description, deadline, status, order } = req.body;

			const updates: any = {};
			if (name !== undefined) updates.name = name;
			if (description !== undefined) updates.description = description;
			if (deadline !== undefined)
				updates.deadline = deadline ? new Date(deadline) : null;
			if (status !== undefined) {
				updates.status = status;
				if (status === "Completed") updates.completedAt = new Date();
			}
			if (order !== undefined) updates.order = order;

			const [updated] = await db
				.update(milestones)
				.set(updates)
				.where(eq(milestones.id, msId))
				.returning();
			socketService.emitToWorkspace(workspaceId, "milestone.updated", updated);
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Update milestone error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// GET Project Activity & Timeline History
orgProjectsRouter.get("/:id/timeline", async (req: Request, res: Response) => {
	try {
		const id = req.params.id as string;
		let workspaceId = String(
			(req as any).workspaceId || req.query.workspaceId || "",
		);

		if (!workspaceId || workspaceId === "null" || workspaceId === "undefined") {
			const [proj] = await db
				.select()
				.from(projects)
				.where(eq(projects.id, id))
				.limit(1);
			if (proj) workspaceId = proj.workspaceId;
		}

		const projectActivities = await db
			.select({
				id: activities.id,
				action: activities.action,
				details: activities.details,
				createdAt: activities.createdAt,
				userName: users.displayName,
				userEmail: users.email,
				userAvatar: users.avatar,
			})
			.from(activities)
			.leftJoin(users, eq(activities.userId, users.id))
			.where(eq(activities.projectId, id))
			.orderBy(desc(activities.createdAt))
			.limit(50);

		const events = projectActivities.map((a) => ({
			id: a.id,
			type: "PROJECT_ACTIVITY",
			action: a.action,
			details: a.details,
			createdAt: a.createdAt,
			actor: {
				name: a.userName || a.userEmail || "System",
				avatar: a.userAvatar,
			},
		}));

		res.json({ success: true, data: events });
	} catch (err: any) {
		logger.error(`Get project timeline error: ${err.message}`);
		res.status(500).json({
			success: false,
			error: "Failed to load project timeline history",
		});
	}
});

// ─── GET Project Team Members (GET /:id/members) ─────────────────────────────
orgProjectsRouter.get(
	"/:id/members",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const workspaceId = (req as any).workspaceId;

			// Fetch project owner & assigned users
			const [project] = await db
				.select()
				.from(projects)
				.where(eq(projects.id, id))
				.limit(1);

			if (!project) {
				return res.status(404).json({ success: false, error: "Project not found" });
			}

			// Fetch project assignments
			const assignments = await db
				.select({
					id: projectAssignments.id,
					assignedToUserId: projectAssignments.assignedToUserId,
					responsibleCoCeoId: projectAssignments.responsibleCoCeoId,
					assignmentType: projectAssignments.assignmentType,
					status: projectAssignments.status,
					createdAt: projectAssignments.createdAt,
					userName: users.displayName,
					userEmail: users.email,
					userAvatar: users.avatar,
					userRole: users.role,
				})
				.from(projectAssignments)
				.leftJoin(users, eq(projectAssignments.assignedToUserId, users.id))
				.where(eq(projectAssignments.projectId, id));

			// Fetch task counts per user for this project
			const projectTasks = await db
				.select({
					assigneeId: tasks.assigneeId,
					status: tasks.status,
				})
				.from(tasks)
				.where(eq(tasks.projectId, id));

			const taskStatsByUser: Record<string, { total: number; completed: number }> = {};
			for (const t of projectTasks) {
				if (t.assigneeId) {
					if (!taskStatsByUser[t.assigneeId]) {
						taskStatsByUser[t.assigneeId] = { total: 0, completed: 0 };
					}
					taskStatsByUser[t.assigneeId].total += 1;
					if (t.status === "DONE" || t.status === "Completed" || t.status === "COMPLETED") {
						taskStatsByUser[t.assigneeId].completed += 1;
					}
				}
			}

			// Format team list
			const team = assignments.map((a) => {
				const stats = taskStatsByUser[a.assignedToUserId] || { total: 0, completed: 0 };
				return {
					id: a.id,
					userId: a.assignedToUserId,
					name: a.userName || a.userEmail || "Team Member",
					email: a.userEmail || "",
					avatar: a.userAvatar,
					orgRole: a.userRole || "MEMBER",
					projectRole: a.assignmentType === "CEO_TO_CO_CEO" ? "EXECUTION_LEAD" : "CONTRIBUTOR",
					assignmentStatus: a.status,
					assignedTasks: stats.total,
					completedTasks: stats.completed,
					progress: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
					joinedAt: a.createdAt,
				};
			});

			res.json({
				success: true,
				data: {
					ownerId: project.ownerId,
					team,
				},
			});
		} catch (err: any) {
			logger.error(`Get project team members error: ${err.message}`);
			res.status(500).json({ success: false, error: "Failed to load project team members" });
		}
	},
);

// ─── POST Assign Project Member (POST /:id/members) ──────────────────────────
orgProjectsRouter.post(
	"/:id/members",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const { assignedToUserId, projectRole = "CONTRIBUTOR" } = req.body;

			if (!assignedToUserId) {
				return res.status(400).json({ success: false, error: "assignedToUserId is required" });
			}

			// Check if already assigned
			const [existing] = await db
				.select()
				.from(projectAssignments)
				.where(and(eq(projectAssignments.projectId, id), eq(projectAssignments.assignedToUserId, assignedToUserId)))
				.limit(1);

			if (existing) {
				return res.status(400).json({ success: false, error: "User is already assigned to this project" });
			}

			const assignmentId = uuidv4();
			await db.insert(projectAssignments).values({
				id: assignmentId,
				projectId: id,
				workspaceId,
				createdByUserId: userId,
				assignedToUserId,
				assignmentType: projectRole === "EXECUTION_LEAD" ? "CEO_TO_CO_CEO" : "CEO_TO_MEMBER",
				status: "ACCEPTED",
			});

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_MEMBER_ADDED",
				details: `Added user ${assignedToUserId} to project ${id}`,
			});

			res.json({ success: true, message: "Project team member assigned successfully" });
		} catch (err: any) {
			logger.error(`Add project team member error: ${err.message}`);
			res.status(500).json({ success: false, error: "Failed to add project team member" });
		}
	},
);

// ─── DELETE Remove Project Member (DELETE /:id/members/:assignmentId) ────────
orgProjectsRouter.delete(
	"/:id/members/:assignmentId",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const { id, assignmentId } = req.params;
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;

			await db
				.delete(projectAssignments)
				.where(and(eq(projectAssignments.id, assignmentId), eq(projectAssignments.projectId, id)));

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_MEMBER_REMOVED",
				details: `Removed assignment ${assignmentId} from project ${id}`,
			});

			res.json({ success: true, message: "Project member removed" });
		} catch (err: any) {
			logger.error(`Remove project member error: ${err.message}`);
			res.status(500).json({ success: false, error: "Failed to remove project member" });
		}
	},
);

// ─── POST Accept Project Assignment (POST /:id/accept-assignment) ──────────────
orgProjectsRouter.post(
	"/:id/accept-assignment",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const id = req.params.id as string;
			const userId = (req as any).user?.id;
			const workspaceId = (req as any).workspaceId;

			const [pa] = await db
				.select()
				.from(projectAssignments)
				.where(and(eq(projectAssignments.projectId, id), eq(projectAssignments.assignedToUserId, userId)))
				.orderBy(desc(projectAssignments.createdAt))
				.limit(1);

			if (pa) {
				await db
					.update(projectAssignments)
					.set({ status: "ACCEPTED", acceptedAt: new Date(), updatedAt: new Date() })
					.where(eq(projectAssignments.id, pa.id));
			}

			await db
				.update(projects)
				.set({ status: "AWAITING_SETUP", updatedAt: new Date() })
				.where(eq(projects.id, id));

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "EXECUTION_LEAD_ACCEPTED",
				details: `User ${userId} accepted project assignment for project ${id}`,
				createdAt: new Date(),
			});

			try {
				socketService.emitToWorkspace(workspaceId, "project.assignment.accepted", { projectId: id, userId });
				socketService.emitToWorkspace(workspaceId, "project_updated", { projectId: id });
			} catch (e) {}

			res.json({ success: true, message: "Project assignment accepted successfully" });
		} catch (err: any) {
			logger.error(`Accept assignment error: ${err.message}`);
			res.status(500).json({ success: false, error: "Failed to accept assignment" });
		}
	},
);

// ─── POST Decline Project Assignment (POST /:id/decline-assignment) ────────────
orgProjectsRouter.post(
	"/:id/decline-assignment",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const id = req.params.id as string;
			const userId = (req as any).user?.id;
			const workspaceId = (req as any).workspaceId;
			const { reason } = req.body;

			const [pa] = await db
				.select()
				.from(projectAssignments)
				.where(and(eq(projectAssignments.projectId, id), eq(projectAssignments.assignedToUserId, userId)))
				.orderBy(desc(projectAssignments.createdAt))
				.limit(1);

			if (pa) {
				await db
					.update(projectAssignments)
					.set({ status: "DECLINED", rejectionReason: reason || null, declinedAt: new Date(), updatedAt: new Date() })
					.where(eq(projectAssignments.id, pa.id));
			}

			await db
				.update(projects)
				.set({ status: "AWAITING_ACCEPTANCE", executionLeadId: null, updatedAt: new Date() })
				.where(eq(projects.id, id));

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "EXECUTION_LEAD_DECLINED",
				details: `User ${userId} declined project assignment for project ${id}`,
				createdAt: new Date(),
			});

			try {
				socketService.emitToWorkspace(workspaceId, "project.assignment.declined", { projectId: id, userId, reason });
				socketService.emitToWorkspace(workspaceId, "project_updated", { projectId: id });
			} catch (e) {}

			res.json({ success: true, message: "Project assignment declined" });
		} catch (err: any) {
			logger.error(`Decline assignment error: ${err.message}`);
			res.status(500).json({ success: false, error: "Failed to decline assignment" });
		}
	},
);

// ─── POST Accept Project Plan (POST /:id/accept-plan) ─────────────────────────
orgProjectsRouter.post(
	"/:id/accept-plan",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const id = req.params.id as string;
			const userId = (req as any).user?.id;
			const workspaceId = (req as any).workspaceId;

			await db
				.update(projects)
				.set({ projectPlanStatus: "ACCEPTED", updatedAt: new Date() })
				.where(eq(projects.id, id));

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_PLAN_ACCEPTED",
				details: `User ${userId} accepted project execution plan for project ${id}`,
				createdAt: new Date(),
			});

			try {
				socketService.emitToWorkspace(workspaceId, "project.plan.accepted", { projectId: id, userId });
				socketService.emitToWorkspace(workspaceId, "project_updated", { projectId: id });
			} catch (e) {}

			res.json({ success: true, message: "Project plan accepted successfully" });
		} catch (err: any) {
			logger.error(`Accept plan error: ${err.message}`);
			res.status(500).json({ success: false, error: "Failed to accept project plan" });
		}
	},
);

// ─── POST Accept Member Invitation (POST /:id/accept-member) ───────────────────
orgProjectsRouter.post(
	"/:id/accept-member",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const id = req.params.id as string;
			const userId = (req as any).user?.id;
			const workspaceId = (req as any).workspaceId;

			await db
				.update(projectMembers)
				.set({ status: "ACCEPTED" })
				.where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)));

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "MEMBER_ACCEPTED",
				details: `User ${userId} accepted membership invitation for project ${id}`,
				createdAt: new Date(),
			});

			try {
				socketService.emitToWorkspace(workspaceId, "project.member.accepted", { projectId: id, userId });
				socketService.emitToWorkspace(workspaceId, "project_updated", { projectId: id });
			} catch (e) {}

			res.json({ success: true, message: "Member invitation accepted" });
		} catch (err: any) {
			logger.error(`Accept member error: ${err.message}`);
			res.status(500).json({ success: false, error: "Failed to accept member invitation" });
		}
	},
);

export default orgProjectsRouter;
