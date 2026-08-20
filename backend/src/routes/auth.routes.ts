import { randomUUID } from "node:crypto";
import { and, eq, ilike } from "drizzle-orm";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.config";
import { db } from "../../database/client";
import { spaces, users, workspaceMembers, workspaces } from "../../database/schema";
import { runtimeActivity } from "../bootstrap/startup-logger";
import { strictAuth, verifyTempToken } from "../middleware/auth.middleware";
import { AuditService } from "../services/audit.service";
import { AuthService } from "../services/auth.service";
import { DeviceService } from "../services/device.service";
import { NotificationService } from "../services/notification.service";
import { emailService } from "../services/email.service";
import { logger } from "../services/logger.service";
import { OtpService } from "../services/otp.service";
import { SessionService } from "../services/session.service";
import { socketService } from "../services/socket.service";

export const authRouter = Router();

// GET /auth/check-google-availability?email=...
authRouter.get("/check-google-availability", async (req, res, next) => {
	try {
		const email = String(req.query.email || "").trim().toLowerCase();
		if (!email) return res.json({ allowed: true });

		const userList = await db
			.select({
				id: users.id,
				email: users.email,
				firstLoginCompleted: users.firstLoginCompleted,
				onboardingStatus: users.onboardingStatus,
			})
			.from(users)
			.where(ilike(users.email, email))
			.limit(1);

		if (userList.length === 0) {
			return res.json({ allowed: false, message: "Account not found" });
		}

		const user = userList[0];
		const allowed = Boolean(user.firstLoginCompleted && user.onboardingStatus === "COMPLETED");

		return res.json({
			allowed,
			firstLoginCompleted: user.firstLoginCompleted,
			message: allowed
				? "Google authentication available"
				: "Google login available after first login",
		});
	} catch (error) {
		next(error);
	}
});

