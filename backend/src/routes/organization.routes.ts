import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { users, workspaces, workspaceMembers, departments, invitations, tasks, projects, timeTracking, auditLogs, leaderboardCache } from "../../database/schema";
import { eq, and, desc, sql, ilike, or, ne, gte, lte } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { v4 as uuidv4 } from "uuid";

export const organizationRouter = Router();

organizationRouter.use(authenticate);

// Middleware to ensure user is CEO or CO-CEO
const requireLeadership = async (req: Request, res: Response, next: any) => {
  const userId = (req as any).user?.id;
  let workspaceId = req.query.workspaceId || req.body.workspaceId;

  if (!workspaceId || workspaceId === "undefined" || workspaceId === "null" || workspaceId === "") {
    const firstMembership = await db.query.workspaceMembers.findFirst({
      where: eq(workspaceMembers.userId, userId)
    });
    if (firstMembership) {
      workspaceId = firstMembership.workspaceId;
      req.query.workspaceId = workspaceId;
      req.body.workspaceId = workspaceId;
    }
  }

  if (!workspaceId) {
    return res.status(400).json({ success: false, error: "workspaceId is required" });
  }

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, String(workspaceId)),
      eq(workspaceMembers.userId, userId)
    ),
  });

  if (!membership || (membership.role !== "CEO" && membership.role !== "CO-CEO")) {
    const userRole = ((req as any).user?.role || "").toUpperCase();
    if (userRole === "CEO" || userRole === "CO-CEO") {
      (req as any).membership = { role: userRole, workspaceId: workspaceId || "default" };
      return next();
    }
    const anyLeadership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.userId, userId),
        or(eq(workspaceMembers.role, "CEO"), eq(workspaceMembers.role, "CO-CEO"))
      )
    });
    if (anyLeadership) {
      (req as any).membership = anyLeadership;
      req.query.workspaceId = anyLeadership.workspaceId;
      req.body.workspaceId = anyLeadership.workspaceId;
      return next();
    }
    return res.status(403).json({ success: false, error: "Access denied. Leadership role required." });
  }

  (req as any).membership = membership;
  next();
};

