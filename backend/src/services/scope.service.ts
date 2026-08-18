import { db } from "../../database/client";
import { users, projects, projectAssignments, workspaceMembers } from "../../database/schema";
import { eq, and, inArray } from "drizzle-orm";

export interface UserScope {
  role: "CEO" | "CO-CEO" | "MEMBER";
  userId: string;
  workspaceId: string;
  managedUserIds: string[];
  authorizedProjectIds: string[];
}

export async function resolveUserScope(req: any): Promise<UserScope> {
  const user = req.user;
  const userId = user?.id;
  const role = (user?.role || "MEMBER").toUpperCase() as "CEO" | "CO-CEO" | "MEMBER";
  const workspaceId = req.workspaceId || "default-workspace";

  if (role === "CEO") {
    // CEO has full workspace access
    const allMembers = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    const allProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));

    return {
      role: "CEO",
      userId,
      workspaceId,
      managedUserIds: allMembers.map((m: any) => m.userId).filter(Boolean),
      authorizedProjectIds: allProjects.map((p: any) => p.id).filter(Boolean),
    };
  }

  if (role === "CO-CEO") {
    // CO-CEO manages ONLY members where managerId === userId, plus self
    const managedMembers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.managerId, userId), eq(users.role, "MEMBER")));

    const managedUserIds = Array.from(
      new Set([userId, ...managedMembers.map((m: any) => m.id)]),
    );

    // Authorized projects: owned by CO-CEO OR where CO-CEO or managed members participate
    const ownedProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.workspaceId, workspaceId), eq(projects.ownerId, userId)),
      );

    const assignedProjects = await db
      .select({ projectId: projectAssignments.projectId })
      .from(projectAssignments)
      .where(inArray(projectAssignments.assignedToUserId, managedUserIds));

    const authorizedProjectIds = Array.from(
      new Set([
        ...ownedProjects.map((p: any) => p.id),
        ...assignedProjects.map((p: any) => p.projectId),
      ]),
    ).filter(Boolean);

    return {
      role: "CO-CEO",
      userId,
      workspaceId,
      managedUserIds,
      authorizedProjectIds,
    };
  }

  // MEMBER scope: self only
  const memberProjects = await db
    .select({ projectId: projectAssignments.projectId })
    .from(projectAssignments)
    .where(eq(projectAssignments.assignedToUserId, userId));

  return {
    role: "MEMBER",
    userId,
    workspaceId,
    managedUserIds: [userId],
    authorizedProjectIds: memberProjects.map((p: any) => p.projectId).filter(Boolean),
  };
}
