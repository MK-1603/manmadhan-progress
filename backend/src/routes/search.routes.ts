import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { 
  projects, tasks, workspaceMembers, users,
  goals, habits, reminders, ideas, notes, journals, files
} from "../../database/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";

export const searchRouter = Router();

searchRouter.use(authenticate);

searchRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { q, workspaceId } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ success: false, error: "Missing or invalid search query 'q'." });
    }

    if (!workspaceId || typeof workspaceId !== "string") {
      return res.status(400).json({ success: false, error: "Missing workspaceId. Search must be isolated to a workspace." });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Verify workspace membership (System Isolation)
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, String(workspaceId)),
        eq(workspaceMembers.userId, userId)
      ),
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: "Access denied to this workspace." });
    }

    // Execute parallel isolated searches
    const searchPattern = `%${q}%`;

    const [
      projectsResult,
      tasksResult,
      membersResult,
      notesResult,
      journalsResult,
      ideasResult,
      goalsResult,
      filesResult,
      remindersResult,
      habitsResult
    ] = await Promise.all([
      db.select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
      })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, String(workspaceId)),
          or(
            ilike(projects.name, searchPattern),
            ilike(projects.description, searchPattern)
          )
        )
      )
      .limit(10),

      db.select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, String(workspaceId)),
          or(
            ilike(tasks.title, searchPattern),
            ilike(tasks.description, searchPattern)
          )
        )
      )
      .limit(15),

      db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(
        and(
          eq(workspaceMembers.workspaceId, String(workspaceId)),
          or(
            ilike(users.name, searchPattern),
            ilike(users.email, searchPattern)
          )
        )
      )
      .limit(10),

      // Notes search
      db.select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
      })
      .from(notes)
      .where(
        and(
          eq(notes.workspaceId, String(workspaceId)),
          eq(notes.userId, userId),
          or(
            ilike(notes.title, searchPattern),
            ilike(notes.content, searchPattern)
          )
        )
      )
      .limit(10),

      // Journals search
      db.select({
        id: journals.id,
        content: journals.content,
        mood: journals.mood,
      })
      .from(journals)
      .where(
        and(
          eq(journals.workspaceId, String(workspaceId)),
          eq(journals.userId, userId),
          ilike(journals.content, searchPattern)
        )
      )
      .limit(10),

      // Ideas search
      db.select({
        id: ideas.id,
        title: ideas.title,
        content: ideas.content,
      })
      .from(ideas)
      .where(
        and(
          eq(ideas.workspaceId, String(workspaceId)),
          eq(ideas.userId, userId),
          or(
            ilike(ideas.title, searchPattern),
            ilike(ideas.content, searchPattern)
          )
        )
      )
      .limit(10),

      // Goals search
      db.select({
        id: goals.id,
        title: goals.title,
        description: goals.description,
      })
      .from(goals)
      .where(
        and(
          eq(goals.workspaceId, String(workspaceId)),
          eq(goals.userId, userId),
          or(
            ilike(goals.title, searchPattern),
            ilike(goals.description, searchPattern)
          )
        )
      )
      .limit(10),

      // Files search
      db.select({
        id: files.id,
        name: files.name,
        url: files.url,
      })
      .from(files)
      .where(
        and(
          eq(files.workspaceId, String(workspaceId)),
          ilike(files.name, searchPattern)
        )
      )
      .limit(10),

      // Reminders search
      db.select({
        id: reminders.id,
        title: reminders.title,
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.workspaceId, String(workspaceId)),
          eq(reminders.userId, userId),
          ilike(reminders.title, searchPattern)
        )
      )
      .limit(10),

      // Habits search
      db.select({
        id: habits.id,
        title: habits.title,
        description: habits.description,
      })
      .from(habits)
      .where(
        and(
          eq(habits.workspaceId, String(workspaceId)),
          eq(habits.userId, userId),
          or(
            ilike(habits.title, searchPattern),
            ilike(habits.description, searchPattern)
          )
        )
      )
      .limit(10),
    ]);

    res.json({
      success: true,
      data: {
        projects: projectsResult,
        tasks: tasksResult,
        members: membersResult,
        notes: notesResult,
        journals: journalsResult,
        ideas: ideasResult,
        goals: goalsResult,
        files: filesResult,
        reminders: remindersResult,
        habits: habitsResult,
      },
    });
  } catch (error: any) {
    logger.error("Search API Error:", error);
    res.status(500).json({ success: false, error: "An internal server error occurred." });
  }
});
