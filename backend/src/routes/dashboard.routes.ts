import { Router, Request, Response } from "express";
import { db } from "../../database/client";
import { 
  tasks, 
  projects, 
  timeTracking, 
  goals, 
  notifications, 
  auditLogs,
  users
} from "../../database/schema";
import { eq, and, isNull, gte, lte, or, desc, not } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

// GET /api/v1/dashboard - Fetch all Personal Workspace Dashboard data in one trip
dashboardRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const workspaceId = req.query.workspaceId as string;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: "Workspace ID is required" });
    }

    // Get current date range in UTC (or adjusted for user's timezone if present)
    const userTimezone = (req as any).user?.timezone || "UTC";
    const now = new Date();
    
    // Simple start/end of today in UTC
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    // Yesterday range
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);

    // 1. Fetch User Profile Info
    const userRecords = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const userProfile = userRecords[0];

    // 2. Fetch Tasks (Assigned to user in this workspace)
    const allUserTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          eq(tasks.assigneeId, userId)
        )
      );

    // Filter Tasks Today (Due today, or overdue tasks that are not completed)
    const tasksToday = allUserTasks.filter(task => {
      if (!task.deadline) return false;
      const deadlineDate = new Date(task.deadline);
      const isDueToday = deadlineDate >= todayStart && deadlineDate <= todayEnd;
      const isOverdue = deadlineDate < todayStart && task.status !== "Completed";
      return isDueToday || isOverdue;
    });

    const completedTasksToday = tasksToday.filter(t => t.status === "Completed");
    const remainingTasksToday = tasksToday.filter(t => t.status !== "Completed");

    // Today's Progress calculation
    let todayProgressPercent = 0;
    if (tasksToday.length > 0) {
      todayProgressPercent = Math.round((completedTasksToday.length / tasksToday.length) * 100);
    }

    // 3. Fetch Time Tracking (Focus Sessions today and yesterday)
    const focusSessionsToday = await db
      .select()
      .from(timeTracking)
      .where(
        and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.workspaceId, workspaceId),
          gte(timeTracking.startTime, todayStart),
          lte(timeTracking.startTime, todayEnd)
        )
      );

    const focusSessionsYesterday = await db
      .select()
      .from(timeTracking)
      .where(
        and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.workspaceId, workspaceId),
          gte(timeTracking.startTime, yesterdayStart),
          lte(timeTracking.startTime, yesterdayEnd)
        )
      );

    // Sum focus duration in seconds
    const totalFocusSecondsToday = focusSessionsToday.reduce((acc, session) => {
      if (session.endTime) {
        return acc + (session.durationSeconds || 0);
      } else {
        // If session is still running, calculate current elapsed
        return acc + Math.floor((new Date().getTime() - new Date(session.startTime).getTime()) / 1000);
      }
    }, 0);

    const totalFocusSecondsYesterday = focusSessionsYesterday.reduce((acc, session) => {
      return acc + (session.durationSeconds || 0);
    }, 0);

    // 4. Fetch Active Projects
    const allProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));

    const activeProjects = allProjects.filter(p => p.status === "Active" || p.status === "Planning");
    
    // Fetch upcoming deadlines count (projects or tasks due in next 7 days)
    const next7Days = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingTasksCount = allUserTasks.filter(task => {
      if (!task.deadline) return false;
      const deadlineDate = new Date(task.deadline);
      return deadlineDate > todayEnd && deadlineDate <= next7Days && task.status !== "Completed";
    }).length;

    // 5. Active Projects Pulse (with task completions)
    // To calculate progress, we fetch task counts per project
    const projectPulses = await Promise.all(
      activeProjects.map(async (project) => {
        const projectTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.projectId, project.id));
        
        const total = projectTasks.length;
        const completed = projectTasks.filter(t => t.status === "Completed").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          progress,
          completedTasks: completed,
          remainingTasks: total - completed,
          totalTasks: total,
        };
      })
    );

    // 6. Today's Priorities (Sort: High > Medium > Low, limit to 5 items)
    const prioritiesList = [...tasksToday]
      .filter(t => t.status !== "Completed")
      .sort((a, b) => {
        const priorityWeight = { "High": 3, "Medium": 2, "Low": 1 };
        const weightA = priorityWeight[a.priority as "High" | "Medium" | "Low"] || 1;
        const weightB = priorityWeight[b.priority as "High" | "Medium" | "Low"] || 1;
        if (weightA !== weightB) return weightB - weightA; // Higher weight first
        
        // Sort by deadline secondary
        const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return timeA - timeB;
      })
      .slice(0, 5);

    // 7. Active Focus Session
    const activeFocusSession = await db
      .select()
      .from(timeTracking)
      .where(
        and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.workspaceId, workspaceId),
          isNull(timeTracking.endTime)
        )
      )
      .limit(1);

    let activeFocus = null;
    if (activeFocusSession.length > 0) {
      const session = activeFocusSession[0];
      let task = null;
      let project = null;
      if (session.taskId) {
        const taskRecords = await db.select().from(tasks).where(eq(tasks.id, session.taskId)).limit(1);
        if (taskRecords.length > 0) {
          task = taskRecords[0];
          if (task.projectId) {
            const projectRecords = await db.select().from(projects).where(eq(projects.id, task.projectId)).limit(1);
            if (projectRecords.length > 0) {
              project = projectRecords[0];
            }
          }
        }
      }
      activeFocus = {
        ...session,
        task,
        project,
      };
    }

    // 8. Upcoming Items (Tasks, reminders, etc., in next 7 days)
    const upcomingItems = allUserTasks
      .filter(task => {
        if (!task.deadline) return false;
        const deadlineDate = new Date(task.deadline);
        return deadlineDate >= todayStart && deadlineDate <= next7Days;
      })
      .map(task => ({
        id: task.id,
        type: "task_deadline",
        title: task.title,
        time: task.deadline,
        status: task.status,
      }))
      .sort((a, b) => new Date(a.time!).getTime() - new Date(b.time!).getTime())
      .slice(0, 5);

    // 9. Active Goals
    const activeGoals = await db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.workspaceId, workspaceId),
          eq(goals.userId, userId),
          eq(goals.status, "Active")
        )
      );

    // 10. Recent Activity (Audit logs)
    const recentLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.workspaceId, workspaceId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);

    // Format logs
    const recentActivity = recentLogs.map(log => ({
      id: log.id,
      eventType: log.eventType,
      details: log.details,
      createdAt: log.createdAt,
    }));

    // 11. Unread Notifications count
    const unreadNotificationsList = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.isRead, false)
        )
      );

    // 12. Today's Work Graph (Hourly work completions and focus logs)
    // Generate data points for today: 24 hours
    // We sum up tasks completed at each hour and focus minutes spent at each hour
    const hourlyGraphData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i === 0 ? 12 : i > 12 ? i - 12 : i} ${i >= 12 ? "PM" : "AM"}`,
      completedTasks: 0,
      focusMinutes: 0,
    }));

    // Fetch all audit logs of TASK_STATUS_UPDATE to Completed today
    const taskCompletionsToday = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.workspaceId, workspaceId),
          eq(auditLogs.userId, userId),
          eq(auditLogs.eventType, "TASK_STATUS_UPDATE"),
          gte(auditLogs.createdAt, todayStart),
          lte(auditLogs.createdAt, todayEnd)
        )
      );

    taskCompletionsToday.forEach(log => {
      if (log.details?.includes("Completed") || log.details?.includes("status changed to Completed")) {
        const hour = new Date(log.createdAt).getHours();
        hourlyGraphData[hour].completedTasks += 1;
      }
    });

    // Populate focus minutes by hourly buckets
    focusSessionsToday.forEach(session => {
      const start = new Date(session.startTime);
      const end = session.endTime ? new Date(session.endTime) : new Date();
      
      const startHour = start.getHours();
      const endHour = end.getHours();
      
      if (startHour === endHour) {
        const minutes = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
        hourlyGraphData[startHour].focusMinutes += minutes;
      } else {
        // Session spans across hours
        // Start hour chunk
        const startHourEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate(), startHour, 59, 59, 999);
        const startMinutes = Math.max(0, Math.floor((startHourEnd.getTime() - start.getTime()) / 60000));
        hourlyGraphData[startHour].focusMinutes += startMinutes;

        // End hour chunk
        const endHourStart = new Date(end.getFullYear(), end.getMonth(), end.getDate(), endHour, 0, 0, 0);
        const endMinutes = Math.max(0, Math.floor((end.getTime() - endHourStart.getTime()) / 60000));
        hourlyGraphData[endHour].focusMinutes += endMinutes;

        // Middle hours
        for (let h = startHour + 1; h < endHour; h++) {
          hourlyGraphData[h].focusMinutes += 60;
        }
      }
    });

    return res.json({
      success: true,
      data: {
        greetingName: userProfile?.displayName || userProfile?.name || "Member",
        kpis: {
          tasksToday: tasksToday.length,
          completedTasksToday: completedTasksToday.length,
          remainingTasksToday: remainingTasksToday.length,
          focusSecondsToday: totalFocusSecondsToday,
          focusSecondsYesterday: totalFocusSecondsYesterday,
          activeProjectsCount: activeProjects.length,
          upcomingDeadlinesCount: upcomingTasksCount,
          todayProgressPercent,
        },
        priorities: prioritiesList,
        activeFocus,
        upcoming: upcomingItems,
        projects: projectPulses,
        goals: activeGoals,
        activity: recentActivity,
        unreadNotificationsCount: unreadNotificationsList.length,
        graphData: hourlyGraphData,
      },
    });
  } catch (error: any) {
    logger.error("Dashboard Fetch Error: " + error.message);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
