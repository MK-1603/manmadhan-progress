import { and, desc, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/db";
import { personalNotes } from "../../../database/schema/personal.schema";
import { getUserId } from "../../middleware/auth";
import { authenticate } from "../../middleware/auth.middleware";
import { socketService } from "../../services/socket.service";
import logger from "../../utils/logger";

export const personalNotesRouter = Router();

personalNotesRouter.use(authenticate);

// 1. Get all notes for the current user
personalNotesRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const notes = await personalDb.query.personalNotes.findMany({
			where: eq(personalNotes.ownerUserId, userId),
			orderBy: [desc(personalNotes.updatedAt)],
		});

		res.json({ success: true, data: notes });
	} catch (error: any) {
		logger.error("Get Notes Error: " + error.message);
		res.status(500).json({ success: false, error: "Failed to fetch notes" });
	}
});

// 2. Get a single note
personalNotesRouter.get("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const noteId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const note = await personalDb.query.personalNotes.findFirst({
			where: and(
				eq(personalNotes.id, noteId),
				eq(personalNotes.ownerUserId, userId),
			),
		});

		if (!note)
			return res.status(404).json({ success: false, error: "Note not found" });

		res.json({ success: true, data: note });
	} catch (error: any) {
		logger.error("Get Note Error: " + error.message);
		res.status(500).json({ success: false, error: "Failed to fetch note" });
	}
});

// 3. Create a note
personalNotesRouter.post("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { title, body, folder, tags, isPinned, isFavorite } = req.body;

		if (!title)
			return res
				.status(400)
				.json({ success: false, error: "Title is required" });

		const newId = uuidv4();
		const [newNote] = await personalDb
			.insert(personalNotes)
			.values({
				id: newId,
				ownerUserId: userId,
				title,
				body,
				folder: folder || "All",
				tags: tags || [],
				isPinned: isPinned || false,
				isFavorite: isFavorite || false,
				status: "Active",
			})
			.returning();

		socketService.emitToUser(userId, "note_created", newNote);
		res.status(201).json({ success: true, data: newNote });
	} catch (error: any) {
		logger.error("Create Note Error: " + error.message);
		res.status(500).json({ success: false, error: "Failed to create note" });
	}
});

// 4. Update a note
personalNotesRouter.patch("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const noteId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { title, body, folder, tags, isPinned, isFavorite, status } =
			req.body;

		const [updatedNote] = await personalDb
			.update(personalNotes)
			.set({
				title,
				body,
				folder,
				tags,
				isPinned,
				isFavorite,
				status,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(personalNotes.id, noteId),
					eq(personalNotes.ownerUserId, userId),
				),
			)
			.returning();

		if (!updatedNote) {
			return res.status(404).json({ success: false, error: "Note not found" });
		}

		socketService.emitToUser(userId, "note_updated", updatedNote);
		res.json({ success: true, data: updatedNote });
	} catch (error: any) {
		logger.error("Update Note Error: " + error.message);
		res.status(500).json({ success: false, error: "Failed to update note" });
	}
});

// 5. Delete a note
personalNotesRouter.delete("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const noteId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const [deletedNote] = await personalDb
			.delete(personalNotes)
			.where(
				and(
					eq(personalNotes.id, noteId),
					eq(personalNotes.ownerUserId, userId),
				),
			)
			.returning();

		if (!deletedNote) {
			return res.status(404).json({ success: false, error: "Note not found" });
		}

		socketService.emitToUser(userId, "note_deleted", { id: noteId });
		res.json({ success: true, data: deletedNote });
	} catch (error: any) {
		logger.error("Delete Note Error: " + error.message);
		res.status(500).json({ success: false, error: "Failed to delete note" });
	}
});
