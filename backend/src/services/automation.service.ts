import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../database/client";
import { automations, automationLogs, users } from "../../database/schema";
import { aiService } from "./ai.service";
import { NotificationService } from "./notification.service";
import { env } from "../../config/env.config";
import { socketService } from "./socket.service";

export interface ParsedAutomation {
  name: string;
  description: string;
  triggerType: "SCHEDULE" | "TASK_ASSIGNED" | "TASK_ACCEPTED" | "TASK_COMPLETED" | "TASK_OVERDUE" | "PROGRESS_UPDATED";
  triggerConfig: Record<string, any>;
  conditionConfig: Record<string, any>;
  actionType: "NOTIFICATION" | "TASK_UPDATE" | "SCHEDULER" | "PROGRESS_UPDATE";
  actionConfig: Record<string, any>;
  requiresConfirmation: boolean;
  explanation: string;
  isSupported: boolean;
  unsupportedReason?: string;
}

export class AutomationService {
  /**
   * Interprets natural language prompt into a structured automation definition.
   */
  public static async interpretPrompt(prompt: string, workspaceType: "personal" | "organization" = "personal"): Promise<ParsedAutomation> {
    const text = prompt.trim().toLowerCase();

    // 1. Safety & Supported Capability Check
    if (
      text.includes("delete database") ||
      text.includes("drop table") ||
      text.includes("bulk delete") ||
      text.includes("change org setting") ||
      text.includes("rewrite code") ||
      text.includes("shutdown server")
    ) {
      return {
        name: "Unsupported Request",
        description: "Dangerous or administrative operation request.",
        triggerType: "SCHEDULE",
        triggerConfig: {},
        conditionConfig: {},
        actionType: "NOTIFICATION",
        actionConfig: {},
        requiresConfirmation: true,
        explanation: "This automation involves administrative or destructive operations that are not supported.",
        isSupported: false,
        unsupportedReason: "Dangerous or destructive operations are not supported by the automation engine.",
      };
    }

    // 2. Try Smart AI Interpretation
    const systemPrompt = `You are the ManMadhan Automation Interpreter. Convert the user's workflow prompt into a strict JSON object with zero markdown wrappers.

SUPPORTED TRIGGERS:
- SCHEDULE (cron / recurring time e.g. "every weekday at 9 AM", "every Friday at 5 PM")
- TASK_ASSIGNED (when a task is assigned)
- TASK_ACCEPTED (when a user accepts a task)
- TASK_COMPLETED (when a task is completed)
- TASK_OVERDUE (when a task becomes overdue)
- PROGRESS_UPDATED (when workspace progress changes)

SUPPORTED ACTIONS:
- NOTIFICATION (send notification / alert to user)
- TASK_UPDATE (change task status, priority, or deadline)
- SCHEDULER (trigger scheduled digest or reminder)
- PROGRESS_UPDATE (recalculate progress)

Respond ONLY in valid JSON matching this schema:
{
  "name": "short descriptive name",
  "description": "human readable explanation",
  "triggerType": "SCHEDULE | TASK_ASSIGNED | TASK_ACCEPTED | TASK_COMPLETED | TASK_OVERDUE | PROGRESS_UPDATED",
  "triggerConfig": { "cron": "0 9 * * 1-5", "time": "09:00", "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
  "conditionConfig": { "priority": "High" },
  "actionType": "NOTIFICATION | TASK_UPDATE | SCHEDULER | PROGRESS_UPDATE",
  "actionConfig": { "message": "Review priorities", "priority": "High" },
  "requiresConfirmation": false,
  "explanation": "Human readable summary of WHEN and DO behavior",
  "isSupported": true
}`;

    try {
      const response = await aiService.generateWithSmartFailover(`${systemPrompt}\n\nUSER PROMPT: "${prompt}"`);
      const responseText = typeof response === "string" ? response : (response?.text || "");
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.triggerType && parsed.actionType) {
        return {
          name: parsed.name || "Custom Automation",
          description: parsed.description || prompt,
          triggerType: parsed.triggerType,
          triggerConfig: parsed.triggerConfig || {},
          conditionConfig: parsed.conditionConfig || {},
          actionType: parsed.actionType,
          actionConfig: parsed.actionConfig || {},
          requiresConfirmation: Boolean(parsed.requiresConfirmation),
          explanation: parsed.explanation || `WHEN ${parsed.triggerType} DO ${parsed.actionType}`,
          isSupported: true,
        };
      }
    } catch (e) {
      // Fall through to deterministic rule-based parser fallback
    }

