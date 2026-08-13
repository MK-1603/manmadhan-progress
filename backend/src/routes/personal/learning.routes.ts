import { and, desc, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/db";
import {
	personalLearningSessions,
	personalSkills,
} from "../../../database/schema/personal.schema";
import { getUserId } from "../../middleware/auth";
import { authenticate } from "../../middleware/auth.middleware";
import { socketService } from "../../services/socket.service";
import logger from "../../utils/logger";

export const personalLearningRouter = Router();

personalLearningRouter.use(authenticate);

// --- SKILLS ---

// 1. Get all skills for the current user
personalLearningRouter.get("/skills", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const skills = await personalDb.query.personalSkills.findMany({
			where: eq(personalSkills.ownerUserId, userId),
			orderBy: [desc(personalSkills.updatedAt)],
		});

		res.json({ success: true, data: skills });
	} catch (error: any) {
		logger.error(`Get Skills Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch skills" });
	}
});

// 2. Create a skill
personalLearningRouter.post("/skills", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const {
			name,
			description,
			category,
			currentLevel,
			targetLevel,
			progressPercent,
			status,
		} = req.body;

		if (!name)
			return res
				.status(400)
				.json({ success: false, error: "Name is required" });

		const newId = uuidv4();
		const [newSkill] = await personalDb
			.insert(personalSkills)
			.values({
				id: newId,
				ownerUserId: userId,
				name,
				description,
				category,
				currentLevel: currentLevel || "Beginner",
				targetLevel: targetLevel || "Expert",
				progressPercent: progressPercent || 0,
				status: status || "Learning",
			})
			.returning();

		socketService.emitToUser(userId, "skill_created", newSkill);
		res.status(201).json({ success: true, data: newSkill });
	} catch (error: any) {
		logger.error(`Create Skill Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to create skill" });
	}
});

// 3. Update a skill
personalLearningRouter.patch(
	"/skills/:id",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			const skillId = req.params.id as string;
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const {
				name,
				description,
				category,
				currentLevel,
				targetLevel,
				progressPercent,
				status,
			} = req.body;

			const [updatedSkill] = await personalDb
				.update(personalSkills)
				.set({
					name,
					description,
					category,
					currentLevel,
					targetLevel,
					progressPercent,
					status,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(personalSkills.id, skillId),
						eq(personalSkills.ownerUserId, userId),
					),
				)
				.returning();

			if (!updatedSkill)
				return res
					.status(404)
					.json({ success: false, error: "Skill not found" });

			socketService.emitToUser(userId, "skill_updated", updatedSkill);
			res.json({ success: true, data: updatedSkill });
		} catch (error: any) {
			logger.error(`Update Skill Error: ${error.message}`);
			res.status(500).json({ success: false, error: "Failed to update skill" });
		}
	},
);

// 4. Delete a skill
personalLearningRouter.delete(
	"/skills/:id",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			const skillId = req.params.id as string;
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const [deletedSkill] = await personalDb
				.delete(personalSkills)
				.where(
					and(
						eq(personalSkills.id, skillId),
						eq(personalSkills.ownerUserId, userId),
					),
				)
				.returning();

			if (!deletedSkill)
				return res
					.status(404)
					.json({ success: false, error: "Skill not found" });

			socketService.emitToUser(userId, "skill_deleted", { id: skillId });
			res.json({ success: true, data: deletedSkill });
		} catch (error: any) {
			logger.error(`Delete Skill Error: ${error.message}`);
			res.status(500).json({ success: false, error: "Failed to delete skill" });
		}
	},
);

// --- SESSIONS ---

// 5. Get sessions for a skill
personalLearningRouter.get(
	"/skills/:id/sessions",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			const skillId = req.params.id as string;
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const sessions = await personalDb.query.personalLearningSessions.findMany(
				{
					where: and(
						eq(personalLearningSessions.skillId, skillId),
						eq(personalLearningSessions.ownerUserId, userId),
					),
					orderBy: [desc(personalLearningSessions.date)],
				},
			);

			res.json({ success: true, data: sessions });
		} catch (error: any) {
			logger.error(`Get Sessions Error: ${error.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to fetch sessions" });
		}
	},
);

// 6. Log a learning session
personalLearningRouter.post(
	"/skills/:id/sessions",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			const skillId = req.params.id as string;
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const { topic, durationMinutes, notes, date } = req.body;

			if (!durationMinutes)
				return res
					.status(400)
					.json({ success: false, error: "Duration is required" });

			const newId = uuidv4();
			const [newSession] = await personalDb
				.insert(personalLearningSessions)
				.values({
					id: newId,
					skillId,
					ownerUserId: userId,
					topic,
					durationMinutes,
					notes,
					date: date ? new Date(date) : new Date(),
				})
				.returning();

			socketService.emitToUser(userId, "learning_session_created", newSession);
			res.status(201).json({ success: true, data: newSession });
		} catch (error: any) {
			logger.error(`Create Session Error: ${error.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to create session" });
		}
	},
);

// 7. Delete a learning session
personalLearningRouter.delete(
	"/sessions/:id",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			const sessionId = req.params.id as string;
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const [deletedSession] = await personalDb
				.delete(personalLearningSessions)
				.where(
					and(
						eq(personalLearningSessions.id, sessionId),
						eq(personalLearningSessions.ownerUserId, userId),
					),
				)
				.returning();

			if (!deletedSession)
				return res
					.status(404)
					.json({ success: false, error: "Session not found" });

			socketService.emitToUser(userId, "learning_session_deleted", {
				id: sessionId,
				skillId: deletedSession.skillId,
			});
			res.json({ success: true, data: deletedSession });
		} catch (error: any) {
			logger.error(`Delete Session Error: ${error.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to delete session" });
		}
	},
);
