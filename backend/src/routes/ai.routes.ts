import { and, eq, desc, ilike, or } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	workspaceMembers,
	commandSessions,
	commandMessages,
	commandExecutions,
	users,
	workspaces,
	projects,
	tasks,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { CommandEngineService, CommandContext } from "../services/command-engine.service";

export const aiRouter = Router();

aiRouter.use(authenticate);

/**
 * Dynamically resolve active organization workspace ID for authenticated user
 */
async function resolveActiveOrgWorkspace(userId: string, requestedWorkspaceId?: string): Promise<string> {
	if (requestedWorkspaceId && requestedWorkspaceId !== "org-workspace-default") {
		const verified = await db
			.select({ id: workspaces.id })
			.from(workspaces)
			.innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
			.where(and(eq(workspaces.id, requestedWorkspaceId), eq(workspaceMembers.userId, userId)))
			.limit(1);
		if (verified.length > 0) return verified[0].id;
	}

	// Dynamic resolution: Find user's organization workspace
	const userOrgWorkspace = await db
		.select({ id: workspaces.id })
		.from(workspaces)
		.innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
		.where(and(eq(workspaceMembers.userId, userId), eq(workspaces.type, "organization")))
		.limit(1);

	if (userOrgWorkspace.length > 0) return userOrgWorkspace[0].id;

	// Fallback: Check if any organization workspace exists and link member record
	const anyOrg = await db
		.select({ id: workspaces.id })
		.from(workspaces)
		.where(eq(workspaces.type, "organization"))
		.limit(1);

	if (anyOrg.length > 0) {
		const wsId = anyOrg[0].id;
		try {
			await db.insert(workspaceMembers).values({
				id: `wm-${uuidv4().slice(0, 8)}`,
				workspaceId: wsId,
				userId,
				role: "CEO",
				createdAt: new Date(),
			});
		} catch {
			// Member already exists
		}
		return wsId;
	}

	// Provision default organization workspace for authenticated user
	const newWs = await db.insert(workspaces).values({
		id: `ws-org-${uuidv4().slice(0, 8)}`,
		name: "ManMadhan Organization",
		type: "organization",
		createdAt: new Date(),
	}).returning();

	const createdWsId = newWs[0].id;
	await db.insert(workspaceMembers).values({
		id: `wm-${uuidv4().slice(0, 8)}`,
		workspaceId: createdWsId,
		userId,
		role: "CEO",
		createdAt: new Date(),
	});

	return createdWsId;
}

// ── GET PAST SESSIONS LIST (COMMAND HISTORY PANEL) ─────────────────────
aiRouter.get("/command/sessions", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

		const searchQuery = String(req.query.q || "").trim();
		const activeWorkspaceId = await resolveActiveOrgWorkspace(user.id, req.query.workspaceId as string);

		let sessions;
		if (searchQuery) {
			sessions = await db
				.select()
				.from(commandSessions)
				.where(
					and(
						eq(commandSessions.userId, user.id),
						eq(commandSessions.workspaceId, activeWorkspaceId),
						ilike(commandSessions.title, `%${searchQuery}%`)
					)
				)
				.orderBy(desc(commandSessions.updatedAt))
				.limit(30);
		} else {
			sessions = await db
				.select()
				.from(commandSessions)
				.where(
					and(
						eq(commandSessions.userId, user.id),
						eq(commandSessions.workspaceId, activeWorkspaceId)
					)
				)
				.orderBy(desc(commandSessions.updatedAt))
				.limit(30);
		}

		return res.json({
			success: true,
			data: sessions.map((s) => ({
				id: s.id,
				title: s.title,
				updatedAt: s.updatedAt,
				createdAt: s.createdAt,
				timestamp: new Date(s.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
			})),
		});
	} catch (err: any) {
		logger.error(`Get Sessions Error: ${err.message}`);
		return res.status(500).json({ success: false, error: "Unable to load command sessions." });
	}
});

