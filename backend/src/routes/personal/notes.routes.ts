import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { personalNotes, personalNoteLinks, personalActivityLogs } from "../../../database/schema/personal.schema";
import { eq, desc } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const personalNotesRouter = Router();
personalNotesRouter.use(authenticate);

personalNotesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const notes = await personalDb
      .select()
      .from(personalNotes)
      .where(eq(personalNotes.ownerUserId, user.id as string))
      .orderBy(desc(personalNotes.updatedAt));

    return res.status(200).json({ success: true, data: notes });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

personalNotesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const [note] = await personalDb
      .select()
      .from(personalNotes)
      .where(eq(personalNotes.id, id as string));

    if (!note || note.ownerUserId !== user.id as string) {
      return res.status(404).json({ success: false, error: "Note not found" });
    }

    return res.status(200).json({ success: true, data: note });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

personalNotesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, body, folder, tags } = req.body;
    
    if (!title) return res.status(400).json({ success: false, error: "Title is required" });

    const newNoteId = uuidv4();
    await personalDb.transaction(async (tx) => {
      await tx.insert(personalNotes).values({
        id: newNoteId,
        ownerUserId: user.id as string,
        title,
        body: body || "",
        folder: folder || "All",
        tags: tags || [],
      });

      await tx.insert(personalActivityLogs).values({
        id: uuidv4(),
        ownerUserId: user.id as string,
        eventType: "Note created",
        details: `Created note "${title}"`,
      });
    });

    const [created] = await personalDb.select().from(personalNotes).where(eq(personalNotes.id, newNoteId));
    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

personalNotesRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { title, body, folder, tags, isPinned, isFavorite, status } = req.body;
    
    // Very basic backlink parser: Extract [[Note Title]] and map it.
    // In a full implementation, you'd find notes by title or ID and update `personalNoteLinks` table.

    await personalDb.update(personalNotes)
      .set({
        title,
        body,
        folder,
        tags,
        isPinned,
        isFavorite,
        status,
        updatedAt: new Date()
      })
      .where(eq(personalNotes.id, id as string));

    const [updated] = await personalDb.select().from(personalNotes).where(eq(personalNotes.id, id as string));
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default personalNotesRouter;