    // 3. Fallback Deterministic Rule-Based Parsing
    if (text.includes("weekday at 9") || text.includes("every day at 9") || text.includes("9 am")) {
      return {
        name: "Daily 9 AM Priorities Review",
        description: "Sends a reminder notification every weekday morning at 9:00 AM.",
        triggerType: "SCHEDULE",
        triggerConfig: { time: "09:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
        conditionConfig: {},
        actionType: "NOTIFICATION",
        actionConfig: { message: "Review your daily priorities and focus tasks." },
        requiresConfirmation: false,
        explanation: "WHEN Every weekday at 9:00 AM DO Send notification: 'Review your daily priorities and focus tasks.'",
        isSupported: true,
      };
    }

    if (text.includes("task is assigned") || text.includes("assigned to me")) {
      return {
        name: "New Task Assignment Alert",
        description: "Notifies immediately when a new task is assigned.",
        triggerType: "TASK_ASSIGNED",
        triggerConfig: { event: "TASK_ASSIGNED" },
        conditionConfig: {},
        actionType: "NOTIFICATION",
        actionConfig: { message: "A new task has been assigned to you." },
        requiresConfirmation: false,
        explanation: "WHEN A task is assigned to you DO Send immediate notification.",
        isSupported: true,
      };
    }

    if (text.includes("overdue")) {
      return {
        name: "Overdue Task Alert & High Priority Escalation",
        description: "Sends an alert notification and flags task as High priority when overdue.",
        triggerType: "TASK_OVERDUE",
        triggerConfig: { event: "TASK_OVERDUE" },
        conditionConfig: {},
        actionType: "NOTIFICATION",
        actionConfig: { message: "Task is overdue! Action required.", setPriority: "High" },
        requiresConfirmation: false,
        explanation: "WHEN A task becomes overdue DO Send alert notification and escalate priority to High.",
        isSupported: true,
      };
    }

    if (text.includes("friday at 5") || text.includes("weekly progress")) {
      return {
        name: "Friday Weekly Progress Summary",
        description: "Generates weekly execution summary every Friday at 5:00 PM.",
        triggerType: "SCHEDULE",
        triggerConfig: { time: "17:00", days: ["Friday"] },
        conditionConfig: {},
        actionType: "SCHEDULER",
        actionConfig: { message: "Create weekly progress summary report." },
        requiresConfirmation: false,
        explanation: "WHEN Every Friday at 5:00 PM DO Generate weekly progress summary.",
        isSupported: true,
      };
    }

    if (text.includes("complete a task") || text.includes("completed")) {
      return {
        name: "Task Completion Progress Sync",
        description: "Automatically recalculates overall progress when a task is completed.",
        triggerType: "TASK_COMPLETED",
        triggerConfig: { event: "TASK_COMPLETED" },
        conditionConfig: {},
        actionType: "PROGRESS_UPDATE",
        actionConfig: { recalculateProgress: true },
        requiresConfirmation: false,
        explanation: "WHEN A task is completed DO Automatically update overall progress.",
        isSupported: true,
      };
    }

    // Generic fallback for valid prompts
    return {
      name: "Custom Workflow Rule",
      description: prompt,
      triggerType: "SCHEDULE",
      triggerConfig: { time: "09:00" },
      conditionConfig: {},
      actionType: "NOTIFICATION",
      actionConfig: { message: prompt },
      requiresConfirmation: false,
      explanation: `WHEN Prompt trigger occurs DO Execute notification action: "${prompt}"`,
      isSupported: true,
    };
  }

