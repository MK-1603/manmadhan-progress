import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	activities,
	auditLogs,
	calendarEvents,
	deadlineExtensions,
	milestones,
	notifications,
	projectMilestonesV2,
	projects,
	scoreLedger,
	taskAssignmentTracker,
	tasks,
	timeTracking,
	users,
	workspaceMembers,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { AssignmentDeliveryService } from "../services/assignment-delivery.service";
import { emailService } from "../services/email.service";
import { logger } from "../services/logger.service";
import { socketService } from "../services/socket.service";

export const orgTasksRouter = Router();
orgTasksRouter.use(authenticate);

// ─── Role Normalization & Permissions ─────────────────────────────────────────
function normalizeRole(roleStr?: string): "CEO" | "CO-CEO" | "MEMBER" {
	if (!roleStr) return "MEMBER";
	const r = String(roleStr).toUpperCase().trim().replace("_", "-");
	if (r === "CEO") return "CEO";
	if (r === "CO-CEO" || r === "COCEO") return "CO-CEO";
	return "MEMBER";
}

async function validateAssignmentHierarchy(
	user: any,
	membership: any,
	targetAssigneeId: string | null | undefined,
): Promise<{ allowed: boolean; reason?: string }> {
	if (!targetAssigneeId || targetAssigneeId === user?.id) {
		return { allowed: true };
	}

	const userGlobalRole = normalizeRole(user?.role);
	const memberRole = normalizeRole(membership?.role);
	const normRole =
		userGlobalRole === "CEO" || memberRole === "CEO"
			? "CEO"
			: userGlobalRole === "CO-CEO" || memberRole === "CO-CEO"
			? "CO-CEO"
			: "MEMBER";

	if (normRole === "CEO") {
		return { allowed: true };
	}

	if (normRole === "MEMBER") {
		return {
			allowed: false,
			reason: "Members cannot assign organization tasks to other users.",
		};
	}

	if (normRole === "CO-CEO") {
		const [targetUser] = await db
			.select({
				id: users.id,
				role: users.role,
				managerId: users.managerId,
			})
			.from(users)
			.where(eq(users.id, targetAssigneeId))
			.limit(1);

		if (!targetUser) {
			return { allowed: false, reason: "Target assignee user not found." };
		}

		const targetRole = normalizeRole(targetUser.role);
		if (targetRole === "CEO" || targetRole === "CO-CEO") {
			return {
				allowed: false,
				reason: "CO-CEOs cannot assign tasks to the CEO or other CO-CEOs.",
			};
		}

		if (targetUser.managerId && targetUser.managerId !== user?.id) {
			return {
				allowed: false,
				reason: "CO-CEOs can only assign tasks to their assigned team members.",
			};
		}

		return { allowed: true };
	}

	return { allowed: false, reason: "Insufficient permissions to assign tasks." };
}

// ─── Middleware ───────────────────────────────────────────────────────────────
const resolveWorkspace = async (req: Request, res: Response, next: any) => {
	try {
		const userId = (req as any).user?.id;
		if (!userId) {
			return res
				.status(401)
				.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } });
		}

		let workspaceId = String(
			req.query.workspaceId || req.body.workspaceId || req.headers["x-workspace-id"] || "",
		).trim();

		const [userMembership] = await db
			.select()
			.from(workspaceMembers)
			.where(eq(workspaceMembers.userId, userId))
			.limit(1);

		if (userMembership?.workspaceId) {
			if (
				!workspaceId ||
				workspaceId === "undefined" ||
				workspaceId === "null" ||
				workspaceId === "ManMadhan" ||
				workspaceId === "default"
			) {
				workspaceId = userMembership.workspaceId;
				req.body.workspaceId = workspaceId;
			}
		}

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
			return res.status(400).json({
				success: false,
				error: {
					code: "WORKSPACE_CONTEXT_REQUIRED",
					message: "workspaceId is required to execute task operations",
				},
			});
		}

		(req as any).workspaceId = workspaceId;
		next();
	} catch (err: any) {
		logger.error(
			"resolveWorkspace tasks error: " +
				(err?.stack || err?.message || String(err)),
		);
		return res.status(500).json({
			success: false,
			error: { code: "INTERNAL_ERROR", message: "Failed to resolve workspace" },
		});
	}
};

const requireMembership = async (req: Request, res: Response, next: any) => {
	try {
		const userId = (req as any).user?.id;
		const userRole = normalizeRole((req as any).user?.role);
		const workspaceId = (req as any).workspaceId;

		if (!userId) {
			return res
				.status(401)
				.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } });
		}

		let [m] = await db
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
			const [anyMembership] = await db
				.select()
				.from(workspaceMembers)
				.where(eq(workspaceMembers.userId, userId))
				.limit(1);

			if (anyMembership) {
				m = anyMembership;
				(req as any).workspaceId = anyMembership.workspaceId;
			}
		}

		// Auto-provision membership in active organization workspace if missing
		if (!m) {
			const [orgWs] = await db
				.select()
				.from(workspaceMembers)
				.limit(1);

			if (orgWs) {
				const [newMem] = await db
					.insert(workspaceMembers)
					.values({
						id: uuidv4(),
						workspaceId: orgWs.workspaceId,
						userId,
						role: userRole,
						createdAt: new Date(),
					})
					.returning();
				m = newMem;
				(req as any).workspaceId = orgWs.workspaceId;
			}
		}

		const effectiveRole = normalizeRole(m?.role || userRole);
		(req as any).membership = { ...(m || {}), role: effectiveRole };
		next();
	} catch (err: any) {
		logger.error(
			"requireMembership tasks error: " +
				(err?.stack || err?.message || String(err)),
		);
		return res
			.status(500)
			.json({ success: false, error: "Membership verification error" });
	}
};

