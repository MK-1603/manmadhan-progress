import { and, desc, eq, like, sql } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/client";
import { personalPromptLibrary } from "../../../database/schema/personal.schema";
import { authenticate } from "../../middleware/auth.middleware";
import { logger } from "../../services/logger.service";

export const personalPromptsRouter = Router();
personalPromptsRouter.use(authenticate);

const getUserId = (req: Request) => (req as any).user?.id;

// Built-in system prompts seeded on first request
const SYSTEM_PROMPTS = [
	{
		id: "sys-create-project",
		name: "Create Project Plan",
		description:
			"Generate a full project plan with features, milestones and requirements",
		category: "Projects",
		body: `Create a comprehensive project plan for the following goal:\n\n{{PROJECT_DESCRIPTION}}\n\nDeadline: {{DEADLINE}}\n\nInclude: title, objective, features, milestones, requirements, risks, and recommended tasks.`,
		variables: [
			{
				key: "PROJECT_DESCRIPTION",
				label: "Project Description",
				defaultValue: "",
			},
			{ key: "DEADLINE", label: "Target Deadline", defaultValue: "" },
		],
		tags: ["project", "planning"],
		isSystem: true,
	},
	{
		id: "sys-generate-prd",
		name: "Generate PRD",
		description:
			"Create a Product Requirements Document for a feature or project",
		category: "PRD",
		body: `Write a detailed Product Requirements Document (PRD) for:\n\nProject: {{PROJECT_NAME}}\nFeatures: {{PROJECT_FEATURES}}\nScope: {{SCOPE}}\n\nInclude: Executive Summary, Problem Statement, Goals, User Stories, Functional Requirements, Non-functional Requirements, Success Metrics.`,
		variables: [
			{ key: "PROJECT_NAME", label: "Project Name", defaultValue: "" },
			{ key: "PROJECT_FEATURES", label: "Key Features", defaultValue: "" },
			{ key: "SCOPE", label: "Project Scope", defaultValue: "" },
		],
		tags: ["prd", "documentation"],
		isSystem: true,
	},
	{
		id: "sys-generate-trd",
		name: "Generate TRD",
		description: "Create a Technical Requirements Document",
		category: "TRD",
		body: `Write a detailed Technical Requirements Document (TRD) for:\n\nProject: {{PROJECT_NAME}}\nTech Stack: {{TECH_STACK}}\nFeatures: {{PROJECT_FEATURES}}\n\nInclude: Architecture overview, API design, Database schema, Security requirements, Performance requirements, Integration points.`,
		variables: [
			{ key: "PROJECT_NAME", label: "Project Name", defaultValue: "" },
			{ key: "TECH_STACK", label: "Technology Stack", defaultValue: "" },
			{ key: "PROJECT_FEATURES", label: "Key Features", defaultValue: "" },
		],
		tags: ["trd", "technical", "documentation"],
		isSystem: true,
	},
	{
		id: "sys-task-breakdown",
		name: "Feature Task Breakdown",
		description: "Break down a feature into actionable development tasks",
		category: "Tasks",
		body: `Break down the following feature into detailed development tasks:\n\nProject: {{PROJECT_NAME}}\nFeature: {{FEATURE_NAME}}\nDescription: {{PROJECT_DESCRIPTION}}\nDeadline: {{DEADLINE}}\n\nFor each task include: title, description, type, priority, estimated time, and dependencies.`,
		variables: [
			{ key: "PROJECT_NAME", label: "Project Name", defaultValue: "" },
			{ key: "FEATURE_NAME", label: "Feature Name", defaultValue: "" },
			{
				key: "PROJECT_DESCRIPTION",
				label: "Feature Description",
				defaultValue: "",
			},
			{ key: "DEADLINE", label: "Deadline", defaultValue: "" },
		],
		tags: ["tasks", "planning"],
		isSystem: true,
	},
	{
		id: "sys-risk-analysis",
		name: "Risk Analysis",
		description: "Analyze project risks and mitigation strategies",
		category: "Projects",
		body: `Analyze risks for this project:\n\nProject: {{PROJECT_NAME}}\nDescription: {{PROJECT_DESCRIPTION}}\nDeadline: {{DEADLINE}}\n\nIdentify: technical risks, timeline risks, dependency risks, and provide mitigation strategies for each.`,
		variables: [
			{ key: "PROJECT_NAME", label: "Project Name", defaultValue: "" },
			{
				key: "PROJECT_DESCRIPTION",
				label: "Project Description",
				defaultValue: "",
			},
			{ key: "DEADLINE", label: "Project Deadline", defaultValue: "" },
		],
		tags: ["risk", "analysis"],
		isSystem: true,
	},
	{
		id: "sys-app-workflow",
		name: "Application Workflow",
		description: "Generate a complete application workflow specification",
		category: "Workflow",
		body: `Create a detailed application workflow specification for:\n\nProject: {{PROJECT_NAME}}\nFeatures: {{PROJECT_FEATURES}}\n\nInclude: User journey maps, screen flows, API interaction diagrams, state transitions, error handling flows.`,
		variables: [
			{ key: "PROJECT_NAME", label: "Project Name", defaultValue: "" },
			{ key: "PROJECT_FEATURES", label: "Key Features", defaultValue: "" },
		],
		tags: ["workflow", "documentation"],
		isSystem: true,
	},
	{
		id: "sys-daily-report",
		name: "Daily Progress Report",
		description: "Summarize today's work and plan for tomorrow",
		category: "Reports",
		body: `Generate a daily progress report for:\n\nRole: {{USER_ROLE}}\nProject: {{PROJECT_NAME}}\n\nSummarize: what was accomplished today, what is blocked, what needs to happen tomorrow, and any key insights or decisions.`,
		variables: [
			{ key: "USER_ROLE", label: "Your Role", defaultValue: "Developer" },
			{ key: "PROJECT_NAME", label: "Current Project", defaultValue: "" },
		],
		tags: ["report", "daily"],
		isSystem: true,
	},
	{
		id: "sys-user-manual",
		name: "User Manual",
		description: "Create a user manual for your application",
		category: "Documents",
		body: `Write a comprehensive user manual for:\n\nProject: {{PROJECT_NAME}}\nFeatures: {{PROJECT_FEATURES}}\nTarget Users: {{USER_ROLE}}\n\nInclude: Getting Started, Feature Guide, FAQ, Troubleshooting.`,
		variables: [
			{ key: "PROJECT_NAME", label: "Application Name", defaultValue: "" },
			{ key: "PROJECT_FEATURES", label: "Key Features", defaultValue: "" },
			{ key: "USER_ROLE", label: "Target User", defaultValue: "End User" },
		],
		tags: ["user manual", "documentation"],
		isSystem: true,
	},
];

