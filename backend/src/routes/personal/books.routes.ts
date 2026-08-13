import { and, desc, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/db";
import { personalBooks } from "../../../database/schema/personal.schema";
import { getUserId } from "../../middleware/auth";
import { authenticate } from "../../middleware/auth.middleware";
import { socketService } from "../../services/socket.service";
import logger from "../../utils/logger";

export const personalBooksRouter = Router();

personalBooksRouter.use(authenticate);

// --- BOOKS ---

// 1. Get all books for the current user
personalBooksRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const books = await personalDb.query.personalBooks.findMany({
			where: eq(personalBooks.ownerUserId, userId),
			orderBy: [desc(personalBooks.updatedAt)],
		});

		res.json({ success: true, data: books });
	} catch (error: any) {
		logger.error(`Get Books Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch books" });
	}
});

// 2. Create a book
personalBooksRouter.post("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const {
			title,
			author,
			description,
			coverUrl,
			status,
			pageCount,
			currentPage,
		} = req.body;

		if (!title)
			return res
				.status(400)
				.json({ success: false, error: "Title is required" });

		const newId = uuidv4();
		const [newBook] = await personalDb
			.insert(personalBooks)
			.values({
				id: newId,
				ownerUserId: userId,
				title,
				author,
				description,
				coverUrl,
				status: status || "Want to Read",
				pageCount: pageCount || 0,
				currentPage: currentPage || 0,
			})
			.returning();

		socketService.emitToUser(userId, "book_created", newBook);
		res.status(201).json({ success: true, data: newBook });
	} catch (error: any) {
		logger.error(`Create Book Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to create book" });
	}
});

// 3. Update a book
personalBooksRouter.patch("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const bookId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const {
			title,
			author,
			description,
			coverUrl,
			status,
			pageCount,
			currentPage,
		} = req.body;

		const [updatedBook] = await personalDb
			.update(personalBooks)
			.set({
				title,
				author,
				description,
				coverUrl,
				status,
				pageCount,
				currentPage,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(personalBooks.id, bookId),
					eq(personalBooks.ownerUserId, userId),
				),
			)
			.returning();

		if (!updatedBook)
			return res.status(404).json({ success: false, error: "Book not found" });

		socketService.emitToUser(userId, "book_updated", updatedBook);
		res.json({ success: true, data: updatedBook });
	} catch (error: any) {
		logger.error(`Update Book Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to update book" });
	}
});

// 4. Delete a book
personalBooksRouter.delete("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const bookId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const [deletedBook] = await personalDb
			.delete(personalBooks)
			.where(
				and(
					eq(personalBooks.id, bookId),
					eq(personalBooks.ownerUserId, userId),
				),
			)
			.returning();

		if (!deletedBook)
			return res.status(404).json({ success: false, error: "Book not found" });

		socketService.emitToUser(userId, "book_deleted", { id: bookId });
		res.json({ success: true, data: deletedBook });
	} catch (error: any) {
		logger.error(`Delete Book Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to delete book" });
	}
});