// ─── Generate Task Plan from Prompt (Preview Stage) ─────────────────────────
orgTasksRouter.post(
	"/generate-plan-from-prompt",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const { prompt, projectId, milestoneId } = req.body;

			if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
				return res.status(400).json({
					success: false,
					error: "Prompt is required to generate task plan",
				});
			}

			// Get workspace members for intelligent assignment lookup
			const members = await db
				.select({
					id: users.id,
					name: users.displayName,
					role: workspaceMembers.role,
				})
				.from(workspaceMembers)
				.innerJoin(users, eq(workspaceMembers.userId, users.id))
				.where(eq(workspaceMembers.workspaceId, workspaceId));

			const promptText = prompt.trim();
			const lowerPrompt = promptText.toLowerCase();

			// Natural Language Task Decomposition
			const generatedTasks: any[] = [];
			const now = new Date();
			const defaultDeadline = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

			// Extract names if mentioned in prompt
			const findMemberByName = (str: string) => {
				const match = members.find(
					(m) => m.name && str.toLowerCase().includes(m.name.toLowerCase()),
				);
				return match ? match.id : null;
			};

			// Rule-based task decomposition based on natural language intent
			if (
				lowerPrompt.includes("auth") ||
				lowerPrompt.includes("login") ||
				lowerPrompt.includes("authentication")
			) {
				generatedTasks.push(
					{
						tempId: uuidv4(),
						title: "Setup OAuth 2.0 & Session Authentication Engine",
						description:
							"Implement secure session tokens, password hashing, and OAuth login flows.",
						type: "Development",
						priority: "High",
						estimatedMinutes: 240,
						assigneeId: findMemberByName(promptText) || members[0]?.id || null,
						deadline: defaultDeadline.toISOString(),
						dependencies: [],
					},
					{
						tempId: uuidv4(),
						title: "Build Authentication UI Forms & State Management",
						description:
							"Create responsive login, signup, password reset pages and client auth state hooks.",
						type: "Development",
						priority: "High",
						estimatedMinutes: 180,
						assigneeId:
							members.find((m) => m.name?.toLowerCase().includes("arun"))?.id ||
							members[0]?.id ||
							null,
						deadline: defaultDeadline.toISOString(),
						dependencies: ["Setup OAuth 2.0 & Session Authentication Engine"],
					},
					{
						tempId: uuidv4(),
						title: "Write Integration Unit Tests for Auth Endpoints",
						description:
							"Verify login, token refresh, RBAC rules, and invalid credential failure handling.",
						type: "Development",
						priority: "Medium",
						estimatedMinutes: 120,
						assigneeId: members[0]?.id || null,
						deadline: defaultDeadline.toISOString(),
						dependencies: ["Setup OAuth 2.0 & Session Authentication Engine"],
					},
					{
						tempId: uuidv4(),
						title: "Document Authentication API Specs & Security Audit",
						description:
							"Write OpenAPI spec and document token lifecycle & security boundaries.",
						type: "Documentation",
						priority: "Low",
						estimatedMinutes: 90,
						assigneeId: members[0]?.id || null,
						deadline: defaultDeadline.toISOString(),
						dependencies: [],
					},
				);
			} else {
				// General Task Plan Generation
				const sentences = promptText
					.split(/\.|\n/)
					.map((s) => s.trim())
					.filter((s) => s.length > 5);
				const taskTitles =
					sentences.length > 1
						? sentences
						: [
								`Analyze Requirements for "${promptText.substring(0, 40)}"`,
								`Develop Core Implementation for "${promptText.substring(0, 40)}"`,
								`Perform Testing & Code Review for "${promptText.substring(0, 40)}"`,
								`Prepare Documentation & Handover for "${promptText.substring(0, 40)}"`,
							];

				taskTitles.forEach((title, idx) => {
					generatedTasks.push({
						tempId: uuidv4(),
						title: title.length > 80 ? `${title.substring(0, 77)}...` : title,
						description: `Generated from prompt: "${promptText}"`,
						type:
							idx === 0
								? "Research"
								: idx === taskTitles.length - 1
									? "Documentation"
									: "Development",
						priority: idx === 0 ? "High" : "Medium",
						estimatedMinutes: (idx + 1) * 60,
						assigneeId: members[idx % members.length]?.id || null,
						deadline: defaultDeadline.toISOString(),
						dependencies: idx > 0 ? [taskTitles[idx - 1]] : [],
					});
				});
			}

			res.json({
				success: true,
				data: {
					prompt: promptText,
					projectId: projectId || null,
					milestoneId: milestoneId || null,
					taskCount: generatedTasks.length,
					tasks: generatedTasks,
					members,
				},
			});
		} catch (err: any) {
			logger.error(`Generate task plan error: ${err?.message || String(err)}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to generate task plan" });
		}
	},
);

// ─── Confirm & Create Tasks from Plan (Atomic Task Batch Creation) ──────────
orgTasksRouter.post(
	"/create-from-plan",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const { tasks: planTasks, projectId, milestoneId } = req.body;

			if (!Array.isArray(planTasks) || planTasks.length === 0) {
				return res.status(400).json({
					success: false,
					error: "No tasks provided in confirmed plan",
				});
			}

			const cleanProjectId =
				projectId &&
				projectId !== "undefined" &&
				projectId !== "null" &&
				String(projectId).trim()
					? String(projectId).trim()
					: null;
			const cleanMilestoneId =
				milestoneId &&
				milestoneId !== "undefined" &&
				milestoneId !== "null" &&
				String(milestoneId).trim()
					? String(milestoneId).trim()
					: null;

			const createdTasks = await db.transaction(async (tx) => {
				const inserted: any[] = [];
				for (const t of planTasks) {
					if (!t.title || !String(t.title).trim()) continue;

					const tProjId =
						t.projectId &&
						t.projectId !== "undefined" &&
						t.projectId !== "null" &&
						String(t.projectId).trim()
							? String(t.projectId).trim()
							: cleanProjectId;
					const tMsId =
						t.milestoneId &&
						t.milestoneId !== "undefined" &&
						t.milestoneId !== "null" &&
						String(t.milestoneId).trim()
							? String(t.milestoneId).trim()
							: cleanMilestoneId;

					const [created] = await tx
						.insert(tasks)
						.values({
							id: uuidv4(),
							workspaceId,
							projectId: tProjId,
							milestoneId: tMsId,
							assigneeId:
								t.assigneeId &&
								t.assigneeId !== "undefined" &&
								t.assigneeId !== "null"
									? String(t.assigneeId)
									: userId,
							title: String(t.title).trim(),
							description: t.description ? String(t.description) : null,
							priority: t.priority || "Medium",
							type: t.type || "Development",
							status: "Draft",
							sourceType: "PROMPT_AUTOMATION",
							estimatedMinutes: Number(t.estimatedMinutes) || 120,
							deadline:
								t.deadline && !Number.isNaN(new Date(t.deadline).getTime())
									? new Date(t.deadline)
									: new Date(Date.now() + 7 * 24 * 3600 * 1000),
						})
						.returning();

					inserted.push(created);
				}
				return inserted;
			});

			if (createdTasks.length > 0) {
				await db.insert(auditLogs).values({
					id: uuidv4(),
					userId,
					workspaceId,
					eventType: "TASK_BATCH_GENERATED_FROM_PROMPT",
					details: `Generated and confirmed batch of ${createdTasks.length} tasks via Automated Prompt Engine`,
				});

				await db.insert(activities).values({
					id: uuidv4(),
					workspaceId,
					projectId: cleanProjectId,
					userId,
					action: "Prompt Tasks Created",
					details: `Created ${createdTasks.length} automated tasks from user prompt plan preview`,
				});

				socketService.emitToWorkspace(workspaceId, "tasks.automated", {
					count: createdTasks.length,
				});
			}

			res.json({ success: true, data: createdTasks });
		} catch (err: any) {
			logger.error(
				"Create tasks from plan error: " +
					(err?.stack || err?.message || String(err)),
			);
			res.status(500).json({
				success: false,
				error:
					"Failed to create tasks from plan: " +
					(err?.message || "Internal server error"),
			});
		}
	},
);

// ─── List Tasks ───────────────────────────────────────────────────────────────
orgTasksRouter.get(
	"/",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const membership = (req as any).membership;
			const { projectId, milestoneId, status, assigneeId, priority } =
				req.query;

			const conditions = [eq(tasks.workspaceId, workspaceId)];

			if (projectId && projectId !== "undefined" && projectId !== "null") {
				conditions.push(eq(tasks.projectId, String(projectId)));
			}
			if (
				milestoneId &&
				milestoneId !== "undefined" &&
				milestoneId !== "null"
			) {
				conditions.push(eq(tasks.milestoneId, String(milestoneId)));
			}
			if (
				status &&
				status !== "undefined" &&
				status !== "null" &&
				status !== "All"
			) {
				conditions.push(eq(tasks.status, String(status)));
			}
			if (
				priority &&
				priority !== "undefined" &&
				priority !== "null" &&
				priority !== "All"
			) {
				conditions.push(eq(tasks.priority, String(priority)));
			}

			// Members can only see their own tasks
			if (membership.role === "MEMBER") {
				conditions.push(eq(tasks.assigneeId, userId));
			} else if (
				assigneeId &&
				assigneeId !== "undefined" &&
				assigneeId !== "null" &&
				assigneeId !== "All"
			) {
				conditions.push(eq(tasks.assigneeId, String(assigneeId)));
			}

			const taskList = await db
				.select({
					task: tasks,
					assigneeName: users.displayName,
					assigneeEmail: users.email,
					projectName: projects.name,
					milestoneName: milestones.name,
				})
				.from(tasks)
				.leftJoin(users, eq(tasks.assigneeId, users.id))
				.leftJoin(projects, eq(tasks.projectId, projects.id))
				.leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
				.where(and(...conditions))
				.orderBy(desc(tasks.createdAt));

			res.json({
				success: true,
				data: taskList.map((r) => ({
					...r.task,
					assigneeName: r.assigneeName || "Unassigned",
					assigneeEmail: r.assigneeEmail || "",
					projectName: r.projectName || null,
					milestoneName: r.milestoneName || null,
					isOverdue: r.task.deadline
						? new Date(r.task.deadline).getTime() < Date.now() &&
							r.task.status !== "Completed" &&
							r.task.status !== "Approved"
						: false,
				})),
			});
		} catch (err: any) {
			logger.error(
				`List tasks error: ${err?.stack || err?.message || String(err)}`,
			);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Get Current Tasks (what's active right now) ──────────────────────────────
orgTasksRouter.get(
	"/current",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const membership = (req as any).membership;

			if (membership.role === "MEMBER") {
				// Member sees only their own current task
				const currentTask = await db
					.select({ task: tasks, projectName: projects.name })
					.from(tasks)
					.leftJoin(projects, eq(tasks.projectId, projects.id))
					.where(
						and(
							eq(tasks.workspaceId, workspaceId),
							eq(tasks.assigneeId, userId),
							or(eq(tasks.status, "In Progress"), eq(tasks.status, "Accepted")),
						),
					)
					.orderBy(desc(tasks.createdAt))
					.limit(1);

				return res.json({
					success: true,
					data: {
						myCurrentTasks: currentTask.map((r) => ({
							...r.task,
							projectName: r.projectName,
						})),
					},
				});
			}

			if (membership.role === "CO-CEO") {
				// CO-CEO sees their own tasks + their members' current tasks
				const myCurrentTasks = await db
					.select({ task: tasks, projectName: projects.name })
					.from(tasks)
					.leftJoin(projects, eq(tasks.projectId, projects.id))
					.where(
						and(
							eq(tasks.workspaceId, workspaceId),
							eq(tasks.assigneeId, userId),
							or(eq(tasks.status, "In Progress"), eq(tasks.status, "Accepted")),
						),
					)
					.orderBy(desc(tasks.createdAt));

				// Get members under this CO-CEO
				const myMembers = await db
					.select({
						id: users.id,
						displayName: users.displayName,
						avatar: users.avatar,
					})
					.from(users)
					.where(eq(users.managerId, userId));

				const memberCurrentTasks = await Promise.all(
					myMembers.map(async (member) => {
						const currentTask = await db
							.select({ task: tasks, projectName: projects.name })
							.from(tasks)
							.leftJoin(projects, eq(tasks.projectId, projects.id))
							.where(
								and(
									eq(tasks.workspaceId, workspaceId),
									eq(tasks.assigneeId, member.id),
									or(
										eq(tasks.status, "In Progress"),
										eq(tasks.status, "Accepted"),
									),
								),
							)
							.orderBy(desc(tasks.createdAt))
							.limit(1);
						return {
							member: {
								id: member.id,
								name: member.displayName || "Team Member",
								avatar: member.avatar,
							},
							currentTask: currentTask[0]
								? {
										...currentTask[0].task,
										projectName: currentTask[0].projectName,
									}
								: null,
						};
					}),
				);

				return res.json({
					success: true,
					data: {
						myCurrentTasks: myCurrentTasks.map((r) => ({
							...r.task,
							projectName: r.projectName,
						})),
						memberCurrentTasks,
					},
				});
			}

			// CEO sees all current tasks across org
			const currentTasks = await db
				.select({
					task: tasks,
					assigneeName: users.displayName,
					assigneeId: tasks.assigneeId,
					projectName: projects.name,
				})
				.from(tasks)
				.leftJoin(users, eq(tasks.assigneeId, users.id))
				.leftJoin(projects, eq(tasks.projectId, projects.id))
				.where(
					and(
						eq(tasks.workspaceId, workspaceId),
						or(eq(tasks.status, "In Progress"), eq(tasks.status, "Accepted")),
					),
				)
				.orderBy(desc(tasks.createdAt))
				.limit(20);

			res.json({
				success: true,
				data: {
					currentTasks: currentTasks.map((r) => ({
						...r.task,
						assigneeName: r.assigneeName,
						projectName: r.projectName,
					})),
				},
			});
		} catch (err: any) {
			logger.error(`Current tasks error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Create Task ──────────────────────────────────────────────────────────────
const createTaskHandler = async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const userId = (req as any).user?.id;
		const user = (req as any).user;
		const membership = (req as any).membership;

		const {
			title,
			description,
			projectId,
			milestoneId,
			workId,
			assigneeId: rawAssigneeId,
			assigneeUserId,
			priority,
			deadline,
			startTime,
			endTime,
			approvalRequired,
			verificationRequired,
			deliverable,
			estimatedMinutes,
			type,
		} = req.body;
		if (!title?.trim())
			return res
				.status(400)
				.json({ success: false, error: "Task title is required" });

		const cleanProjectId =
			projectId && projectId !== "NONE" ? projectId : null;
		const cleanMilestoneId =
			cleanProjectId && milestoneId ? milestoneId : null;
		const cleanWorkId =
			cleanProjectId && workId ? workId : null;

		// Resolve target assignee: explicit assignee or Project Auto-Assignment fallback
		let assigneeId: string | null = rawAssigneeId || assigneeUserId || null;
		if (!assigneeId && cleanProjectId) {
			const [proj] = await db
				.select()
				.from(projects)
				.where(eq(projects.id, cleanProjectId))
				.limit(1);
			if (proj?.ownerId) {
				assigneeId = proj.ownerId;
			}
		}

		// Validate assignment RBAC hierarchy
		if (assigneeId) {
			const permCheck = await validateAssignmentHierarchy(user, membership, assigneeId);
			if (!permCheck.allowed) {
				return res.status(403).json({
					success: false,
					error: {
						code: "TASK_CREATE_FORBIDDEN",
						message: permCheck.reason || "You do not have permission to assign this task.",
					},
				});
			}
		}

		// Validate milestone cross-project linking rule
		if (cleanMilestoneId && cleanProjectId) {
			const [ms] = await db
				.select()
				.from(milestones)
				.where(eq(milestones.id, cleanMilestoneId))
				.limit(1);
			const [msV2] = ms
				? []
				: await db
						.select()
						.from(projectMilestonesV2)
						.where(eq(projectMilestonesV2.id, cleanMilestoneId))
						.limit(1);

			const foundMs = ms || msV2;
			if (foundMs && foundMs.projectId !== cleanProjectId) {
				return res.status(400).json({
					success: false,
					error: "Milestone does not belong to the selected project",
				});
			}
		}

		const parseDateSafely = (val: any) => {
			if (!val) return null;
			const d = new Date(val);
			if (!Number.isNaN(d.getTime())) return d;
			if (typeof val === "string" && /^\d{1,2}:\d{2}/.test(val)) {
				const todayStr = new Date().toISOString().split("T")[0];
				const d2 = new Date(
					`${todayStr}T${val.length === 5 ? val : `0${val}`}:00`,
				);
				if (!Number.isNaN(d2.getTime())) return d2;
			}
			return null;
		};

		// Resolve target assignee actual role if assigned
		let targetRole = "MEMBER";
		if (assigneeId) {
			const [assigneeUser] = await db
				.select()
				.from(users)
				.where(eq(users.id, assigneeId))
				.limit(1);
			const [assigneeMember] = await db
				.select()
				.from(workspaceMembers)
				.where(
					and(
						eq(workspaceMembers.workspaceId, workspaceId),
						eq(workspaceMembers.userId, assigneeId),
					),
				)
				.limit(1);

			targetRole = (
				assigneeUser?.role ||
				assigneeMember?.role ||
				"MEMBER"
			).toUpperCase();
			if (targetRole.includes("CO")) targetRole = "CO-CEO";
			else if (targetRole !== "CEO") targetRole = "MEMBER";
		}

		const [task] = await db
			.insert(tasks)
			.values({
				id: uuidv4(),
				workspaceId,
				projectId: cleanProjectId,
				milestoneId: cleanMilestoneId,
				workId: cleanWorkId,
				title: title.trim(),
				description: description || null,
				priority: priority || "Medium",
				status: assigneeId ? "PENDING_ACCEPTANCE" : "Draft",
				assigneeId: assigneeId || null,
				createdBy: userId || null,
				deadline: parseDateSafely(deadline),
				startTime: parseDateSafely(startTime),
				endTime: parseDateSafely(endTime),
				approvalRequired: Boolean(approvalRequired),
				verificationRequired: Boolean(verificationRequired),
				deliverable: deliverable || null,
				estimatedMinutes: estimatedMinutes || 60,
				type: type || "Task",
				tags: [],
				order: 0,
			})
			.returning();

		// Record task calendar event if deadline or startTime is provided
		if (task.deadline || task.startTime) {
			try {
				const startCal = task.startTime || task.deadline || new Date();
				const endCal = task.deadline || task.startTime || new Date();
				await db.insert(calendarEvents).values({
					id: uuidv4(),
					workspaceId,
					projectId: cleanProjectId,
					title: `[Task] ${title.trim()}`,
					description: description || `Task due date for ${title.trim()}`,
					startTime: startCal,
					endTime: endCal,
					createdById: userId,
					createdAt: new Date(),
				});
			} catch (calErr: any) {
				logger.warn(`Task calendar insertion notice: ${calErr?.message}`);
			}
		}

		// Record Task Assignment Tracker entry if assigned
		let assignmentId: string | null = null;
		if (assigneeId) {
			assignmentId = uuidv4();
			await db.insert(taskAssignmentTracker).values({
				id: assignmentId,
				taskId: task.id,
				assigneeId,
				assignedById: userId,
				assigneeRole: targetRole,
				status: "PENDING_ACCEPTANCE",
				workspaceId,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}

		await db.insert(auditLogs).values({
			id: uuidv4(),
			userId,
			workspaceId,
			eventType: "TASK_CREATED",
			details: `Task "${title}" created (Status: ${assigneeId ? "PENDING_ACCEPTANCE" : "Draft"})`,
		});

		if (projectId) {
			await db.insert(activities).values({
				id: uuidv4(),
				workspaceId,
				projectId,
				taskId: task.id,
				userId,
				action: "Task created",
				details: `Created task "${title}" (Assigned: ${assigneeId ? targetRole : "None"})`,
			});
		}

		// Notify assignee via AssignmentDeliveryService
		if (assigneeId) {
			await AssignmentDeliveryService.dispatchWorkAssignment({
				workspaceId,
				entityType: "TASK_ASSIGNMENT",
				entityId: task.id,
				title: title.trim(),
				description: description || undefined,
				actorUserId: userId,
				assigneeId,
				deadline: deadline
					? new Date(deadline).toISOString().split("T")[0]
					: undefined,
			});

			// Create direct in-app notification with taskId & assignmentId payload
			await db.insert(notifications).values({
				id: uuidv4(),
				userId: assigneeId,
				workspaceId,
				title: "TASK ASSIGNED",
				message: `You have been assigned: "${title.trim()}" (Role: ${targetRole})`,
				type: "TASK_ASSIGNMENT",
				priority: "High",
				isRead: false,
			});

			socketService.emitToUser(assigneeId, "notification.created", {
				type: "TASK_ASSIGNMENT",
				title: "TASK ASSIGNED",
				message: `You have been assigned: "${title.trim()}"`,
				taskId: task.id,
				assignmentId,
			});

			// Dispatch real email notification asynchronously
			try {
				const [assigneeUser] = await db
					.select()
					.from(users)
					.where(eq(users.id, assigneeId))
					.limit(1);
				} catch (emailErr: any) {
					logger.error(
						`Failed to trigger assignment email: ${emailErr.message}`,
					);
				}
			}

			socketService.emitToWorkspace(workspaceId, "task.created", task);
			res.json({ success: true, data: task });
		} catch (err: any) {
			logger.error(`Create task error: ${err.stack || err.message}`);
			res.status(500).json({ success: false, error: err.stack || err.message });
		}
	};

orgTasksRouter.post("/", resolveWorkspace, requireMembership, createTaskHandler);
orgTasksRouter.post("/create", resolveWorkspace, requireMembership, createTaskHandler);

// ─── Get Single Task ──────────────────────────────────────────────────────────
orgTasksRouter.get(
	"/:id",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const membership = (req as any).membership;
			const id = req.params.id as string;

			const [taskRow] = await db
				.select({
					task: tasks,
					assigneeName: users.displayName,
					projectName: projects.name,
					milestoneName: milestones.name,
				})
				.from(tasks)
				.leftJoin(users, eq(tasks.assigneeId, users.id))
				.leftJoin(projects, eq(tasks.projectId, projects.id))
				.leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
				.where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)));

			if (!taskRow)
				return res
					.status(404)
					.json({ success: false, error: "Task not found" });
			if (membership.role === "MEMBER" && taskRow.task.assigneeId !== userId) {
				return res.status(403).json({ success: false, error: "Access denied" });
			}

			// Get time tracking for this task
			const timeRecords = await db
				.select()
				.from(timeTracking)
				.where(
					and(
						eq(timeTracking.taskId, id),
						eq(timeTracking.workspaceId, workspaceId),
					),
				);
			const totalVerifiedSeconds = timeRecords.reduce(
				(acc, r) => acc + (r.durationSeconds || 0),
				0,
			);

			res.json({
				success: true,
				data: {
					...taskRow.task,
					assigneeName: taskRow.assigneeName,
					projectName: taskRow.projectName,
					milestoneName: taskRow.milestoneName,
					verifiedWorkSeconds: totalVerifiedSeconds,
				},
			});
		} catch (err: any) {
			logger.error(`Get task error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Update Task Status / Assignment ─────────────────────────────────────────
orgTasksRouter.patch(
	"/:id",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const membership = (req as any).membership;
			const id = req.params.id as string;

			const existing = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)),
			});
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Task not found" });

			// Members can only update their own task status
			if (membership.role === "MEMBER") {
				if (existing.assigneeId !== userId)
					return res
						.status(403)
						.json({ success: false, error: "Access denied" });
				const allowed = ["Accepted", "In Progress", "Blocked", "Review"];
				if (req.body.status && !allowed.includes(req.body.status))
					return res.status(403).json({
						success: false,
						error: `Status "${req.body.status}" not allowed for members`,
					});
				// Members cannot reassign
				delete req.body.assigneeId;
				delete req.body.deadline;
				delete req.body.priority;
			}

			if (req.body.assigneeId && req.body.assigneeId !== existing.assigneeId) {
				const permCheck = await validateAssignmentHierarchy((req as any).user, membership, req.body.assigneeId);
				if (!permCheck.allowed) {
					return res.status(403).json({
						success: false,
						error: permCheck.reason || "You do not have permission to assign this task.",
					});
				}
			}

			const updates: any = {};
			const {
				title,
				description,
				status,
				assigneeId,
				priority,
				deadline,
				milestoneId,
				estimatedMinutes,
				type,
			} = req.body;
			if (title !== undefined) updates.title = title;
			if (description !== undefined) updates.description = description;
			if (status !== undefined) {
				updates.status = status;
				if (status === "Completed") updates.completedAt = new Date();
				if (status === "Review") updates.submittedAt = new Date();
				if (status === "Approved") updates.approvedAt = new Date();
			}
			if (assigneeId !== undefined) updates.assigneeId = assigneeId || null;
			if (priority !== undefined) updates.priority = priority;
			if (deadline !== undefined)
				updates.deadline = deadline ? new Date(deadline) : null;
			if (milestoneId !== undefined) updates.milestoneId = milestoneId || null;
			if (estimatedMinutes !== undefined)
				updates.estimatedMinutes = estimatedMinutes;
			if (type !== undefined) updates.type = type;

			const [updated] = await db
				.update(tasks)
				.set(updates)
				.where(eq(tasks.id, id))
				.returning();

			// Audit log
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "TASK_STATUS_UPDATE",
				details: `Task "${existing.title}" status changed to ${updates.status || existing.status}${updates.assigneeId ? ` and assigned to ${updates.assigneeId}` : ""}`,
			});

			// Sync calendar event if deadline or title changed
			if (deadline !== undefined || title !== undefined) {
				try {
					const taskTitle = title?.trim() || existing.title;
					const [existingCal] = await db
						.select()
						.from(calendarEvents)
						.where(eq(calendarEvents.title, `[Task] ${existing.title}`))
						.limit(1);

					if (existingCal) {
						const calUpdates: any = {};
						if (title?.trim()) calUpdates.title = `[Task] ${title.trim()}`;
						if (deadline) {
							calUpdates.startTime = new Date(deadline);
							calUpdates.endTime = new Date(deadline);
						}
						await db.update(calendarEvents).set(calUpdates).where(eq(calendarEvents.id, existingCal.id));
					} else if (deadline) {
						await db.insert(calendarEvents).values({
							id: uuidv4(),
							workspaceId,
							projectId: existing.projectId,
							title: `[Task] ${taskTitle}`,
							description: description || existing.description || `Task due date for ${taskTitle}`,
							startTime: new Date(deadline),
							endTime: new Date(deadline),
							createdById: userId,
							createdAt: new Date(),
						});
					}
				} catch (calErr: any) {
					logger.warn(`Task update calendar notice: ${calErr?.message}`);
				}
			}

			if (existing.projectId)
				await db.insert(activities).values({
					id: uuidv4(),
					workspaceId,
					projectId: existing.projectId,
					taskId: id,
					userId,
					action: `Task ${status || "updated"}`,
					details: `Task "${updated.title}" ${status ? `moved to ${status}` : "updated"}`,
				});

			// Notify new assignee
			if (updates.assigneeId && updates.assigneeId !== existing.assigneeId) {
				await db.insert(notifications).values({
					id: uuidv4(),
					userId: updates.assigneeId,
					workspaceId,
					title: "Task Assigned",
					message: `You have been assigned: "${existing.title}"`,
					type: "task_assigned",
					priority: updated.priority || "Medium",
				});
				socketService.emitToUser(updates.assigneeId, "notification.created", {
					type: "task_assigned",
					title: "Task Assigned",
					message: `You have been assigned: "${existing.title}"`,
				});
			}

			// Score for task completion
			if (status === "Approved" && existing.assigneeId) {
				const isOnTime =
					!existing.deadline || new Date() <= new Date(existing.deadline);
				const points = isOnTime ? 10 : 5;
				await db.insert(scoreLedger).values({
					id: uuidv4(),
					userId: existing.assigneeId,
					workspaceId,
					taskId: id,
					event: "TASK_APPROVED",
					points,
					reason: isOnTime ? "On-time delivery" : "Late delivery",
				});
				socketService.emitToWorkspace(workspaceId, "leaderboard.updated", {
					userId: existing.assigneeId,
				});
			}

			// Update project progress
			if (existing.projectId) {
				const projectTasks = await db
					.select()
					.from(tasks)
					.where(eq(tasks.projectId, existing.projectId));
				const total = projectTasks.length;
				const completed = projectTasks.filter(
					(t) => t.status === "Completed" || t.status === "Approved",
				).length;
				const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
				await db
					.update(projects)
					.set({ progress })
					.where(eq(projects.id, existing.projectId));
				socketService.emitToWorkspace(workspaceId, "project.updated", {
					id: existing.projectId,
					progress,
				});
			}

			socketService.emitToWorkspace(workspaceId, "task.updated", updated);
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Update task error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Delete Task ──────────────────────────────────────────────────────────────
orgTasksRouter.delete(
	"/:id",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const membership = (req as any).membership;
			const id = req.params.id as string;
			if (membership.role === "MEMBER")
				return res
					.status(403)
					.json({ success: false, error: "Members cannot delete tasks" });

			const existing = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)),
			});
			if (!existing)
				return res
					.status(404)
					.json({ success: false, error: "Task not found" });

			try { await db.delete(calendarEvents).where(eq(calendarEvents.title, `[Task] ${existing.title}`)); } catch (e) {}
			await db.delete(tasks).where(eq(tasks.id, id));
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "TASK_DELETED",
				details: `Task "${existing.title}" deleted`,
			});
			socketService.emitToWorkspace(workspaceId, "task.updated", {
				id,
				deleted: true,
			});
			res.json({ success: true, message: "Task deleted" });
		} catch (err: any) {
			logger.error(`Delete task error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Focus / Time Tracking ─────────────────────────────────────────────────────
orgTasksRouter.post(
	"/:id/focus/start",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;

			// Check working hours (04:00–23:00)
			const hour = new Date().getHours();
			if (hour < 4 || hour >= 23) {
				return res.status(403).json({
					success: false,
					error: "Focus is not available outside working hours (04:00 – 23:00)",
				});
			}

			// End any active sessions first
			await db
				.update(timeTracking)
				.set({
					status: "Completed",
					endTime: new Date(),
					durationSeconds: sql`EXTRACT(EPOCH FROM (NOW() - start_time))::int`,
				})
				.where(
					and(
						eq(timeTracking.userId, userId),
						eq(timeTracking.workspaceId, workspaceId),
						eq(timeTracking.status, "Active"),
					),
				);

			const [session] = await db
				.insert(timeTracking)
				.values({
					id: uuidv4(),
					userId,
					workspaceId,
					taskId: id,
					status: "Active",
					startTime: new Date(),
				})
				.returning();

			// Update task status to In Progress
			const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
			if (task && task.status === "Assigned") {
				await db
					.update(tasks)
					.set({ status: "In Progress" })
					.where(eq(tasks.id, id));
				socketService.emitToWorkspace(workspaceId, "task.started", {
					id,
					status: "In Progress",
				});
			}

			socketService.emitToWorkspace(workspaceId, "focus.started", {
				userId,
				taskId: id,
				sessionId: session.id,
			});
			res.json({ success: true, data: session });
		} catch (err: any) {
			logger.error(`Focus start error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

orgTasksRouter.post(
	"/:id/focus/pause",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;

			const activeSession = await db.query.timeTracking.findFirst({
				where: and(
					eq(timeTracking.taskId, id),
					eq(timeTracking.userId, userId),
					eq(timeTracking.status, "Active"),
				),
			});
			if (!activeSession)
				return res
					.status(404)
					.json({ success: false, error: "No active focus session found" });

			const durationSeconds = Math.floor(
				(Date.now() - new Date(activeSession.startTime).getTime()) / 1000,
			);
			const [updated] = await db
				.update(timeTracking)
				.set({ status: "Paused", pausedAt: new Date(), durationSeconds })
				.where(eq(timeTracking.id, activeSession.id))
				.returning();
			socketService.emitToWorkspace(workspaceId, "focus.paused", {
				userId,
				taskId: id,
				sessionId: activeSession.id,
			});
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Focus pause error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

orgTasksRouter.post(
	"/:id/focus/resume",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;

			const hour = new Date().getHours();
			if (hour < 4 || hour >= 23) {
				return res.status(403).json({
					success: false,
					error: "Focus is not available outside working hours (04:00 – 23:00)",
				});
			}

			const pausedSession = await db.query.timeTracking.findFirst({
				where: and(
					eq(timeTracking.taskId, id),
					eq(timeTracking.userId, userId),
					eq(timeTracking.status, "Paused"),
				),
			});
			if (!pausedSession)
				return res
					.status(404)
					.json({ success: false, error: "No paused session found" });

			const [updated] = await db
				.update(timeTracking)
				.set({ status: "Active", resumedAt: new Date() })
				.where(eq(timeTracking.id, pausedSession.id))
				.returning();
			socketService.emitToWorkspace(workspaceId, "focus.resumed", {
				userId,
				taskId: id,
				sessionId: pausedSession.id,
			});
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Focus resume error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

orgTasksRouter.post(
	"/:id/focus/stop",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;

			const activeSession = await db.query.timeTracking.findFirst({
				where: and(
					eq(timeTracking.taskId, id),
					eq(timeTracking.userId, userId),
					or(
						eq(timeTracking.status, "Active"),
						eq(timeTracking.status, "Paused"),
					),
				),
			});
			if (!activeSession)
				return res
					.status(404)
					.json({ success: false, error: "No active session found" });

			const now = new Date();
			const startTime = activeSession.resumedAt || activeSession.startTime;
			const sessionDuration = Math.floor(
				(now.getTime() - new Date(startTime).getTime()) / 1000,
			);
			const totalDuration =
				(activeSession.durationSeconds || 0) +
				(activeSession.status === "Active" ? sessionDuration : 0);

			const [updated] = await db
				.update(timeTracking)
				.set({
					status: "Completed",
					endTime: now,
					durationSeconds: totalDuration,
				})
				.where(eq(timeTracking.id, activeSession.id))
				.returning();
			socketService.emitToWorkspace(workspaceId, "focus.stopped", {
				userId,
				taskId: id,
				sessionId: activeSession.id,
				durationSeconds: totalDuration,
			});
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Focus stop error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Deadline Extension Requests ─────────────────────────────────────────────
orgTasksRouter.post(
	"/:id/deadline-extension",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const { reason, proposedDeadline } = req.body;
			if (!reason || !proposedDeadline)
				return res.status(400).json({
					success: false,
					error: "Reason and proposed deadline are required",
				});

			const task = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)),
			});
			if (!task)
				return res
					.status(404)
					.json({ success: false, error: "Task not found" });

			const [ext] = await db
				.insert(deadlineExtensions)
				.values({
					id: uuidv4(),
					taskId: id,
					userId,
					workspaceId,
					reason,
					proposedDeadline: new Date(proposedDeadline),
					status: "Pending",
				})
				.returning();

			// Notify CEO
			const ceo = await db.query.workspaceMembers.findFirst({
				where: and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.role, "CEO"),
				),
			});
			if (ceo) {
				await db.insert(notifications).values({
					id: uuidv4(),
					userId: ceo.userId,
					workspaceId,
					title: "Deadline Extension Request",
					message: `Deadline extension requested for task "${task.title}"`,
					type: "deadline_extension",
					priority: "High",
				});
				socketService.emitToUser(ceo.userId, "notification.created", {
					type: "deadline_extension",
					title: "Deadline Extension Request",
				});
			}

			socketService.emitToWorkspace(workspaceId, "request.created", ext);
			res.json({ success: true, data: ext });
		} catch (err: any) {
			logger.error(`Deadline extension error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Delete Task (DELETE /:id) ──────────────────────────────────────────────
orgTasksRouter.delete(
	"/:id",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;

			const [deleted] = await db
				.delete(tasks)
				.where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
				.returning();

			if (!deleted)
				return res
					.status(404)
					.json({ success: false, error: "Task not found" });

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "TASK_DELETED",
				details: `Deleted task "${deleted.title}"`,
			});

			socketService.emitToWorkspace(workspaceId, "task.deleted", {
				id,
				workspaceId,
			});
			res.json({
				success: true,
				data: deleted,
				message: "Task deleted successfully",
			});
		} catch (err: any) {
			logger.error(`Delete task error: ${err?.message || String(err)}`);
			res.status(500).json({ success: false, error: "Failed to delete task" });
		}
	},
);

