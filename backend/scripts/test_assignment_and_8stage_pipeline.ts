import { db } from "../database/client";
import { users, workspaceMembers, projects, tasks, taskAssignmentTracker } from "../database/schema";
import { eq, desc } from "drizzle-orm";
import axios from "axios";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config";

const API_BASE = "http://localhost:4100/api";

async function runVerification() {
  console.log("=== 1. INITIALIZING TASK ASSIGNMENT & 8-STAGE PIPELINE TEST ===");

  // 1. Get real workspace and user tokens/IDs
  const [member] = await db.select().from(workspaceMembers).limit(1);
  if (!member) {
    console.error("No workspace member found for verification test");
    process.exit(1);
  }
  const workspaceId = member.workspaceId;

  const allMembers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.displayName,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  console.log(`Using Workspace ID: ${workspaceId} with ${allMembers.length} members`);

  const ceoUser = allMembers.find((m) => m.role === "CEO") || allMembers[0];
  const targetAssignee = allMembers.find((m) => m.id !== ceoUser.id) || allMembers[0];

  console.log(`Creator (CEO): ${ceoUser.name} (${ceoUser.role}) [ID: ${ceoUser.id}]`);
  console.log(`Assignee: ${targetAssignee.name} (${targetAssignee.role}) [ID: ${targetAssignee.id}]`);

  const jwtSecret = env.JWT_SECRET || "super-secret-jwt-token-key-min-32-chars-long";
  const ceoToken = jwt.sign({ id: ceoUser.id, email: ceoUser.email, role: "CEO" }, jwtSecret, { expiresIn: "1h" });
  const assigneeToken = jwt.sign({ id: targetAssignee.id, email: targetAssignee.email, role: targetAssignee.role }, jwtSecret, { expiresIn: "1h" });

  const ceoClient = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${ceoToken}`, "Content-Type": "application/json" },
  });

  const assigneeClient = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${assigneeToken}`, "Content-Type": "application/json" },
  });

  // ─── 2. TEST TASK CREATION WITH ASSIGNMENT (PENDING_ACCEPTANCE) ─────────
  console.log("\n=== 2. CREATING TASK ASSIGNED TO USER ===");
  const createRes = await ceoClient.post(`/org/tasks?workspaceId=${workspaceId}`, {
    title: "Prepare Architecture Review for 8-Stage Pipeline",
    description: "Review system architecture and test acceptance workflow",
    assigneeId: targetAssignee.id,
    priority: "High",
    type: "Review",
    deadline: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
  });

  console.log("Task Creation Status:", createRes.status);
  const createdTask = createRes.data?.data;
  console.log(`Created Task ID: ${createdTask?.id}`);
  console.log(`Task Initial Status: "${createdTask?.status}" (Expected: "PENDING_ACCEPTANCE")`);

  if (createdTask?.status !== "PENDING_ACCEPTANCE") {
    throw new Error(`Expected initial status PENDING_ACCEPTANCE but got "${createdTask?.status}"`);
  }

  // Verify taskAssignmentTracker record was inserted
  const [tracker] = await db
    .select()
    .from(taskAssignmentTracker)
    .where(eq(taskAssignmentTracker.taskId, createdTask.id))
    .orderBy(desc(taskAssignmentTracker.createdAt))
    .limit(1);

  console.log(`Tracker record present: ${Boolean(tracker)}`);
  console.log(`Tracker status: "${tracker?.status}" | Assignee Role: "${tracker?.assigneeRole}"`);

  // ─── 3. TEST GET TASK ASSIGNMENT DETAILS ─────────
  console.log("\n=== 3. FETCHING TASK ASSIGNMENT DETAILS ===");
  const getAssignRes = await ceoClient.get(`/org/tasks/${createdTask.id}/assignment?workspaceId=${workspaceId}`);
  console.log("GET Assignment Status:", getAssignRes.status);
  const assignData = getAssignRes.data?.data;
  console.log(`Fetched Assignment Status: "${assignData?.assignmentStatus}"`);
  console.log(`Assignee Name: "${assignData?.assignee?.name}" | Role: "${assignData?.assignee?.role}"`);
  console.log(`Assigner Name: "${assignData?.assigner?.name}" | Role: "${assignData?.assigner?.role}"`);

  // ─── 4. TEST ACCEPTING TASK ASSIGNMENT ─────────
  console.log("\n=== 4. ACCEPTING TASK ASSIGNMENT ===");
  const acceptRes = await assigneeClient.post(`/org/tasks/${createdTask.id}/assignment/accept?workspaceId=${workspaceId}`);
  console.log("Accept Response Status:", acceptRes.status);
  console.log("Accepted Task New Status:", acceptRes.data?.data?.status);

  if (acceptRes.data?.data?.status !== "ACCEPTED") {
    throw new Error(`Expected status ACCEPTED after accept but got "${acceptRes.data?.data?.status}"`);
  }

  // ─── 5. TEST CREATING AND DECLINING A TASK ─────────
  console.log("\n=== 5. CREATING AND DECLINING TASK ASSIGNMENT ===");
  const task2Res = await ceoClient.post(`/org/tasks?workspaceId=${workspaceId}`, {
    title: "Legacy Feature Maintenance Task",
    description: "Perform bug fixes on deprecated modules",
    assigneeId: targetAssignee.id,
    priority: "Low",
  });

  const task2 = task2Res.data?.data;
  console.log(`Task 2 Created: ${task2?.id} | Status: "${task2?.status}"`);

  const declineRes = await assigneeClient.post(`/org/tasks/${task2.id}/assignment/decline?workspaceId=${workspaceId}`, {
    reason: "Currently assigned to Stage 8 implementation sprint and cannot take legacy maintenance.",
  });

  console.log("Decline Response Status:", declineRes.status);
  console.log("Declined Task New Status:", declineRes.data?.data?.status);

  if (declineRes.data?.data?.status !== "DECLINED") {
    throw new Error(`Expected status DECLINED after decline but got "${declineRes.data?.data?.status}"`);
  }

  // ─── 6. TEST 8-STAGE MANDATORY MILESTONE PIPELINE ─────────
  console.log("\n=== 6. VERIFYING 8-STAGE MANDATORY MILESTONE PROJECT CREATION ===");
  const projRes = await ceoClient.post(`/org/projects/create-v2?workspaceId=${workspaceId}`, {
    title: "8-Stage Mandatory Pipeline Verification Project",
    description: "Automated test project for verifying 8 mandatory stages",
    assignedToUserId: targetAssignee.id,
    assignmentType: "CEO_TO_CO_CEO",
    prompt: "Build a project pipeline with 8 mandatory milestones",
  });

  console.log("Project Creation Status:", projRes.status);
  const createdProj = projRes.data?.data?.project;
  console.log(`Created Project ID: ${createdProj?.id}`);

  // Fetch project details to verify 8 milestones
  const projDetailRes = await ceoClient.get(`/org/projects/${createdProj.id}?workspaceId=${workspaceId}`);

  const milestonesList = projDetailRes.data?.data?.milestones || [];
  console.log(`Fetched ${milestonesList.length} milestones for project.`);

  if (milestonesList.length !== 8) {
    throw new Error(`Expected 8 mandatory milestones, but got ${milestonesList.length}`);
  }

  console.log("Milestones Pipeline Verification:");
  milestonesList.forEach((m: any) => {
    console.log(`  Stage ${m.stageNumber} (${m.milestoneCode}): name="${m.name}" | state="${m.state || m.status}"`);
  });

  const stage1 = milestonesList.find((m: any) => m.stageNumber === 1);
  const stage8 = milestonesList.find((m: any) => m.stageNumber === 8);

  console.log(`Stage 1 is AVAILABLE: ${stage1?.state === "AVAILABLE"}`);
  console.log(`Stage 8 is LOCKED: ${stage8?.state === "LOCKED"}`);

  if (stage1?.state !== "AVAILABLE" || stage8?.state !== "LOCKED") {
    throw new Error("Milestone initial states invalid: Stage 1 must be AVAILABLE and Stage 8 must be LOCKED");
  }

  console.log("\n✅ ALL TASK ASSIGNMENT WORKFLOW & 8-STAGE PIPELINE VERIFICATION CHECKS PASSED!");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("❌ Verification Failed:", err.response?.data || err.message || err);
  process.exit(1);
});
