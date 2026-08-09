import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "passport";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.config";
import { logger } from "./services/logger.service";
import { emailService } from "./services/email.service";
import { cloudinaryService } from "../storage/cloudinary.service";
import { firebaseNotificationService } from "./services/firebase.service";
import { aiService } from "./services/ai.service";
import { queueService } from "./services/queue.service";
import { db } from "../database/client";
import { users, mediaAssets, notificationLogs, aiConversations } from "../database/schema";
import { OtpService } from "./services/otp.service";
import { enforceWorkExecutionPolicy } from "./middleware/time.middleware";
import { authRouter } from "./routes/auth.routes";
import { notificationsRouter } from "./routes/notifications.routes";
import { searchRouter } from "./routes/search.routes";
import { aiRouter } from "./routes/ai.routes";
import { workspacesRouter } from "./routes/workspaces.routes";
import { projectsRouter } from "./routes/projects.routes";
import { tasksRouter } from "./routes/tasks.routes";
import { personalProjectsRouter } from "./routes/personal/projects.routes";
import { personalTasksRouter } from "./routes/personal/tasks.routes";
import { personalGoalsRouter } from "./routes/personal/goals.routes";
import { personalHabitsRouter } from "./routes/personal/habits.routes";
import { personalBooksRouter } from "./routes/personal/books.routes";
import { personalPodcastsRouter } from "./routes/personal/podcasts.routes";
import { personalLearningRouter } from "./routes/personal/learning.routes";
import { personalNotesRouter } from "./routes/personal/notes.routes";
import { personalJournalRouter } from "./routes/personal/journal.routes";
import { personalFilesRouter } from "./routes/personal/files.routes";
import { personalVaultRouter } from "./routes/personal/vault.routes";
import { intelligenceRouter } from "./routes/personal/intelligence.routes";
import { assistantRouter } from "./routes/personal/assistant.routes";
import { integrationsRouter } from "./routes/personal/integrations.routes";
import { settingsRouter } from "./routes/personal/settings.routes";
import { manmadhanProjectsRouter } from "./routes/manmadhan/projects.routes";
import { manmadhanTasksRouter } from "./routes/manmadhan/tasks.routes";
import { activityRouter } from "./routes/activity.routes";
import { spacesRouter } from "./routes/spaces.routes";
import { foldersRouter } from "./routes/folders.routes";
import { invitationsRouter } from "./routes/invitations.routes";
import { organizationRouter } from "./routes/organization.routes";
import { progressRouter } from "./routes/progress.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { focusRouter } from "./routes/focus.routes";
import { personalRouter } from "./routes/personal.routes";
import { learningRouter } from "./routes/learning.routes";
import "./modules/auth/google-oauth.service";
import "./modules/auth/github-oauth.service";

