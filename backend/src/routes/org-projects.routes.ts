import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	activities,
	auditLogs,
	centralRequests,
	milestones,
	notifications,
	projectAssignments,
	projectDocuments,
	projectDocumentsV2,
	projectFeatures,
	projectGithub,
	projectMilestonesV2,
	projectRequirements,
	projectRoadmaps,
	projects,
	scoreLedger,
	tasks,
	users,
	workspaceMembers,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { enforceNoSelfAssignment } from "../middleware/self-assignment.guard";
import { AssignmentDeliveryService } from "../services/assignment-delivery.service";
import { emailService } from "../services/email.service";
import { logger } from "../services/logger.service";
import { ProjectAnalyzerService } from "../services/project-analyzer.service";
import { ProjectPromptService } from "../services/project-prompt.service";
import { RequestEngineService } from "../services/request-engine.service";
import { socketService } from "../services/socket.service";
import { TaskAutomationService } from "../services/task-automation.service";

export const orgProjectsRouter = Router();
orgProjectsRouter.use(authenticate);

// ─── Middleware ───────────────────────────────────────────────────────────────
const resolveWorkspace = async (req: Request, res: Response, next: any) => {
	try {
		const userId = (req as any).user?.id;
		let workspaceId = String(
			req.query.workspaceId || req.body?.workspaceId || "",
		).trim();

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
			if (userId) {
				const [m] = await db
					.select()
					.from(workspaceMembers)
					.where(eq(workspaceMembers.userId, userId))
					.limit(1);
				if (m && m.workspaceId) {
					workspaceId = m.workspaceId;
					req.body.workspaceId = workspaceId;
					(req.query as any).workspaceId = workspaceId;
				}
			}
		}

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
			const [firstWs] = await db.select().from(projects).limit(1);
			if (firstWs && firstWs.workspaceId) {
				workspaceId = firstWs.workspaceId;
				req.body.workspaceId = workspaceId;
				(req.query as any).workspaceId = workspaceId;
			}
		}

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
			return res
				.status(400)
				.json({ success: false, error: "workspaceId is required" });
		}

		(req as any).workspaceId = workspaceId;
		next();
	} catch (err: any) {
		logger.error(
			"resolveWorkspace error: " + (err?.stack || err?.message || String(err)),
		);
		return res
			.status(500)
			.json({ success: false, error: "Failed to resolve workspace" });
	}
};

const requireMembership = async (req: Request, res: Response, next: any) => {
	try {
		const userId = (req as any).user?.id;
		const workspaceId = (req as any).workspaceId;

		if (!userId) {
			return res
				.status(401)
				.json({ success: false, error: "Authentication required" });
		}

		const [m] = await db
			.select()
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.userId, userId),
				),
			)
			.limit(1);

		if (!m) {
			// Fallback 1: any workspace membership for this user (invitation flow)
			const [anyMembership] = await db
				.select()
				.from(workspaceMembers)
				.where(eq(workspaceMembers.userId, userId))
				.limit(1);

			if (anyMembership) {
				logger.info(`[AUTH DEBUG] org-projects: userId=${userId} using fallback ws=${anyMembership.workspaceId} role=${anyMembership.role}`);
				(req as any).workspaceId = anyMembership.workspaceId;
				(req as any).membership = anyMembership;
				return next();
			}

			// Fallback 2: derive from token / users table
			const tokenRole = String((req as any).user?.role || "").toUpperCase();
			if (tokenRole === "CEO" || tokenRole === "CO-CEO" || tokenRole === "CO_CEO" || tokenRole === "ADMIN") {
				const normalizedRole = tokenRole === "CO-CEO" || tokenRole === "CO_CEO" ? "CO-CEO" : "CEO";
				(req as any).membership = { role: normalizedRole, workspaceId, userId };
				return next();
			}

			const [u] = await db
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);
			const dbRole = (u?.role || "MEMBER").toUpperCase();
			const normalizedRole = dbRole === "CEO" || u?.systemOwner ? "CEO"
				: dbRole === "CO-CEO" || dbRole === "CO_CEO" ? "CO-CEO"
				: "MEMBER";

			logger.info(`[AUTH DEBUG] org-projects: userId=${userId} no ws record — DB role=${normalizedRole}`);
			(req as any).membership = { role: normalizedRole, workspaceId, userId };
			return next();
		}

		(req as any).membership = m;
		next();
	} catch (err: any) {
		logger.error(
			"requireMembership error: " + (err?.stack || err?.message || String(err)),
		);
		return res
			.status(500)
			.json({ success: false, error: "Membership verification error" });
	}
};

const requireLeadership = async (req: Request, res: Response, next: any) => {
	const membership = (req as any).membership;
	const role = (membership?.role || "").toUpperCase();
	if (role === "CEO" || role === "CO-CEO" || role === "ADMIN") {
		return next();
	}
	return res
		.status(403)
		.json({ success: false, error: "Leadership authorization required" });
};

function inferPriority(prompt: string): string {
	if (/critical|urgent|asap/i.test(prompt)) return "CRITICAL";
	if (/high priority|important|soon/i.test(prompt)) return "High";
	if (/low priority|whenever|flexible/i.test(prompt)) return "Low";
	return "Medium";
}

// ─── AI Project Plan from Prompt (Generates Structured Review Mandate) ───────
orgProjectsRouter.post(
	"/plan-from-prompt",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const { prompt } = req.body;
			const workspaceId = (req as any).workspaceId;
			if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
				return res
					.status(400)
					.json({ success: false, error: "Prompt is required" });
			}

			const plan = await ProjectPromptService.generatePlanFromPrompt(
				prompt.trim(),
				"ORGANIZATION",
			);

			// Fetch workspace members for assignment dropdown
			const members = await db
				.select({
					id: users.id,
					name: users.displayName,
					role: workspaceMembers.role,
				})
				.from(workspaceMembers)
				.innerJoin(users, eq(workspaceMembers.userId, users.id))
				.where(eq(workspaceMembers.workspaceId, workspaceId));

			res.json({
				success: true,
				data: {
					...plan,
					assignmentOptions: members.map((m) => ({
						id: m.id,
						name: m.name || "Team Member",
						role: m.role,
					})),
				},
			});
		} catch (err: any) {
			logger.error("Plan from prompt error: " + (err?.message || String(err)));
			res
				.status(500)
				.json({
					success: false,
					error: "Failed to generate project plan from prompt",
				});
		}
	},
);

// ─── Analyze Project Prompt (V2 Execution OS) ──────────────────────────────────
orgProjectsRouter.post(
	"/analyze",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const { prompt } = req.body;
			if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
				return res.status(400).json({ success: false, error: "Project prompt is required" });
			}

			const analysis = await ProjectAnalyzerService.analyzePrompt(prompt.trim());
			res.json({ success: true, data: analysis });
		} catch (err: any) {
			logger.error("Analyze project error: " + (err?.message || String(err)));
			res.status(500).json({ success: false, error: err.message || "Failed to analyze project prompt" });
		}
	},
);

