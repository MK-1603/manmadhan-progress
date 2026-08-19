import { and, eq, or } from "drizzle-orm";
import { db } from "../../database/client";
import {
	centralRequests,
	users,
	workspaceMembers,
} from "../../database/schema";
import { logger } from "./logger.service";
import { OrganizationScheduleService } from "./organization-schedule.service";

export interface ApprovalAuthorityChain {
	requesterId: string;
	responsibleId: string;
	accountableId: string;
	approverId: string;
}

export class ApprovalAuthorityService {
	/**
	 * Determine Responsibility Chain using organization hierarchy:
	 * Requester → Responsible → Accountable → Approver
	 */
	public static async determineAuthorityChain(
		workspaceId: string,
		requesterId: string,
		requestType: string
	): Promise<ApprovalAuthorityChain> {
		// Get requester role in workspace
		const member = await db.query.workspaceMembers.findFirst({
			where: and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.userId, requesterId)
			),
		});

		const requesterRole = (member?.role || "MEMBER").toUpperCase();

		// Find CEO for workspace
		const ceoMember = await db.query.workspaceMembers.findFirst({
			where: and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.role, "CEO")
			),
		});

		// Find CO-CEO for workspace
		const coCeoMember = await db.query.workspaceMembers.findFirst({
			where: and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.role, "CO-CEO")
			),
		});

		const ceoUserId = ceoMember?.userId || requesterId;
		const coCeoUserId = coCeoMember?.userId || ceoUserId;

		let responsibleId = requesterId;
		let accountableId = coCeoUserId;
		let approverId = coCeoUserId;

		if (requesterRole === "CEO" || requesterRole === "SYSTEM_OWNER") {
			responsibleId = requesterId;
			accountableId = requesterId;
			approverId = requesterId;
		} else if (requesterRole === "CO-CEO" || requesterRole === "ADMIN") {
			responsibleId = requesterId;
			accountableId = ceoUserId;
			approverId = ceoUserId;
		} else {
			// MEMBER
			responsibleId = requesterId;
			accountableId = coCeoUserId;
			approverId = coCeoUserId;
		}

		return {
			requesterId,
			responsibleId,
			accountableId,
			approverId,
		};
	}

	/**
	 * Check if a user has authority to decide on an approval request
	 */
	public static canApprove(
		userId: string,
		userRole: string,
		request: any
	): { canApprove: boolean; reason?: string } {
		const normalizedRole = (userRole || "").toUpperCase();

		// CEO always has organization-wide approval authority
		if (normalizedRole === "CEO" || normalizedRole === "SYSTEM_OWNER") {
			return { canApprove: true };
		}

		// Assigned approver or accountable authority
		if (request.approverId === userId || request.accountableId === userId) {
			return { canApprove: true };
		}

		// CO-CEO can approve if in CO-CEO role and request is assigned/unassigned
		if ((normalizedRole === "CO-CEO" || normalizedRole === "ADMIN") && (!request.approverId || request.approverId === userId)) {
			return { canApprove: true };
		}

		return {
			canApprove: false,
			reason: "You do not have administrative authority to approve this request.",
		};
	}

	/**
	 * Validate decision constraints including working hours enforcement
	 */
	public static async validateDecision(
		workspaceId: string,
		userId: string,
		userRole: string,
		request: any,
		decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED"
	): Promise<void> {
		// 1. Check Working Hours Policy
		const scheduleCheck = await OrganizationScheduleService.isActionAllowed(
			workspaceId,
			userRole,
			"approvals"
		);

		if (!scheduleCheck.allowed) {
			throw new Error(scheduleCheck.reason || "Approval actions are restricted outside operational working hours.");
		}

		// 2. Check Permission
		const perm = this.canApprove(userId, userRole, request);
		if (!perm.canApprove) {
			throw new Error(perm.reason || "Unauthorized approval decision attempt.");
		}

		// 3. Check State Transitions
		const currentStatus = (request.status || "").toUpperCase();
		if (currentStatus === "APPROVED" || currentStatus === "REJECTED" || currentStatus === "CANCELLED" || currentStatus === "EXPIRED") {
			throw new Error(`Cannot process decision: Request is already finalized with status '${request.status}'.`);
		}
	}
}
