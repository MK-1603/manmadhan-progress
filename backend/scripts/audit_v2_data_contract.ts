import { db } from "../database/client";
import { projectMilestonesV2, milestones, projects } from "../database/schema";
import { eq } from "drizzle-orm";

async function auditDataContract() {
  console.log("=== AUDITING DATA CONTRACT & DB RECORDS ===");

  // 1. Audit V2 Milestones
  const v2Milestones = await db.select().from(projectMilestonesV2);
  console.log(`Found ${v2Milestones.length} V2 Milestones in database.`);

  let invalidV2Count = 0;
  for (const m of v2Milestones) {
    if (!m.state) {
      console.warn(`[WARN] V2 Milestone ${m.id} (Stage ${m.stageNumber}) has null/undefined state. Repairing...`);
      const newState = m.stageNumber === 1 ? "AVAILABLE" : "LOCKED";
      await db.update(projectMilestonesV2).set({ state: newState }).where(eq(projectMilestonesV2.id, m.id));
      invalidV2Count++;
    }
  }
  console.log(`Audited V2 Milestones. Repaired ${invalidV2Count} records.`);

  // 2. Audit Projects
  const allProjects = await db.select().from(projects);
  console.log(`Found ${allProjects.length} projects in database.`);
  for (const p of allProjects) {
    const pMilestones = await db.select().from(projectMilestonesV2).where(eq(projectMilestonesV2.projectId, p.id));
    console.log(`- Project "${p.name}" (${p.id}): ${pMilestones.length} V2 Milestones.`);
  }

  console.log("=== AUDIT COMPLETE ===");
  process.exit(0);
}

auditDataContract().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
