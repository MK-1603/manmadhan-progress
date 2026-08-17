import { db } from "../database/client";
import { users, invitations, workspaceMembers, userSessions, otpCodes, deviceSessions } from "../database/schema";
import { eq, inArray } from "drizzle-orm";

async function resetCoCeoAndMembers() {
  console.log("================================================================");
  console.log("  MANMADHAN PROGRESS: CO-CEO and MEMBER RESET");
  console.log("================================================================");

  if (process.env.NODE_ENV === "production") {
    console.error("SAFETY GUARD: Cannot run this reset script in production!");
    process.exit(1);
  }

  console.log("[STEP 1] Finding CO-CEO and MEMBER users...");
  const allUsers = await db.query.users.findMany();
  const targetUsers = allUsers.filter((u: any) => {
    const r = String(u.role || "").toUpperCase().replace(/_/g, "-");
    return (r === "CO-CEO" || r === "MEMBER") && !u.systemOwner;
  });

  if (targetUsers.length === 0) {
    console.log("  No CO-CEO or MEMBER users found. Nothing to reset.");
    process.exit(0);
  }

  console.log("  Found " + targetUsers.length + " user(s):");
  for (const u of targetUsers) {
    console.log("    - [" + u.role + "] " + u.email + " | status: " + u.status);
  }

  const userIds = targetUsers.map((u: any) => u.id);
  const userEmails = targetUsers.map((u: any) => u.email);

  console.log("[STEP 2] Clearing userSessions and deviceSessions...");
  await db.delete(userSessions).where(inArray(userSessions.userId, userIds));
  await db.delete(deviceSessions).where(inArray(deviceSessions.userId, userIds));
  console.log("  Done.");

  console.log("[STEP 3] Clearing OTP codes by email...");
  for (const email of userEmails) {
    await db.delete(otpCodes).where(eq(otpCodes.email, email));
  }
  console.log("  Done.");

  console.log("[STEP 4] Removing workspace memberships...");
  const deletedMem = await db.delete(workspaceMembers).where(inArray(workspaceMembers.userId, userIds)).returning();
  console.log("  Removed " + deletedMem.length + " membership(s).");

  console.log("[STEP 5] Resetting invitations to Sent...");
  for (const email of userEmails) {
    const result = await db.update(invitations).set({ status: "Sent" }).where(eq(invitations.email, email)).returning();
    if (result.length > 0) {
      console.log("  Reset " + result.length + " invitation(s) for " + email);
    }
  }

  console.log("[STEP 6] Resetting user profile and auth fields...");
  for (const u of targetUsers) {
    await db.update(users).set({
      passwordHash: null,
      displayName: null,
      batchNumber: null,
      avatar: null,
      timezone: "UTC",
      status: "Invitation Sent",
      isVerified: false,
      firstLoginCompleted: false,
      onboardingStatus: "FIRST_LOGIN_REQUIRED",
      googleId: null,
      isGoogleEnabled: false,
      lastLoginAt: null,
      lastActiveAt: null,
    }).where(eq(users.id, u.id));
    console.log("  Reset: [" + u.role + "] " + u.email);
  }

  console.log("================================================================");
  console.log("  CO-CEO and MEMBER RESET COMPLETE");
  console.log("  Re-send invitations from the People page to re-activate them.");
  console.log("================================================================");
}

resetCoCeoAndMembers()
  .then(() => process.exit(0))
  .catch((err: any) => {
    console.error("Reset script failed:", err);
    process.exit(1);
  });
