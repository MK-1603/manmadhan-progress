import { and, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/client";
import {
	personalProjects,
	personalRequirements,
} from "../../../database/schema/personal.schema";
import { authenticate } from "../../middleware/auth.middleware";
import { logger } from "../../services/logger.service";

export const personalRequirementsRouter = Router({ mergeParams: true });
personalRequirementsRouter.use(authenticate);

const getUserId = (req: Request) => (req as any).user?.id;

// GET /api/v1/personal/projects/:projectId/requirements
personalRequirementsRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const { projectId } = req.params;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const project = await personalDb.query.personalProjects.findFirst({
			where: and(
				eq(personalProjects.id, projectId),
				eq(personalProjects.ownerUserId, userId),
			),
		});
		if (!project)
			return res
				.status(404)
				.json({ success: false, error: "Project not found" });

		const requirements = await personalDb.query.personalRequirements.findMany({
			where: eq(personalRequirements.projectId, projectId),
			orderBy: (r, { asc }) => [asc(r.createdAt)],
		});

		res.json({ success: true, data: requirements });
	} catch (err: any) {
		logger.error("Get requirements error: " + err.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to fetch requirements" });
	}
});

// POST /api/v1/personal/projects/:projectId/requirements
personalRequirementsRouter.post("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const { projectId } = req.params;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const project = await personalDb.query.personalProjects.findFirst({
			where: and(
				eq(personalProjects.id, projectId),
				eq(personalProjects.ownerUserId, userId),
			),
		});
		if (!project)
			return res
				.status(404)
				.json({ success: false, error: "Project not found" });

		const { title, description, category, status } = req.body;
		if (!title?.trim())
			return res
				.status(400)
				.json({ success: false, error: "Requirement title is required" });

		const [req_] = await personalDb
			.insert(personalRequirements)
			.values({
				id: uuidv4(),
				projectId,
				title: title.trim(),
				description: description || null,
				category: category || "Functional",
				status: status || "PLANNED",
			})
			.returning();

		res.status(201).json({ success: true, data: req_ });
	} catch (err: any) {
		logger.error("Create requirement error: " + err.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to create requirement" });
	}
});

// PATCH /api/v1/personal/projects/:projectId/requirements/:requirementId
personalRequirementsRouter.patch(
	"/:requirementId",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			const { projectId, requirementId } = req.params;
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const project = await personalDb.query.personalProjects.findFirst({
				where: and(
					eq(personalProjects.id, projectId),
					eq(personalProjects.ownerUserId, userId),
				),
			});
			if (!project)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const { title, description, category, status } = req.body;
			const updateData: any = { updatedAt: new Date() };
			if (title !== undefined) updateData.title = title;
			if (description !== undefined) updateData.description = description;
			if (category !== undefined) updateData.category = category;
			if (status !== undefined) updateData.status = status;

			const [updated] = await personalDb
				.update(personalRequirements)
				.set(updateData)
				.where(
					and(
						eq(personalRequirements.id, requirementId),
						eq(personalRequirements.projectId, projectId),
					),
				)
				.returning();

			if (!updated)
				return res
					.status(404)
					.json({ success: false, error: "Requirement not found" });
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error("Update requirement error: " + err.message);
			res
				.status(500)
				.json({ success: false, error: "Failed to update requirement" });
		}
	},
);

// DELETE /api/v1/personal/projects/:projectId/requirements/:requirementId
personalRequirementsRouter.delete(
	"/:requirementId",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			const { projectId, requirementId } = req.params;
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const project = await personalDb.query.personalProjects.findFirst({
				where: and(
					eq(personalProjects.id, projectId),
					eq(personalProjects.ownerUserId, userId),
				),
			});
			if (!project)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			await personalDb
				.delete(personalRequirements)
				.where(
					and(
						eq(personalRequirements.id, requirementId),
						eq(personalRequirements.projectId, projectId),
					),
				);

			res.json({ success: true, message: "Requirement deleted" });
		} catch (err: any) {
			logger.error("Delete requirement error: " + err.message);
			res
				.status(500)
				.json({ success: false, error: "Failed to delete requirement" });
		}
	},
);

// POST bulk
personalRequirementsRouter.post(
	"/bulk",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			const { projectId } = req.params;
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const project = await personalDb.query.personalProjects.findFirst({
				where: and(
					eq(personalProjects.id, projectId),
					eq(personalProjects.ownerUserId, userId),
				),
			});
			if (!project)
				return res
					.status(404)
					.json({ success: false, error: "Project not found" });

			const { requirements } = req.body;
			if (!Array.isArray(requirements) || requirements.length === 0) {
				return res
					.status(400)
					.json({ success: false, error: "Requirements array is required" });
			}

			const inserts = requirements.map((r: any) => ({
				id: uuidv4(),
				projectId,
				title: r.title || "Unnamed Requirement",
				description: r.description || null,
				category: r.category || "Functional",
				status: r.status || "PLANNED",
			}));

			const created = await personalDb
				.insert(personalRequirements)
				.values(inserts)
				.returning();
			res.status(201).json({ success: true, data: created });
		} catch (err: any) {
			logger.error("Bulk create requirements error: " + err.message);
			res
				.status(500)
				.json({ success: false, error: "Failed to create requirements" });
		}
	},
);