// 1. Get Organization Dashboard Stats
organizationRouter.get("/stats", requireLeadership, async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId);
    
    // Total members
    const membersResult = await db.select({ count: sql<number>`count(*)` }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
    
    // Total CO-CEOs
    const coCeosResult = await db.select({ count: sql<number>`count(*)` }).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, "CO-CEO")));
    
    // Pending Invitations
    const invitationsResult = await db.select({ count: sql<number>`count(*)` }).from(invitations).where(and(eq(invitations.organizationId, workspaceId), eq(invitations.status, "Pending")));
    
    res.json({
      success: true,
      data: {
        totalMembers: membersResult[0].count,
        totalCoCeos: coCeosResult[0].count,
        pendingInvitations: invitationsResult[0].count,
        activeUsers: membersResult[0].count, // Mock for now
        inactiveUsers: 0,
        organizationHealth: 98 // Mock score
      }
    });
  } catch (error: any) {
    logger.error("Org Stats Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// 2. Get Members
organizationRouter.get("/members", requireLeadership, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    let workspaceId = String(req.query.workspaceId || (req as any).workspaceId || "");

    if (!workspaceId || workspaceId === "undefined" || workspaceId === "null" || workspaceId === "") {
      const userMember = await db.query.workspaceMembers.findFirst({
        where: eq(workspaceMembers.userId, userId)
      });
      if (userMember) workspaceId = userMember.workspaceId;
    }
    
    const members = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        displayName: users.displayName,
        avatar: users.avatar,
        role: workspaceMembers.role,
        status: users.status,
        employeeId: users.employeeId,
        managerId: users.managerId,
        joinedAt: workspaceMembers.createdAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(desc(workspaceMembers.createdAt));

    // Enrich with assigned CO-CEO supervisor details
    const enrichedMembers = await Promise.all(members.map(async (m) => {
      let assignedCoCeoName = null;
      let assignedCoCeoEmail = null;

      if (m.managerId) {
        const coCeoUser = await db.query.users.findFirst({
          where: eq(users.id, m.managerId)
        });
        if (coCeoUser) {
          assignedCoCeoName = coCeoUser.displayName || coCeoUser.name;
          assignedCoCeoEmail = coCeoUser.email;
        } else {
          const coCeoInvite = await db.query.invitations.findFirst({
            where: eq(invitations.id, m.managerId)
          });
          if (coCeoInvite) {
            assignedCoCeoName = coCeoInvite.email;
            assignedCoCeoEmail = coCeoInvite.email;
          }
        }
      }

      return {
        ...m,
        assignedCoCeoName,
        assignedCoCeoEmail,
      };
    }));
      
    res.json({ success: true, data: enrichedMembers });
  } catch (error: any) {
    logger.error("Org Members Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// 3. Reassign Member
organizationRouter.post("/members/reassign", requireLeadership, async (req: Request, res: Response) => {
  try {
    const { workspaceId, targetUserId, newManagerId } = req.body;
    
    await db.update(users)
      .set({ managerId: newManagerId || null })
      .where(eq(users.id, targetUserId));
      
    res.json({ success: true, message: "Member reassigned successfully" });
  } catch (error: any) {
    logger.error("Org Reassign Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// 4. Get CO-CEOs
organizationRouter.get("/co-ceos", requireLeadership, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    let workspaceId = String(req.query.workspaceId || (req as any).workspaceId || "");

    if (!workspaceId || workspaceId === "undefined" || workspaceId === "null" || workspaceId === "") {
      const userMember = await db.query.workspaceMembers.findFirst({
        where: eq(workspaceMembers.userId, userId)
      });
      if (userMember) workspaceId = userMember.workspaceId;
    }

    // 1. Active CO-CEO workspace members (case-insensitive role check)
    const activeCoCeos = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        displayName: users.displayName,
        avatar: users.avatar,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        or(
          ilike(workspaceMembers.role, "co-ceo"),
          ilike(workspaceMembers.role, "co_ceo"),
          ilike(users.role, "co-ceo"),
          ilike(users.role, "co_ceo")
        )
      ));

    // 2. CO-CEO invitations (Accepted, Pending, Sent, Queued)
    const coCeoInvites = workspaceId ? await db
      .select({
        id: invitations.id,
        email: invitations.email,
        status: invitations.status,
        role: invitations.role,
      })
      .from(invitations)
      .where(and(
        eq(invitations.organizationId, workspaceId),
        or(
          ilike(invitations.role, "co-ceo"),
          ilike(invitations.role, "co_ceo")
        ),
        ne(invitations.status, "Revoked")
      )) : [];

    // Deduplicate by email
    const seenEmails = new Set<string>();
    const coCeosList: any[] = [];

    // Add active members first
    for (const c of activeCoCeos) {
      const lowerEmail = c.email.toLowerCase();
      seenEmails.add(lowerEmail);
      coCeosList.push({
        id: c.id,
        email: c.email,
        name: c.displayName || c.name || c.email,
        displayName: `${c.displayName || c.name || c.email} • Active CO-CEO`,
        status: 'ACTIVE'
      });
    }

    // Add invitations (accepted or pending) if not already in list
    for (const invite of coCeoInvites) {
      const lowerEmail = invite.email.toLowerCase();
      if (!seenEmails.has(lowerEmail)) {
        seenEmails.add(lowerEmail);
        const statusLabel = invite.status === "Accepted" 
          ? "Accepted CO-CEO" 
          : "Invited CO-CEO (Pending)";
        coCeosList.push({
          id: invite.id,
          email: invite.email,
          name: invite.email,
          displayName: `${invite.email} • ${statusLabel}`,
          status: invite.status
        });
      }
    }

    return res.json({ success: true, coCeos: coCeosList });
  } catch (error: any) {
    logger.error(`[OrganizationRouter] Error fetching CO-CEOs: ${error.message}`);
    res.status(500).json({ success: false, error: "Failed to fetch CO-CEOs" });
  }
});

// 4. Get Organization Departments
organizationRouter.get("/departments", requireLeadership, async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId);
    
    const depts = await db.query.departments.findMany({
      where: eq(departments.workspaceId, workspaceId),
      orderBy: [desc(departments.createdAt)],
    });
    
    return res.json({ success: true, departments: depts });
  } catch (error: any) {
    logger.error(`[OrganizationRouter] Error fetching departments: ${error.message}`);
    res.status(500).json({ success: false, error: "Failed to fetch departments" });
  }
});

// 5. Validate Invitation Email
organizationRouter.post("/invitations/validate", requireLeadership, async (req: Request, res: Response) => {
  try {
    const { email, workspaceId } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "Email is required" });

    // Check if user already exists in workspace
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser && workspaceId) {
      const [membership] = await db.select().from(workspaceMembers).where(and(
        eq(workspaceMembers.userId, existingUser.id),
        eq(workspaceMembers.workspaceId, String(workspaceId))
      )).limit(1);

      if (membership) {
        return res.json({ success: false, error: "User is already a member of this organization." });
      }
    }

    // Check if invitation is already pending
    if (workspaceId) {
      const [existingInvite] = await db.select().from(invitations).where(and(
        eq(invitations.email, email),
        eq(invitations.organizationId, String(workspaceId)),
        or(
          eq(invitations.status, "Pending"),
          eq(invitations.status, "Queued"),
          eq(invitations.status, "Sending"),
          eq(invitations.status, "Delivered")
        )
      )).limit(1);

      if (existingInvite) {
        return res.json({ success: false, error: "An active invitation already exists for this email." });
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    logger.error(`[OrganizationRouter] Invitation validation error: ${error.message}`);
    return res.status(500).json({ success: false, error: "Validation failed" });
  }
});

