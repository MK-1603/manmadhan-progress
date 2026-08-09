import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { personalProjects, personalProjectFiles, personalActivityLogs, personalMilestones, personalSuccessCriteria } from "../../../database/schema/personal.schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const personalProjectsRouter = Router();

personalProjectsRouter.use(authenticate);

// GET /api/v1/personal/projects
personalProjectsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, search } = req.query;

    let conditions = [eq(personalProjects.ownerUserId, user.id as string)];

    if (status && status !== "All") {
      conditions.push(eq(personalProjects.status, String(status)));
    }
    if (search) {
      conditions.push(ilike(personalProjects.name, `%${search}%`));
    }

    const result = await personalDb.select()
      .from(personalProjects)
      .where(and(...conditions))
      .orderBy(desc(personalProjects.createdAt));

    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/personal/projects/:id
personalProjectsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const projectId = req.params.id as string;

    const project = await personalDb.query.personalProjects.findFirst({
      where: and(eq(personalProjects.id, projectId), eq(personalProjects.ownerUserId, user.id as string))
    });

    if (!project) return res.status(404).json({ success: false, error: "Project not found" });

    // Fetch related entities
    // Create logic
    
    const milestones = await personalDb.select().from(personalMilestones).where(eq(personalMilestones.projectId, projectId));
    const successCriteria = await personalDb.select().from(personalSuccessCriteria).where(eq(personalSuccessCriteria.projectId, projectId));
    const files = await personalDb.select().from(personalProjectFiles).where(eq(personalProjectFiles.projectId, projectId));

    return res.json({ 
      success: true, 
      data: {
        ...project,
        milestones,
        successCriteria,
        files
      } 
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/personal/projects
personalProjectsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { 
      name, description, type, category, tags, goal, 
      status, priority, startDate, deadline, estimatedEffort,
      remindAt, syncToCalendar,
      successCriteria, milestones, files
    } = req.body;
    
    if (!name) return res.status(400).json({ success: false, error: "Project name is required" });

    const newProject = await personalDb.transaction(async (tx: any) => {
      const projectId = uuidv4();
      
      const insertedProject = await tx.insert(personalProjects).values({
        id: projectId,
        ownerUserId: user.id as string,
        name,
        description,
        type: type || "Personal",
        category,
        goal,
        tags: tags || [],
        status: status || "Planning",
        priority: priority || "Medium",
        startDate: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        estimatedEffort: estimatedEffort ? parseInt(estimatedEffort) : null,
        remindAt: remindAt ? new Date(remindAt) : null,
        syncToCalendar: syncToCalendar || false,
      }).returning();

      // Create Success Criteria
      if (successCriteria && Array.isArray(successCriteria) && successCriteria.length > 0) {
        const criteriaData = successCriteria.map(desc => ({
          id: uuidv4(),
          projectId,
          description: desc,
        }));
        // Use any schema since we might not have imported it yet, but we will fix imports later
        await tx.insert(personalSuccessCriteria).values(criteriaData);
      }

      // Create Milestones
      if (milestones && Array.isArray(milestones) && milestones.length > 0) {
        const milestoneData = milestones.map((m, index) => ({
          id: uuidv4(),
          projectId,
          name: m.name,
          description: m.description,
          deadline: m.deadline ? new Date(m.deadline) : null,
          priority: m.priority || "Medium",
          order: index,
        }));
        await tx.insert(personalMilestones).values(milestoneData);
      }

      // Record Activity
      await tx.insert(personalActivityLogs).values({
        id: uuidv4(),
        ownerUserId: user.id as string,
        projectId,
        eventType: "Project created",
        details: `Created project "${name}"`,
      });

      return insertedProject[0];
    });

    return res.status(201).json({ success: true, data: newProject });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/personal/projects/:id
personalProjectsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const projectId = req.params.id as string;
    const updates = req.body;

    const project = await personalDb.query.personalProjects.findFirst({
      where: and(eq(personalProjects.id, projectId), eq(personalProjects.ownerUserId, user.id as string))
    });

    if (!project) return res.status(404).json({ success: false, error: "Project not found" });

    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.deadline) updates.deadline = new Date(updates.deadline);
    updates.updatedAt = new Date();

    const updated = await personalDb.update(personalProjects)
      .set(updates)
      .where(eq(personalProjects.id, projectId))
      .returning();

    return res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/personal/projects/:id
personalProjectsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const projectId = req.params.id as string;

    const project = await personalDb.query.personalProjects.findFirst({
      where: and(eq(personalProjects.id, projectId), eq(personalProjects.ownerUserId, user.id as string))
    });

    if (!project) return res.status(404).json({ success: false, error: "Project not found" });

    await personalDb.delete(personalProjects).where(eq(personalProjects.id, projectId));
    return res.json({ success: true, message: "Project deleted" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/personal/projects/:id/activities
personalProjectsRouter.get("/:id/activities", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const projectId = req.params.id as string;
    // Get activities

    const activities = await personalDb.select()
      .from(personalActivityLogs)
      .where(eq(personalActivityLogs.projectId, projectId))
      .orderBy(desc(personalActivityLogs.createdAt));

    return res.json({ success: true, data: activities });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/personal/projects/:id/files
personalProjectsRouter.post("/:id/files", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const projectId = req.params.id as string;
    const { fileName, fileType, fileSize, url } = req.body;
    
    if (!url || !fileName) return res.status(400).json({ success: false, error: "File URL and Name are required" });

    // Insert file

    const newFile = await personalDb.insert(personalProjectFiles).values({
      id: uuidv4(),
      projectId,
      fileName,
      fileType,
      fileSize,
      url
    }).returning();

    // Log Activity
    await personalDb.insert(personalActivityLogs).values({
      id: uuidv4(),
      ownerUserId: user.id as string,
      projectId,
      eventType: "File uploaded",
      details: `Uploaded ${fileName}`,
    });

    return res.status(201).json({ success: true, data: newFile[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
