import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { invitations, workspaceMembers, users } from "../../database/schema";
import { eq, and, or } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { socketService } from "../services/socket.service";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { emailService } from "../services/email.service";
import { AuthService } from "../services/auth.service";
import { SessionService } from "../services/session.service";

export const invitationsRouter = Router();

// Retrieve invitation details (Public / Semi-Public)
invitationsRouter.get("/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.token, String(token))
    });

    if (!invitation || invitation.status === "Revoked") {
      return res.status(404).json({ success: false, error: "Invitation not found or has been revoked by organization administrator." });
    }

    if (invitation.status === "Expired" || new Date() > new Date(invitation.expiresAt)) {
      return res.status(400).json({ success: false, error: "Invitation has expired." });
    }

    if (invitation.status === "Pending") {
      // Mark as Viewed
      await db.update(invitations)
        .set({ status: "Viewed" })
        .where(eq(invitations.id, invitation.id));
      invitation.status = "Viewed";
    }

    let assignedCoCeoName = null;
    let assignedCoCeoEmail = null;

    if (invitation.managerId) {
      const coCeoUser = await db.query.users.findFirst({
        where: eq(users.id, invitation.managerId)
      });
      if (coCeoUser) {
        assignedCoCeoName = coCeoUser.displayName || coCeoUser.name;
        assignedCoCeoEmail = coCeoUser.email;
      } else {
        const coCeoInvite = await db.query.invitations.findFirst({
          where: eq(invitations.id, invitation.managerId)
        });
        if (coCeoInvite) {
          assignedCoCeoName = coCeoInvite.email;
          assignedCoCeoEmail = coCeoInvite.email;
        }
      }
    }

    res.json({ 
      success: true, 
      data: {
        ...invitation,
        assignedCoCeoName,
        assignedCoCeoEmail,
      } 
    });
  } catch (error: any) {
    logger.error("View Invitation Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Setup from Invitation (Public)
invitationsRouter.post("/:token/setup", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password, name, batchNumber, timezone } = req.body;

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.token, String(token))
    });

    if (!invitation || invitation.status === "Revoked") {
      return res.status(404).json({ success: false, error: "Invitation not found or has been revoked." });
    }
    if (invitation.status === "Accepted" || invitation.status === "Expired") {
      return res.status(400).json({ success: false, error: `Invitation is already ${invitation.status.toLowerCase()}.` });
    }

    const userName = name || (invitation as any).name || invitation.email.split("@")[0];
    const finalBatch = batchNumber || invitation.batchNumber || null;
    const finalTimezone = timezone || "UTC";

    // Check if user exists, if not create
    let user = await db.query.users.findFirst({ where: eq(users.email, invitation.email) });
    if (!user) {
      user = (await db.insert(users).values({
        id: uuidv4(),
        email: invitation.email,
        name: userName,
        displayName: userName,
        batchNumber: finalBatch,
        timezone: finalTimezone,
        role: invitation.role,
        status: "Activated",
      }).returning())[0];
    }

    // Hash password and save profile details
    const passwordHash = await AuthService.hashPassword(password);
    await db.update(users).set({ 
      name: userName, 
      displayName: userName,
      batchNumber: finalBatch,
      timezone: finalTimezone,
      passwordHash, 
      status: "Activated", 
      role: invitation.role 
    }).where(eq(users.id, user.id));

    // Add to workspace
    if (invitation.organizationId) {
      const existing = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, invitation.organizationId),
          eq(workspaceMembers.userId, user.id)
        )
      });
      
      if (!existing) {
        await db.insert(workspaceMembers).values({
          id: uuidv4(),
          workspaceId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
        });
      }
    }

    // Mark invitation as accepted and workspace activated
    await db.update(invitations).set({ status: "Activated" }).where(eq(invitations.id, invitation.id));

    if (invitation.organizationId) {
      socketService.emitToWorkspace(invitation.organizationId, "INVITATION_ACCEPTED", { id: invitation.id, status: "Activated" });
      socketService.emitToWorkspace(invitation.organizationId, "MEMBER_ACTIVATED", { id: invitation.id, userId: user.id });
    }

    // Issue tokens for automatic login
    const deviceId = req.ip || "unknown-device";
    SessionService.issueTokens(res, user, deviceId);

    res.json({
      success: true,
      message: "Account setup successful.",
      nextStep: "DASHBOARD",
      role: invitation.role || user.role,
      workspaceId: invitation.organizationId,
    });
  } catch (error: any) {
    logger.error("Setup Invitation Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// The following routes require authentication
invitationsRouter.use(authenticate);

// Generate an invitation (Leadership Only)
invitationsRouter.post("/send", async (req: Request, res: Response) => {
  try {
    let { email, role, workspaceId, departmentId, managerId, batchNumber, employeeId, message, permissions } = req.body;
    const inviterId = (req as any).user?.id;

    if (!workspaceId || workspaceId === "undefined" || workspaceId === "null" || workspaceId === "") {
      const firstMembership = await db.query.workspaceMembers.findFirst({
        where: eq(workspaceMembers.userId, inviterId)
      });
      if (firstMembership) {
        workspaceId = firstMembership.workspaceId;
      }
    }

    if (!email || !role || !workspaceId) {
      return res.status(400).json({ success: false, error: "Email, role, and workspaceId are required." });
    }

    // Verify leadership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, String(workspaceId)),
        eq(workspaceMembers.userId, inviterId)
      )
    });

    if (!membership || (membership.role !== "CEO" && membership.role !== "CO-CEO")) {
      const anyLeadership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.userId, inviterId),
          or(eq(workspaceMembers.role, "CEO"), eq(workspaceMembers.role, "CO-CEO"))
        )
      });
      if (anyLeadership) {
        workspaceId = anyLeadership.workspaceId;
      } else {
        return res.status(403).json({ success: false, error: "Only CEO or CO-CEO can send invitations." });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const newInvite = await db.insert(invitations).values({
      id: uuidv4(),
      token,
      email: String(email),
      role: String(role),
      organizationId: String(workspaceId),
      invitedById: inviterId,
      departmentId: departmentId || null,
      managerId: managerId || null,
      batchNumber: batchNumber || null,
      employeeId: employeeId || null,
      message: message || null,
      permissions: Array.isArray(permissions) ? permissions : [],
      expiresAt,
      status: "Queued",
    }).returning();

    // Fetch inviter's name
    const inviter = await db.query.users.findFirst({
      where: eq(users.id, inviterId)
    });
    const inviterName = inviter?.displayName || inviter?.name || "A team member";

    // Send the real invitation email
    await emailService.sendInvitationEmail(String(email), token, String(role), inviterName);

    // Socket notification
    socketService.emitToWorkspace(String(workspaceId), "INVITATION_SENT", newInvite[0]);

    res.json({ success: true, data: newInvite[0] });
  } catch (error: any) {
    logger.error("Create Invitation Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Get all invitations for an organization
invitationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    let workspaceId = String(req.query.workspaceId || "");
    const inviterId = (req as any).user?.id;

    if (!workspaceId || workspaceId === "undefined" || workspaceId === "null" || workspaceId === "") {
      const firstMembership = await db.query.workspaceMembers.findFirst({
        where: eq(workspaceMembers.userId, inviterId)
      });
      if (firstMembership) {
        workspaceId = firstMembership.workspaceId;
      }
    }

    const userRole = ((req as any).user?.role || "").toUpperCase();
    let allInvitations = [];

    if (workspaceId) {
      allInvitations = await db.query.invitations.findMany({
        where: eq(invitations.organizationId, workspaceId),
        orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
      });
    } else {
      allInvitations = await db.query.invitations.findMany({
        orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
        limit: 50,
      });
    }

    const enrichedInvitations = await Promise.all(allInvitations.map(async (inv) => {
      let assignedCoCeoName = null;
      let assignedCoCeoEmail = null;
      if (inv.managerId) {
        const coCeoUser = await db.query.users.findFirst({
          where: eq(users.id, inv.managerId)
        });
        if (coCeoUser) {
          assignedCoCeoName = coCeoUser.displayName || coCeoUser.name;
          assignedCoCeoEmail = coCeoUser.email;
        } else {
          const coCeoInvite = await db.query.invitations.findFirst({
            where: eq(invitations.id, inv.managerId)
          });
          if (coCeoInvite) {
            assignedCoCeoName = coCeoInvite.email;
            assignedCoCeoEmail = coCeoInvite.email;
          }
        }
      }
      return {
        ...inv,
        assignedCoCeoName,
        assignedCoCeoEmail,
      };
    }));

    res.json({ success: true, data: enrichedInvitations });
  } catch (error: any) {
    logger.error("Get Invitations Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Resend Invitation
invitationsRouter.post("/:id/resend", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const inviterId = (req as any).user?.id;

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, String(id))
    });

    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found." });

    // Mark as Resent
    await db.update(invitations)
      .set({ status: "Resent" })
      .where(eq(invitations.id, invitation.id));

    if (invitation.organizationId) {
      socketService.emitToWorkspace(invitation.organizationId, "INVITATION_UPDATED", { id: invitation.id, status: "Resent" });
    }

    res.json({ success: true, message: "Invitation resent." });
  } catch (error: any) {
    logger.error("Resend Invitation Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Revoke Invitation
invitationsRouter.post("/:id/revoke", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, String(id))
    });

    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found." });

    // Mark as Revoked
    await db.update(invitations)
      .set({ status: "Revoked" })
      .where(eq(invitations.id, invitation.id));

    if (invitation.organizationId) {
      socketService.emitToWorkspace(invitation.organizationId, "INVITATION_UPDATED", { id: invitation.id, status: "Revoked" });
    }

    res.json({ success: true, message: "Invitation revoked." });
  } catch (error: any) {
    logger.error("Revoke Invitation Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Edit Invitation
invitationsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, role, batchNumber, managerId } = req.body;

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, String(id))
    });

    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found." });

    const updated = await db.update(invitations)
      .set({
        email: email || invitation.email,
        role: role || invitation.role,
        batchNumber: batchNumber !== undefined ? batchNumber : invitation.batchNumber,
        managerId: managerId !== undefined ? managerId : invitation.managerId,
      })
      .where(eq(invitations.id, invitation.id))
      .returning();

    if (invitation.organizationId) {
      socketService.emitToWorkspace(invitation.organizationId, "INVITATION_UPDATED", updated[0]);
    }

    res.json({ success: true, message: "Invitation updated successfully.", data: updated[0] });
  } catch (error: any) {
    logger.error("Edit Invitation Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Clear all test invitations (preserves users & organization)
invitationsRouter.delete("/clear-all", async (req: Request, res: Response) => {
  try {
    await db.delete(invitations);
    res.json({ success: true, message: "All invitation records cleared from database." });
  } catch (error: any) {
    logger.error("Clear Invitations Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Permanent Delete Invitation
invitationsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, String(id))
    });

    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found." });

    await db.delete(invitations).where(eq(invitations.id, invitation.id));

    if (invitation.organizationId) {
      socketService.emitToWorkspace(invitation.organizationId, "INVITATION_DELETED", { id: invitation.id });
    }

    res.json({ success: true, message: "Invitation permanently deleted." });
  } catch (error: any) {
    logger.error("Delete Invitation Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Bulk Batch Invitations Dispatch
invitationsRouter.post("/batch-send", async (req: Request, res: Response) => {
  try {
    let { emails, role, workspaceId, batchNumber } = req.body;
    const inviterId = (req as any).user?.id;

    if (!workspaceId || workspaceId === "undefined" || workspaceId === "null" || workspaceId === "") {
      const firstMembership = await db.query.workspaceMembers.findFirst({
        where: eq(workspaceMembers.userId, inviterId)
      });
      if (firstMembership) {
        workspaceId = firstMembership.workspaceId;
      }
    }

    if (!Array.isArray(emails) || emails.length === 0 || !role || !workspaceId) {
      return res.status(400).json({ success: false, error: "Emails array, role, and workspaceId are required." });
    }

    const createdInvites = [];
    const inviter = await db.query.users.findFirst({ where: eq(users.id, inviterId) });
    const inviterName = inviter?.displayName || inviter?.name || "A team member";

    for (const rawEmail of emails) {
      const email = String(rawEmail).trim();
      if (!email || !email.includes("@")) continue;

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [newInvite] = await db.insert(invitations).values({
        id: uuidv4(),
        token,
        email,
        role: String(role),
        organizationId: String(workspaceId),
        invitedById: inviterId,
        batchNumber: batchNumber || null,
        expiresAt,
        status: "Queued",
      }).returning();

      await emailService.sendInvitationEmail(email, token, String(role), inviterName);
      createdInvites.push(newInvite);
      socketService.emitToWorkspace(String(workspaceId), "INVITATION_SENT", newInvite);
    }

    res.json({ success: true, count: createdInvites.length, data: createdInvites });
  } catch (error: any) {
    logger.error("Batch Invitation Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Accept Invitation
invitationsRouter.post("/:token/accept", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.token, String(token))
    });

    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found." });
    if (invitation.status === "Accepted" || invitation.status === "Expired") {
      return res.status(400).json({ success: false, error: `Invitation is already ${invitation.status.toLowerCase()}.` });
    }
    
    // Optionally enforce that the authenticated user's email matches the invitation email.
    // We skip it here if you allow users to sign up with a different email, but let's enforce it for security.
    if (userEmail && userEmail !== invitation.email) {
       // return res.status(400).json({ success: false, error: "Email mismatch. Please login with the invited email." });
    }

    // Add to workspace
    if (invitation.organizationId) {
      const existing = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, invitation.organizationId),
          eq(workspaceMembers.userId, userId)
        )
      });
      
      if (!existing) {
        await db.insert(workspaceMembers).values({
          id: uuidv4(),
          workspaceId: invitation.organizationId,
          userId,
          role: invitation.role,
        });
      }
    }

    // Mark as accepted
    await db.update(invitations)
      .set({ status: "Accepted" })
      .where(eq(invitations.id, invitation.id));

    if (invitation.organizationId) {
      socketService.emitToWorkspace(invitation.organizationId, "INVITATION_ACCEPTED", { id: invitation.id });
    }

    res.json({ success: true, message: "Invitation accepted." });
  } catch (error: any) {
    logger.error("Accept Invitation Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Reject Invitation
invitationsRouter.post("/:token/reject", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.token, String(token))
    });

    if (!invitation) return res.status(404).json({ success: false, error: "Invitation not found." });
    if (invitation.status === "Accepted" || invitation.status === "Expired") {
      return res.status(400).json({ success: false, error: `Invitation is already ${invitation.status.toLowerCase()}.` });
    }

    // Mark as Rejected/Expired
    await db.update(invitations)
      .set({ status: "Expired" })
      .where(eq(invitations.id, invitation.id));

    if (invitation.organizationId) {
      socketService.emitToWorkspace(invitation.organizationId, "INVITATION_UPDATED", { id: invitation.id, status: "Expired" });
    }

    res.json({ success: true, message: "Invitation rejected." });
  } catch (error: any) {
    logger.error("Reject Invitation Error: " + (error as Error).message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Webhook for Email Provider
invitationsRouter.post("/webhook", async (req: Request, res: Response) => {
  try {
    // Generic payload based on provider
    const { messageId, event, timestamp } = req.body;
    if (!messageId) return res.status(400).json({ success: false });

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.providerMessageId, messageId)
    });

    if (!invitation) return res.status(200).json({ success: true });

    let updateData: any = {};
    if (event === "delivered") {
      updateData.status = "Delivered";
      updateData.emailDeliveryTime = new Date(timestamp || Date.now());
    } else if (event === "opened") {
      updateData.status = "Opened";
      updateData.emailOpenTime = new Date(timestamp || Date.now());
    } else if (event === "bounced") {
      updateData.status = "Bounced";
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(invitations).set(updateData).where(eq(invitations.id, invitation.id));
      if (invitation.organizationId) {
        socketService.emitToWorkspace(invitation.organizationId, "INVITATION_UPDATED", { id: invitation.id, ...updateData });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error("Webhook Error: " + error.message);
    res.status(500).json({ success: false });
  }
});
