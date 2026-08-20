import nodemailer from "nodemailer";
import { env } from "../../config/env.config";
import { buildInviteUrl, buildClientUrl } from "../utils/url.utils";
import { maskEmail } from "../utils/string.utils";
import {
	EmailTemplateBuilder,
	type EmailTemplateOptions,
} from "./emails/template.builder";
import { logger } from "./logger.service";

export type EmailErrorCode =
	| "SMTP_CONFIGURATION_ERROR"
	| "SMTP_CONNECTION_ERROR"
	| "SMTP_TIMEOUT"
	| "SMTP_AUTHENTICATION_ERROR"
	| "SMTP_TLS_ERROR"
	| "SMTP_RECIPIENT_REJECTED"
	| "SMTP_PROVIDER_ERROR"
	| "EMAIL_TEMPLATE_ERROR"
	| "EMAIL_UNKNOWN_ERROR";

export interface SendEmailOptions {
	to: string;
	subject: string;
	title?: string;
	text?: string;
	html?: string;
	actionUrl?: string;
	actionText?: string;
	attachments?: any[];
	otpCode?: string;
	userName?: string;
	isFirstLogin?: boolean;
	isResetPassword?: boolean;
	isResetLink?: boolean;
	isPasswordChanged?: boolean;
	isNewDevice?: boolean;
	isCoCEOInvite?: boolean;
	isMemberInvite?: boolean;
	isOrgInviteAccepted?: boolean;
	isProjectAssignment?: boolean;
	isTaskAssignment?: boolean;
	isTaskCompleted?: boolean;
	isCommentMention?: boolean;
	isMaintenance?: boolean;
	isStorageWarning?: boolean;
	expiresIn?: string;
	securityNotice?: boolean;
	requestDetails?: Record<string, string>;
	mode?: "action" | "alert" | "digest" | "informational";
}

export type SendResult = {
	success: boolean;
	messageId?: string;
	accepted?: string[];
	rejected?: string[];
	error?: string;
	errorCode?: EmailErrorCode;
};

class EmailService {
	private nodemailerTransport: nodemailer.Transporter | null = null;
	private isVerified = false;
	private lastVerificationError: string | null = null;

	constructor() {
		this.initTransporter();
	}

	private validateConfig(): { isValid: boolean; missingKeys: string[] } {
		const missingKeys: string[] = [];
		const host = env.SMTP_HOST || "smtp.gmail.com";
		const user = env.SMTP_USER || env.MAIL_USER;
		const pass = env.SMTP_PASS || env.MAIL_PASS;

		if (!host) missingKeys.push("SMTP_HOST");
		if (!user) missingKeys.push("SMTP_USER / MAIL_USER");
		if (!pass) missingKeys.push("SMTP_PASS / MAIL_PASS");

		return {
			isValid: missingKeys.length === 0,
			missingKeys,
		};
	}

	private initTransporter(): nodemailer.Transporter {
		const user = env.SMTP_USER || env.MAIL_USER || "manmadhannotify@gmail.com";
		const pass = env.SMTP_PASS || env.MAIL_PASS || "";
		const host = env.SMTP_HOST || "smtp.gmail.com";
		const port = Number(env.SMTP_PORT || 587);
		const secure = env.SMTP_SECURE || false;

		const configCheck = this.validateConfig();
		if (!configCheck.isValid) {
			logger.warn(
				{ missingKeys: configCheck.missingKeys },
				"[EMAIL] SMTP configuration incomplete — missing required parameters",
			);
		}

		logger.info(
			{
				provider: "smtp",
				host,
				port,
				secure,
				authConfigured: Boolean(user && pass),
			},
			"[EMAIL] SMTP configuration loaded",
		);

		// Force family: 4 to resolve IPv6 ENETUNREACH issues with smtp.gmail.com
		this.nodemailerTransport = nodemailer.createTransport({
			host,
			port,
			secure, // false for port 587 STARTTLS
			auth: {
				user,
				pass,
			},
			family: 4, // IPv4 preference (fixes ENETUNREACH 2607:f8b0:400e:c1b::6c:465)
			connectionTimeout: 10000,
			greetingTimeout: 10000,
			socketTimeout: 15000,
			tls: {
				rejectUnauthorized: false,
			},
		} as nodemailer.TransportOptions);

		return this.nodemailerTransport;
	}