// ─── Create Organization Project V2 (7-Stage Execution & Assignment Flow) ─────
orgProjectsRouter.post(
	"/create-v2",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	enforceNoSelfAssignment,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const userRole = (req as any).workspaceRole || "MEMBER";

			const {
				title,
				description,
				deadline,
				assignedToUserId,
				assignmentType = "CEO_TO_CO_CEO",
				responsibleCoCeoId,
				prompt,
				analysisData,
			} = req.body;

			if (!title || !title.trim()) {
				return res.status(400).json({ success: false, error: "Project title is required" });
			}

			if (!assignedToUserId) {
				return res.status(400).json({ success: false, error: "Assigned user is required" });
			}

			// Validate CEO -> Member assignment rules
			if (userRole === "CEO" && assignmentType === "CEO_TO_MEMBER") {
				if (!responsibleCoCeoId) {
					return res.status(400).json({
						success: false,
						error: "Responsible CO-CEO is mandatory when assigning a project directly to a Member.",
					});
				}
			}

			const projectId = uuidv4();
			const projectDeadline = deadline ? new Date(deadline) : null;

			// 1. Create Core Project Record
			const [newProject] = await db
				.insert(projects)
				.values({
					id: projectId,
					workspaceId,
					name: title.trim(),
					description: description || prompt || null,
					objective: prompt || null,
					status: "PLANNING",
					priority: "Medium",
					progress: 0,
					health: "HEALTHY",
					ownerId: assignedToUserId,
					createdBy: userId,
					deadline: projectDeadline,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			// 2. Create Project Assignment Record
			const assignmentId = uuidv4();
			const coCeoVal = (typeof responsibleCoCeoId === "string" && responsibleCoCeoId.trim().length > 0) ? responsibleCoCeoId.trim() : assignedToUserId;
			await db.insert(projectAssignments).values({
				id: assignmentId,
				projectId,
				workspaceId,
				createdByUserId: userId,
				assignedToUserId,
				responsibleCoCeoId: coCeoVal,
				assignmentType: assignmentType || "CEO_TO_CO_CEO",
				status: "PENDING_ACCEPTANCE",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			// Dispatch Notification & Email to Assignee
			try {
				const [assigneeUser] = await db.select().from(users).where(eq(users.id, assignedToUserId)).limit(1);
				const [creatorUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
				const assigneeRole = (assigneeUser?.role || "CO-CEO").toUpperCase();

				await db.insert(notifications).values({
					id: uuidv4(),
					userId: assignedToUserId,
					workspaceId,
					title: "PROJECT ASSIGNED",
					message: `You have been assigned to project "${title.trim()}" (Role: ${assigneeRole})`,
					type: "PROJECT_ASSIGNMENT",
					priority: "High",
					isRead: false,
				});

				if (assigneeUser?.email) {
					emailService.sendProjectAssignmentEmail({
						to: assigneeUser.email,
						projectName: title.trim(),
						assignerName: creatorUser?.displayName || creatorUser?.name || "CEO",
						role: assigneeRole,
						deadline: projectDeadline ? projectDeadline.toISOString().split("T")[0] : null,
						projectId,
					}).catch((e) => logger.error("Async project assignment email error: " + e.message));
				}
			} catch (notifErr: any) {
				logger.error("Project notification dispatch error: " + notifErr.message);
			}

			// 3. Generate 8 Mandatory Organization Milestones
			const STAGES = [
				{ stage: 1, code: "STAGE_01_ACTIVATION", name: "01 — Project Invite & Connect", desc: "Prepare project assignment, invitation & repository binding", folder: "01-Project-Invite-Connect" },
				{ stage: 2, code: "STAGE_02_PRD", name: "02 — PRD", desc: "Product Requirements Document", folder: "02-PRD" },
				{ stage: 3, code: "STAGE_03_TRD", name: "03 — TRD", desc: "Technical Requirements Document", folder: "03-TRD" },
				{ stage: 4, code: "STAGE_04_WORKFLOW", name: "04 — Application Workflow", desc: "Application Workflow & Visual Journeys", folder: "04-App-Workflow" },
				{ stage: 5, code: "STAGE_05_UIUX", name: "05 — UI/UX Brief", desc: "UI/UX Design Brief & Screen Inventory", folder: "05-UI-UX" },
				{ stage: 6, code: "STAGE_06_DATABASE", name: "06 — Database Plan", desc: "Backend Schema & Database Plan", folder: "06-Database" },
				{ stage: 7, code: "STAGE_07_IMPLEMENTATION", name: "07 — Implementation Plan", desc: "Implementation Plan & Task Breakdown", folder: "07-Implementation" },
				{ stage: 8, code: "STAGE_08_FINAL_VERIFICATION", name: "08 — Implementation & Final Verification", desc: "Implementation Execution, Code Verification & Final Review", folder: "08-Implementation-Final" },
			];

			const milestoneRecords = [];
			for (const s of STAGES) {
				const milestoneId = uuidv4();
				const docId = uuidv4();

				// Create Milestone (Stage 1 is AVAILABLE immediately, Stages 2-8 are LOCKED)
				await db.insert(projectMilestonesV2).values({
					id: milestoneId,
					projectId,
					stageNumber: s.stage,
					milestoneCode: s.code,
					name: s.name,
					description: s.desc,
					state: s.stage === 1 ? "AVAILABLE" : "LOCKED",
					ownerUserId: assignedToUserId,
					reviewerUserId: userId,
					dependencies: s.stage > 1 ? [s.stage - 1] : [],
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				// Create Automatic Project Document Registry Record
				const folderPath = `Documents/Organization/Projects/${title.trim().replace(/\s+/g, "-")}/${s.folder}`;
				await db.insert(projectDocumentsV2).values({
					id: docId,
					projectId,
					milestoneId,
					stageNumber: s.stage,
					documentType: s.code.replace("STAGE_0", "").replace("STAGE_", ""),
					title: `${s.name} Specification`,
					currentVersion: 1,
					status: "DRAFT",
					wordCount: 0,
					folderPath,
					createdById: userId,
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				milestoneRecords.push({ id: milestoneId, name: s.name, stage: s.stage });
			}

			// 4. Create Central Approval Request for Project Assignment
			await RequestEngineService.createRequest({
				workspaceId,
				requestType: "PROJECT_ASSIGNMENT",
				title: `Project Assignment: ${title.trim()}`,
				description: `Assigned role for ${title.trim()}. Deadline: ${projectDeadline ? projectDeadline.toDateString() : "Flexible"}.`,
				requesterId: userId,
				approverId: assignedToUserId,
				entityType: "PROJECT",
				entityId: projectId,
				metadata: {
					assignmentType,
					responsibleCoCeoId,
					prompt,
					analysisData,
				},
			});

			res.json({
				success: true,
				data: {
					project: newProject,
					assignmentId,
					milestones: milestoneRecords,
				},
			});
		} catch (err: any) {
			logger.error("Create project V2 error: " + (err?.message || String(err)));
			res.status(500).json({ success: false, error: err.message || "Failed to create project V2" });
		}
	},
);

function extractProjectName(prompt: string): string {
	const patterns = [
		/build\s+(?:the\s+)?([^.by]+?)(?:\s+by|\s+before|\.)/i,
		/create\s+(?:the\s+)?([^.by]+?)(?:\s+by|\s+before|\.)/i,
		/develop\s+(?:the\s+)?([^.by]+?)(?:\s+by|\s+before|\.)/i,
		/launch\s+(?:the\s+)?([^.by]+?)(?:\s+by|\s+before|\.)/i,
	];
	for (const p of patterns) {
		const m = prompt.match(p);
		if (m) return m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
	}
	return prompt.split(".")[0].substring(0, 60).trim();
}

function extractPriority(prompt: string): string {
	if (/urgent|asap|immediately|critical/i.test(prompt)) return "Urgent";
	if (/high priority|important|soon/i.test(prompt)) return "High";
	if (/low priority|whenever|flexible/i.test(prompt)) return "Low";
	return "Medium";
}

function generateMilestones(prompt: string, deadline: Date): any[] {
	const names = [
		"Requirement Analysis & PRD",
		"Technical Architecture & TRD",
		"Application Workflow & Setup",
		"Core Execution Phase",
		"Final Verification & Handover",
	];
	return names.map((name, i) => {
		const d = new Date(deadline);
		d.setDate(
			deadline.getDate() -
				Math.round(
					(names.length - 1 - i) * (deadline.getDate() / names.length),
				),
		);
		return {
			name,
			description: `${name} phase`,
			deadline: d.toISOString(),
			status: "Pending",
			order: i,
		};
	});
}

// ─── Create Project (Multi-Step Confirmation with Date Range) ────────────────
orgProjectsRouter.post(
	"/",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	enforceNoSelfAssignment,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const {
				name,
				description,
				objective,
				scope,
				outOfScope,
				startDate,
				deadline,
				priority,
				riskLevel,
				assigneeId,
				features: featuresData,
				milestones: milestonesData,
				requirements: requirementsData,
				documents: documentsData,
				tasks: tasksData,
			} = req.body;

			if (!name || !name.trim())
				return res
					.status(400)
					.json({ success: false, error: "Project name is required" });

			const projStart = startDate
				? new Date(startDate)
				: new Date("2026-08-11");
			const projEnd = deadline
				? new Date(deadline)
				: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

			if (projEnd.getTime() <= projStart.getTime()) {
				return res
					.status(400)
					.json({
						success: false,
						error:
							"Project Start Date must be strictly earlier than Final Deadline",
					});
			}

			const projectId = uuidv4();
			const projectOwnerId =
				assigneeId && assigneeId !== userId ? assigneeId : null;

			// Create project
			const [project] = await db
				.insert(projects)
				.values({
					id: projectId,
					workspaceId,
					name: name.trim(),
					type: "ORGANIZATION",
					description: description || null,
					objective: objective || null,
					scope: Array.isArray(scope) ? scope : [scope].filter(Boolean),
					outOfScope: Array.isArray(outOfScope)
						? outOfScope
						: [outOfScope].filter(Boolean),
					startDate: projStart,
					deadline: projEnd,
					priority: priority || "MEDIUM",
					riskLevel: riskLevel || "LOW",
					status: "PLANNING",
					progress: 0,
					health: "HEALTHY",
					ownerId: projectOwnerId,
					createdBy: userId,
					tags: [],
				})
				.returning();

			// Create features
			if (Array.isArray(featuresData) && featuresData.length > 0) {
				for (const feat of featuresData) {
					await db.insert(projectFeatures).values({
						id: uuidv4(),
						projectId,
						name: feat.name || "Feature Module",
						description: feat.description || null,
						priority: feat.priority || "MEDIUM",
						status: "PLANNED",
					});
				}
			}

			// Create milestones
			if (Array.isArray(milestonesData) && milestonesData.length > 0) {
				for (let i = 0; i < milestonesData.length; i++) {
					const m = milestonesData[i];
					await db.insert(milestones).values({
						id: uuidv4(),
						projectId,
						name: m.name || `Milestone ${i + 1}`,
						description: m.description || null,
						deadline: m.deadline ? new Date(m.deadline) : null,
						status: "Pending",
						order: i,
					});
				}
			}

			// Create project requirements
			if (Array.isArray(requirementsData) && requirementsData.length > 0) {
				for (const reqItem of requirementsData) {
					await db.insert(projectRequirements).values({
						id: uuidv4(),
						projectId,
						title: reqItem.title,
						description: reqItem.description || null,
						category: reqItem.category || "Functional",
						status: "Draft",
					});
				}
			}

			// Create project required documents checklist
			const defaultDocs = [
				{ docType: "PRD", title: "Product Requirements Document (PRD)" },
				{ docType: "TRD", title: "Technical Requirements Document (TRD)" },
				{
					docType: "Application Workflow",
					title: "Application Workflow Specification",
				},
				{ docType: "User Manual", title: "User Manual & Guide" },
				{ docType: "GitHub", title: "GitHub / Source Code Repository" },
			];
			const docsToInsert =
				Array.isArray(documentsData) && documentsData.length > 0
					? documentsData
					: defaultDocs;

			for (const docItem of docsToInsert) {
				await db.insert(projectDocuments).values({
					id: uuidv4(),
					projectId,
					docType: docItem.docType || "PRD",
					title: docItem.title || docItem.docType,
					status: "Required",
				});
			}

			// Create tasks if included in confirmed mandate
			if (Array.isArray(tasksData) && tasksData.length > 0) {
				for (let i = 0; i < tasksData.length; i++) {
					const t = tasksData[i];
					await db.insert(tasks).values({
						id: uuidv4(),
						workspaceId,
						projectId,
						title: t.title,
						description: t.description || null,
						priority: t.priority || "MEDIUM",
						estimatedMinutes: t.estimatedMinutes || 120,
						deadline: t.deadline ? new Date(t.deadline) : projEnd,
						assigneeId: projectOwnerId,
						type: t.type || "Task",
						requiresDocument: Boolean(t.requiresDocument),
						requiresGithub: Boolean(t.requiresGithub),
						status: projectOwnerId ? "Assigned" : "Draft",
						order: i,
					});
				}
			}

			// Audit logs for timeline history
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_CREATED",
				details: `Organization Project "${name}" created (Start: ${projStart.toISOString().split("T")[0]}, Deadline: ${projEnd.toISOString().split("T")[0]})`,
			});

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId,
				userId,
				action: "Project Mandate Created",
				details: `Created project "${name}" with structured mandate requirements & tasks.`,
			});

			// Dispatch assignment delivery if project is assigned to team member
			if (projectOwnerId) {
				await AssignmentDeliveryService.dispatchWorkAssignment({
					workspaceId,
					entityType: "PROJECT_ASSIGNMENT",
					entityId: projectId,
					title: name.trim(),
					description: objective || description || undefined,
					actorUserId: userId,
					assigneeId: projectOwnerId,
					deadline: projEnd.toISOString().split("T")[0],
				});
			}

			socketService.emitToWorkspace(workspaceId, "project.created", project);

			res.json({ success: true, data: project });
		} catch (err: any) {
			logger.error("Create project error: " + (err?.message || String(err)));
			res
				.status(500)
				.json({ success: false, error: "Failed to create project" });
		}
	},
);

// ─── List Projects (GET /) ───────────────────────────────────────────────────
orgProjectsRouter.get(
	"/",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const membership = (req as any).membership;

			let projectList;
			if (
				!membership ||
				membership.role === "CEO" ||
				membership.role === "CO-CEO"
			) {
				projectList = await db
					.select()
					.from(projects)
					.where(eq(projects.workspaceId, workspaceId))
					.orderBy(desc(projects.createdAt));
			} else {
				// Member: only projects with their tasks or where they own
				const memberTasks = await db
					.select({ projectId: tasks.projectId })
					.from(tasks)
					.where(
						and(
							eq(tasks.workspaceId, workspaceId),
							eq(tasks.assigneeId, userId),
						),
					);
				const projectIds = [
					...new Set(memberTasks.map((t) => t.projectId).filter(Boolean)),
				];
				projectList = await db
					.select()
					.from(projects)
					.where(
						and(
							eq(projects.workspaceId, workspaceId),
							or(
								eq(projects.ownerId, userId),
								projectIds.length > 0
									? inArray(projects.id, projectIds as string[])
									: eq(projects.ownerId, userId),
							),
						),
					)
					.orderBy(desc(projects.createdAt));
			}

			// Enrich with task counts + progress
			const enriched = await Promise.all(
				projectList.map(async (p) => {
					let total = 0;
					let completed = 0;
					let countVal = 0;
					try {
						const taskList = await db
							.select()
							.from(tasks)
							.where(eq(tasks.projectId, p.id));
						total = taskList.length;
						completed = taskList.filter(
							(t) => t.status === "Completed" || t.status === "Approved",
						).length;
						const msCount = await db
							.select({ count: sql<number>`count(*)` })
							.from(milestones)
							.where(eq(milestones.projectId, p.id));
						countVal =
							msCount && msCount[0] ? Number(msCount[0].count) || 0 : 0;
					} catch (e) {}

					const progress =
						total > 0 ? Math.round((completed / total) * 100) : p.progress || 0;

					return {
						...p,
						progress,
						totalTasks: total,
						completedTasks: completed,
						milestoneCount: countVal,
					};
				}),
			);

			res.json({ success: true, data: enriched });
		} catch (err: any) {
			logger.error("List projects error: " + (err?.message || String(err)));
			res
				.status(500)
				.json({
					success: false,
					error: "Failed to list organization projects",
				});
		}
	},
);

