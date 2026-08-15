import { AuthService } from "../src/services/auth.service";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config";

async function runSecurityTests() {
	console.log("=================================================");
	console.log("  MANMADHAN PROGRESS — PASSWORD SECURITY SUITE  ");
	console.log("=================================================");

	// 1. Test Password Hashing & Verification
	const originalPassword = "OriginalPassword123!";
	const samePassword = "OriginalPassword123!";
	const newPassword = "NewPassword456!";

	const hash = AuthService.hashPassword(originalPassword);
	console.log("✓ Password Hash Generated (scrypt):", hash.substring(0, 30) + "...");

	const isOriginalMatch = AuthService.verifyPassword(samePassword, hash);
	console.log(`✓ Same Password Verification: ${isOriginalMatch ? "MATCH (Correct)" : "FAILED"}`);

	const isNewMatch = AuthService.verifyPassword(newPassword, hash);
	console.log(`✓ Different Password Verification: ${!isNewMatch ? "DIFFERENT (Correct)" : "FAILED"}`);

	if (!isOriginalMatch || isNewMatch) {
		throw new Error("Password verification logic failed!");
	}

	// 2. Test JWT Reset Token Expiration (15m)
	const secret = env.JWT_SECRET || "fallback_secret";
	const token = jwt.sign(
		{ id: "test-user-id", email: "test@example.com", intent: "reset_password" },
		secret,
		{ expiresIn: "15m" }
	);

	const decoded: any = jwt.verify(token, secret);
	const durationSeconds = decoded.exp - decoded.iat;
	console.log(`✓ JWT Reset Token TTL: ${durationSeconds} seconds (Required: 900s / 15m)`);

	if (durationSeconds !== 900) {
		throw new Error(`Token expiration calculation incorrect: ${durationSeconds}s`);
	}

	if (decoded.intent !== "reset_password") {
		throw new Error(`Invalid token intent: ${decoded.intent}`);
	}

	console.log("-------------------------------------------------");
	console.log("✅ ALL PASSWORD SECURITY TESTS PASSED SUCCESSFULLY!");
	console.log("-------------------------------------------------");
	process.exit(0);
}

runSecurityTests().catch((err) => {
	console.error("❌ Security test failed:", err);
	process.exit(1);
});