// ── GET SINGLE SESSION BY ID (DEEP LINKING & CONVERSATION FEED) ───────
aiRouter.get("/command/sessions/:id", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

		const sessionId = req.params.id;
		const [session] = await db
			.select()
			.from(commandSessions)
			.where(and(eq(commandSessions.id, sessionId), eq(commandSessions.userId, user.id)))
			.limit(1);

		if (!session) {
			return res.status(404).json({ success: false, error: "Command session not found." });
		}

		const messages = await db
			.select()
			.from(commandMessages)
			.where(eq(commandMessages.sessionId, sessionId))
			.orderBy(commandMessages.createdAt);

		return res.json({
			success: true,
			data: {
				session: {
					id: session.id,
					title: session.title,
					workspaceId: session.workspaceId,
					createdAt: session.createdAt,
					updatedAt: session.updatedAt,
				},
				messages: messages.map((m) => ({
					id: m.id,
					sender: m.sender,
					text: m.text,
					preview: m.previewJson || null,
					executed: m.executed,
					executedLink: m.executedLink,
					timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
				})),
			},
		});
	} catch (err: any) {
		logger.error(`Get Session Detail Error: ${err.message}`);
		return res.status(500).json({ success: false, error: "Unable to load session details." });
	}
});

// ── RENAME SESSION TITLE ──────────────────────────────────────────────
aiRouter.patch("/command/sessions/:id", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

		const sessionId = req.params.id;
		const { title } = req.body;

		if (!title || typeof title !== "string" || !title.trim()) {
			return res.status(400).json({ success: false, error: "Valid title is required." });
		}

		const [updated] = await db
			.update(commandSessions)
			.set({ title: title.trim(), updatedAt: new Date() })
			.where(and(eq(commandSessions.id, sessionId), eq(commandSessions.userId, user.id)))
			.returning();

		if (!updated) {
			return res.status(404).json({ success: false, error: "Session not found." });
		}

		return res.json({ success: true, data: updated });
	} catch (err: any) {
		logger.error(`Rename Session Error: ${err.message}`);
		return res.status(500).json({ success: false, error: "Unable to rename session." });
	}
});

// ── DELETE SESSION ───────────────────────────────────────────────────
aiRouter.delete("/command/sessions/:id", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

		const sessionId = req.params.id;
		const [deleted] = await db
			.delete(commandSessions)
			.where(and(eq(commandSessions.id, sessionId), eq(commandSessions.userId, user.id)))
			.returning();

		if (!deleted) {
			return res.status(404).json({ success: false, error: "Session not found." });
		}

		return res.json({ success: true, message: "Session deleted cleanly." });
	} catch (err: any) {
		logger.error(`Delete Session Error: ${err.message}`);
		return res.status(500).json({ success: false, error: "Unable to delete session." });
	}
});

// ── EDIT USER MESSAGE TEXT ───────────────────────────────────────────
aiRouter.patch("/command/messages/:id", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

		const messageId = req.params.id;
		const { text } = req.body;

		if (!text || typeof text !== "string" || !text.trim()) {
			return res.status(400).json({ success: false, error: "Valid message text is required." });
		}

		const [updated] = await db
			.update(commandMessages)
			.set({ text: text.trim() })
			.where(and(eq(commandMessages.id, messageId), eq(commandMessages.sender, "user")))
			.returning();

		if (!updated) {
			return res.status(404).json({ success: false, error: "User message not found or unauthorized." });
		}

		return res.json({ success: true, data: updated });
	} catch (err: any) {
		logger.error(`Edit Message Error: ${err.message}`);
		return res.status(500).json({ success: false, error: "Unable to edit message." });
	}
});

// ── DELETE USER MESSAGE ──────────────────────────────────────────────
aiRouter.delete("/command/messages/:id", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

		const messageId = req.params.id;
		const [deleted] = await db
			.delete(commandMessages)
			.where(and(eq(commandMessages.id, messageId), eq(commandMessages.sender, "user")))
			.returning();

		if (!deleted) {
			return res.status(404).json({ success: false, error: "User message not found or unauthorized." });
		}

		return res.json({ success: true, message: "Message deleted cleanly." });
	} catch (err: any) {
		logger.error(`Delete Message Error: ${err.message}`);
		return res.status(500).json({ success: false, error: "Unable to delete message." });
	}
});

