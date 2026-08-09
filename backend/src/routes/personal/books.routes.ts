import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { personalBooks, personalReadingSessions, personalActivityLogs, personalBookActivityLogs } from "../../../database/schema/personal.schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";
import { BookMetadataService } from "../../services/BookMetadataService";
import { ReadingPlanService } from "../../services/ReadingPlanService";

export const personalBooksRouter = Router();
personalBooksRouter.use(authenticate);

// GET /api/v1/personal/books
personalBooksRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status } = req.query;
    let conditions = [eq(personalBooks.ownerUserId, user.id as string)];
    
    if (status && status !== "All") {
      conditions.push(eq(personalBooks.status, status as string));
    }

    const books = await personalDb
      .select()
      .from(personalBooks)
      .where(and(...conditions))
      .orderBy(desc(personalBooks.createdAt));

    // Calculate reading plan data on the fly for each book
    const enhancedBooks = books.map(book => {
      const plan = ReadingPlanService.getFullPlan(book as any);
      return { ...book, plan };
    });

    return res.status(200).json({ success: true, data: enhancedBooks });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/personal/books/:id
personalBooksRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const bookId = req.params.id as string;
    const [book] = await personalDb.select().from(personalBooks).where(and(eq(personalBooks.id, bookId as string), eq(personalBooks.ownerUserId, user.id as string)));
    
    if (!book) return res.status(404).json({ success: false, error: "Book not found" });

    const plan = ReadingPlanService.getFullPlan(book as any);
    return res.status(200).json({ success: true, data: { ...book, plan } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/personal/books/discover
personalBooksRouter.post("/discover", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, error: "Query (URL, ISBN, or Title) is required" });

    const metadata = await BookMetadataService.discoverBook(query);
    if (!metadata) {
      return res.status(404).json({ success: false, error: "Book metadata not found." });
    }

    return res.status(200).json({ success: true, data: metadata });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to discover book: " + error.message });
  }
});

// POST /api/v1/personal/books
personalBooksRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const bookData = req.body;
    
    if (!bookData.title) return res.status(400).json({ success: false, error: "Title is required" });

    const newBookId = uuidv4();
    
    await personalDb.transaction(async (tx) => {
      await tx.insert(personalBooks).values({
        id: newBookId,
        ownerUserId: user.id as string,
        title: bookData.title,
        subtitle: bookData.subtitle,
        author: bookData.author,
        description: bookData.description,
        isbn10: bookData.isbn10,
        isbn13: bookData.isbn13,
        publisher: bookData.publisher,
        publicationDate: bookData.publicationDate,
        pageCount: bookData.pageCount ? parseInt(bookData.pageCount) : null,
        coverUrl: bookData.coverUrl,
        sourceUrl: bookData.sourceUrl,
        metadataProvider: bookData.metadataProvider,
        status: bookData.status || "Want to Read",
        dailyPageTarget: bookData.dailyPageTarget ? parseInt(bookData.dailyPageTarget) : 20,
      });

      await tx.insert(personalBookActivityLogs).values({
        id: uuidv4(),
        bookId: newBookId,
        ownerUserId: user.id as string,
        action: "Book added",
        details: `Added book "${bookData.title}" to library.`,
      });
    });

    const [created] = await personalDb.select().from(personalBooks).where(eq(personalBooks.id, newBookId));
    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/personal/books/:id/session (Reading Engine)
personalBooksRouter.post("/:id/session", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const bookId = req.params.id as string;
    const { pagesRead, durationMinutes, endPage, notes } = req.body;

    const [book] = await personalDb.select().from(personalBooks).where(and(eq(personalBooks.id, bookId as string), eq(personalBooks.ownerUserId, user.id as string)));
    if (!book) return res.status(404).json({ success: false, error: "Book not found" });

    const newCurrentPage = endPage || (book.currentPage || 0) + parseInt(pagesRead);
    const actualPagesRead = pagesRead ? parseInt(pagesRead) : (newCurrentPage - (book.currentPage || 0));

    await personalDb.transaction(async (tx) => {
      await tx.insert(personalReadingSessions).values({
        id: uuidv4(),
        bookId,
        ownerUserId: user.id as string,
        pagesRead: actualPagesRead,
        durationMinutes: parseInt(durationMinutes || 0),
        startPage: book.currentPage,
        endPage: newCurrentPage,
        notes: notes
      });

      let newStatus = book.status;
      if (newStatus === "Want to Read" || newStatus === "Planned") newStatus = "Reading";
      if (book.pageCount && newCurrentPage >= book.pageCount) newStatus = "Completed";

      await tx.update(personalBooks)
        .set({ 
          currentPage: newCurrentPage, 
          status: newStatus,
          updatedAt: new Date()
        })
        .where(eq(personalBooks.id, bookId as string));

      await tx.insert(personalBookActivityLogs).values({
        id: uuidv4(),
        bookId,
        ownerUserId: user.id as string,
        action: "Session Logged",
        details: `Read ${actualPagesRead} pages.`,
      });
    });

    const [updated] = await personalDb.select().from(personalBooks).where(eq(personalBooks.id, bookId as string));
    const plan = ReadingPlanService.getFullPlan(updated as any);
    
    return res.status(201).json({ success: true, data: { ...updated, plan } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/personal/books/:id/sessions
personalBooksRouter.get("/:id/sessions", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const bookId = req.params.id as string;
    const sessions = await personalDb
      .select()
      .from(personalReadingSessions)
      .where(and(eq(personalReadingSessions.bookId, bookId as string), eq(personalReadingSessions.ownerUserId, user.id as string)))
      .orderBy(desc(personalReadingSessions.date));

    return res.status(200).json({ success: true, data: sessions });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/personal/books/:id/activity
personalBooksRouter.get("/:id/activity", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const bookId = req.params.id as string;
    const logs = await personalDb
      .select()
      .from(personalBookActivityLogs)
      .where(and(eq(personalBookActivityLogs.bookId, bookId as string), eq(personalBookActivityLogs.ownerUserId, user.id as string)))
      .orderBy(desc(personalBookActivityLogs.createdAt));

    return res.status(200).json({ success: true, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default personalBooksRouter;

