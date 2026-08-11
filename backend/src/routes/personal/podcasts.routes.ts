import { and, desc, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/db";
import {
	personalPodcastEpisodes,
	personalPodcasts,
} from "../../../database/schema/personal.schema";
import { getUserId } from "../../middleware/auth";
import { authenticate } from "../../middleware/auth.middleware";
import { socketService } from "../../services/socket.service";
import logger from "../../utils/logger";

export const personalPodcastsRouter = Router();

personalPodcastsRouter.use(authenticate);

// --- PODCASTS ---

// 1. Get all podcasts for the current user
personalPodcastsRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const podcasts = await personalDb.query.personalPodcasts.findMany({
			where: eq(personalPodcasts.ownerUserId, userId),
			orderBy: [desc(personalPodcasts.updatedAt)],
		});

		res.json({ success: true, data: podcasts });
	} catch (error: any) {
		logger.error("Get Podcasts Error: " + error.message);
		res.status(500).json({ success: false, error: "Failed to fetch podcasts" });
	}
});

// 2. Create a podcast
personalPodcastsRouter.post("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { title, host, publisher, description, coverUrl, topic, category } =
			req.body;

		if (!title)
			return res
				.status(400)
				.json({ success: false, error: "Title is required" });

		const newId = uuidv4();
		const [newPodcast] = await personalDb
			.insert(personalPodcasts)
			.values({
				id: newId,
				ownerUserId: userId,
				title,
				publisher: publisher || host || null,
				description: description || null,
				coverUrl: coverUrl || null,
				category: category || topic || "General",
			})
			.returning();

		socketService.emitToUser(userId, "podcast_created", newPodcast);
		res.status(201).json({ success: true, data: newPodcast });
	} catch (error: any) {
		logger.error("Create Podcast Error: " + error.message);
		res.status(500).json({ success: false, error: "Failed to create podcast" });
	}
});

// 3. Update a podcast
personalPodcastsRouter.patch("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const podcastId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { title, host, publisher, description, coverUrl, topic, category } =
			req.body;

		const [updatedPodcast] = await personalDb
			.update(personalPodcasts)
			.set({
				title,
				publisher: publisher || host,
				description,
				coverUrl,
				category: category || topic,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(personalPodcasts.id, podcastId),
					eq(personalPodcasts.ownerUserId, userId),
				),
			)
			.returning();

		if (!updatedPodcast)
			return res
				.status(404)
				.json({ success: false, error: "Podcast not found" });

		socketService.emitToUser(userId, "podcast_updated", updatedPodcast);
		res.json({ success: true, data: updatedPodcast });
	} catch (error: any) {
		logger.error("Update Podcast Error: " + error.message);
		res.status(500).json({ success: false, error: "Failed to update podcast" });
	}
});

// 4. Delete a podcast
personalPodcastsRouter.delete("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const podcastId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const [deletedPodcast] = await personalDb
			.delete(personalPodcasts)
			.where(
				and(
					eq(personalPodcasts.id, podcastId),
					eq(personalPodcasts.ownerUserId, userId),
				),
			)
			.returning();

		if (!deletedPodcast)
			return res
				.status(404)
				.json({ success: false, error: "Podcast not found" });

		socketService.emitToUser(userId, "podcast_deleted", { id: podcastId });
		res.json({ success: true, data: deletedPodcast });
	} catch (error: any) {
		logger.error("Delete Podcast Error: " + error.message);
		res.status(500).json({ success: false, error: "Failed to delete podcast" });
	}
});
