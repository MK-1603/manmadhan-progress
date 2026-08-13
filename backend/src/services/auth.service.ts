import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../../database/client";
import { passwordHistory, users } from "../../database/schema";

export class AuthService {
	static hashPassword(password: string): string {
		const salt = crypto.randomBytes(16);
		const parameters = { cost: 16_384, blockSize: 8, parallelization: 1 };
		const derivedKey = crypto.scryptSync(password, salt, 64, {
			N: parameters.cost,
			r: parameters.blockSize,
			p: parameters.parallelization,
			maxmem: 32 * 1024 * 1024,
		});
		return [
			"scrypt",
			parameters.cost,
			parameters.blockSize,
			parameters.parallelization,
			salt.toString("base64url"),
			derivedKey.toString("base64url"),
		].join("$");
	}

	static verifyPassword(password: string, hash: string): boolean {
		if (hash.startsWith("scrypt$")) {
			const [, cost, blockSize, parallelization, encodedSalt, encodedHash] =
				hash.split("$");
			if (
				!cost ||
				!blockSize ||
				!parallelization ||
				!encodedSalt ||
				!encodedHash
			)
				return false;
			try {
				const expected = Buffer.from(encodedHash, "base64url");
				const actual = crypto.scryptSync(
					password,
					Buffer.from(encodedSalt, "base64url"),
					expected.length,
					{
						N: Number(cost),
						r: Number(blockSize),
						p: Number(parallelization),
						maxmem: 32 * 1024 * 1024,
					},
				);
				return crypto.timingSafeEqual(actual, expected);
			} catch {
				return false;
			}
		}

		// Legacy hashes remain verifiable so existing users are not locked out.
		const legacyHash = crypto.pbkdf2Sync(
			password,
			"manmadhan_salt_v1",
			1000,
			64,
			"sha512",
		);
		const expected = Buffer.from(hash, "hex");
		return (
			expected.length === legacyHash.length &&
			crypto.timingSafeEqual(legacyHash, expected)
		);
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
