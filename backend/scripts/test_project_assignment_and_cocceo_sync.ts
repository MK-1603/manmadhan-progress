import { db } from "../database/client";
import { users, workspaceMembers, projects, projectAssignments, projectMilestonesV2 } from "../database/schema";
import { eq, and, desc } from "drizzle-orm";
import axios from "axios";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config";

const API_BASE = "http://localhost:4100/api";

async function runProjectAssignmentVerification() {
  console.log("============================================================");
  console.log("MANMADHAN PROGRESS — PROJECT ASSIGNMENT & WORKSPACE SYNC TEST");
  console.log("============================================================");

  const [member] = await db.select().from(workspaceMembers).limit(1);
  if (!member) {
    console.error("No workspace member found");
    process.exit(1);
  }
  const workspaceId = member.workspaceId;

  const [ceoUser] = await db.select().from(users).where(eq(users.id, member.userId)).limit(1);
  const jwtSecret = env.JWT_SECRET || "super-secret-jwt-token-key-min-32-chars-long";

  const ceoToken = jwt.sign(
    { id: ceoUser.id, email: ceoUser.email, role: "CEO" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const ceoClient = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${ceoToken}`, "Content-Type": "application/json" },
  });

  // 1. CREATE V2 PROJECT ASSIGNED TO USER
  console.log("\n1. CREATING V2 PROJECT ASSIGNED TO USER...");
  try {
    const createRes = await ceoClient.post("/org/projects/create-v2", {
      workspaceId,
      title: "CO-CEO Canonical Project Assignment Sync Project",
      description: "Testing canonical project assignment tracking and CO-CEO workspace synchronization",
      prompt: "Build enterprise canonical project assignment system with real-time UI sync",
      assignedToUserId: ceoUser.id,
      assignmentType: "CEO_TO_CO_CEO",
    });

    console.log("Create V2 Status:", createRes.status);
    const projectId = createRes.data?.data?.project?.id;
    console.log("Created Project ID:", projectId);

    // 2. VERIFY CANONICAL PROJECT ASSIGNMENT RECORD IN DB
    const [assignmentRecord] = await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, projectId))
      .orderBy(desc(projectAssignments.createdAt))
      .limit(1);

    console.log("\n2. CANONICAL PROJECT ASSIGNMENT RECORD:");
    console.log("  ID:", assignmentRecord?.id);
    console.log("  Status:", assignmentRecord?.status);
    console.log("  Assigned To:", assignmentRecord?.assignedToUserId);
    console.log("  Created By:", assignmentRecord?.createdByUserId);

    if (assignmentRecord?.status !== "PENDING_ACCEPTANCE") {
      throw new Error(`Expected PENDING_ACCEPTANCE but got ${assignmentRecord?.status}`);
    }

    // 3. FETCH PROJECT DETAILS API & VERIFY ASSIGNMENT OBJECT
    console.log("\n3. TESTING GET /org/projects/:id (PROJECT DETAILS WITH ASSIGNMENT):");
    const projDetailsRes = await ceoClient.get(`/org/projects/${projectId}?workspaceId=${workspaceId}`);
    console.log("GET Project Details Status:", projDetailsRes.status);
    const projData = projDetailsRes.data?.data;
    console.log("Project Name:", projData?.name);
    console.log("Assignment Object Status:", projData?.assignment?.status);
    console.log("Assigned To Name:", projData?.assignment?.assignedTo?.name);

    if (!projData?.assignment) {
      throw new Error("Project details response missing canonical assignment object");
    }

    // 4. FETCH MY WORK API & VERIFY PENDING PROJECT ASSIGNMENTS
    console.log("\n4. TESTING GET /org/my-work (PENDING PROJECT ASSIGNMENTS):");
    const myWorkRes = await ceoClient.get(`/org/my-work?workspaceId=${workspaceId}`);
    console.log("GET /org/my-work Status:", myWorkRes.status);
    const pendingProjList = myWorkRes.data?.data?.pendingProjectAssignments || [];
    console.log(`Found ${pendingProjList.length} pending project assignments in My Work.`);

    const matchPending = pendingProjList.find((p: any) => p.id === projectId);
    if (!matchPending) {
      throw new Error("Created project not found in pendingProjectAssignments list");
    }
    console.log("Matched Pending Project Stage:", matchPending.currentStage);

    // 5. ACCEPT PROJECT ASSIGNMENT
    console.log("\n5. TESTING POST /org/projects/:id/assignment/accept:");
    const acceptRes = await ceoClient.post(`/org/projects/${projectId}/assignment/accept?workspaceId=${workspaceId}`);
    console.log("Accept Response Status:", acceptRes.status, acceptRes.data?.message);

    // Verify DB Status & Stage 1 Milestone State
    const [updatedAssignment] = await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.id, assignmentRecord.id))
      .limit(1);

    const [stage1Ms] = await db
      .select()
      .from(projectMilestonesV2)
      .where(and(eq(projectMilestonesV2.projectId, projectId), eq(projectMilestonesV2.stageNumber, 1)))
      .limit(1);

    console.log("Updated Assignment Status in DB:", updatedAssignment?.status);
    console.log("Stage 1 Milestone State:", stage1Ms?.state);

    if (updatedAssignment?.status !== "ACCEPTED") {
      throw new Error("Project assignment status did not transition to ACCEPTED");
    }
    if (stage1Ms?.state !== "AVAILABLE" && stage1Ms?.state !== "IN_PROGRESS") {
      throw new Error(`Stage 1 milestone state expected AVAILABLE/IN_PROGRESS but got ${stage1Ms?.state}`);
    }

    // 6. RE-FETCH MY WORK & VERIFY PROJECT MOVED TO ASSIGNED PROJECTS
    console.log("\n6. RE-TESTING GET /org/my-work AFTER ACCEPTANCE:");
    const myWorkAfterRes = await ceoClient.get(`/org/my-work?workspaceId=${workspaceId}`);
    const assignedProjList = myWorkAfterRes.data?.data?.assignedProjects || [];
    console.log(`Found ${assignedProjList.length} assigned projects in My Work.`);

    const matchAssigned = assignedProjList.find((p: any) => p.id === projectId);
    if (!matchAssigned) {
      throw new Error("Accepted project not found in assignedProjects list");
    }
    console.log("Matched Assigned Project Status:", matchAssigned.assignmentStatus);

    // 7. TEST DECLINE MANDATORY REASON VALIDATION
    console.log("\n7. TESTING DECLINE MANDATORY REASON VALIDATION:");
    try {
      await ceoClient.post(`/org/projects/${projectId}/assignment/decline?workspaceId=${workspaceId}`, { reason: "" });
      throw new Error("Decline without reason should have failed with HTTP 400");
    } catch (err: any) {
      if (err.response?.status === 400) {
        console.log("✅ Decline without reason successfully blocked with HTTP 400.");
      } else {
        throw err;
      }
    }

    console.log("\n============================================================");
    console.log("✅ ALL CANONICAL PROJECT ASSIGNMENT & WORKSPACE SYNC CHECKS PASSED!");
    console.log("============================================================");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Detailed error failure:", err.response?.data || err.cause || err);
    process.exit(1);
  }
}

runProjectAssignmentVerification();
