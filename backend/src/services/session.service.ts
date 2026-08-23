import type { Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { env } from "../../config/env.config";
import { db } from "../../database/client";
import { users, userSessions } from "../../database/schema";
import { logger } from "./logger.service";

export class SessionService {
	/**
	 * Hash a refresh token using SHA-256
	 */
	static hashRefreshToken(token: string): string {
		return crypto.createHash("sha256").update(token).digest("hex");
	}

	/**
	 * Issue auth and refresh tokens via HttpOnly cookies and record session in database
	 */
	static async issueTokens(
		res: Response,
		user: any,
		deviceId: string = "web-default",
		userAgent?: string,
		ipAddress?: string,
	) {
		const isProduction = process.env.NODE_ENV === "production";
		const isSecure = isProduction;
		const sameSitePolicy: "none" | "lax" = isProduction ? "none" : "lax";

		const authUser = {
			id: user.id,
			name: user.displayName || user.name || user.email,
			email: user.email,
			role: user.role || "MEMBER",
			deviceId,
		};

		const accessToken = jwt.sign(authUser, env.JWT_SECRET, {
			expiresIn: "1h",
		});

		const refreshToken = jwt.sign(
			{ id: user.id, deviceId, jti: uuidv4() },
			env.JWT_REFRESH_SECRET || env.JWT_SECRET,
			{ expiresIn: "7d" },
		);

		const refreshTokenHash = SessionService.hashRefreshToken(refreshToken);
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		const sessionId = uuidv4();
		const cleanUserAgent = userAgent && userAgent.trim() !== "" ? userAgent.trim() : null;
		const cleanIpAddress = ipAddress && ipAddress.trim() !== "" ? ipAddress.trim() : null;

		// Record / update server session in database atomically
		try {
			await db.insert(userSessions).values({
				id: sessionId,
				userId: user.id,
				refreshTokenHash,
				deviceId: deviceId || "web-default",
				userAgent: cleanUserAgent,
				ipAddress: cleanIpAddress,
				status: "ACTIVE",
				expiresAt,
				lastUsedAt: new Date(),
				createdAt: new Date(),
			});
		} catch (err: any) {
			logger.error(
				{
					event: "SESSION_CREATE_FAILED",
					userId: user.id,
					sessionId,
					dbName: err.name,
					dbCode: err.code || null,
					constraint: err.constraint || null,
					detail: err.detail || null,
					message: err.message,
				},
				"Failed to persist user session in PostgreSQL",
			);

			throw {
				status: 500,
				code: "SESSION_CREATION_FAILED",
				message: "Unable to complete your sign-in. Please try again.",
			};
		}

		res.cookie("auth_token", accessToken, {
			httpOnly: true,
			secure: isSecure,
			sameSite: sameSitePolicy,
			path: "/",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		res.cookie("refresh_token", refreshToken, {
			httpOnly: true,
			secure: isSecure,
			sameSite: sameSitePolicy,
			path: "/",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		return { accessToken, refreshToken, user: authUser };
	}

	/**
	 * Rotate refresh session: validates refresh token, checks account status, and issues fresh credentials
	 */
	static async rotateSession(
		refreshTokenInput: string,
		res: Response,
		userAgent?: string,
		ipAddress?: string,
	) {
		const isProduction = process.env.NODE_ENV === "production";
		const isSecure = isProduction;
		const sameSitePolicy: "none" | "lax" = isProduction ? "none" : "lax";

		if (!refreshTokenInput || typeof refreshTokenInput !== "string") {
			throw { code: "REFRESH_TOKEN_INVALID", status: 401, message: "Refresh token is missing." };
		}

		let decoded: any;
		try {
			decoded = jwt.verify(
				refreshTokenInput,
				env.JWT_REFRESH_SECRET || env.JWT_SECRET,
			);
		} catch (err) {
			throw { code: "REFRESH_SESSION_EXPIRED", status: 401, message: "Refresh session expired. Please sign in again." };
		}

		const userId = decoded.id;
		if (!userId) {
			throw { code: "REFRESH_TOKEN_INVALID", status: 401, message: "Invalid session token payload." };
		}

		// Verify user status in database (Server-authoritative suspension / deletion check)
		const [dbUser] = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!dbUser) {
			throw { code: "ACCOUNT_DELETED", status: 403, message: "This account is no longer available." };
		}

		const userStatus = (dbUser.status || "").toLowerCase();
		if (userStatus === "suspended" || userStatus === "disabled" || userStatus === "locked") {
			// Revoke all sessions for suspended user
			await SessionService.revokeUserSessions(userId);
			throw { code: "ACCOUNT_SUSPENDED", status: 403, message: "Your account has been suspended." };
		}
		if (userStatus === "deleted") {
			await SessionService.revokeUserSessions(userId);
			throw { code: "ACCOUNT_DELETED", status: 403, message: "This account is no longer available." };
		}

		const inputHash = SessionService.hashRefreshToken(refreshTokenInput);

		// Find active session in database
		const [existingSession] = await db
			.select()
			.from(userSessions)
			.where(
				and(
					eq(userSessions.userId, userId),
					eq(userSessions.refreshTokenHash, inputHash),
				),
			)
			.limit(1);

		if (existingSession && existingSession.status !== "ACTIVE") {
			// Token reuse detected on revoked session — revoke user session family for security
			await SessionService.revokeUserSessions(userId);
			throw { code: "SESSION_REVOKED", status: 401, message: "Session revoked due to token reuse." };
		}

		// Generate new access & refresh token pair (Token Rotation)
		const deviceId = decoded.deviceId || "web-default";
		const authUser = {
			id: dbUser.id,
			name: dbUser.displayName || dbUser.name || dbUser.email,
			email: dbUser.email,
			role: dbUser.role || "MEMBER",
			deviceId,
		};

		const newAccessToken = jwt.sign(authUser, env.JWT_SECRET, {
			expiresIn: "1h",
		});

		const newRefreshToken = jwt.sign(
			{ id: dbUser.id, deviceId, jti: uuidv4() },
			env.JWT_REFRESH_SECRET || env.JWT_SECRET,
			{ expiresIn: "7d" },
		);

		const newHash = SessionService.hashRefreshToken(newRefreshToken);
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		if (existingSession) {
			// Update existing session record with rotated token hash
			await db
				.update(userSessions)
				.set({
					refreshTokenHash: newHash,
					lastUsedAt: new Date(),
					expiresAt,
					status: "ACTIVE",
				})
				.where(eq(userSessions.id, existingSession.id));
		} else {
			// Create session record if DB tracking was not present
			await db.insert(userSessions).values({
				id: uuidv4(),
				userId: dbUser.id,
				refreshTokenHash: newHash,
				deviceId,
				userAgent: userAgent || null,
				ipAddress: ipAddress || null,
				status: "ACTIVE",
				expiresAt,
				lastUsedAt: new Date(),
				createdAt: new Date(),
			});
		}

		// Update response cookies
		res.cookie("auth_token", newAccessToken, {
			httpOnly: true,
			secure: isSecure,
			sameSite: sameSitePolicy,
			path: "/",
			maxAge: 15 * 60 * 1000,
		});

		res.cookie("refresh_token", newRefreshToken, {
			httpOnly: true,
			secure: isSecure,
			sameSite: sameSitePolicy,
			path: "/",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		return { accessToken: newAccessToken, refreshToken: newRefreshToken, user: authUser };
	}

	/**
	 * Revoke all active sessions for a user (e.g. on account suspension, password change, or forced logout)
	 */
	static async revokeUserSessions(userId: string) {
		try {
			await db
				.update(userSessions)
				.set({ status: "REVOKED" })
				.where(eq(userSessions.userId, userId));
		} catch (err: any) {
			logger.error(`Error revoking user sessions for ${userId}: ${err.message}`);
		}
	}

	/**
	 * Clear authentication cookies on sign out
	 */
	static clearTokens(res: Response) {
		const isProduction = process.env.NODE_ENV === "production";
		const isSecure = isProduction;
		const sameSitePolicy: "none" | "lax" = isProduction ? "none" : "lax";

		res.cookie("auth_token", "", {
			httpOnly: true,
			secure: isSecure,
			sameSite: sameSitePolicy,
			path: "/",
			maxAge: 0,
		});
		res.cookie("refresh_token", "", {
			httpOnly: true,
			secure: isSecure,
			sameSite: sameSitePolicy,
			path: "/",
			maxAge: 0,
		});
	}
}
