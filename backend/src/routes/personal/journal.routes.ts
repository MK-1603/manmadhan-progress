import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { personalJournalEntries, personalActivityLogs } from "../../../database/schema/personal.schema";
import { eq, desc } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const personalJournalRouter = Router();
personalJournalRouter.use(authenticate);

personalJournalRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const entries = await personalDb
      .select()
      .from(personalJournalEntries)
      .where(eq(personalJournalEntries.ownerUserId, user.id as string))
      .orderBy(desc(personalJournalEntries.date));

    return res.status(200).json({ success: true, data: entries });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

personalJournalRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, body, mood, energy, isMemory } = req.body;
    
    if (!title) return res.status(400).json({ success: false, error: "Title is required" });

    const newId = uuidv4();
    await personalDb.transaction(async (tx) => {
      await tx.insert(personalJournalEntries).values({
        id: newId,
        ownerUserId: user.id as string,
        title,
        body: body || "",
        mood,
        energy: energy ? parseInt(energy) : undefined,
        isMemory: !!isMemory
      });

      await tx.insert(personalActivityLogs).values({
        id: uuidv4(),
        ownerUserId: user.id as string,
        eventType: "Journal entry",
        details: `Wrote in journal: "${title}"`,
      });
    });

    const [created] = await personalDb.select().from(personalJournalEntries).where(eq(personalJournalEntries.id, newId));
    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default personalJournalRouter;
