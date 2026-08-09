import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { personalDailyScores, personalFocusSessions, personalTasks, personalHabits, personalHabitLogs } from "../../../database/schema/personal.schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const intelligenceRouter = Router();
intelligenceRouter.use(authenticate);

// Start Focus Session
intelligenceRouter.post("/focus/start", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { taskId, projectId } = req.body;
    
    const newId = uuidv4();
    await personalDb.insert(personalFocusSessions).values({
      id: newId,
      ownerUserId: user.id as string,
      taskId,
      projectId,
      startTime: new Date(),
      status: "Active", // Custom status tracking could be used here
    });

    return res.status(201).json({ success: true, data: { id: newId } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Complete Focus Session
intelligenceRouter.post("/focus/complete", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { sessionId, durationMinutes } = req.body;
    
    await personalDb.update(personalFocusSessions)
      .set({
        endTime: new Date(),
        durationMinutes,
        status: "Completed",
      })
      .where(and(eq(personalFocusSessions.id, sessionId), eq(personalFocusSessions.ownerUserId, user.id as string)));

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get Productivity Daily Summary (Today's Execution)
intelligenceRouter.get("/productivity/today", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Mocking the aggregate values for the prototype:
    // Ideally we would query Tasks completed today, Habits completed today, and sum Focus duration today.

    const tasksCompleted = await personalDb
      .select()
      .from(personalTasks)
      .where(and(eq(personalTasks.ownerUserId, user.id as string), eq(personalTasks.status, "COMPLETED"), gt(personalTasks.updatedAt, today)));

    const focusSessions = await personalDb
      .select()
      .from(personalFocusSessions)
      .where(and(eq(personalFocusSessions.ownerUserId, user.id as string), eq(personalFocusSessions.status, "Completed"), gt(personalFocusSessions.startTime, today)));
    
    const focusMinutes = focusSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    const habitLogs = await personalDb
      .select()
      .from(personalHabitLogs)
      .where(and(eq(personalHabitLogs.ownerUserId, user.id as string), eq(personalHabitLogs.completed, true)));
    const todayStr = new Date().toISOString().split('T')[0];
    const habitsToday = habitLogs.filter(h => h.date === todayStr);

    // Calculate a rough score
    const score = (tasksCompleted.length * 10) + (habitsToday.length * 5) + Math.floor(focusMinutes / 10);

    return res.status(200).json({
      success: true,
      data: {
        score,
        tasksCompleted: tasksCompleted.length,
        focusMinutes,
        habitsCompleted: habitsToday.length,
        date: todayStr
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get Analytics (Long-term Trends)
intelligenceRouter.get("/analytics/trends", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // In a real system, you'd aggregate daily scores over the last 30 days.
    // For this prototype, we'll return some generated mock trend data representing the last 7 days.
    const trends = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toISOString().split('T')[0],
        score: Math.floor(Math.random() * 50) + 50, // 50-100 score
        focusMinutes: Math.floor(Math.random() * 120),
        tasksCompleted: Math.floor(Math.random() * 10),
      };
    });

    return res.status(200).json({ success: true, data: trends });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default intelligenceRouter;
