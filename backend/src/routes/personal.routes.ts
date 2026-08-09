import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { goals, notes, journals, ideas, habits, reminders, auditLogs } from "../../database/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../services/logger.service";

export const personalRouter = Router();

personalRouter.use(authenticate);

// ==========================================
// GOALS
// ==========================================
personalRouter.get("/goals", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace ID required" });

    const userGoals = await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)))
      .orderBy(desc(goals.createdAt));

    res.json({ success: true, data: userGoals });
  } catch (error: any) {
    logger.error("GET /goals error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

personalRouter.get("/goals/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await db.select().from(goals).where(and(eq(goals.id, String(req.params.id)), eq(goals.userId, userId))).limit(1);
    if (!result[0]) return res.status(404).json({ success: false, error: "Goal not found" });
    return res.json({ success: true, data: result[0] });
  } catch (error: any) {
    logger.error("GET /goals/:id error: " + error.message);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

personalRouter.post("/goals", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { title, description, deadline, workspaceId } = req.body;
    if (!title || !workspaceId) return res.status(400).json({ success: false, error: "Title and Workspace ID required" });

    const newGoal = await db
      .insert(goals)
      .values({
        id: uuidv4(),
        workspaceId,
        userId,
        title,
        description,
        deadline: deadline ? new Date(deadline) : null,
      })
      .returning();

    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId,
      eventType: "GOAL_CREATED",
      details: `Created goal: ${title}`,
    });

    res.status(201).json({ success: true, data: newGoal[0] });
  } catch (error: any) {
    logger.error("POST /goals error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ==========================================
// NOTES
// ==========================================
personalRouter.get("/notes", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace ID required" });

    const userNotes = await db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.workspaceId, workspaceId)))
      .orderBy(desc(notes.createdAt));

    res.json({ success: true, data: userNotes });
  } catch (error: any) {
    logger.error("GET /notes error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

personalRouter.post("/notes", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { title, content, workspaceId } = req.body;
    if (!title || !workspaceId) return res.status(400).json({ success: false, error: "Title and Workspace ID required" });

    const newNote = await db
      .insert(notes)
      .values({
        id: uuidv4(),
        workspaceId,
        userId,
        title,
        content,
      })
      .returning();

    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId,
      eventType: "NOTE_CREATED",
      details: `Created note: ${title}`,
    });

    res.status(201).json({ success: true, data: newNote[0] });
  } catch (error: any) {
    logger.error("POST /notes error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ==========================================
// JOURNAL
// ==========================================
personalRouter.get("/journal", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace ID required" });

    const userJournals = await db
      .select()
      .from(journals)
      .where(and(eq(journals.userId, userId), eq(journals.workspaceId, workspaceId)))
      .orderBy(desc(journals.createdAt));

    res.json({ success: true, data: userJournals });
  } catch (error: any) {
    logger.error("GET /journal error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

personalRouter.post("/journal", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { content, mood, workspaceId } = req.body;
    if (!content || !workspaceId) return res.status(400).json({ success: false, error: "Content and Workspace ID required" });

    const newJournal = await db
      .insert(journals)
      .values({
        id: uuidv4(),
        workspaceId,
        userId,
        content,
        mood,
      })
      .returning();

    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId,
      eventType: "JOURNAL_CREATED",
      details: `Created a daily journal entry`,
    });

    res.status(201).json({ success: true, data: newJournal[0] });
  } catch (error: any) {
    logger.error("POST /journal error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ==========================================
// IDEAS
// ==========================================
personalRouter.get("/ideas", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace ID required" });

    const userIdeas = await db
      .select()
      .from(ideas)
      .where(and(eq(ideas.userId, userId), eq(ideas.workspaceId, workspaceId)))
      .orderBy(desc(ideas.createdAt));

    res.json({ success: true, data: userIdeas });
  } catch (error: any) {
    logger.error("GET /ideas error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

personalRouter.post("/ideas", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { title, content, workspaceId } = req.body;
    if (!title || !workspaceId) return res.status(400).json({ success: false, error: "Title and Workspace ID required" });

    const newIdea = await db
      .insert(ideas)
      .values({
        id: uuidv4(),
        workspaceId,
        userId,
        title,
        content,
      })
      .returning();

    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId,
      eventType: "IDEA_CREATED",
      details: `Created idea: ${title}`,
    });

    res.status(201).json({ success: true, data: newIdea[0] });
  } catch (error: any) {
    logger.error("POST /ideas error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ==========================================
// HABITS
// ==========================================
personalRouter.get("/habits", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace ID required" });

    const userHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.workspaceId, workspaceId)))
      .orderBy(desc(habits.createdAt));

    res.json({ success: true, data: userHabits });
  } catch (error: any) {
    logger.error("GET /habits error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

personalRouter.post("/habits", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { title, description, frequency, workspaceId } = req.body;
    if (!title || !workspaceId) return res.status(400).json({ success: false, error: "Title and Workspace ID required" });

    const newHabit = await db
      .insert(habits)
      .values({
        id: uuidv4(),
        workspaceId,
        userId,
        title,
        description,
        frequency: frequency || "Daily",
      })
      .returning();

    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId,
      eventType: "HABIT_CREATED",
      details: `Created habit: ${title}`,
    });

    res.status(201).json({ success: true, data: newHabit[0] });
  } catch (error: any) {
    logger.error("POST /habits error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

personalRouter.patch("/habits/:id/check", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;

    const existingList = await db.select().from(habits).where(eq(habits.id, id)).limit(1);
    if (existingList.length === 0) return res.status(404).json({ success: false, error: "Habit not found" });

    const habit = existingList[0];
    const newStreak = habit.streak + 1;

    const updated = await db
      .update(habits)
      .set({
        streak: newStreak,
        lastCompletedAt: new Date(),
      })
      .where(eq(habits.id, id))
      .returning();

    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId: habit.workspaceId,
      eventType: "HABIT_COMPLETED",
      details: `Completed habit: ${habit.title} (Streak: ${newStreak})`,
    });

    res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    logger.error("PATCH /habits/:id/check error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ==========================================
// REMINDERS
// ==========================================
personalRouter.get("/reminders", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace ID required" });

    const userReminders = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.workspaceId, workspaceId)))
      .orderBy(desc(reminders.createdAt));

    res.json({ success: true, data: userReminders });
  } catch (error: any) {
    logger.error("GET /reminders error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

personalRouter.post("/reminders", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { title, remindAt, workspaceId } = req.body;
    if (!title || !remindAt || !workspaceId) return res.status(400).json({ success: false, error: "Title, RemindAt, and Workspace ID required" });

    const newReminder = await db
      .insert(reminders)
      .values({
        id: uuidv4(),
        workspaceId,
        userId,
        title,
        remindAt: new Date(remindAt),
      })
      .returning();

    res.status(201).json({ success: true, data: newReminder[0] });
  } catch (error: any) {
    logger.error("POST /reminders error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

personalRouter.patch("/reminders/:id/complete", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const updated = await db
      .update(reminders)
      .set({ isCompleted: true })
      .where(eq(reminders.id, id))
      .returning();

    if (updated.length === 0) return res.status(404).json({ success: false, error: "Reminder not found" });

    res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    logger.error("PATCH /reminders/:id/complete error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
