import type { Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.config";

export class SessionService {
	/**
	 * Issue auth and refresh tokens via HttpOnly cookies
	 */
	static issueTokens(res: Response, user: any, deviceId: string) {
		const authUser = {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			deviceId,
		};

		const accessToken = jwt.sign(authUser, env.JWT_SECRET, {
			expiresIn: "15m",
		});
		const refreshToken = jwt.sign(
			{ id: user.id, deviceId },
			env.JWT_REFRESH_SECRET || env.JWT_SECRET,
			{ expiresIn: "7d" },
		);

		res.cookie("auth_token", accessToken, {
			httpOnly: true,
			secure: true,
			sameSite: "none",
			path: "/",
			maxAge: 15 * 60 * 1000,
		});

		res.cookie("refresh_token", refreshToken, {
			httpOnly: true,
			secure: true,
			sameSite: "none",
			path: "/api/v1/auth/refresh",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		return accessToken;
	}

	static clearTokens(res: Response) {
		res.cookie("auth_token", "", {
			httpOnly: true,
			secure: true,
			sameSite: "none",
			path: "/",
			maxAge: 0,
		});
		res.cookie("refresh_token", "", {
			httpOnly: true,
			secure: true,
			sameSite: "none",
			path: "/api/v1/auth/refresh",
			maxAge: 0,
		});
	}
}
