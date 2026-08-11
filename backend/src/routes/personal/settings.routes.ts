import { eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/client";
import { userSettings } from "../../../database/schema/personal.schema";
import { authenticate } from "../../middleware/auth.middleware";
import { logger } from "../../services/logger.service";

export const personalSettingsRouter = Router();
personalSettingsRouter.use(authenticate);

const getUserId = (req: Request) => (req as any).user?.id;

// GET /api/v1/personal/settings
personalSettingsRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const settings = await personalDb.query.userSettings.findFirst({
			where: eq(userSettings.ownerUserId, userId),
		});

		if (!settings) {
			// Return defaults
			return res.json({
				success: true,
				data: {
					id: null,
					ownerUserId: userId,
					preferences: {
						dailyFocusGoalMinutes: 360,
						timezone: "UTC",
						workingHoursStart: "09:00",
						workingHoursEnd: "18:00",
						emailNotifications: true,
						pushNotifications: true,
						focusReminders: true,
						deadlineAlerts: true,
						language: "en",
					},
				},
			});
		}

		res.json({ success: true, data: settings });
	} catch (err: any) {
		logger.error("Get settings error: " + err.message);
		res.status(500).json({ success: false, error: "Failed to fetch settings" });
	}
});

// PATCH /api/v1/personal/settings
personalSettingsRouter.patch("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { preferences } = req.body;
		if (!preferences)
			return res
				.status(400)
				.json({ success: false, error: "Preferences required" });

		const existing = await personalDb.query.userSettings.findFirst({
			where: eq(userSettings.ownerUserId, userId),
		});

		if (existing) {
			const [updated] = await personalDb
				.update(userSettings)
				.set({
					preferences: { ...(existing.preferences as any), ...preferences },
					updatedAt: new Date(),
				})
				.where(eq(userSettings.ownerUserId, userId))
				.returning();
			return res.json({ success: true, data: updated });
		} else {
			const [created] = await personalDb
				.insert(userSettings)
				.values({
					id: uuidv4(),
					ownerUserId: userId,
					preferences,
				})
				.returning();
			return res.json({ success: true, data: created });
		}
	} catch (err: any) {
		logger.error("Update settings error: " + err.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to update settings" });
	}
});