	// ── Connection verification ──────────────────────────────────────────────
	public async verifyConnection(): Promise<boolean> {
		try {
			if (!this.nodemailerTransport) {
				this.initTransporter();
			}

			const user = env.SMTP_USER || env.MAIL_USER;
			const pass = env.SMTP_PASS || env.MAIL_PASS;
			const host = env.SMTP_HOST || "smtp.gmail.com";
			const port = Number(env.SMTP_PORT || 587);
			const secure = env.SMTP_SECURE || false;

			if (!user || !pass) {
				logger.warn("[EMAIL] SMTP connection check failed: Missing authentication credentials");
				this.isVerified = false;
				this.lastVerificationError = "Missing credentials";
				return false;
			}

			await Promise.race([
				this.nodemailerTransport!.verify(),
				new Promise<never>((_, reject) =>
					setTimeout(
						() => reject(new Error("SMTP verification timeout (15s limit reached)")),
						15000,
					),
				),
			]);

			this.isVerified = true;
			this.lastVerificationError = null;

			logger.info(
				{
					provider: "smtp",
					host,
					port,
					secure,
					authConfigured: true,
					verification: "SUCCESS",
				},
				"[EMAIL] SMTP connection verification: SUCCESS",
			);

			return true;
		} catch (err: any) {
			this.isVerified = false;
			this.lastVerificationError = err?.message || String(err);

			logger.warn(
				{
					provider: "smtp",
					host: env.SMTP_HOST || "smtp.gmail.com",
					port: Number(env.SMTP_PORT || 587),
					error: this.lastVerificationError,
					verification: "FAILED",
				},
				"[EMAIL] SMTP connection verification: FAILED",
			);

			return false;
		}
	}

	public getHealthStatus() {
		return {
			provider: "smtp",
			host: env.SMTP_HOST || "smtp.gmail.com",
			port: Number(env.SMTP_PORT || 587),
			secure: env.SMTP_SECURE || false,
			status: this.isVerified ? "ready" : "degraded",
			...(this.lastVerificationError ? { lastError: this.lastVerificationError } : {}),
		};
	}

	private classifyError(err: any): EmailErrorCode {
		const message = (err?.message || String(err)).toLowerCase();

		if (message.includes("econnrefused") || message.includes("enetunreach") || message.includes("etimedout")) {
			return "SMTP_CONNECTION_ERROR";
		}
		if (message.includes("timeout")) {
			return "SMTP_TIMEOUT";
		}
		if (message.includes("invalid login") || message.includes("auth") || message.includes("535")) {
			return "SMTP_AUTHENTICATION_ERROR";
		}
		if (message.includes("tls") || message.includes("ssl") || message.includes("certificate")) {
			return "SMTP_TLS_ERROR";
		}
		if (message.includes("recipient") || message.includes("550") || message.includes("mailbox")) {
			return "SMTP_RECIPIENT_REJECTED";
		}
		if (message.includes("template")) {
			return "EMAIL_TEMPLATE_ERROR";
		}
		return "SMTP_PROVIDER_ERROR";
	}

	// ── Template builder (delegates to EmailTemplateBuilder) ─────────────────
	public buildTemplate(options: EmailTemplateOptions): string {
		return EmailTemplateBuilder.build(options);
	}