// ─── Get Single Project Details (GET /:id) ──────────────────────────────────
orgProjectsRouter.get("/:id", async (req: Request, res: Response) => {
	try {
		const id = req.params.id as string;
		if (!id || id === "undefined" || id === "null") {
			return res
				.status(400)
				.json({ success: false, error: "Valid Project ID is required" });
		}

		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.id, id))
			.limit(1);
		if (!project)
			return res
				.status(404)
				.json({ success: false, error: "Project not found" });

		// Milestones for project
		let projMilestones: any[] = [];
		try {
			projMilestones = await db
				.select()
				.from(milestones)
				.where(eq(milestones.projectId, id))
				.orderBy(asc(milestones.order));
		} catch (e: any) {
			logger.error("Fetch project milestones error: " + e.message);
		}

		// Tasks for project
		let formattedTasks: any[] = [];
		try {
			const projTasks = await db
				.select({
					id: tasks.id,
					title: tasks.title,
					description: tasks.description,
					status: tasks.status,
					priority: tasks.priority,
					deadline: tasks.deadline,
					assigneeId: tasks.assigneeId,
					projectId: tasks.projectId,
					createdAt: tasks.createdAt,
					assigneeName: users.displayName,
					assigneeEmail: users.email,
				})
				.from(tasks)
				.leftJoin(users, eq(tasks.assigneeId, users.id))
				.where(eq(tasks.projectId, id))
				.orderBy(desc(tasks.createdAt));

			formattedTasks = projTasks.map((t) => ({
				...t,
				assigneeName: t.assigneeName || t.assigneeEmail || "Unassigned",
			}));
		} catch (e: any) {
			logger.error("Fetch project tasks error: " + e.message);
		}

		const total = formattedTasks.length;
		const completed = formattedTasks.filter(
			(t) => t.status === "Completed" || t.status === "Approved",
		).length;
		const progress =
			total > 0 ? Math.round((completed / total) * 100) : project.progress || 0;

		// Owner / Assignee details
		let ownerName = null;
		let ownerEmail = null;
		if (project.ownerId) {
			try {
				const [ownerUser] = await db
					.select()
					.from(users)
					.where(eq(users.id, project.ownerId))
					.limit(1);
				if (ownerUser) {
					ownerName = ownerUser.displayName || ownerUser.name;
					ownerEmail = ownerUser.email;
				}
			} catch (e) {}
		}

		// Requirements for project
		let projRequirements: any[] = [];
		try {
			projRequirements = await db
				.select()
				.from(projectRequirements)
				.where(eq(projectRequirements.projectId, id));
		} catch (e: any) {
			logger.error("Fetch project requirements error: " + e.message);
		}

		// Documents checklist for project
		let projDocuments: any[] = [];
		try {
			projDocuments = await db
				.select()
				.from(projectDocuments)
				.where(eq(projectDocuments.projectId, id));
		} catch (e: any) {
			logger.error("Fetch project documents error: " + e.message);
		}

		// Roadmaps for project
		let projRoadmaps: any[] = [];
		try {
			projRoadmaps = await db
				.select()
				.from(projectRoadmaps)
				.where(eq(projectRoadmaps.projectId, id))
				.orderBy(asc(projectRoadmaps.order));
		} catch (e: any) {
			logger.error("Fetch project roadmaps error: " + e.message);
		}

		// Features for project
		let projFeatures: any[] = [];
		try {
			projFeatures = await db
				.select()
				.from(projectFeatures)
				.where(eq(projectFeatures.projectId, id));
		} catch (e: any) {
			logger.error("Fetch project features error: " + e.message);
		}

		// GitHub for project
		let githubData: any = null;
		try {
			const [gh] = await db
				.select()
				.from(projectGithub)
				.where(eq(projectGithub.projectId, id))
				.limit(1);
			if (gh) githubData = gh;
		} catch (e: any) {
			logger.error("Fetch project github error: " + e.message);
		}

		// V2 Milestones for project
		try {
			const v2Ms = await db
				.select()
				.from(projectMilestonesV2)
				.where(eq(projectMilestonesV2.projectId, id))
				.orderBy(asc(projectMilestonesV2.stageNumber));
			if (v2Ms && v2Ms.length > 0) {
				projMilestones = v2Ms;
			}
		} catch (e: any) {}

		// V2 Documents for project
		try {
			const v2Docs = await db
				.select()
				.from(projectDocumentsV2)
				.where(eq(projectDocumentsV2.projectId, id));
			if (v2Docs && v2Docs.length > 0) {
				projDocuments = v2Docs;
			}
		} catch (e: any) {}

		// Normalize milestones to satisfy unified data contract
		const normalizedMilestones = (projMilestones || []).map((m: any) => ({
			...m,
			state: m.state || m.status || "LOCKED",
			status: m.status || m.state || "LOCKED",
			stageNumber: m.stageNumber || m.order || 1,
			name: m.name || m.title || "Milestone",
			description: m.description || "",
		}));

		// Fetch canonical project assignment record
		let projectAssignmentData: any = null;
		try {
			const [pa] = await db
				.select()
				.from(projectAssignments)
				.where(eq(projectAssignments.projectId, id))
				.orderBy(desc(projectAssignments.createdAt))
				.limit(1);

			if (pa) {
				let assigneeUser: any = null;
				let creatorUser: any = null;
				if (pa.assignedToUserId) {
					const [u] = await db.select().from(users).where(eq(users.id, pa.assignedToUserId)).limit(1);
					if (u) assigneeUser = { id: u.id, name: u.displayName || u.name, email: u.email, role: u.role };
				}
				if (pa.createdByUserId) {
					const [u] = await db.select().from(users).where(eq(users.id, pa.createdByUserId)).limit(1);
					if (u) creatorUser = { id: u.id, name: u.displayName || u.name, email: u.email, role: u.role };
				}

				projectAssignmentData = {
					id: pa.id,
					status: pa.status,
					assignmentType: pa.assignmentType,
					assignedTo: assigneeUser,
					assignedBy: creatorUser,
					rejectionReason: pa.rejectionReason,
					acceptedAt: pa.acceptedAt,
					declinedAt: pa.declinedAt,
					createdAt: pa.createdAt,
				};
			}
		} catch (e: any) {
			logger.error("Fetch project assignment error: " + e.message);
		}

		res.json({
			success: true,
			data: {
				...project,
				progress,
				ownerName,
				ownerEmail,
				assignment: projectAssignmentData,
				milestones: normalizedMilestones,
				requirements: projRequirements,
				documents: projDocuments,
				roadmaps: projRoadmaps,
				features: projFeatures,
				github: githubData,
				tasks: formattedTasks,
				stats: {
					total,
					completed,
					inProgress: formattedTasks.filter(
						(t) => t.status === "In Progress" || t.status === "Accepted",
					).length,
					overdue: formattedTasks.filter(
						(t) =>
							t.deadline &&
							new Date(t.deadline) < new Date() &&
							t.status !== "Completed" &&
							t.status !== "Approved",
					).length,
				},
			},
		});
	} catch (err: any) {
		logger.error(
			"Get single project error: " +
				(err?.stack || err?.message || String(err)),
		);
		res.status(500).json({ success: false, error: "Internal server error" });
	}
});

