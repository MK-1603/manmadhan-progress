import { eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { personalDb } from "../../../database/client";
import { integrationAccounts } from "../../../database/schema/personal.schema";
import { authenticate } from "../../middleware/auth.middleware";
import { logger } from "../../services/logger.service";

export const personalIntegrationsRouter = Router();
personalIntegrationsRouter.use(authenticate);

const getUserId = (req: Request) => (req as any).user?.id;

// GET /api/v1/personal/integrations — list all connected integrations (real status only)
personalIntegrationsRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const accounts = await personalDb.query.integrationAccounts.findMany({
			where: eq(integrationAccounts.ownerUserId, userId),
		});

		// Return sanitized data — never expose tokens
		const sanitized = accounts.map((a) => ({
			id: a.id,
			provider: a.provider,
			integrationType: a.integrationType,
			accountId: a.accountId,
			accountName: a.accountName,
			status: a.status,
			lastSyncAt: a.lastSyncAt,
			createdAt: a.createdAt,
		}));

		res.json({ success: true, data: sanitized });
	} catch (err: any) {
		logger.error(`Get integrations error: ${err.message}`);
		res
			.status(500)
			.json({ success: false, error: "Failed to fetch integrations" });
	}
});

// DELETE /api/v1/personal/integrations/:id — disconnect an integration
personalIntegrationsRouter.delete(
	"/:id",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const account = await personalDb.query.integrationAccounts.findFirst({
				where: eq(integrationAccounts.id, req.params.id),
			});

			if (!account || account.ownerUserId !== userId) {
				return res
					.status(404)
					.json({ success: false, error: "Integration not found" });
			}

			await personalDb
				.delete(integrationAccounts)
				.where(eq(integrationAccounts.id, req.params.id));
			res.json({ success: true, message: "Integration disconnected" });
		} catch (err: any) {
			logger.error(`Delete integration error: ${err.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to disconnect integration" });
		}
	},
);