	// ── Core send method ──────────────────────────────────────────────────────
	public async sendEmail(options: SendEmailOptions): Promise<SendResult> {
		const fromName = env.MAIL_FROM_NAME || "ManMadhan Progress";
		const fromUser = env.SMTP_USER || env.MAIL_USER || env.MAIL_FROM_ADDRESS || "manmadhannotify@gmail.com";
		const fromAddress = env.EMAIL_FROM || `"${fromName}" <${fromUser}>`;

		const cleanSubject = options.subject
			.replace(/BullMQ/gi, "System")
			.replace(/Async task with auto-cleanup/gi, "Task Update");

		let finalHtml = "";
		try {
			finalHtml = options.html?.includes("<html")
				? options.html
				: this.buildTemplate({
						...options,
						title: options.title || cleanSubject,
						descriptions: options.html ? [options.html] : options.text ? [options.text] : [],
					});
		} catch (templateErr: any) {
			const errorCode = this.classifyError(templateErr);
			logger.error(
				{ error: templateErr?.message, errorCode, to: maskEmail(options.to) },
				"[EMAIL] Email template generation failed",
			);
			return { success: false, error: "Failed to render email template", errorCode };
		}

		try {
			if (!this.nodemailerTransport) {
				this.initTransporter();
			}

			logger.info(
				{ provider: "smtp", host: env.SMTP_HOST || "smtp.gmail.com", to: maskEmail(options.to), subject: cleanSubject },
				"[EMAIL] Dispatching email via Gmail SMTP...",
			);

			const info: any = await Promise.race([
				this.nodemailerTransport!.sendMail({
					from: fromAddress,
					to: options.to,
					subject: cleanSubject,
					text: options.text,
					html: finalHtml,
				}),
				new Promise<never>((_, reject) =>
					setTimeout(
						() => reject(new Error("Gmail SMTP dispatch timed out after 12000ms")),
						12000,
					),
				),
			]);

			const messageId = info.messageId || info.response;
			const accepted = Array.isArray(info.accepted) ? info.accepted : [options.to];
			const rejected = Array.isArray(info.rejected) ? info.rejected : [];

			logger.info(
				{
					provider: "smtp",
					messageId,
					accepted,
					rejected,
					to: maskEmail(options.to),
				},
				"[EMAIL] Email successfully dispatched via Gmail SMTP ✓",
			);

			return { success: true, messageId, accepted, rejected };
		} catch (err: any) {
			const errorCode = this.classifyError(err);
			const errorMessage = err?.message || "Gmail SMTP delivery failed";

			logger.error(
				{
					provider: "smtp",
					host: env.SMTP_HOST || "smtp.gmail.com",
					port: Number(env.SMTP_PORT || 587),
					error_type: errorCode,
					error: errorMessage,
					to: maskEmail(options.to),
				},
				"[EMAIL] EMAIL_SEND_FAILED",
			);

			return {
				success: false,
				error: errorMessage,
				errorCode,
			};
		}
	}

	// ── Password Reset Link email ──────────────────────────────────────────────
	public async sendPasswordResetLinkEmail(options: {
		to: string;
		userName?: string;
		resetUrl: string;
		expiresIn?: string;
	}): Promise<boolean> {
		logger.info(
			{ to: maskEmail(options.to), resetUrl: options.resetUrl },
			"[PasswordResetLink] Dispatching password reset link email",
		);

		const result = await this.sendEmail({
			to: options.to,
			subject: "Reset your ManMadhan Progress password",
			title: "Reset your ManMadhan Progress password",
			userName: options.userName,
			isResetLink: true,
			actionUrl: options.resetUrl,
			actionText: "Reset Password →",
			expiresIn: options.expiresIn || "15 minutes",
			securityNotice: true,
		});

		return result.success;
	}

