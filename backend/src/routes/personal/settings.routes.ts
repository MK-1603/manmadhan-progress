import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { userSettings } from "../../../database/schema/personal.schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";

export const settingsRouter = Router();
settingsRouter.use(authenticate);

const defaultPreferences = {
  theme: "system",
  density: "comfortable",
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  defaultFocusDuration: 50,
  dailyReadingTarget: 20,
  notificationsEnabled: true,
  vaultTimeoutMinutes: 15,
  assistantEnabled: true,
};

// Get Settings
settingsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    let [settings] = await personalDb
      .select()
      .from(userSettings)
      .where(eq(userSettings.ownerUserId, user.id as string));

    if (!settings) {
      await personalDb.insert(userSettings).values({
        id: uuidv4(),
        ownerUserId: user.id as string,
        preferences: defaultPreferences,
      });
      [settings] = await personalDb.select().from(userSettings).where(eq(userSettings.ownerUserId, user.id as string));
    }

    return res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Update Settings
settingsRouter.put("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { preferences } = req.body;
    
    // Ensure we merge with existing rather than complete overwrite if wanted,
    // but for simplicity here we just replace the preferences object
    
    await personalDb.update(userSettings)
      .set({ preferences, updatedAt: new Date() })
      .where(eq(userSettings.ownerUserId, user.id as string));

    const [updated] = await personalDb.select().from(userSettings).where(eq(userSettings.ownerUserId, user.id as string));
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default settingsRouter;
