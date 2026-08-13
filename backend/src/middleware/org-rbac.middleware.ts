import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../../database/client";
import { workspaceMembers } from "../../database/schema";
import { logger } from "../services/logger.service";

/**
 * Canonical role normalizer.
 * All roles in the system must resolve to: CEO | CO-CEO | MEMBER
 */
export function normalizeRole(raw: string): "CEO" | "CO-CEO" | "MEMBER" {
	const r = (raw || "").toUpperCase().replace(/_/g, "-").trim();
	if (r === "CEO" || r === "ADMIN" || r === "OWNER") return "CEO";
	if (r === "CO-CEO" || r === "COCEO" || r === "CO CEO") return "CO-CEO";
	return "MEMBER";
}

/**
 * Resolves workspaceId from query/body, then falls back to the user's exact
 * membership lookup. Never guess a workspace from global database state.
 * Attaches: (req as any).workspaceId
 */
export const resolveOrgWorkspace = async (
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
					req.body = req.body || {};
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
		logger.error(`resolveOrgWorkspace error: ${err?.message || String(err)}`);
		return res
			.status(500)
			.json({ success: false, error: "Failed to resolve workspace" });
	}
};

/**
 * Verifies the authenticated user is a member of the organization workspace.
 * Falls back to user.role for users who joined via invitation.
 * Attaches: (req as any).membership
 *
 * MUST run after resolveOrgWorkspace.
 */
export const requireOrgMembership = async (
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

		// Try exact workspace membership
		const [exact] = await db
			.select()
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.userId, userId),
				),
			)
			.limit(1);

		if (exact) {
			(req as any).membership = {
				...exact,
				role: normalizeRole(exact.role || "MEMBER"),
			};
			return next();
		}

		logger.warn(
			`[AUTH DEBUG] 403 — userId=${userId} endpoint=${req.path} method=${req.method} — no exact org membership for workspaceId=${workspaceId}`,
		);
		return res
			.status(403)
			.json({ success: false, error: "Not a member of this organization" });
	} catch (err: any) {
		logger.error(`requireOrgMembership error: ${err?.message || String(err)}`);
		return res.status(500).json({
			success: false,
			error: "Organization membership verification failed",
		});
	}
};

/**
 * Restricts access to specific normalized roles.
 * Call AFTER requireOrgMembership.
 */
export const requireOrgRole = (
	...allowedRoles: ("CEO" | "CO-CEO" | "MEMBER")[]
) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const membership = (req as any).membership;
		if (!membership) {
			return res.status(500).json({
				success: false,
				error: "Membership context missing. Call requireOrgMembership first.",
			});
		}

		const role = normalizeRole(membership.role || "MEMBER");
		const userId = (req as any).user?.id;
		const endpoint = req.path;

		if (!allowedRoles.includes(role)) {
			logger.warn(
				`[AUTH DEBUG] 403 — userId=${userId} role=${role} endpoint=${endpoint} method=${req.method} requiredRoles=${allowedRoles.join(",")}`,
			);
			return res.status(403).json({
				success: false,
				error: `Access restricted. Required role: ${allowedRoles.join(" or ")}`,
			});
		}

		return next();
	};
};

/**
 * Allows CEO and CO-CEO but not plain MEMBER.
 */
export const requireLeadership = requireOrgRole("CEO", "CO-CEO");

/**
 * Allows only CEO.
 */
export const requireCEO = requireOrgRole("CEO");
