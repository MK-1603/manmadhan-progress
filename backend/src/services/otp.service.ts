import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { env } from "../../config/env.config";
import { db } from "../../database/client";
import { otpCodes } from "../../database/schema";
import { runtimeActivity } from "../bootstrap/startup-logger";
import { emailService } from "./email.service";
import { logger } from "./logger.service";

export class OtpService {
	private static OTP_EXPIRY_MINUTES = 15;
	private static MAX_ATTEMPTS = 3;

	/**
	 * Generates a cryptographically secure 6-digit random OTP
	 */
	private static generateNumericOTP(): string {
		return crypto.randomInt(100000, 999999).toString();
	}

	/**
	 * Hashes the OTP for secure storage
	 */
	private static hashOTP(otp: string): string {
		return crypto
			.createHmac("sha256", process.env.JWT_SECRET || "fallback_secret")
			.update(otp)
			.digest("hex");
	}

	/**
	 * Masks email for secure logging (e.g., saikrishnanmk1603@gmail.com -> s***@gmail.com)
	 */
	private static maskEmail(email: string): string {
		const parts = email.split("@");
		if (parts.length !== 2) return "*****";
		return `${parts[0][0]}***@${parts[1]}`;
	}

	/**
	 * Creates a new OTP for an email, hashes it, stores it in DB, and dispatches single email
	 */
	public static async sendOTP(
		email: string,
		options?: { isFirstLogin?: boolean; isResetPassword?: boolean; userName?: string },
	): Promise<boolean> {
		const challengeId = crypto.randomUUID();
		const otp = OtpService.generateNumericOTP();
		const otpHash = OtpService.hashOTP(otp);
		const expiresAt = new Date(
			Date.now() + OtpService.OTP_EXPIRY_MINUTES * 60000,
		);

		// Invalidate any previous unused OTPs for this email by deleting them
		await db.delete(otpCodes).where(eq(otpCodes.email, email));

		// Store new OTP hash
		await db.insert(otpCodes).values({
			id: challengeId,
			email,
			otpHash,
			expiresAt,
			used: false,
			attempts: 0,
		});

		const masked = OtpService.maskEmail(email);
		runtimeActivity.startLifecycle("OTP");
		runtimeActivity.info("OTP", "OTP", `Security challenge created for ${masked}`);
		runtimeActivity.info("OTP", "EMAIL", "Gmail SMTP delivery started");

		let emailSuccess = false;
		try {
			const isFirstLogin = options?.isFirstLogin ?? false;
			const isResetPassword = options?.isResetPassword ?? false;

			let subject = "Your ManMadhan Progress verification code";
			let title = "Verification Code";
			let actionText = "Verify & Continue →";

			if (isFirstLogin) {
				subject = "Welcome to ManMadhan Progress";
				title = "Welcome to ManMadhan Progress";
				actionText = "Verify & Continue →";
			} else if (isResetPassword) {
				subject = "Your ManMadhan Progress password reset code";
				title = "Reset Password Code";
				actionText = "Reset Password →";
			}

			const sendResult = await emailService.sendEmail({
				to: email,
				subject,
				title,
				otpCode: otp,
				userName: options?.userName,
				isFirstLogin,
				isResetPassword,
				expiresIn: "15 minutes",
				actionText,
				actionUrl: isResetPassword
					? `${env.CLIENT_URL}/login?auth_step=RESET_PASSWORD`
					: `${env.CLIENT_URL}/login`,
				securityNotice: true,
				text: isFirstLogin
					? `Hi ${options?.userName || "there"},\n\nWelcome to ManMadhan Progress. Great to have you on board.\nThis is your first time logging in. Verify your account using the code below to continue:\n\n${otp}\n\nThis code expires in 15 minutes.`
					: isResetPassword
					? `Hi ${options?.userName || "there"},\n\nWe received a request to reset the password for your ManMadhan Progress account. Use the code below to continue with your password reset:\n\n${otp}\n\nThis code expires in 15 minutes.`
					: `Hi ${options?.userName || "there"},\n\nWe received a request to verify your account for ManMadhan Progress. Use the code below to continue:\n\n${otp}\n\nThis code expires in 15 minutes.`,
			});
			emailSuccess = sendResult.success;
		} catch (emailErr: any) {
			logger.warn(
				{ challengeId, error: emailErr?.message || String(emailErr) },
				"OTP email dispatch notice",
			);
		}

		if (emailSuccess) {
			runtimeActivity.success("OTP", "EMAIL", "Gmail SMTP delivery successful");
			runtimeActivity.info("OTP", "OTP", "Verification code dispatched");
		} else {
			runtimeActivity.warn("OTP", "EMAIL", "Gmail SMTP delivery check failed");
		}

		return true;
	}

	/**
	 * Verifies the OTP provided by the user
	 */
	public static async verifyOTP(
		email: string,
		otp: string,
	): Promise<{ success: boolean; message: string }> {
		const otpHash = OtpService.hashOTP(otp);

		const activeCode = await db
			.select()
			.from(otpCodes)
			.where(
				and(
					eq(otpCodes.email, email),
					eq(otpCodes.used, false),
					gt(otpCodes.expiresAt, new Date()),
				),
			)
			.limit(1);

		if (activeCode.length === 0) {
			runtimeActivity.warn("OTP", "OTP", "Verification challenge expired or invalid");
			return { success: false, message: "Invalid or expired OTP." };
		}

		const codeRecord = activeCode[0];

		if (codeRecord.attempts >= OtpService.MAX_ATTEMPTS) {
			await db.delete(otpCodes).where(eq(otpCodes.id, codeRecord.id));
			runtimeActivity.warn("OTP", "OTP", "Max OTP verification attempts reached");
			return {
				success: false,
				message: "Maximum attempts reached. Please request a new code.",
			};
		}

		if (codeRecord.otpHash !== otpHash) {
			await db
				.update(otpCodes)
				.set({ attempts: codeRecord.attempts + 1 })
				.where(eq(otpCodes.id, codeRecord.id));
			runtimeActivity.warn("OTP", "OTP", "Incorrect OTP code attempt");
			return { success: false, message: "Incorrect code." };
		}

		// Success - delete to ensure single use (consumed)
		await db.delete(otpCodes).where(eq(otpCodes.id, codeRecord.id));

		runtimeActivity.success("OTP", "OTP", "Verification successful ✓");
		runtimeActivity.clearLifecycle("OTP", 1200); // Auto-clear OTP runtime logs after 1200ms!

		return { success: true, message: "Code verified successfully." };
	}
}