// ─── GET /:id/assignment Details ──────────────────────────────────────────────
orgTasksRouter.get(
	"/:id/assignment",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const id = req.params.id as string;

			const [task] = await db
				.select()
				.from(tasks)
				.where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
				.limit(1);

			if (!task)
				return res
					.status(404)
					.json({ success: false, error: "Task not found" });

			// Fetch latest assignment tracker record
			const [tracker] = await db
				.select()
				.from(taskAssignmentTracker)
				.where(
					and(
						eq(taskAssignmentTracker.taskId, id),
						eq(taskAssignmentTracker.workspaceId, workspaceId),
					),
				)
				.orderBy(desc(taskAssignmentTracker.createdAt))
				.limit(1);

			// Fetch Assignee User Details
			let assigneeUser: any = null;
			if (task.assigneeId) {
				const [u] = await db
					.select()
					.from(users)
					.where(eq(users.id, task.assigneeId))
					.limit(1);
				if (u) {
					assigneeUser = {
						id: u.id,
						name: u.displayName || u.name,
						email: u.email,
						avatarUrl: u.avatar,
						role: tracker?.assigneeRole || u.role || "MEMBER",
					};
				}
			}

			// Fetch Assigner User Details
			let assignerUser: any = null;
			const assignerId = tracker?.assignedById || task.createdBy;
			if (assignerId) {
				const [u] = await db
					.select()
					.from(users)
					.where(eq(users.id, assignerId))
					.limit(1);
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

			// Fetch Project Name if project-linked
			let projectName: string | null = null;
			if (task.projectId) {
				const [p] = await db
					.select()
					.from(projects)
					.where(eq(projects.id, task.projectId))
					.limit(1);
				if (p) projectName = p.name;
			}

			// Fetch Milestone Name if milestone-linked
			let milestoneName: string | null = null;
			if (task.milestoneId) {
				const [ms] = await db
					.select()
					.from(projectMilestonesV2)
					.where(eq(projectMilestonesV2.id, task.milestoneId))
					.limit(1);
				if (ms) milestoneName = ms.name;
			}

			res.json({
				success: true,
				data: {
					task,
					tracker,
					assignee: assigneeUser,
					assigner: assignerUser,
					projectName,
					milestoneName,
					assignmentStatus:
						tracker?.status ||
						(task.status === "PENDING_ACCEPTANCE"
							? "PENDING_ACCEPTANCE"
							: task.status),
				},
			});
		} catch (err: any) {
			logger.error(`Get task assignment error: ${err?.message || String(err)}`);
			res.status(500).json({
				success: false,
				error: "Failed to get task assignment details",
			});
		}
	},
);

