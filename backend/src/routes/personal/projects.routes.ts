import { and, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/client";
import {
	personalFeatures,
	personalMilestones,
	personalProjects,
	personalRequirements,
	personalTasks,
} from "../../../database/schema/personal.schema";
import { authenticate } from "../../middleware/auth.middleware";
import { logger } from "../../services/logger.service";
import { ProjectPromptService } from "../../services/project-prompt.service";
import { socketService } from "../../services/socket.service";
import { writeTimelineEvent } from "./timeline.routes";

export const personalProjectsRouter = Router();

personalProjectsRouter.use(authenticate);

const getUserId = (req: Request) => (req as any).user?.id;

// 1. Get all projects with aggregated progress (tasks & milestones)
personalProjectsRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		// Include milestones and tasks in the query to aggregate on the fly
		const projects = await personalDb.query.personalProjects.findMany({
			where: eq(personalProjects.ownerUserId, userId),
			orderBy: (projects, { desc }) => [desc(projects.createdAt)],
			with: {
				tasks: {
					columns: { id: true, status: true },
				},
				milestones: {
					columns: { id: true, status: true },
				},
			},
		});

		// Calculate aggregations
		const aggregatedData = projects.map((p) => {
			const totalTasks = p.tasks.length;
			const completedTasks = p.tasks.filter(
				(t) => t.status === "COMPLETED",
			).length;
			const totalMilestones = p.milestones.length;
			const completedMilestones = p.milestones.filter(
				(m) => m.status === "Completed",
			).length;

			// Basic progress calculation: if tasks exist, base it on tasks. Else if milestones, milestones. Else 0.
			let computedProgress = p.progress;
			if (totalTasks > 0) {
				computedProgress = Math.round((completedTasks / totalTasks) * 100);
			} else if (totalMilestones > 0) {
				computedProgress = Math.round(
					(completedMilestones / totalMilestones) * 100,
				);
			} else {
				computedProgress = p.progress || 0; // Fallback to explicitly saved progress
			}

			// Return without the raw nested arrays to keep the payload clean
			const { tasks, milestones, ...projectData } = p;
			return {
				...projectData,
				progress: computedProgress,
				totalTasks,
				completedTasks,
				totalMilestones,
				completedMilestones,
			};
		});

		res.json({ success: true, data: aggregatedData });
	} catch (error: any) {
		logger.error(`Fetch Personal Projects Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch projects" });
	}
});

// 2. Get a single project by ID with its full milestones and tasks
personalProjectsRouter.get("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const projectId = req.params.id;

		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const project = await personalDb.query.personalProjects.findFirst({
			where: and(
				eq(personalProjects.id, String(projectId)),
				eq(personalProjects.ownerUserId, userId),
			),
		});

		if (!project) {
			return res
				.status(404)
				.json({ success: false, error: "Project not found" });
		}

		const milestones = await personalDb.query.personalMilestones.findMany({
			where: eq(personalMilestones.projectId, String(projectId)),
			orderBy: (milestones, { asc }) => [asc(milestones.order)],
		});

		const tasks = await personalDb.query.personalTasks.findMany({
			where: eq(personalTasks.projectId, String(projectId)),
			orderBy: (tasks, { asc }) => [asc(tasks.createdAt)], // Keep chronological to respect generated order
		});

		// Fetch personal features and requirements
		let features: any[] = [];
		let requirements: any[] = [];
		try {
			features = await personalDb.query.personalFeatures.findMany({
				where: eq(personalFeatures.projectId, String(projectId)),
				orderBy: (f, { asc }) => [asc(f.createdAt)],
			});
			requirements = await personalDb.query.personalRequirements.findMany({
				where: eq(personalRequirements.projectId, String(projectId)),
				orderBy: (r, { asc }) => [asc(r.createdAt)],
			});
		} catch {
			// Tables may not exist yet — migration pending
		}

		res.json({
			success: true,
			data: { ...project, milestones, tasks, features, requirements },
		});
	} catch (error: any) {
		logger.error(`Fetch Personal Project Details Error: ${error.message}`);
		res
			.status(500)
			.json({ success: false, error: "Failed to fetch project details" });
	}
});

// 3. Update a project
personalProjectsRouter.patch("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const projectId = req.params.id;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { name, description, status, progress, deadline, priority } =
			req.body;

		const existing = await personalDb.query.personalProjects.findFirst({
			where: and(
				eq(personalProjects.id, String(projectId)),
				eq(personalProjects.ownerUserId, userId),
			),
		});

		if (!existing) {
			return res
				.status(404)
				.json({ success: false, error: "Project not found" });
		}

		const updateData: any = { updatedAt: new Date() };
		if (name !== undefined) updateData.name = name;
		if (description !== undefined) updateData.description = description;
		if (status !== undefined) updateData.status = status;
		if (progress !== undefined) updateData.progress = progress;
		if (deadline !== undefined)
			updateData.deadline = deadline ? new Date(deadline) : null;
		if (priority !== undefined) updateData.priority = priority;

		if (status === "Completed" && existing.status !== "Completed") {
			updateData.completedAt = new Date();
		}

		const [updated] = await personalDb
			.update(personalProjects)
			.set(updateData)
			.where(
				and(
					eq(personalProjects.id, String(projectId)),
					eq(personalProjects.ownerUserId, userId),
				),
			)
			.returning();

		socketService.emitToUser(userId, "project_updated", updated);
		// Write timeline event for updates
		try {
			await writeTimelineEvent(
				userId,
				"PROJECT_UPDATED",
				`Updated project: ${updated.name}`,
				{ projectId: String(projectId) },
			);
		} catch {
			/* non-fatal */
		}
		res.json({ success: true, data: updated });
	} catch (error: any) {
		logger.error(`Update Personal Project Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to update project" });
	}
});

