import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../database/client";
import { deviceSessions } from "../../database/schema";

export class DeviceService {
	/**
	 * Register a new device session. Ensures max 5 desktop + 5 mobile rule.
	 */
	static async registerDevice(
		userId: string,
		deviceInfo: {
			deviceId: string;
			deviceName: string;
			browser: string;
			os: string;
			ipAddress: string;
			location?: string;
		},
	) {
		// Determine if new device is mobile based on OS
		const isMobile =
			deviceInfo.os.toLowerCase().includes("android") ||
			deviceInfo.os.toLowerCase().includes("ios");

		// Get active devices for the user
		const activeSessions = await db
			.select()
			.from(deviceSessions)
			.where(
				and(
					eq(deviceSessions.userId, userId),
					eq(deviceSessions.isRevoked, false),
				),
			)
			.orderBy(desc(deviceSessions.loginTime));

		const desktopSessions = activeSessions.filter(
			(s) =>
				!(
					s.os?.toLowerCase().includes("android") ||
					s.os?.toLowerCase().includes("ios")
				),
		);
		const mobileSessions = activeSessions.filter(
			(s) =>
				s.os?.toLowerCase().includes("android") ||
				s.os?.toLowerCase().includes("ios"),
		);

		// Strict 2-Device Limit Enforced: Max 1 Mobile + Max 1 Desktop
		if (isMobile && mobileSessions.length >= 1) {
			for (const sess of mobileSessions) {
				await DeviceService.revokeSession(sess.id);
			}
		} else if (!isMobile && desktopSessions.length >= 1) {
			for (const sess of desktopSessions) {
				await DeviceService.revokeSession(sess.id);
			}
		}

		// Register new device
		const sessionId = randomUUID();
		await db.insert(deviceSessions).values({
			id: sessionId,
			userId,
			deviceId: deviceInfo.deviceId,
			deviceName: deviceInfo.deviceName,
			browser: deviceInfo.browser,
			os: deviceInfo.os,
			ipAddress: deviceInfo.ipAddress,
			location: deviceInfo.location || "Unknown",
		});

		return sessionId;
	}

	static async revokeSession(sessionId: string) {
		await db
			.update(deviceSessions)
			.set({ isRevoked: true })
			.where(eq(deviceSessions.id, sessionId));
	}

	static async revokeAllUserSessions(userId: string) {
		await db
			.update(deviceSessions)
			.set({ isRevoked: true })
			.where(eq(deviceSessions.userId, userId));
	}

	static async updateLastActive(sessionId: string) {
		await db
			.update(deviceSessions)
			.set({ lastActive: new Date() })
			.where(eq(deviceSessions.id, sessionId));
	}
}
