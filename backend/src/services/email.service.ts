import nodemailer from "nodemailer";
import path from "path";
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
			tls: {
				rejectUnauthorized: false,
			},
		});
	}

	public async verifyConnection(): Promise<boolean> {
		try {
			await this.transporter.verify();
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

			const info = await this.transporter.sendMail({
				from: `"${fromName}" <${fromAddress}>`,
				to: options.to,
				subject: cleanSubject,
				text: options.text,
				html: finalHtml,
			});

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
}

export const emailService = new EmailService();