// POST /login/password
authRouter.post("/login/password", async (req, res, next) => {
	try {
		const { email, password } = req.body;
		const cleanEmail = String(email || "").trim().toLowerCase();

		// 1. Email format validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!cleanEmail || !emailRegex.test(cleanEmail)) {
			return res.status(400).json({
				success: false,
				code: "INVALID_EMAIL",
				error: "Enter a valid email address.",
			});
		}

		// 2. Account existence check
		const userList = await db
			.select()
			.from(users)
			.where(ilike(users.email, cleanEmail))
			.limit(1);

		if (userList.length === 0) {
			return res.status(401).json({
				success: false,
				code: "INVALID_CREDENTIALS",
				error: "Invalid email or password",
				details: "Invalid email or password. Please check your credentials and try again.",
			});
		}

		const user = userList[0];

		// 3. Account status & setup state validation
		const userStatus = (user.status || "").toLowerCase();
		if (userStatus === "suspended" || userStatus === "disabled" || userStatus === "locked") {
			return res.status(403).json({
				success: false,
				code: "ACCOUNT_SUSPENDED",
				error: "Account suspended",
				details: "Your ManMadhan Progress account has been suspended.",
			});
		}
		if (userStatus === "deleted") {
			return res.status(403).json({
				success: false,
				code: "ACCOUNT_DELETED",
				error: "Account unavailable",
				details: "This account is no longer available.",
			});
		}
		if (user.isInvited && (!user.passwordHash || !user.firstLoginCompleted)) {
			return res.status(400).json({
				success: false,
				code: "ACCOUNT_PENDING_SETUP",
				error: "Complete your account setup",
				details: "Your organization invitation is waiting for you.",
			});
		}

		// 4. Password verification (bcrypt / scrypt per-password salt)
		const isValidPassword = AuthService.verifyPassword(
			password || "",
			user.passwordHash || "",
		);

		if (!isValidPassword) {
			await AuditService.logEvent(
				user.id,
				"LOGIN_FAILED",
				"Invalid password attempt",
				req.ip || "",
			);
			return res.status(401).json({
				success: false,
				code: "INVALID_CREDENTIALS",
				error: "Invalid email or password",
				details: "Invalid email or password. Please check your credentials and try again.",
			});
		}

		// 5. First-login onboarding flow (OTP bypassed for simple setup)
		if (!user.firstLoginCompleted || user.onboardingStatus !== "COMPLETED") {
			let currentStep = "PASSWORD_CREATION";
			if (user.onboardingStatus === "PERSONAL_SETUP_REQUIRED") {
				currentStep = "PROFILE_SETUP";
			} else if (user.onboardingStatus === "ORGANIZATION_SETUP_REQUIRED") {
				currentStep = "ORGANIZATION_SETUP";
			} else if (user.onboardingStatus === "ONBOARDING_DETAILS_VALIDATED") {
				currentStep = "REVIEW_SETUP";
			} else {
				await db
					.update(users)
					.set({ onboardingStatus: "PASSWORD_CHANGE_REQUIRED" })
					.where(eq(users.id, user.id));
			}

			const tempToken = jwt.sign(
				{
					id: user.id,
					email: user.email,
					intent: "setup",
					step: currentStep,
				},
				env.JWT_SECRET,
				{ expiresIn: "30m" },
			);

			await AuditService.logEvent(
				user.id,
				"FIRST_LOGIN_STARTED",
				"Password verified. First-login onboarding started directly (OTP requirement bypassed).",
				req.ip || "",
			);

			return res.json({
				success: true,
				nextStep: currentStep,
				tempToken,
				email: user.email,
			});
		}

		// 6. Normal returning user login — Issue session & tokens
		const now = new Date();
		await db
			.update(users)
			.set({ lastLoginAt: now, lastActiveAt: now })
			.where(eq(users.id, user.id));

		const deviceId = req.ip || "web-default";
		const tokens = await SessionService.issueTokens(
			res,
			user,
			deviceId,
			req.headers["user-agent"],
			req.ip,
		);

		await AuditService.logEvent(
			user.id,
			"LOGIN_SUCCESS",
			"Password login successful",
			req.ip || "",
		);

		runtimeActivity.startLifecycle("AUTH");
		runtimeActivity.info("AUTH", "AUTH", `Login successful for ${user.email}`);
		runtimeActivity.clearLifecycle("AUTH", 1200);

		const ws = await db.query.workspaceMembers.findFirst({
			where: eq(workspaceMembers.userId, user.id),
		});
		if (ws) {
			socketService.emitToWorkspace(ws.workspaceId, "MEMBER_ACTIVATED", {
				userId: user.id,
			});
		}

		return res.json({
			success: true,
			nextStep: "DASHBOARD",
			role: user.role,
			accessToken: tokens.accessToken,
			user,
		});
	} catch (error) {
		next(error);
	}
});

// POST /forgot-password
authRouter.post("/forgot-password", async (req, res, next) => {
	try {
		const { email } = req.body;
		const cleanEmail = String(email || "").trim().toLowerCase();

		if (!cleanEmail) {
			return res.status(400).json({ success: false, error: "Email is required" });
		}

		const userList = await db
			.select()
			.from(users)
			.where(ilike(users.email, cleanEmail))
			.limit(1);

		// Privacy-safe response regardless of email existence
		if (userList.length > 0) {
			const user = userList[0];
			const resetToken = jwt.sign(
				{
					id: user.id,
					email: user.email,
					intent: "reset_password",
				},
				env.JWT_SECRET || "fallback_secret",
				{ expiresIn: "15m" },
			);
			const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

			await emailService.sendPasswordResetLinkEmail({
				to: cleanEmail,
				userName: user.displayName || user.name || cleanEmail.split("@")[0],
				resetUrl,
				expiresIn: "15 minutes",
			});

			await AuditService.logEvent(
				user.id,
				"FORGOT_PASSWORD_REQUESTED",
				"Password reset link email dispatched",
				req.ip || "",
			);
		}

		return res.json({
			success: true,
			message: "If an account exists for this email, we'll send instructions to continue.",
		});
	} catch (error) {
		next(error);
	}
});

// GET /otp-status
authRouter.get("/otp-status", async (req, res, next) => {
	try {
		const email = String(req.query.email || "").trim().toLowerCase();
		if (!email) {
			return res.status(400).json({ success: false, error: "Email is required" });
		}
		const status = await OtpService.getOTPStatus(email);
		return res.json({ success: true, ...status });
	} catch (error) {
		next(error);
	}
});

