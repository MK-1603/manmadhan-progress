import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { projects, milestones, workspaceMembers, auditLogs, tasks, timeTracking, notes } from "../../database/schema";
import { eq, and, desc, asc, ilike } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { requireWorkspaceMember } from "../middleware/workspace.middleware";
import { logger } from "../services/logger.service";
import { ProjectStatus, isValidProjectTransition } from "../utils/state-machine.util";
import { v4 as uuidv4 } from "uuid";

export const projectsRouter = Router();

projectsRouter.use(authenticate);

// GET /api/v1/projects - List projects (Role: Any)
projectsRouter.get("/", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId as string;
    const { status, priority, health, goalId, search } = req.query;
    
    const conditions = [eq(projects.workspaceId, workspaceId)];
    if (status) conditions.push(eq(projects.status, status as string));
    if (priority) conditions.push(eq(projects.priority, priority as string));
    if (health) conditions.push(eq(projects.health, health as string));
    if (goalId) conditions.push(eq(projects.goalId, goalId as string));
    if (search) conditions.push(ilike(projects.name, `%${search}%`));
    
    // Sort
    const sortField = req.query.sortBy as string;
    const sortDir = req.query.sortDir as string === "asc" ? asc : desc;
    
    let orderByCondition = desc(projects.createdAt);
    if (sortField === "deadline") orderByCondition = sortDir(projects.deadline);
    else if (sortField === "priority") orderByCondition = sortDir(projects.priority);
    else if (sortField === "name") orderByCondition = sortDir(projects.name);
    else if (sortField === "progress") orderByCondition = sortDir(projects.progress);

    const allProjects = await db.query.projects.findMany({
      where: and(...conditions),
      orderBy: orderByCondition,
      with: { tasks: true, milestones: true }
    });
    
    // Compute progress if requested, or return as is
    return res.json({ success: true, data: allProjects });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/projects/:id - Get specific project
projectsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.query.workspaceId as string;
    
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id as string), eq(projects.workspaceId, workspaceId)),
      with: { tasks: true, milestones: true }
    });
    
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    return res.json({ success: true, data: project });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/projects - Create a project
projectsRouter.post("/", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const membership = (req as any).membership;
    const { name, description, workspaceId, departmentId, objective, startDate, deadline, priority, goalId, tags, plan } = req.body;
    
    if (!name || !workspaceId) return res.status(400).json({ success: false, error: "Name and workspaceId required" });

    // RBAC check: Members cannot create projects (if desired, or leave open)
    if (membership && membership.role === "MEMBER") {
      return res.status(403).json({ success: false, error: "Forbidden: Members cannot create projects." });
    }

    const newProject = await db.insert(projects).values({
      id: uuidv4(),
      workspaceId,
      departmentId,
      name,
      description,
      objective,
      startDate: startDate ? new Date(startDate) : null,
      deadline: deadline ? new Date(deadline) : null,
      priority: priority || "Medium",
      goalId,
      tags: tags || [],
      plan: plan || {},
      status: "Planning",
      ownerId: user.id
    }).returning();

    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.id,
      workspaceId: workspaceId,
      eventType: "PROJECT_CREATED",
      details: `Project '${name}' created`,
    });
    
    return res.status(201).json({ success: true, data: newProject[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/projects/:id - Update project
projectsRouter.patch("/:id", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.query.workspaceId as string || req.body.workspaceId as string;
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.workspaceId;
    delete updateData.ownerId;
    delete updateData.createdAt;

    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.deadline) updateData.deadline = new Date(updateData.deadline);
    
    const currentProject = await db.query.projects.findFirst({
      where: and(eq(projects.id, id as string), eq(projects.workspaceId, workspaceId))
    });

    // Auto-set completedAt if status is completed
    if (updateData.status === "Completed" && currentProject?.status !== "Completed") {
      updateData.completedAt = new Date();
    } else if (updateData.status && updateData.status !== "Completed") {
      updateData.completedAt = null;
    }

    const updated = await db.update(projects)
      .set(updateData)
      .where(and(eq(projects.id, id as string), eq(projects.workspaceId, workspaceId)))
      .returning();

    if (!updated.length) return res.status(404).json({ success: false, error: "Project not found or access denied" });
    
    const io = req.app.get("io");
    if (io) {
      io.to(workspaceId).emit("PROJECT_UPDATED", updated[0]);
    }

    return res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/projects/:id - Delete project
projectsRouter.delete("/:id", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.query.workspaceId as string || req.body.workspaceId as string;
    const membership = (req as any).membership;
    
    // RBAC: Members cannot delete projects
    if (membership && membership.role === "MEMBER") {
      return res.status(403).json({ success: false, error: "Forbidden: Only CEO or CO-CEO can delete projects." });
    }

    const deletedProject = await db.delete(projects).where(
      and(
        eq(projects.id, id as string),
        eq(projects.workspaceId, workspaceId)
      )
    ).returning();
    
    if (!deletedProject.length) return res.status(404).json({ success: false, error: "Project not found or access denied" });
    
    return res.json({ success: true, message: "Project deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

projectsRouter.put("/:projectId/status", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { status } = req.body;
    const userId = (req as any).user?.id;

    if (!status) {
      return res.status(400).json({ success: false, error: "Status is required." });
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, String(projectId))
    });

    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found." });
    }

    // Check workspace membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, project.workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: "Access denied." });
    }

    // State machine check
    if (!isValidProjectTransition(project.status as ProjectStatus, status as ProjectStatus)) {
      return res.status(400).json({ success: false, error: `Invalid status transition from ${project.status} to ${status}.` });
    }

    // Update
    const updated = await db.update(projects)
      .set({ status })
      .where(eq(projects.id, String(projectId)))
      .returning();

    // Log Activity
    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      workspaceId: project.workspaceId,
      eventType: "PROJECT_STATUS_UPDATE",
      details: `Project '${project.name}' status changed to ${status}`,
    });

    res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    logger.error("Update Project Status Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// POST /api/v1/projects/:id/duplicate - Duplicate project
projectsRouter.post("/:id/duplicate", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.query.workspaceId as string || req.body.workspaceId as string;
    const user = (req as any).user;

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id as string), eq(projects.workspaceId, workspaceId)),
      with: { milestones: true }
    });

    if (!project) return res.status(404).json({ success: false, error: "Project not found" });

    const newProjectId = uuidv4();
    const newProject = await db.insert(projects).values({
      id: newProjectId,
      workspaceId,
      departmentId: project.departmentId,
      name: `${project.name} (Copy)`,
      description: project.description,
      objective: project.objective,
      startDate: project.startDate,
      deadline: project.deadline,
      priority: project.priority,
      goalId: project.goalId,
      tags: project.tags,
      plan: project.plan,
      status: "Planning",
      ownerId: user.id
    }).returning();

    // Duplicate milestones
    if (project.milestones && project.milestones.length > 0) {
      const newMilestones = project.milestones.map(m => ({
        id: uuidv4(),
        projectId: newProjectId,
        name: m.name,
        description: m.description,
        deadline: m.deadline,
        status: "Pending",
        order: m.order
      }));
      await db.insert(milestones).values(newMilestones);
    }

    const io = req.app.get("io");
    if (io) io.to(workspaceId).emit("PROJECT_CREATED", newProject[0]);

    return res.json({ success: true, data: newProject[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/projects/:id/archive - Archive project
projectsRouter.post("/:id/archive", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.query.workspaceId as string || req.body.workspaceId as string;

    const archived = await db.update(projects)
      .set({ status: "Archived", archivedAt: new Date() })
      .where(and(eq(projects.id, id as string), eq(projects.workspaceId, workspaceId)))
      .returning();

    if (!archived.length) return res.status(404).json({ success: false, error: "Project not found" });

    const io = req.app.get("io");
    if (io) io.to(workspaceId).emit("PROJECT_ARCHIVED", archived[0]);

    return res.json({ success: true, data: archived[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/projects/:id/restore - Restore project
projectsRouter.post("/:id/restore", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.query.workspaceId as string || req.body.workspaceId as string;

    const restored = await db.update(projects)
      .set({ status: "Active", archivedAt: null })
      .where(and(eq(projects.id, id as string), eq(projects.workspaceId, workspaceId)))
      .returning();

    if (!restored.length) return res.status(404).json({ success: false, error: "Project not found" });

    const io = req.app.get("io");
    if (io) io.to(workspaceId).emit("PROJECT_RESTORED", restored[0]);

    return res.json({ success: true, data: restored[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// MILESTONES ROUTES

// GET /api/v1/projects/:projectId/milestones
projectsRouter.get("/:projectId/milestones", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const list = await db.query.milestones.findMany({
      where: eq(milestones.projectId, projectId as string),
      orderBy: asc(milestones.order)
    });
    return res.json({ success: true, data: list });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/projects/:projectId/milestones
projectsRouter.post("/:projectId/milestones", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, description, deadline, status, order } = req.body;
    const workspaceId = req.query.workspaceId as string || req.body.workspaceId as string;

    const newMilestone = await db.insert(milestones).values({
      id: uuidv4(),
      projectId: projectId as string,
      name,
      description,
      deadline: deadline ? new Date(deadline) : null,
      status: status || "Pending",
      order: order || 0
    }).returning();

    const io = req.app.get("io");
    if (io) io.to(workspaceId).emit("MILESTONE_CREATED", newMilestone[0]);

    return res.status(201).json({ success: true, data: newMilestone[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/projects/:projectId/milestones/:id
projectsRouter.patch("/:projectId/milestones/:id", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.query.workspaceId as string || req.body.workspaceId as string;
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.projectId;
    delete updateData.workspaceId;
    delete updateData.createdAt;

    if (updateData.deadline) updateData.deadline = new Date(updateData.deadline);
    const currentMilestone = await db.query.milestones.findFirst({
      where: eq(milestones.id, id as string)
    });

    if (updateData.status === "Completed" && currentMilestone?.status !== "Completed") {
      updateData.completedAt = new Date();
    } else if (updateData.status && updateData.status !== "Completed") {
      updateData.completedAt = null;
    }

    const updated = await db.update(milestones)
      .set(updateData)
      .where(eq(milestones.id, id as string))
      .returning();

    if (!updated.length) return res.status(404).json({ success: false, error: "Milestone not found" });

    const io = req.app.get("io");
    if (io) io.to(workspaceId).emit("MILESTONE_UPDATED", updated[0]);

    return res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/projects/:projectId/milestones/:id
projectsRouter.delete("/:projectId/milestones/:id", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.query.workspaceId as string || req.body.workspaceId as string;

    const deleted = await db.delete(milestones)
      .where(eq(milestones.id, id as string))
      .returning();

    if (!deleted.length) return res.status(404).json({ success: false, error: "Milestone not found" });

    const io = req.app.get("io");
    if (io) io.to(workspaceId).emit("MILESTONE_DELETED", { id });

    return res.json({ success: true, message: "Milestone deleted" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