// ─── Accept Task Assignment (POST /:id/assignment/accept) ────────────────────
orgTasksRouter.post(
	"/:id/assignment/accept",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;

			const [task] = await db
				.select()
				.from(tasks)
				.where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
				.limit(1);

			if (!task)
				return res
					.status(404)
					.json({ success: false, error: "Task not found" });

			// Security Authorization Verification: Must be the target assignee
			if (task.assigneeId && task.assigneeId !== userId) {
				return res.status(403).json({
					success: false,
					error:
						"Unauthorized. Only the assigned user can accept this task assignment.",
				});
			}

			// Idempotent Check
			if (task.status === "ACCEPTED" || task.status === "In Progress") {
				return res.json({
					success: true,
					data: task,
					message: "Task assignment already accepted",
				});
			}

			if (task.status !== "PENDING_ACCEPTANCE" && task.status !== "Assigned") {
				return res.status(400).json({
					success: false,
					error: `Task assignment cannot be accepted from current status: ${task.status}`,
				});
			}

			const now = new Date();

			// Update Task Status
			const [updatedTask] = await db
				.update(tasks)
				.set({ status: "ACCEPTED" })
				.where(eq(tasks.id, id))
				.returning();

			// Update Task Assignment Tracker
			const [activeTracker] = await db
				.select()
				.from(taskAssignmentTracker)
				.where(
					and(
						eq(taskAssignmentTracker.taskId, id),
						eq(taskAssignmentTracker.workspaceId, workspaceId),
					),
				)
				.orderBy(desc(taskAssignmentTracker.createdAt))
				.limit(1);

			if (activeTracker) {
				await db
					.update(taskAssignmentTracker)
					.set({ status: "ACCEPTED", acceptedAt: now, updatedAt: now })
					.where(eq(taskAssignmentTracker.id, activeTracker.id));
			}

			// Insert Activity Log
			const [assigneeUser] = await db
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);
			const assigneeName =
				assigneeUser?.displayName || assigneeUser?.name || "Assignee";

			if (task.projectId) {
				await db.insert(activities).values({
					id: uuidv4(),
					workspaceId,
					projectId: task.projectId,
					taskId: id,
					userId,
					action: "Task Accepted",
					details: `${assigneeName} accepted task "${task.title}"`,
				});
			}

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "TASK_ACCEPTED",
				details: `${assigneeName} accepted task "${task.title}"`,
			});

			// Notify Creator
			const creatorId = activeTracker?.assignedById || task.createdBy;
			if (creatorId && creatorId !== userId) {
				await db.insert(notifications).values({
					id: uuidv4(),
					userId: creatorId,
					workspaceId,
					title: "TASK ACCEPTED",
					message: `${assigneeName} accepted task "${task.title}"`,
					type: "TASK_ASSIGNMENT_ACCEPTED",
					priority: "Normal",
					isRead: false,
				});

				socketService.emitToUser(creatorId, "notification.created", {
					type: "TASK_ASSIGNMENT_ACCEPTED",
					title: "TASK ACCEPTED",
					message: `${assigneeName} accepted task "${task.title}"`,
					taskId: id,
				});
			}

			socketService.emitToWorkspace(workspaceId, "task.updated", updatedTask);
			res.json({
				success: true,
				data: updatedTask,
				message: "Task assignment accepted successfully",
			});
		} catch (err: any) {
			logger.error(
				`Accept task assignment error: ${err?.message || String(err)}`,
			);
			res
				.status(500)
				.json({ success: false, error: "Failed to accept task assignment" });
		}
	},
);

