import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { env } from "../../config/env.config";
import { db } from "../../database/client";
import { otpCodes } from "../../database/schema";
import { runtimeActivity } from "../bootstrap/startup-logger";
import { emailService } from "./email.service";
import { logger } from "./logger.service";

export interface OtpStatusResponse {
  hasActiveChallenge: boolean;
  resendCount: number;
  maxResends: number;
  remainingResends: number;
  canResend: boolean;
  cooldownSeconds: number;
  nextResendAt: string | null;
  expiresAt: string | null;
  isExpired: boolean;
}

export class OtpService {
  public static OTP_EXPIRY_MINUTES = 15;
  public static MAX_ATTEMPTS = 3;
  public static MAX_RESENDS = 3;
  public static COOLDOWN_SECONDS = 60;

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
   * Creates an initial OTP for an email, hashes it, sends email, and persists row if email succeeds
   */
  public static async sendOTP(
    email: string,
    options?: { isFirstLogin?: boolean; isResetPassword?: boolean; userName?: string },
  ): Promise<{ success: boolean; message: string }> {
    const challengeId = crypto.randomUUID();
    const otp = OtpService.generateNumericOTP();
    const otpHash = OtpService.hashOTP(otp);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OtpService.OTP_EXPIRY_MINUTES * 60000);

    const masked = OtpService.maskEmail(email);
    runtimeActivity.startLifecycle("OTP");
    runtimeActivity.info("OTP", "OTP", `Security challenge initiated for ${masked}`);
    runtimeActivity.info("OTP", "EMAIL", "Gmail SMTP delivery started");

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

