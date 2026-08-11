import type { NextFunction, Request, Response } from "express";

export const enforceNoSelfAssignment = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const userId = (req as any).user?.id;
	const { assigneeId, ownerId, assignedTo } = req.body || {};

	const targetId = assigneeId || ownerId || assignedTo;

	if (userId && targetId && String(targetId).trim() === String(userId).trim()) {
		return res.status(400).json({
			success: false,
			error: {
				code: "SELF_ASSIGNMENT_NOT_ALLOWED",
				message:
					"Self-assignment is not allowed. Please assign organization projects/tasks to a team member or leader.",
			},
		});
	}

	next();
};
