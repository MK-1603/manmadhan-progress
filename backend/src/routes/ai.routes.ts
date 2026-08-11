import { and, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import { aiContext, workspaceMembers } from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";

export const aiRouter = Router();

aiRouter.use(authenticate);

// Middleware to verify workspace membership
const verifyWorkspaceAccess = async (
	req: Request,
	res: Response,
	next: Function,
) => {
	const workspaceId = req.params.workspaceId || req.body.workspaceId;
	const userId = (req as any).user?.id;

	if (!workspaceId) {
		return res
			.status(400)
			.json({ success: false, error: "Missing workspaceId." });
	}

	if (!userId) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		const membership = await db.query.workspaceMembers.findFirst({
			where: and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.userId, userId),
			),
		});

		if (!membership) {
			return res
				.status(403)
				.json({ success: false, error: "Access denied to this workspace." });
		}

		next();
	} catch (error) {
		logger.error("Workspace Verification Error: " + (error as Error).message);
		res
			.status(500)
			.json({
				success: false,
				error: "Internal server error during authorization.",
			});
	}
};

// Inject new context into the workspace
aiRouter.post(
	"/context",
	verifyWorkspaceAccess,
	async (req: Request, res: Response) => {
		try {
			const { workspaceId, content, type } = req.body;
			const userId = (req as any).user?.id!;

			if (!content || typeof content !== "string") {
				return res
					.status(400)
					.json({ success: false, error: "Content is required." });
			}

			if (!type || typeof type !== "string") {
				return res
					.status(400)
					.json({
						success: false,
						error:
							"Context type is required (e.g., 'document', 'project_brief').",
					});
			}

			const newContext = await db
				.insert(aiContext)
				.values({
					id: uuidv4(),
					workspaceId,
					userId,
					content,
					type,
				})
				.returning();

			res.json({
				success: true,
				message: "AI Context injected successfully.",
				data: newContext[0],
			});
		} catch (error: any) {
			logger.error("AI Context Injection Error: " + (error as Error).message);
			res
				.status(500)
				.json({ success: false, error: "An internal server error occurred." });
		}
	},
);

// Retrieve context for a specific workspace
aiRouter.get(
	"/context/:workspaceId",
	verifyWorkspaceAccess,
	async (req: Request, res: Response) => {
		try {
			const { workspaceId } = req.params;

			const contextChunks = await db
				.select()
				.from(aiContext)
				.where(eq(aiContext.workspaceId, String(workspaceId)))
				.orderBy(aiContext.createdAt); // Order by oldest first or newest first based on needs

			res.json({
				success: true,
				data: contextChunks,
			});
		} catch (error: any) {
			logger.error("AI Context Retrieval Error: " + (error as Error).message);
			res
				.status(500)
				.json({ success: false, error: "An internal server error occurred." });
		}
	},
);
