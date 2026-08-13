import nodemailer from "nodemailer";
import { env } from "../../config/env.config";
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

class EmailService {
	private transporter: nodemailer.Transporter;

	constructor() {
		this.transporter = this.buildTransporter();
	}

	private buildTransporter(): nodemailer.Transporter {
		if (env.MAIL_MODE === "gmail") {
			return nodemailer.createTransport({
				service: "gmail",
				auth: {
					user: env.MAIL_USER,
					pass: env.MAIL_PASS,
				},
				connectionTimeout: 5000,
				greetingTimeout: 5000,
				socketTimeout: 8000,
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
			connectionTimeout: 5000,
			greetingTimeout: 5000,
			socketTimeout: 8000,
			tls: {
				rejectUnauthorized: false,
			},
		});
	}

	public async verifyConnection(): Promise<boolean> {
		try {
			const _result = await Promise.race([
				this.transporter.verify(),
				new Promise((_, reject) =>
					setTimeout(
						() => reject(new Error("Connection verification timeout")),
						4000,
					),
				),
			]);
			logger.trace("Mail Transport connection verified successfully");
			return true;
		} catch (error: any) {
			const errorCode = error.code || error.errno || "ESOCKET";
			logger.debug(`Mail Transport connection check pending (${errorCode})`);
			return false;
		}
	}

	/**
	 * Generates the enterprise template using the dedicated builder
	 */
	public buildTemplate(options: EmailTemplateOptions): string {
		return EmailTemplateBuilder.build(options);
	}

	public async sendEmail(
		options: SendEmailOptions,
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			const fromName = env.MAIL_FROM_NAME || "ManMadhan Progress";
			const fromAddress = env.MAIL_FROM_ADDRESS || env.MAIL_USER;

			// Clean up internal tech names if present in subject
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

			const sendPromise = this.transporter.sendMail({
				from: `"${fromName}" <${fromAddress}>`,
				to: options.to,
				subject: cleanSubject,
				text: options.text,
				html: finalHtml,
			});

			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error("Email dispatch timed out after 6000ms")),
					6000,
				),
			);

			const info: any = await Promise.race([sendPromise, timeoutPromise]);

			logger.info(
				{ messageId: info.messageId, to: maskEmail(options.to) },
				"Email dispatched successfully with enterprise template",
			);
			return { success: true, messageId: info.messageId };
		} catch (error: any) {
			logger.error(
				{ error: error.message, to: maskEmail(options.to) },
				"Email dispatch failed",
			);
			return { success: false, error: error.message };
		}
	}

	public async sendInvitationEmail(
		to: string,
		token: string,
		role: string,
		inviterName: string = "A team member",
	): Promise<boolean> {
		const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
		const actionUrl = `${clientUrl}/invite/${token}`;
		logger.info(
			`[InvitationEmail] Sending invitation to ${to} (${role}) via link: ${actionUrl}`,
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
				`[InvitationEmail] Email send status: false for ${to}. Invitation token URL: ${actionUrl}`,
			);
		}

		return result.success;
	}

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
		const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
		const actionUrl = `${clientUrl}/ceo/my-work?taskId=${options.taskId}`;
		const projectText = options.projectName
			? options.projectName
			: "Standalone Task";
		const milestoneText = options.milestoneName
			? options.milestoneName
			: "No Milestone";

		const html = `
			<p style="margin:0 0 16px 0; font-size:15px; color:#3F3F46;">You have been assigned a new task by <strong>${options.assignerName}</strong> (Role: <strong>${options.role}</strong>).</p>
			<div style="background:#F4F4F5; padding:16px; border-radius:12px; margin-bottom:16px;">
				<p style="margin:0 0 8px 0; font-size:14px; font-weight:bold; color:#18181B;">Task: ${options.taskTitle}</p>
				<p style="margin:0 0 4px 0; font-size:13px; color:#52525B;"><strong>Project:</strong> ${projectText}</p>
				<p style="margin:0 0 4px 0; font-size:13px; color:#52525B;"><strong>Milestone:</strong> ${milestoneText}</p>
				<p style="margin:0 0 4px 0; font-size:13px; color:#52525B;"><strong>Deadline:</strong> ${options.deadline ? options.deadline : "Flexible"}</p>
				<p style="margin:0; font-size:13px; color:#D9A514;"><strong>Status:</strong> Pending Acceptance</p>
			</div>
			<p style="margin:0 0 16px 0; font-size:13px; color:#52525B;">Click below to review and accept or decline this task assignment in your My Work workspace.</p>
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

	public async sendProjectAssignmentEmail(options: {
		to: string;
		projectName: string;
		assignerName: string;
		role: string;
		deadline?: string | null;
		projectId: string;
	}): Promise<boolean> {
		const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
		const actionUrl = `${clientUrl}/co-ceo/my-work?projectId=${options.projectId}`;

		const html = `
			<p style="margin:0 0 16px 0; font-size:15px; color:#3F3F46;">You have been assigned as <strong>${options.role}</strong> for project <strong>${options.projectName}</strong> by <strong>${options.assignerName}</strong>.</p>
			<div style="background:#F4F4F5; padding:16px; border-radius:12px; margin-bottom:16px;">
				<p style="margin:0 0 8px 0; font-size:14px; font-weight:bold; color:#18181B;">Project: ${options.projectName}</p>
				<p style="margin:0 0 4px 0; font-size:13px; color:#52525B;"><strong>Role:</strong> ${options.role}</p>
				<p style="margin:0 0 4px 0; font-size:13px; color:#52525B;"><strong>Deadline:</strong> ${options.deadline ? options.deadline : "Flexible"}</p>
				<p style="margin:0; font-size:13px; color:#D9A514;"><strong>Status:</strong> Pending Acceptance</p>
			</div>
			<p style="margin:0 0 16px 0; font-size:13px; color:#52525B;">Click below to review and accept or decline this project assignment in your workspace.</p>
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