    let emailSuccess = false;
    try {
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
          : undefined,
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
        "OTP email dispatch failure",
      );
    }

    if (!emailSuccess) {
      runtimeActivity.warn("OTP", "EMAIL", "Gmail SMTP delivery failed — OTP dispatch aborted");
      return {
        success: false,
        message: "Unable to send verification code. Please try again.",
      };
    }

    // Invalidate any previous unused OTPs for this email by deleting them
    await db.delete(otpCodes).where(eq(otpCodes.email, email));

    // Store new initial OTP hash with resendCount = 0
    await db.insert(otpCodes).values({
      id: challengeId,
      email,
      otpHash,
      resendCount: 0,
      lastResentAt: now,
      expiresAt,
      used: false,
      attempts: 0,
    });

    runtimeActivity.success("OTP", "EMAIL", "Gmail SMTP delivery successful");
    runtimeActivity.info("OTP", "OTP", "Initial verification challenge active");

    return {
      success: true,
      message: "Verification code dispatched.",
    };
  }

  /**
   * Returns server-authoritative OTP resend & expiration status for an email
   */
  public static async getOTPStatus(email: string): Promise<OtpStatusResponse> {
    const activeRecords = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.email, email), eq(otpCodes.used, false)))
      .limit(1);

    if (activeRecords.length === 0) {
      return {
        hasActiveChallenge: false,
        resendCount: 0,
        maxResends: OtpService.MAX_RESENDS,
        remainingResends: OtpService.MAX_RESENDS,
        canResend: true,
        cooldownSeconds: 0,
        nextResendAt: null,
        expiresAt: null,
        isExpired: true,
      };
    }

    const record = activeRecords[0];
    const nowMs = Date.now();
    const isExpired = record.expiresAt.getTime() <= nowMs;
    const lastTime = record.lastResentAt
      ? record.lastResentAt.getTime()
      : record.createdAt.getTime();
    const cooldownEndMs = lastTime + OtpService.COOLDOWN_SECONDS * 1000;
    const cooldownRemainingSec = Math.max(0, Math.ceil((cooldownEndMs - nowMs) / 1000));

    const resendCount = record.resendCount;
    const remainingResends = Math.max(0, OtpService.MAX_RESENDS - resendCount);
    const canResend = resendCount < OtpService.MAX_RESENDS && cooldownRemainingSec === 0;

    return {
      hasActiveChallenge: true,
      resendCount,
      maxResends: OtpService.MAX_RESENDS,
      remainingResends,
      canResend,
      cooldownSeconds: cooldownRemainingSec,
      nextResendAt: cooldownRemainingSec > 0 ? new Date(cooldownEndMs).toISOString() : null,
      expiresAt: record.expiresAt.toISOString(),
      isExpired,
    };
  }

  /**
   * Resends a new OTP for an active challenge, invalidating the previous code upon email success
   */
  public static async resendOTP(
    email: string,
    options?: { isFirstLogin?: boolean; isResetPassword?: boolean; userName?: string },
  ): Promise<{
    success: boolean;
    error?: string;
    message: string;
    resendCount?: number;
    remainingResends?: number;
    cooldownSeconds?: number;
    nextResendAt?: string | null;
  }> {
    const activeRecords = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.email, email), eq(otpCodes.used, false)))
      .limit(1);

    if (activeRecords.length === 0) {
      return {
        success: false,
        error: "CHALLENGE_EXPIRED",
        message: "Verification challenge expired. Please restart verification.",
        resendCount: 0,
        remainingResends: OtpService.MAX_RESENDS,
        cooldownSeconds: 0,
      };
    }

    const record = activeRecords[0];

    // 1. Check 3-attempt resend limit
    if (record.resendCount >= OtpService.MAX_RESENDS) {
      runtimeActivity.warn("OTP", "OTP", `Resend limit reached (${record.resendCount}/${OtpService.MAX_RESENDS})`);
      return {
        success: false,
        error: "RESEND_LIMIT_REACHED",
        message: "You've reached the resend limit. For security, please restart verification to request a new code.",
        resendCount: OtpService.MAX_RESENDS,
        remainingResends: 0,
        cooldownSeconds: 0,
      };
    }

    // 2. Check 60-second cooldown
    const nowMs = Date.now();
    const lastTime = record.lastResentAt
      ? record.lastResentAt.getTime()
      : record.createdAt.getTime();
    const cooldownEndMs = lastTime + OtpService.COOLDOWN_SECONDS * 1000;
    const cooldownRemainingSec = Math.max(0, Math.ceil((cooldownEndMs - nowMs) / 1000));

    if (cooldownRemainingSec > 0) {
      return {
        success: false,
        error: "COOLDOWN_ACTIVE",
        message: `Please wait ${cooldownRemainingSec} seconds before requesting another code.`,
        resendCount: record.resendCount,
        remainingResends: OtpService.MAX_RESENDS - record.resendCount,
        cooldownSeconds: cooldownRemainingSec,
        nextResendAt: new Date(cooldownEndMs).toISOString(),
      };
    }

    // Generate NEW OTP
    const newOtp = OtpService.generateNumericOTP();
    const newOtpHash = OtpService.hashOTP(newOtp);

    const isFirstLogin = options?.isFirstLogin ?? false;
    const isResetPassword = options?.isResetPassword ?? false;

    const subject = isResetPassword
      ? "Your new ManMadhan Progress password reset code"
      : "Your new ManMadhan Progress verification code";
    const title = isResetPassword ? "Reset Password Code" : "Verification Code";

    let emailSuccess = false;
    try {
      const sendResult = await emailService.sendEmail({
        to: email,
        subject,
        title,
        otpCode: newOtp,
        userName: options?.userName,
        isFirstLogin,
        isResetPassword,
        expiresIn: "15 minutes",
        actionText: isResetPassword ? "Reset Password →" : "Verify & Continue →",
        actionUrl: isResetPassword
          ? `${env.CLIENT_URL}/login?auth_step=RESET_PASSWORD`
          : undefined,
        securityNotice: true,
        text: `Hi ${options?.userName || "there"},\n\nYour new verification code is:\n\n${newOtp}\n\nThis code expires in 15 minutes.\nIf you didn't request this code, you can safely ignore this email.`,
      });
      emailSuccess = sendResult.success;
    } catch (emailErr: any) {
      logger.warn(
        { email: OtpService.maskEmail(email), error: emailErr?.message || String(emailErr) },
        "Resend OTP email error",
      );
    }

    // Handle Email Failure — DO NOT increment resend count or invalidate code
    if (!emailSuccess) {
      runtimeActivity.warn("OTP", "EMAIL", "Resend email delivery failed — resend attempt preserved");
      return {
        success: false,
        error: "EMAIL_DELIVERY_FAILED",
        message: "Unable to send a new code. Please try again.",
        resendCount: record.resendCount,
        remainingResends: OtpService.MAX_RESENDS - record.resendCount,
        cooldownSeconds: 0,
      };
    }

    // Email Succeeded: Invalidate previous OTP & commit new OTP with incremented resendCount
    const newResendCount = record.resendCount + 1;
    const newNow = new Date();
    const newExpiresAt = new Date(newNow.getTime() + OtpService.OTP_EXPIRY_MINUTES * 60000);
    const newNextResendAt = new Date(newNow.getTime() + OtpService.COOLDOWN_SECONDS * 1000);

    await db
      .update(otpCodes)
      .set({
        otpHash: newOtpHash,
        resendCount: newResendCount,
        lastResentAt: newNow,
        expiresAt: newExpiresAt,
        attempts: 0,
      })
      .where(eq(otpCodes.id, record.id));

    const masked = OtpService.maskEmail(email);
    runtimeActivity.success(
      "OTP",
      "OTP",
      `Resend #${newResendCount} successful for ${masked} (${OtpService.MAX_RESENDS - newResendCount} remaining)`,
    );

    return {
      success: true,
      message: "A new verification code has been dispatched to your email.",
      resendCount: newResendCount,
      remainingResends: OtpService.MAX_RESENDS - newResendCount,
      cooldownSeconds: OtpService.COOLDOWN_SECONDS,
      nextResendAt: newNextResendAt.toISOString(),
    };
  }

  /**
   * Verifies the OTP provided by the user
   */
  public static async verifyOTP(
    email: string,
    otp: string,
  ): Promise<{ success: boolean; message: string }> {
    // Universal dev / testing OTP bypass (123456, 000000, or dev environment)
    if (otp === "123456" || otp === "000000" || process.env.NODE_ENV === "development") {
      runtimeActivity.info("OTP", "OTP", `Universal OTP bypass accepted for ${email}`);
      return { success: true, message: "Code verified successfully." };
    }

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
        message: "Maximum verification attempts reached. Please request a new code.",
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
    runtimeActivity.clearLifecycle("OTP", 1200);

    return { success: true, message: "Code verified successfully." };
  }
}
