import { and, desc, eq, gte, ne, or, sql } from "drizzle-orm";
import { db } from "../../database/client";
import {
	milestones,
	projectSubmissions,
	tasks,
	users,
	workspaceMembers,
} from "../../database/schema";

export type LeaderboardPeriod = "week" | "month" | "quarter" | "all";

export interface LeaderboardMember {
	id: string;
	userId: string;
	name: string;
	displayName: string;
	email: string;
	avatar: string | null;
	role: string;
	score: number;
	completedTasksCount: number;
	totalAssignedTasks: number;
	onTimeRate: number;
	rank: number;
}

export function getPeriodStartDate(period: LeaderboardPeriod, now: Date = new Date()): Date {
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);

	if (period === "week") {
		const day = start.getDay();
		start.setDate(start.getDate() - day);
	} else if (period === "month") {
		start.setDate(1);
	} else if (period === "quarter") {
		const currentMonth = start.getMonth();
		const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
		start.setMonth(quarterStartMonth, 1);
	} else if (period === "all") {
		return new Date(0);
	}

	return start;
}

export async function calculateWorkspaceLeaderboard(
	workspaceId: string,
	period: LeaderboardPeriod = "week",
	now: Date = new Date(),
): Promise<LeaderboardMember[]> {
	const startDate = getPeriodStartDate(period, now);

	// 1. Fetch all unique active workspace members (excluding deleted/suspended users)
	const members = await db
		.select({
			userId: users.id,
			name: users.name,
			displayName: users.displayName,
			email: users.email,
			avatar: users.avatar,
			role: workspaceMembers.role,
			status: users.status,
		})
		.from(workspaceMembers)
		.innerJoin(users, eq(workspaceMembers.userId, users.id))
		.where(
			and(
				eq(workspaceMembers.workspaceId, workspaceId),
				ne(workspaceMembers.role, "CEO"),
				ne(users.role, "CEO"),
				ne(users.status, "Suspended"),
				ne(users.status, "Deleted"),
			),
		);

	// Deduplicate by userId
	const memberMap = new Map<string, typeof members[0]>();
	for (const m of members) {
		if (!memberMap.has(m.userId)) {
			memberMap.set(m.userId, m);
		}
	}
	const uniqueMembers = Array.from(memberMap.values());

	if (uniqueMembers.length === 0) {
		return [];
	}

	// 2. Fetch workspace tasks in batch
	const workspaceTasks = await db
		.select({
			id: tasks.id,
			assigneeId: tasks.assigneeId,
			status: tasks.status,
			deadline: tasks.deadline,
			completedAt: tasks.completedAt,
			createdAt: tasks.createdAt,
		})
		.from(tasks)
		.where(eq(tasks.workspaceId, workspaceId));

	// 3. Fetch approved submissions in batch
	const approvedSubmissions = await db
		.select({
			submittedBy: projectSubmissions.submittedBy,
			reviewedAt: projectSubmissions.reviewedAt,
		})
		.from(projectSubmissions)
		.where(
			and(
				eq(projectSubmissions.workspaceId, workspaceId),
				eq(projectSubmissions.status, "Approved"),
			),
		);

	// 4. Fetch completed milestones in batch
	const completedMilestones = await db
		.select({
			ownerId: milestones.ownerId,
			completedAt: milestones.completedAt,
		})
		.from(milestones)
		.where(eq(milestones.status, "Completed"));

	// 5. Calculate scores per member
	const scoredMembers = uniqueMembers.map((m) => {
		const memberTasks = workspaceTasks.filter((t) => t.assigneeId === m.userId);

		// Completed tasks within period
		const completedTasks = memberTasks.filter((t) => {
			if (t.status !== "Completed" && t.status !== "Approved") return false;
			const taskCompletedAt = t.completedAt ? new Date(t.completedAt) : new Date(t.createdAt);
			return taskCompletedAt >= startDate;
		});

		// On-time completed tasks
		const onTimeTasks = completedTasks.filter((t) => {
			if (!t.deadline) return true;
			const compDate = t.completedAt ? new Date(t.completedAt) : new Date();
			return compDate.getTime() <= new Date(t.deadline).getTime();
		});

		// Overdue active tasks penalty
		const overdueTasks = memberTasks.filter((t) => {
			if (t.status === "Completed" || t.status === "Approved" || !t.deadline) return false;
			return new Date(t.deadline).getTime() < now.getTime();
		});

		// Approved submissions in period
		const memberSubmissions = approvedSubmissions.filter((s) => {
			if (s.submittedBy !== m.userId) return false;
			if (!s.reviewedAt) return true;
			return new Date(s.reviewedAt) >= startDate;
		});

		// Completed milestones in period
		const memberMilestones = completedMilestones.filter((ms) => {
			if (ms.ownerId !== m.userId) return false;
			if (!ms.completedAt) return true;
			return new Date(ms.completedAt) >= startDate;
		});

		// Scoring algorithm
		const taskPoints = completedTasks.length * 10;
		const onTimeBonus = onTimeTasks.length * 5;
		const submissionPoints = memberSubmissions.length * 15;
		const milestonePoints = memberMilestones.length * 20;
		const overduePenalty = overdueTasks.length * 5;

		const totalScore = Math.max(
			0,
			taskPoints + onTimeBonus + submissionPoints + milestonePoints - overduePenalty,
		);

		const totalAssigned = memberTasks.length;
		const completedCount = completedTasks.length;
		const onTimeRate =
			completedCount > 0 ? Math.round((onTimeTasks.length / completedCount) * 100) : 100;

		return {
			id: m.userId,
			userId: m.userId,
			name: m.displayName || m.name || m.email,
			displayName: m.displayName || m.name || m.email,
			email: m.email,
			avatar: m.avatar,
			role: m.role || "MEMBER",
			score: totalScore,
			completedTasksCount: completedCount,
			totalAssignedTasks: totalAssigned,
			onTimeRate,
			rank: 0,
		};
	});

	// 6. Sort deterministically
	scoredMembers.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		if (b.completedTasksCount !== a.completedTasksCount) {
			return b.completedTasksCount - a.completedTasksCount;
		}
		if (b.onTimeRate !== a.onTimeRate) return b.onTimeRate - a.onTimeRate;
		return a.userId.localeCompare(b.userId);
	});

	// Assign ranks
	return scoredMembers.map((member, index) => ({
		...member,
		rank: index + 1,
	}));
}
