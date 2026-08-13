import { and, desc, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/client";
import {
	assistantConversations,
	assistantMessages,
	personalFocusSessions,
	personalProjects,
	personalTasks,
} from "../../../database/schema/personal.schema";
import { authenticate } from "../../middleware/auth.middleware";
import { aiService } from "../../services/ai.service";
import { logger } from "../../services/logger.service";

export const personalAiChatRouter = Router();
personalAiChatRouter.use(authenticate);

const getUserId = (req: Request) => (req as any).user?.id;

// Build workspace context for AI
async function buildPersonalContext(
	userId: string,
	_projectId?: string | null,
): Promise<string> {
	const now = new Date();
	const _todayStart = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);

	// Get projects summary
	const projects = await personalDb
		.select({
			id: personalProjects.id,
			name: personalProjects.name,
			status: personalProjects.status,
			progress: personalProjects.progress,
			deadline: personalProjects.deadline,
			priority: personalProjects.priority,
		})
		.from(personalProjects)
		.where(eq(personalProjects.ownerUserId, userId))
		.limit(10);

	// Get today's tasks
	const todayTasks = await personalDb
		.select({
			id: personalTasks.id,
			title: personalTasks.title,
			status: personalTasks.status,
			priority: personalTasks.priority,
			deadline: personalTasks.deadline,
			type: personalTasks.type,
		})
		.from(personalTasks)
		.where(and(eq(personalTasks.ownerUserId, userId)))
		.limit(20);

	// Focus today
	const focusToday = await personalDb
		.select()
		.from(personalFocusSessions)
		.where(
			and(
				eq(personalFocusSessions.userId, userId),
				eq(personalFocusSessions.workspaceId, "personal"),
			),
		)
		.limit(5);

	const totalFocusSecs = focusToday.reduce(
		(a, s) => a + (s.activeDuration || 0),
		0,
	);

	let ctx = `PERSONAL WORKSPACE CONTEXT (Current date: ${now.toISOString().split("T")[0]})\n\n`;

	ctx += `PROJECTS (${projects.length} total):\n`;
	projects.forEach((p) => {
		ctx += `- ${p.name} | Status: ${p.status} | Progress: ${p.progress}% | Priority: ${p.priority}`;
		if (p.deadline)
			ctx += ` | Deadline: ${new Date(p.deadline).toISOString().split("T")[0]}`;
		ctx += "\n";
	});

	const pendingTasks = todayTasks.filter(
		(t) => t.status !== "COMPLETED" && t.status !== "Completed",
	);
	const completedTasks = todayTasks.filter(
		(t) => t.status === "COMPLETED" || t.status === "Completed",
	);
	const overdueTasks = todayTasks.filter(
		(t) =>
			t.deadline &&
			new Date(t.deadline) < now &&
			t.status !== "COMPLETED" &&
			t.status !== "Completed",
	);

	ctx += `\nTASKS:\n`;
	ctx += `- Total: ${todayTasks.length} | Pending: ${pendingTasks.length} | Completed: ${completedTasks.length} | Overdue: ${overdueTasks.length}\n`;

	if (overdueTasks.length > 0) {
		ctx += `Overdue tasks:\n`;
		overdueTasks.slice(0, 5).forEach((t) => {
			ctx += `  * ${t.title} (${t.priority})\n`;
		});
	}
	if (pendingTasks.length > 0) {
		ctx += `Pending tasks:\n`;
		pendingTasks.slice(0, 5).forEach((t) => {
			ctx += `  * ${t.title} (${t.priority})\n`;
		});
	}

	ctx += `\nFOCUS TODAY: ${Math.round(totalFocusSecs / 60)} minutes across ${focusToday.length} sessions\n`;

	ctx += `\nRULES FOR AI:\n`;
	ctx += `- This is a PERSONAL workspace. No CEO, CO-CEO, Member, or organization concepts exist.\n`;
	ctx += `- All data belongs to this individual user only.\n`;
	ctx += `- For write actions (creating/updating), return structured JSON proposals — never claim to directly execute.\n`;
	ctx += `- Always identify the action type: READ, PROPOSAL, or ANALYSIS.\n`;

	return ctx;
}

// GET /api/v1/personal/ai/conversations
personalAiChatRouter.get(
	"/conversations",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const convs = await personalDb.query.assistantConversations.findMany({
				where: eq(assistantConversations.ownerUserId, userId),
				orderBy: [desc(assistantConversations.updatedAt)],
			});

			res.json({ success: true, data: convs });
		} catch (err: any) {
			logger.error(`Get conversations error: ${err.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to fetch conversations" });
		}
	},
);

// POST /api/v1/personal/ai/conversations
personalAiChatRouter.post(
	"/conversations",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const { title } = req.body;
			const [conv] = await personalDb
				.insert(assistantConversations)
				.values({
					id: uuidv4(),
					ownerUserId: userId,
					title: title || "New Conversation",
				})
				.returning();

			res.status(201).json({ success: true, data: conv });
		} catch (err: any) {
			logger.error(`Create conversation error: ${err.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to create conversation" });
		}
	},
);

