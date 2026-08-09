import crypto from "crypto";
import { db } from "../../database/client";
import { otpCodes } from "../../database/schema";
import { emailService } from "./email.service";
import { queueService } from "./queue.service";
import { NotificationService } from "./notification.service";
import { env } from "../../config/env.config";
import { eq, and, gt } from "drizzle-orm";
import { logger } from "./logger.service";

export class OtpService {
  private static OTP_EXPIRY_MINUTES = 5;
  private static MAX_ATTEMPTS = 3;

  /**
   * Generates a 6-digit random OTP
   */
  private static generateNumericOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Hashes the OTP for secure storage
   */
  private static hashOTP(otp: string): string {
    return crypto.createHmac("sha256", process.env.JWT_SECRET || "fallback_secret").update(otp).digest("hex");
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
   * Creates a new OTP for an email, hashes it, stores it in DB, and sends it via email
   */
  public static async sendOTP(email: string): Promise<boolean> {
    const otp = this.generateNumericOTP();
    const otpHash = this.hashOTP(otp);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60000);
    
    // Invalidate any previous unused OTPs for this email by deleting them
    await db.delete(otpCodes).where(eq(otpCodes.email, email));

    // Store new OTP hash
    await db.insert(otpCodes).values({
      id: crypto.randomUUID(),
      email,
      otpHash,
      expiresAt,
      used: false,
      attempts: 0,
    });

    await NotificationService.dispatch({
      type: "OTP_LOGIN",
      clientUrl: env.CLIENT_URL,
      emailOnly: true,
      data: {
        email: email,
        otpCode: otp,
        securityNotice: true
      }
    });

    if (process.env.NODE_ENV !== "production") {
      logger.debug({ otp }, "OTP for debug environment");
    }

    // Since NotificationService handles the queue async, we just assume success.
    logger.info({ email: this.maskEmail(email) }, "OTP generated and sent successfully");
    return true;
  }

  /**
   * Verifies the OTP provided by the user
   */
  public static async verifyOTP(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const otpHash = this.hashOTP(otp);

    // Find the active OTP for this email
    const activeCode = await db.select().from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.used, false),
          gt(otpCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (activeCode.length === 0) {
      return { success: false, message: "Invalid or expired OTP." };
    }

    const codeRecord = activeCode[0];

    if (codeRecord.attempts >= this.MAX_ATTEMPTS) {
      // Invalidate if max attempts reached
      await db.delete(otpCodes).where(eq(otpCodes.id, codeRecord.id));
      return { success: false, message: "Maximum attempts reached. Please request a new code." };
    }

    if (codeRecord.otpHash !== otpHash) {
      // Increment attempts
      await db.update(otpCodes)
        .set({ attempts: codeRecord.attempts + 1 })
        .where(eq(otpCodes.id, codeRecord.id));
      return { success: false, message: "Incorrect code." };
    }

    // Success - mark as used (or delete to ensure single use)
    await db.delete(otpCodes).where(eq(otpCodes.id, codeRecord.id));
    
    logger.info({ email: this.maskEmail(email) }, "OTP verified successfully");
    return { success: true, message: "Code verified successfully." };
  }
}