// ─── Decline Task Assignment (POST /:id/assignment/decline) ───────────────────
orgTasksRouter.post(
	"/:id/assignment/decline",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const { reason } = req.body;

			if (!reason || typeof reason !== "string" || !reason.trim()) {
				return res.status(400).json({
					success: false,
					error:
						"A valid decline reason is mandatory to decline task assignment",
				});
			}

			const [task] = await db
				.select()
				.from(tasks)
				.where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
				.limit(1);

			if (!task)
				return res
					.status(404)
					.json({ success: false, error: "Task not found" });

			// Security Authorization Verification: Must be target assignee
			if (task.assigneeId && task.assigneeId !== userId) {
				return res.status(403).json({
					success: false,
					error:
						"Unauthorized. Only the assigned user can decline this task assignment.",
				});
			}

			const now = new Date();

			// Update Task Status
			const [updatedTask] = await db
				.update(tasks)
				.set({ status: "DECLINED", rejectionFeedback: reason.trim() })
				.where(eq(tasks.id, id))
				.returning();

			// Update Task Assignment Tracker
			const [activeTracker] = await db
				.select()
				.from(taskAssignmentTracker)
				.where(
					and(
						eq(taskAssignmentTracker.taskId, id),
						eq(taskAssignmentTracker.workspaceId, workspaceId),
					),
				)
				.orderBy(desc(taskAssignmentTracker.createdAt))
				.limit(1);

			if (activeTracker) {
				await db
					.update(taskAssignmentTracker)
					.set({
						status: "DECLINED",
						declineReason: reason.trim(),
						declinedAt: now,
						updatedAt: now,
					})
					.where(eq(taskAssignmentTracker.id, activeTracker.id));
			}

			// Insert Activity Log
			const [assigneeUser] = await db
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);
			const assigneeName =
				assigneeUser?.displayName || assigneeUser?.name || "Assignee";

			if (task.projectId) {
				await db.insert(activities).values({
					id: uuidv4(),
					workspaceId,
					projectId: task.projectId,
					taskId: id,
					userId,
					action: "Task Declined",
					details: `${assigneeName} declined task "${task.title}". Reason: ${reason.trim()}`,
				});
			}

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "TASK_DECLINED",
				details: `${assigneeName} declined task "${task.title}". Reason: ${reason.trim()}`,
			});

			// Notify Creator
			const creatorId = activeTracker?.assignedById || task.createdBy;
			if (creatorId && creatorId !== userId) {
				await db.insert(notifications).values({
					id: uuidv4(),
					userId: creatorId,
					workspaceId,
					title: "TASK DECLINED",
					message: `${assigneeName} declined: "${task.title}". Reason: ${reason.trim()}`,
					type: "TASK_ASSIGNMENT_DECLINED",
					priority: "High",
					isRead: false,
				});

				socketService.emitToUser(creatorId, "notification.created", {
					type: "TASK_ASSIGNMENT_DECLINED",
					title: "TASK DECLINED",
					message: `${assigneeName} declined task "${task.title}"`,
					taskId: id,
					reason: reason.trim(),
				});
			}

			socketService.emitToWorkspace(workspaceId, "task.updated", updatedTask);
			res.json({
				success: true,
				data: updatedTask,
				message: "Task assignment declined successfully",
			});
		} catch (err: any) {
			logger.error(
				`Decline task assignment error: ${err?.message || String(err)}`,
			);
			res
				.status(500)
				.json({ success: false, error: "Failed to decline task assignment" });
		}
	},
);