// ─── GET /:id/assignment Details ──────────────────────────────────────────────
orgProjectsRouter.get(
	"/:id/assignment",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const id = req.params.id as string;

			const [project] = await db
				.select()
				.from(projects)
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.limit(1);

			if (!project) return res.status(404).json({ success: false, error: "Project not found" });

			const [pa] = await db
				.select()
				.from(projectAssignments)
				.where(and(eq(projectAssignments.projectId, id), eq(projectAssignments.workspaceId, workspaceId)))
				.orderBy(desc(projectAssignments.createdAt))
				.limit(1);

			let assigneeUser: any = null;
			if (pa?.assignedToUserId || project.ownerId) {
				const targetId = pa?.assignedToUserId || project.ownerId;
				const [u] = await db.select().from(users).where(eq(users.id, targetId!)).limit(1);
				if (u) {
					assigneeUser = {
						id: u.id,
						name: u.displayName || u.name,
						email: u.email,
						avatarUrl: u.avatar,
						role: u.role || "CO-CEO",
					};
				}
			}

			let assignerUser: any = null;
			const creatorId = pa?.createdByUserId || project.createdBy;
			if (creatorId) {
				const [u] = await db.select().from(users).where(eq(users.id, creatorId)).limit(1);
				if (u) {
					assignerUser = {
						id: u.id,
						name: u.displayName || u.name,
						email: u.email,
						avatarUrl: u.avatar,
						role: u.role || "CEO",
					};
				}
			}

			// Current stage info
			const [currentMs] = await db
				.select()
				.from(projectMilestonesV2)
				.where(and(eq(projectMilestonesV2.projectId, id), ne(projectMilestonesV2.state, "APPROVED")))
				.orderBy(asc(projectMilestonesV2.stageNumber))
				.limit(1);

			const currentStageText = currentMs ? `Stage ${String(currentMs.stageNumber).padStart(2, "0")} / 08 (${currentMs.name})` : "Stage 01 / 08 (Invite & Connect)";

			res.json({
				success: true,
				data: {
					project,
					assignment: pa,
					assignee: assigneeUser,
					assigner: assignerUser,
					currentStageText,
					assignmentStatus: pa?.status || "PENDING_ACCEPTANCE",
				},
			});
		} catch (err: any) {
			logger.error("Get project assignment error: " + (err?.message || String(err)));
			res.status(500).json({ success: false, error: "Failed to get project assignment details" });
		}
	},
);