async function seedSystemPrompts(userId: string) {
	try {
		for (const p of SYSTEM_PROMPTS) {
			const existing = await personalDb.query.personalPromptLibrary.findFirst({
				where: eq(personalPromptLibrary.id, p.id),
			});
			if (!existing) {
				await personalDb.insert(personalPromptLibrary).values({
					id: p.id,
					ownerUserId: userId,
					name: p.name,
					description: p.description,
					category: p.category,
					body: p.body,
					variables: p.variables as any,
					tags: p.tags as any,
					isFavorite: false,
					isSystem: true,
					usageCount: 0,
				});
			}
		}
	} catch (err) {
		// Non-fatal: system prompts may already exist
	}
}

// GET /api/v1/personal/prompts
personalPromptsRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		// Seed system prompts for new users
		await seedSystemPrompts(userId);

		const { category, search, favorites } = req.query;

		const allPrompts = await personalDb.query.personalPromptLibrary.findMany({
			where: eq(personalPromptLibrary.ownerUserId, userId),
			orderBy: [
				desc(personalPromptLibrary.usageCount),
				desc(personalPromptLibrary.updatedAt),
			],
		});

		let filtered = allPrompts;

		if (category && category !== "All") {
			filtered = filtered.filter((p) => p.category === category);
		}
		if (search) {
			const s = (search as string).toLowerCase();
			filtered = filtered.filter(
				(p) =>
					p.name.toLowerCase().includes(s) ||
					p.description?.toLowerCase().includes(s) ||
					p.body.toLowerCase().includes(s),
			);
		}
		if (favorites === "true") {
			filtered = filtered.filter((p) => p.isFavorite);
		}

		res.json({ success: true, data: filtered });
	} catch (err: any) {
		logger.error("Get prompts error: " + err.message);
		res.status(500).json({ success: false, error: "Failed to fetch prompts" });
	}
});

// GET /api/v1/personal/prompts/:id
personalPromptsRouter.get("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const prompt = await personalDb.query.personalPromptLibrary.findFirst({
			where: and(
				eq(personalPromptLibrary.id, req.params.id),
				eq(personalPromptLibrary.ownerUserId, userId),
			),
		});

		if (!prompt)
			return res
				.status(404)
				.json({ success: false, error: "Prompt not found" });
		res.json({ success: true, data: prompt });
	} catch (err: any) {
		logger.error("Get prompt error: " + err.message);
		res.status(500).json({ success: false, error: "Failed to fetch prompt" });
	}
});

