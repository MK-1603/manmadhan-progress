import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.config";
import { db } from "../../database/client";
import { recoveryCodes, users } from "../../database/schema";
import { logger } from "./logger.service";

export class RecoveryCodeService {
	// Normalize code format (e.g., "A7K9-M2QP" -> "A7K9M2QP")
	private static normalizeCode(code: string): string {
		return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
	}

	// Hash recovery code using SHA-256
	public static hashCode(code: string): string {
		const normalized = this.normalizeCode(code);
		return crypto.createHash("sha256").update(normalized).digest("hex");
	}

	// Generate human-friendly format (e.g. "A7K9-M2QP")
	private static generateSingleCode(): string {
		const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Avoid visually confusing chars O, 0, I, 1
		let code = "";
		const bytes = crypto.randomBytes(8);
		for (let i = 0; i < 8; i++) {
			if (i === 4) code += "-";
			code += chars[bytes[i] % chars.length];
		}
		return code;
	}

	// Generate and store a set of 10 new recovery codes for user
	public static async generateAndStoreCodes(userId: string): Promise<string[]> {
		const now = new Date();

		// Revoke previous un-used codes
		await db
			.update(recoveryCodes)
			.set({ revokedAt: now })
			.where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.revokedAt)));

		const rawCodes: string[] = [];
		const recordsToInsert: Array<{
			id: string;
			userId: string;
			codeHash: string;
			createdAt: Date;
		}> = [];

		for (let i = 0; i < 10; i++) {
			const rawCode = this.generateSingleCode();
			rawCodes.push(rawCode);
			recordsToInsert.push({
				id: `rc_${crypto.randomUUID()}`,
				userId,
				codeHash: this.hashCode(rawCode),
				createdAt: now,
			});
		}

		await db.insert(recoveryCodes).values(recordsToInsert);

		logger.info(
			{ userId, count: rawCodes.length },
			"[RECOVERY_CODES] Generated and stored new recovery code hashes",
		);

		return rawCodes;
	}

	// Check if user has active recovery codes
	public static async getUserRecoveryCodeCount(userId: string): Promise<number> {
		const existing = await db
			.select()
			.from(recoveryCodes)
			.where(
				and(
					eq(recoveryCodes.userId, userId),
					isNull(recoveryCodes.usedAt),
					isNull(recoveryCodes.revokedAt),
				),
			);
		return existing.length;
	}

	// Verify and consume recovery code for password reset authorization
	public static async verifyAndConsumeCodeForRecovery(
		emailOrIdentifier: string,
		rawCode: string,
	): Promise<{ success: boolean; message?: string; recoveryToken?: string; userId?: string }> {
		const cleanInput = emailOrIdentifier.trim().toLowerCase();
		if (!cleanInput || !rawCode.trim()) {
			return { success: false, message: "Email and recovery code are required." };
		}

		// Find user by email or employee ID
		const userList = await db
			.select()
			.from(users)
			.where(eq(users.email, cleanInput));

		if (userList.length === 0) {
			// Safe generic message to prevent account enumeration
			return { success: false, message: "Invalid account identifier or recovery code." };
		}

		const user = userList[0];
		const codeHash = this.hashCode(rawCode);

		// Find matching active code
		const activeCodes = await db
			.select()
			.from(recoveryCodes)
			.where(
				and(
					eq(recoveryCodes.userId, user.id),
					eq(recoveryCodes.codeHash, codeHash),
					isNull(recoveryCodes.usedAt),
					isNull(recoveryCodes.revokedAt),
				),
			);

		if (activeCodes.length === 0) {
			return { success: false, message: "Invalid account identifier or recovery code." };
		}

		const codeRecord = activeCodes[0];
		const now = new Date();

		// Mark code as used atomically
		await db
			.update(recoveryCodes)
			.set({ usedAt: now })
			.where(eq(recoveryCodes.id, codeRecord.id));

		logger.info(
			{ userId: user.id, codeId: codeRecord.id },
			"[RECOVERY_CODES] Recovery code successfully consumed for account recovery",
		);

		// Issue limited recovery token valid ONLY for password reset (15 min expiry)
		const recoveryToken = jwt.sign(
			{
				sub: user.id,
				email: user.email,
				purpose: "PASSWORD_RESET_ONLY",
			},
			env.JWT_SECRET,
			{ expiresIn: "15m" },
		);

		return {
			success: true,
			recoveryToken,
			userId: user.id,
		};
	}
}