// ─── Project Assignment Acceptance (POST /:id/accept & POST /:id/assignment/accept) ──
const handleAcceptProject = async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const userId = (req as any).user?.id;
		const id = req.params.id as string;

		const [existing] = await db
			.select()
			.from(projects)
			.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
			.limit(1);
		if (!existing) return res.status(404).json({ success: false, error: "Project not found" });

		const [pa] = await db
			.select()
			.from(projectAssignments)
			.where(and(eq(projectAssignments.projectId, id), eq(projectAssignments.workspaceId, workspaceId)))
			.orderBy(desc(projectAssignments.createdAt))
			.limit(1);

		const now = new Date();

		if (pa) {
			await db
				.update(projectAssignments)
				.set({ status: "ACCEPTED", acceptedAt: now, updatedAt: now })
				.where(eq(projectAssignments.id, pa.id));
		}

		// Transition Stage 1 to AVAILABLE / IN_PROGRESS
		await db
			.update(projectMilestonesV2)
			.set({ state: "AVAILABLE", updatedAt: now })
			.where(and(eq(projectMilestonesV2.projectId, id), eq(projectMilestonesV2.stageNumber, 1)));

		const [updated] = await db
			.update(projects)
			.set({ status: "REQUIREMENTS_IN_PROGRESS", updatedAt: now })
			.where(eq(projects.id, id))
			.returning();

		await db.insert(auditLogs).values({
			id: uuidv4(),
			userId,
			workspaceId,
			eventType: "PROJECT_ACCEPTED",
			details: `Project "${existing.name}" mandate accepted by owner`,
		});

		await db.insert(activities).values({
			id: uuidv4(),
			workspaceId,
			projectId: id,
			userId,
			action: "Project Mandate Accepted",
			details: `Assignee officially accepted project mandate for "${existing.name}"`,
		});

		socketService.emitToWorkspace(workspaceId, "project.updated", updated);
		socketService.emitToWorkspace(workspaceId, "project.accepted", updated);
		res.json({ success: true, data: updated, message: "Project assignment accepted successfully" });
	} catch (err: any) {
		logger.error("Accept project error: " + (err?.message || String(err)));
		res.status(500).json({ success: false, error: "Failed to accept project" });
	}
};