// ─── Reassign Task (POST /:id/assignment/reassign) ───────────────────────────
orgTasksRouter.post(
	"/:id/assignment/reassign",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;
			const { newAssigneeId } = req.body;

			if (!newAssigneeId) {
				return res.status(400).json({
					success: false,
					error: "Target new assignee ID is required",
				});
			}

			const [task] = await db
				.select()
				.from(tasks)
				.where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
				.limit(1);

			if (!task)
				return res
					.status(404)
					.json({ success: false, error: "Task not found" });

			// Resolve new assignee role
			const [newAssigneeUser] = await db
				.select()
				.from(users)
				.where(eq(users.id, newAssigneeId))
				.limit(1);
			const [newAssigneeMember] = await db
				.select()
				.from(workspaceMembers)
				.where(
					and(
						eq(workspaceMembers.workspaceId, workspaceId),
						eq(workspaceMembers.userId, newAssigneeId),
					),
				)
				.limit(1);

			if (!newAssigneeUser && !newAssigneeMember) {
				return res.status(404).json({
					success: false,
					error: "Target assignee user not found in organization",
				});
			}

			let targetRole = (
				newAssigneeUser?.role ||
				newAssigneeMember?.role ||
				"MEMBER"
			).toUpperCase();
			if (targetRole.includes("CO")) targetRole = "CO-CEO";
			else if (targetRole !== "CEO") targetRole = "MEMBER";

			const now = new Date();

			// Update previous active tracker entries to REASSIGNED
			await db
				.update(taskAssignmentTracker)
				.set({ status: "REASSIGNED", reassignedAt: now, updatedAt: now })
				.where(
					and(
						eq(taskAssignmentTracker.taskId, id),
						eq(taskAssignmentTracker.status, "PENDING_ACCEPTANCE"),
					),
				);

			// Insert NEW Task Assignment Tracker entry
			const newAssignmentId = uuidv4();
			await db.insert(taskAssignmentTracker).values({
				id: newAssignmentId,
				taskId: id,
				assigneeId: newAssigneeId,
				assignedById: userId,
				assigneeRole: targetRole,
				status: "PENDING_ACCEPTANCE",
				workspaceId,
				createdAt: now,
				updatedAt: now,
			});

			// Update Task Record
			const [updatedTask] = await db
				.update(tasks)
				.set({ assigneeId: newAssigneeId, status: "PENDING_ACCEPTANCE" })
				.where(eq(tasks.id, id))
				.returning();

			// Notify New Assignee
			await AssignmentDeliveryService.dispatchWorkAssignment({
				workspaceId,
				entityType: "TASK_ASSIGNMENT",
				entityId: id,
				title: task.title,
				description: task.description || undefined,
				actorUserId: userId,
				assigneeId: newAssigneeId,
			});

			await db.insert(notifications).values({
				id: uuidv4(),
				userId: newAssigneeId,
				workspaceId,
				title: "TASK ASSIGNED",
				message: `Task "${task.title}" has been reassigned to you (Role: ${targetRole})`,
				type: "TASK_ASSIGNMENT",
				priority: "High",
				isRead: false,
			});

			socketService.emitToUser(newAssigneeId, "notification.created", {
				type: "TASK_ASSIGNMENT",
				title: "TASK ASSIGNED",
				message: `Task "${task.title}" has been reassigned to you`,
				taskId: id,
				assignmentId: newAssignmentId,
			});

			socketService.emitToWorkspace(workspaceId, "task.updated", updatedTask);
			res.json({
				success: true,
				data: updatedTask,
				message: "Task reassigned successfully",
			});
		} catch (err: any) {
			logger.error(`Reassign task error: ${err?.message || String(err)}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to reassign task" });
		}
	},
);

// ─── Start Work Session (POST /:id/start-work) ────────────────────────────────
orgTasksRouter.post(
	"/:id/start-work",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const id = req.params.id as string;

			const [task] = await db
				.select()
				.from(tasks)
				.where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
				.limit(1);

			if (!task)
				return res
					.status(404)
					.json({ success: false, error: "Task not found" });

			const [updatedTask] = await db
				.update(tasks)
				.set({ status: "In Progress" })
				.where(eq(tasks.id, id))
				.returning();

			// Record active work session
			await db.insert(timeTracking).values({
				id: uuidv4(),
				taskId: id,
				userId,
				workspaceId,
				startTime: new Date(),
			});

			socketService.emitToWorkspace(workspaceId, "task.updated", updatedTask);
			res.json({
				success: true,
				data: updatedTask,
				message: "Work session started",
			});
		} catch (err: any) {
			logger.error(`Start work error: ${err?.message || String(err)}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to start work session" });
		}
	},
);

