import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { assistantConversations, assistantMessages, personalTasks } from "../../../database/schema/personal.schema";
import { eq, desc } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const assistantRouter = Router();
assistantRouter.use(authenticate);

// Get Conversations
assistantRouter.get("/conversations", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const conversations = await personalDb
      .select()
      .from(assistantConversations)
      .where(eq(assistantConversations.ownerUserId, user.id as string))
      .orderBy(desc(assistantConversations.updatedAt));
    return res.status(200).json({ success: true, data: conversations });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Create/Send Message to Assistant
assistantRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let { conversationId, message } = req.body;
    
    if (!conversationId) {
      conversationId = uuidv4();
      await personalDb.insert(assistantConversations).values({
        id: conversationId,
        ownerUserId: user.id as string,
        title: message.substring(0, 30) + "...",
      });
    }

    // Save user message
    await personalDb.insert(assistantMessages).values({
      id: uuidv4(),
      conversationId,
      role: "user",
      content: message,
    });

    // Mocking an AI Agent Router Response
    let assistantReply = "";
    let actionPayload: any = null;
    let actionType: string | null = null;
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes("task") && lowerMsg.includes("create")) {
      assistantReply = "I can create this task for you. Please confirm.";
      actionType = "CREATE_TASK";
      actionPayload = { title: message.replace(/create a task to /i, "").trim() };
    } else if (lowerMsg.includes("what") && (lowerMsg.includes("today") || lowerMsg.includes("tasks"))) {
      const tasks = await personalDb
        .select()
        .from(personalTasks)
        .where(eq(personalTasks.ownerUserId, user.id as string));
      
      const todo = tasks.filter(t => t.status === "TODO");
      assistantReply = `You have ${todo.length} tasks to do. The top priority is "${todo[0]?.title || 'nothing specific'}".`;
    } else {
      assistantReply = "I understand. I'm analyzing your workspace to provide more insights on this. Is there a specific project or metric you'd like me to look at?";
    }

    // Save assistant message
    const msgId = uuidv4();
    await personalDb.insert(assistantMessages).values({
      id: msgId,
      conversationId,
      role: "assistant",
      content: assistantReply,
      toolCalls: actionType ? { type: actionType, payload: actionPayload } : null
    });

    return res.status(200).json({ 
      success: true, 
      data: {
        id: msgId,
        role: "assistant",
        content: assistantReply,
        toolCalls: actionType ? { type: actionType, payload: actionPayload } : null,
        conversationId
      }
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Action Execution (Tool router confirmation)
assistantRouter.post("/execute", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { actionType, payload, conversationId } = req.body;

    let reply = "";

    if (actionType === "CREATE_TASK") {
      const newId = uuidv4();
      await personalDb.insert(personalTasks).values({
        id: newId,
        ownerUserId: user.id as string,
        title: payload.title || "New Task",
      });
      reply = `Task "${payload.title}" created successfully.`;
    } else {
      reply = "Action not supported.";
    }

    const msgId = uuidv4();
    await personalDb.insert(assistantMessages).values({
      id: msgId,
      conversationId,
      role: "assistant",
      content: reply,
    });

    return res.status(200).json({ success: true, data: { id: msgId, role: "assistant", content: reply } });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default assistantRouter;
