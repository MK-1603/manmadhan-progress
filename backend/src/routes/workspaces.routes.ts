import fs from "node:fs";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import { users, workspaceMembers, workspaces } from "../../database/schema";
import { cloudinaryService } from "../../storage/cloudinary.service";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";

export const workspacesRouter = Router();

workspacesRouter.use(authenticate);

workspacesRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		if (!userId) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}
		const userWorkspaces = await db
			.select({
				id: workspaces.id,
				name: workspaces.name,
				shortName: workspaces.shortName,
				batchNumber: workspaces.batchNumber,
				description: workspaces.description,
				logoUrl: workspaces.logoUrl,
				website: workspaces.website,
				contactEmail: workspaces.contactEmail,
				type: workspaces.type,
				role: workspaceMembers.role,
				createdAt: workspaces.createdAt,
			})
			.from(workspaces)
			.innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
			.where(eq(workspaceMembers.userId, userId));

		res.json({ success: true, data: userWorkspaces });
	} catch (error: any) {
		logger.error(`List User Workspaces Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// Create a new Workspace (Organization)
workspacesRouter.post("/", async (req: Request, res: Response) => {
	try {
		const { name } = req.body;
		const userId = (req as any).user?.id;

		if (!name || typeof name !== "string") {
			return res
				.status(400)
				.json({ success: false, error: "Workspace name is required." });
		}

		const workspaceId = uuidv4();

		// Create the workspace
		const newWorkspace = await db
			.insert(workspaces)
			.values({
				id: workspaceId,
				name,
				type: "organization",
			})
			.returning();

		// Add the creator as CEO
		await db.insert(workspaceMembers).values({
			id: uuidv4(),
			workspaceId,
			userId,
			role: "CEO",
		});

		res.json({
			success: true,
			message: "Workspace created successfully.",
			data: newWorkspace[0],
		});
	} catch (error: any) {
		logger.error(`Create Workspace Error: ${(error as Error).message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// Get Workspace by ID
workspacesRouter.get("/:workspaceId", async (req: Request, res: Response) => {
	try {
		const { workspaceId } = req.params;
		const userId = (req as any).user?.id;

		if (!userId) {
			return res.status(401).json({ success: false, error: "Authentication required" });
		}

		// Check membership or allow access if member of the workspace
		const membership = await db.query.workspaceMembers.findFirst({
			where: and(
				eq(workspaceMembers.workspaceId, String(workspaceId)),
				eq(workspaceMembers.userId, userId),
			),
		});

		if (!membership) {
			return res.status(403).json({ success: false, error: "Access denied to workspace" });
		}

		const workspace = await db.query.workspaces.findFirst({
			where: eq(workspaces.id, String(workspaceId)),
		});

		if (!workspace) {
			return res.status(404).json({ success: false, error: "Workspace not found" });
		}

		const role = (membership.role || "").toUpperCase().replace(/_/g, "-").trim();
		const normalizedRole = role === "CEO" || role === "ADMIN" || role === "OWNER" ? "CEO" : role === "CO-CEO" || role === "COCEO" ? "CO-CEO" : "MEMBER";

		res.json({
			success: true,
			data: {
				...workspace,
				role: normalizedRole,
				name: workspace.name && workspace.name !== "Personal Workspace" ? workspace.name : "ManMadhan Workspace",
			},
		});
	} catch (error: any) {
		logger.error(`Get Workspace Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
});

// Middleware to verify CEO or CO-CEO role for management actions
const requireLeadership = async (
	req: Request,
	res: Response,
	next: Function,
) => {
	const { workspaceId } = req.params;
	const userId = (req as any).user?.id;

	if (!userId) {
		return res.status(401).json({ success: false, error: "Authentication required" });
	}

	try {
		// 1. Fetch user from DB to verify global role
		const user = await db.query.users.findFirst({
			where: eq(users.id, userId),
		});

		const userRole = (user?.role || (req as any).user?.role || "").toUpperCase().replace(/_/g, "-").trim();
		const isSystemOwner = user?.systemOwner === true || (req as any).user?.systemOwner === true;

		// Global CEO, ADMIN, or System Owner always has leadership permissions
		if (userRole === "CEO" || userRole === "ADMIN" || userRole === "OWNER" || isSystemOwner) {
			return next();
		}

		// 2. Check workspace-specific membership role
		const membership = await db.query.workspaceMembers.findFirst({
			where: and(
				eq(workspaceMembers.workspaceId, String(workspaceId)),
				eq(workspaceMembers.userId, userId),
			),
		});

		const rawMemberRole = (membership?.role || "").toUpperCase().replace(/_/g, "-").trim();
		const isMemberLeadership =
			rawMemberRole === "CEO" ||
			rawMemberRole === "ADMIN" ||
			rawMemberRole === "OWNER" ||
			rawMemberRole === "CO-CEO" ||
			rawMemberRole === "COCEO";

		if (isMemberLeadership || (membership && (userRole === "CO-CEO" || userRole === "COCEO"))) {
			return next();
		}

		return res.status(403).json({
			success: false,
			error: "Only CEO or CO-CEO can perform this action.",
		});
	} catch (error) {
		logger.error(`Leadership Verification Error: ${(error as Error).message}`);
		res.status(500).json({ success: false, error: "Internal server error." });
	}
};

// Add Member
workspacesRouter.post(
	"/:workspaceId/members",
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const { workspaceId } = req.params;
			const { email, role } = req.body;

			if (!email)
				return res
					.status(400)
					.json({ success: false, error: "Email is required." });

			const user = await db.query.users.findFirst({
				where: eq(users.email, String(email)),
			});

			if (!user) {
				return res
					.status(404)
					.json({ success: false, error: "User not found with this email." });
			}

			// Check if already a member
			const existing = await db.query.workspaceMembers.findFirst({
				where: and(
					eq(workspaceMembers.workspaceId, String(workspaceId)),
					eq(workspaceMembers.userId, user.id),
				),
			});

			if (existing) {
				return res
					.status(400)
					.json({ success: false, error: "User is already a member." });
			}

			const newMember = await db
				.insert(workspaceMembers)
				.values({
					id: uuidv4(),
					workspaceId: String(workspaceId),
					userId: user.id,
					role: role || "MEMBER",
				})
				.returning();

			res.json({
				success: true,
				message: "Member added successfully.",
				data: newMember[0],
			});
		} catch (error: any) {
			logger.error(`Add Member Error: ${(error as Error).message}`);
			res.status(500).json({ success: false, error: "Internal server error." });
		}
	},
);

// Update Member Role
workspacesRouter.put(
	"/:workspaceId/members/:userId",
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const { workspaceId, userId } = req.params;
			const { role } = req.body;

			if (!role)
				return res
					.status(400)
					.json({ success: false, error: "Role is required." });

			const updated = await db
				.update(workspaceMembers)
				.set({ role })
				.where(
					and(
						eq(workspaceMembers.workspaceId, String(workspaceId)),
						eq(workspaceMembers.userId, String(userId)),
					),
				)
				.returning();

			if (!updated.length) {
				return res
					.status(404)
					.json({ success: false, error: "Member not found." });
			}

			res.json({
				success: true,
				message: "Member role updated.",
				data: updated[0],
			});
		} catch (error: any) {
			logger.error(`Update Member Error: ${(error as Error).message}`);
			res.status(500).json({ success: false, error: "Internal server error." });
		}
	},
);

// Remove Member
workspacesRouter.delete(
	"/:workspaceId/members/:userId",
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const { workspaceId, userId } = req.params;

			// Prevent CEO from removing themselves
			const deleterId = (req as any).user?.id;
			if (deleterId === userId) {
				return res.status(400).json({
					success: false,
					error: "You cannot remove yourself. Transfer ownership first.",
				});
			}

			const removed = await db
				.delete(workspaceMembers)
				.where(
					and(
						eq(workspaceMembers.workspaceId, String(workspaceId)),
						eq(workspaceMembers.userId, String(userId)),
					),
				)
				.returning();

			if (!removed.length) {
				return res
					.status(404)
					.json({ success: false, error: "Member not found." });
			}

			res.json({ success: true, message: "Member removed." });
		} catch (error: any) {
			logger.error(`Remove Member Error: ${(error as Error).message}`);
			res.status(500).json({ success: false, error: "Internal server error." });
		}
	},
);

// Update Workspace Settings (Organization Branding & Logo)
workspacesRouter.put(
	"/:workspaceId",
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const { workspaceId } = req.params;
			const { name, logoUrl, description, website, contactEmail } = req.body;

			const updatePayload: any = {};
			if (name !== undefined) updatePayload.name = String(name).trim();
			if (logoUrl !== undefined)
				updatePayload.logoUrl = logoUrl ? String(logoUrl).trim() : null;
			if (description !== undefined)
				updatePayload.description = description
					? String(description).trim()
					: null;
			if (website !== undefined)
				updatePayload.website = website ? String(website).trim() : null;
			if (contactEmail !== undefined)
				updatePayload.contactEmail = contactEmail
					? String(contactEmail).trim()
					: null;

			const [updated] = await db
				.update(workspaces)
				.set(updatePayload)
				.where(eq(workspaces.id, String(workspaceId)))
				.returning();

			if (!updated) {
				return res
					.status(404)
					.json({ success: false, error: "Workspace not found" });
			}

			res.json({
				success: true,
				message: "Organization settings updated successfully",
				data: updated,
			});
		} catch (error: any) {
			logger.error(
				`Update Workspace Settings Error: ${(error as Error).message}`,
			);
			res
				.status(500)
				.json({ success: false, error: "Failed to update workspace settings" });
		}
	},
);

// Upload Organization Logo
workspacesRouter.post(
	"/:workspaceId/logo",
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const { workspaceId } = req.params;
			const { image, mimeType } = req.body;

			if (!image) {
				return res.status(400).json({ success: false, error: "Image data is required." });
			}

			const allowedMimeTypes = [
				"image/png",
				"image/jpeg",
				"image/jpg",
				"image/webp",
				"image/svg+xml",
			];

			const detectedMime = mimeType || (image.match(/^data:(image\/[a-zA-Z0-9+\-+.]+);base64,/) || [])[1];
			if (detectedMime && !allowedMimeTypes.includes(detectedMime)) {
				return res.status(400).json({
					success: false,
					error: "Invalid file format. Allowed formats: PNG, JPG, WebP, SVG.",
				});
			}

			// Estimate file size from base64 string
			const base64Clean = image.replace(/^data:image\/[a-zA-Z0-9+\-+.]+;base64,/, "");
			const sizeInBytes = (base64Clean.length * 3) / 4;
			if (sizeInBytes > 5 * 1024 * 1024) {
				return res.status(400).json({
					success: false,
					error: "File size exceeds 5 MB limit. Please select a smaller logo.",
				});
			}

			const existing = await db.query.workspaces.findFirst({
				where: eq(workspaces.id, String(workspaceId)),
			});

			if (!existing) {
				return res.status(404).json({ success: false, error: "Workspace not found." });
			}

			let finalLogoUrl = "";

			if (cloudinaryService.isConfigured()) {
				const uploadResult = await cloudinaryService.uploadBase64(
					image.startsWith("data:") ? image : `data:${detectedMime || "image/png"};base64,${image}`,
					"manmadhan-organization-logos",
				);
				finalLogoUrl = uploadResult.secure_url;
			} else {
				const uploadsLogoDir = path.join(process.cwd(), "uploads", "logos");
				if (!fs.existsSync(uploadsLogoDir)) {
					fs.mkdirSync(uploadsLogoDir, { recursive: true });
				}
				const ext = detectedMime ? detectedMime.split("/")[1].replace("svg+xml", "svg") : "png";
				const fileName = `logo-${workspaceId}-${Date.now()}.${ext}`;
				const filePath = path.join(uploadsLogoDir, fileName);
				fs.writeFileSync(filePath, Buffer.from(base64Clean, "base64"));
				finalLogoUrl = `/uploads/logos/${fileName}`;
			}

			const [updated] = await db
				.update(workspaces)
				.set({ logoUrl: finalLogoUrl })
				.where(eq(workspaces.id, String(workspaceId)))
				.returning();

			logger.info({ workspaceId, logoUrl: finalLogoUrl }, "Organization logo uploaded and saved ✓");

			res.json({
				success: true,
				message: "Organization logo uploaded successfully",
				data: updated,
			});
		} catch (error: any) {
			logger.error(`Upload Workspace Logo Error: ${(error as Error).message}`);
			res.status(500).json({
				success: false,
				error: "Failed to upload organization logo. Please try again.",
			});
		}
	},
);
