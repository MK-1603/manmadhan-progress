import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { timeTracking, auditLogs, tasks, projects } from "../../database/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { socketService } from "../services/socket.service";
import { logger } from "../services/logger.service";
import { v4 as uuidv4 } from "uuid";

export const focusRouter = Router();

focusRouter.use(authenticate);

// GET /api/v1/focus/active - Get the current active focus session (if any)
focusRouter.get("/active", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const workspaceId = req.query.workspaceId as string;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: "Workspace ID is required" });
    }

    // Find session for user in workspace where endTime is null
    const activeSessions = await db
      .select({
        id: timeTracking.id,
        userId: timeTracking.userId,
        workspaceId: timeTracking.workspaceId,
        taskId: timeTracking.taskId,
        startTime: timeTracking.startTime,
        endTime: timeTracking.endTime,
        durationSeconds: timeTracking.durationSeconds,
      })
      .from(timeTracking)
      .where(
        and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.workspaceId, workspaceId),
          isNull(timeTracking.endTime)
        )
      )
      .limit(1);

    if (activeSessions.length === 0) {
      return res.json({ success: true, active: false, data: null });
    }

    const activeSession = activeSessions[0];

    // Fetch task details if associated
    let task = null;
    let project = null;
    if (activeSession.taskId) {
      const taskRecords = await db.select().from(tasks).where(eq(tasks.id, activeSession.taskId)).limit(1);
      if (taskRecords.length > 0) {
        task = taskRecords[0];
        if (task.projectId) {
          const projectRecords = await db.select().from(projects).where(eq(projects.id, task.projectId)).limit(1);
          if (projectRecords.length > 0) {
            project = projectRecords[0];
          }
        }
      }
    }

    return res.json({
      success: true,
      active: true,
      data: {
        ...activeSession,
        task,
        project,
      },
    });
  } catch (error: any) {
    logger.error("Active Focus Session Fetch Error: " + error.message);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/v1/focus/start - Start a new focus session
focusRouter.post("/start", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { taskId, workspaceId } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: "Workspace ID is required" });
    }

    // Check if there is already an active session
    const existing = await db
      .select()
      .from(timeTracking)
      .where(
        and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.workspaceId, workspaceId),
          isNull(timeTracking.endTime)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: "A focus session is already active" });
    }

    // Retrieve task details if taskId is provided
    let taskTitle = "General Focus";
    let task = null;
    let taskAutoTransitioned = false;
    if (taskId) {
      const taskList = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (taskList.length > 0) {
        task = taskList[0];
        taskTitle = task.title;
        // Auto transition task status to "In Progress" if it is currently "Draft" or "Assigned".
        // NOTE: We track whether the task was auto-transitioned so we can include it in the
        // single batched socket event below — avoiding a double WORKSPACE_UPDATED emission.
        if (task.status === "Draft" || task.status === "Assigned") {
          await db.update(tasks).set({ status: "In Progress" }).where(eq(tasks.id, taskId));
          taskAutoTransitioned = true;
        }
      }
    }

    const sessionId = uuidv4();
    const startTime = new Date();

    const newSession = await db.insert(timeTracking).values({
      id: sessionId,
      userId,
      workspaceId,
      taskId: taskId || null,
      startTime,
    }).returning();

    // Log Activity
    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId,
      eventType: "FOCUS_STARTED",
      details: `Started focus session on '${taskTitle}'`,
    });

    // Notify Realtime — single batched event (avoids double WORKSPACE_UPDATED emission)
    socketService.emitToWorkspace(workspaceId, "FOCUS_STARTED", {
      type: "FOCUS_STARTED",
      userId,
      sessionId,
      ...(taskAutoTransitioned && { taskUpdated: true, taskId }),
    });

    return res.status(201).json({
      success: true,
      data: {
        ...newSession[0],
        task,
      },
    });
  } catch (error: any) {
    logger.error("Start Focus Session Error: " + error.message);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/v1/focus/pause - Pause an active focus session (records intermediate duration)
focusRouter.post("/pause", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { workspaceId } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: "Workspace ID is required" });
    }

    const existing = await db
      .select()
      .from(timeTracking)
      .where(
        and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.workspaceId, workspaceId),
          isNull(timeTracking.endTime)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return res.status(400).json({ success: false, error: "No active focus session found to pause" });
    }

    const session = existing[0];
    const endTime = new Date();
    const durationSeconds = Math.max(0, Math.floor((endTime.getTime() - new Date(session.startTime).getTime()) / 1000));

    const updated = await db
      .update(timeTracking)
      .set({
        endTime,
        durationSeconds,
      })
      .where(eq(timeTracking.id, session.id))
      .returning();

    // Log Activity
    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId,
      eventType: "FOCUS_PAUSED",
      details: `Paused focus session (Duration: ${Math.floor(durationSeconds / 60)}m)`,
    });

    // Notify Real-time
    socketService.emitToWorkspace(workspaceId, "FOCUS_PAUSED", { type: "FOCUS_PAUSED", userId, sessionId: session.id });

    return res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    logger.error("Pause Focus Session Error: " + error.message);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/v1/focus/complete - Complete the focus session (stops timer permanently)
focusRouter.post("/complete", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { workspaceId, completeTask } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: "Workspace ID is required" });
    }

    const existing = await db
      .select()
      .from(timeTracking)
      .where(
        and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.workspaceId, workspaceId),
          isNull(timeTracking.endTime)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return res.status(400).json({ success: false, error: "No active focus session found to complete" });
    }

    const session = existing[0];
    const endTime = new Date();
    const durationSeconds = Math.max(0, Math.floor((endTime.getTime() - new Date(session.startTime).getTime()) / 1000));

    const updated = await db
      .update(timeTracking)
      .set({
        endTime,
        durationSeconds,
      })
      .where(eq(timeTracking.id, session.id))
      .returning();

    // Optional Auto-complete Task
    if (session.taskId && completeTask) {
      await db.update(tasks).set({ status: "Completed" }).where(eq(tasks.id, session.taskId));

      // Add completion audit log
      await db.insert(auditLogs).values({
        id: uuidv4(),
        userId,
        workspaceId,
        eventType: "TASK_STATUS_UPDATE",
        details: `Task status auto-changed to Completed upon focus completion`,
      });
    }

    // Log focus activity
    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId,
      eventType: "FOCUS_COMPLETED",
      details: `Completed focus session (Duration: ${Math.floor(durationSeconds / 60)}m)`,
    });

    // Notify Realtime — single batched event (avoids double WORKSPACE_UPDATED emission when
    // a task is auto-completed alongside the focus session).
    socketService.emitToWorkspace(workspaceId, "FOCUS_COMPLETED", {
      type: "FOCUS_COMPLETED",
      userId,
      sessionId: session.id,
      ...(session.taskId && completeTask && { taskCompleted: true, taskId: session.taskId }),
    });

    return res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    logger.error("Complete Focus Session Error: " + error.message);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
