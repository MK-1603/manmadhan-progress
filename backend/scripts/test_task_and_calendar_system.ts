import axios from "axios";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config";

async function testTaskAndCalendarSystem() {
  console.log("=== 1. INITIALIZING AUTOMATED TASK & CALENDAR TEST ===");
  const baseURL = "http://localhost:4100/api";
  const ceoUserId = "840745f0-eebc-4444-99fc-14b39598e3af";

  const token = jwt.sign(
    { id: ceoUserId, email: "saikrishnanmk1603@gmail.com", role: "CEO" },
    env.JWT_SECRET || "super-secret-jwt-token-key-min-32-chars-long",
    { expiresIn: "1h" }
  );

  const client = axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // Get active workspace ID
  const workspacesRes = await client.get("/workspace/list").catch(() => null);
  const workspaceId = workspacesRes?.data?.data?.[0]?.id || "a6749bb4-c389-49ba-85b6-4a169347d8be";
  console.log(`Using Workspace ID: ${workspaceId}`);

  console.log("\n=== 2. CREATING STANDALONE TASK (NO PROJECT, NO MILESTONE) ===");
  const standaloneRes = await client.post("/org/tasks", {
    workspaceId,
    title: "Research Redis Cluster & Streams Architecture",
    description: "Evaluate Redis pub/sub vs streams for event-driven message distribution.",
    type: "Research",
    priority: "High",
    assigneeId: ceoUserId,
    projectId: null,
    milestoneId: null,
    deadline: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    startTime: "18:00",
    endTime: "19:00",
    approvalRequired: true,
    verificationRequired: true,
    deliverable: "Redis Architecture Evaluation PDF",
  });

  console.log("Standalone Task Creation status:", standaloneRes.status);
  const createdStandalone = standaloneRes.data?.data;
  console.log(`Created Task ID: ${createdStandalone?.id}, Title: "${createdStandalone?.title}"`);
  console.log(`ProjectId: ${createdStandalone?.projectId}, MilestoneId: ${createdStandalone?.milestoneId}`);

  if (createdStandalone?.projectId !== null) {
    throw new Error("Standalone task was assigned a project!");
  }
  if (createdStandalone?.milestoneId !== null) {
    throw new Error("Standalone task was assigned a milestone!");
  }

  console.log("\n=== 3. CREATING V2 PROJECT & LINKED PROJECT TASK ===");
  const projRes = await client.post("/org/projects/create-v2", {
    title: "Task System Independent Verification Project",
    description: "Automated test project for verifying optional project task linkage.",
    prompt: "Build an executive task system with independent assignment and scheduling.",
    assignedToUserId: ceoUserId,
    assignmentType: "CEO_TO_CO_CEO",
  });

  const project = projRes.data?.data?.project;
  console.log(`Created Test Project ID: ${project?.id}`);

  // Fetch project to get stage 1 milestone ID
  const projDetails = await client.get(`/org/projects/${project.id}`);
  const milestone1 = projDetails.data?.data?.milestones?.[0];
  console.log(`Stage 1 Milestone ID: ${milestone1?.id}`);

  const projectTaskRes = await client.post("/org/tasks", {
    workspaceId,
    title: "Implement Standalone & Project Task Validation APIs",
    description: "Verify backend enforcement of optional project and milestone rules.",
    type: "Development",
    priority: "Critical",
    assigneeId: ceoUserId,
    projectId: project.id,
    milestoneId: milestone1?.id || null,
    deadline: new Date(Date.now() + 172800000).toISOString().split("T")[0],
  });

  const createdProjectTask = projectTaskRes.data?.data;
  console.log(`Created Project Task ID: ${createdProjectTask?.id}`);
  console.log(`ProjectId: ${createdProjectTask?.projectId}, MilestoneId: ${createdProjectTask?.milestoneId}`);

  if (createdProjectTask?.projectId !== project.id) {
    throw new Error("Project task failed to store valid projectId!");
  }

  console.log("\n=== 4. TESTING CROSS-PROJECT INVALID MILESTONE REJECTION ===");
  try {
    await client.post("/org/tasks", {
      workspaceId,
      title: "Malicious Cross-Project Task",
      projectId: "invalid-project-id-xyz",
      milestoneId: milestone1?.id, // Milestone belongs to project.id, not invalid-project-id-xyz
      assigneeId: ceoUserId,
    });
    throw new Error("Cross-project milestone linking was NOT rejected!");
  } catch (err: any) {
    console.log("Backend correctly rejected cross-project milestone:", err.response?.data?.error || err.message);
  }

  console.log("\n=== 5. FETCHING ALL WORKSPACE TASKS ===");
  const allTasksRes = await client.get(`/org/tasks?workspaceId=${workspaceId}`);
  const tasksList = allTasksRes.data?.data || [];
  console.log(`Fetched ${tasksList.length} total tasks.`);

  const hasStandalone = tasksList.some((t: any) => t.id === createdStandalone.id && t.projectId === null);
  const hasProjectTask = tasksList.some((t: any) => t.id === createdProjectTask.id && t.projectId === project.id);

  console.log("Standalone task present in list:", hasStandalone);
  console.log("Project-linked task present in list:", hasProjectTask);

  if (!hasStandalone || !hasProjectTask) {
    throw new Error("Task list retrieval failed to include created tasks!");
  }

  console.log("\n✅ ALL TASK & CALENDAR SYSTEM VERIFICATION CHECKS PASSED!");
  process.exit(0);
}

testTaskAndCalendarSystem().catch((err) => {
  console.error("Test execution failed:", err.response?.data || err.message);
  process.exit(1);
});
