import { Router, Request, Response, NextFunction } from "express";
import { personalDb } from "../../../database/client";
import { personalFiles, personalVaultSessions, personalSecureNotes, personalVaultAuditLogs } from "../../../database/schema/personal.schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const personalVaultRouter = Router();
personalVaultRouter.use(authenticate);

// Unlock Vault
personalVaultRouter.post("/unlock", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { password } = req.body;
    
    // In a real system, compare password with user's vault PIN/password hash.
    // For this prototype, we'll assume any non-empty string is a success.
    if (!password) {
      return res.status(401).json({ success: false, error: "Invalid password" });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await personalDb.transaction(async (tx) => {
      await tx.insert(personalVaultSessions).values({
        id: uuidv4(),
        ownerUserId: user.id as string,
        token,
        expiresAt,
      });

      await tx.insert(personalVaultAuditLogs).values({
        id: uuidv4(),
        ownerUserId: user.id as string,
        action: "unlocked",
      });
    });

    return res.status(200).json({ success: true, data: { token, expiresAt } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Vault Auth Middleware
export const requireVaultUnlock = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const vaultToken = req.headers["x-vault-token"] as string;

  if (!vaultToken) {
    return res.status(403).json({ success: false, error: "Vault locked" });
  }

  const [session] = await personalDb
    .select()
    .from(personalVaultSessions)
    .where(and(eq(personalVaultSessions.ownerUserId, user.id as string), eq(personalVaultSessions.token, vaultToken)));

  if (!session || new Date(session.expiresAt) < new Date()) {
    return res.status(403).json({ success: false, error: "Vault session expired" });
  }

  next();
};

// Get Vault Files
personalVaultRouter.get("/files", requireVaultUnlock, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const files = await personalDb
      .select()
      .from(personalFiles)
      .where(and(eq(personalFiles.ownerUserId, user.id as string), eq(personalFiles.isVault, true)));
    return res.status(200).json({ success: true, data: files });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Add Secure Note
personalVaultRouter.post("/notes", requireVaultUnlock, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, body } = req.body;
    
    if (!title) return res.status(400).json({ success: false, error: "Title required" });

    const newId = uuidv4();
    await personalDb.insert(personalSecureNotes).values({
      id: newId,
      ownerUserId: user.id as string,
      title,
      body,
    });
    
    const [created] = await personalDb.select().from(personalSecureNotes).where(eq(personalSecureNotes.id, newId));
    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get Secure Notes
personalVaultRouter.get("/notes", requireVaultUnlock, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const notes = await personalDb
      .select()
      .from(personalSecureNotes)
      .where(eq(personalSecureNotes.ownerUserId, user.id as string))
      .orderBy(desc(personalSecureNotes.createdAt));
    return res.status(200).json({ success: true, data: notes });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default personalVaultRouter;
