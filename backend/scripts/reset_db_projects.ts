import { db } from "../database/client";
import { projects, tasks, milestones, projectAssignments, projectDocuments, projectRequirements, projectFeatures } from "../database/schema";

async function resetProjects() {
  console.log("Cleaning up all synthetic demo projects from PostgreSQL database...");
  try {
    await db.delete(tasks);
    await db.delete(milestones);
    await db.delete(projectAssignments);
    await db.delete(projectDocuments);
    await db.delete(projectRequirements);
    await db.delete(projectFeatures);
    const result = await db.delete(projects);
    console.log("Database projects successfully reset to [] (Clean empty state).");
  } catch (err) {
    console.error("Database reset error:", err);
  } finally {
    process.exit(0);
  }
}

resetProjects();
