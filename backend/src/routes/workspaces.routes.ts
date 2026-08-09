import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { workspaces, workspaceMembers, users } from "../../database/schema";
import { eq, and, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { v4 as uuidv4 } from "uuid";

export const workspacesRouter = Router();

workspacesRouter.use(authenticate);

// List user's workspaces
workspacesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const memberships = await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, userId));
    if (memberships.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const workspaceIds = memberships.map(m => m.workspaceId);
    const userWorkspaces = await db.select().from(workspaces).where(inArray(workspaces.id, workspaceIds));
    res.json({ success: true, data: userWorkspaces });
  } catch (error: any) {
    logger.error("List User Workspaces Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Create a new Workspace (Organization)
workspacesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = (req as any).user?.id;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ success: false, error: "Workspace name is required." });
    }

    const workspaceId = uuidv4();

    // Create the workspace
    const newWorkspace = await db.insert(workspaces).values({
      id: workspaceId,
      name,
      type: "organization",
    }).returning();

    // Add the creator as CEO
    await db.insert(workspaceMembers).values({
      id: uuidv4(),
      workspaceId,
      userId,
      role: "CEO",
    });

    res.json({
      success: true,
      message: "Workspace created successfully.",
      data: newWorkspace[0],
    });
  } catch (error: any) {
    logger.error("Create Workspace Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Middleware to verify CEO or CO-CEO role for management actions
const requireLeadership = async (req: Request, res: Response, next: Function) => {
  const { workspaceId } = req.params;
  const userId = (req as any).user?.id;

  try {
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, String(workspaceId)),
        eq(workspaceMembers.userId, userId)
      ),
    });

    if (!membership || (membership.role !== "CEO" && membership.role !== "CO-CEO")) {
      return res.status(403).json({ success: false, error: "Only CEO or CO-CEO can perform this action." });
    }

    next();
  } catch (error) {
    logger.error("Leadership Verification Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};

// Add Member
workspacesRouter.post("/:workspaceId/members", requireLeadership, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { email, role } = req.body;

    if (!email) return res.status(400).json({ success: false, error: "Email is required." });

    const user = await db.query.users.findFirst({
      where: eq(users.email, String(email))
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found with this email." });
    }

    // Check if already a member
    const existing = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, String(workspaceId)),
        eq(workspaceMembers.userId, user.id)
      )
    });

    if (existing) {
      return res.status(400).json({ success: false, error: "User is already a member." });
    }

    const newMember = await db.insert(workspaceMembers).values({
      id: uuidv4(),
      workspaceId: String(workspaceId),
      userId: user.id,
      role: role || "MEMBER",
    }).returning();

    res.json({ success: true, message: "Member added successfully.", data: newMember[0] });
  } catch (error: any) {
    logger.error("Add Member Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Update Member Role
workspacesRouter.put("/:workspaceId/members/:userId", requireLeadership, async (req: Request, res: Response) => {
  try {
    const { workspaceId, userId } = req.params;
    const { role } = req.body;

    if (!role) return res.status(400).json({ success: false, error: "Role is required." });

    const updated = await db.update(workspaceMembers)
      .set({ role })
      .where(and(
        eq(workspaceMembers.workspaceId, String(workspaceId)),
        eq(workspaceMembers.userId, String(userId))
      ))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ success: false, error: "Member not found." });
    }

    res.json({ success: true, message: "Member role updated.", data: updated[0] });
  } catch (error: any) {
    logger.error("Update Member Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Remove Member
workspacesRouter.delete("/:workspaceId/members/:userId", requireLeadership, async (req: Request, res: Response) => {
  try {
    const { workspaceId, userId } = req.params;

    // Prevent CEO from removing themselves
    const deleterId = (req as any).user?.id;
    if (deleterId === userId) {
       return res.status(400).json({ success: false, error: "You cannot remove yourself. Transfer ownership first." });
    }

    const removed = await db.delete(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, String(workspaceId)),
        eq(workspaceMembers.userId, String(userId))
      ))
      .returning();

    if (!removed.length) {
      return res.status(404).json({ success: false, error: "Member not found." });
    }

    res.json({ success: true, message: "Member removed." });
  } catch (error: any) {
    logger.error("Remove Member Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});