  /**
   * Creates and activates an automation in the database.
   */
  public static async createAutomation(data: {
    workspaceId?: string;
    createdByUserId: string;
    name: string;
    description?: string;
    creationMode?: "PROMPT" | "VISUAL";
    originalPrompt?: string;
    triggerType: string;
    triggerConfig: Record<string, any>;
    conditionConfig?: Record<string, any>;
    actionType: string;
    actionConfig: Record<string, any>;
    status?: string;
    requiresConfirmation?: boolean;
  }) {
    const id = uuidv4();
    const newAutomation = {
      id,
      workspaceId: data.workspaceId || null,
      createdByUserId: data.createdByUserId,
      name: data.name,
      description: data.description || "",
      creationMode: data.creationMode || "PROMPT",
      originalPrompt: data.originalPrompt || null,
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig || {},
      conditionConfig: data.conditionConfig || {},
      actionType: data.actionType,
      actionConfig: data.actionConfig || {},
      status: data.status || "ACTIVE",
      requiresConfirmation: Boolean(data.requiresConfirmation),
      lastRunAt: null,
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(automations).values(newAutomation);

    // Socket.IO notification for real-time client updates
    try {
      socketService.emitToUser(data.createdByUserId, "automation.created", newAutomation);
    } catch (e) {
      // Ignore socket emit error
    }

    return newAutomation;
  }

  /**
   * Executes event-driven automations dynamically (e.g. TASK_ASSIGNED, TASK_COMPLETED, TASK_OVERDUE).
   */
  public static async triggerEvent(
    eventType: "TASK_ASSIGNED" | "TASK_ACCEPTED" | "TASK_COMPLETED" | "TASK_OVERDUE" | "PROGRESS_UPDATED",
    payload: { userId: string; workspaceId?: string; taskId?: string; taskTitle?: string; details?: any }
  ) {
    try {
      const matchingAutomations = await db
        .select()
        .from(automations)
        .where(
          and(
            eq(automations.triggerType, eventType),
            eq(automations.status, "ACTIVE")
          )
        );

      for (const auto of matchingAutomations) {
        // Execute Action
        const logId = uuidv4();
        let status = "SUCCESS";
        let errorMsg = null;

        try {
          if (auto.actionType === "NOTIFICATION") {
            const actionCfg = (auto.actionConfig || {}) as Record<string, any>;
            const message = actionCfg.message || `Automation Triggered: ${auto.name}`;
            await NotificationService.dispatch({
              type: "AUTOMATION_ALERT",
              userId: payload.userId,
              clientUrl: env.CLIENT_URL,
              data: {
                title: auto.name,
                message: `${message} (${payload.taskTitle || "Task update"})`,
              },
            });
          }

          // Update automation stats
          await db
            .update(automations)
            .set({
              lastRunAt: new Date(),
              runCount: (auto.runCount || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(automations.id, auto.id));
        } catch (err: any) {
          status = "FAILED";
          errorMsg = err.message || "Failed to execute action";
        }

        // Record Execution Log in DB
        await db.insert(automationLogs).values({
          id: logId,
          automationId: auto.id,
          workspaceId: auto.workspaceId || payload.workspaceId || null,
          userId: payload.userId,
          status,
          triggeredBy: `EVENT_${eventType}`,
          executionDetails: payload,
          errorMessage: errorMsg,
          executedAt: new Date(),
        });

        // Broadcast Real-Time Socket Event
        try {
          socketService.emitToUser(payload.userId, "automation.triggered", {
            automationId: auto.id,
            name: auto.name,
            status,
            executedAt: new Date(),
          });
        } catch (e) {}
      }
    } catch (e) {
      console.error("Error evaluating event automation:", e);
    }
  }

  /**
   * Lists automations for a user or workspace.
   */
  public static async listAutomations(userId: string, workspaceId?: string) {
    if (workspaceId) {
      return db
        .select()
        .from(automations)
        .where(eq(automations.workspaceId, workspaceId))
        .orderBy(desc(automations.createdAt));
    }
    return db
      .select()
      .from(automations)
      .where(eq(automations.createdByUserId, userId))
      .orderBy(desc(automations.createdAt));
  }

  /**
   * Fetches execution history logs for an automation.
   */
  public static async getLogs(automationId: string) {
    return db
      .select()
      .from(automationLogs)
      .where(eq(automationLogs.automationId, automationId))
      .orderBy(desc(automationLogs.executedAt))
      .limit(50);
  }
}
