import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { auditLogs, workspaceMembers, users } from "../../database/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";

export const activityRouter = Router();

activityRouter.use(authenticate);

// Middleware to verify workspace membership
const verifyWorkspaceAccess = async (req: Request, res: Response, next: Function) => {
  const { workspaceId } = req.params;
  const userId = (req as any).user?.id;

  try {
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, String(workspaceId)),
        eq(workspaceMembers.userId, userId)
      ),
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: "Access denied." });
    }

    // Attach role for export checking
    (req as any).userRole = membership.role;
    next();
  } catch (error) {
    logger.error("Workspace Verification Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};

activityRouter.get("/:workspaceId/activity", verifyWorkspaceAccess, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const logs = await db.select({
      id: auditLogs.id,
      eventType: auditLogs.eventType,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.workspaceId, String(workspaceId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

    const formattedLogs = logs.map(log => ({
      id: log.id,
      time: log.createdAt,
      message: log.userName ? `${log.userName} performed ${log.eventType}: ${log.details}` : `System performed ${log.eventType}: ${log.details}`,
    }));

    res.json({ success: true, data: formattedLogs });
  } catch (error: any) {
    logger.error("Activity Timeline Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

activityRouter.get("/:workspaceId/activity/export", verifyWorkspaceAccess, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userRole = (req as any).userRole;

    if (userRole !== "CEO" && userRole !== "CO-CEO") {
      return res.status(403).json({ success: false, error: "Only CEO or CO-CEO can export activity data." });
    }

    const logs = await db.select({
      id: auditLogs.id,
      eventType: auditLogs.eventType,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      userName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.workspaceId, String(workspaceId)))
    .orderBy(desc(auditLogs.createdAt));

    // Generate CSV
    let csv = "ID,Timestamp,User,Event,Details\n";
    logs.forEach(log => {
      const safeDetails = log.details ? log.details.replace(/"/g, '""') : '';
      const safeUser = log.userName ? log.userName.replace(/"/g, '""') : 'System';
      csv += `${log.id},"${log.createdAt}","${safeUser}","${log.eventType}","${safeDetails}"\n`;
    });

    res.header("Content-Type", "text/csv");
    res.attachment(`workspace_${workspaceId}_activity.csv`);
    res.send(csv);
  } catch (error: any) {
    logger.error("Activity Export Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});
