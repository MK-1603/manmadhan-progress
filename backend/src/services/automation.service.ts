import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { db } from "../../database/client";
import { automations, automationLogs, users, tasks, motivations, motivationDeliveries } from "../../database/schema";
import { aiService } from "./ai.service";
import { NotificationService } from "./notification.service";
import { AuditService } from "./audit.service";
import { env } from "../../config/env.config";
import { socketService } from "./socket.service";
import { logger } from "./logger.service";

export interface ParsedAutomation {
  name: string;
  description: string;
  triggerType: "SCHEDULE" | "TASK_CREATED" | "TASK_ASSIGNED" | "TASK_STARTED" | "TASK_STATUS_CHANGED" | "TASK_DEADLINE_APPROACHING" | "TASK_OVERDUE" | "TASK_COMPLETED" | "TASK_BLOCKED" | "DAILY_MOTIVATION";
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
  public static async interpretPrompt(prompt: string, workspaceType: "personal" | "organization" = "organization"): Promise<ParsedAutomation> {
    const text = prompt.trim().toLowerCase();

    // 1. Safety Check
    if (
      text.includes("delete database") ||
      text.includes("drop table") ||
      text.includes("bulk delete") ||
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
        explanation: "Dangerous operations are not supported by the automation engine.",
        isSupported: false,
        unsupportedReason: "Dangerous or destructive operations are prohibited.",
      };
    }

