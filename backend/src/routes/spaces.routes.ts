import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { spaces, spaceDocuments, workspaceMembers } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { v4 as uuidv4 } from "uuid";

export const spacesRouter = Router();

spacesRouter.use(authenticate);

// Middleware to verify workspace membership
const verifyWorkspaceAccess = async (req: Request, res: Response, next: Function) => {
  const workspaceId = req.params.workspaceId || req.body.workspaceId;
  const userId = (req as any).user?.id;

  if (!workspaceId) {
    return res.status(400).json({ success: false, error: "Missing workspaceId." });
  }

  try {
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, String(workspaceId)),
        eq(workspaceMembers.userId, userId)
      ),
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: "Access denied." });
    }

    next();
  } catch (error) {
    logger.error("Workspace Verification Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};

// List all spaces for a workspace
spacesRouter.get("/:workspaceId", verifyWorkspaceAccess, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const allSpaces = await db.select()
      .from(spaces)
      .where(eq(spaces.workspaceId, String(workspaceId)));

    res.json({ success: true, data: allSpaces });
  } catch (error: any) {
    logger.error("List Spaces Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Create a new space
spacesRouter.post("/", verifyWorkspaceAccess, async (req: Request, res: Response) => {
  try {
    const { workspaceId, name, type } = req.body;
    const userId = (req as any).user?.id;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: "Name and type are required." });
    }

    const newSpace = await db.insert(spaces).values({
      id: uuidv4(),
      workspaceId: String(workspaceId),
      name: String(name),
      type: String(type),
      createdById: userId,
    }).returning();

    res.json({ success: true, message: "Space created successfully.", data: newSpace[0] });
  } catch (error: any) {
    logger.error("Create Space Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Add a document to a space
spacesRouter.post("/:spaceId/documents", async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    const { title, content } = req.body;
    const userId = (req as any).user?.id;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: "Title and content are required." });
    }

    const spaceInfo = await db.query.spaces.findFirst({
      where: eq(spaces.id, String(spaceId))
    });

    if (!spaceInfo) {
      return res.status(404).json({ success: false, error: "Space not found." });
    }

    // Verify workspace membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, spaceInfo.workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: "Access denied." });
    }

    const newDoc = await db.insert(spaceDocuments).values({
      id: uuidv4(),
      spaceId: String(spaceId),
      title: String(title),
      content: String(content),
      authorId: userId,
    }).returning();

    res.json({ success: true, message: "Document added successfully.", data: newDoc[0] });
  } catch (error: any) {
    logger.error("Add Document Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});
