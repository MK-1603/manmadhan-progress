import { Resend } from "resend";
import nodemailer from "nodemailer";
import { env } from "../../config/env.config";
import { buildInviteUrl, buildClientUrl } from "../utils/url.utils";
import { maskEmail } from "../utils/string.utils";
import {
	EmailTemplateBuilder,
	type EmailTemplateOptions,
} from "./emails/template.builder";
import { logger } from "./logger.service";

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

// ── Transport selection ──────────────────────────────────────────────────────
// Priority:
//   1. RESEND_API_KEY present → use Resend HTTPS API (works on Render / any host)
//   2. Otherwise → Nodemailer SMTP / Gmail (local / self-hosted only)
//
// Render blocks outbound SMTP ports (465 / 587) on its free tier, so Nodemailer
// will always time-out in production. Always set RESEND_API_KEY on Render.

type SendResult = { success: boolean; messageId?: string; error?: string };

class EmailService {
	private resend: Resend | null = null;
	private nodemailerTransport: nodemailer.Transporter | null = null;
	private provider: "smtp" | "resend" = "smtp";

	constructor() {
		this.provider = (env.EMAIL_PROVIDER || "smtp").toLowerCase() as "smtp" | "resend";
		
		if (this.provider === "resend" && process.env.RESEND_API_KEY) {
			this.resend = new Resend(process.env.RESEND_API_KEY);
			logger.info("Email service ready");
		} else {
			this.provider = "smtp";
			this.nodemailerTransport = this.buildNodemailerTransport();
			logger.info("Email service ready");
		}
	}

	// ── Nodemailer transport factory ─────────────────────────────────────────
	private buildNodemailerTransport(): nodemailer.Transporter {
		const user = env.SMTP_USER || env.MAIL_USER;
		const pass = env.SMTP_PASS || env.MAIL_PASS;

		if (env.MAIL_MODE === "gmail" || env.SMTP_HOST === "smtp.gmail.com") {
			return nodemailer.createTransport({
				service: "gmail",
				auth: {
					user,
					pass,
				},
				connectionTimeout: 8000,
				greetingTimeout: 8000,
				socketTimeout: 10000,
			});
		}

		return nodemailer.createTransport({
			host: env.SMTP_HOST || "smtp.gmail.com",
			port: env.SMTP_PORT || 465,
			secure: env.SMTP_SECURE,
			auth: {
				user,
				pass,
			},
			connectionTimeout: 8000,
			greetingTimeout: 8000,
			socketTimeout: 10000,
			tls: { rejectUnauthorized: false },
		});
	}

	// ── Connection verification ──────────────────────────────────────────────
	public async verifyConnection(): Promise<boolean> {
		if (this.provider === "resend") {
			return true;
		}

		try {
			if (!this.nodemailerTransport) {
				this.nodemailerTransport = this.buildNodemailerTransport();
			}
			await Promise.race([
				this.nodemailerTransport.verify(),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("SMTP verification timeout")), 6000),
				),
			]);
			return true;
		} catch (err: any) {
			logger.warn("Email service connection check failed");
			return false;
		}
	}

	// ── Template builder (delegates to EmailTemplateBuilder) ─────────────────
	public buildTemplate(options: EmailTemplateOptions): string {
		return EmailTemplateBuilder.build(options);
	}

	// ── Core send method ──────────────────────────────────────────────────────
	public async sendEmail(options: SendEmailOptions): Promise<SendResult> {
		const fromName = env.MAIL_FROM_NAME || "ManMadhan Progress";
		const fromUser = env.SMTP_USER || env.MAIL_USER || env.MAIL_FROM_ADDRESS;
		const fromAddress = `"${fromName}" <${fromUser}>`;

		const cleanSubject = options.subject
			.replace(/BullMQ/gi, "System")
			.replace(/Async task with auto-cleanup/gi, "Task Update");

		const finalHtml = options.html?.includes("<html")
			? options.html
			: this.buildTemplate({
					...options,
					title: options.title || cleanSubject,
					descriptions: options.html ? [options.html] : options.text ? [options.text] : [],
				});

		// ── Direct execution for configured provider ──────────────────────────
		if (this.provider === "resend" && this.resend) {
			try {
				const { data, error } = await this.resend.emails.send({
					from: fromAddress,
					to: [options.to],
					subject: cleanSubject,
					html: finalHtml,
					text: options.text,
				});

				if (!error && data?.id) {
					logger.info("Email dispatched");
					return { success: true, messageId: data.id };
				}

				logger.error("Email delivery failed");
				return { success: false, error: error?.message || "Resend email delivery failed" };
			} catch (resendErr: any) {
				logger.error("Email delivery failed");
				return { success: false, error: resendErr.message };
			}
		}

		// ── Gmail SMTP Execution ──────────────────────────────────────────────
		try {
			if (!this.nodemailerTransport) {
				this.nodemailerTransport = this.buildNodemailerTransport();
			}

			const info: any = await Promise.race([
				this.nodemailerTransport.sendMail({
					from: fromAddress,
					to: options.to,
					subject: cleanSubject,
					text: options.text,
					html: finalHtml,
				}),
				new Promise<never>((_, reject) =>
					setTimeout(
						() => reject(new Error("Gmail SMTP dispatch timed out after 8000ms")),
						8000,
					),
				),
			]);

			logger.info("Email dispatched");
			return { success: true, messageId: info.messageId };
		} catch (err: any) {
			logger.error("Email delivery failed");
			return {
				success: false,
				error: "We couldn't send the verification code. Please try again.",
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