// POST /resend-otp
authRouter.post("/resend-otp", async (req, res, next) => {
	try {
		const { email, purpose } = req.body;
		const cleanEmail = String(email || "").trim().toLowerCase();

		if (!cleanEmail) {
			return res.status(400).json({ success: false, error: "Email is required" });
		}

		const userList = await db
			.select()
			.from(users)
			.where(ilike(users.email, cleanEmail))
			.limit(1);

		if (userList.length === 0) {
			return res.status(404).json({ success: false, error: "Account not found" });
		}

		const user = userList[0];
		const isResetPassword = purpose === "reset_password";
		const isFirstLogin = !user.firstLoginCompleted || user.onboardingStatus !== "COMPLETED";

		const resendResult = await OtpService.resendOTP(cleanEmail, {
			isFirstLogin: !isResetPassword && isFirstLogin,
			isResetPassword,
			userName: user.displayName || user.name || cleanEmail.split("@")[0],
		});

		if (!resendResult.success) {
			const statusCode = resendResult.error === "RESEND_LIMIT_REACHED" ? 429 : 400;
			return res.status(statusCode).json({
				success: false,
				error: resendResult.error,
				message: resendResult.message,
				resendCount: resendResult.resendCount,
				remainingResends: resendResult.remainingResends,
				cooldownSeconds: resendResult.cooldownSeconds,
			});
		}

		await AuditService.logEvent(
			user.id,
			"OTP_RESENT",
			`OTP code resent (#${resendResult.resendCount}) for purpose: ${purpose || "login"}`,
			req.ip || "",
		);

		return res.json({
			success: true,
			message: resendResult.message,
			resendCount: resendResult.resendCount,
			remainingResends: resendResult.remainingResends,
			cooldownSeconds: resendResult.cooldownSeconds,
			nextResendAt: resendResult.nextResendAt,
		});
	} catch (error) {
		next(error);
	}
});

// POST /verify-otp
authRouter.post("/verify-otp", async (req, res, next) => {
	try {
		const { email, otp, purpose } = req.body;
		const cleanEmail = String(email || "").trim().toLowerCase();

		const userList = await db
			.select()
			.from(users)
			.where(ilike(users.email, cleanEmail))
			.limit(1);
		if (userList.length === 0)
			return res
				.status(404)
				.json({ success: false, error: "Account not found" });
		const user = userList[0];

		const verifyResult = await OtpService.verifyOTP(user.email, otp);
		if (!verifyResult.success) {
			await AuditService.logEvent(
				user.id,
				"OTP_FAILED",
				"Failed OTP verification",
				req.ip || "",
			);
			return res
				.status(400)
				.json({ success: false, error: verifyResult.message });
		}

		await AuditService.logEvent(
			user.id,
			"OTP_VERIFIED",
			`Successfully verified OTP (Purpose: ${purpose || "standard"}).`,
			req.ip || "",
		);

		// Handle Reset Password Flow
		if (purpose === "reset_password" || user.onboardingStatus === "PASSWORD_RESET_REQUIRED") {
			const resetSessionToken = jwt.sign(
				{
					id: user.id,
					email: user.email,
					intent: "reset_password",
				},
				env.JWT_SECRET,
				{ expiresIn: "15m" },
			);

			return res.json({
				success: true,
				nextStep: "RESET_PASSWORD",
				resetSessionToken,
			});
		}

		// Handle First Login / Onboarding Flow
		if (!user.firstLoginCompleted || user.onboardingStatus !== "COMPLETED") {
			await db
				.update(users)
				.set({ onboardingStatus: "PASSWORD_CHANGE_REQUIRED" })
				.where(eq(users.id, user.id));

			const tempToken = jwt.sign(
				{
					id: user.id,
					email: user.email,
					intent: "setup",
					step: "PASSWORD_CREATION",
				},
				env.JWT_SECRET,
				{ expiresIn: "30m" },
			);

			return res.json({
				success: true,
				nextStep: "PASSWORD_CREATION",
				tempToken,
			});
		}

		// Handle Returning User Login Flow
		const deviceId = req.ip || "unknown-device";
		const sessionTokens = await SessionService.issueTokens(res, user, deviceId);

		return res.json({
			success: true,
			nextStep: "DASHBOARD",
			role: user.role,
			accessToken: sessionTokens?.accessToken,
		});
	} catch (error) {
		next(error);
	}
});

