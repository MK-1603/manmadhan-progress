import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { personalGoals, personalActivityLogs, personalMilestones, personalTasks, personalHabits } from "../../../database/schema/personal.schema";
import { eq, and, desc, ilike, gte } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const personalGoalsRouter = Router();

personalGoalsRouter.use(authenticate);

// GET /api/v1/personal/goals
personalGoalsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, category } = req.query;

    let conditions = [eq(personalGoals.ownerUserId, user.id as string)];

    if (status && status !== "All") {
      conditions.push(eq(personalGoals.status, status as string));
    }
    if (category && category !== "All") {
      conditions.push(eq(personalGoals.category, category as string));
    }

    const goals = await personalDb
      .select()
      .from(personalGoals)
      .where(and(...conditions))
      .orderBy(desc(personalGoals.createdAt));

    return res.status(200).json({ success: true, data: goals });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/personal/goals/:id
personalGoalsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const goalId = req.params.id as string;

    const [goal] = await personalDb
      .select()
      .from(personalGoals)
      .where(and(eq(personalGoals.id, goalId), eq(personalGoals.ownerUserId, user.id as string)));

    if (!goal) return res.status(404).json({ success: false, error: "Goal not found" });

    return res.status(200).json({ success: true, data: goal });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/personal/goals
personalGoalsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      name,
      description,
      category,
      startDate,
      targetDate,
      priority,
      targetValue,
      unit,
      motivation,
      successCriteria
    } = req.body;

    if (!name) return res.status(400).json({ success: false, error: "Goal name is required" });

    const newGoalId = uuidv4();

    await personalDb.transaction(async (tx) => {
      await tx.insert(personalGoals).values({
        id: newGoalId,
        ownerUserId: user.id as string,
        name,
        description,
        category: category || "Personal",
        startDate: startDate ? new Date(startDate) : new Date(),
        targetDate: targetDate ? new Date(targetDate) : null,
        priority: priority || "Medium",
        targetValue: targetValue ? parseInt(targetValue) : null,
        unit,
        motivation,
        successCriteria: successCriteria || [],
      });

      await tx.insert(personalActivityLogs).values({
        id: uuidv4(),
        ownerUserId: user.id as string,
        eventType: "Goal created",
        details: `Goal "${name}" was created`,
      });
    });

    const [createdGoal] = await personalDb.select().from(personalGoals).where(eq(personalGoals.id, newGoalId));

    return res.status(201).json({ success: true, data: createdGoal });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/personal/goals/:id
personalGoalsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const goalId = req.params.id as string;
    const updates = req.body;

    const [existing] = await personalDb.select().from(personalGoals).where(and(eq(personalGoals.id, goalId), eq(personalGoals.ownerUserId, user.id as string)));
    if (!existing) return res.status(404).json({ success: false, error: "Goal not found" });

    if (updates.status === "Completed" && existing.status !== "Completed") {
      updates.completedAt = new Date();
    }
    if (updates.status === "Archived" && existing.status !== "Archived") {
      updates.archivedAt = new Date();
    }

    updates.updatedAt = new Date();

    const [updatedGoal] = await personalDb
      .update(personalGoals)
      .set(updates)
      .where(eq(personalGoals.id, goalId))
      .returning();

    return res.status(200).json({ success: true, data: updatedGoal });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/personal/goals/:id
personalGoalsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const goalId = req.params.id as string;

    const [deletedGoal] = await personalDb
      .delete(personalGoals)
      .where(and(eq(personalGoals.id, goalId), eq(personalGoals.ownerUserId, user.id as string)))
      .returning();

    if (!deletedGoal) return res.status(404).json({ success: false, error: "Goal not found" });

    return res.status(200).json({ success: true, data: deletedGoal });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
