import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { personalSkills, personalLearningSessions, personalActivityLogs } from "../../../database/schema/personal.schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const personalLearningRouter = Router();
personalLearningRouter.use(authenticate);

// GET /api/v1/personal/learning
personalLearningRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const skills = await personalDb
      .select()
      .from(personalSkills)
      .where(eq(personalSkills.ownerUserId, user.id as string))
      .orderBy(desc(personalSkills.createdAt));

    return res.status(200).json({ success: true, data: skills });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/personal/learning
personalLearningRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, description, category, currentLevel, targetLevel } = req.body;

    if (!name) return res.status(400).json({ success: false, error: "Skill name is required" });

    const newSkillId = uuidv4();

    await personalDb.transaction(async (tx) => {
      await tx.insert(personalSkills).values({
        id: newSkillId,
        ownerUserId: user.id as string,
        name,
        description,
        category,
        currentLevel: currentLevel || "Beginner",
        targetLevel: targetLevel || "Expert",
      });

      await tx.insert(personalActivityLogs).values({
        id: uuidv4(),
        ownerUserId: user.id as string,
        eventType: "Skill added",
        details: `Started learning "${name}"`,
      });
    });

    const [created] = await personalDb.select().from(personalSkills).where(eq(personalSkills.id, newSkillId));
    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/personal/learning/:id/sessions
personalLearningRouter.get("/:id/sessions", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const skillId = req.params.id as string;

    const sessions = await personalDb
      .select()
      .from(personalLearningSessions)
      .where(and(eq(personalLearningSessions.skillId, skillId as string), eq(personalLearningSessions.ownerUserId, user.id as string)))
      .orderBy(desc(personalLearningSessions.date));

    return res.status(200).json({ success: true, data: sessions });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/personal/learning/:id/sessions
personalLearningRouter.post("/:id/sessions", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const skillId = req.params.id as string;
    const { topic, durationMinutes, notes } = req.body;

    if (!durationMinutes) return res.status(400).json({ success: false, error: "Duration is required" });

    await personalDb.transaction(async (tx) => {
      await tx.insert(personalLearningSessions).values({
        id: uuidv4(),
        skillId,
        ownerUserId: user.id as string,
        topic,
        durationMinutes: parseInt(durationMinutes),
        notes,
      });

      // Simple pseudo-progress update: add 1% for every 10 minutes (max 100)
      const [skill] = await tx.select().from(personalSkills).where(eq(personalSkills.id, skillId as string));
      if (skill) {
        const addedProgress = Math.floor(parseInt(durationMinutes) / 10);
        const newProgress = Math.min(100, (skill.progressPercent || 0) + addedProgress);
        await tx.update(personalSkills)
          .set({ progressPercent: newProgress, updatedAt: new Date() })
          .where(eq(personalSkills.id, skillId as string));
      }
    });

    return res.status(201).json({ success: true, message: "Session logged" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default personalLearningRouter;