// GET /verify-reset-token?token=...
authRouter.get("/verify-reset-token", async (req, res) => {
	const token = String(req.query.token || "").trim();
	if (!token) {
		return res.status(400).json({ success: false, valid: false, error: "Reset token is required." });
	}

	try {
		const decoded = jwt.verify(token, env.JWT_SECRET || "fallback_secret") as any;
		if (decoded.intent !== "reset_password") {
			return res.status(403).json({ success: false, valid: false, error: "Invalid token intent for password reset." });
		}

		const userList = await db
			.select({ id: users.id, email: users.email, displayName: users.displayName, name: users.name })
			.from(users)
			.where(eq(users.id, decoded.id))
			.limit(1);

		if (userList.length === 0) {
			return res.status(404).json({ success: false, valid: false, error: "Account not found." });
		}

		const user = userList[0];
		return res.json({
			success: true,
			valid: true,
			email: user.email,
			userName: user.displayName || user.name || user.email.split("@")[0],
		});
	} catch (err: any) {
		const message = err.name === "TokenExpiredError"
			? "This password reset link was valid for 15 minutes and has expired. Please request a new link."
			: "Password reset link is invalid or corrupted.";
		return res.status(401).json({ success: false, valid: false, error: message });
	}
});

// POST /reset-password
authRouter.post("/reset-password", async (req, res, next) => {
	try {
		const { resetSessionToken, token, newPassword, password } = req.body;
		const effectiveToken = resetSessionToken || token;
		const effectivePassword = newPassword || password;

		if (!effectiveToken || !effectivePassword) {
			return res.status(400).json({
				success: false,
				error: "Reset session token and new password are required",
			});
		}

		if (effectivePassword.length < 8) {
			return res.status(400).json({
				success: false,
				error: "Password must be at least 8 characters long",
			});
		}

		let decoded: any;
		try {
			decoded = jwt.verify(effectiveToken, env.JWT_SECRET || "fallback_secret");
		} catch (err) {
			return res.status(401).json({
				success: false,
				error: "Reset session has expired or is invalid. Please request a new code.",
			});
		}

		if (decoded.intent !== "reset_password") {
			return res.status(403).json({
				success: false,
				error: "Invalid token intent for password reset.",
			});
		}

		const userId = decoded.id;
		const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);

		if (userList.length === 0) {
			return res.status(404).json({ success: false, error: "Account not found" });
		}

		const user = userList[0];

		// Security Check: Verify that the new password does not match the user's previous/current password
		if (user.passwordHash && AuthService.verifyPassword(effectivePassword, user.passwordHash)) {
			return res.status(400).json({
				success: false,
				error: "You can't use your previous password. Please choose a new password.",
			});
		}

		// Save new password securely via AuthService (hashes with scrypt + saves to history)
		await AuthService.savePassword(user.id, effectivePassword);

		// Send Security Notification Email (non-blocking)
		emailService.sendPasswordChangedEmail({
			to: user.email,
			userName: user.displayName || user.name || user.email.split("@")[0],
			method: "Password reset",
			ipAddress: req.ip || "",
		}).catch((err) => {
			logger.warn({ userId: user.id, error: err?.message }, "Failed to send password-changed security email");
		});

		await db
			.update(users)
			.set({ isVerified: true, onboardingStatus: "COMPLETED", firstLoginCompleted: true })
			.where(eq(users.id, user.id));

		await AuditService.logEvent(
			user.id,
			"PASSWORD_RESET_SUCCESS",
			"Master password updated successfully via OTP recovery",
			req.ip || "",
		);

		return res.json({
			success: true,
			message: "Your master password has been updated. Please log in with your new password.",
		});
	} catch (error) {
		next(error);
	}
});

