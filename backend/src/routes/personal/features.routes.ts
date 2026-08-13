import { and, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/client";
import {
	personalFeatures,
	personalProjects,
} from "../../../database/schema/personal.schema";
import { authenticate } from "../../middleware/auth.middleware";
import { logger } from "../../services/logger.service";

export const personalFeaturesRouter = Router({ mergeParams: true });
personalFeaturesRouter.use(authenticate);

const getUserId = (req: Request) => (req as any).user?.id;

// GET /api/v1/personal/projects/:projectId/features
personalFeaturesRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const { projectId } = req.params;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		// Verify project ownership
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

		const features = await personalDb.query.personalFeatures.findMany({
			where: eq(personalFeatures.projectId, projectId),
			orderBy: (f, { asc }) => [asc(f.createdAt)],
		});

		res.json({ success: true, data: features });
	} catch (err: any) {
		logger.error(`Get features error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch features" });
	}
});

// POST /api/v1/personal/projects/:projectId/features
personalFeaturesRouter.post("/", async (req: Request, res: Response) => {
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

		const { name, description, priority, status } = req.body;
		if (!name?.trim())
			return res
				.status(400)
				.json({ success: false, error: "Feature name is required" });

		const [feature] = await personalDb
			.insert(personalFeatures)
			.values({
				id: uuidv4(),
				projectId,
				name: name.trim(),
				description: description || null,
				priority: priority || "MEDIUM",
				status: status || "PLANNED",
			})
			.returning();

		res.status(201).json({ success: true, data: feature });
	} catch (err: any) {
		logger.error(`Create feature error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to create feature" });
	}
});

// PATCH /api/v1/personal/projects/:projectId/features/:featureId
personalFeaturesRouter.patch(
	"/:featureId",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			const { projectId, featureId } = req.params;
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

			const { name, description, priority, status } = req.body;
			const updateData: any = { updatedAt: new Date() };
			if (name !== undefined) updateData.name = name;
			if (description !== undefined) updateData.description = description;
			if (priority !== undefined) updateData.priority = priority;
			if (status !== undefined) updateData.status = status;

			const [updated] = await personalDb
				.update(personalFeatures)
				.set(updateData)
				.where(
					and(
						eq(personalFeatures.id, featureId),
						eq(personalFeatures.projectId, projectId),
					),
				)
				.returning();

			if (!updated)
				return res
					.status(404)
					.json({ success: false, error: "Feature not found" });
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Update feature error: ${err.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to update feature" });
		}
	},
);

// DELETE /api/v1/personal/projects/:projectId/features/:featureId
personalFeaturesRouter.delete(
	"/:featureId",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			const { projectId, featureId } = req.params;
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
				.delete(personalFeatures)
				.where(
					and(
						eq(personalFeatures.id, featureId),
						eq(personalFeatures.projectId, projectId),
					),
				);

			res.json({ success: true, message: "Feature deleted" });
		} catch (err: any) {
			logger.error(`Delete feature error: ${err.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to delete feature" });
		}
	},
);

// POST /api/v1/personal/projects/:projectId/features/bulk — create multiple features at once
personalFeaturesRouter.post("/bulk", async (req: Request, res: Response) => {
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

		const { features } = req.body;
		if (!Array.isArray(features) || features.length === 0) {
			return res
				.status(400)
				.json({ success: false, error: "Features array is required" });
		}

		const inserts = features.map((f: any) => ({
			id: uuidv4(),
			projectId,
			name: f.name || "Unnamed Feature",
			description: f.description || null,
			priority: f.priority || "MEDIUM",
			status: f.status || "PLANNED",
		}));

		const created = await personalDb
			.insert(personalFeatures)
			.values(inserts)
			.returning();
		res.status(201).json({ success: true, data: created });
	} catch (err: any) {
		logger.error(`Bulk create features error: ${err.message}`);
		res
			.status(500)
			.json({ success: false, error: "Failed to create features" });
	}
});
