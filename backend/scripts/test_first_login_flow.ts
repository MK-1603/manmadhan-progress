import axios from "axios";
import { db } from "../database/client";
import { users } from "../database/schema";
import { eq, ilike } from "drizzle-orm";

async function runFirstLoginTest() {
  console.log("\n========================================================");
  console.log("  MANMADHAN PROGRESS V1 — FIRST LOGIN & GOOGLE GATING TEST");
  console.log("========================================================\n");

  const baseURL = "http://localhost:4100/api/v1";
  const testEmail = "hemanthmm1107@gmail.com";
  const testPassword = "Welcome@123";

  // STEP 1: Ensure user is in initial First-Login state
  await db
    .update(users)
    .set({ firstLoginCompleted: false, onboardingStatus: "FIRST_LOGIN_REQUIRED" })
    .where(ilike(users.email, testEmail));

  // TEST 1: Password Login Challenge for Un-onboarded User
  console.log("[TEST 1] First-Login Password Challenge (POST /auth/login/password)");
  const loginRes = await axios.post(`${baseURL}/auth/login/password`, {
    email: testEmail,
    password: testPassword,
  });
  console.log(`  Login response: nextStep=${loginRes.data.nextStep}, email=${loginRes.data.email}`);
  if (loginRes.data.nextStep !== "OTP_VERIFICATION") {
    throw new Error("Assertion failed: First login should require OTP verification!");
  }
  console.log("  ✓ TEST 1 PASSED: Password verified. OTP challenge dispatched for first-login activation.");

  // TEST 2: Check Google Availability Before Verification (Locked State)
  console.log("\n[TEST 2] Check Google Availability for Un-onboarded User");
  const googleCheck1 = await axios.get(`${baseURL}/auth/check-google-availability?email=${encodeURIComponent(testEmail)}`);
  console.log(`  Google check result: allowed=${googleCheck1.data.allowed}, message="${googleCheck1.data.message}"`);
  if (googleCheck1.data.allowed !== false) {
    throw new Error("Assertion failed: Google authentication MUST be locked for un-onboarded users!");
  }
  console.log("  ✓ TEST 2 PASSED: Google authentication is locked before first-login completion.");

  // TEST 3: Complete First-Login Activation
  console.log("\n[TEST 3] Complete First-Login Activation");
  await db
    .update(users)
    .set({ firstLoginCompleted: true, onboardingStatus: "COMPLETED", isVerified: true })
    .where(ilike(users.email, testEmail));
  console.log("  ✓ Account status updated to firstLoginCompleted = true.");

  // TEST 4: Check Google Availability After Activation (Allowed State)
  console.log("\n[TEST 4] Check Google Availability After First-Login Completion");
  const googleCheck2 = await axios.get(`${baseURL}/auth/check-google-availability?email=${encodeURIComponent(testEmail)}`);
  console.log(`  Google check result: allowed=${googleCheck2.data.allowed}, message="${googleCheck2.data.message}"`);
  if (googleCheck2.data.allowed !== true) {
    throw new Error("Assertion failed: Google authentication should be unlocked after first-login completion!");
  }
  console.log("  ✓ TEST 4 PASSED: Google authentication unlocked after first-login completion.");

  // TEST 5: Password Login for Activated Returning User
  console.log("\n[TEST 5] Password Login for Activated User");
  const returningLoginRes = await axios.post(`${baseURL}/auth/login/password`, {
    email: testEmail,
    password: testPassword,
  });
  console.log(`  Returning login result: success=${returningLoginRes.data.success}, user=${returningLoginRes.data.user?.email || testEmail}`);
  if (!returningLoginRes.data.success) {
    throw new Error("Assertion failed: Returning user password login failed!");
  }

  const token = returningLoginRes.data.token || returningLoginRes.data.accessToken;
  const setCookieHeaders = returningLoginRes.headers["set-cookie"];
  let sessionCookie = "";
  if (setCookieHeaders && setCookieHeaders.length > 0) {
    sessionCookie = setCookieHeaders.map(c => c.split(";")[0]).join("; ");
  }

  // TEST 6: Session Verification (GET /auth/me)
  console.log("\n[TEST 6] Authenticated Session Restoration (GET /auth/me)");
  const headers: Record<string, string> = {};
  if (sessionCookie) headers["Cookie"] = sessionCookie;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const meRes = await axios.get(`${baseURL}/auth/me`, { headers });
  console.log(`  GET /auth/me result: status=${meRes.status}, authenticated=${meRes.data.authenticated}, email=${meRes.data.user?.email}`);
  if (meRes.status !== 200 || !meRes.data.authenticated || meRes.data.user?.email !== testEmail) {
    throw new Error("Assertion failed: GET /auth/me failed for activated user!");
  }
  console.log("  ✓ TEST 6 PASSED: Session restored cleanly with 200 OK.");

  console.log("\n========================================================");
  console.log("  🎉 ALL FIRST-LOGIN & GOOGLE GATING TESTS PASSED!");
  console.log("========================================================\n");
  process.exit(0);
}

runFirstLoginTest().catch((err) => {
  console.error("❌ First Login Test failed:", err);
  process.exit(1);
});