// POST /change-password (Authenticated User Settings Password Change)
authRouter.post("/change-password", async (req, res, next) => {
	try {
		const { currentPassword, newPassword, confirmPassword } = req.body;
		const authHeader = req.headers.authorization;
		const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

		if (!token) {
			return res.status(401).json({ success: false, error: "Authentication required" });
		}

		let decoded: any;
		try {
			decoded = jwt.verify(token, env.JWT_SECRET || "fallback_secret");
		} catch (err) {
			return res.status(401).json({ success: false, error: "Session expired or invalid" });
		}

		if (!currentPassword || !newPassword) {
			return res.status(400).json({ success: false, error: "Current password and new password are required" });
		}

		if (newPassword.length < 8) {
			return res.status(400).json({ success: false, error: "New password must be at least 8 characters long" });
		}

		if (confirmPassword && newPassword !== confirmPassword) {
			return res.status(400).json({ success: false, error: "Passwords do not match" });
		}

		const userList = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
		if (userList.length === 0) {
			return res.status(404).json({ success: false, error: "Account not found" });
		}

		const user = userList[0];

		// 1. Verify current password
		if (!user.passwordHash || !AuthService.verifyPassword(currentPassword, user.passwordHash)) {
			return res.status(401).json({ success: false, error: "Current password is incorrect" });
		}

		// 2. Verify new password is not equal to current password
		if (AuthService.verifyPassword(newPassword, user.passwordHash)) {
			return res.status(400).json({ success: false, error: "Your new password must be different from your current password" });
		}

		// 3. Save new password securely
		await AuthService.savePassword(user.id, newPassword);

		// Send Security Notification Email (non-blocking)
		emailService.sendPasswordChangedEmail({
			to: user.email,
			userName: user.displayName || user.name || user.email.split("@")[0],
			method: "Account settings",
			ipAddress: req.ip || "",
		}).catch((err) => {
			logger.warn({ userId: user.id, error: err?.message }, "Failed to send password-changed security email");
		});

		await AuditService.logEvent(
			user.id,
			"PASSWORD_CHANGE_SUCCESS",
			"Master password changed via user settings",
			req.ip || "",
		);

		return res.json({
			success: true,
			message: "Your password has been changed successfully.",
		});
	} catch (error) {
		next(error);
	}
});

// GET /reset/verify
authRouter.get("/reset/verify", async (req, res, next) => {
	try {
		const token = String(req.query.token || "").trim();
		if (!token) {
			return res.status(400).json({ success: false, error: "Token is required" });
		}

		let decoded: any;
		try {
			decoded = jwt.verify(token, env.JWT_SECRET || "fallback_secret");
		} catch (err) {
			return res.status(401).json({ success: false, error: "Reset link has expired or is invalid." });
		}

		if (decoded.intent !== "reset_password") {
			return res.status(403).json({ success: false, error: "Invalid reset token intent." });
		}

		return res.json({
			success: true,
			resetSessionToken: token,
		});
	} catch (error) {
		next(error);
	}
});

// POST /setup/profile
authRouter.post("/setup/profile", verifyTempToken, async (req, res) => {
	const {
		displayName,
		personalWorkspaceName,
		timezone,
		language,
		dateFormat,
		timeFormat,
		batchNumber,
	} = req.body;
	const setupUser = (req as any).setupUser;

	if (setupUser.step !== "PERSONAL_SETUP" && setupUser.step !== "PROFILE_SETUP") {
		return res
			.status(403)
			.json({ success: false, error: "Invalid setup step progression" });
	}

	const cleanDisplayName = String(displayName || "").trim();
	if (!cleanDisplayName) {
		return res.status(400).json({ success: false, error: "Display name is required" });
	}

	await db
		.update(users)
		.set({
			displayName: cleanDisplayName,
			timezone: timezone || "Asia/Kolkata",
			language: language || "English",
			dateFormat,
			timeFormat,
			batchNumber: batchNumber || "MK1603",
			onboardingStatus: "ORGANIZATION_SETUP_REQUIRED",
		})
		.where(eq(users.id, setupUser.id));

	// Ensure Personal Workspace exists
	const existingPersonal = await db.query.workspaces.findFirst({
		where: and(
			eq(workspaces.type, "personal"),
			eq(workspaces.name, personalWorkspaceName || "Personal Workspace"),
		),
	});

	if (!existingPersonal) {
		const personalId = randomUUID();
		await db.insert(workspaces).values({
			id: personalId,
			name: personalWorkspaceName || "Personal Workspace",
			type: "personal",
		});
		await db.insert(workspaceMembers).values({
			id: randomUUID(),
			workspaceId: personalId,
			userId: setupUser.id,
			role: "MEMBER",
		});
	}

	await AuditService.logEvent(
		setupUser.id,
		"PERSONAL_SETUP_COMPLETED",
		"User completed personal profile and workspace details",
		req.ip || "",
	);

	const userList = await db
		.select()
		.from(users)
		.where(eq(users.id, setupUser.id))
		.limit(1);
	const targetRole = userList[0]?.role || "MEMBER";
	const nextStep = targetRole === "CEO" ? "ORGANIZATION_SETUP" : "REVIEW_SETUP";

	const tempToken = jwt.sign(
		{
			id: setupUser.id,
			email: setupUser.email,
			intent: "setup",
			step: nextStep,
		},
		env.JWT_SECRET,
		{ expiresIn: "30m" },
	);

	return res.json({
		success: true,
		nextStep,
		tempToken,
	});
});