// 5. Get Hierarchy
organizationRouter.get("/hierarchy", requireLeadership, async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId);
    
    const allMembers = await db
      .select({
        id: users.id,
        name: users.name,
        role: workspaceMembers.role,
        avatar: users.avatar,
        managerId: users.managerId,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));
      
    // Build tree
    const rootNodes = allMembers.filter(m => m.role === "CEO");
    
    const buildTree = (node: any): any => {
      const children = allMembers.filter(m => m.managerId === node.id);
      return {
        ...node,
        children: children.map(buildTree)
      };
    };
    
    const hierarchy = rootNodes.map(buildTree);
    
    res.json({ success: true, data: hierarchy });
  } catch (error: any) {
    logger.error("Org Hierarchy Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// 6. Organization Dashboard Data
organizationRouter.get("/dashboard", requireLeadership, async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId);
    const userId = (req as any).user?.id;
    
    // Get time boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 1. Team Members Count
    const membersResult = await db.select({ count: sql<number>`count(*)` }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
    const totalMembers = membersResult[0].count;

    // 2. Projects Data
    const allProjects = await db.select().from(projects).where(eq(projects.workspaceId, workspaceId));
    const activeProjects = allProjects.filter(p => p.status === "Active" || p.status === "Planning");
    
    let overallProgress = 0;
    const projectPulses = await Promise.all(
      activeProjects.map(async (project) => {
        const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, project.id));
        const total = projectTasks.length;
        const completed = projectTasks.filter(t => t.status === "Completed").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return {
          id: project.id,
          name: project.name,
          progress,
          totalTasks: total,
          remainingTasks: total - completed,
          deadline: project.deadline
        };
      })
    );

    if (projectPulses.length > 0) {
      overallProgress = Math.round(projectPulses.reduce((acc, p) => acc + p.progress, 0) / projectPulses.length);
    }

    // Sort active projects for the dashboard view
    const sortedActiveProjects = projectPulses
      .sort((a, b) => {
        const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return timeA - timeB;
      })
      .slice(0, 5); // Limit to 5

    // 3. Hours Logged
    const allTimeTracking = await db.select().from(timeTracking).where(eq(timeTracking.workspaceId, workspaceId));
    const totalHoursLogged = Math.round(allTimeTracking.reduce((acc, session) => {
      let duration = session.durationSeconds || 0;
      if (!session.endTime) {
        duration += Math.floor((new Date().getTime() - new Date(session.startTime).getTime()) / 1000);
      }
      return acc + duration;
    }, 0) / 3600); // converting to hours

    // 4. Pending Approvals (Tasks in Review)
    const pendingApprovals = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        submittedAt: tasks.submittedAt,
        assigneeName: users.displayName
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.status, "Review")))
      .orderBy(desc(tasks.submittedAt))
      .limit(5);

    // 5. Recent Activities
    const recentActivitiesRaw = await db
      .select({
        id: auditLogs.id,
        eventType: auditLogs.eventType,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        userName: users.displayName,
        userAvatar: users.avatar
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.workspaceId, workspaceId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(5);

    // 6. Top Performers (Mocking based on completed tasks today for now, as ledger needs full logic)
    const taskCompletionsToday = await db
      .select({
        userId: auditLogs.userId,
        userName: users.displayName,
        count: sql<number>`count(*)`
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(
        and(
          eq(auditLogs.workspaceId, workspaceId),
          eq(auditLogs.eventType, "TASK_STATUS_UPDATE"),
          ilike(auditLogs.details, "%Completed%"),
          gte(auditLogs.createdAt, todayStart),
          lte(auditLogs.createdAt, todayEnd)
        )
      )
      .groupBy(auditLogs.userId, users.displayName)
      .orderBy(desc(sql`count(*)`))
      .limit(3);

    res.json({
      success: true,
      data: {
        kpis: {
          overallProgress,
          activeProjectsCount: activeProjects.length,
          teamMembers: totalMembers,
          hoursLogged: totalHoursLogged
        },
        activeProjects: sortedActiveProjects,
        recentActivities: recentActivitiesRaw,
        pendingApprovals,
        topPerformers: taskCompletionsToday.map((p, i) => ({
          id: p.userId,
          name: p.userName || "User",
          tasksCompleted: Number(p.count),
          rank: i + 1
        }))
      }
    });

  } catch (error: any) {
    logger.error("Org Dashboard Error: " + error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default organizationRouter;