// ─── Bulk Task Operations ───────────────────────────────────────────────────
orgTasksRouter.post(
	"/bulk/status",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const { taskIds, status } = req.body;
			if (!Array.isArray(taskIds) || taskIds.length === 0 || !status) {
				return res.status(400).json({ success: false, error: "taskIds array and status are required" });
			}
			await db
				.update(tasks)
				.set({ status, completedAt: status === "Completed" ? new Date() : null })
				.where(and(inArray(tasks.id, taskIds), eq(tasks.workspaceId, workspaceId)));
			socketService.emitToWorkspace(workspaceId, "task.updated", { taskIds, status });
			res.json({ success: true, message: `Updated status for ${taskIds.length} tasks` });
		} catch (err: any) {
			logger.error(`Bulk status update error: ${err?.message}`);
			res.status(500).json({ success: false, error: "Failed bulk status update" });
		}
	},
);

orgTasksRouter.post(
	"/bulk/priority",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const { taskIds, priority } = req.body;
			if (!Array.isArray(taskIds) || taskIds.length === 0 || !priority) {
				return res.status(400).json({ success: false, error: "taskIds array and priority are required" });
			}
			await db
				.update(tasks)
				.set({ priority })
				.where(and(inArray(tasks.id, taskIds), eq(tasks.workspaceId, workspaceId)));
			socketService.emitToWorkspace(workspaceId, "task.updated", { taskIds, priority });
			res.json({ success: true, message: `Updated priority for ${taskIds.length} tasks` });
		} catch (err: any) {
			logger.error(`Bulk priority update error: ${err?.message}`);
			res.status(500).json({ success: false, error: "Failed bulk priority update" });
		}
	},
);