orgProjectsRouter.post("/:id/accept", resolveWorkspace, requireMembership, handleAcceptProject);
orgProjectsRouter.post("/:id/assignment/accept", resolveWorkspace, requireMembership, handleAcceptProject);

// ─── Project Assignment Decline (POST /:id/decline & POST /:id/assignment/decline) ──
const handleDeclineProject = async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const userId = (req as any).user?.id;
		const id = req.params.id as string;
		const { reason } = req.body;

		if (!reason || typeof reason !== "string" || !reason.trim()) {
			return res.status(400).json({
				success: false,
				error: "A valid decline reason is mandatory to decline project assignment",
			});
		}

		const [existing] = await db
			.select()
			.from(projects)
			.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
			.limit(1);
		if (!existing) return res.status(404).json({ success: false, error: "Project not found" });

		const [pa] = await db
			.select()
			.from(projectAssignments)
			.where(and(eq(projectAssignments.projectId, id), eq(projectAssignments.workspaceId, workspaceId)))
			.orderBy(desc(projectAssignments.createdAt))
			.limit(1);

		const now = new Date();

		if (pa) {
			await db
				.update(projectAssignments)
				.set({
					status: "DECLINED",
					rejectionReason: reason.trim(),
					declinedAt: now,
					updatedAt: now,
				})
				.where(eq(projectAssignments.id, pa.id));
		}

		const [updated] = await db
			.update(projects)
			.set({ status: "DECLINED", updatedAt: now })
			.where(eq(projects.id, id))
			.returning();

		await db.insert(auditLogs).values({
			id: uuidv4(),
			userId,
			workspaceId,
			eventType: "PROJECT_DECLINED",
			details: `Project "${existing.name}" declined by assignee. Reason: ${reason.trim()}`,
		});

		await db.insert(activities).values({
			id: uuidv4(),
			workspaceId,
			projectId: id,
			userId,
			action: "Project Mandate Declined",
			details: `Assignee declined mandate "${existing.name}". Reason: ${reason.trim()}`,
		});

		socketService.emitToWorkspace(workspaceId, "project.updated", updated);
		socketService.emitToWorkspace(workspaceId, "project.declined", updated);
		res.json({ success: true, data: updated, message: "Project assignment declined successfully" });
	} catch (err: any) {
		logger.error("Decline project error: " + (err?.message || String(err)));
		res.status(500).json({ success: false, error: "Failed to decline project" });
	}
};

orgProjectsRouter.post("/:id/decline", resolveWorkspace, requireMembership, handleDeclineProject);
orgProjectsRouter.post("/:id/assignment/decline", resolveWorkspace, requireMembership, handleDeclineProject);

// ─── Project Assignment Request Clarification ──────────────────────────────
orgProjectsRouter.post(
	"/:id/clarify",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const { question } = req.body;

			if (!question || typeof question !== "string" || !question.trim()) {
				return res
					.status(400)
					.json({
						success: false,
						error: "Clarification question is required",
					});
			}

			const [existing] = await db
				.select()
				.from(projects)
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.limit(1);
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "Clarification Requested",
				details: `Assignee asked: "${question.trim()}"`,
			});

			res.json({ success: true, message: "Clarification request sent to CEO" });
		} catch (err: any) {
			res
				.status(500)
				.json({
					success: false,
					error: "Failed to submit clarification request",
				});
		}
	},
);

// ─── Project Date Change (with Audit & History Tracking) ───────────────────
orgProjectsRouter.post(
	"/:id/date-change",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const { startDate, deadline, reason } = req.body;

			if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
				return res
					.status(400)
					.json({
						success: false,
						error: "A valid reason for date modification is required",
					});
			}

			const [existing] = await db
				.select()
				.from(projects)
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.limit(1);
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const newStart = startDate
				? new Date(startDate)
				: existing.startDate || new Date();
			const newEnd = deadline
				? new Date(deadline)
				: existing.deadline || new Date();

			if (newEnd.getTime() <= newStart.getTime()) {
				return res
					.status(400)
					.json({
						success: false,
						error: "Project Start Date must be strictly earlier than Deadline",
					});
			}

			const prevStartStr = existing.startDate
				? new Date(existing.startDate).toISOString().split("T")[0]
				: "None";
			const prevEndStr = existing.deadline
				? new Date(existing.deadline).toISOString().split("T")[0]
				: "None";
			const newStartStr = newStart.toISOString().split("T")[0];
			const newEndStr = newEnd.toISOString().split("T")[0];

			const [updated] = await db
				.update(projects)
				.set({ startDate: newStart, deadline: newEnd })
				.where(eq(projects.id, id))
				.returning();

			// Audit Event Record
			const eventType =
				prevEndStr !== newEndStr ? "DEADLINE_CHANGED" : "START_DATE_CHANGED";
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType,
				details: `Date changed for "${existing.name}": Start (${prevStartStr} -> ${newStartStr}), Deadline (${prevEndStr} -> ${newEndStr}). Reason: ${reason.trim()}`,
			});

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "Project Date Change",
				details: `Deadline updated to ${newEndStr}. Reason: ${reason.trim()}`,
			});

			socketService.emitToWorkspace(workspaceId, "project.updated", updated);

			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(
				"Project date change error: " + (err?.message || String(err)),
			);
			res
				.status(500)
				.json({ success: false, error: "Failed to update project dates" });
		}
	},
);

