 import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { progressUpdates, auditLogs } from "../../database/schema";
import { strictAuth } from "../middleware/auth.middleware";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const progressRouter = Router();

progressRouter.use(strictAuth);

// GET /api/v1/progress - List all progress updates
progressRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const allProgress = await db.select().from(progressUpdates).orderBy(desc(progressUpdates.createdAt));
    return res.json({ success: true, data: allProgress });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/progress - Submit a progress update
progressRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { taskId, projectId, content, type, mood, blockers } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, error: "Content is required" });
    }

    const newProgress = await db.insert(progressUpdates).values({
      id: uuidv4(),
      userId: user.id,
      workspaceId: user.workspaceId,
      taskId,
      projectId,
      content,
      type: type || "Daily",
      mood,
      blockers
    }).returning();

    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.id,
      workspaceId: user.workspaceId,
      eventType: "PROGRESS_UPDATE_SUBMITTED",
      details: `Submitted progress update for ${taskId ? 'Task' : 'Project'}`
    });
    
    return res.status(201).json({ success: true, data: newProgress[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
