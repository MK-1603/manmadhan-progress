import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { personalTasks, personalProjects, personalTaskFiles, personalActivityLogs, personalMilestones, personalSuccessCriteria } from "../../../database/schema/personal.schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const personalTasksRouter = Router();

personalTasksRouter.use(authenticate);

// GET /api/v1/personal/tasks
personalTasksRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, search, projectId } = req.query;

    let conditions = [eq(personalTasks.ownerUserId, user.id as string)];

    if (status && status !== "All") {
      conditions.push(eq(personalTasks.status, String(status)));
    }
    if (search) {
      conditions.push(ilike(personalTasks.title, `%${search}%`));
    }
    if (projectId) {
      conditions.push(eq(personalTasks.projectId, String(projectId)));
    }

    const result = await personalDb.select()
      .from(personalTasks)
      .where(and(...conditions))
      .orderBy(desc(personalTasks.createdAt));

    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/personal/tasks
personalTasksRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, description, projectId, milestoneId, type, tags, status, priority, deadline, estimatedMinutes, files, remindAt, syncToCalendar, focusDuration } = req.body;
    
    if (!title) return res.status(400).json({ success: false, error: "Task title is required" });

    // Validate project belongs to user if projectId is provided
    if (projectId) {
      const project = await personalDb.query.personalProjects.findFirst({
        where: and(eq(personalProjects.id, projectId), eq(personalProjects.ownerUserId, user.id as string))
      });
      if (!project) return res.status(400).json({ success: false, error: "Invalid projectId or unauthorized" });
    }

    const newTask = await personalDb.transaction(async (tx: any) => {
      const taskId = uuidv4();

      const insertedTask = await tx.insert(personalTasks).values({
        id: taskId,
        ownerUserId: user.id as string,
        projectId: projectId || null,
        milestoneId: milestoneId || null,
        title,
        description,
        type: type || "Task",
        tags: tags || [],
        status: status || "TODO",
        priority: priority || "Medium",
        deadline: deadline ? new Date(deadline) : null,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        remindAt: remindAt ? new Date(remindAt) : null,
        syncToCalendar: syncToCalendar || false,
        calendarEventId: syncToCalendar ? `mock-cal-event-${uuidv4()}` : null,
        focusDuration: focusDuration ? parseInt(focusDuration) : null,
      }).returning();

      // Handle Task Files
      if (files && Array.isArray(files) && files.length > 0) {
        // Insert Files
        const fileData = files.map((f) => ({
          id: uuidv4(),
          taskId,
          fileName: f.fileName,
          fileType: f.fileType,
          fileSize: f.fileSize,
          url: f.url
        }));
        await tx.insert(personalTaskFiles).values(fileData);
      }

      // Record Activity
      // Log Activity
      await tx.insert(personalActivityLogs).values({
        id: uuidv4(),
        ownerUserId: user.id as string,
        projectId: projectId || null,
        taskId,
        milestoneId: milestoneId || null,
        eventType: "Task created",
        details: `Created task "${title}"`,
      });

      return insertedTask[0];
    });

    return res.status(201).json({ success: true, data: newTask });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/personal/tasks/:id
personalTasksRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const taskId = req.params.id as string;
    const updates = req.body;

    const task = await personalDb.query.personalTasks.findFirst({
      where: and(eq(personalTasks.id, taskId), eq(personalTasks.ownerUserId, user.id as string))
    });

    if (!task) return res.status(404).json({ success: false, error: "Task not found" });

    if (updates.deadline) updates.deadline = new Date(updates.deadline);
    updates.updatedAt = new Date();

    if (updates.status === "COMPLETED" && task.status !== "COMPLETED") {
      updates.completedAt = new Date();
    } else if (updates.status !== "COMPLETED") {
      updates.completedAt = null;
    }

    const updated = await personalDb.update(personalTasks)
      .set(updates)
      .where(eq(personalTasks.id, taskId))
      .returning();

    return res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/personal/tasks/:id
personalTasksRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const taskId = req.params.id as string;

    const task = await personalDb.query.personalTasks.findFirst({
      where: and(eq(personalTasks.id, taskId), eq(personalTasks.ownerUserId, user.id as string))
    });

    if (!task) return res.status(404).json({ success: false, error: "Task not found" });

    await personalDb.delete(personalTasks).where(eq(personalTasks.id, taskId));
    return res.json({ success: true, message: "Task deleted" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