// GET /api/v1/personal/ai/conversations/:id/messages
personalAiChatRouter.get(
	"/conversations/:id/messages",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const conv = await personalDb.query.assistantConversations.findFirst({
				where: and(
					eq(assistantConversations.id, req.params.id),
					eq(assistantConversations.ownerUserId, userId),
				),
			});
			if (!conv)
				return res
					.status(404)
					.json({ success: false, error: "Conversation not found" });

			const messages = await personalDb.query.assistantMessages.findMany({
				where: eq(assistantMessages.conversationId, req.params.id),
				orderBy: (m, { asc }) => [asc(m.createdAt)],
			});

			res.json({ success: true, data: messages });
		} catch (err: any) {
			logger.error(`Get messages error: ${err.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to fetch messages" });
		}
	},
);

// POST /api/v1/personal/ai/chat — main chat endpoint
personalAiChatRouter.post("/chat", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { message, conversationId, projectId, promptBody, modelId } =
			req.body;

		if (!message?.trim() && !promptBody?.trim()) {
			return res
				.status(400)
				.json({ success: false, error: "Message is required" });
		}

		const userMessage = message || promptBody;

		// Get or create conversation
		let convId = conversationId;
		if (!convId) {
			const title =
				userMessage.length > 50
					? `${userMessage.substring(0, 47)}...`
					: userMessage;
			const [newConv] = await personalDb
				.insert(assistantConversations)
				.values({
					id: uuidv4(),
					ownerUserId: userId,
					title,
				})
				.returning();
			convId = newConv.id;
		}

		// Verify conversation ownership
		const conv = await personalDb.query.assistantConversations.findFirst({
			where: and(
				eq(assistantConversations.id, convId),
				eq(assistantConversations.ownerUserId, userId),
			),
		});
		if (!conv)
			return res
				.status(404)
				.json({ success: false, error: "Conversation not found" });

		// Save user message
		await personalDb.insert(assistantMessages).values({
			id: uuidv4(),
			conversationId: convId,
			role: "user",
			content: userMessage,
		});

		// Build context
		const workspaceContext = await buildPersonalContext(userId, projectId);

		// Get recent conversation history (last 10 messages)
		const history = await personalDb.query.assistantMessages.findMany({
			where: eq(assistantMessages.conversationId, convId),
			orderBy: (m, { desc: d }) => [d(m.createdAt)],
		});

		const recentHistory = history.slice(0, 10).reverse();

		// Build system prompt
		const systemPrompt = `You are the ManMadhan Progress AI Builder — an intelligent execution assistant for a personal productivity workspace.

${workspaceContext}

CAPABILITIES:
- Answer questions about the user's projects, tasks, focus time, and progress
- Generate project plans, PRDs, TRDs, Application Workflows, Task proposals, Reports
- Analyze risks, deadlines, workload
- Provide actionable recommendations

RESPONSE FORMAT:
- For analysis/Q&A: respond conversationally with clear, structured text
- For proposals (new projects, tasks, documents): respond with:
  1. Brief explanation
  2. A JSON code block with the structured proposal
  3. "[PROPOSAL]" tag at the start of your response
- For write actions: ALWAYS indicate this is a proposal requiring user confirmation
- NEVER claim to directly create/modify/delete data

Keep responses focused and actionable. Avoid lengthy preambles.`;

		// Build messages for AI
		const aiMessages = recentHistory.map((m) => ({
			role: m.role as "user" | "assistant",
			content: m.content || "",
		}));

		// Call AI
		const fullPrompt = `${systemPrompt}\n\nConversation history:\n${aiMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nUser: ${userMessage}\n\nAssistant:`;

		const preferredProvider =
			modelId === "gemini-1.5-pro"
				? "gemini"
				: modelId === "claude-3.5-sonnet"
					? "groq"
					: "groq";

		const aiResponse = await aiService.generateWithSmartFailover(
			fullPrompt,
			preferredProvider,
		);
		const assistantContent =
			aiResponse.text || "I couldn't generate a response. Please try again.";

		// Save assistant message
		const [savedMsg] = await personalDb
			.insert(assistantMessages)
			.values({
				id: uuidv4(),
				conversationId: convId,
				role: "assistant",
				content: assistantContent,
			})
			.returning();

		// Update conversation title if first exchange
		if (history.length <= 1) {
			const title =
				userMessage.length > 50
					? `${userMessage.substring(0, 47)}...`
					: userMessage;
			await personalDb
				.update(assistantConversations)
				.set({ title, updatedAt: new Date() })
				.where(eq(assistantConversations.id, convId));
		} else {
			await personalDb
				.update(assistantConversations)
				.set({ updatedAt: new Date() })
				.where(eq(assistantConversations.id, convId));
		}

		// Detect if this is a proposal
		const isProposal =
			assistantContent.includes("[PROPOSAL]") ||
			assistantContent.includes("```json") ||
			assistantContent.toLowerCase().includes("here's a proposal") ||
			assistantContent.toLowerCase().includes("here is a plan");

		res.json({
			success: true,
			data: {
				conversationId: convId,
				message: savedMsg,
				isProposal,
				provider: aiResponse.provider,
			},
		});
	} catch (err: any) {
		logger.error(`AI chat error: ${err.message}`);
		res.status(500).json({
			success: false,
			error: `Failed to generate AI response: ${err.message}`,
		});
	}
});

// DELETE /api/v1/personal/ai/conversations/:id
personalAiChatRouter.delete(
	"/conversations/:id",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const conv = await personalDb.query.assistantConversations.findFirst({
				where: and(
					eq(assistantConversations.id, req.params.id),
					eq(assistantConversations.ownerUserId, userId),
				),
			});
			if (!conv)
				return res
					.status(404)
					.json({ success: false, error: "Conversation not found" });

			await personalDb
				.delete(assistantConversations)
				.where(eq(assistantConversations.id, req.params.id));
			res.json({ success: true, message: "Conversation deleted" });
		} catch (err: any) {
			logger.error(`Delete conversation error: ${err.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to delete conversation" });
		}
	},
);
