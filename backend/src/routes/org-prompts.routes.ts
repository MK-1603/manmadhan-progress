import { and, desc, eq, ilike, or } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import { organizationPrompts } from "../../database/schema";
import {
	requireMembership,
	resolveWorkspace,
} from "../middleware/org-workspace.middleware";
import { logger } from "../services/logger.service";

export const orgPromptsRouter = Router();

// GET /api/v1/org/prompts
orgPromptsRouter.get(
	"/",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const { category, search, favoriteOnly } = req.query;

			const conditions: any[] = [
				or(
					eq(organizationPrompts.workspaceId, workspaceId),
					eq(organizationPrompts.isBuiltin, true),
				),
			];

			if (category && typeof category === "string" && category !== "All") {
				conditions.push(eq(organizationPrompts.category, category));
			}

			if (favoriteOnly === "true") {
				conditions.push(eq(organizationPrompts.isFavorite, true));
			}

			if (search && typeof search === "string" && search.trim()) {
				const term = `%${search.trim()}%`;
				conditions.push(
					or(
						ilike(organizationPrompts.title, term),
						ilike(organizationPrompts.description, term),
						ilike(organizationPrompts.content, term),
					),
				);
			}

			const promptsList = await db
				.select()
				.from(organizationPrompts)
				.where(and(...conditions))
				.orderBy(
					desc(organizationPrompts.isFavorite),
					desc(organizationPrompts.usageCount),
					desc(organizationPrompts.createdAt),
				);

			res.json({ success: true, data: promptsList });
		} catch (err: any) {
			logger.error(
				`List Organization Prompts Error: ${err?.message || String(err)}`,
			);
			res.status(500).json({
				success: false,
				error: "Failed to fetch organization prompts",
			});
		}
	},
);

// GET /api/v1/org/prompts/:id
orgPromptsRouter.get(
	"/:id",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const id = req.params.id as string;
			const [prompt] = await db
				.select()
				.from(organizationPrompts)
				.where(eq(organizationPrompts.id, id))
				.limit(1);

			if (!prompt) {
				return res
					.status(404)
					.json({ success: false, error: "Prompt not found" });
			}

			res.json({ success: true, data: prompt });
		} catch (err: any) {
			logger.error(
				`Get Organization Prompt Error: ${err?.message || String(err)}`,
			);
			res
				.status(500)
				.json({ success: false, error: "Failed to fetch prompt details" });
		}
	},
);

// POST /api/v1/org/prompts
orgPromptsRouter.post(
	"/",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const { title, description, category, content, variables } = req.body;

			if (!title || typeof title !== "string" || !title.trim()) {
				return res
					.status(400)
					.json({ success: false, error: "Prompt title is required" });
			}
			if (!content || typeof content !== "string" || !content.trim()) {
				return res
					.status(400)
					.json({ success: false, error: "Prompt content is required" });
			}

			const promptId = uuidv4();
			const [created] = await db
				.insert(organizationPrompts)
				.values({
					id: promptId,
					workspaceId,
					createdByUserId: userId,
					title: title.trim(),
					description: description ? description.trim() : null,
					category: category || "Projects",
					content: content.trim(),
					variables: Array.isArray(variables) ? variables : [],
					isBuiltin: false,
					isFavorite: false,
					usageCount: 0,
				})
				.returning();

			res.json({
				success: true,
				data: created,
				message: "Organization prompt created successfully",
			});
		} catch (err: any) {
			logger.error(
				`Create Organization Prompt Error: ${err?.message || String(err)}`,
			);
			res
				.status(500)
				.json({ success: false, error: "Failed to create prompt" });
		}
	},
);

// PUT /api/v1/org/prompts/:id
orgPromptsRouter.put(
	"/:id",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const id = req.params.id as string;
			const { title, description, category, content, variables } = req.body;

			const [existing] = await db
				.select()
				.from(organizationPrompts)
				.where(eq(organizationPrompts.id, id))
				.limit(1);

			if (!existing) {
				return res
					.status(404)
					.json({ success: false, error: "Prompt not found" });
			}

			const updatePayload: any = { updatedAt: new Date() };
			if (title !== undefined) updatePayload.title = String(title).trim();
			if (description !== undefined)
				updatePayload.description = description
					? String(description).trim()
					: null;
			if (category !== undefined) updatePayload.category = String(category);
			if (content !== undefined) updatePayload.content = String(content).trim();
			if (variables !== undefined && Array.isArray(variables))
				updatePayload.variables = variables;

			const [updated] = await db
				.update(organizationPrompts)
				.set(updatePayload)
				.where(eq(organizationPrompts.id, id))
				.returning();

			res.json({
				success: true,
				data: updated,
				message: "Prompt updated successfully",
			});
		} catch (err: any) {
			logger.error(
				`Update Organization Prompt Error: ${err?.message || String(err)}`,
			);
			res
				.status(500)
				.json({ success: false, error: "Failed to update prompt" });
		}
	},
);

// POST /api/v1/org/prompts/:id/favorite
orgPromptsRouter.post(
	"/:id/favorite",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const id = req.params.id as string;
			const [existing] = await db
				.select()
				.from(organizationPrompts)
				.where(eq(organizationPrompts.id, id))
				.limit(1);

			if (!existing) {
				return res
					.status(404)
					.json({ success: false, error: "Prompt not found" });
			}

			const [updated] = await db
				.update(organizationPrompts)
				.set({ isFavorite: !existing.isFavorite, updatedAt: new Date() })
				.where(eq(organizationPrompts.id, id))
				.returning();

			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Favorite Prompt Error: ${err?.message || String(err)}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to update favorite status" });
		}
	},
);

// POST /api/v1/org/prompts/:id/use
orgPromptsRouter.post(
	"/:id/use",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const id = req.params.id as string;
			const [existing] = await db
				.select()
				.from(organizationPrompts)
				.where(eq(organizationPrompts.id, id))
				.limit(1);

			if (existing) {
				await db
					.update(organizationPrompts)
					.set({ usageCount: existing.usageCount + 1, updatedAt: new Date() })
					.where(eq(organizationPrompts.id, id));
			}

			res.json({ success: true, message: "Prompt usage recorded" });
		} catch (err: any) {
			logger.error(`Use Prompt Error: ${err?.message || String(err)}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to update usage count" });
		}
	},
);

// DELETE /api/v1/org/prompts/:id
orgPromptsRouter.delete(
	"/:id",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const id = req.params.id as string;
			const [existing] = await db
				.select()
				.from(organizationPrompts)
				.where(eq(organizationPrompts.id, id))
				.limit(1);

			if (!existing) {
				return res
					.status(404)
					.json({ success: false, error: "Prompt not found" });
			}
			if (existing.isBuiltin) {
				return res.status(400).json({
					success: false,
					error: "Built-in prompts cannot be deleted",
				});
			}

			await db
				.delete(organizationPrompts)
				.where(eq(organizationPrompts.id, id));
			res.json({ success: true, message: "Prompt deleted successfully" });
		} catch (err: any) {
			logger.error(
				`Delete Organization Prompt Error: ${err?.message || String(err)}`,
			);
			res
				.status(500)
				.json({ success: false, error: "Failed to delete prompt" });
		}
	},
);
