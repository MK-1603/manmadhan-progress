import { env } from "../../config/env.config";
import { buildInviteUrl, buildClientUrl } from "../utils/url.utils";
import { maskEmail } from "../utils/string.utils";
import {
	EmailTemplateBuilder,
	type EmailTemplateOptions,
} from "./emails/template.builder";
import { logger } from "./logger.service";

export type EmailErrorCode =
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
	public getHealthStatus() {
		return {
			provider: "internal-dispatch",
			status: "operational",
		};
	}

	// ── Template builder (delegates to EmailTemplateBuilder) ─────────────────
	public buildTemplate(options: EmailTemplateOptions): string {
		return EmailTemplateBuilder.build(options);
	}

	// ── Core send method ──────────────────────────────────────────────────────
	public async sendEmail(options: SendEmailOptions): Promise<SendResult> {
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
			logger.error(
				{ error: templateErr?.message, to: maskEmail(options.to) },
				"[EMAIL] Email template generation failed",
			);
			return { success: false, error: "Failed to render email template", errorCode: "EMAIL_TEMPLATE_ERROR" };
		}

		// Log simulated/mock email dispatch for internal auditing
		logger.info(
			{
				to: maskEmail(options.to),
				subject: cleanSubject,
				actionUrl: options.actionUrl || undefined,
				userName: options.userName || undefined,
			},
			`[EMAIL DISPATCH] Email to ${maskEmail(options.to)}: "${cleanSubject}"`,
		);

		return {
			success: true,
			messageId: `simulated-dispatch-${Date.now()}`,
			accepted: [options.to],
			rejected: [],
		};
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