// POST /api/v1/personal/prompts
personalPromptsRouter.post("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { name, description, category, body, variables, tags } = req.body;
		if (!name?.trim())
			return res
				.status(400)
				.json({ success: false, error: "Prompt name is required" });
		if (!body?.trim())
			return res
				.status(400)
				.json({ success: false, error: "Prompt body is required" });

		const [prompt] = await personalDb
			.insert(personalPromptLibrary)
			.values({
				id: uuidv4(),
				ownerUserId: userId,
				name: name.trim(),
				description: description || null,
				category: category || "Custom",
				body: body.trim(),
				variables: variables || [],
				tags: tags || [],
				isFavorite: false,
				isSystem: false,
				usageCount: 0,
			})
			.returning();

		res.status(201).json({ success: true, data: prompt });
	} catch (err: any) {
		logger.error("Create prompt error: " + err.message);
		res.status(500).json({ success: false, error: "Failed to create prompt" });
	}
});

// PATCH /api/v1/personal/prompts/:id
personalPromptsRouter.patch("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const existing = await personalDb.query.personalPromptLibrary.findFirst({
			where: and(
				eq(personalPromptLibrary.id, req.params.id),
				eq(personalPromptLibrary.ownerUserId, userId),
			),
		});
		if (!existing)
			return res
				.status(404)
				.json({ success: false, error: "Prompt not found" });
		if (existing.isSystem)
			return res
				.status(400)
				.json({
					success: false,
					error: "System prompts cannot be edited. Duplicate first.",
				});

		const { name, description, category, body, variables, tags, isFavorite } =
			req.body;
		const updateData: any = { updatedAt: new Date() };
		if (name !== undefined) updateData.name = name;
		if (description !== undefined) updateData.description = description;
		if (category !== undefined) updateData.category = category;
		if (body !== undefined) updateData.body = body;
		if (variables !== undefined) updateData.variables = variables;
		if (tags !== undefined) updateData.tags = tags;
		if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

		const [updated] = await personalDb
			.update(personalPromptLibrary)
			.set(updateData)
			.where(eq(personalPromptLibrary.id, req.params.id))
			.returning();

		res.json({ success: true, data: updated });
	} catch (err: any) {
		logger.error("Update prompt error: " + err.message);
		res.status(500).json({ success: false, error: "Failed to update prompt" });
	}
});

// DELETE /api/v1/personal/prompts/:id
personalPromptsRouter.delete("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const existing = await personalDb.query.personalPromptLibrary.findFirst({
			where: and(
				eq(personalPromptLibrary.id, req.params.id),
				eq(personalPromptLibrary.ownerUserId, userId),
			),
		});
		if (!existing)
			return res
				.status(404)
				.json({ success: false, error: "Prompt not found" });
		if (existing.isSystem)
			return res
				.status(400)
				.json({ success: false, error: "System prompts cannot be deleted" });

		await personalDb
			.delete(personalPromptLibrary)
			.where(eq(personalPromptLibrary.id, req.params.id));
		res.json({ success: true, message: "Prompt deleted" });
	} catch (err: any) {
		logger.error("Delete prompt error: " + err.message);
		res.status(500).json({ success: false, error: "Failed to delete prompt" });
	}
});

// POST /api/v1/personal/prompts/:id/duplicate
personalPromptsRouter.post(
	"/:id/duplicate",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const original = await personalDb.query.personalPromptLibrary.findFirst({
				where: and(
					eq(personalPromptLibrary.id, req.params.id),
					eq(personalPromptLibrary.ownerUserId, userId),
				),
			});
			if (!original)
				return res
					.status(404)
					.json({ success: false, error: "Prompt not found" });

			const [copy] = await personalDb
				.insert(personalPromptLibrary)
				.values({
					id: uuidv4(),
					ownerUserId: userId,
					name: `${original.name} (Copy)`,
					description: original.description,
					category: original.category,
					body: original.body,
					variables: original.variables as any,
					tags: original.tags as any,
					isFavorite: false,
					isSystem: false,
					usageCount: 0,
				})
				.returning();

			res.status(201).json({ success: true, data: copy });
		} catch (err: any) {
			logger.error("Duplicate prompt error: " + err.message);
			res
				.status(500)
				.json({ success: false, error: "Failed to duplicate prompt" });
		}
	},
);

// POST /api/v1/personal/prompts/:id/use — increment usage count
personalPromptsRouter.post("/:id/use", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const [updated] = await personalDb
			.update(personalPromptLibrary)
			.set({
				usageCount: sql`${personalPromptLibrary.usageCount} + 1`,
				lastUsedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(personalPromptLibrary.id, req.params.id),
					eq(personalPromptLibrary.ownerUserId, userId),
				),
			)
			.returning();

		if (!updated)
			return res
				.status(404)
				.json({ success: false, error: "Prompt not found" });
		res.json({ success: true, data: updated });
	} catch (err: any) {
		logger.error("Use prompt error: " + err.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to track prompt usage" });
	}
});