export const createApp = (): Express => {
  const app = express();
  
  // Trust the proxy to ensure express-rate-limit accurately identifies users (e.g., behind Next.js rewrites or a load balancer)
  app.set("trust proxy", 1);

  // Security & Core Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));
  app.use(cookieParser());
  app.use(passport.initialize());

  // General API Rate Limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 100 : 1000,
    message: { success: false, error: "Too many requests, please try again later." },
  });

  // Storage Upload Rate Limiter
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, error: "Upload limit exceeded. Max 20 files per 15 minutes." },
  });

  app.use("/api/", apiLimiter);
  app.use("/api/", enforceWorkExecutionPolicy);

  // Health Endpoints
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "@manmadhan/backend",
      version: "1.0.0",
      limits: {
        maxUploadSizeBytes: "10MB",
        uploadRateLimit: "20 uploads / 15 mins",
      },
    });
  });

  app.get("/health/ready", (req: Request, res: Response) => {
    res.status(200).json({ status: "ready" });
  });

  // Mount Routers
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/search", searchRouter);
  app.use("/api/v1/ai", aiRouter);
  app.use("/api/v1/workspaces", workspacesRouter);
  // Legacy Unified Routes (Deprecating)
  // app.use("/api/v1/projects", projectsRouter);
  // app.use("/api/v1/tasks", tasksRouter);
  
  // New Segregated Database Routes
  app.use("/api/v1/personal/projects", personalProjectsRouter);
  app.use("/api/v1/personal/tasks", personalTasksRouter);
  app.use("/api/v1/personal/goals", personalGoalsRouter);
  app.use("/api/v1/personal/habits", personalHabitsRouter);
  app.use("/api/v1/personal/books", personalBooksRouter);
  app.use("/api/v1/personal/podcasts", personalPodcastsRouter);
  app.use("/api/v1/personal/learning", personalLearningRouter);
  app.use("/api/v1/personal/notes", personalNotesRouter);
  app.use("/api/v1/personal/journal", personalJournalRouter);
  app.use("/api/v1/personal/files", personalFilesRouter);
  app.use("/api/v1/personal/vault", personalVaultRouter);
  app.use("/api/v1/personal/intelligence", intelligenceRouter);
  app.use("/api/v1/personal/assistant", assistantRouter);
  app.use("/api/v1/personal/integrations", integrationsRouter);
  app.use("/api/v1/personal/settings", settingsRouter);
  app.use("/api/v1/manmadhan/projects", manmadhanProjectsRouter);
  app.use("/api/v1/manmadhan/tasks", manmadhanTasksRouter);
  app.use("/api/v1/activity", activityRouter);
  app.use("/api/v1/spaces", spacesRouter);
  app.use("/api/v1/folders", foldersRouter);
  app.use("/api/v1/invitations", invitationsRouter);
  app.use("/api/v1/organization", organizationRouter);
  app.use("/api/v1/progress", progressRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/focus", focusRouter);
  app.use("/api/v1/personal", personalRouter);
  app.use("/api/v1/learning", learningRouter);

  // ── Database Records REST API ──
  app.get("/api/v1/db/records", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [userList, assetList, notificationList, aiList] = await Promise.all([
        db.select().from(users).limit(10).catch(() => []),
        db.select().from(mediaAssets).limit(10).catch(() => []),
        db.select().from(notificationLogs).limit(10).catch(() => []),
        db.select().from(aiConversations).limit(10).catch(() => []),
      ]);

      return res.status(200).json({
        success: true,
        tables: {
          users: userList,
          mediaAssets: assetList,
          notificationLogs: notificationList,
          aiConversations: aiList,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // ── BullMQ Background Queue & Auto-Cleanup Endpoints ──
  app.post("/api/v1/queue/email-job", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { to, subject, text } = req.body;
      if (!to || !subject) {
        return res.status(400).json({ success: false, error: "Missing required fields: to, subject" });
      }

      const result = await queueService.addEmailJob({ to, subject, text });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/queue/push-job", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, body, token } = req.body;
      if (!title || !body) {
        return res.status(400).json({ success: false, error: "Missing required fields: title, body" });
      }

      const result = await queueService.addPushJob({ title, body, token, topic: token ? undefined : "all" });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/queue/stats", async (req: Request, res: Response) => {
    const stats = await queueService.getQueueStats();
    return res.status(200).json(stats);
  });

  // REST API Email Route
  app.post("/api/v1/email/send", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { to, subject, text, html } = req.body;
      if (!to || !subject) {
        return res.status(400).json({ success: false, error: "Missing required fields: to, subject" });
      }

      const result = await emailService.sendEmail({ to, subject, text, html });
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      next(error);
    }
  });

  // Smart Multi-LLM AI Gateway Endpoint with Auto-Failover
  app.post("/api/v1/ai/generate", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prompt, provider } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, error: "Missing required field: prompt" });
      }

      const result = await aiService.generateWithSmartFailover(prompt, provider);
      const metricsData = aiService.getMetrics();

      // Auto-Sync record into Drizzle ORM DB
      db.insert(aiConversations).values({
        id: `ai_${Date.now()}`,
        provider: result.provider,
        model: result.model,
        prompt,
        response: result.text,
        executionTimeMs: result.executionTimeMs,
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        data: {
          provider: result.provider,
          model: result.model,
          executionTimeMs: result.executionTimeMs,
          failoverTriggered: result.failoverUsed,
          failoverTrail: result.failoverTrail || [],
          response: result.text,
        },
        providerUsed: result.provider,
        response: result.text,
        metrics: metricsData.metrics,
        configuredProviders: metricsData.configuredProviders,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "AI Gateway error. Please check provider API keys in backend/.env",
      });
    }
  });

  // AI Usage Metrics & Quota Tracker
  app.get("/api/v1/ai/metrics", (req: Request, res: Response) => {
    res.status(200).json(aiService.getMetrics());
  });

  // Firebase Push Notification Route
  app.post("/api/v1/notifications/push", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, topic, title, body } = req.body;
      if (!title || !body) {
        return res.status(400).json({ success: false, error: "Missing required fields: title, body" });
      }

      const result = await firebaseNotificationService.sendPushNotification({ token, topic, title, body });

      // Auto-Sync notification into Drizzle ORM DB
      db.insert(notificationLogs).values({
        id: `push_${Date.now()}`,
        title,
        body,
        recipient: token || topic || "all",
        status: result.success ? "delivered" : "failed",
      }).catch(() => {});

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  });

  // Cloudinary Storage Upload Route
  app.post("/api/v1/storage/upload", uploadLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { file, folder } = req.body;
      if (!file) {
        return res.status(400).json({ success: false, error: "Missing required base64 file string" });
      }

      const approximateSizeInBytes = Math.round((file.length * 3) / 4);
      const MAX_SIZE = 10 * 1024 * 1024;
      if (approximateSizeInBytes > MAX_SIZE) {
        return res.status(400).json({
          success: false,
          error: `File exceeds maximum limit of 10MB. Selected file: ${(approximateSizeInBytes / (1024 * 1024)).toFixed(2)}MB`,
        });
      }

      if (!cloudinaryService.isConfigured()) {
        return res.status(400).json({
          success: false,
          error: "Cloudinary credentials not configured in backend/.env",
        });
      }

      const result = await cloudinaryService.uploadBase64(file, folder || "manmadhan-progress");

      // Auto-Sync asset into Drizzle ORM DB
      db.insert(mediaAssets).values({
        id: `asset_${Date.now()}`,
        publicId: result.public_id,
        url: result.secure_url,
        sizeFormatted: `${(approximateSizeInBytes / 1024).toFixed(2)} KB`,
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        url: result.secure_url,
        optimizeUrl: result.optimizeUrl,
        autoCropUrl: result.autoCropUrl,
        publicId: result.public_id,
        sizeFormatted: `${(approximateSizeInBytes / 1024).toFixed(2)} KB`,
      });
    } catch (error: any) {
      next(error);
    }
  });

  // Cloudinary Storage Delete Asset Route
  app.delete("/api/v1/storage/delete", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { publicId } = req.body;
      if (!publicId) {
        return res.status(400).json({ success: false, error: "Missing publicId parameter" });
      }

      const deleted = await cloudinaryService.deleteAsset(publicId);
      return res.status(200).json({
        success: deleted,
        message: deleted ? `Asset ${publicId} deleted cleanly from Cloudinary` : `Failed to delete asset ${publicId}`,
      });
    } catch (error: any) {
      next(error);
    }
  });

  // Google OAuth Routes
  app.get(
    "/api/v1/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false })
  );

  app.get(
    "/api/v1/auth/google/callback",
    passport.authenticate("google", { failureRedirect: `${env.CLIENT_URL}/login?error=UnauthorizedAccount`, session: false }),
    async (req: Request, res: Response) => {
      const user = req.user as any;
      if (user && user.email) {
        // Fetch fresh user from DB to check status
        const { db } = require("../database/client");
        const { users } = require("../database/schema");
        const { eq } = require("drizzle-orm");
        const { DeviceService } = require("./services/device.service");
        const { SessionService } = require("./services/session.service");
        const { AuditService } = require("./services/audit.service");
        const { randomUUID } = require("crypto");

        const userRecords = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
        const dbUser = userRecords[0];

        if (!dbUser) {
          return res.redirect(`${env.CLIENT_URL}/login?error=UnauthorizedAccount`);
        }

        if (dbUser.status === "Activated") {
          // Fully set up user, go straight to dashboard
          const deviceId = await DeviceService.registerDevice(dbUser.id, {
            deviceId: randomUUID(),
            deviceName: req.headers["user-agent"] || "Unknown",
            browser: "Unknown",
            os: "Unknown",
            ipAddress: req.ip || "0.0.0.0"
          });
          SessionService.issueTokens(res, dbUser, deviceId);
          await AuditService.logEvent(dbUser.id, "LOGIN_SUCCESS", "Logged in via Google OAuth", req.ip || "");
          
          const r = (dbUser.role || "").toUpperCase();
          let dashboardPath = "/member/dashboard";
          if (r === "CEO") dashboardPath = "/ceo/dashboard";
          else if (r === "CO-CEO") dashboardPath = "/co-ceo/dashboard";
          
          return res.redirect(`${env.CLIENT_URL}${dashboardPath}`);
        } else {
          // First time login or incomplete profile -> bypass OTP, keep PASSWORD_CREATION, then jump to PROFILE_SETUP
          await AuditService.logEvent(dbUser.id, "LOGIN_ATTEMPT", "Initial Google OAuth login, bypassing OTP", req.ip || "");
          
          // Jump to PASSWORD_CREATION first
          const tempToken = jwt.sign({ id: dbUser.id, email: dbUser.email, intent: "setup", step: "PASSWORD_CREATION" }, env.JWT_SECRET, { expiresIn: "30m" });
          
          return res.redirect(`${env.CLIENT_URL}/?auth_step=PASSWORD_CREATION&token=${tempToken}&role=${dbUser.role}`);
        }
      }
      return res.redirect(`${env.CLIENT_URL}/login?error=OAuthFailed`);
    }
  );

  // GitHub OAuth Routes
  app.get("/api/v1/auth/github", (req: Request, res: Response, next: NextFunction) => {
    if (!env.GITHUB_CLIENT_SECRET || env.GITHUB_CLIENT_SECRET.includes("github-client-secret")) {
      return res.status(400).json({
        success: false,
        error: "GitHub Client Secret pending. Please add GITHUB_CLIENT_SECRET in backend/.env",
      });
    }
    passport.authenticate("github", { scope: ["user:email"], session: false })(req, res, next);
  });

  app.get(
    "/api/v1/auth/github/callback",
    passport.authenticate("github", { failureRedirect: `${env.CLIENT_URL}?auth=failed`, session: false }),
    (req: Request, res: Response) => {
      const user = req.user as any;
      if (user && user.token) {
        // Auto-Sync user into Drizzle ORM DB
        db.insert(users).values({
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: "user",
        }).catch(() => {});

        res.cookie("auth_token", user.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.redirect(`${env.CLIENT_URL}?auth=success`);
      }
      return res.redirect(`${env.CLIENT_URL}?auth=failed`);
    }
  );

  // (Old auth profile endpoints replaced by authRouter)

  // Global Error Handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error({ err, url: req.url }, "Unhandled Application Exception");
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === "production" ? "Internal Server Error" : (err.message || "Internal Server Error"),
    });
  });

  return app;
};
