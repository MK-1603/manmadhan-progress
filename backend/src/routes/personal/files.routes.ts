import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { personalFiles, personalFolders, personalFileAttachments } from "../../../database/schema/personal.schema";
import { eq, desc, and } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const personalFilesRouter = Router();
personalFilesRouter.use(authenticate);

// Get Folders
personalFilesRouter.get("/folders", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const folders = await personalDb
      .select()
      .from(personalFolders)
      .where(eq(personalFolders.ownerUserId, user.id as string))
      .orderBy(desc(personalFolders.createdAt));
    return res.status(200).json({ success: true, data: folders });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Create Folder
personalFilesRouter.post("/folders", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name required" });

    const newId = uuidv4();
    await personalDb.insert(personalFolders).values({
      id: newId,
      ownerUserId: user.id as string,
      name,
      parentId,
    });
    const [created] = await personalDb.select().from(personalFolders).where(eq(personalFolders.id, newId));
    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get Files (Normal Files only, Vault files are gated)
personalFilesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { folderId } = req.query;

    let query = personalDb
      .select()
      .from(personalFiles)
      .where(and(eq(personalFiles.ownerUserId, user.id as string), eq(personalFiles.isVault, false)));

    // In Drizzle, building dynamic queries requires more care, but this is a prototype
    const files = await query;
    const filteredFiles = folderId ? files.filter(f => f.folderId === folderId) : files;
    
    return res.status(200).json({ success: true, data: filteredFiles });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Create/Upload File reference (Actual upload handled by Cloudinary via client/server)
personalFilesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, url, fileType, fileSize, folderId } = req.body;

    if (!name || !url) return res.status(400).json({ success: false, error: "Name and URL required" });

    const newId = uuidv4();
    await personalDb.insert(personalFiles).values({
      id: newId,
      ownerUserId: user.id as string,
      name,
      url,
      fileType,
      fileSize,
      folderId,
      isVault: false, // Default normal file
    });

    const [created] = await personalDb.select().from(personalFiles).where(eq(personalFiles.id, newId));
    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default personalFilesRouter;
