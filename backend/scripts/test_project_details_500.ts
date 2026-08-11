import { db } from "../database/client";
import { projects } from "../database/schema";
import axios from "axios";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config";

const API_BASE = "http://localhost:4100/api";

async function testProjectDetails() {
  console.log("=== TESTING GET /org/projects/:id FOR ALL PROJECTS ===");
  const allProjects = await db.select().from(projects);
  console.log(`Found ${allProjects.length} projects in database.`);

  const jwtSecret = env.JWT_SECRET || "super-secret-jwt-token-key-min-32-chars-long";
  const token = jwt.sign(
    { id: "840745f0-eebc-4444-99fc-14b39598e3af", email: "saikrishnanmk1603@gmail.com", role: "CEO" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const client = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

  for (const p of allProjects) {
    try {
      const res = await client.get(`/org/projects/${p.id}?workspaceId=${p.workspaceId}`);
      console.log(`✅ Project ${p.id} (${p.title || p.name}): Status ${res.status}`);
    } catch (err: any) {
      console.error(`❌ Project ${p.id} (${p.title || p.name}) FAILED:`, err.response?.status, err.response?.data || err.message);
    }
  }

  // Test non-existent UUID
  try {
    const res = await client.get(`/org/projects/9575d140-627c-401e-9e4b-a32e5cd63021?workspaceId=a6749bb4-c389-49ba-85b6-4a169347d8be`);
    console.log(`Non-existent project status: ${res.status}`);
  } catch (err: any) {
    console.log(`Non-existent project result: Status ${err.response?.status}`, err.response?.data);
  }

  process.exit(0);
}

testProjectDetails().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
