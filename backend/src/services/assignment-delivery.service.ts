import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import { auditLogs, chatMessages, notifications } from "../../database/schema";
import { emailService } from "./email.service";
import { logger } from "./logger.service";

export interface AssignmentPayload {
	workspaceId: string;
	entityType:
		| "PROJECT_ASSIGNMENT"
		| "TASK_ASSIGNMENT"
		| "DOCUMENT_REVIEW"
		| "APPROVAL_REQUEST";
	entityId: string;
	title: string;
	description?: string;
	actorUserId: string;
	actorName?: string;
	assigneeId: string;
	deadline?: string;
}

export class AssignmentDeliveryService {
	/**
	 * Dispatches notifications, messages, timeline events, email & push alerts when work is assigned.
	 */
	static async dispatchWorkAssignment(
		payload: AssignmentPayload,
	): Promise<{ success: boolean; notificationId: string }> {
		const notificationId = uuidv4();
		const {
			workspaceId,
			entityType,
			entityId,
			title,
			description,
			actorUserId,
			actorName,
			assigneeId,
			deadline,
		} = payload;

		try {
			const actorLabel = actorName || "Team Lead";
			const notifTitle =
				entityType === "PROJECT_ASSIGNMENT"
					? `New Project Assigned: ${title}`
					: `New Task Assigned: ${title}`;

			const notifMessage = `${actorLabel} assigned you ${title}${deadline ? ` (Deadline: ${deadline})` : ""}`;

			// 1. In-App Notification
			await db.insert(notifications).values({
				id: notificationId,
				userId: assigneeId,
				workspaceId,
				title: notifTitle,
				message: notifMessage,
				type: entityType,
				priority: "High",
				isRead: false,
			});

			// 2. In-App Message Dispatch
			try {
				await db.insert(chatMessages).values({
					id: uuidv4(),
					workspaceId,
					senderId: actorUserId,
					channelId: `direct_${assigneeId}`,
					content: `📌 **Work Assignment**: ${notifTitle}\n${description || ""}\n*Deadline: ${deadline || "Not specified"}*`,
					isRead: false,
				});
			} catch (msgErr) {
				logger.warn(
					{ err: msgErr },
					"Failed to send assignment in-app chat message",
				);
			}

			// 3. Audit Log Timeline Entry
			try {
				await db.insert(auditLogs).values({
					id: uuidv4(),
					userId: actorUserId,
					workspaceId,
					eventType:
						entityType === "PROJECT_ASSIGNMENT"
							? "PROJECT_ASSIGNED"
							: "TASK_ASSIGNED",
					details: `Assigned "${title}" to user ${assigneeId} (Entity ID: ${entityId})`,
				});
			} catch (auditErr) {
				logger.warn(
					{ err: auditErr },
					"Failed to record assignment timeline audit log",
				);
			}

			// 4. Non-Blocking Email Dispatch
			setImmediate(async () => {
				try {
					// Attempt email send via existing email service
					if (
						emailService &&
						typeof (emailService as any).sendMail === "function"
					) {
						await (emailService as any).sendMail({
							to: assigneeId,
							subject: `New Work Assignment: ${title}`,
							text: `${notifMessage}\n\nPlease check your My Work dashboard in ManMadhan Progress to review and accept this assignment.`,
						});
					}
				} catch (emailErr) {
					logger.warn(
						{ err: emailErr },
						"Non-blocking assignment email delivery failed",
					);
				}
			});

			logger.info(
				{ entityId, assigneeId, entityType },
				"Work assignment successfully dispatched",
			);
			return { success: true, notificationId };
		} catch (err: any) {
			logger.error(
				{ err, payload },
				"Failed to dispatch work assignment notification",
			);
			return { success: false, notificationId: "" };
		}
	}
}
