import { db } from "./database/client";
import { users, workspaces, workspaceMembers } from "./database/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const ceoUsers = await db.select().from(users).where(eq(users.role, 'CEO'));
    
    if (ceoUsers.length === 0) {
      console.log("No CEO users found.");
      process.exit(1);
    }

    const ceo = ceoUsers[0];
    console.log("Found CEO:", ceo.email);

    // Reset user status to 'Seeded' so they go through OTP -> Profile -> Org setup again
    await db.update(users).set({ 
      status: "Seeded", 
      displayName: null,
      timezone: "UTC",
      language: "en",
      batchNumber: null,
      passwordHash: null
    }).where(eq(users.id, ceo.id));

    // Delete associated workspace members and workspaces to clean slate
    const memberships = await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, ceo.id));
    for (const membership of memberships) {
      await db.delete(workspaceMembers).where(eq(workspaceMembers.id, membership.id));
      await db.delete(workspaces).where(eq(workspaces.id, membership.workspaceId));
    }

    console.log("Successfully reseeded CEO user:", ceo.email);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
