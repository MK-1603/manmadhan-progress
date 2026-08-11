// Assume a simple hasher for now, real app should use argon2 or bcrypt
import crypto from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../../database/client";
import { passwordHistory, users } from "../../database/schema";

export class AuthService {
	/**
	 * Hashes a password using PBKDF2 (as a placeholder for Argon2)
	 */
	static hashPassword(password: string): string {
		const salt = "manmadhan_salt_v1";
		return crypto
			.pbkdf2Sync(password, salt, 1000, 64, "sha512")
			.toString("hex");
	}

	static verifyPassword(password: string, hash: string): boolean {
		return AuthService.hashPassword(password) === hash;
	}

	static async isPasswordReused(
		userId: string,
		newHash: string,
	): Promise<boolean> {
		const history = await db
			.select()
			.from(passwordHistory)
			.where(eq(passwordHistory.userId, userId))
			.orderBy(desc(passwordHistory.createdAt))
			.limit(5);

		return history.some((h) => h.passwordHash === newHash);
	}

	static async savePassword(userId: string, password: string) {
		const hash = AuthService.hashPassword(password);

		// Save to history
		await db.insert(passwordHistory).values({
			id: crypto.randomUUID(),
			userId,
			passwordHash: hash,
		});

		// Update user
		await db
			.update(users)
			.set({ passwordHash: hash })
			.where(eq(users.id, userId));
	}
}
