import { eq, and, sql } from "drizzle-orm";
import { db } from "../database/client";
import { users, workspaces, workspaceMembers, userSessions } from "../database/schema";
import { AuthService } from "../src/services/auth.service";
import { v4 as uuidv4 } from "uuid";

/**
 * Idempotent CEO Account & Organization Reseed Script
 * Safely reconciles CEO account hemanthmm1107@gmail.com and MM1107 organization.
 * Does NOT delete other users, organizations, or projects.
 */
async function seedCeoAccount() {
  console.log("==================================================");
  console.log("MANMADHAN PROGRESS — CEO ACCOUNT & ORG RESEED");
  console.log("==================================================");

  const email = "hemanthmm1107@gmail.com".toLowerCase().trim();
  const batchId = "MM1107";
  const orgName = "ManMadhan Progress";
  const rawWelcomePassword = process.env.WELCOME_PASSWORD || "Welcome@123";

  // Hash welcome password securely using project's AuthService
  const passwordHash = AuthService.hashPassword(rawWelcomePassword);

  try {
    // 1. Reconcile / Find Organization Workspace
    let [existingOrg] = await db
      .select()
      .from(workspaces)
      .where(sql`LOWER(${workspaces.name}) = ${orgName.toLowerCase()} OR ${workspaces.shortName} = ${batchId}`)
      .limit(1);

    let orgId: string;
    if (existingOrg) {
      orgId = existingOrg.id;
      await db
        .update(workspaces)
        .set({
          name: orgName,
          shortName: "ManMadhan",
          description: "Canonical ManMadhan Progress Organization Workspace.",
          type: "organization",
        })
        .where(eq(workspaces.id, orgId));
      console.log(`[SEED] Organization workspace reconciled: ${orgName} (${orgId})`);
    } else {
      orgId = uuidv4();
      await db.insert(workspaces).values({
        id: orgId,
        name: orgName,
        shortName: "ManMadhan",
        description: "Canonical ManMadhan Progress Organization Workspace.",
        type: "organization",
      });
      console.log(`[SEED] Created new organization workspace: ${orgName} (${orgId})`);
    }

    // 2. Reconcile / Find CEO User Account
    let [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
      await db
        .update(users)
        .set({
          name: "Hemanth",
          displayName: "Hemanth",
          role: "CEO",
          status: "Activated",
          isVerified: true,
          isOtpEnabled: false,
          isGoogleEnabled: false,
          firstLoginCompleted: false,
          onboardingStatus: "FIRST_LOGIN_REQUIRED",
          systemOwner: true,
          batchNumber: batchId,
          employeeId: batchId,
          passwordHash,
        })
        .where(eq(users.id, userId));
      console.log(`[SEED] CEO account reconciled for user: ${email} (${userId})`);
    } else {
      userId = uuidv4();
      await db.insert(users).values({
        id: userId,
        email,
        name: "Hemanth",
        displayName: "Hemanth",
        role: "CEO",
        status: "Activated",
        isVerified: true,
        isOtpEnabled: false,
        isGoogleEnabled: false,
        firstLoginCompleted: false,
        onboardingStatus: "FIRST_LOGIN_REQUIRED",
        systemOwner: true,
        batchNumber: batchId,
        employeeId: batchId,
        passwordHash,
      });
      console.log(`[SEED] Created new CEO account: ${email} (${userId})`);
    }

    // 3. Reconcile CEO Workspace Membership
    const [existingMember] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, orgId),
          eq(workspaceMembers.userId, userId),
        )
      )
      .limit(1);

    if (existingMember) {
      await db
        .update(workspaceMembers)
        .set({ role: "CEO" })
        .where(eq(workspaceMembers.id, existingMember.id));
      console.log(`[SEED] CEO membership reconciled in workspace: ${orgId}`);
    } else {
      await db.insert(workspaceMembers).values({
        id: uuidv4(),
        workspaceId: orgId,
        userId,
        role: "CEO",
      });
      console.log(`[SEED] Created CEO membership in workspace: ${orgId}`);
    }

    // 4. Invalidate old development sessions for this user
    try {
      await db
        .update(userSessions)
        .set({ status: "REVOKED" })
        .where(eq(userSessions.userId, userId));
      console.log(`[SEED] Invalidated old development sessions for user: ${userId}`);
    } catch {
      // Ignore if table does not exist or empty
    }

    console.log("==================================================");
    console.log("✅ CEO ACCOUNT RESEED SUCCESSFUL");
    console.log(`   Email              : ${email}`);
    console.log(`   Organization Batch : ${batchId}`);
    console.log(`   Role               : CEO`);
    console.log(`   First Login State  : FIRST_LOGIN_REQUIRED (firstLoginCompleted = false)`);
    console.log("==================================================");
  } catch (err: any) {
    console.error("❌ CEO Reseed Error:", err.message);
    process.exit(1);
  }
}

seedCeoAccount().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal seed failure:", err);
  process.exit(1);
});
