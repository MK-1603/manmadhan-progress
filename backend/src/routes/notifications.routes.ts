import { and, desc, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { env } from "../../config/env.config";
import { db } from "../../database/client";
import { notifications, pushSubscriptions } from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

// GET /api/v1/notifications
notificationsRouter.get("/", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		// Fetch notifications for the user across all workspaces
		const data = await db
			.select()
			.from(notifications)
			.where(eq(notifications.userId, user.id))
			.orderBy(desc(notifications.createdAt))
			.limit(50);
		return res.json({ success: true, data });
	} catch (error: any) {
		logger.error("GET /notifications Error: " + error.message);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
});

// POST /api/v1/notifications/read-all
notificationsRouter.post("/read-all", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		await db
			.update(notifications)
			.set({ isRead: true })
			.where(eq(notifications.userId, user.id));
		return res.json({
			success: true,
			message: "All notifications marked as read",
		});
	} catch (error: any) {
		return res.status(500).json({ success: false, error: error.message });
	}
});

// PATCH /api/v1/notifications/:id/read
notificationsRouter.patch("/:id/read", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		const notificationId = req.params.id as string;
		const updated = await db
			.update(notifications)
			.set({ isRead: true })
			.where(
				and(
					eq(notifications.id, notificationId),
					eq(notifications.userId, user.id),
				),
			)
			.returning();
		if (!updated[0])
			return res
				.status(404)
				.json({ success: false, error: "Notification not found" });
		return res.json({ success: true, data: updated[0] });
	} catch (error: any) {
		return res.status(500).json({ success: false, error: error.message });
	}
});

// GET /api/v1/notifications/vapid-public-key
notificationsRouter.get("/vapid-public-key", (req: Request, res: Response) => {
	return res.json({ success: true, publicKey: env.VAPID_PUBLIC_KEY });
});

// POST /api/v1/notifications/subscribe
notificationsRouter.post("/subscribe", async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		const { endpoint, keys } = req.body;

		if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
			return res
				.status(400)
				.json({ success: false, error: "Invalid subscription object" });
		}

		// Check if it already exists
		const existing = await db.query.pushSubscriptions.findFirst({
			where: and(
				eq(pushSubscriptions.userId, user.id),
				eq(pushSubscriptions.endpoint, endpoint),
			),
		});

		if (existing) {
			await db
				.update(pushSubscriptions)
				.set({
					isActive: true,
					updatedAt: new Date(),
					p256dh: keys.p256dh,
					auth: keys.auth,
				})
				.where(eq(pushSubscriptions.id, existing.id));
			return res.json({ success: true, message: "Subscription updated" });
		}

		await db.insert(pushSubscriptions).values({
			id: uuidv4(),
			userId: user.id,
			endpoint,
			p256dh: keys.p256dh,
			auth: keys.auth,
			userAgent: req.headers["user-agent"] || null,
		});

		return res
			.status(201)
			.json({ success: true, message: "Subscription created" });
	} catch (error: any) {
		return res.status(500).json({ success: false, error: error.message });
	}
});

// DELETE /api/v1/notifications/unsubscribe
notificationsRouter.delete(
	"/unsubscribe",
	async (req: Request, res: Response) => {
		try {
			const user = (req as any).user;
			const { endpoint } = req.body; // or req.query

			if (!endpoint) {
				return res
					.status(400)
					.json({ success: false, error: "Endpoint is required" });
			}

			await db
				.delete(pushSubscriptions)
				.where(
					and(
						eq(pushSubscriptions.userId, user.id),
						eq(pushSubscriptions.endpoint, endpoint),
					),
				);

			return res.json({ success: true, message: "Unsubscribed successfully" });
		} catch (error: any) {
			return res.status(500).json({ success: false, error: error.message });
		}
	},
);
