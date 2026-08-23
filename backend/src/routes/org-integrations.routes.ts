import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { HubService } from "../services/hub-service";
import { db } from "../../database/client";
import { projectAiTools } from "../../database/schema";
import { eq } from "drizzle-orm";


export const orgIntegrationsRouter = Router();

orgIntegrationsRouter.use(authenticate);

// ── GET ORGANIZATION INTEGRATIONS STATUS & LIST ─────────────────────────
orgIntegrationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const hubHealth = await HubService.checkHealth();

    const activeIntegrations = [
      {
        provider: "ManMadhanHub",
        title: "ManMadhan Hub",
        category: "AI Tool Discovery & Intelligence",
        status: hubHealth.status,
        accountName: "ManMadhan Ecosystem SSO",
        lastSyncAt: hubHealth.lastSyncAt,
        details: "Canonical AI tool catalog & project tool references active.",
      },
      {
        provider: "GitHub",
        title: "GitHub",
        category: "Development",
        status: "NOT_CONNECTED",
        accountName: null,
        lastSyncAt: null,
        details: "Connect organization repositories to projects and link pull requests.",
      },
      {
        provider: "GoogleCalendar",
        title: "Google Calendar",
        category: "Calendar",
        status: "NOT_CONNECTED",
        accountName: null,
        lastSyncAt: null,
        details: "Sync project review deadlines, milestones, and focus sessions.",
      },
      {
        provider: "MicrosoftTeams",
        title: "Microsoft Teams",
        category: "Communication",
        status: "NOT_CONNECTED",
        accountName: null,
        lastSyncAt: null,
        details: "Link organization projects to Teams channels and meeting schedules.",
      },
      {
        provider: "Instagram",
        title: "Instagram Meta API",
        category: "Social & Content",
        status: "NOT_CONNECTED",
        accountName: null,
        lastSyncAt: null,
        details: "Official Meta Graph API connection for campaign workflow status.",
      },
    ];

    return res.json({
      success: true,
      data: activeIntegrations,
    });
  } catch (err: any) {
    logger.error(`Get Integrations Error: ${err.message}`);
    return res.status(500).json({ success: false, error: "Failed to fetch integrations." });
  }
});

// ── SEARCH MANMADHAN HUB AI TOOLS CATALOG ─────────────────────────────────
orgIntegrationsRouter.get("/hub/tools/search", async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || req.query.query || "");
    const category = String(req.query.category || "");
    const tools = await HubService.searchTools(query, category);

    return res.json({
      success: true,
      data: tools,
    });
  } catch (err: any) {
    logger.error(`Hub Search Error: ${err.message}`);
    return res.status(500).json({ success: false, error: "Failed to search Hub tools." });
  }
});

// ── REQUEST AI TOOL CREATION IN HUB CATALOG (AUTHORIZED API) ──────────────
orgIntegrationsRouter.post("/hub/tools", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== "CEO") {
      return res.status(403).json({ success: false, error: "HTTP 403: Only CEO is authorized to create/import AI tools in Hub." });
    }

    const { name, description, category, websiteUrl, useCases } = req.body;
    if (!name || !description || !category) {
      return res.status(400).json({ success: false, error: "Name, description, and category are required." });
    }

    const result = await HubService.createHubTool({ name, description, category, websiteUrl, useCases });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error, tool: result.tool, duplicate: result.duplicate });
    }

    return res.json({
      success: true,
      data: result.tool,
      message: "AI tool created successfully in canonical ManMadhan Hub catalog.",
    });
  } catch (err: any) {
    logger.error(`Hub Tool Creation Error: ${err.message}`);
    return res.status(500).json({ success: false, error: "Failed to create Hub tool." });
  }
});

// ── LINK HUB AI TOOL TO PROJECT ───────────────────────────────────────────
orgIntegrationsRouter.post("/projects/:projectId/ai-tools", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { hubToolId, purpose, assignedToUserId, projectPhase, notes } = req.body;
    const user = (req as any).user;

    if (!hubToolId || !purpose) {
      return res.status(400).json({ success: false, error: "hubToolId and purpose are required." });
    }

    const result = await HubService.linkToolToProject({
      projectId,
      hubToolId,
      purpose,
      assignedToUserId,
      projectPhase,
      notes,
      addedById: user?.id || "user-ceo-1",
    });

    return res.json({
      success: true,
      data: result.tool,
      duplicate: result.duplicate,
      message: result.duplicate ? "Tool is already linked to this project." : "Linked AI tool to project successfully.",
    });
  } catch (err: any) {
    logger.error(`Link Project AI Tool Error: ${err.message}`);
    return res.status(400).json({ success: false, error: err.message || "Failed to link AI tool." });
  }
});

// ── LIST PROJECT AI TOOLS ──────────────────────────────────────────────────
orgIntegrationsRouter.get("/projects/:projectId/ai-tools", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const tools = await HubService.getProjectTools(projectId);

    return res.json({
      success: true,
      data: tools,
    });
  } catch (err: any) {
    logger.error(`Get Project AI Tools Error: ${err.message}`);
    return res.status(500).json({ success: false, error: "Failed to fetch project AI tools." });
  }
});

// ── UNLINK AI TOOL FROM PROJECT ───────────────────────────────────────────
orgIntegrationsRouter.delete("/projects/:projectId/ai-tools/:toolLinkId", async (req: Request, res: Response) => {
  try {
    const { projectId, toolLinkId } = req.params;
    await HubService.unlinkToolFromProject(projectId, toolLinkId);

    return res.json({
      success: true,
      message: "Unlinked AI tool from project.",
    });
  } catch (err: any) {
    logger.error(`Unlink Project AI Tool Error: ${err.message}`);
    return res.status(500).json({ success: false, error: "Failed to unlink AI tool." });
  }
});