// ─── Verify Requirement / Upload Asset / GitHub Link ─────────────────────────
orgProjectsRouter.post(
	"/:id/verify-requirement",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const { key, status, fileUrl, fileName, githubUrl, feedback } = req.body;

			const [existing] = await db
				.select()
				.from(projects)
				.where(eq(projects.id, id))
				.limit(1);
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const updates: any = { updatedAt: new Date() };
			if (githubUrl !== undefined) updates.githubUrl = githubUrl;

			const [updated] = await db
				.update(projects)
				.set(updates)
				.where(eq(projects.id, id))
				.returning();

			// Log Activity & Audit
			const isApproval =
				status === "Ready" || status === "Completed" || status === "VERIFIED";
			const actionText = isApproval
				? `Approved Requirement "${key}"`
				: `Updated Requirement "${key}" (${status})`;

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: actionText,
				details: `${key} updated to ${status}.${fileName ? ` File: ${fileName}` : ""}${githubUrl ? ` GitHub: ${githubUrl}` : ""}${feedback ? ` Feedback: ${feedback}` : ""}`,
			});

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: isApproval ? "REQUIREMENT_APPROVED" : "REQUIREMENT_UPDATED",
				details: `Project "${existing.name}" requirement "${key}" -> ${status}`,
			});

			socketService.emitToWorkspace(workspaceId, "project.updated", updated);

			res.json({
				success: true,
				data: updated,
				message: "Requirement updated successfully",
			});
		} catch (err: any) {
			logger.error("Verify requirement error: " + err.message);
			res
				.status(500)
				.json({ success: false, error: "Failed to update requirement" });
		}
	},
);

// ─── Update Full Project Details (PATCH /:id) ──────────────────────────────
orgProjectsRouter.patch(
	"/:id",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const {
				name,
				description,
				objective,
				startDate,
				deadline,
				priority,
				status,
				health,
				ownerId,
				githubUrl,
				reason,
			} = req.body;

			const [existing] = await db
				.select()
				.from(projects)
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.limit(1);
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const newStart = startDate
				? new Date(startDate)
				: existing.startDate || new Date();
			const newEnd = deadline
				? new Date(deadline)
				: existing.deadline || new Date();

			if (newEnd.getTime() <= newStart.getTime()) {
				return res
					.status(400)
					.json({
						success: false,
						error:
							"Project Start Date/Time must be strictly earlier than Deadline",
					});
			}

			const updates: any = { updatedAt: new Date() };
			if (name !== undefined) updates.name = name.trim();
			if (description !== undefined)
				updates.description = description ? description.trim() : null;
			if (objective !== undefined)
				updates.objective = objective ? objective.trim() : null;
			if (startDate !== undefined) updates.startDate = newStart;
			if (deadline !== undefined) updates.deadline = newEnd;
			if (priority !== undefined) updates.priority = priority;
			if (status !== undefined) updates.status = status;
			if (health !== undefined) updates.health = health;
			if (ownerId !== undefined) updates.ownerId = ownerId;

			const [updated] = await db
				.update(projects)
				.set(updates)
				.where(eq(projects.id, id))
				.returning();

			// Log Audit Event
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_UPDATED",
				details: `Project "${updated.name}" updated. ${reason ? "Reason: " + reason.trim() : ""}`,
			});

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "Project Details Updated",
				details: `Updated mandate details for "${updated.name}"`,
			});

			socketService.emitToWorkspace(workspaceId, "project.updated", updated);
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error("Update project error: " + (err?.message || String(err)));
			res
				.status(500)
				.json({ success: false, error: "Failed to update project" });
		}
	},
);

// ─── Milestone Endpoints (CRUD + Reorder) ──────────────────────────────────

// GET /:id/milestones — Fetch Milestones for Project
orgProjectsRouter.get(
	"/:id/milestones",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const id = req.params.id as string;
			const msList = await db
				.select()
				.from(milestones)
				.where(eq(milestones.projectId, id))
				.orderBy(asc(milestones.order));
			res.json({ success: true, data: msList });
		} catch (err: any) {
			res
				.status(500)
				.json({ success: false, error: "Failed to fetch milestones" });
		}
	},
);

// POST /:id/milestones — Create Milestone
orgProjectsRouter.post(
	"/:id/milestones",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const { name, description, deadline, status, order } = req.body;

			if (!name || !name.trim())
				return res
					.status(400)
					.json({ success: false, error: "Milestone name is required" });

			const [existingProj] = await db
				.select()
				.from(projects)
				.where(eq(projects.id, id))
				.limit(1);
			if (!existingProj)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const msDeadline = deadline ? new Date(deadline) : existingProj.deadline;
			if (
				msDeadline &&
				existingProj.deadline &&
				msDeadline.getTime() > new Date(existingProj.deadline).getTime()
			) {
				return res
					.status(400)
					.json({
						success: false,
						error:
							"Milestone target date cannot exceed project executive deadline",
					});
			}

			const [newMs] = await db
				.insert(milestones)
				.values({
					id: uuidv4(),
					projectId: id,
					name: name.trim(),
					description: description ? description.trim() : null,
					deadline: msDeadline,
					status: status || "Pending",
					order: order !== undefined ? order : 0,
				})
				.returning();

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "MILESTONE_CREATED",
				details: `Milestone "${newMs.name}" created for project "${existingProj.name}"`,
			});

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "Milestone Created",
				details: `Added milestone "${newMs.name}"`,
			});

			res.json({ success: true, data: newMs });
		} catch (err: any) {
			logger.error("Create milestone error: " + (err?.message || String(err)));
			res
				.status(500)
				.json({ success: false, error: "Failed to create milestone" });
		}
	},
);

// PATCH /:id/milestones/:msId — Update Milestone
orgProjectsRouter.patch(
	"/:id/milestones/:msId",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const msId = req.params.msId as string;
			const { name, description, deadline, status } = req.body;

			const updates: any = {};
			if (name !== undefined) updates.name = name.trim();
			if (description !== undefined)
				updates.description = description ? description.trim() : null;
			if (deadline !== undefined)
				updates.deadline = deadline ? new Date(deadline) : null;
			if (status !== undefined) updates.status = status;

			const [updated] = await db
				.update(milestones)
				.set(updates)
				.where(and(eq(milestones.id, msId), eq(milestones.projectId, id)))
				.returning();

			if (!updated)
				return res
					.status(404)
					.json({ success: false, error: "Milestone not found" });

			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId: id,
				userId,
				action: "Milestone Updated",
				details: `Updated milestone "${updated.name}" (${updated.status})`,
			});

			res.json({ success: true, data: updated });
		} catch (err: any) {
			res
				.status(500)
				.json({ success: false, error: "Failed to update milestone" });
		}
	},
);

