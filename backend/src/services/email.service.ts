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
	private usingResend = false;

	constructor() {
		if (process.env.RESEND_API_KEY) {
			this.resend = new Resend(process.env.RESEND_API_KEY);
			this.usingResend = true;
			logger.info("EmailService: using Resend HTTPS transport");
		} else {
			this.nodemailerTransport = this.buildNodemailerTransport();
			logger.info(
				`EmailService: using Nodemailer ${env.MAIL_MODE === "gmail" ? "Gmail" : "SMTP"} transport`,
			);
		}
	}

	// ── Nodemailer transport factory ─────────────────────────────────────────
	private buildNodemailerTransport(): nodemailer.Transporter {
		if (env.MAIL_MODE === "gmail") {
			return nodemailer.createTransport({
				service: "gmail",
				auth: {
					user: env.MAIL_USER,
					pass: env.MAIL_PASS,
				},
				connectionTimeout: 8000,
				greetingTimeout: 8000,
				socketTimeout: 10000,
			});
		}

		return nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_SECURE,
			auth: {
				user: env.SMTP_USER,
				pass: env.SMTP_PASS,
			},
			connectionTimeout: 8000,
			greetingTimeout: 8000,
			socketTimeout: 10000,
			tls: { rejectUnauthorized: false },
		});
	}

	// ── Connection verification (no-op for Resend) ───────────────────────────
	public async verifyConnection(): Promise<boolean> {
		if (this.usingResend) {
			logger.trace("EmailService: Resend transport active — no SMTP verify needed");
			return true;
		}
		try {
			await Promise.race([
				this.nodemailerTransport!.verify(),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("SMTP verify timeout")), 6000),
				),
			]);
			logger.trace("EmailService: Nodemailer SMTP connection verified");
			return true;
		} catch (err: any) {
			logger.debug(
				`EmailService: SMTP connection check pending (${err.code ?? err.message})`,
			);
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
		const fromAddress = env.MAIL_FROM_ADDRESS || env.MAIL_USER;

		const cleanSubject = options.subject
			.replace(/BullMQ/gi, "System")
			.replace(/Async task with auto-cleanup/gi, "Task Update");

		const bodyText = options.text || options.subject;
		const formattedBody = options.html
			? options.html
			: `<p style="margin:0;">${bodyText.replace(/\n/g, "<br/>")}</p>`;

		const finalHtml = options.html?.includes("<html")
			? options.html
			: this.buildTemplate({
					title: options.title || cleanSubject,
					descriptions: [formattedBody],
					actionUrl: options.actionUrl,
					actionText: options.actionText,
				});

		// ── Resend path ────────────────────────────────────────────────────
		if (this.usingResend && this.resend) {
			try {
				const { data, error } = await this.resend.emails.send({
					from: `${fromName} <${fromAddress}>`,
					to: [options.to],
					subject: cleanSubject,
					html: finalHtml,
					text: options.text,
				});

				if (error) {
					logger.error(
						{ error: error.message, to: maskEmail(options.to) },
						"Resend email dispatch failed",
					);
					return { success: false, error: error.message };
				}

				logger.info(
					{ messageId: data?.id, to: maskEmail(options.to) },
					"Email dispatched via Resend",
				);
				return { success: true, messageId: data?.id };
			} catch (err: any) {
				logger.error(
					{ error: err.message, to: maskEmail(options.to) },
					"Resend email dispatch exception",
				);
				return { success: false, error: err.message };
			}
		}

		// ── Nodemailer path ────────────────────────────────────────────────
		try {
			const sendPromise = this.nodemailerTransport!.sendMail({
				from: `"${fromName}" <${fromAddress}>`,
				to: options.to,
				subject: cleanSubject,
				text: options.text,
				html: finalHtml,
			});

			const info: any = await Promise.race([
				sendPromise,
				new Promise<never>((_, reject) =>
					setTimeout(
						() => reject(new Error("Email dispatch timed out after 9000ms")),
						9000,
					),
				),
			]);

			logger.info(
				{ messageId: info.messageId, to: maskEmail(options.to) },
				"Email dispatched via Nodemailer",
			);
			return { success: true, messageId: info.messageId };
		} catch (err: any) {
			logger.error(
				{ error: err.message, to: maskEmail(options.to) },
				"Nodemailer email dispatch failed",
			);
			return { success: false, error: err.message };
		}
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
