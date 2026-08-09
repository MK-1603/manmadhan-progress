import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { integrationAccounts } from "../../../database/schema/personal.schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { IntegrationService } from "../../services/integrations/IntegrationService";

// Initialize the IntegrationService (registers all providers)
IntegrationService.initialize();

export const integrationsRouter = Router();

// ==========================================
// CALLBACK ROUTE (Must be before authenticate)
// ==========================================
integrationsRouter.get("/:provider/callback", async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as string;
    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const redirectBack = `${frontendUrl}/personal/integrations`;

    if (error) {
      return res.redirect(`${redirectBack}?error=${error}`);
    }

    if (!code || !state) {
      return res.redirect(`${redirectBack}?error=MissingCodeOrState`);
    }

    const userId = state;

    await IntegrationService.connectOAuth(provider, userId, code);

    return res.redirect(`${redirectBack}?success=true`);
  } catch (error: any) {
    console.error("Integration Callback Error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return res.redirect(`${frontendUrl}/personal/integrations?error=${encodeURIComponent(error.message)}`);
  }
});


// All routes below require authentication
integrationsRouter.use(authenticate);

// Get Connected Integrations
integrationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const accounts = await personalDb
      .select({
        id: integrationAccounts.id,
        provider: integrationAccounts.provider,
        integrationType: integrationAccounts.integrationType,
        accountName: integrationAccounts.accountName,
        status: integrationAccounts.status,
        lastSyncAt: integrationAccounts.lastSyncAt,
        createdAt: integrationAccounts.createdAt,
      })
      .from(integrationAccounts)
      .where(eq(integrationAccounts.ownerUserId, user.id as string));
      
    return res.status(200).json({ success: true, data: accounts });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Connect an Integration
integrationsRouter.post("/:provider/connect", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const provider = req.params.provider as string;
    
    const integrationProvider = IntegrationService.getProvider(provider);

    if (provider === "RSS") {
      const { feedUrl } = req.body;
      if (!feedUrl) return res.status(400).json({ success: false, error: "feedUrl is required for RSS" });
      
      const result = await IntegrationService.connectOAuth(provider, user.id as string, feedUrl);
      return res.status(201).json({ success: true, data: result });
    }

    if (integrationProvider.getAuthUrl) {
      let authUrl = integrationProvider.getAuthUrl();
      authUrl += `&state=${user.id}`;
      return res.status(200).json({ success: true, data: { authUrl } });
    }

    return res.status(400).json({ success: false, error: "Provider does not support connection initiation" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Sync Integration
integrationsRouter.post("/:id/sync", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;
    
    const result = await IntegrationService.syncIntegration(id, user.id as string);

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Disconnect
integrationsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;
    
    await personalDb.delete(integrationAccounts).where(
      eq(integrationAccounts.id, id)
    );
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default integrationsRouter;
