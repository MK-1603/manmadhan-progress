import { Router, Request, Response } from "express";
import { manmadhanDb } from "../../../database/client";
import { manmadhanProjects } from "../../../database/schema/manmadhan.schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { requireWorkspaceMember } from "../../middleware/workspace.middleware";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../services/logger.service";

export const manmadhanProjectsRouter = Router();

manmadhanProjectsRouter.use(authenticate);

// GET /api/v1/manmadhan/projects
manmadhanProjectsRouter.get("/", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const workspaceId = (req as any).workspaceId || req.query.workspaceId;

    let conditions = [eq(manmadhanProjects.organizationId, String(workspaceId))];

    if (status && status !== "All") {
      conditions.push(eq(manmadhanProjects.status, String(status)));
    }
    if (search) {
      conditions.push(ilike(manmadhanProjects.name, `%${search}%`));
    }

    const result = await manmadhanDb.select()
      .from(manmadhanProjects)
      .where(and(...conditions))
      .orderBy(desc(manmadhanProjects.createdAt));

    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error("Error fetching manmadhan projects: " + error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/manmadhan/projects/:id
manmadhanProjectsRouter.get("/:id", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const workspaceId = (req as any).workspaceId || req.query.workspaceId;

    const project = await manmadhanDb.query.manmadhanProjects.findFirst({
      where: and(eq(manmadhanProjects.id, projectId), eq(manmadhanProjects.organizationId, String(workspaceId)))
    });

    if (!project) return res.status(404).json({ success: false, error: "Project not found" });

    return res.json({ success: true, data: project });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/manmadhan/projects
manmadhanProjectsRouter.post("/", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const membership = (req as any).membership;
    const workspaceId = (req as any).workspaceId || req.body.workspaceId;

    const { name, description, status, priority, startDate, deadline, managerUserId } = req.body;
    
    if (!name) return res.status(400).json({ success: false, error: "Project name is required" });

    // Enforce role-based project creation if necessary
    if (membership && membership.role === "MEMBER") {
      return res.status(403).json({ success: false, error: "Forbidden: Members cannot create organizational projects." });
    }

    const newProject = await manmadhanDb.insert(manmadhanProjects).values({
      id: uuidv4(),
      organizationId: String(workspaceId),
      ownerUserId: user.id,
      managerUserId: managerUserId || null,
      name,
      description,
      status: status || "Planning",
      priority: priority || "Medium",
      startDate: startDate ? new Date(startDate) : null,
      deadline: deadline ? new Date(deadline) : null,
    }).returning();

    return res.status(201).json({ success: true, data: newProject[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/manmadhan/projects/:id
manmadhanProjectsRouter.patch("/:id", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const workspaceId = (req as any).workspaceId || req.body.workspaceId;
    const updates = { ...req.body };
    
    if (updates.workspaceId !== undefined) delete updates.workspaceId;
    if (updates.managerId !== undefined) {
      updates.managerUserId = updates.managerId;
      delete updates.managerId;
    }

    const project = await manmadhanDb.query.manmadhanProjects.findFirst({
      where: and(eq(manmadhanProjects.id, projectId), eq(manmadhanProjects.organizationId, String(workspaceId)))
    });

    if (!project) return res.status(404).json({ success: false, error: "Project not found in this organization" });

    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.deadline) updates.deadline = new Date(updates.deadline);
    updates.updatedAt = new Date();

    const updated = await manmadhanDb.update(manmadhanProjects)
      .set(updates)
      .where(eq(manmadhanProjects.id, projectId))
      .returning();

    return res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/manmadhan/projects/:id
manmadhanProjectsRouter.delete("/:id", requireWorkspaceMember, async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const workspaceId = (req as any).workspaceId || req.query.workspaceId;
    const membership = (req as any).membership;

    if (membership && membership.role === "MEMBER") {
      return res.status(403).json({ success: false, error: "Forbidden: Members cannot delete projects." });
    }

    const project = await manmadhanDb.query.manmadhanProjects.findFirst({
      where: and(eq(manmadhanProjects.id, projectId), eq(manmadhanProjects.organizationId, String(workspaceId)))
    });

    if (!project) return res.status(404).json({ success: false, error: "Project not found" });

    await manmadhanDb.delete(manmadhanProjects).where(eq(manmadhanProjects.id, projectId));
    return res.json({ success: true, message: "Project deleted" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
