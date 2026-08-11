import { and, desc, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/db";
import { personalJournalEntries } from "../../../database/schema/personal.schema";
import { getUserId } from "../../middleware/auth";
import { authenticate } from "../../middleware/auth.middleware";
import { socketService } from "../../services/socket.service";
import logger from "../../utils/logger";

export const personalJournalRouter = Router();

personalJournalRouter.use(authenticate);

// 1. Get all journal entries for the current user
personalJournalRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const entries = await personalDb.query.personalJournalEntries.findMany({
			where: eq(personalJournalEntries.ownerUserId, userId),
			orderBy: [desc(personalJournalEntries.date)],
		});

		res.json({ success: true, data: entries });
	} catch (error: any) {
		logger.error("Get Journal Entries Error: " + error.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to fetch journal entries" });
	}
});

// 2. Get a single journal entry
personalJournalRouter.get("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const entryId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const entry = await personalDb.query.personalJournalEntries.findFirst({
			where: and(
				eq(personalJournalEntries.id, entryId),
				eq(personalJournalEntries.ownerUserId, userId),
			),
		});

		if (!entry)
			return res
				.status(404)
				.json({ success: false, error: "Journal entry not found" });

		res.json({ success: true, data: entry });
	} catch (error: any) {
		logger.error("Get Journal Entry Error: " + error.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to fetch journal entry" });
	}
});

// 3. Create a journal entry
personalJournalRouter.post("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { title, body, date, mood, energy, location, tags, isMemory } =
			req.body;

		if (!title)
			return res
				.status(400)
				.json({ success: false, error: "Title is required" });

		const newId = uuidv4();
		const [newEntry] = await personalDb
			.insert(personalJournalEntries)
			.values({
				id: newId,
				ownerUserId: userId,
				title,
				body,
				date: date ? new Date(date) : new Date(),
				mood,
				energy,
				location,
				tags: tags || [],
				isMemory: isMemory || false,
			})
			.returning();

		socketService.emitToUser(userId, "journal_created", newEntry);
		res.status(201).json({ success: true, data: newEntry });
	} catch (error: any) {
		logger.error("Create Journal Entry Error: " + error.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to create journal entry" });
	}
});

// 4. Update a journal entry
personalJournalRouter.patch("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const entryId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { title, body, date, mood, energy, location, tags, isMemory } =
			req.body;

		const [updatedEntry] = await personalDb
			.update(personalJournalEntries)
			.set({
				title,
				body,
				date: date ? new Date(date) : undefined,
				mood,
				energy,
				location,
				tags,
				isMemory,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(personalJournalEntries.id, entryId),
					eq(personalJournalEntries.ownerUserId, userId),
				),
			)
			.returning();

		if (!updatedEntry) {
			return res
				.status(404)
				.json({ success: false, error: "Journal entry not found" });
		}

		socketService.emitToUser(userId, "journal_updated", updatedEntry);
		res.json({ success: true, data: updatedEntry });
	} catch (error: any) {
		logger.error("Update Journal Entry Error: " + error.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to update journal entry" });
	}
});

// 5. Delete a journal entry
personalJournalRouter.delete("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const entryId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const [deletedEntry] = await personalDb
			.delete(personalJournalEntries)
			.where(
				and(
					eq(personalJournalEntries.id, entryId),
					eq(personalJournalEntries.ownerUserId, userId),
				),
			)
			.returning();

		if (!deletedEntry) {
			return res
				.status(404)
				.json({ success: false, error: "Journal entry not found" });
		}

		socketService.emitToUser(userId, "journal_deleted", { id: entryId });
		res.json({ success: true, data: deletedEntry });
	} catch (error: any) {
		logger.error("Delete Journal Entry Error: " + error.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to delete journal entry" });
	}
});
