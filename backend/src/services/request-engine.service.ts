import { randomUUID } from "node:crypto";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../../database/client";
import {
	centralRequests,
	projectAssignments,
	projectDocumentsV2,
	projectMilestonesV2,
	projects,
	tasks,
} from "../../database/schema";
import { NotificationService } from "./notification.service";

export interface CreateRequestOptions {
	workspaceId?: string;
	requestType:
		| "PROJECT_ASSIGNMENT"
		| "PROJECT_CHANGE"
		| "TASK_APPROVAL"
		| "TASK_CHANGE"
		| "DOCUMENT_REVIEW"
		| "DEADLINE_CHANGE"
		| "GITHUB_VERIFICATION"
		| "OTHER";
	title: string;
	description?: string;
	requesterId: string;
	approverId?: string;
	entityType?: "PROJECT" | "TASK" | "DOCUMENT" | "GITHUB";
	entityId?: string;
	metadata?: any;
}

export class RequestEngineService {
	/**
	 * Creates a new central approval request and dispatches notifications
	 */
	static async createRequest(options: CreateRequestOptions) {
		const requestId = randomUUID();

		const [newRequest] = await db
			.insert(centralRequests)
			.values({
				id: requestId,
				workspaceId: options.workspaceId,
				requestType: options.requestType,
				title: options.title,
				description: options.description,
				requesterId: options.requesterId,
				approverId: options.approverId,
				status: "PENDING",
				entityType: options.entityType,
				entityId: options.entityId,
				metadata: options.metadata || {},
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		// Notify Approver via In-App Notification & Email
		if (options.approverId) {
			await NotificationService.dispatch({
				type: "TASK_ASSIGNED", // System event
				userId: options.approverId,
				workspaceId: options.workspaceId,
				clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
				data: {
					title: `Action Required: ${options.title}`,
					requestDetails:
						options.description || "You have a pending approval request.",
					actionUrl: `/organization/requests`,
				},
			});
		}

		return newRequest;
	}

	/**
	 * Processes an approval decision (APPROVED, CHANGES_REQUESTED, REJECTED)
	 */
	static async processDecision(
		requestId: string,
		approverId: string,
		decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
		reason?: string,
		workspaceId?: string,
		approverRole?: string,
	) {
		const [req] = await db
			.select()
			.from(centralRequests)
			.where(
				workspaceId
					? and(
							eq(centralRequests.id, requestId),
							eq(centralRequests.workspaceId, workspaceId),
						)
					: eq(centralRequests.id, requestId),
			);
		if (!req) {
			throw new Error("Approval request not found");
		}

		if (req.status === "APPROVED" || req.status === "REJECTED") {
			throw new Error(
				`Request has already been processed with status: ${req.status}`,
			);
		}
		if (approverRole !== "CEO" && req.approverId !== approverId) {
			throw new Error("You are not the assigned approver for this request");
		}

		// Update Request Record
		const [updatedRequest] = await db
			.update(centralRequests)
			.set({
				status: decision,
				rejectionReason: reason || null,
				updatedAt: new Date(),
			})
			.where(eq(centralRequests.id, requestId))
			.returning();

		// Execute Specific Side Effects Based on Request Type
		if (req.requestType === "PROJECT_ASSIGNMENT" && req.entityId) {
			await db
				.update(projectAssignments)
				.set({
					status:
						decision === "APPROVED"
							? "ACCEPTED"
							: decision === "CHANGES_REQUESTED"
								? "REVISION_REQUESTED"
								: "REJECTED",
					rejectionReason: reason || null,
					acceptedAt: decision === "APPROVED" ? new Date() : null,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(projectAssignments.projectId, req.entityId),
						eq(
							projectAssignments.workspaceId,
							req.workspaceId || workspaceId || "",
						),
					),
				);

			// If approved, set project status to Planning / Active and unlock Stage 1 Activation
			if (decision === "APPROVED") {
				await db
					.update(projects)
					.set({ status: "PLANNING" })
					.where(
						and(
							eq(projects.id, req.entityId),
							eq(projects.workspaceId, req.workspaceId || workspaceId || ""),
						),
					);
				await db
					.update(projectMilestonesV2)
					.set({ state: "AVAILABLE" })
					.where(
						and(
							eq(projectMilestonesV2.projectId, req.entityId),
							eq(projectMilestonesV2.stageNumber, 1),
						),
					);
			}
		} else if (req.requestType === "DOCUMENT_REVIEW" && req.entityId) {
			const [doc] = await db
				.select()
				.from(projectDocumentsV2)
				.where(eq(projectDocumentsV2.id, req.entityId));
			if (doc) {
				await db
					.update(projectDocumentsV2)
					.set({
						status: decision,
						updatedAt: new Date(),
					})
					.where(eq(projectDocumentsV2.id, req.entityId));

				// Update corresponding milestone state
				if (decision === "APPROVED") {
					await db
						.update(projectMilestonesV2)
						.set({ state: "APPROVED", approvedAt: new Date() })
						.where(eq(projectMilestonesV2.id, doc.milestoneId as string));

					// Unlock Next Stage
					const nextStage = doc.stageNumber + 1;
					if (nextStage <= 7) {
						await db
							.update(projectMilestonesV2)
							.set({ state: "AVAILABLE" })
							.where(
								and(
									eq(projectMilestonesV2.projectId, doc.projectId),
									eq(projectMilestonesV2.stageNumber, nextStage),
								),
							);
					}
				} else {
					await db
						.update(projectMilestonesV2)
						.set({ state: decision })
						.where(eq(projectMilestonesV2.id, doc.milestoneId as string));
				}
			}
		} else if (req.requestType === "TASK_APPROVAL" && req.entityId) {
			await db
				.update(tasks)
				.set({
					status: decision === "APPROVED" ? "COMPLETED" : "In Progress",
					approvedAt: decision === "APPROVED" ? new Date() : null,
					rejectionFeedback: reason || null,
				})
				.where(
					and(
						eq(tasks.id, req.entityId),
						eq(tasks.workspaceId, req.workspaceId || workspaceId || ""),
					),
				);
		}

		// Dispatch notification to original requester
		await NotificationService.dispatch({
			type: "TASK_ASSIGNED",
			userId: req.requesterId,
			workspaceId: req.workspaceId || undefined,
			clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
			data: {
				title: `Request ${decision}: ${req.title}`,
				requestDetails: reason
					? `Feedback: ${reason}`
					: `Your request has been ${decision.toLowerCase()}.`,
				actionUrl: `/organization/requests`,
			},
		});

		return updatedRequest;
	}

	/**
	 * Lists pending approval requests for a given user & role
	 */
	static async getRequestsForUser(
		userId: string,
		role: string,
		workspaceId?: string,
	) {
		if (role === "CEO") {
			// CEO sees all requests in workspace
			return db
				.select()
				.from(centralRequests)
				.where(eq(centralRequests.workspaceId, workspaceId || ""))
				.orderBy(desc(centralRequests.createdAt));
		}

		// Non-CEO users see only requests they submitted or are assigned to approve.
		return db
			.select()
			.from(centralRequests)
			.where(
				and(
					eq(centralRequests.workspaceId, workspaceId || ""),
					or(
						eq(centralRequests.approverId, userId),
						eq(centralRequests.requesterId, userId),
					),
				),
			)
			.orderBy(desc(centralRequests.createdAt));
	}
}
