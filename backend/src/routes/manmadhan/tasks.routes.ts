import { Router, Request, Response } from "express";
import { manmadhanDb } from "../../../database/client";
import { manmadhanTasks, manmadhanProjects } from "../../../database/schema/manmadhan.schema";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { requireWorkspaceMember } from "../../middleware/workspace.middleware";
import { v4 as uuidv4 } from "uuid";

export const manmadhanTasksRouter = Router();

manmadhanTasksRouter.use(authenticate);

// GET /api/v1/manmadhan/tasks
manmadhanTasksRouter.get("/", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const membership = (req as any).membership;
    const workspaceId = (req as any).workspaceId || req.query.workspaceId;
    const { status, search, projectId, assigneeId } = req.query;

    let conditions = [eq(manmadhanTasks.organizationId, String(workspaceId))];

    if (membership.role === "MEMBER") {
      // Members only see their own assigned tasks or tasks they created
      conditions.push(or(
        eq(manmadhanTasks.assigneeUserId, user.id),
        eq(manmadhanTasks.createdByUserId, user.id)
      ) as any);
    }

    if (status && status !== "All") {
      conditions.push(eq(manmadhanTasks.status, String(status)));
    }
    if (search) {
      conditions.push(ilike(manmadhanTasks.title, `%${search}%`));
    }
    if (projectId) {
      conditions.push(eq(manmadhanTasks.projectId, String(projectId)));
    }
    if (assigneeId) {
      conditions.push(eq(manmadhanTasks.assigneeUserId, String(assigneeId)));
    }

    const result = await manmadhanDb.select()
      .from(manmadhanTasks)
      .where(and(...conditions))
      .orderBy(desc(manmadhanTasks.createdAt));

    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/manmadhan/tasks
manmadhanTasksRouter.post("/", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const membership = (req as any).membership;
    const workspaceId = (req as any).workspaceId || req.body.workspaceId;

    const { title, description, projectId, assigneeId, status, priority, deadline, estimatedMinutes, expectedOutput } = req.body;

    if (!title) return res.status(400).json({ success: false, error: "Task title is required" });

    if (projectId) {
      const project = await manmadhanDb.query.manmadhanProjects.findFirst({
        where: and(eq(manmadhanProjects.id, projectId), eq(manmadhanProjects.organizationId, String(workspaceId)))
      });
      if (!project) return res.status(400).json({ success: false, error: "Invalid projectId for this organization" });
    }

    let finalAssigneeId = assigneeId || null;

    // RBAC check for assignment
    if (membership.role === "MEMBER") {
      if (assigneeId && assigneeId !== user.id) {
        return res.status(403).json({ success: false, error: "Forbidden: Members cannot assign organizational tasks to other users." });
      }
      finalAssigneeId = user.id;
    }

    const newTask = await manmadhanDb.insert(manmadhanTasks).values({
      id: uuidv4(),
      organizationId: String(workspaceId),
      projectId: projectId || null,
      createdByUserId: user.id,
      assigneeUserId: finalAssigneeId,
      title,
      description,
      expectedOutput,
      status: status || "ASSIGNED",
      priority: priority || "Medium",
      deadline: deadline ? new Date(deadline) : null,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
    }).returning();

    return res.status(201).json({ success: true, data: newTask[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/manmadhan/tasks/:id
manmadhanTasksRouter.patch("/:id", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const membership = (req as any).membership;
    const taskId = req.params.id as string;
    const workspaceId = (req as any).workspaceId || req.body.workspaceId;
    const updates = { ...req.body };

    // Remove fields that do not belong to the schema or map them correctly
    if (updates.workspaceId !== undefined) delete updates.workspaceId;
    if (updates.assigneeId !== undefined) {
      updates.assigneeUserId = updates.assigneeId;
      delete updates.assigneeId;
    }

    const task = await manmadhanDb.query.manmadhanTasks.findFirst({
      where: and(eq(manmadhanTasks.id, taskId), eq(manmadhanTasks.organizationId, String(workspaceId)))
    });

    if (!task) return res.status(404).json({ success: false, error: "Task not found" });

    // Restrict assignee updates for members
    if (membership.role === "MEMBER" && updates.assigneeUserId && updates.assigneeUserId !== user.id && updates.assigneeUserId !== task.assigneeUserId) {
      return res.status(403).json({ success: false, error: "Forbidden: Members cannot reassign tasks." });
    }

    if (updates.deadline) updates.deadline = new Date(updates.deadline);
    updates.updatedAt = new Date();

    if (updates.status === "COMPLETED" && task.status !== "COMPLETED") {
      updates.completedAt = new Date();
    } else if (updates.status !== "COMPLETED") {
      updates.completedAt = null;
    }

    const updated = await manmadhanDb.update(manmadhanTasks)
      .set(updates)
      .where(eq(manmadhanTasks.id, taskId))
      .returning();

    return res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/manmadhan/tasks/:id
manmadhanTasksRouter.delete("/:id", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const taskId = req.params.id as string;
    const workspaceId = (req as any).workspaceId || req.query.workspaceId;
    const membership = (req as any).membership;

    if (membership.role === "MEMBER") {
      return res.status(403).json({ success: false, error: "Forbidden: Members cannot delete organizational tasks." });
    }

    const task = await manmadhanDb.query.manmadhanTasks.findFirst({
      where: and(eq(manmadhanTasks.id, taskId), eq(manmadhanTasks.organizationId, String(workspaceId)))
    });

    if (!task) return res.status(404).json({ success: false, error: "Task not found" });

    await manmadhanDb.delete(manmadhanTasks).where(eq(manmadhanTasks.id, taskId));
    return res.json({ success: true, message: "Task deleted" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
