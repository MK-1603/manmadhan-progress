import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { folders, files, workspaceMembers } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { v4 as uuidv4 } from "uuid";

export const foldersRouter = Router();

foldersRouter.use(authenticate);

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

// List all root folders for a workspace
foldersRouter.get("/:workspaceId", verifyWorkspaceAccess, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    // Ideally filter by parentId if implementing nested structure logic via query params
    const allFolders = await db.select()
      .from(folders)
      .where(eq(folders.workspaceId, String(workspaceId)));

    res.json({ success: true, data: allFolders });
  } catch (error: any) {
    logger.error("List Folders Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Create a new folder
foldersRouter.post("/", verifyWorkspaceAccess, async (req: Request, res: Response) => {
  try {
    const { workspaceId, name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: "Name is required." });
    }

    const newFolder = await db.insert(folders).values({
      id: uuidv4(),
      workspaceId: String(workspaceId),
      name: String(name),
      parentId: parentId ? String(parentId) : null,
    }).returning();

    res.json({ success: true, message: "Folder created successfully.", data: newFolder[0] });
  } catch (error: any) {
    logger.error("Create Folder Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Add a file to a folder
foldersRouter.post("/:folderId/files", async (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const { name, url, size } = req.body;
    const userId = (req as any).user?.id;

    if (!name || !url) {
      return res.status(400).json({ success: false, error: "Name and URL are required." });
    }

    const folderInfo = await db.query.folders.findFirst({
      where: eq(folders.id, String(folderId))
    });

    if (!folderInfo) {
      return res.status(404).json({ success: false, error: "Folder not found." });
    }

    // Verify workspace membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, folderInfo.workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: "Access denied." });
    }

    const newFile = await db.insert(files).values({
      id: uuidv4(),
      workspaceId: folderInfo.workspaceId,
      folderId: String(folderId),
      name: String(name),
      url: String(url),
      size: size ? Number(size) : null,
      uploadedById: userId,
    }).returning();

    res.json({ success: true, message: "File added successfully.", data: newFile[0] });
  } catch (error: any) {
    logger.error("Add File Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});