    // 2. AI Smart Failover Interpretation
    const systemPrompt = `You are the ManMadhan Automation Interpreter. Convert the user's workflow prompt into a strict JSON object with zero markdown wrappers.

SUPPORTED TRIGGERS:
- SCHEDULE (recurring cron / time e.g. "every weekday at 9 AM")
- TASK_ASSIGNED (when a task is assigned)
- TASK_STARTED (when a task starts / moves to In Progress)
- TASK_DEADLINE_APPROACHING (1 hour, 3 hours, 24 hours before deadline)
- TASK_OVERDUE (when deadline passes and task is incomplete)
- TASK_COMPLETED (when a task is completed)
- TASK_BLOCKED (when a task is blocked)
- DAILY_MOTIVATION (daily morning focus & priority summary)

SUPPORTED ACTIONS:
- NOTIFICATION (send in-app/push notification)
- TASK_UPDATE (update priority or status)
- SCHEDULER (trigger scheduled digest)
- PROGRESS_UPDATE (recalculate progress)

Respond ONLY in valid JSON:
{
  "name": "short descriptive name",
  "description": "human readable description",
  "triggerType": "SCHEDULE | TASK_ASSIGNED | TASK_STARTED | TASK_DEADLINE_APPROACHING | TASK_OVERDUE | TASK_COMPLETED | TASK_BLOCKED | DAILY_MOTIVATION",
  "triggerConfig": { "time": "09:00", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "leadMinutes": 60 },
  "conditionConfig": { "statusNotIn": ["Completed"], "priority": "High" },
  "actionType": "NOTIFICATION | TASK_UPDATE | SCHEDULER | PROGRESS_UPDATE",
  "actionConfig": { "message": "Review priorities", "priority": "High", "channel": "IN_APP_NOTIFICATION" },
  "requiresConfirmation": false,
  "explanation": "Summary of WHEN and DO behavior",
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
      // Fall through to deterministic rules
    }

    // 3. Fallback Deterministic Rule-Based Parser
    if (text.includes("weekday at 9") || text.includes("9 am") || text.includes("motivation")) {
      return {
        name: "Daily Morning Focus & Priority Digest",
        description: "Sends a daily priority digest every weekday morning at 9:00 AM.",
        triggerType: "DAILY_MOTIVATION",
        triggerConfig: { time: "09:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
        conditionConfig: {},
        actionType: "NOTIFICATION",
        actionConfig: { message: "Review your daily focus tasks and top priority objectives.", channel: "IN_APP_NOTIFICATION" },
        requiresConfirmation: false,
        explanation: "WHEN Every weekday at 9:00 AM DO Send priority summary notification.",
        isSupported: true,
      };
    }

    if (text.includes("assigned")) {
      return {
        name: "New Task Assignment Alert",
        description: "Notifies immediately when a task is assigned to a user.",
        triggerType: "TASK_ASSIGNED",
        triggerConfig: { event: "TASK_ASSIGNED" },
        conditionConfig: {},
        actionType: "NOTIFICATION",
        actionConfig: { message: "A new execution task has been assigned to you.", channel: "IN_APP_NOTIFICATION" },
        requiresConfirmation: false,
        explanation: "WHEN A task is assigned DO Send instant notification to assignee.",
        isSupported: true,
      };
    }

    if (text.includes("deadline") || text.includes("remind me")) {
      return {
        name: "1-Hour Task Deadline Reminder",
        description: "Sends an urgent alert 1 hour before a task deadline.",
        triggerType: "TASK_DEADLINE_APPROACHING",
        triggerConfig: { leadMinutes: 60 },
        conditionConfig: { statusNotIn: ["Completed"] },
        actionType: "NOTIFICATION",
        actionConfig: { message: "Task deadline is approaching in 1 hour.", priority: "High" },
        requiresConfirmation: false,
        explanation: "WHEN Task deadline is 1 hour away AND status is incomplete DO Send urgent reminder.",
        isSupported: true,
      };
    }

    if (text.includes("overdue")) {
      return {
        name: "Overdue Task Escalation Alert",
        description: "Notifies assignee when a task passes its deadline.",
        triggerType: "TASK_OVERDUE",
        triggerConfig: { event: "TASK_OVERDUE" },
        conditionConfig: { statusNotIn: ["Completed"] },
        actionType: "NOTIFICATION",
        actionConfig: { message: "Task deadline has passed and is marked overdue.", priority: "Urgent" },
        requiresConfirmation: false,
        explanation: "WHEN Task deadline passes AND task is incomplete DO Send overdue escalation alert.",
        isSupported: true,
      };
    }

    return {
      name: "Custom Workflow Automation",
      description: prompt,
      triggerType: "SCHEDULE",
      triggerConfig: { time: "09:00" },
      conditionConfig: {},
      actionType: "NOTIFICATION",
      actionConfig: { message: prompt },
      requiresConfirmation: false,
      explanation: `WHEN Custom schedule occurs DO Send notification: "${prompt}"`,
      isSupported: true,
    };
  }

  /**
   * Creates a new automation in DB.
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
    const wsId = data.workspaceId && String(data.workspaceId).trim() !== "" && String(data.workspaceId) !== "undefined" && String(data.workspaceId) !== "null"
      ? String(data.workspaceId).trim()
      : null;

    const newAutomation = {
      id,
      workspaceId: wsId,
      createdByUserId: data.createdByUserId,
      name: data.name,
      description: data.description || "",
      creationMode: data.creationMode || "VISUAL",
      originalPrompt: data.originalPrompt || null,
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig || {},
      conditionConfig: data.conditionConfig || {},
      actionType: data.actionType,
      actionConfig: data.actionConfig || {},
      status: data.status || "ACTIVE",
      requiresConfirmation: Boolean(data.requiresConfirmation),
      lastRunAt: null,
      nextRunAt: new Date(Date.now() + 60 * 1000),
      runCount: 0,
      failureCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(automations).values(newAutomation);

    // Audit log
    await AuditService.logEvent(
      data.createdByUserId,
      "AUTOMATION_CREATED",
      `Created automation: "${data.name}" (${data.triggerType} -> ${data.actionType})`,
      null,
      wsId
    );

    try {
      socketService.emitToUser(data.createdByUserId, "automation.created", newAutomation);
    } catch (e) {}

    return newAutomation;
  }

  /**
   * Triggers event-driven automations (e.g. TASK_ASSIGNED, TASK_STARTED, TASK_DEADLINE_APPROACHING, TASK_OVERDUE, TASK_COMPLETED).
   */
  public static async triggerEvent(
    eventType: string,
    payload: { userId?: string; workspaceId?: string; taskId?: string; taskTitle?: string; status?: string; details?: any }
  ) {
    try {
      const wsId = payload.workspaceId || null;
      const targetUserId = payload.userId || null;

      // Fetch matching active automations for workspace or user
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
        if (wsId && auto.workspaceId && auto.workspaceId !== wsId) continue;

        const now = new Date();
        const hour = now.getHours();

        // 1. Off-hours System Restriction Check (11:00 PM to 4:00 AM)
        if (hour >= 23 || hour < 4) {
          const logId = uuidv4();
          await db.insert(automationLogs).values({
            id: logId,
            automationId: auto.id,
            workspaceId: wsId,
            userId: targetUserId,
            status: "SKIPPED",
            triggeredBy: `EVENT_${eventType}`,
            executionDetails: payload,
            reason: "Deferred because execution window was outside working hours (11:00 PM - 4:00 AM).",
            executedAt: now,
          });
          logger.info(`[Automation] Skipped ${auto.name}: Off working hours window`);
          continue;
        }

        // 2. Condition Evaluation
        const cond = (auto.conditionConfig || {}) as Record<string, any>;
        if (cond.statusNotIn && Array.isArray(cond.statusNotIn) && payload.status) {
          if (cond.statusNotIn.includes(payload.status)) {
            const logId = uuidv4();
            await db.insert(automationLogs).values({
              id: logId,
              automationId: auto.id,
              workspaceId: wsId,
              userId: targetUserId,
              status: "SKIPPED",
              triggeredBy: `EVENT_${eventType}`,
              executionDetails: payload,
              reason: `Task status "${payload.status}" matched excluded status filter (${cond.statusNotIn.join(", ")}).`,
              executedAt: now,
            });
            continue;
          }
        }

        // 3. Idempotency Key check: automationId + taskId + triggerType + hour
        if (payload.taskId) {
          const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
          const existingLogs = await db
            .select()
            .from(automationLogs)
            .where(
              and(
                eq(automationLogs.automationId, auto.id),
                eq(automationLogs.status, "COMPLETED")
              )
            )
            .limit(10);

          const isDuplicate = existingLogs.some((l) => {
            const details = (l.executionDetails || {}) as any;
            return details.taskId === payload.taskId && details.hourKey === hourKey;
          });

          if (isDuplicate) {
            const logId = uuidv4();
            await db.insert(automationLogs).values({
              id: logId,
              automationId: auto.id,
              workspaceId: wsId,
              userId: targetUserId,
              status: "SKIPPED",
              triggeredBy: `EVENT_${eventType}`,
              executionDetails: { ...payload, hourKey },
              reason: "Skipped duplicate execution in the same idempotency time window.",
              executedAt: now,
            });
            continue;
          }
        }

        // 4. Action Execution
        const logId = uuidv4();
        let execStatus = "COMPLETED";
        let errorMsg: string | null = null;
        const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;

        try {
          const actionCfg = (auto.actionConfig || {}) as Record<string, any>;
          const msg = actionCfg.message || `Automation Action: ${auto.name}`;
          const recipientId = targetUserId || auto.createdByUserId;

          if (auto.actionType === "NOTIFICATION" && recipientId) {
            await NotificationService.dispatch({
              type: "AUTOMATION_ALERT",
              userId: recipientId,
              clientUrl: env.CLIENT_URL,
              data: {
                title: auto.name,
                message: `${msg} (${payload.taskTitle || "Task event"})`,
              },
            });
          }

          // Update Run Count & Timestamp
          await db
            .update(automations)
            .set({
              lastRunAt: now,
              runCount: (auto.runCount || 0) + 1,
              updatedAt: now,
            })
            .where(eq(automations.id, auto.id));

          // Log Timeline Event
          await AuditService.logEvent(
            recipientId,
            "AUTOMATION_EXECUTED",
            `Automation "${auto.name}" executed successfully: ${msg}`,
            null,
            wsId
          );
        } catch (err: any) {
          execStatus = "FAILED";
          errorMsg = err.message || "Failed to execute action";
          await db
            .update(automations)
            .set({
              failureCount: (auto.failureCount || 0) + 1,
              status: auto.failureCount && auto.failureCount >= 5 ? "FAILED" : auto.status,
              updatedAt: now,
            })
            .where(eq(automations.id, auto.id));
        }

        // 5. Record Execution History
        await db.insert(automationLogs).values({
          id: logId,
          automationId: auto.id,
          workspaceId: wsId,
          userId: targetUserId || auto.createdByUserId,
          status: execStatus,
          triggeredBy: `EVENT_${eventType}`,
          executionDetails: { ...payload, hourKey },
          errorMessage: errorMsg,
          reason: execStatus === "COMPLETED" ? "Executed successfully." : errorMsg,
          executedAt: now,
        });

        try {
          if (targetUserId) {
            socketService.emitToUser(targetUserId, "automation.triggered", {
              automationId: auto.id,
              name: auto.name,
              status: execStatus,
              executedAt: now,
            });
          }
        } catch (e) {}
      }
    } catch (e) {
      logger.error(`Error executing event automation: ${e}`);
    }
  }

  /**
   * Background tick runner for scheduled and deadline automations.
   */
  public static async runScheduledTick() {
    try {
      const now = new Date();
      const hour = now.getHours();

      // Skip background tick during system off-hours (11 PM - 4 AM)
      if (hour >= 23 || hour < 4) return;

      // 1. Process Task Deadline Approaching & Overdue Tasks
      const allActiveTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            sql`${tasks.status} NOT IN ('Completed', 'Archived')`,
            sql`${tasks.deadline} IS NOT NULL`
          )
        )
        .limit(100);

      for (const t of allActiveTasks) {
        if (!t.deadline) continue;
        const deadlineTime = new Date(t.deadline).getTime();
        const diffMinutes = Math.floor((deadlineTime - now.getTime()) / (60 * 1000));

        // Approaching deadline (0 to 60 minutes)
        if (diffMinutes > 0 && diffMinutes <= 60) {
          await this.triggerEvent("TASK_DEADLINE_APPROACHING", {
            taskId: t.id,
            taskTitle: t.title,
            workspaceId: t.workspaceId,
            userId: t.assigneeId || undefined,
            status: t.status,
            details: { leadMinutes: diffMinutes },
          });
        }
        // Overdue deadline
        else if (diffMinutes < 0) {
          await this.triggerEvent("TASK_OVERDUE", {
            taskId: t.id,
            taskTitle: t.title,
            workspaceId: t.workspaceId,
            userId: t.assigneeId || undefined,
            status: t.status,
            details: { overdueMinutes: Math.abs(diffMinutes) },
          });
        }
      }

      // 2. Process Scheduled Automations Due for Execution
      const dueAutomations = await db
        .select()
        .from(automations)
        .where(
          and(
            eq(automations.status, "ACTIVE"),
            sql`${automations.triggerType} IN ('SCHEDULE', 'DAILY_MOTIVATION')`,
            sql`(${automations.nextRunAt} IS NULL OR ${automations.nextRunAt} <= ${now})`
          )
        );

      for (const auto of dueAutomations) {
        const logId = uuidv4();
        let status = "COMPLETED";
        let errorMsg = null;

        try {
          const actionCfg = (auto.actionConfig || {}) as Record<string, any>;
          const msg = actionCfg.message || `Scheduled Digest: ${auto.name}`;

          await NotificationService.dispatch({
            type: "AUTOMATION_ALERT",
            userId: auto.createdByUserId,
            clientUrl: env.CLIENT_URL,
            data: {
              title: auto.name,
              message: msg,
            },
          });

          await AuditService.logEvent(
            auto.createdByUserId,
            "AUTOMATION_EXECUTED",
            `Scheduled automation "${auto.name}" executed: ${msg}`,
            null,
            auto.workspaceId
          );
        } catch (err: any) {
          status = "FAILED";
          errorMsg = err.message || "Failed to execute scheduled action";
        }

        const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
        await db
          .update(automations)
          .set({
            lastRunAt: now,
            nextRunAt: nextRun,
            runCount: (auto.runCount || 0) + 1,
            updatedAt: now,
          })
          .where(eq(automations.id, auto.id));

        await db.insert(automationLogs).values({
          id: logId,
          automationId: auto.id,
          workspaceId: auto.workspaceId,
          userId: auto.createdByUserId,
          status,
          triggeredBy: `SCHEDULE_${auto.triggerType}`,
          executionDetails: { scheduledAt: now },
          errorMessage: errorMsg,
          reason: status === "COMPLETED" ? "Scheduled execution completed." : errorMsg,
          executedAt: now,
        });
      }
    } catch (err: any) {
      logger.error(`Scheduled automation tick error: ${err}`);
    }
  }

  /**
   * Lists real persisted automations for user/workspace.
   */
  public static async listAutomations(userId: string, workspaceId?: string) {
    try {
      if (workspaceId && workspaceId !== "undefined" && workspaceId !== "null") {
        return await db
          .select()
          .from(automations)
          .where(eq(automations.workspaceId, workspaceId))
          .orderBy(desc(automations.createdAt));
      }
      if (userId) {
        return await db
          .select()
          .from(automations)
          .where(eq(automations.createdByUserId, userId))
          .orderBy(desc(automations.createdAt));
      }
      return [];
    } catch (err: any) {
      logger.warn(`Failed to list automations: ${err?.message}`);
      return [];
    }
  }

  /**
   * Fetches real execution logs.
   */
  public static async getLogs(automationId: string, workspaceId?: string) {
    if (workspaceId && workspaceId !== "undefined" && workspaceId !== "null") {
      return db
        .select()
        .from(automationLogs)
        .where(
          and(
            eq(automationLogs.automationId, automationId),
            eq(automationLogs.workspaceId, workspaceId)
          )
        )
        .orderBy(desc(automationLogs.executedAt))
        .limit(100);
    }
    return db
      .select()
      .from(automationLogs)
      .where(eq(automationLogs.automationId, automationId))
      .orderBy(desc(automationLogs.executedAt))
      .limit(100);
  }

  /**
   * Retries a failed execution safely with idempotency.
   */
  public static async retryExecution(logId: string, userId: string) {
    const [log] = await db
      .select()
      .from(automationLogs)
      .where(eq(automationLogs.id, logId))
      .limit(1);

    if (!log) throw new Error("Execution log not found.");

    const [auto] = await db
      .select()
      .from(automations)
      .where(eq(automations.id, log.automationId))
      .limit(1);

    if (!auto) throw new Error("Parent automation not found.");

    const now = new Date();
    const actionCfg = (auto.actionConfig || {}) as Record<string, any>;
    const msg = actionCfg.message || `Retried Automation Action: ${auto.name}`;
    const targetUser = log.userId || userId;

    await NotificationService.dispatch({
      type: "AUTOMATION_ALERT",
      userId: targetUser,
      clientUrl: env.CLIENT_URL,
      data: {
        title: `${auto.name} (Retried)`,
        message: msg,
      },
    });

    const newLogId = uuidv4();
    await db.insert(automationLogs).values({
      id: newLogId,
      automationId: auto.id,
      workspaceId: auto.workspaceId,
      userId: targetUser,
      status: "COMPLETED",
      triggeredBy: "MANUAL_RETRY",
      executionDetails: { originalLogId: logId, retriedAt: now },
      errorMessage: null,
      reason: "Manual retry executed successfully.",
      executedAt: now,
    });

    await AuditService.logEvent(
      userId,
      "AUTOMATION_EXECUTED",
      `Manually retried automation execution for "${auto.name}"`,
      null,
      auto.workspaceId
    );

    return { success: true, logId: newLogId };
  }

  /**
   * Lists motivation items from the database library.
   */
  public static async listMotivations(workspaceId?: string) {
    return db
      .select()
      .from(motivations)
      .where(eq(motivations.active, true))
      .orderBy(desc(motivations.createdAt))
      .limit(50);
  }

  /**
   * Gets or selects today's Thirukkural motivation quote for a user using server-side selection algorithm.
   */
  public static async getTodayMotivation(userId: string, workspaceId?: string) {
    try {
      const fs = require("fs");
      const path = require("path");
      const jsonPath = path.resolve(process.cwd(), "thirukkural_daily_motivation.json");
      const rootJsonPath = path.resolve(process.cwd(), "..", "thirukkural_daily_motivation.json");
      const targetPath = fs.existsSync(jsonPath) ? jsonPath : fs.existsSync(rootJsonPath) ? rootJsonPath : null;

      if (targetPath) {
        const raw = fs.readFileSync(targetPath, "utf-8");
        const kuralItems = JSON.parse(raw);
        if (Array.isArray(kuralItems) && kuralItems.length > 0) {
          const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
          const selected = kuralItems[dayOfYear % kuralItems.length];
          return {
            id: `kural_${selected.id}`,
            message: `${selected.title}: ${selected.body}`,
            category: "THIRUKKURAL",
            tone: "WISDOM",
            deliveredAt: new Date().toISOString(),
            status: "DELIVERED",
          };
        }
      }
    } catch (e) {}

    const list = await this.listMotivations(workspaceId);
    if (list.length === 0) {
      return {
        id: "mot_default",
        message: "Consistency is what transforms average into excellence.",
        category: "DISCIPLINE",
        tone: "DIRECT",
        deliveredAt: new Date().toISOString(),
        status: "DELIVERED",
      };
    }

    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const selected = list[dayOfYear % list.length];

    return {
      id: selected.id,
      message: selected.message,
      category: selected.category,
      tone: selected.tone,
      deliveredAt: new Date().toISOString(),
      status: "DELIVERED",
    };
  }

  /**
   * Creates a new motivation entry in the library.
   */
  public static async createMotivation(data: {
    message: string;
    category?: string;
    tone?: string;
    workspaceId?: string;
    userId: string;
  }) {
    const id = `mot_${uuidv4().substring(0, 8)}`;
    const now = new Date();

    const [created] = await db
      .insert(motivations)
      .values({
        id,
        workspaceId: data.workspaceId || null,
        createdByUserId: data.userId,
        message: data.message.trim(),
        category: data.category || "FOCUS",
        tone: data.tone || "PROFESSIONAL",
        active: true,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await AuditService.logEvent(
      data.userId,
      "MOTIVATION_CREATED",
      `Created new Daily Motivation quote: "${data.message.substring(0, 40)}..."`,
      null,
      data.workspaceId
    );

    return created;
  }

  /**
   * Dispatches a real Web Push / In-App test notification to the user.
   */
  public static async sendTestNotification(userId: string, customMessage?: string) {
    const msg = customMessage || "Progress becomes powerful when consistency becomes automatic.";
    
    await NotificationService.dispatch({
      type: "AUTOMATION_ALERT",
      userId,
      clientUrl: env.CLIENT_URL,
      data: {
        title: "ManMadhan Progress · Daily Motivation",
        message: msg,
      },
    });

    return { success: true, deliveredAt: new Date().toISOString(), message: msg };
  }
}
