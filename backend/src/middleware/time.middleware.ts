import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.config";
import { db } from "../../database/client";
import { workspaceMembers, workspaceSettings } from "../../database/schema";
import { logger } from "../services/logger.service";

export const enforceWorkExecutionPolicy = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// Allow all pre-flight and auth routes to bypass
	if (req.method === "OPTIONS" || req.originalUrl.startsWith("/api/v1/auth")) {
		return next();
	}

	try {
		const authHeader = req.headers.authorization;
		let token = authHeader?.split(" ")[1];

		if (!token && req.cookies && req.cookies.auth_token) {
			token = req.cookies.auth_token;
		}

		if (!token) {
			// Allow it to pass so auth.middleware handles the 401 correctly
			return next();
		}

		const decoded = jwt.verify(token, env.JWT_SECRET) as any;
		const userId = decoded.id;

		// CEO can bypass Rest Mode
		if (decoded.role === "CEO") {
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

		let startHour = 4;
		let endHour = 23;
		let enforce = true;

		if (workspaceId) {
			const settings = await db.query.workspaceSettings.findFirst({
				where: eq(workspaceSettings.workspaceId, String(workspaceId)),
			});
			if (settings) {
				enforce = settings.enforceWorkingHours;
				startHour = parseInt(settings.workingHoursStart.split(":")[0], 10) || 4;
				endHour = parseInt(settings.workingHoursEnd.split(":")[0], 10) || 23;
			}
		}

		if (!enforce) {
			return next();
		}

		// Get current time in local timezone (or configured server timezone)
		const now = new Date();
		const options = {
			timeZone: "Asia/Kolkata",
			hour12: false,
			hour: "numeric",
			minute: "numeric",
		} as const;
		const timeString = new Intl.DateTimeFormat("en-US", options).format(now);

		const [hourStr] = timeString.split(":");
		const hour = parseInt(hourStr, 10);

		// Work hours check
		const isWorkHours = hour >= startHour && hour < endHour;

		if (isWorkHours) {
			return next();
		}

		// Outside work hours
		return res.status(403).json({
			success: false,
			error: "REST_MODE_ACTIVE",
			message: `Outside permitted working hours (${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00).`,
		});
	} catch (err: any) {
		logger.error(`Work Execution Policy Error: ${err.message}`);
		return next();
	}
};