	// ── Password Changed Security Notification Email ──────────────────────────
	public async sendPasswordChangedEmail(options: {
		to: string;
		userName?: string;
		method?: "Password reset" | "Account settings";
		ipAddress?: string;
	}): Promise<boolean> {
		const maskedEmail = maskEmail(options.to);
		const formattedDate = new Date().toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		}) + " at " + new Date().toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			timeZoneName: "short",
		});

		logger.info(
			{ to: maskedEmail, method: options.method || "Password reset" },
			"[PasswordChangedEmail] Dispatching post-reset security notification",
		);

		const result = await this.sendEmail({
			to: options.to,
			subject: "Your ManMadhan Progress password was changed",
			title: "Password Changed",
			userName: options.userName,
			isPasswordChanged: true,
			requestDetails: {
				"Password Changed": formattedDate,
				Account: maskedEmail,
				Method: options.method || "Password reset",
				...(options.ipAddress ? { "IP Address": options.ipAddress } : {}),
			},
			actionUrl: `${env.CLIENT_URL}/login`,
			actionText: "Secure My Account →",
			securityNotice: true,
		});

		return result.success;
	}

	// ── Invitation email ──────────────────────────────────────────────────────
	public async sendInvitationEmail(
		to: string,
		token: string,
		role: string,
		inviterName: string = "A team member",
	): Promise<boolean> {
		const actionUrl = buildInviteUrl(token);

		logger.info(
			{ to: maskEmail(to), role, actionUrl },
			"[InvitationEmail] Dispatching invitation",
		);

		const result = await this.sendEmail({
			to,
			subject: `Invitation: Join Workspace as ${role}`,
			title: "Workspace Invitation",
			html: `<p style="margin:0 0 16px 0; font-size:15px; color:#3F3F46;"><strong>${inviterName}</strong> has invited you to join the enterprise workspace as a <strong>${role}</strong>.</p>
             <p style="margin:0 0 16px 0; font-size:14px; color:#52525B;">Click the button below to set up your account and securely join the workspace.</p>`,
			actionUrl,
			actionText: "Accept Workspace Invitation",
		});

		if (!result.success) {
			logger.warn(
				{ to: maskEmail(to), error: result.error, actionUrl },
				"[InvitationEmail] Dispatch failed — invitation record preserved, link still valid",
			);
		}

		return result.success;
	}

	// ── Task assignment email ─────────────────────────────────────────────────
	public async sendTaskAssignmentEmail(options: {
		to: string;
		taskTitle: string;
		projectName?: string | null;
		milestoneName?: string | null;
		assignerName: string;
		role: string;
		deadline?: string | null;
		taskId: string;
	}): Promise<boolean> {
		const actionUrl = buildClientUrl(`/ceo/my-work?taskId=${options.taskId}`);
		const projectText = options.projectName ?? "Standalone Task";
		const milestoneText = options.milestoneName ?? "No Milestone";

		const html = `
			<p style="margin:0 0 16px 0; font-size:15px; color:#3F3F46;">You have been assigned a new task by <strong>${options.assignerName}</strong> (Role: <strong>${options.role}</strong>).</p>
			<div style="background:#F4F4F5; padding:16px; border-radius:12px; margin-bottom:16px;">
				<p style="margin:0 0 8px 0; font-size:14px; font-weight:bold; color:#18181B;">Task: ${options.taskTitle}</p>
				<p style="margin:0 0 4px 0; font-size:13px; color:#52525B;"><strong>Project:</strong> ${projectText}</p>
				<p style="margin:0 0 4px 0; font-size:13px; color:#52525B;"><strong>Milestone:</strong> ${milestoneText}</p>
				<p style="margin:0 0 4px 0; font-size:13px; color:#52525B;"><strong>Deadline:</strong> ${options.deadline ?? "Flexible"}</p>
				<p style="margin:0; font-size:13px; color:#D9A514;"><strong>Status:</strong> Pending Acceptance</p>
			</div>
			<p style="margin:0 0 16px 0; font-size:13px; color:#52525B;">Click below to review and accept or decline this task assignment.</p>
		`;

		const result = await this.sendEmail({
			to: options.to,
			subject: `Task Assigned: ${options.taskTitle}`,
			title: "New Task Assignment",
			html,
			actionUrl,
			actionText: "Review Assignment",
		});

		return result.success;
	}

	// ── Project assignment email ──────────────────────────────────────────────
	public async sendProjectAssignmentEmail(options: {
		to: string;
		projectName: string;
		assignerName: string;
		role: string;
		deadline?: string | null;
		projectId: string;
	}): Promise<boolean> {
		const actionUrl = buildClientUrl(
			`/co-ceo/my-work?projectId=${options.projectId}`,
		);

		const html = `
			<p style="margin:0 0 16px 0; font-size:15px; color:#3F3F46;">You have been assigned as <strong>${options.role}</strong> for project <strong>${options.projectName}</strong> by <strong>${options.assignerName}</strong>.</p>
			<div style="background:#F4F4F5; padding:16px; border-radius:12px; margin-bottom:16px;">
				<p style="margin:0 0 8px 0; font-size:14px; font-weight:bold; color:#18181B;">Project: ${options.projectName}</p>
				<p style="margin:0 0 4px 0; font-size:13px; color:#52525B;"><strong>Role:</strong> ${options.role}</p>
				<p style="margin:0 0 4px 0; font-size:13px; color:#52525B;"><strong>Deadline:</strong> ${options.deadline ?? "Flexible"}</p>
				<p style="margin:0; font-size:13px; color:#D9A514;"><strong>Status:</strong> Pending Acceptance</p>
			</div>
			<p style="margin:0 0 16px 0; font-size:13px; color:#52525B;">Click below to review and accept or decline this project assignment.</p>
		`;

		const result = await this.sendEmail({
			to: options.to,
			subject: `Project Assigned: ${options.projectName}`,
			title: "New Project Assignment",
			html,
			actionUrl,
			actionText: "Review Project Assignment",
		});

		return result.success;
	}
}

export const emailService = new EmailService();