// DELETE /:id/milestones/:msId — Delete/Archive Milestone
orgProjectsRouter.delete(
	"/:id/milestones/:msId",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const msId = req.params.msId as string;

			const [deleted] = await db
				.delete(milestones)
				.where(and(eq(milestones.id, msId), eq(milestones.projectId, id)))
				.returning();

			if (deleted) {
				await db.insert(activities).values({
					id: uuidv4(),
					workspaceId,
					projectId: id,
					userId,
					action: "Milestone Archived",
					details: `Archived milestone "${deleted.name}"`,
				});
			}

			res.json({ success: true, data: deleted });
		} catch (err: any) {
			res
				.status(500)
				.json({ success: false, error: "Failed to delete milestone" });
		}
	},
);

// ─── Update Project ───────────────────────────────────────────────────────────
orgProjectsRouter.patch(
	"/:id",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const {
				name,
				description,
				goal,
				deadline,
				priority,
				status,
				tags,
				health,
			} = req.body;

			const existing = await db.query.projects.findFirst({
				where: and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)),
			});
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const updates: any = {};
			if (name !== undefined) updates.name = name;
			if (description !== undefined) updates.description = description;
			if (goal !== undefined) updates.objective = goal;
			if (deadline !== undefined)
				updates.deadline = deadline ? new Date(deadline) : null;
			if (priority !== undefined) updates.priority = priority;
			if (status !== undefined) {
				updates.status = status;
				if (status === "Completed") updates.completedAt = new Date();
			}
			if (tags !== undefined) updates.tags = tags;
			if (health !== undefined) updates.health = health;

			const [updated] = await db
				.update(projects)
				.set(updates)
				.where(eq(projects.id, id))
				.returning();

			await db
				.insert(auditLogs)
				.values({
					id: uuidv4(),
					userId,
					workspaceId,
					eventType: "PROJECT_UPDATED",
					details: `Project "${updated.name}" updated`,
				});
			await db
				.insert(activities)
				.values({
					id: uuidv4(),
					workspaceId,
					projectId: id,
					userId,
					action: "Project updated",
					details: `Updated project "${updated.name}"`,
				});

			socketService.emitToWorkspace(workspaceId, "project.updated", updated);
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error("Update project error: " + err.message);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Delete Project ───────────────────────────────────────────────────────────
orgProjectsRouter.delete(
	"/:id",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const membership = (req as any).membership;
			if (membership.role !== "CEO" && membership.role !== "CO-CEO") {
				return res
					.status(403)
					.json({
						success: false,
						error: "Only CEO or CO-CEO can delete projects",
					});
			}

			const existing = await db.query.projects.findFirst({
				where: and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)),
			});
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			await db.delete(projects).where(eq(projects.id, id));
			await db
				.insert(auditLogs)
				.values({
					id: uuidv4(),
					userId,
					workspaceId,
					eventType: "PROJECT_DELETED",
					details: `Project "${existing.name}" deleted`,
				});
			socketService.emitToWorkspace(workspaceId, "project.deleted", { id });
			res.json({ success: true, message: "Project deleted" });
		} catch (err: any) {
			logger.error("Delete project error: " + err.message);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Archive Project (POST /:id/archive) ──────────────────────────────────────
orgProjectsRouter.post(
	"/:id/archive",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;

			const [updated] = await db
				.update(projects)
				.set({
					status: "Archived",
					updatedAt: new Date(),
				})
				.where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
				.returning();

			if (!updated) {
				return res.status(404).json({ success: false, error: "Project not found" });
			}

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "PROJECT_UPDATED",
				details: `Project "${updated.name}" archived`,
			});

			socketService.emitToWorkspace(workspaceId, "project.updated", updated);
			res.json({ success: true, data: updated, message: "Project archived" });
		} catch (err: any) {
			logger.error("Archive project error: " + err.message);
			res.status(500).json({ success: false, error: "Failed to archive project" });
		}
	},
);

// ─── Milestones ───────────────────────────────────────────────────────────────
orgProjectsRouter.post(
	"/:id/milestones",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const id = req.params.id as string;
			const { name, description, deadline, order } = req.body;
			if (!name)
				return res
					.status(400)
					.json({ success: false, error: "Milestone name is required" });

			const project = await db.query.projects.findFirst({
				where: and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)),
			});
			if (!project)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const [ms] = await db
				.insert(milestones)
				.values({
					id: uuidv4(),
					projectId: id,
					name,
					description: description || null,
					deadline: deadline ? new Date(deadline) : null,
					status: "Pending",
					order: order || 0,
				})
				.returning();

			socketService.emitToWorkspace(workspaceId, "milestone.updated", ms);
			res.json({ success: true, data: ms });
		} catch (err: any) {
			logger.error("Create milestone error: " + err.message);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

orgProjectsRouter.patch(
	"/:id/milestones/:msId",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const msId = req.params.msId as string;
			const { name, description, deadline, status, order } = req.body;

			const updates: any = {};
			if (name !== undefined) updates.name = name;
			if (description !== undefined) updates.description = description;
			if (deadline !== undefined)
				updates.deadline = deadline ? new Date(deadline) : null;
			if (status !== undefined) {
				updates.status = status;
				if (status === "Completed") updates.completedAt = new Date();
			}
			if (order !== undefined) updates.order = order;

			const [updated] = await db
				.update(milestones)
				.set(updates)
				.where(eq(milestones.id, msId))
				.returning();
			socketService.emitToWorkspace(workspaceId, "milestone.updated", updated);
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error("Update milestone error: " + err.message);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// GET Project Activity & Timeline History
orgProjectsRouter.get("/:id/timeline", async (req: Request, res: Response) => {
	try {
		const id = req.params.id as string;
		let workspaceId = String(
			(req as any).workspaceId || req.query.workspaceId || "",
		);

		if (!workspaceId || workspaceId === "null" || workspaceId === "undefined") {
			const [proj] = await db
				.select()
				.from(projects)
				.where(eq(projects.id, id))
				.limit(1);
			if (proj) workspaceId = proj.workspaceId;
		}

		const projectActivities = await db
			.select({
				id: activities.id,
				action: activities.action,
				details: activities.details,
				createdAt: activities.createdAt,
				userName: users.displayName,
				userEmail: users.email,
				userAvatar: users.avatar,
			})
			.from(activities)
			.leftJoin(users, eq(activities.userId, users.id))
			.where(eq(activities.projectId, id))
			.orderBy(desc(activities.createdAt))
			.limit(50);

		const events = projectActivities.map((a) => ({
			id: a.id,
			type: "PROJECT_ACTIVITY",
			action: a.action,
			details: a.details,
			createdAt: a.createdAt,
			actor: {
				name: a.userName || a.userEmail || "System",
				avatar: a.userAvatar,
			},
		}));

		res.json({ success: true, data: events });
	} catch (err: any) {
		logger.error("Get project timeline error: " + err.message);
		res
			.status(500)
			.json({
				success: false,
				error: "Failed to load project timeline history",
			});
	}
});

export default orgProjectsRouter;