// 4. Delete a project
personalProjectsRouter.delete("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const projectId = req.params.id;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const existing = await personalDb.query.personalProjects.findFirst({
			where: and(
				eq(personalProjects.id, String(projectId)),
				eq(personalProjects.ownerUserId, userId),
			),
		});

		if (!existing) {
			return res
				.status(404)
				.json({ success: false, error: "Project not found" });
		}

		await personalDb
			.delete(personalProjects)
			.where(eq(personalProjects.id, String(projectId)));

		socketService.emitToUser(userId, "project_deleted", { id: projectId });
		res.json({ success: true, message: "Project deleted successfully" });
	} catch (error: any) {
		logger.error(`Delete Personal Project Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to delete project" });
	}
});

// 5. Duplicate a project (Deep Copy)
personalProjectsRouter.post(
	"/:id/duplicate",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			const projectId = req.params.id;
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const existing = await personalDb.query.personalProjects.findFirst({
				where: and(
					eq(personalProjects.id, String(projectId)),
					eq(personalProjects.ownerUserId, userId),
				),
				with: { milestones: true, tasks: true },
			});

			if (!existing) {
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });
			}

			const newProjectId = uuidv4();

			// Transactional deep copy
			await personalDb.transaction(async (tx) => {
				// 1. Insert duplicated project
				await tx.insert(personalProjects).values({
					id: newProjectId,
					ownerUserId: userId,
					name: `${existing.name} (Copy)`,
					description: existing.description,
					type: existing.type,
					category: existing.category,
					goal: existing.goal,
					priority: existing.priority,
					status: "Planning",
					progress: 0,
				});

				// 2. Duplicate Milestones
				const oldToNewMilestoneIds: Record<string, string> = {};
				if (existing.milestones && existing.milestones.length > 0) {
					const newMilestones = existing.milestones.map((m) => {
						const newId = uuidv4();
						oldToNewMilestoneIds[m.id] = newId;
						return {
							id: newId,
							projectId: newProjectId,
							name: m.name,
							description: m.description,
							status: "Pending", // Reset status
							priority: m.priority,
							order: m.order,
						};
					});
					await tx.insert(personalMilestones).values(newMilestones);
				}

				// 3. Duplicate Tasks
				if (existing.tasks && existing.tasks.length > 0) {
					const newTasks = existing.tasks.map((t) => ({
						id: uuidv4(),
						ownerUserId: userId,
						projectId: newProjectId,
						milestoneId: t.milestoneId
							? oldToNewMilestoneIds[t.milestoneId]
							: null,
						title: t.title,
						description: t.description,
						type: t.type,
						status: "TODO", // Reset status
						priority: t.priority,
						estimatedMinutes: t.estimatedMinutes,
					}));
					await tx.insert(personalTasks).values(newTasks);
				}
			});

			// Fetch the fully created copy to return
			const duplicated = await personalDb.query.personalProjects.findFirst({
				where: eq(personalProjects.id, newProjectId),
			});

			socketService.emitToUser(userId, "project_created", duplicated);
			res.json({ success: true, data: duplicated });
		} catch (error: any) {
			logger.error(`Duplicate Personal Project Error: ${error.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to duplicate project" });
		}
	},
);

// 6. Generate Project Plan via AI (Prompt Project Creation)
personalProjectsRouter.post(
	"/generate-plan",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const { prompt } = req.body;
			if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
				return res
					.status(400)
					.json({ success: false, error: "Prompt is required" });
			}

			const planData = await ProjectPromptService.generatePlanFromPrompt(
				prompt.trim(),
				"PERSONAL",
			);

			res.json({ success: true, data: planData });
		} catch (error: any) {
			logger.error(`Generate Personal Project Plan Error: ${error.message}`);
			res.status(500).json({
				success: false,
				error: error.message || "Failed to generate project plan",
			});
		}
	},
);

