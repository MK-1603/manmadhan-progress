import { db } from "../database/client";
import { users, otpCodes, deviceSessions, auditLogs, workspaces, workspaceMembers } from "../database/schema";
import { eq, ilike } from "drizzle-orm";
import { AuthService } from "../src/services/auth.service";
import crypto from "node:crypto";

async function resetDevAuth() {
  console.log("\n========================================================");
  console.log("  MANMADHAN PROGRESS V1 — DEVELOPMENT AUTH RESET & SEED");
  console.log("========================================================\n");

  // Production Environment Guard
  if (process.env.NODE_ENV === "production") {
    console.error("❌ CRITICAL SAFETY GUARD: Cannot run reset_dev_auth in production environment!");
    process.exit(1);
  }

  const targetEmail = "saikrishnanmk1603@gmail.com";
  const targetBatch = "MK1603";
  const rawPassword = "Welcome@123";

  console.log("[STEP 1] Cleaning up stale development authentication data...");
  
  // Clean up all existing device sessions, OTP codes, and audit logs
  await db.delete(deviceSessions);
  await db.delete(otpCodes);

  // Find any existing seeded users
  const existingUsers = await db
    .select()
    .from(users)
    .where(ilike(users.email, targetEmail));

  for (const u of existingUsers) {
    // Delete workspace memberships & workspaces associated with test user
    const userMemberships = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, u.id));

    for (const mem of userMemberships) {
      await db.delete(workspaceMembers).where(eq(workspaceMembers.id, mem.id));
      await db.delete(workspaces).where(eq(workspaces.id, mem.workspaceId));
    }

    await db.delete(users).where(eq(users.id, u.id));
  }

  console.log(`  ✓ Stale auth data cleaned up.`);

  console.log("\n[STEP 2] Reseeding required development account...");
  const userId = crypto.randomUUID();
  const passwordHash = AuthService.hashPassword(rawPassword);

  await db.insert(users).values({
    id: userId,
    email: targetEmail,
    name: "Saikrishnan",
    displayName: "Saikrishnan MK",
    passwordHash: passwordHash,
    batchNumber: targetBatch,
    role: "CEO",
    status: "Created",
    isVerified: false,
    isGoogleEnabled: false,
    firstLoginCompleted: false,
    onboardingStatus: "FIRST_LOGIN_REQUIRED",
    timezone: "Asia/Kolkata",
    language: "en",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
  });

  console.log(`  ✓ Account reseeded: ${targetEmail} (${targetBatch})`);

  console.log("\n[STEP 3] Verifying database state...");
  const seededUser = await db
    .select()
    .from(users)
    .where(ilike(users.email, targetEmail));

  if (seededUser.length === 1) {
    const u = seededUser[0];
    console.log("  --------------------------------------------------");
    console.log(`  ID:                   ${u.id}`);
    console.log(`  Email:                ${u.email}`);
    console.log(`  Batch Number:         ${u.batchNumber}`);
    console.log(`  Role:                 ${u.role}`);
    console.log(`  firstLoginCompleted:  ${u.firstLoginCompleted}`);
    console.log(`  onboardingStatus:     ${u.onboardingStatus}`);
    console.log(`  Password Verified:    ${AuthService.verifyPassword(rawPassword, u.passwordHash!)}`);
    console.log("  --------------------------------------------------");
    console.log("\n========================================================");
    console.log("  🎉 DEVELOPMENT AUTH RESET & SEED COMPLETED SUCCESSFULLY!");
    console.log("========================================================\n");
  } else {
    throw new Error("Reseed verification failed: User count is not 1!");
  }
}

resetDevAuth()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Reset script failed:", err);
    process.exit(1);
  });
