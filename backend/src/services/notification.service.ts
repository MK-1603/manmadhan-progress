import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import webPush from "web-push";
import { env } from "../../config/env.config";
import { db } from "../../database/client";
import { notifications, pushSubscriptions, users } from "../../database/schema";
import { AppEvents } from "../constants/email-templates";
import { queueService } from "./queue.service";

if (env.VAPID_SUBJECT && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
	try {
		webPush.setVapidDetails(
			env.VAPID_SUBJECT,
			env.VAPID_PUBLIC_KEY,
			env.VAPID_PRIVATE_KEY,
		);
	} catch (e) {
		console.warn("[WebPush] Failed to initialize VAPID details:", e);
	}
}

export interface DispatchOptions {
	type: keyof typeof AppEvents;
	userId?: string;
	workspaceId?: string;
	data: any;
	clientUrl: string;
	emailOnly?: boolean;
}

export class NotificationService {
	/**
	 * Dispatches an event: writes to Activity Feed (DB) and queues Email
	 */
	static async dispatch(options: DispatchOptions): Promise<void> {
		const template = AppEvents[options.type];
		if (!template) {
			console.warn(`[NotificationService] Unknown event type: ${options.type}`);
			return;
		}

		const title = template.titleTemplate(options.data);
		const bodyText = template.bodyTemplate(options.data).join(" ");

		// 1. Create In-App Notification Record (if not emailOnly)
		let notifId: string | undefined;
		if (!options.emailOnly && options.userId) {
			notifId = randomUUID();
			await db.insert(notifications).values({
				id: notifId,
				userId: options.userId,
				workspaceId: options.workspaceId,
				title: title,
				message: bodyText,
				type: options.type,
				priority: template.mode === "alert" ? "High" : "Low",
			});
		}

		// 2. Queue Email Job
		let targetEmail = options.data.email;
		if (!targetEmail && options.userId) {
			const userRecords = await db.query.users.findFirst({
				where: eq(users.id, options.userId),
			});
			targetEmail = userRecords?.email;
		}

		if (targetEmail) {
			const emailHtmlBody = template
				.bodyTemplate(options.data)
				.map((p) => `<p>${p}</p>`)
				.join("");

			let actionUrl = template.getDefaultActionUrl
				? template.getDefaultActionUrl(options.data, options.clientUrl)
				: undefined;
			// Data might override actionUrl
			if (options.data.actionUrl) actionUrl = options.data.actionUrl;

			await queueService.addEmailJob({
				to: targetEmail,
				subject: template.subjectTemplate(options.data),
				title: title,
				html: emailHtmlBody, // The builder will wrap this in descriptions[] basically, wait the builder expects `descriptions` not `html`.
				// Let's pass descriptions array directly
				descriptions: template.bodyTemplate(options.data),
				actionText: template.actionText,
				actionUrl: actionUrl,
				mode: template.mode,
				icon: template.icon,
				requestDetails: options.data.requestDetails,
				securityNotice: options.data.securityNotice,
			});
		}

		// 3. Trigger Web Push Notification
		if (!options.emailOnly && options.userId) {
			try {
				const subscriptions = await db.query.pushSubscriptions.findMany({
					where: (subs, { eq, and }) =>
						and(
							eq(subs.userId, options.userId as string),
							eq(subs.isActive, true),
						),
				});

				const pushPayload = JSON.stringify({
					title,
					body: bodyText,
					icon: "/icon.png",
					url: options.clientUrl || "/",
				});

				const pushPromises = subscriptions.map((sub) =>
					webPush
						.sendNotification(
							{
								endpoint: sub.endpoint,
								keys: { p256dh: sub.p256dh, auth: sub.auth },
							},
							pushPayload,
						)
						.catch(async (e) => {
							if (e.statusCode === 410 || e.statusCode === 404) {
								await db
									.update(pushSubscriptions)
									.set({ isActive: false })
									.where(eq(pushSubscriptions.id, sub.id));
							}
							console.error("[WebPush] Failed to send push:", e);
						}),
				);
				await Promise.allSettled(pushPromises);
			} catch (err) {
				console.error(
					"[WebPush] Error fetching subscriptions or sending:",
					err,
				);
			}
		}

		// 4. (Future) Trigger WebSocket Event
		// socketService.emitToUser(options.userId, "new_notification", { id: notifId, title, message: bodyText });
	}
}
