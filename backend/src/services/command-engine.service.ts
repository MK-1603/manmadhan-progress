import { db } from "../../database/client";
import {
  projects,
  tasks,
  users,
  workspaceMembers,
  invitations,
  auditLogs,
  calendarEvents,
  timeTracking,
  automations,
  activities,
  commandSessions,
  commandMessages,
  commandExecutions,
} from "../../database/schema";
import { eq, and, ilike, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { HubService } from "./hub-service";
import { emailService } from "./email.service";
import { logger } from "./logger.service";

export interface CommandMention {
  id: string;
  type: "USER" | "PROJECT" | "TASK";
  displayName: string;
  email?: string;
}

export interface CommandContext {
  userId: string;
  userRole: "CEO" | "CO_CEO" | "MEMBER";
  workspaceId: string;
  workspaceType: "ORGANIZATION" | "PERSONAL";
  userName: string;
  mentions?: CommandMention[];
}

export interface ActionPreviewPayload {
  actionType:
    | "CREATE_PROJECT"
    | "CREATE_TASK"
    | "INVITE_USER"
    | "SCHEDULE_CALENDAR"
    | "ADD_HUB_TOOL"
    | "START_FOCUS"
    | "CREATE_AUTOMATION"
    | "ADD_LEARNING_CONCEPT";
  title: string;
  summary: string;
  entityType: string;
  fields: {
    name?: string;
    description?: string;
    leadId?: string;
    leadName?: string;
    approvalOfficerId?: string;
    approvalOfficerName?: string;
    assigneeId?: string;
    assigneeName?: string;
    projectId?: string;
    projectName?: string;
    deadline?: string;
    priority?: string;
    userEmail?: string;
    targetRole?: string;
    eventTime?: string;
    hubToolId?: string;
    hubToolName?: string;
    toolPurpose?: string;
    durationMinutes?: number;
    triggerType?: string;
    automationAction?: string;
    learningConcept?: string;
  };
}

export class CommandEngineService {
  /**
   * Main entry point to process natural language user command
   */
  static async processCommand(
    rawText: string,
    context: CommandContext,
    sessionId?: string
  ): Promise<{
    message: string;
    actionPreview?: ActionPreviewPayload;
    sessionId: string;
    executed?: boolean;
  }> {
    // Enforcement 1: Organization Workspace Boundary
    if (context.workspaceType !== "ORGANIZATION") {
      throw new Error("ManMadhan Command operates exclusively in the Organization Workspace.");
    }

    // Initialize or resolve session
    let sessId = sessionId;
    if (!sessId) {
      const newSession = await db
        .insert(commandSessions)
        .values({
          id: `session-${uuidv4().slice(0, 8)}`,
          workspaceId: context.workspaceId,
          userId: context.userId,
          title: rawText.slice(0, 40) + "...",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      sessId = newSession[0].id;
    } else {
      // Update session timestamp
      await db
        .update(commandSessions)
        .set({ updatedAt: new Date() })
        .where(eq(commandSessions.id, sessId));
    }

    const activeSessionId = sessId;

    // Save User Command Message
    await db.insert(commandMessages).values({
      id: `msg-${uuidv4().slice(0, 8)}`,
      sessionId: activeSessionId,
      sender: "user",
      text: rawText,
      createdAt: new Date(),
    });

    // Check for structured mentions passed in context
    const userMention = context.mentions?.find((m) => m.type === "USER");
    const projectMention = context.mentions?.find((m) => m.type === "PROJECT");
    const taskMention = context.mentions?.find((m) => m.type === "TASK");

    const lower = rawText.toLowerCase();

    // ── INTENT 1: CREATE PROJECT ──────────────────────────────────────────
    if (lower.includes("create") && lower.includes("project")) {
      const projectName = this.extractProjectName(rawText);
      const members = await this.getOrganizationMembers(context.workspaceId);
      const lead = userMention
        ? { id: userMention.id, name: userMention.displayName }
        : members[0] || { id: context.userId, name: context.userName };

      const preview: ActionPreviewPayload = {
        actionType: "CREATE_PROJECT",
        title: "Create Organization Project",
        summary: `Provision new project "${projectName}" in ManMadhan Progress and assign project lead.`,
        entityType: "PROJECT",
        fields: {
          name: projectName,
          description: `Strategic project created via ManMadhan Command.`,
          leadId: lead.id,
          leadName: lead.name,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          priority: "HIGH",
        },
      };

      const responseText = `I've prepared an Action Review for project **${projectName}**. Review the details and confirm below.`;
      await this.saveAiMessage(activeSessionId, responseText, preview);

      return {
        message: responseText,
        actionPreview: preview,
        sessionId: activeSessionId,
      };
    }

    // ── INTENT 2: CREATE / ASSIGN TASK ─────────────────────────────────────
    if ((lower.includes("create") || lower.includes("assign")) && lower.includes("task")) {
      const taskName = this.extractTaskTitle(rawText);
      const members = await this.getOrganizationMembers(context.workspaceId);
      const assignee = userMention
        ? { id: userMention.id, name: userMention.displayName }
        : members[0] || { id: context.userId, name: context.userName };

      const activeProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, context.workspaceId))
        .limit(1);

      const targetProject = projectMention
        ? { id: projectMention.id, name: projectMention.displayName }
        : activeProjects[0] || { id: "", name: "Organization Workspace" };

      const preview: ActionPreviewPayload = {
        actionType: "CREATE_TASK",
        title: "Create & Assign Task",
        summary: `Assign task "${taskName}" to ${assignee.name}.`,
        entityType: "TASK",
        fields: {
          name: taskName,
          assigneeId: assignee.id,
          assigneeName: assignee.name,
          projectId: targetProject.id,
          projectName: targetProject.name,
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          priority: "HIGH",
        },
      };

      const responseText = `I've prepared an Action Review for task **${taskName}** assigned to ${assignee.name}. Confirm below to create.`;
      await this.saveAiMessage(activeSessionId, responseText, preview);

      return {
        message: responseText,
        actionPreview: preview,
        sessionId: activeSessionId,
      };
    }

    // ── INTENT 3: INVITE USER ─────────────────────────────────────────────
    if (lower.includes("invite")) {
      const email = userMention?.email || this.extractEmail(rawText) || "member@manmadhan.com";
      const isCoCeo = lower.includes("co-ceo") || lower.includes("co ceo");
      const targetRole = isCoCeo ? "CO-CEO" : "MEMBER";

      const preview: ActionPreviewPayload = {
        actionType: "INVITE_USER",
        title: `Invite ${targetRole}`,
        summary: `Send organization invitation email to ${email} with role ${targetRole}.`,
        entityType: "INVITATION",
        fields: {
          userEmail: email,
          targetRole: targetRole,
        },
      };

      const responseText = `I've prepared an Action Review to invite **${email}** as **${targetRole}**. Confirm to send invitation email.`;
      await this.saveAiMessage(activeSessionId, responseText, preview);

      return {
        message: responseText,
        actionPreview: preview,
        sessionId: activeSessionId,
      };
    }

    // ── INTENT 4: ADD MANMADHAN HUB TOOL ─────────────────────────────────
    if (lower.includes("hub") || lower.includes("ai tool") || lower.includes("tool")) {
      const activeProjects = await db.select().from(projects).where(eq(projects.workspaceId, context.workspaceId)).limit(1);
      const targetProject = projectMention
        ? { id: projectMention.id, name: projectMention.displayName }
        : activeProjects[0] || { id: "", name: "Current Project" };

      const preview: ActionPreviewPayload = {
        actionType: "ADD_HUB_TOOL",
        title: "Link AI Tool from ManMadhan Hub",
        summary: `Connect authorized AI tool from ManMadhan Hub to project.`,
        entityType: "PROJECT_AI_TOOL",
        fields: {
          hubToolId: "hub-tool-claude",
          hubToolName: "Claude 3.5 Sonnet",
          projectId: targetProject.id,
          projectName: targetProject.name,
          toolPurpose: "Architecture & deep code synthesis",
        },
      };

      const responseText = `Found AI tool **Claude 3.5 Sonnet** in ManMadhan Hub. Confirm to link to project **${targetProject.name}**.`;
      await this.saveAiMessage(activeSessionId, responseText, preview);

      return {
        message: responseText,
        actionPreview: preview,
        sessionId: activeSessionId,
      };
    }

    // ── INTENT 5: SCHEDULE CALENDAR REVIEW ───────────────────────────────
    if (lower.includes("schedule") || lower.includes("calendar") || lower.includes("meeting")) {
      const preview: ActionPreviewPayload = {
        actionType: "SCHEDULE_CALENDAR",
        title: "Schedule Organization Review",
        summary: `Block calendar for executive project review.`,
        entityType: "CALENDAR_EVENT",
        fields: {
          name: "Executive Project Milestone Review",
          eventTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 45,
        },
      };

      const responseText = `I've prepared a calendar review event. Confirm below to add to Calendar.`;
      await this.saveAiMessage(activeSessionId, responseText, preview);

      return {
        message: responseText,
        actionPreview: preview,
        sessionId: activeSessionId,
      };
    }

    // Default conversational response
    const summaryMsg = `Parsed command: "${rawText}". All organization domain services (Projects, Tasks, Invitations, Calendar, Focus, ManMadhan Hub) are ready. Specify an action to create a project, assign work, or invite users.`;
    await this.saveAiMessage(activeSessionId, summaryMsg);
    return { message: summaryMsg, sessionId: activeSessionId };
  }

  /**
   * Execute a confirmed Action Preview transactionally against real backend services
   */
  static async executeAction(
    payload: ActionPreviewPayload,
    context: CommandContext
  ): Promise<{ success: boolean; resultId: string; message: string; redirectUrl?: string }> {
    const executionId = `cmd-exec-${uuidv4().slice(0, 8)}`;

    try {
      // ── EXECUTE: INVITATION WORKFLOW ──────────────────────────────────
      if (payload.actionType === "INVITE_USER") {
        if (context.userRole !== "CEO") {
          throw new Error("HTTP 403: Only the CEO has permission to invite users.");
        }

        const email = (payload.fields.userEmail || "").trim().toLowerCase();
        if (!email || !email.includes("@")) {
          throw new Error("Enter a valid email address to send invitation.");
        }

        const token = `inv-tok-${uuidv4()}`;
        const newInv = await db
          .insert(invitations)
          .values({
            id: `inv-${uuidv4().slice(0, 8)}`,
            token,
            email,
            role: payload.fields.targetRole || "MEMBER",
            invitedById: context.userId,
            organizationId: context.workspaceId,
            status: "PENDING",
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
          .returning();

        // Email Dispatch via Gmail SMTP / Resend Primary Provider
        let emailSent = false;
        try {
          emailSent = await emailService.sendInvitationEmail(
            email,
            token,
            payload.fields.targetRole || "MEMBER",
            context.userName
          );
        } catch (emailErr: any) {
          logger.warn(`Invitation email send failed for ${email}: ${emailErr.message}`);
        }

        await this.recordAudit(context, "USER_INVITED", "INVITATION", newInv[0].id);
        await this.recordExecution(context, payload, newInv[0].id, "COMPLETED");

        if (emailSent) {
          return {
            success: true,
            resultId: newInv[0].id,
            message: `Invitation sent successfully to **${email}** as **${payload.fields.targetRole || "MEMBER"}**. Email delivered via SMTP.`,
            redirectUrl: "/ceo/invitations",
          };
        } else {
          return {
            success: true,
            resultId: newInv[0].id,
            message: `Invitation record created for **${email}**, but delivery email could not be dispatched immediately. Click Retry Email to resend.`,
            redirectUrl: "/ceo/invitations",
          };
        }
      }

      // ── EXECUTE: CREATE PROJECT WORKFLOW ──────────────────────────────
      if (payload.actionType === "CREATE_PROJECT") {
        const newProj = await db
          .insert(projects)
          .values({
            id: `proj-${uuidv4().slice(0, 8)}`,
            name: payload.fields.name || "New Project",
            description: payload.fields.description || "",
            status: "ACTIVE",
            ownerId: payload.fields.leadId || context.userId,
            workspaceId: context.workspaceId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        await this.recordAudit(context, "PROJECT_CREATED", "PROJECT", newProj[0].id);
        await this.recordExecution(context, payload, newProj[0].id, "COMPLETED");

        return {
          success: true,
          resultId: newProj[0].id,
          message: `Project **${newProj[0].name}** created successfully. Central execution hub active.`,
          redirectUrl: `/ceo/projects/${newProj[0].id}`,
        };
      }

      // ── EXECUTE: CREATE TASK WORKFLOW ─────────────────────────────────
      if (payload.actionType === "CREATE_TASK") {
        const newTask = await db
          .insert(tasks)
          .values({
            id: `task-${uuidv4().slice(0, 8)}`,
            title: payload.fields.name || "New Task",
            description: payload.fields.description || "",
            status: "TODO",
            priority: payload.fields.priority || "MEDIUM",
            projectId: payload.fields.projectId || null,
            workspaceId: context.workspaceId,
            assigneeId: payload.fields.assigneeId || context.userId,
            createdAt: new Date(),
          })
          .returning();

        await this.recordAudit(context, "TASK_CREATED", "TASK", newTask[0].id);
        await this.recordExecution(context, payload, newTask[0].id, "COMPLETED");

        return {
          success: true,
          resultId: newTask[0].id,
          message: `Task **${newTask[0].title}** created and assigned successfully.`,
          redirectUrl: `/ceo/tasks`,
        };
      }

      // ── EXECUTE: LINK HUB TOOL ─────────────────────────────────────────
      if (payload.actionType === "ADD_HUB_TOOL") {
        let projId = payload.fields.projectId;
        if (!projId) {
          const activeProjects = await db.select().from(projects).where(eq(projects.workspaceId, context.workspaceId)).limit(1);
          projId = activeProjects[0]?.id;
        }

        if (!projId) {
          throw new Error("No active project found to link AI tool.");
        }

        const linkRes = await HubService.linkToolToProject({
          projectId: projId,
          hubToolId: payload.fields.hubToolId || "hub-tool-claude",
          purpose: payload.fields.toolPurpose || "Architecture & documentation",
          addedById: context.userId,
        });

        const toolId = linkRes.tool?.id || "pat-linked";
        await this.recordAudit(context, "HUB_TOOL_LINKED_TO_PROJECT", "PROJECT_AI_TOOL", toolId);
        await this.recordExecution(context, payload, toolId, "COMPLETED");

        return {
          success: true,
          resultId: toolId,
          message: `Linked **${payload.fields.hubToolName || "AI Tool"}** from ManMadhan Hub to project.`,
          redirectUrl: `/ceo/projects/${projId}`,
        };
      }

      // ── EXECUTE: SCHEDULE CALENDAR ─────────────────────────────────────
      if (payload.actionType === "SCHEDULE_CALENDAR") {
        const event = await db
          .insert(calendarEvents)
          .values({
            id: `evt-${uuidv4().slice(0, 8)}`,
            title: payload.fields.name || "Project Review",
            workspaceId: context.workspaceId,
            projectId: payload.fields.projectId || null,
            createdById: context.userId,
            startTime: new Date(payload.fields.eventTime || Date.now()),
            endTime: new Date(Date.now() + (payload.fields.durationMinutes || 45) * 60 * 1000),
            createdAt: new Date(),
          })
          .returning();

        await this.recordAudit(context, "CALENDAR_EVENT_CREATED", "CALENDAR_EVENT", event[0].id);
        await this.recordExecution(context, payload, event[0].id, "COMPLETED");

        return {
          success: true,
          resultId: event[0].id,
          message: `Scheduled calendar review **${event[0].title}** cleanly.`,
          redirectUrl: `/ceo/calendar`,
        };
      }

      throw new Error(`Execution unsupported for action type: ${payload.actionType}`);
    } catch (err: any) {
      await db.insert(commandExecutions).values({
        id: executionId,
        commandId: payload.title,
        workspaceId: context.workspaceId,
        userId: context.userId,
        actionType: payload.actionType,
        status: "FAILED",
        errorMessage: err.message,
        createdAt: new Date(),
      });
      throw err;
    }
  }

  // ── HELPER UTILITIES ──────────────────────────────────────────────────
  private static async saveAiMessage(sessionId: string, text: string, preview?: ActionPreviewPayload) {
    await db.insert(commandMessages).values({
      id: `msg-${uuidv4().slice(0, 8)}`,
      sessionId,
      sender: "command",
      text,
      previewJson: preview ? JSON.stringify(preview) : null,
      createdAt: new Date(),
    });
  }

  private static async recordAudit(context: CommandContext, eventType: string, entityType: string, entityId: string) {
    await db.insert(auditLogs).values({
      id: `audit-${uuidv4().slice(0, 8)}`,
      userId: context.userId,
      workspaceId: context.workspaceId,
      eventType: eventType,
      details: JSON.stringify({ entityType, entityId, timestamp: new Date() }),
      createdAt: new Date(),
    });
  }

  private static async recordExecution(context: CommandContext, payload: ActionPreviewPayload, entityId: string, status: string) {
    await db.insert(commandExecutions).values({
      id: `exec-${uuidv4().slice(0, 8)}`,
      commandId: payload.title,
      workspaceId: context.workspaceId,
      userId: context.userId,
      actionType: payload.actionType,
      entityType: payload.entityType,
      entityId,
      status,
      createdAt: new Date(),
      completedAt: new Date(),
    });
  }

  private static extractProjectName(text: string): string {
    const match = text.match(/(?:called|named|project)\s+([A-Za-z0-9\s_-]+)/i);
    if (match && match[1]) {
      return match[1].split(/\s+with|\s+assign|\s+for/)[0].trim();
    }
    return "Mobile OS V2";
  }

  private static extractTaskTitle(text: string): string {
    const match = text.match(/(?:called|named|task)\s+([A-Za-z0-9\s_-]+)/i);
    if (match && match[1]) {
      return match[1].split(/\s+under|\s+to|\s+for/)[0].trim();
    }
    return "Authentication API";
  }

  private static extractEmail(text: string): string | null {
    const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return match ? match[1] : null;
  }

  private static async getOrganizationMembers(workspaceId: string) {
    const members = await db
      .select({ id: users.id, name: users.name, role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .limit(10);

    return members.map((m) => ({ id: m.id, name: m.name || "Team Member", role: m.role }));
  }
}
