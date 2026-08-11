import axios from "axios";
import jwt from "jsonwebtoken";
import { formatEnumLabel } from "../../apps/web/lib/utils/formatters.ts";
import { env } from "../config/env.config";

async function testCompleteV2System() {
  console.log("=== 1. TESTING CANONICAL ENUM LABEL FORMATTER ===");
  const testCases = [
    { in: "UNDER_REVIEW", expected: "Under Review" },
    { in: "IN_PROGRESS", expected: "In Progress" },
    { in: "CHANGES_REQUESTED", expected: "Changes Requested" },
    { in: "STAGE_01_ACTIVATION", expected: "Stage 01 Activation" },
    { in: undefined, expected: "Unknown" },
    { in: null, expected: "Unknown" },
  ];

  for (const tc of testCases) {
    const res = formatEnumLabel(tc.in);
    console.log(`Input: ${tc.in} -> Result: "${res}" | Pass: ${res === tc.expected}`);
    if (res !== tc.expected) {
      throw new Error(`Formatter failed for ${tc.in}: expected "${tc.expected}", got "${res}"`);
    }
  }

  console.log("\n=== 2. CREATING NEW V2 ORGANIZATION PROJECT ===");
  const baseURL = "http://localhost:4100/api";
  const realCeoId = "840745f0-eebc-4444-99fc-14b39598e3af";
  const token = jwt.sign(
    { id: realCeoId, email: "saikrishnanmk1603@gmail.com", role: "CEO" },
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

  const createRes = await client.post("/org/projects/create-v2", {
    title: "V2 System Error Audit Verification Project",
    description: "Automated test project to verify 7 milestones initialization & data contract integrity.",
    prompt: "Build an executive project management workspace with 7 milestone stages and automated status verification.",
    assignedToUserId: realCeoId,
    assignmentType: "CEO_TO_CO_CEO",
  });

  console.log("Create Project status:", createRes.status);
  const createdProject = createRes.data?.data?.project;
  console.log(`Created Project ID: ${createdProject?.id}, Title: "${createdProject?.name}"`);

  if (!createdProject?.id) {
    throw new Error("Failed to create verification project!");
  }

  console.log("\n=== 3. FETCHING PROJECT DETAILS VIA GET /org/projects/:id ===");
  const detailsRes = await client.get(`/org/projects/${createdProject.id}`);
  console.log("GET Project Details status:", detailsRes.status);

  const projData = detailsRes.data?.data;
  console.log(`Fetched project "${projData.name}" with ${projData.milestones?.length} milestones.`);

  let stage1Available = false;
  let allHaveValidState = true;

  projData.milestones.forEach((m: any) => {
    console.log(`  Stage ${m.stageNumber} (${m.milestoneCode}): state="${m.state}", status="${m.status}"`);
    if (m.state === undefined || m.status === undefined) {
      allHaveValidState = false;
    }
    if (m.stageNumber === 1 && m.state === "AVAILABLE") {
      stage1Available = true;
    }
  });

  console.log("\n=== 4. CONTRACT INTEGRITY CHECK ===");
  console.log("All milestones have defined state & status:", allHaveValidState);
  console.log("Stage 1 is AVAILABLE:", stage1Available);

  if (!allHaveValidState) {
    throw new Error("Data contract check failed: some milestones have undefined state/status!");
  }
  if (!stage1Available) {
    throw new Error("Stage 1 milestone was not initialized as AVAILABLE!");
  }

  console.log("\n✅ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  process.exit(0);
}

testCompleteV2System().catch((err) => {
  console.error("Test failed:", err.response?.data || err.message);
  process.exit(1);
});
