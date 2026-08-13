import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../../database/client";
import { workspaceMembers } from "../../database/schema";
import { logger } from "../services/logger.service";

export const resolveWorkspace = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = (req as any).user?.id;
		let workspaceId = String(
			req.query.workspaceId || req.body?.workspaceId || "",
		).trim();

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
			if (userId) {
				const [m] = await db
					.select()
					.from(workspaceMembers)
					.where(eq(workspaceMembers.userId, userId))
					.limit(1);
				if (m?.workspaceId) {
					workspaceId = m.workspaceId;
					req.body.workspaceId = workspaceId;
					(req.query as any).workspaceId = workspaceId;
				}
			}
		}

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
			return res
				.status(400)
				.json({ success: false, error: "workspaceId is required" });
		}

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

export const requireMembership = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = (req as any).user?.id;
		const workspaceId = (req as any).workspaceId;

		if (!userId) {
			return res
				.status(401)
				.json({ success: false, error: "Authentication required" });
		}

		const [m] = await db
			.select()
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.userId, userId),
				),
			)
			.limit(1);

		if (!m) {
			return res
				.status(403)
				.json({ success: false, error: "Not a member of this workspace" });
		}

		(req as any).membership = m;
		next();
	} catch (err: any) {
		logger.error(
			`requireMembership error: ${err?.stack || err?.message || String(err)}`,
		);
		return res
			.status(500)
			.json({ success: false, error: "Failed to verify workspace membership" });
	}
};
