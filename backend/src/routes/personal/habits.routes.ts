import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { personalHabits, personalHabitLogs, personalActivityLogs } from "../../../database/schema/personal.schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const personalHabitsRouter = Router();

personalHabitsRouter.use(authenticate);

// GET /api/v1/personal/habits
personalHabitsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status } = req.query;

    let conditions = [eq(personalHabits.ownerUserId, user.id as string)];

    if (status && status !== "All") {
      conditions.push(eq(personalHabits.status, status as string));
    }

    const habits = await personalDb
      .select()
      .from(personalHabits)
      .where(and(...conditions))
      .orderBy(desc(personalHabits.createdAt));

    return res.status(200).json({ success: true, data: habits });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/personal/habits/:id/logs
personalHabitsRouter.get("/:id/logs", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const habitId = req.params.id as string;

    const logs = await personalDb
      .select()
      .from(personalHabitLogs)
      .where(and(eq(personalHabitLogs.habitId, habitId as string), eq(personalHabitLogs.ownerUserId, user.id as string)))
      .orderBy(desc(personalHabitLogs.date));

    return res.status(200).json({ success: true, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/personal/habits
personalHabitsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      name,
      description,
      category,
      frequency,
      target,
      preferredTime,
    } = req.body;

    if (!name) return res.status(400).json({ success: false, error: "Habit name is required" });

    const newHabitId = uuidv4();

    await personalDb.transaction(async (tx) => {
      await tx.insert(personalHabits).values({
        id: newHabitId,
        ownerUserId: user.id as string,
        name,
        description,
        category: category || "Personal",
        frequency: frequency || "Daily",
        target: target ? parseInt(target) : 1,
        preferredTime,
      });

      await tx.insert(personalActivityLogs).values({
        id: uuidv4(),
        ownerUserId: user.id as string,
        eventType: "Habit created",
        details: `Habit "${name}" was created`,
      });
    });

    const [createdHabit] = await personalDb.select().from(personalHabits).where(eq(personalHabits.id, newHabitId));

    return res.status(201).json({ success: true, data: createdHabit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/personal/habits/:id/log
personalHabitsRouter.post("/:id/log", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const habitId = req.params.id as string;
    const { date, value, notes } = req.body; // date format: YYYY-MM-DD

    if (!date) return res.status(400).json({ success: false, error: "Date is required" });

    // Verify habit ownership
    const [habit] = await personalDb.select().from(personalHabits).where(and(eq(personalHabits.id, habitId as string), eq(personalHabits.ownerUserId, user.id as string)));
    if (!habit) return res.status(404).json({ success: false, error: "Habit not found" });

    const existingLog = await personalDb.select().from(personalHabitLogs).where(
      and(
        eq(personalHabitLogs.habitId, habitId as string),
        eq(personalHabitLogs.date, date)
      )
    );

    let finalLog;
    if (existingLog.length > 0) {
      // Toggle off or update
      if (value === 0 || value === false) {
        await personalDb.delete(personalHabitLogs).where(eq(personalHabitLogs.id, existingLog[0].id));
        return res.status(200).json({ success: true, message: "Habit log removed" });
      } else {
        const [updated] = await personalDb.update(personalHabitLogs).set({ value: value || 1, notes }).where(eq(personalHabitLogs.id, existingLog[0].id)).returning();
        finalLog = updated;
      }
    } else {
      if (value !== 0 && value !== false) {
        const [inserted] = await personalDb.insert(personalHabitLogs).values({
          id: uuidv4(),
          habitId,
          ownerUserId: user.id as string,
          date,
          value: value || 1,
          notes
        }).returning();
        finalLog = inserted;
      } else {
        return res.status(200).json({ success: true, message: "No action taken" });
      }
    }

    // (TODO: Streak recalculation could be triggered here asynchronously)

    return res.status(201).json({ success: true, data: finalLog });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/personal/habits/:id
personalHabitsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const habitId = req.params.id as string;

    const [deletedHabit] = await personalDb
      .delete(personalHabits)
      .where(and(eq(personalHabits.id, habitId as string), eq(personalHabits.ownerUserId, user.id as string)))
      .returning();

    if (!deletedHabit) return res.status(404).json({ success: false, error: "Habit not found" });

    return res.status(200).json({ success: true, data: deletedHabit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
