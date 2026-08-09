import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { tasks, workspaceMembers, auditLogs, projects } from "../../database/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { requireWorkspaceMember } from "../middleware/workspace.middleware";
import { logger } from "../services/logger.service";
import { socketService } from "../services/socket.service";
import { ScoringService } from "../services/scoring.service";
import { TaskStatus, isValidTaskTransition } from "../utils/state-machine.util";
import { v4 as uuidv4 } from "uuid";

export const tasksRouter = Router();

tasksRouter.use(authenticate);

// GET /api/v1/tasks - List tasks
tasksRouter.get("/", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Filters
    const { status, priority, projectId, goalId, search, assigneeId } = req.query;
    const conditions = [eq(tasks.workspaceId, workspaceId)];

    if (status) conditions.push(eq(tasks.status, status as string));
    if (priority) conditions.push(eq(tasks.priority, priority as string));
    if (projectId) conditions.push(eq(tasks.projectId, projectId as string));
    if (goalId) conditions.push(eq(tasks.goalId, goalId as string));
    if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId as string));
    
    // Sort
    const sortField = req.query.sortBy as string;
    const sortDir = req.query.sortDir as string === "asc" ? asc : desc;
    
    let orderByCondition = desc(tasks.createdAt);
    if (sortField === "deadline") orderByCondition = sortDir(tasks.deadline);
    else if (sortField === "priority") orderByCondition = sortDir(tasks.priority);
    else if (sortField === "title") orderByCondition = sortDir(tasks.title);

    let query = db.select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(orderByCondition)
      .limit(limit)
      .offset(offset);
      
    const allTasks = await query;
    return res.json({ success: true, data: allTasks });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/tasks/my-tasks - List tasks assigned to current user with project data
tasksRouter.get("/my-tasks", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId as string;
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const myTasks = await db
      .select({
        id: tasks.id,
        workspaceId: tasks.workspaceId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        assigneeId: tasks.assigneeId,
        projectId: tasks.projectId,
        deadline: tasks.deadline,
        createdAt: tasks.createdAt,
        project: projects,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.assigneeId, userId)
      ))
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);
      
    return res.json({ success: true, data: myTasks });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch my-tasks");
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/tasks/:id - Get specific task
tasksRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    
    const taskList = await db.select().from(tasks).where(eq(tasks.id, id as string)).limit(1);
    if (!taskList.length) return res.status(404).json({ success: false, error: "Task not found" });
    
    const task = taskList[0];
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.workspaceId, task.workspaceId), eq(workspaceMembers.userId, userId))
    });
    if (!membership) return res.status(403).json({ success: false, error: "Access denied." });

    return res.json({ success: true, data: task });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/tasks - Create a task
tasksRouter.post("/", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const membership = (req as any).membership;
    const { title, description, projectId, workspaceId, assigneeId, deadline, priority, goalId, parentTaskId, estimatedMinutes, tags, status } = req.body;
    
    if (!title || !workspaceId) return res.status(400).json({ success: false, error: "Title and workspaceId required" });

    let finalAssigneeId = assigneeId || null;

    // Strict Workspace Segregation
    const workspaceType = (req as any).workspaceType;
    if (workspaceType === "personal") {
      // Personal tasks ALWAYS belong to the user
      finalAssigneeId = user.id;
    } else {
      // Organizational Assignment RBAC
      if (membership && membership.role === "MEMBER") {
        if (assigneeId && assigneeId !== user.id) {
          return res.status(403).json({ success: false, error: "Forbidden: Members cannot assign tasks to other users." });
        }
        finalAssigneeId = user.id; // Auto-assign to self if no assignee provided? Actually, they might create a Draft.
      }
    }

    const newTask = await db.insert(tasks).values({
      id: uuidv4(),
      projectId: projectId || null,
      workspaceId,
      title,
      description: description || null,
      status: status || "Draft",
      priority: priority || "Medium",
      assigneeId: finalAssigneeId || null,
      deadline: deadline ? new Date(deadline) : null,
      goalId: goalId || null,
      parentTaskId: parentTaskId || null,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
      tags: tags || []
    }).returning();

    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.id,
      workspaceId: workspaceId,
      eventType: "TASK_CREATED",
      details: `Task '${title}' created`,
    });
    
    socketService.emitToWorkspace(workspaceId, "TASK_CREATED", { type: "task_created", task: newTask[0] });

    return res.status(201).json({ success: true, data: newTask[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/tasks/:id - Delete task
tasksRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    
    const taskList = await db.select().from(tasks).where(eq(tasks.id, id as string)).limit(1);
    if (!taskList.length) return res.status(404).json({ success: false, error: "Task not found" });
    
    const task = taskList[0];
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.workspaceId, task.workspaceId), eq(workspaceMembers.userId, userId))
    });
    if (!membership) return res.status(403).json({ success: false, error: "Access denied." });
    
    // RBAC: Only CEO and CO-CEO can delete tasks
    if (membership.role === "MEMBER") {
      return res.status(403).json({ success: false, error: "Forbidden: Only CEO or CO-CEO can delete tasks." });
    }
    
    await db.delete(tasks).where(eq(tasks.id, id as string));
    
    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId: task.workspaceId,
      eventType: "TASK_DELETED",
      details: `Task '${task.title}' deleted`,
    });
    
    socketService.emitToWorkspace(task.workspaceId, "TASK_DELETED", { type: "task_deleted", taskId: task.id });
    
    return res.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/tasks/:id - Full task update
tasksRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, priority, deadline, projectId, assigneeId, goalId, parentTaskId, estimatedMinutes, tags, status, archivedAt, order } = req.body;
    const userId = (req as any).user?.id;

    const taskList = await db.select().from(tasks).where(eq(tasks.id, id as string)).limit(1);
    if (!taskList.length) return res.status(404).json({ success: false, error: "Task not found" });
    const task = taskList[0];

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.workspaceId, task.workspaceId), eq(workspaceMembers.userId, userId))
    });
    if (!membership) return res.status(403).json({ success: false, error: "Access denied." });

    // RBAC: Members cannot change assignee
    if (membership.role === "MEMBER" && assigneeId !== undefined && assigneeId !== task.assigneeId) {
      return res.status(403).json({ success: false, error: "Forbidden: Members cannot reassign tasks." });
    }

    const updated = await db.update(tasks)
      .set({
        title: title !== undefined ? title : task.title,
        description: description !== undefined ? description : task.description,
        priority: priority !== undefined ? priority : task.priority,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : task.deadline,
        projectId: projectId !== undefined ? projectId : task.projectId,
        assigneeId: assigneeId !== undefined ? assigneeId : task.assigneeId,
        goalId: goalId !== undefined ? goalId : task.goalId,
        parentTaskId: parentTaskId !== undefined ? parentTaskId : task.parentTaskId,
        estimatedMinutes: estimatedMinutes !== undefined ? estimatedMinutes : task.estimatedMinutes,
        tags: tags !== undefined ? tags : task.tags,
        status: status !== undefined ? status : task.status,
        archivedAt: archivedAt !== undefined ? (archivedAt ? new Date(archivedAt) : null) : task.archivedAt,
        order: order !== undefined ? order : task.order,
      })
      .where(eq(tasks.id, id as string))
      .returning();

    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId: task.workspaceId,
      eventType: "TASK_UPDATED",
      details: `Task '${task.title}' updated`,
    });

    socketService.emitToWorkspace(task.workspaceId, "TASK_UPDATED", { type: "task_updated", task: updated[0] });

    return res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    logger.error("Update Task Error: " + error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

tasksRouter.put("/:taskId/status", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status, rejectionFeedback } = req.body;
    const userId = (req as any).user?.id;

    if (!status) {
      return res.status(400).json({ success: false, error: "Status is required." });
    }

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, String(taskId))
    });

    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found." });
    }

    // Check workspace membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, task.workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: "Access denied." });
    }

    // State machine check
    if (!isValidTaskTransition(task.status as TaskStatus, status as TaskStatus)) {
      return res.status(400).json({ success: false, error: `Invalid status transition from ${task.status} to ${status}.` });
    }

    // RBAC for Approval Engine
    if (status === "Approved" && membership.role === "MEMBER") {
      return res.status(403).json({ success: false, error: "Forbidden: Members cannot approve tasks." });
    }

    // Timestamp & Metadata capture
    const updateData: any = { status };
    if (status === "Review") {
      updateData.submittedAt = new Date();
    } else if (status === "Approved") {
      updateData.approvedAt = new Date();
      updateData.reviewerId = userId;
    } else if (status === "Completed") {
      updateData.completedAt = new Date();
    } else if (status === "In Progress" && task.status === "Review") {
      // Rejection logic
      updateData.rejectionFeedback = rejectionFeedback || null;
    }

    // Update
    const updated = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, String(taskId)))
      .returning();

    // Log Activity with strict event types
    let eventType = "TASK_STATUS_UPDATE";
    if (status === "Review") eventType = "TASK.SUBMITTED";
    if (status === "Approved") eventType = "TASK.APPROVED";
    if (status === "In Progress" && task.status === "Review") eventType = "TASK.REJECTED";
    if (status === "Completed") eventType = "TASK.COMPLETED";

    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId: task.workspaceId,
      eventType: eventType,
      details: `Task '${task.title}' status changed to ${status}`,
    });

    socketService.emitToWorkspace(task.workspaceId, eventType, { type: eventType.toLowerCase(), task: updated[0] });

    // Call Scoring Engine asynchronously in background
    if (["Review", "Approved", "Completed", "In Progress"].includes(status)) {
      ScoringService.updateLeaderboardForUser(task.workspaceId, task.assigneeId || userId);
    }

    res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    logger.error("Update Task Status Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});