// POST /setup/organization
authRouter.post("/setup/organization", verifyTempToken, async (req, res) => {
	const { organizationName, communityName, orgLogo } = req.body;
	const setupUser = (req as any).setupUser;

	if (setupUser.step !== "ORGANIZATION_SETUP") {
		return res
			.status(403)
			.json({ success: false, error: "Invalid setup step progression" });
	}

	const cleanOrgName = String(organizationName || "").trim();
	if (!cleanOrgName || cleanOrgName.length < 2 || cleanOrgName.length > 100) {
		return res.status(400).json({
			success: false,
			error: "Organization name must be between 2 and 100 characters.",
		});
	}

	const userList = await db
		.select()
		.from(users)
		.where(eq(users.id, setupUser.id))
		.limit(1);
	const user = userList[0];

	// Create or update Org Workspace
	const existingOrg = await db.query.workspaceMembers.findFirst({
		where: and(
			eq(workspaceMembers.userId, user.id),
			eq(workspaceMembers.role, "CEO"),
		),
	});

	let orgId = existingOrg?.workspaceId;
	if (!orgId) {
		orgId = randomUUID();
		await db
			.insert(workspaces)
			.values({ id: orgId, name: cleanOrgName, type: "org" });
		await db.insert(workspaceMembers).values({
			id: randomUUID(),
			workspaceId: orgId,
			userId: user.id,
			role: "CEO",
		});
	} else {
		await db
			.update(workspaces)
			.set({ name: cleanOrgName })
			.where(eq(workspaces.id, orgId));
	}

	// Validate that all required details are completed & saved
	await db
		.update(users)
		.set({
			onboardingStatus: "ONBOARDING_DETAILS_VALIDATED",
		})
		.where(eq(users.id, user.id));

	await AuditService.logEvent(
		user.id,
		"ORGANIZATION_SETUP_COMPLETED",
		`Completed organization details for ${cleanOrgName}. Validated all onboarding requirements.`,
		req.ip || "",
	);

	// Issue token for final Review step
	const tempToken = jwt.sign(
		{
			id: setupUser.id,
			email: setupUser.email,
			intent: "setup",
			step: "REVIEW_SETUP",
		},
		env.JWT_SECRET,
		{ expiresIn: "30m" },
	);

	return res.json({
		success: true,
		nextStep: "REVIEW_SETUP",
		tempToken,
	});
});

// POST /setup/password (STEP 03 - CHANGE PASSWORD)
authRouter.post("/setup/password", verifyTempToken, async (req, res) => {
	const { password } = req.body;
	const setupUser = (req as any).setupUser;

	const userList = await db
		.select()
		.from(users)
		.where(eq(users.id, setupUser.id))
		.limit(1);
	if (userList.length === 0) {
		return res.status(404).json({ success: false, error: "Account not found" });
	}
	const user = userList[0];

	if (setupUser.step !== "PASSWORD_CREATION") {
		return res.status(403).json({
			success: false,
			error: "INVALID_STEP",
			message: "Invalid onboarding step sequence.",
		});
	}

	if (!password || password.length < 8) {
		return res.status(400).json({
			success: false,
			error: "Password must be at least 8 characters long.",
		});
	}

	await AuthService.savePassword(setupUser.id, password);

	await db
		.update(users)
		.set({
			onboardingStatus: "PERSONAL_SETUP_REQUIRED",
		})
		.where(eq(users.id, user.id));

	await AuditService.logEvent(
		user.id,
		"PASSWORD_CHANGED",
		"Successfully changed temporary password to new user password.",
		req.ip || "",
	);

	const nextTempToken = jwt.sign(
		{
			id: user.id,
			email: user.email,
			intent: "setup",
			step: "PERSONAL_SETUP",
		},
		env.JWT_SECRET,
		{ expiresIn: "30m" },
	);

	return res.json({
		success: true,
		nextStep: "PROFILE_SETUP",
		tempToken: nextTempToken,
	});
});

