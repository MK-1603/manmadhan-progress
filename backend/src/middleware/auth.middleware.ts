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
		} catch (_e) {
			// Invalid token, fall through
		}
	}
	return res
		.status(401)
		.json({ success: false, error: "Authentication required" });
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
	} catch (_err) {
		return res
			.status(401)
			.json({ success: false, error: "Invalid or expired token" });
	}
};

// Role checking middleware
export const requireRole = (allowedRoles: string[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const user = (req as any).user;
		if (!user || !user.role) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}
		if (!allowedRoles.includes(user.role)) {
			return res
				.status(403)
				.json({
					success: false,
					error: "Forbidden: Insufficient role permissions",
				});
		}
		next();
	};
};
