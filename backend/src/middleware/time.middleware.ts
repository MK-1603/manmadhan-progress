import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.config";
import { db } from "../../database/client";
import { workspaceMembers } from "../../database/schema";
import { logger } from "../services/logger.service";
import { OrganizationScheduleService } from "../services/organization-schedule.service";

export const enforceWorkExecutionPolicy = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// 1. Allow all read-only queries (GET / HEAD / OPTIONS), auth, and schedule management routes to bypass
	if (
		req.method === "GET" ||
		req.method === "HEAD" ||
		req.method === "OPTIONS" ||
		req.originalUrl.startsWith("/api/v1/auth") ||
		req.originalUrl.startsWith("/api/v1/org/working-hours")
	) {
		return next();
	}

	try {
		const authHeader = req.headers.authorization;
		let token = authHeader?.split(" ")[1];

		if (!token && req.cookies && req.cookies.auth_token) {
			token = req.cookies.auth_token;
		}

		if (!token) {
			return next();
		}

		let decoded: any;
		try {
			decoded = jwt.verify(token, env.JWT_SECRET) as any;
		} catch (jwtErr: any) {
			return next();
		}

		const userId = decoded.id;
		const userRole = String(decoded.role || "MEMBER").toUpperCase();

		// 2. Executive Oversight (CEO / CO-CEO) always bypasses operational time restrictions
		if (userRole === "CEO" || userRole === "CO-CEO") {
			return next();
		}

		let workspaceId = req.query.workspaceId || req.body.workspaceId;
		if (
			!workspaceId ||
			workspaceId === "undefined" ||
			workspaceId === "null" ||
			workspaceId === ""
		) {
			const userMember = await db.query.workspaceMembers.findFirst({
				where: eq(workspaceMembers.userId, userId),
			});
			if (userMember) workspaceId = userMember.workspaceId;
		}

		if (!workspaceId) {
			return next();
		}

		// Determine action type based on requested route
		let actionType: "task_execution" | "task_submission" | "project_submission" | "approvals" | "timer" = "task_execution";
		if (req.originalUrl.includes("/tasks") && (req.method === "POST" || req.method === "PUT" || req.originalUrl.includes("/submit"))) {
			actionType = "task_submission";
		} else if (req.originalUrl.includes("/projects") && (req.method === "POST" || req.method === "PUT" || req.originalUrl.includes("/submit"))) {
			actionType = "project_submission";
		} else if (req.originalUrl.includes("/approvals") || req.originalUrl.includes("/requests")) {
			actionType = "approvals";
		} else if (req.originalUrl.includes("/focus")) {
			actionType = "timer";
		}

		const check = await OrganizationScheduleService.isActionAllowed(String(workspaceId), userRole, actionType);

		if (check.allowed) {
			return next();
		}

		return res.status(403).json({
			success: false,
			error: "REST_MODE_ACTIVE",
			message: check.reason || "Outside permitted operational working hours.",
			status: check.status,
		});
	} catch (err: any) {
		logger.error(`Work Execution Policy Error: ${err.message}`);
		return next();
	}
};
