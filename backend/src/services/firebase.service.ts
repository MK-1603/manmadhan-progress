import { initializeApp, cert, App, getApps } from "firebase-admin/app";
import { getMessaging, Message } from "firebase-admin/messaging";
import { env } from "../../config/env.config";
import { logger } from "./logger.service";

let firebaseApp: App | null = null;

function initFirebase(): App | null {
  if (firebaseApp) return firebaseApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  const projectId = process.env.FCM_PROJECT_ID || env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL || env.FCM_CLIENT_EMAIL;
  let privateKey = process.env.FCM_PRIVATE_KEY || env.FCM_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      privateKey = privateKey.replace(/\\n/g, "\n");
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      logger.trace({ projectId }, "Firebase Admin SDK initialized successfully");
      return firebaseApp;
    } catch (error: any) {
      logger.trace({ error: error.message }, "Firebase Admin SDK initialization error");
      return null;
    }
  }
  return null;
}

// Attempt immediate init
initFirebase();

export interface SendPushNotificationOptions {
  token?: string;
  topic?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const firebaseNotificationService = {
  isConfigured(): boolean {
    return initFirebase() !== null;
  },

  async sendPushNotification(options: SendPushNotificationOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const app = initFirebase();
    if (!app) {
      return {
        success: false,
        error: "Firebase Admin SDK not initialized. Please restart backend server terminal to load new .env credentials.",
      };
    }

    try {
      const message: Message = {
        notification: {
          title: options.title,
          body: options.body,
        },
        data: options.data,
        ...(options.token ? { token: options.token } : { topic: options.topic || "all" }),
      };

      const messageId = await getMessaging(app).send(message);
      logger.info({ messageId, recipient: options.token || options.topic }, "FCM Push notification dispatched successfully");
      return { success: true, messageId };
    } catch (error: any) {
      logger.error({ error: error.message }, "Failed to send FCM push notification");
      return { success: false, error: error.message || "Failed to dispatch push notification" };
    }
  },
};