orgTasksRouter.post(
	"/bulk/assign",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const { taskIds, assigneeId } = req.body;
			if (!Array.isArray(taskIds) || taskIds.length === 0) {
				return res.status(400).json({ success: false, error: "taskIds array is required" });
			}
			await db
				.update(tasks)
				.set({ assigneeId: assigneeId || null })
				.where(and(inArray(tasks.id, taskIds), eq(tasks.workspaceId, workspaceId)));
			socketService.emitToWorkspace(workspaceId, "task.updated", { taskIds, assigneeId });
			res.json({ success: true, message: `Reassigned ${taskIds.length} tasks` });
		} catch (err: any) {
			logger.error(`Bulk assign error: ${err?.message}`);
			res.status(500).json({ success: false, error: "Failed bulk task assignment" });
		}
	},
);

orgTasksRouter.post(
	"/bulk/move",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const { taskIds, projectId } = req.body;
			if (!Array.isArray(taskIds) || taskIds.length === 0) {
				return res.status(400).json({ success: false, error: "taskIds array is required" });
			}
			await db
				.update(tasks)
				.set({ projectId: projectId || null })
				.where(and(inArray(tasks.id, taskIds), eq(tasks.workspaceId, workspaceId)));
			socketService.emitToWorkspace(workspaceId, "task.updated", { taskIds, projectId });
			res.json({ success: true, message: `Moved ${taskIds.length} tasks` });
		} catch (err: any) {
			logger.error(`Bulk move error: ${err?.message}`);
			res.status(500).json({ success: false, error: "Failed bulk task move" });
		}
	},
);

orgTasksRouter.post(
	"/bulk/complete",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const { taskIds } = req.body;
			if (!Array.isArray(taskIds) || taskIds.length === 0) {
				return res.status(400).json({ success: false, error: "taskIds array is required" });
			}
			await db
				.update(tasks)
				.set({ status: "Completed", completedAt: new Date() })
				.where(and(inArray(tasks.id, taskIds), eq(tasks.workspaceId, workspaceId)));
			socketService.emitToWorkspace(workspaceId, "task.updated", { taskIds, status: "Completed" });
			res.json({ success: true, message: `Marked ${taskIds.length} tasks completed` });
		} catch (err: any) {
			logger.error(`Bulk complete error: ${err?.message}`);
			res.status(500).json({ success: false, error: "Failed bulk task completion" });
		}
	},
);

orgTasksRouter.delete(
	"/bulk",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const { taskIds } = req.body;
			if (!Array.isArray(taskIds) || taskIds.length === 0) {
				return res.status(400).json({ success: false, error: "taskIds array is required" });
			}
			await db
				.delete(tasks)
				.where(and(inArray(tasks.id, taskIds), eq(tasks.workspaceId, workspaceId)));
			socketService.emitToWorkspace(workspaceId, "task.deleted", { taskIds });
			res.json({ success: true, message: `Deleted ${taskIds.length} tasks` });
		} catch (err: any) {
			logger.error(`Bulk delete error: ${err?.message}`);
			res.status(500).json({ success: false, error: "Failed bulk task deletion" });
		}
	},
);

export default orgTasksRouter;
