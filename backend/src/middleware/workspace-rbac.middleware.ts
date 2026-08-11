import type { NextFunction, Request, Response } from "express";
import { logger } from "../services/logger.service";

/**
 * Middleware to enforce that the authenticated user has a specific role in the workspace.
 * MUST be applied AFTER requireWorkspaceMember.
 */
export const requireWorkspaceRole = (allowedRoles: string[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			const membership = (req as any).membership;

			if (!membership) {
				return res.status(500).json({
					success: false,
					error:
						"Membership context missing. Ensure requireWorkspaceMember is called first.",
				});
			}

			// We normalize everything to uppercase just to be safe
			const userRole = (membership.role || "MEMBER").toUpperCase();
			const normalizedAllowedRoles = allowedRoles.map((r) => r.toUpperCase());

			if (!normalizedAllowedRoles.includes(userRole)) {
				logger.warn(
					`User ${membership.userId} attempted forbidden action in workspace ${membership.workspaceId}. Required roles: ${normalizedAllowedRoles.join(",")}, actual role: ${userRole}`,
				);
				return res.status(403).json({
					success: false,
					error: "Forbidden: Insufficient workspace role.",
				});
			}

			return next();
		} catch (error: any) {
			logger.error(
				"Error in requireWorkspaceRole middleware: " + error.message,
			);
			return res
				.status(500)
				.json({
					success: false,
					error: "Internal server error during authorization.",
				});
		}
	};
};