// 7. Transactional Project Creation (From AI Plan)
personalProjectsRouter.post(
	"/create-from-plan",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const {
				name,
				goal,
				description,
				overview,
				deadline,
				startDate,
				priority,
				milestones,
				tasks,
				features,
				requirements,
			} = req.body;

			if (!name)
				return res
					.status(400)
					.json({ success: false, error: "Project name is required" });

			// Date validation
			if (startDate && deadline && new Date(startDate) >= new Date(deadline)) {
				return res.status(400).json({
					success: false,
					error: "Project start date must be earlier than the deadline.",
				});
			}

			const newProjectId = uuidv4();
			let finalProject: any = null;

			await personalDb.transaction(async (tx) => {
				// 1. Create the parent Project
				const [project] = await tx
					.insert(personalProjects)
					.values({
						id: newProjectId,
						ownerUserId: userId,
						name,
						goal,
						description: description || overview || null,
						startDate: startDate ? new Date(startDate) : null,
						deadline: deadline ? new Date(deadline) : null,
						priority: priority || "Medium",
						status: "Planning",
						progress: 0,
					})
					.returning();
				finalProject = project;

				// 2. Insert Milestones
				const milestoneMap: Record<string, string> = {};
				if (Array.isArray(milestones) && milestones.length > 0) {
					const milestoneInserts = milestones.map((m: any, idx: number) => {
						const mId = uuidv4();
						milestoneMap[m.name] = mId;
						return {
							id: mId,
							projectId: newProjectId,
							name: m.name || `Milestone ${idx + 1}`,
							description: m.description || null,
							order: m.order || idx + 1,
							status: "Pending",
							deadline: m.deadline ? new Date(m.deadline) : null,
						};
					});
					await tx.insert(personalMilestones).values(milestoneInserts);
				}

				// 3. Insert Tasks
				if (Array.isArray(tasks) && tasks.length > 0) {
					const taskInserts = tasks.map((t: any) => ({
						id: uuidv4(),
						ownerUserId: userId,
						projectId: newProjectId,
						milestoneId: t.milestoneName
							? milestoneMap[t.milestoneName] || null
							: null,
						title: t.title || "New Task",
						description: t.description || null,
						status: "TODO",
						priority: t.priority || "Medium",
						estimatedMinutes: t.estimatedMinutes || 60,
						type: t.type || "Task",
						requiresDocument: t.requiresDocument || false,
						requiresGithub: t.requiresGithub || false,
					}));
					await tx.insert(personalTasks).values(taskInserts);
				}

				// 4. Insert Features (if provided)
				if (Array.isArray(features) && features.length > 0) {
					try {
						const featureInserts = features.map((f: any) => ({
							id: uuidv4(),
							projectId: newProjectId,
							name: f.name || "Unnamed Feature",
							description: f.description || null,
							priority: f.priority || "MEDIUM",
							status: f.status || "PLANNED",
						}));
						await tx.insert(personalFeatures).values(featureInserts);
					} catch {
						// Non-fatal if table doesn't exist yet
					}
				}

				// 5. Insert Requirements (if provided)
				if (Array.isArray(requirements) && requirements.length > 0) {
					try {
						const reqInserts = requirements.map((r: any) => ({
							id: uuidv4(),
							projectId: newProjectId,
							title: r.title || r.description || "Unnamed Requirement",
							description: r.description || null,
							category: r.category || "Functional",
							status: r.status || "PLANNED",
						}));
						await tx.insert(personalRequirements).values(reqInserts);
					} catch {
						// Non-fatal if table doesn't exist yet
					}
				}
			});

			// Write timeline event
			try {
				await writeTimelineEvent(
					userId,
					"PROJECT_CREATED",
					`Created project: ${name}`,
					{ projectId: newProjectId },
				);
			} catch {
				/* non-fatal */
			}

			finalProject.totalTasks = tasks?.length || 0;
			finalProject.completedTasks = 0;
			finalProject.totalMilestones = milestones?.length || 0;
			finalProject.completedMilestones = 0;
			finalProject.totalFeatures = features?.length || 0;
			finalProject.totalRequirements = requirements?.length || 0;

			socketService.emitToUser(userId, "project_created", finalProject);
			res.json({ success: true, data: finalProject });
		} catch (error: any) {
			logger.error(`Transactional Create Project Error: ${error.message}`);
			res.status(500).json({
				success: false,
				error: `Failed to create project: ${error.message}`,
			});
		}
	},
);
