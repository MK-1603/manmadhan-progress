import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import { activities, auditLogs, tasks } from "../../database/schema";
import { logger } from "./logger.service";
import { socketService } from "./socket.service";

export class TaskAutomationService {
	/**
	 * Automatically generate mandatory Foundation Requirements tasks for a new project.
	 */
	static async generateFoundationTasks(
		projectId: string,
		ownerId: string,
		workspaceId: string,
		projectName: string,
	) {
		try {
			// Check idempotency: avoid generating duplicate foundation tasks
			const existing = await db
				.select()
				.from(tasks)
				.where(
					and(
						eq(tasks.projectId, projectId),
						eq(tasks.workspaceId, workspaceId),
						eq(tasks.sourceType, "REQUIREMENTS"),
					),
				);

			if (existing.length > 0) {
				logger.info(`Foundation tasks already exist for project ${projectId}`);
				return existing;
			}

			const foundationTasksData = [
				{
					title: `Prepare PRD for "${projectName}"`,
					description:
						"Define product goals, target user personas, functional requirements, and acceptance criteria.",
					priority: "High",
					type: "Documentation",
					estimatedMinutes: 180, // 3 hours
				},
				{
					title: `Prepare Technical Architecture (TRD) for "${projectName}"`,
					description:
						"Specify tech stack, database schemas, API contracts, and infrastructure requirements.",
					priority: "High",
					type: "Documentation",
					estimatedMinutes: 240, // 4 hours
				},
				{
					title: `Define End-to-End Application Workflow for "${projectName}"`,
					description:
						"Map complete user flow from frontend input to backend processing and database persistence.",
					priority: "Medium",
					type: "Research",
					estimatedMinutes: 120, // 2 hours
				},
				{
					title: `Link GitHub Repository & Setup CI/CD for "${projectName}"`,
					description:
						"Connect production repository URL and verify automated build pipelines.",
					priority: "Medium",
					type: "Development",
					estimatedMinutes: 60, // 1 hour
				},
				{
					title: `Prepare User Manual & Documentation Structure for "${projectName}"`,
					description:
						"Outline user guide detailing access, workflows, and major actions.",
					priority: "Low",
					type: "Documentation",
					estimatedMinutes: 90, // 1.5 hours
				},
			];

			const createdTasks: any[] = [];
			const now = new Date();
			const defaultDeadline = new Date(now.getTime() + 7 * 24 * 3600 * 1000); // 7 days default

			for (let i = 0; i < foundationTasksData.length; i++) {
				const tData = foundationTasksData[i];
				const [t] = await db
					.insert(tasks)
					.values({
						id: uuidv4(),
						workspaceId,
						projectId,
						assigneeId: ownerId,
						title: tData.title,
						description: tData.description,
						priority: tData.priority,
						type: tData.type,
						status: i === 0 ? "In Progress" : "Draft",
						sourceType: "REQUIREMENTS",
						estimatedMinutes: tData.estimatedMinutes,
						deadline: defaultDeadline,
					})
					.returning();

				createdTasks.push(t);
			}

			await db.insert(auditLogs).values({
				id: uuidv4(),
				workspaceId,
				userId: ownerId,
				eventType: "TASK_AUTOMATION_TRIGGERED",
				details: `Automatically generated 5 foundation requirement tasks for project "${projectName}"`,
			});

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId,
				userId: ownerId,
				action: "Task Automation Active",
				details: `System automatically generated 5 requirement tasks for owner`,
			});

			socketService.emitToWorkspace(workspaceId, "tasks.automated", {
				projectId,
				count: createdTasks.length,
			});
			return createdTasks;
		} catch (err: any) {
			logger.error(
				"Foundation task automation error: " + (err?.message || String(err)),
			);
			return [];
		}
	}

	/**
	 * Automatically generate milestone phase tasks when a milestone is created or activated.
	 */
	static async generateMilestoneTasks(
		projectId: string,
		milestoneId: string,
		milestoneName: string,
		assigneeId: string,
		workspaceId: string,
	) {
		try {
			const existing = await db
				.select()
				.from(tasks)
				.where(
					and(
						eq(tasks.projectId, projectId),
						eq(tasks.sourceType, "MILESTONE"),
						eq(tasks.sourceId, milestoneId),
					),
				);

			if (existing.length > 0) return existing;

			const [msTask] = await db
				.insert(tasks)
				.values({
					id: uuidv4(),
					workspaceId,
					projectId,
					milestoneId,
					assigneeId,
					title: `Execute Milestone Phase: ${milestoneName}`,
					description: `Deliver core requirements and technical objectives defined for phase "${milestoneName}".`,
					priority: "High",
					type: "Development",
					status: "Draft",
					sourceType: "MILESTONE",
					sourceId: milestoneId,
					estimatedMinutes: 300,
				})
				.returning();

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId,
				userId: assigneeId,
				action: "Milestone Task Generated",
				details: `System automatically generated task for milestone "${milestoneName}"`,
			});

			return [msTask];
		} catch (err: any) {
			logger.error(
				"Milestone task automation error: " + (err?.message || String(err)),
			);
			return [];
		}
	}
}
