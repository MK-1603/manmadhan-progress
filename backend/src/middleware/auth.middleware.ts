import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.config";

export const authenticate = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token =
		req.cookies?.auth_token ||
		req.headers.authorization?.replace("Bearer ", "");
	if (token) {
		try {
			const decoded = jwt.verify(token, env.JWT_SECRET) as any;
			(req as any).user = decoded;
			return next();
		} catch (err: any) {
			if (err?.name === "TokenExpiredError") {
				return res.status(401).json({
					success: false,
					code: "ACCESS_TOKEN_EXPIRED",
					error: "Access token expired",
				});
			}
		}
	}
	return res
		.status(401)
		.json({ success: false, code: "UNAUTHORIZED", error: "Authentication required" });
};

// Strict auth explicitly rejects 'setup' tokens
export const strictAuth = (req: Request, res: Response, next: NextFunction) => {
	const token =
		req.cookies?.auth_token ||
		req.headers.authorization?.replace("Bearer ", "");
	if (!token)
		return res.status(401).json({ success: false, error: "Unauthorized" });

	try {
		const decoded = jwt.verify(token, env.JWT_SECRET) as any;
		if (decoded.intent === "setup")
			throw new Error("Setup token cannot be used for strict auth");
		(req as any).user = decoded;
		return next();
	} catch (err: any) {
		if (err?.name === "TokenExpiredError") {
			return res.status(401).json({
				success: false,
				code: "ACCESS_TOKEN_EXPIRED",
				error: "Access token expired",
			});
		}
		return res
			.status(401)
			.json({ success: false, code: "UNAUTHORIZED", error: "Invalid token" });
	}
};

// Verify setup temporary token
export const verifyTempToken = (req: Request, res: Response, next: NextFunction) => {
	const token =
		req.cookies?.auth_token ||
		req.headers.authorization?.replace("Bearer ", "");
	if (!token)
		return res.status(401).json({ success: false, error: "Setup token required" });

	try {
		const decoded = jwt.verify(token, env.JWT_SECRET) as any;
		if (decoded.intent !== "setup")
			return res.status(403).json({ success: false, error: "Invalid setup token" });
		(req as any).setupUser = decoded;
		return next();
	} catch (_err) {
		return res
			.status(401)
			.json({ success: false, error: "Invalid or expired setup token" });
	}
};

// Role checking middleware
export const requireRole = (allowedRoles: string[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const user = (req as any).user;
		if (!user?.role) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}
		if (!allowedRoles.includes(user.role)) {
			return res.status(403).json({
				success: false,
				error: "Forbidden: Insufficient role permissions",
			});
		}
		next();
	};
};
