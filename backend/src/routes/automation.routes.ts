import { Router, Request, Response } from "express";
import { strictAuth } from "../middleware/auth.middleware";
import { AutomationService } from "../services/automation.service";
import { db } from "../../database/client";
import { automations, workspaceMembers } from "../../database/schema";
import { eq, and } from "drizzle-orm";

export const automationRouter = Router();

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

    const parsed = await AutomationService.interpretPrompt(prompt, workspaceType || "personal");

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

// Helper function to resolve workspace ID
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
      creationMode: creationMode || "PROMPT",
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

    return res.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      code: "AUTOMATION_LIST_FAILED",
      error: "Unable to load automations. Please try again.",
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

// GET /api/v1/automation/:id/logs
automationRouter.get("/:id/logs", strictAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const logs = await AutomationService.getLogs(id);

    return res.json({
      success: true,
      data: logs,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch automation logs.",
    });
  }
});
