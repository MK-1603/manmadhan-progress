import { Router, Request, Response } from "express";
import { strictAuth } from "../middleware/auth.middleware";
import { AutomationService } from "../services/automation.service";
import { db } from "../../database/client";
import { automations, workspaceMembers } from "../../database/schema";
import { eq, and } from "drizzle-orm";

export const automationRouter = Router();

// Helper to resolve workspace ID
async function resolveWorkspaceId(userId: string, targetId?: any): Promise<string | null> {
  let wsId = targetId ? String(targetId).trim() : "";
  if (!wsId || wsId === "undefined" || wsId === "null") {
    const member = await db.query.workspaceMembers.findFirst({
      where: eq(workspaceMembers.userId, userId),
    });
    if (member?.workspaceId) {
      wsId = member.workspaceId;
    }
  }
  return wsId && wsId !== "undefined" && wsId !== "null" ? wsId : null;
}

// POST /api/v1/automation/interpret-prompt
automationRouter.post("/interpret-prompt", strictAuth, async (req: Request, res: Response) => {
  try {
    const { prompt, workspaceType } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: "Prompt is required (min 3 characters).",
      });
    }

    const parsed = await AutomationService.interpretPrompt(prompt, workspaceType || "organization");

    if (!parsed.isSupported) {
      return res.status(400).json({
        success: false,
        error: parsed.unsupportedReason || "This automation is not supported by the engine.",
        data: parsed,
      });
    }

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to interpret prompt.",
    });
  }
});

// POST /api/v1/automation/create
automationRouter.post("/create", strictAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const {
      name,
      description,
      creationMode,
      originalPrompt,
      triggerType,
      triggerConfig,
      conditionConfig,
      actionType,
      actionConfig,
      workspaceId,
      requiresConfirmation,
    } = req.body;

    if (!name || !triggerType || !actionType) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_FAILED",
        error: "Automation name, trigger, and action are required.",
      });
    }

    const resolvedWsId = await resolveWorkspaceId(authUser.id, workspaceId);

    const created = await AutomationService.createAutomation({
      workspaceId: resolvedWsId || undefined,
      createdByUserId: authUser.id,
      name: name.trim(),
      description: description || "",
      creationMode: creationMode || "VISUAL",
      originalPrompt: originalPrompt || null,
      triggerType,
      triggerConfig: triggerConfig || {},
      conditionConfig: conditionConfig || {},
      actionType,
      actionConfig: actionConfig || {},
      requiresConfirmation: Boolean(requiresConfirmation),
    });

    return res.json({
      success: true,
      data: created,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      code: "AUTOMATION_CREATE_FAILED",
      error: "Unable to create automation. Please try again.",
    });
  }
});

// GET /api/v1/automation/list
automationRouter.get("/list", strictAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const resolvedWsId = await resolveWorkspaceId(authUser.id, req.query.workspaceId);

    const list = await AutomationService.listAutomations(authUser.id, resolvedWsId || undefined);

    const activeCount = list.filter((a) => a.status === "ACTIVE").length;
    const pausedCount = list.filter((a) => a.status === "PAUSED").length;
    const failedCount = list.filter((a) => a.status === "FAILED").length;
    const totalCount = list.length;

    return res.json({
      success: true,
      data: {
        summary: { activeCount, pausedCount, failedCount, totalCount },
        automations: list,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      code: "AUTOMATION_LIST_FAILED",
      error: "Unable to load automations.",
    });
  }
});

// PATCH /api/v1/automation/:id/status
automationRouter.patch("/:id/status", strictAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "PAUSED", "DISABLED", "DRAFT"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status value.",
      });
    }

    await db
      .update(automations)
      .set({ status, updatedAt: new Date() })
      .where(eq(automations.id, id));

    return res.json({
      success: true,
      message: `Automation status updated to ${status}.`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to update automation status.",
    });
  }
});

// DELETE /api/v1/automation/:id
automationRouter.delete("/:id", strictAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(automations).where(eq(automations.id, id));
    return res.json({
      success: true,
      message: "Automation deleted successfully.",
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to delete automation.",
    });
  }
});

// GET /api/v1/automation/motivations
automationRouter.get("/motivations", strictAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const resolvedWsId = await resolveWorkspaceId(authUser.id, req.query.workspaceId);

    const list = await AutomationService.listMotivations(resolvedWsId || undefined);
    const today = await AutomationService.getTodayMotivation(authUser.id, resolvedWsId || undefined);

    return res.json({
      success: true,
      data: {
        today,
        library: list,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      code: "MOTIVATIONS_FETCH_FAILED",
      error: "Unable to load motivation library.",
    });
  }
});

// POST /api/v1/automation/motivations
automationRouter.post("/motivations", strictAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { message, category, tone, workspaceId } = req.body;

    if (!message || typeof message !== "string" || message.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: "Motivation message is required (min 3 characters).",
      });
    }

    const resolvedWsId = await resolveWorkspaceId(authUser.id, workspaceId);
    const created = await AutomationService.createMotivation({
      message,
      category,
      tone,
      workspaceId: resolvedWsId || undefined,
      userId: authUser.id,
    });

    return res.json({
      success: true,
      data: created,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to create motivation.",
    });
  }
});

// POST /api/v1/automation/motivations/test-notification
automationRouter.post("/motivations/test-notification", strictAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { message } = req.body;
    const result = await AutomationService.sendTestNotification(authUser.id, message);
    return res.json({
      success: true,
      data: result,
      message: "Test notification dispatched successfully.",
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Could not send test notification.",
    });
  }
});

// GET /api/v1/automation/:id/logs
automationRouter.get("/:id/logs", strictAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authUser = (req as any).user;
    const resolvedWsId = await resolveWorkspaceId(authUser.id, req.query.workspaceId);

    if (!id || id.length < 5) {
      return res.status(400).json({
        success: false,
        code: "INVALID_AUTOMATION_ID",
        error: "Invalid automation ID provided.",
      });
    }

    const logs = await AutomationService.getLogs(id, resolvedWsId || undefined);

    return res.json({
      success: true,
      data: {
        logs,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      code: "AUTOMATION_LOGS_FETCH_FAILED",
      error: "Unable to load automation execution history.",
    });
  }
});

// POST /api/v1/automation/logs/:logId/retry
automationRouter.post("/logs/:logId/retry", strictAuth, async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    const authUser = (req as any).user;
    const result = await AutomationService.retryExecution(logId, authUser.id);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to retry execution.",
    });
  }
});

// POST /api/v1/automation/tick
automationRouter.post("/tick", strictAuth, async (req: Request, res: Response) => {
  try {
    await AutomationService.runScheduledTick();
    return res.json({
      success: true,
      message: "Scheduled automation tick processed.",
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to run scheduled tick.",
    });
  }
});
