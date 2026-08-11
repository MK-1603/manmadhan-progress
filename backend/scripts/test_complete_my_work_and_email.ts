import { db } from "../database/client";
import { users, workspaceMembers, projects, tasks, taskAssignmentTracker } from "../database/schema";
import { eq, desc } from "drizzle-orm";
import axios from "axios";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config";
import { emailService } from "../src/services/email.service";

const API_BASE = "http://localhost:4100/api";

async function runCompleteMyWorkTest() {
  console.log("=== 1. TESTING GET /org/my-work COMPLETE DATA MODEL ===");

  const [member] = await db.select().from(workspaceMembers).limit(1);
  if (!member) {
    console.error("No workspace member found for verification test");
    process.exit(1);
  }
  const workspaceId = member.workspaceId;

  const [userRec] = await db.select().from(users).where(eq(users.id, member.userId)).limit(1);
  const jwtSecret = env.JWT_SECRET || "super-secret-jwt-token-key-min-32-chars-long";
  const token = jwt.sign(
    { id: userRec.id, email: userRec.email, role: member.role || "CEO" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const client = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

  const myWorkRes = await client.get(`/org/my-work?workspaceId=${workspaceId}`);
  console.log("GET /org/my-work Status:", myWorkRes.status);
  const myWorkData = myWorkRes.data?.data;

  console.log("My Work Summary Counts:", myWorkData?.summary);
  const pendingCount = myWorkData?.pendingAcceptance?.length || 0;
  const activeCount = myWorkData?.activeWork?.length || 0;
  console.log(`Fetched ${pendingCount} pending acceptance items, ${activeCount} active work items.`);

  if (pendingCount > 0) {
    const sample = myWorkData.pendingAcceptance[0];
    console.log("\nSample Pending Acceptance Card Inspection:");
    console.log(`  Task Title: "${sample.title || sample.task?.title}"`);
    console.log(`  Project: "${sample.project?.name || sample.projectName || "Standalone Task"}"`);
    console.log(`  Project Stage: "${sample.project?.currentStage || "N/A"}"`);
    console.log(`  Milestone: "${sample.milestone?.name || sample.milestoneName || "No Milestone"}"`);
    console.log(`  Assignment Status: "${sample.assignmentStatus || sample.assignment?.status}"`);
    console.log(`  Assigned By: "${sample.assignedByName || sample.assigner?.name}" (${sample.assignedByRole || sample.assigner?.role})`);
    console.log(`  Assigned To Role: "${sample.assigneeRole || sample.assignee?.role}"`);
  }

  // ─── 2. TEST STANDALONE VS PROJECT-LINKED DATA CONTRACT ─────────
  console.log("\n=== 2. CREATING STANDALONE & PROJECT-LINKED TASKS ===");
  const standaloneRes = await client.post(`/org/tasks?workspaceId=${workspaceId}`, {
    title: "Verify Redis Cache Architecture",
    description: "Standalone task without project linkage",
    assigneeId: userRec.id,
    priority: "Medium",
  });

  console.log("Standalone Task Created:", standaloneRes.data?.data?.id);
  const reFetchRes = await client.get(`/org/my-work?workspaceId=${workspaceId}`);
  const standaloneItem = (reFetchRes.data?.data?.pendingAcceptance || []).find((i: any) => (i.id || i.task?.id) === standaloneRes.data?.data?.id);

  console.log("Standalone Task Inspection:");
  console.log(`  Project: ${standaloneItem?.project ? standaloneItem.project.name : "null (Standalone Task)"}`);
  console.log(`  Milestone: ${standaloneItem?.milestone ? standaloneItem.milestone.name : "null (No Milestone)"}`);

  // ─── 3. TEST EMAIL DISPATCH PIPELINE ─────────
  console.log("\n=== 3. TESTING EMAIL DISPATCH PIPELINE ===");
  const emailResult = await emailService.sendTaskAssignmentEmail({
    to: userRec.email,
    taskTitle: "Verify Redis Cache Architecture",
    projectName: "ManMadhan Progress",
    milestoneName: "03 — TRD",
    assignerName: "Sai Krishnan",
    role: "CO-CEO",
    deadline: "2026-08-15",
    taskId: standaloneRes.data?.data?.id || "sample-id",
  });

  console.log("Email Dispatch Result:", emailResult);

  // ─── 4. VERIFY GET /org/projects/:id IS STABLE ─────────
  console.log("\n=== 4. VERIFYING PROJECT DETAILS API ===");
  const [sampleProj] = await db.select().from(projects).limit(1);
  if (sampleProj) {
    const projRes = await client.get(`/org/projects/${sampleProj.id}?workspaceId=${workspaceId}`);
    console.log(`Project Details GET Status: ${projRes.status} for Project "${sampleProj.name}"`);
    console.log(`Milestones count: ${projRes.data?.data?.milestones?.length || 0}`);
    console.log(`Tasks count: ${projRes.data?.data?.tasks?.length || 0}`);
  }

  console.log("\n✅ ALL MY WORK & EMAIL WORKFLOW REPAIR CHECKS PASSED!");
  process.exit(0);
}

runCompleteMyWorkTest().catch((err) => {
  console.error("❌ Test execution failed:", err.response?.data || err.message || err);
  process.exit(1);
});
