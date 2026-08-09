import { db } from "../database/client";
import { users, workspaces, workspaceMembers } from "../database/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { AuthService } from "../src/services/auth.service";

async function seed() {
  console.log("🌱 Starting database seeding...");

  const ceoEmail = "saikrishnanmk1603@gmail.com";
  
  // 1. Check if user already exists
  const existingUser = await db.select().from(users).where(eq(users.email, ceoEmail)).limit(1);
  
  let userId = "";

  if (existingUser.length > 0) {
    console.log(`✅ CEO account already exists: ${ceoEmail}`);
    userId = existingUser[0].id;
    // update it
    await db.update(users).set({
      name: "MM1107",
      role: "CEO",
      status: "Seeded",
      isVerified: true,
      isOtpEnabled: true,
      isGoogleEnabled: false, // Prompt says google is disabled until first activation
      passwordHash: AuthService.hashPassword("welcome@123"),
    }).where(eq(users.email, ceoEmail));
  } else {
    // Create CEO User
    userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      email: ceoEmail,
      name: "MM1107",
      role: "CEO",
      status: "Seeded",
      isVerified: true,
      isGoogleEnabled: false,
      isOtpEnabled: true,
      isInvited: false,
      systemOwner: true,
      passwordHash: AuthService.hashPassword("welcome@123"),
    });
    console.log(`✅ Created CEO account: ${ceoEmail}`);
  }

  // 2. Create Personal Workspace instead of Org
  const workspaceName = "Personal Workspace";
  const existingWorkspace = await db.select()
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (existingWorkspace.length > 0) {
    console.log(`✅ Workspace already exists.`);
  } else {
    const workspaceId = randomUUID();
    await db.insert(workspaces).values({
      id: workspaceId,
      name: workspaceName,
      type: "personal",
    });
    console.log(`✅ Created Workspace: ${workspaceName}`);
    
    await db.insert(workspaceMembers).values({
      id: randomUUID(),
      workspaceId,
      userId,
      role: "CEO",
    });
    console.log(`✅ Mapped CEO to workspace ${workspaceName}.`);
  }

  console.log("🎉 Seeding complete.");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seeding failed:");
  console.error(error);
  process.exit(1);
});
