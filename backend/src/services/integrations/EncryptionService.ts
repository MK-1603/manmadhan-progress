import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes for GCM
const AUTH_TAG_LENGTH = 16;

export class EncryptionService {
	private static getKey(): Buffer {
		const keyString = process.env.TOKEN_ENCRYPTION_KEY;
		if (!keyString) {
			throw new Error("TOKEN_ENCRYPTION_KEY environment variable is not set.");
		}
		// We expect a 64-character hex string (32 bytes) or a 32-character string.
		// Let's ensure it is 32 bytes exactly.
		let keyBuffer: Buffer;
		if (keyString.length === 64) {
			keyBuffer = Buffer.from(keyString, "hex");
		} else {
			// pad or truncate to 32 bytes
			const hash = crypto.createHash("sha256");
			hash.update(keyString);
			keyBuffer = hash.digest();
		}

		if (keyBuffer.length !== 32) {
			throw new Error("Encryption key must be 32 bytes.");
		}
		return keyBuffer;
	}

	public static encrypt(text: string): string {
		if (!text) return text;
		const iv = crypto.randomBytes(IV_LENGTH);
		const cipher = crypto.createCipheriv(
			ALGORITHM,
			EncryptionService.getKey(),
			iv,
		);

		let encrypted = cipher.update(text, "utf8", "hex");
		encrypted += cipher.final("hex");
		const authTag = cipher.getAuthTag().toString("hex");

		// Format: iv:authTag:encryptedText
		return `${iv.toString("hex")}:${authTag}:${encrypted}`;
	}

	public static decrypt(encryptedData: string): string {
		if (!encryptedData) return encryptedData;
		const parts = encryptedData.split(":");
		if (parts.length !== 3) {
			throw new Error("Invalid encrypted data format.");
		}

		const iv = Buffer.from(parts[0], "hex");
		const authTag = Buffer.from(parts[1], "hex");
		const encryptedText = parts[2];

		const decipher = crypto.createDecipheriv(
			ALGORITHM,
			EncryptionService.getKey(),
			iv,
		);
		decipher.setAuthTag(authTag);

		let decrypted = decipher.update(encryptedText, "hex", "utf8");
		decrypted += decipher.final("utf8");

		return decrypted;
	}
}
