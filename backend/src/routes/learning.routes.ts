import { Router, Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../database/client";
import { books, podcasts, podcastEpisodes, readingSessions, listeningSessions, auditLogs } from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const learningRouter = Router();
learningRouter.use(authenticate);

const context = (req: Request) => ({ userId: (req as any).user?.id as string, workspaceId: String(req.query.workspaceId || req.body.workspaceId || "") });

learningRouter.get("/books", async (req, res) => {
  const { userId, workspaceId } = context(req);
  if (!workspaceId) return res.status(400).json({ success: false, error: "workspaceId is required" });
  const data = await db.select().from(books).where(and(eq(books.userId, userId), eq(books.workspaceId, workspaceId))).orderBy(desc(books.createdAt));
  return res.json({ success: true, data });
});

learningRouter.get("/books/:id", async (req, res) => {
  const { userId } = context(req);
  const data = await db.select().from(books).where(and(eq(books.id, req.params.id as string), eq(books.userId, userId))).limit(1);
  return data[0] ? res.json({ success: true, data: data[0] }) : res.status(404).json({ success: false, error: "Book not found" });
});

learningRouter.post("/books", async (req, res) => {
  const { userId, workspaceId } = context(req);
  const { title, author, totalPages, targetDate } = req.body;
  if (!workspaceId || !title) return res.status(400).json({ success: false, error: "workspaceId and title are required" });
  const created = await db.insert(books).values({ id: uuidv4(), userId, workspaceId, title, author: author || null, totalPages: totalPages ? Number(totalPages) : null, targetDate: targetDate ? new Date(targetDate) : null }).returning();
  await db.insert(auditLogs).values({ id: uuidv4(), userId, workspaceId, eventType: "BOOK_CREATED", details: `Created book: ${title}` });
  return res.status(201).json({ success: true, data: created[0] });
});

learningRouter.patch("/books/:id", async (req, res) => {
  const { userId } = context(req);
  const allowed = (({ title, author, status, totalPages, currentPage, targetDate, rating, review }) => ({ title, author, status, totalPages, currentPage, targetDate: targetDate ? new Date(targetDate) : undefined, rating, review }))(req.body);
  const updated = await db.update(books).set(allowed).where(and(eq(books.id, req.params.id as string), eq(books.userId, userId))).returning();
  if (!updated[0]) return res.status(404).json({ success: false, error: "Book not found" });
  return res.json({ success: true, data: updated[0] });
});

learningRouter.get("/podcasts", async (req, res) => {
  const { userId, workspaceId } = context(req);
  if (!workspaceId) return res.status(400).json({ success: false, error: "workspaceId is required" });
  const data = await db.select().from(podcasts).where(and(eq(podcasts.userId, userId), eq(podcasts.workspaceId, workspaceId))).orderBy(desc(podcasts.createdAt));
  const enriched = await Promise.all(data.map(async (podcast) => ({ ...podcast, episodes: await db.select().from(podcastEpisodes).where(eq(podcastEpisodes.podcastId, podcast.id)).orderBy(desc(podcastEpisodes.createdAt)) })));
  return res.json({ success: true, data: enriched });
});

learningRouter.get("/podcasts/:id", async (req, res) => {
  const { userId } = context(req);
  const podcast = await db.select().from(podcasts).where(and(eq(podcasts.id, req.params.id as string), eq(podcasts.userId, userId))).limit(1);
  if (!podcast[0]) return res.status(404).json({ success: false, error: "Podcast not found" });
  const episodes = await db.select().from(podcastEpisodes).where(eq(podcastEpisodes.podcastId, podcast[0].id)).orderBy(desc(podcastEpisodes.createdAt));
  return res.json({ success: true, data: { ...podcast[0], episodes } });
});

learningRouter.post("/podcasts", async (req, res) => {
  const { userId, workspaceId } = context(req);
  const { title, feedUrl } = req.body;
  if (!workspaceId || !title) return res.status(400).json({ success: false, error: "workspaceId and title are required" });
  const created = await db.insert(podcasts).values({ id: uuidv4(), userId, workspaceId, title, feedUrl: feedUrl || null }).returning();
  return res.status(201).json({ success: true, data: created[0] });
});

learningRouter.post("/podcasts/:podcastId/episodes", async (req, res) => {
  const { title, audioUrl, durationSeconds } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "title is required" });
  const created = await db.insert(podcastEpisodes).values({ id: uuidv4(), podcastId: req.params.podcastId, title, audioUrl: audioUrl || null, durationSeconds: Number(durationSeconds || 0) }).returning();
  return res.status(201).json({ success: true, data: created[0] });
});

learningRouter.patch("/podcast-episodes/:id", async (req, res) => {
  const updated = await db.update(podcastEpisodes).set({ positionSeconds: Number(req.body.positionSeconds || 0), lastListenedAt: new Date() }).where(eq(podcastEpisodes.id, req.params.id as string)).returning();
  if (!updated[0]) return res.status(404).json({ success: false, error: "Episode not found" });
  return res.json({ success: true, data: updated[0] });
});

export default learningRouter;
