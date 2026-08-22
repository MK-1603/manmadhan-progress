import { OtpService } from "../src/services/otp.service";
import { db } from "../database/client";
import { users, otpCodes } from "../database/schema";
import { eq, ilike } from "drizzle-orm";

async function runOtpResendAuditTest() {
  console.log("\n========================================================");
  console.log("  MANMADHAN PROGRESS V1 — OTP RESEND SYSTEM AUDIT TEST");
  console.log("========================================================\n");

  const testEmail = "hemanthmm1107@gmail.com";
  console.log(`Auditing OTP Resend System for ${testEmail}...`);

  const userList = await db
    .select()
    .from(users)
    .where(ilike(users.email, testEmail))
    .limit(1);

  if (userList.length === 0) {
    console.error(`❌ Test user ${testEmail} not found. Please seed the database first.`);
    process.exit(1);
  }

  console.log(`[TEST 1] Initial OTP Generation for ${testEmail}`);
  const initialResult = await OtpService.sendOTP(testEmail, { userName: "Saikrishnan" });
  console.log(`  Initial sendOTP result: ${JSON.stringify(initialResult)}`);
  
  const status0 = await OtpService.getOTPStatus(testEmail);
  console.log(`  Initial status: resendCount=${status0.resendCount}, remainingResends=${status0.remainingResends}, canResend=${status0.canResend}`);
  if (status0.resendCount !== 0 || status0.remainingResends !== 3) {
    throw new Error(`Assertion failed: Initial OTP resendCount should be 0, got ${status0.resendCount}`);
  }
  console.log("  ✓ TEST 1 PASSED: Initial OTP created with resendCount = 0\n");

  // Get active OTP hash from DB
  let activeCodeRow = (await db.select().from(otpCodes).where(eq(otpCodes.email, testEmail)).limit(1))[0];
  const initialHash = activeCodeRow.otpHash;

  console.log(`[TEST 2] Resend #1 Request`);
  // Bypass 60s cooldown for automated testing by updating lastResentAt
  await db.update(otpCodes).set({ lastResentAt: new Date(Date.now() - 61000) }).where(eq(otpCodes.id, activeCodeRow.id));

  const resend1 = await OtpService.resendOTP(testEmail, { userName: "Saikrishnan" });
  console.log(`  Resend #1 result: success=${resend1.success}, resendCount=${resend1.resendCount}, remaining=${resend1.remainingResends}`);
  if (!resend1.success || resend1.resendCount !== 1 || resend1.remainingResends !== 2) {
    throw new Error(`Assertion failed: Resend #1 failed or incorrect counts`);
  }

  activeCodeRow = (await db.select().from(otpCodes).where(eq(otpCodes.email, testEmail)).limit(1))[0];
  if (activeCodeRow.otpHash === initialHash) {
    throw new Error("Assertion failed: Resend #1 did not invalidate/change old OTP hash!");
  }
  console.log("  ✓ TEST 2 PASSED: Resend #1 succeeded, resendCount = 1, old OTP invalidated\n");

  console.log(`[TEST 3] Cooldown Guard Test`);
  const cooldownTest = await OtpService.resendOTP(testEmail);
  console.log(`  Immediate resend result: success=${cooldownTest.success}, error=${cooldownTest.error}`);
  if (cooldownTest.success || cooldownTest.error !== "COOLDOWN_ACTIVE") {
    throw new Error("Assertion failed: Immediate resend should be blocked by 60s cooldown!");
  }
  console.log("  ✓ TEST 3 PASSED: Cooldown active guard enforced\n");

  console.log(`[TEST 4] Resend #2 Request`);
  await db.update(otpCodes).set({ lastResentAt: new Date(Date.now() - 61000) }).where(eq(otpCodes.id, activeCodeRow.id));
  const resend2 = await OtpService.resendOTP(testEmail, { userName: "Saikrishnan" });
  console.log(`  Resend #2 result: success=${resend2.success}, resendCount=${resend2.resendCount}, remaining=${resend2.remainingResends}`);
  if (!resend2.success || resend2.resendCount !== 2 || resend2.remainingResends !== 1) {
    throw new Error(`Assertion failed: Resend #2 failed`);
  }
  console.log("  ✓ TEST 4 PASSED: Resend #2 succeeded, resendCount = 2\n");

  console.log(`[TEST 5] Resend #3 Request`);
  activeCodeRow = (await db.select().from(otpCodes).where(eq(otpCodes.email, testEmail)).limit(1))[0];
  await db.update(otpCodes).set({ lastResentAt: new Date(Date.now() - 61000) }).where(eq(otpCodes.id, activeCodeRow.id));
  const resend3 = await OtpService.resendOTP(testEmail, { userName: "Saikrishnan" });
  console.log(`  Resend #3 result: success=${resend3.success}, resendCount=${resend3.resendCount}, remaining=${resend3.remainingResends}`);
  if (!resend3.success || resend3.resendCount !== 3 || resend3.remainingResends !== 0) {
    throw new Error(`Assertion failed: Resend #3 failed`);
  }
  console.log("  ✓ TEST 5 PASSED: Resend #3 succeeded, resendCount = 3\n");

  console.log(`[TEST 6] Resend #4 Request (Limit Guard)`);
  activeCodeRow = (await db.select().from(otpCodes).where(eq(otpCodes.email, testEmail)).limit(1))[0];
  await db.update(otpCodes).set({ lastResentAt: new Date(Date.now() - 61000) }).where(eq(otpCodes.id, activeCodeRow.id));
  const resend4 = await OtpService.resendOTP(testEmail, { userName: "Saikrishnan" });
  console.log(`  Resend #4 result: success=${resend4.success}, error=${resend4.error}`);
  if (resend4.success || resend4.error !== "RESEND_LIMIT_REACHED") {
    throw new Error("Assertion failed: 4th resend request should be rejected with RESEND_LIMIT_REACHED!");
  }
  console.log("  ✓ TEST 6 PASSED: 4th resend attempt rejected by backend limit guard\n");

  console.log(`[TEST 7] New Verification Session Reset`);
  await OtpService.sendOTP(testEmail, { userName: "Saikrishnan" });
  const statusNew = await OtpService.getOTPStatus(testEmail);
  console.log(`  New session status: resendCount=${statusNew.resendCount}, remainingResends=${statusNew.remainingResends}`);
  if (statusNew.resendCount !== 0 || statusNew.remainingResends !== 3) {
    throw new Error("Assertion failed: New session should reset resendCount to 0!");
  }
  console.log("  ✓ TEST 7 PASSED: New session resets resendCount to 0\n");

  console.log("========================================================");
  console.log("  🎉 ALL OTP RESEND SYSTEM AUDIT TESTS PASSED SUCCESSFULLY!");
  console.log("========================================================\n");
  process.exit(0);
}

runOtpResendAuditTest().catch((err) => {
  console.error("❌ OTP Resend Audit Test failed:", err);
  process.exit(1);
});