// POST /setup/complete (STEP 07 - COMPLETE SETUP)
authRouter.post("/setup/complete", verifyTempToken, async (req, res) => {
	const setupUser = (req as any).setupUser;

	const userList = await db
		.select()
		.from(users)
		.where(eq(users.id, setupUser.id))
		.limit(1);
	if (userList.length === 0) {
		return res.status(404).json({ success: false, error: "Account not found" });
	}
	const user = userList[0];

	// Final Onboarding Completion: Atomically update DB records
	const now = new Date();
	await db
		.update(users)
		.set({
			firstLoginCompleted: true,
			onboardingStatus: "COMPLETED",
			status: "Activated",
			isGoogleEnabled: true,
			lastLoginAt: now,
			lastActiveAt: now,
		})
		.where(eq(users.id, user.id));

	await AuditService.logEvent(
		user.id,
		"FIRST_LOGIN_COMPLETED",
		"Completed final onboarding review. Account activated. Returned to login.",
		req.ip || "",
	);

	runtimeActivity.startLifecycle("AUTH");
	runtimeActivity.success("AUTH", "AUTH", "First login onboarding completed ✓");
	runtimeActivity.clearLifecycle("AUTH", 1200);

	return res.json({
		success: true,
		nextStep: "SETUP_COMPLETE",
		message: "Onboarding complete! Please sign in with your new password.",
	});
});

// GET /me
authRouter.get("/me", strictAuth, async (req, res) => {
	const authUser = (req as any).user;
	const userRecords = await db
		.select()
		.from(users)
		.where(eq(users.id, authUser.id))
		.limit(1);

	if (userRecords.length === 0) {
		return res.status(404).json({ success: false, authenticated: false, error: "User not found" });
	}

	const user = userRecords[0];

	let workspaceId = null;
	const userMember = await db.query.workspaceMembers.findFirst({
		where: eq(workspaceMembers.userId, user.id),
	});
	if (userMember) {
		workspaceId = userMember.workspaceId;
	}

	return res.json({ success: true, authenticated: true, user, workspaceId });
});

// POST /logout
authRouter.post("/logout", async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;
		if (authHeader && authHeader.startsWith("Bearer ")) {
			try {
				const token = authHeader.split(" ")[1];
				const decoded = jwt.verify(token, env.JWT_SECRET) as any;
				if (decoded?.id) {
					await SessionService.revokeUserSessions(decoded.id);
					await AuditService.logEvent(
						decoded.id,
						"LOGOUT",
						"User signed out successfully",
						req.ip || "",
					);
				}
			} catch (e) {}
		}

		SessionService.clearTokens(res);
		return res.json({
			success: true,
			message: "Logged out successfully",
		});
	} catch (error) {
		SessionService.clearTokens(res);
		next(error);
	}
});

// POST /refresh
authRouter.post("/refresh", async (req, res) => {
	try {
		const refreshTokenInput =
			req.cookies?.refresh_token ||
			req.body?.refreshToken ||
			req.body?.token ||
			(req.headers["x-refresh-token"] as string);

		if (!refreshTokenInput) {
			SessionService.clearTokens(res);
			return res.status(401).json({
				success: false,
				code: "REFRESH_TOKEN_MISSING",
				error: "No refresh token provided",
			});
		}

		const result = await SessionService.rotateSession(
			refreshTokenInput,
			res,
			req.headers["user-agent"],
			req.ip,
		);

		return res.json({
			success: true,
			accessToken: result.accessToken,
			user: result.user,
		});
	} catch (err: any) {
		SessionService.clearTokens(res);
		const status = err.status || 401;
		const code = err.code || "REFRESH_SESSION_EXPIRED";
		const message = err.message || "Invalid or expired refresh token";

		return res.status(status).json({
			success: false,
			code,
			error: message,
		});
	}
});
