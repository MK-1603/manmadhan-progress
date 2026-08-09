import { db } from "../../database/client";
import { tasks, leaderboardCache, workspaces } from "../../database/schema";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logger } from "./logger.service";

export class ScoringService {
  /**
   * Recalculate leaderboard stats for a user after a task state change.
   * We calculate AllTime stats dynamically to ensure consistency, then upsert to leaderboard_cache.
   * Uses `submittedAt` instead of `completedAt` to avoid penalizing users for reviewer delays.
   */
  static async updateLeaderboardForUser(workspaceId: string, userId: string) {
    try {
      const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
      if (ws?.type === "personal") {
        return; // Personal workspaces do not participate in organizational leaderboards
      }

      // Fetch all tasks for the user in this workspace
      const allTasks = await db.select().from(tasks).where(
        and(
          eq(tasks.workspaceId, workspaceId),
          eq(tasks.assigneeId, userId)
        )
      );

      let totalScore = 0;
      let tasksCompleted = 0;
      let onTimeCount = 0;

      for (const t of allTasks) {
        if (t.status === "Completed" || t.status === "Approved") {
          tasksCompleted++;
          
          // Base score for completion
          let taskScore = 10;
          
          // Use submittedAt if available (to not penalize for review delay), fallback to completedAt, then approvedAt
          const effectiveCompletionTime = t.submittedAt || t.completedAt || t.approvedAt;
          
          if (t.deadline && effectiveCompletionTime) {
            const deadlineDate = new Date(t.deadline);
            const completionDate = new Date(effectiveCompletionTime);
            
            if (completionDate <= deadlineDate) {
              onTimeCount++;
              taskScore += 5; // Bonus for on time
            }
          } else if (!t.deadline) {
            // Tasks without deadlines count as on time
            onTimeCount++;
          }
          
          // Difficulty/priority multiplier
          if (t.priority === "High") taskScore += 5;
          if (t.priority === "Low") taskScore -= 2;

          totalScore += Math.max(0, taskScore);
        }
      }

      const onTimeDeliveryRate = tasksCompleted > 0 
        ? Math.round((onTimeCount / tasksCompleted) * 100) 
        : 0;

      // Upsert into leaderboard_cache (AllTime)
      const existing = await db.select().from(leaderboardCache).where(
        and(
          eq(leaderboardCache.workspaceId, workspaceId),
          eq(leaderboardCache.userId, userId),
          eq(leaderboardCache.period, "AllTime")
        )
      ).limit(1);

      if (existing.length > 0) {
        await db.update(leaderboardCache).set({
          score: totalScore,
          tasksCompleted,
          onTimeDeliveryRate,
          updatedAt: new Date()
        }).where(eq(leaderboardCache.id, existing[0].id));
      } else {
        await db.insert(leaderboardCache).values({
          id: uuidv4(),
          workspaceId,
          userId,
          period: "AllTime",
          score: totalScore,
          tasksCompleted,
          onTimeDeliveryRate,
          updatedAt: new Date()
        });
      }

      // Re-calculate ranks for all users in the workspace
      const allCached = await db.select().from(leaderboardCache).where(
        and(
          eq(leaderboardCache.workspaceId, workspaceId),
          eq(leaderboardCache.period, "AllTime")
        )
      ).orderBy(sql`${leaderboardCache.score} DESC`);

      let currentRank = 1;
      for (const cacheRec of allCached) {
        await db.update(leaderboardCache).set({ rank: currentRank }).where(eq(leaderboardCache.id, cacheRec.id));
        currentRank++;
      }

    } catch (error: any) {
      logger.error("ScoringService Error: " + error.message);
    }
  }
}
