import { randomUUID } from "node:crypto";
import { db } from "../../database/client";
import {
  users,
  workspaces,
  workspaceMembers,
  otpCodes,
  deviceSessions,
  auditLogs,
  invitations,
  passwordHistory,
} from "../../database/schema";
import { AuthService } from "../services/auth.service";

export async function resetDatabase() {
  console.log("Starting clean development database reset...");
  console.log("Executing clean database reset & single CEO reseed...");

  try {
    // 1. Dependency-safe table cleanup
    await db.delete(auditLogs);
    await db.delete(deviceSessions);
    await db.delete(otpCodes);
    await db.delete(invitations);
    await db.delete(passwordHistory);
    await db.delete(workspaceMembers);
    await db.delete(workspaces);
    await db.delete(users);

    console.log("Cleaned all legacy data, users, workspace memberships, and OTP challenges.");

    // 2. Seed single development CEO account with specified credentials
    const ceoUserId = randomUUID();
    const tempPassword = "Welcome@123";
    const passwordHash = AuthService.hashPassword(tempPassword);
    const email = "hemanthmm1107@gmail.com";

    await db.insert(users).values({
      id: ceoUserId,
      email,
      name: "MM1107",
      displayName: "MM1107",
      passwordHash,
      role: "CEO",
      status: "Activated",
      isVerified: true,
      isGoogleEnabled: false,
      firstLoginCompleted: false,
      onboardingStatus: "FIRST_LOGIN_REQUIRED",
      isOtpEnabled: false,
      isInvited: false,
      systemOwner: true,
      employeeId: "MM1107",
      batchNumber: "MM1107",
      timezone: "Asia/Kolkata",
      language: "English",
      dateFormat: "DD MMM YYYY",
      timeFormat: "12-hour",
    });

    // 3. Create EXACTLY ONE Personal Workspace for CEO
    const personalWorkspaceId = randomUUID();
    await db.insert(workspaces).values({
      id: personalWorkspaceId,
      name: "Personal Workspace",
      type: "personal",
    });

    await db.insert(workspaceMembers).values({
      id: randomUUID(),
      workspaceId: personalWorkspaceId,
      userId: ceoUserId,
      role: "MEMBER", // Personal workspace is roleless / default MEMBER
    });

    // 4. Create EXACTLY ONE Organization Workspace (ManMadhan Workspace)
    const orgWorkspaceId = randomUUID();
    await db.insert(workspaces).values({
      id: orgWorkspaceId,
      name: "ManMadhan",
      shortName: "ManMadhan",
      type: "org",
    });

    await db.insert(workspaceMembers).values({
      id: randomUUID(),
      workspaceId: orgWorkspaceId,
      userId: ceoUserId,
      role: "CEO",
    });

    // 5. Verification Audit
    const userCount = (await db.select().from(users)).length;
    const ceoUserCount = (await db.select().from(users).where(undefined)).length;
    const workspaceCount = (await db.select().from(workspaces)).length;
    const memberCount = (await db.select().from(workspaceMembers)).length;

    console.log("==========================================");
    console.log("SEED COMPLETE");
    console.log("");
    console.log(`Email:`);
    console.log(email);
    console.log("");
    console.log(`Role:`);
    console.log("CEO");
    console.log("");
    console.log(`Batch:`);
    console.log("MM1107");
    console.log("");
    console.log(`Status:`);
    console.log("ACTIVE");
    console.log("");
    console.log(`First Login:`);
    console.log("REQUIRED");
    console.log("");
    console.log(`Google Login:`);
    console.log("DISABLED UNTIL FIRST LOGIN COMPLETE");
    console.log("");
    console.log(`Personal Workspace:`);
    console.log("CREATED");
    console.log("");
    console.log(`Organization:`);
    console.log("ManMadhan");
    console.log("==========================================");

    return { success: true, userCount, workspaceCount };
  } catch (error) {
    console.error("Database reset failed:", error);
    throw error;
  }
}

if (require.main === module) {
  resetDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