// ── SERVER-SIDE @MENTIONS SEARCH API ─────────────────────────────────────
aiRouter.get("/command/mentions", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

		const query = String(req.query.q || "").trim();
		const activeWorkspaceId = await resolveActiveOrgWorkspace(user.id, req.query.workspaceId as string);

		// 1. Search People in Workspace
		const peopleQuery = db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				role: workspaceMembers.role,
			})
			.from(workspaceMembers)
			.innerJoin(users, eq(users.id, workspaceMembers.userId))
			.where(
				and(
					eq(workspaceMembers.workspaceId, activeWorkspaceId),
					query ? or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`)) : undefined
				)
			)
			.limit(5);

		// 2. Search Projects in Workspace
		const projectsQuery = db
			.select({
				id: projects.id,
				name: projects.name,
				status: projects.status,
			})
			.from(projects)
			.where(
				and(
					eq(projects.workspaceId, activeWorkspaceId),
					query ? ilike(projects.name, `%${query}%`) : undefined
				)
			)
			.limit(3);

		// 3. Search Tasks in Workspace
		const tasksQuery = db
			.select({
				id: tasks.id,
				title: tasks.title,
				status: tasks.status,
			})
			.from(tasks)
			.where(
				and(
					eq(tasks.workspaceId, activeWorkspaceId),
					query ? ilike(tasks.title, `%${query}%`) : undefined
				)
			)
			.limit(3);

		const [people, projectList, taskList] = await Promise.all([
			peopleQuery,
			projectsQuery,
			tasksQuery,
		]);

		return res.json({
			success: true,
			data: {
				people: people.map((p) => ({
					id: p.id,
					type: "USER",
					displayName: p.name || p.email,
					subtitle: p.role || "Member",
					email: p.email,
				})),
				projects: projectList.map((p) => ({
					id: p.id,
					type: "PROJECT",
					displayName: p.name,
					subtitle: p.status || "ACTIVE",
				})),
				tasks: taskList.map((t) => ({
					id: t.id,
					type: "TASK",
					displayName: t.title,
					subtitle: t.status || "In Progress",
				})),
			},
		});
	} catch (err: any) {
		logger.error(`Mentions Search Error: ${err.message}`);
		return res.status(500).json({ success: false, error: "Unable to search mentions." });
	}
});

// ── COMMAND HISTORY ENDPOINT (AUDIT EXECUTIONS) ────────────────────────
aiRouter.get("/command/history", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

		const history = await db
			.select()
			.from(commandExecutions)
			.where(eq(commandExecutions.userId, user.id))
			.orderBy(desc(commandExecutions.createdAt))
			.limit(20);

		return res.json({
			success: true,
			data: history.map((h: any) => ({
				id: h.id,
				command: h.commandId,
				type: h.actionType,
				actionType: h.actionType,
				entityType: h.entityType || "ENTITY",
				entityId: h.entityId,
				status: h.status,
				errorMessage: h.errorMessage,
				createdAt: h.createdAt,
				timestamp: new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
			})),
		});
	} catch (err: any) {
		logger.error(`Command History Error [Code: ${err.code || "UNKNOWN"}, Constraint: ${err.constraint || "NONE"}]: ${err.message}`);
		return res.status(500).json({ success: false, error: "Unable to load execution history." });
	}
});

// ── DYNAMIC LEARNING TOPICS ENDPOINT ─────────────────────────────────────────
aiRouter.get("/topics", async (_req: Request, res: Response) => {
	const defaultTopics = [
		{ id: "top-1", name: "AI AGENTS", category: "AI Architecture" },
		{ id: "top-2", name: "AI AUTOMATION", category: "Workflows" },
		{ id: "top-3", name: "FINE TUNING & AI ASSISTANTS", category: "LLM Engineering" },
		{ id: "top-4", name: "PROMPT ENGINEERING", category: "Fundamentals" },
		{ id: "top-5", name: "STAYING UPDATED", category: "Research" },
		{ id: "top-6", name: "RAG", category: "Knowledge Systems" },
		{ id: "top-7", name: "LLM MANAGEMENT", category: "Ops" },
		{ id: "top-8", name: "MULTIMODAL AI", category: "Vision & Audio" },
		{ id: "top-9", name: "AI TOOL STACKING", category: "Tooling" },
		{ id: "top-10", name: "AI VIDEO CONTENT GENERATION", category: "Media" },
		{ id: "top-11", name: "VOICE", category: "Audio" },
		{ id: "top-12", name: "MCP", category: "Protocol" },
		{ id: "top-13", name: "AGENT PROTOCOL", category: "Protocol" },
		{ id: "top-14", name: "AI POWERED SAAS DEVELOPMENT", category: "SaaS" },
	];

	return res.json({
		success: true,
		data: defaultTopics,
	});
});

// ── MANMADHAN COMMAND MAIN NATURAL LANGUAGE ENDPOINT ───────────────────────────
aiRouter.post("/command", async (req: Request, res: Response) => {
	try {
		const { prompt, workspaceId, workspaceType, sessionId, mentions } = req.body;
		const user = (req as any).user;

		if (!user || !user.id) {
			return res.status(401).json({ success: false, error: "Unauthorized: Invalid user session." });
		}

		if (!prompt || typeof prompt !== "string") {
			return res.status(400).json({ success: false, error: "Prompt is required." });
		}

		// Enforce strict Organization workspace boundary
		if (workspaceType === "PERSONAL") {
			return res.status(400).json({
				success: false,
				error: "ManMadhan Command operates exclusively within the ManMadhan Organization Workspace.",
			});
		}

		// Dynamically resolve valid active organization workspace ID for authenticated user
		const activeWorkspaceId = await resolveActiveOrgWorkspace(user.id, workspaceId);

		const context: CommandContext = {
			userId: user.id,
			userRole: user.role || "CEO",
			workspaceId: activeWorkspaceId,
			workspaceType: "ORGANIZATION",
			userName: user.name || user.email || "CEO",
			mentions: Array.isArray(mentions) ? mentions : [],
		};

		const result = await CommandEngineService.processCommand(prompt, context, sessionId);

		return res.json({
			success: true,
			data: {
				responseText: result.message,
				preview: result.actionPreview || null,
				sessionId: result.sessionId,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error: any) {
		logger.error(`ManMadhan Command Error [Code: ${error.code || "UNKNOWN"}, Constraint: ${error.constraint || "NONE"}, Table: ${error.table || "N/A"}]: ${error.message}`);
		return res.status(500).json({
			success: false,
			error: "Couldn't start this command session. Please try again.",
			details: process.env.NODE_ENV === "development" ? error.message : undefined,
		});
	}
});

// ── EXECUTE ACTION PREVIEW ENDPOINT ──────────────────────────────────────────
aiRouter.post("/command/execute", async (req: Request, res: Response) => {
	try {
		const { actionPreview, workspaceId } = req.body;
		const user = (req as any).user;

		if (!user || !user.id) {
			return res.status(401).json({ success: false, error: "Unauthorized: Invalid user session." });
		}

		if (!actionPreview || !actionPreview.actionType) {
			return res.status(400).json({ success: false, error: "Action preview object is required." });
		}

		const activeWorkspaceId = await resolveActiveOrgWorkspace(user.id, workspaceId);

		const context: CommandContext = {
			userId: user.id,
			userRole: user.role || "CEO",
			workspaceId: activeWorkspaceId,
			workspaceType: "ORGANIZATION",
			userName: user.name || user.email || "CEO",
		};

		const executionResult = await CommandEngineService.executeAction(actionPreview, context);

		return res.json({
			success: true,
			data: executionResult,
		});
	} catch (error: any) {
		logger.error(`Execute Action Error [Code: ${error.code || "UNKNOWN"}, Constraint: ${error.constraint || "NONE"}]: ${error.message}`);
		return res.status(500).json({
			success: false,
			error: error.message || "Failed to execute action preview.",
		});
	}
});
