import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import { workspaceMembers, workspaces } from "../../database/schema";
import { logger } from "../services/logger.service";

/**
 * Middleware to enforce that the authenticated user is a member of the requested workspace.
 * If no workspaceId is provided, defaults to finding or creating the user's Personal Workspace.
 */
export const requireWorkspaceMember = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const user = (req as any).user;
		if (!user?.id) {
			return res
				.status(401)
				.json({ success: false, error: "Authentication required" });
		}

		let workspaceId =
			(req.query.workspaceId as string) ||
			(req.body.workspaceId as string) ||
			(req.params.workspaceId as string);

		// Phase 1 Fix: If no workspaceId, resolve to personal workspace
		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
			const personalWs = await db
				.select({ id: workspaces.id })
				.from(workspaces)
				.innerJoin(
					workspaceMembers,
					eq(workspaces.id, workspaceMembers.workspaceId),
				)
				.where(
					and(
						eq(workspaceMembers.userId, user.id),
						eq(workspaces.type, "personal"),
					),
				)
				.limit(1);

			if (personalWs.length > 0) {
				workspaceId = personalWs[0].id;
			} else {
				const newWsId = uuidv4();
				await db.insert(workspaces).values({
					id: newWsId,
					name: "Personal Workspace",
					type: "personal",
				});
				await db.insert(workspaceMembers).values({
					id: uuidv4(),
					workspaceId: newWsId,
					userId: user.id,
					role: "OWNER",
				});
				workspaceId = newWsId;
			}

			// Inject resolved workspaceId for downstream handlers
			if (req.method === "GET" || req.method === "DELETE") {
				req.query.workspaceId = workspaceId;
			} else {
				req.body.workspaceId = workspaceId;
			}
		}

		// Check membership
		const membership = await db.query.workspaceMembers.findFirst({
			where: and(
				eq(workspaceMembers.userId, user.id),
				eq(workspaceMembers.workspaceId, workspaceId),
			),
		});

		if (!membership) {
			logger.warn(
				`User ${user.id} attempted to access workspace ${workspaceId} without membership.`,
			);
			return res.status(403).json({
				success: false,
				error: "Forbidden: You are not a member of this workspace.",
			});
		}

		(req as any).membership = membership;
		(req as any).workspaceType =
			membership.role === "OWNER" ? "personal" : "org"; // Simplify for downstream checks

		// Also attach to req so routes can check type if needed
		const ws = await db.query.workspaces.findFirst({
			where: eq(workspaces.id, workspaceId),
		});
		(req as any).workspace = ws;

		return next();
	} catch (error: any) {
		logger.error(
			`Error in requireWorkspaceMember middleware: ${error.message}`,
		);
		return res.status(500).json({
			success: false,
			error: "Internal server error during authorization.",
		});
	}
};
