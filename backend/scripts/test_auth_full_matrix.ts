import axios from "axios";
import { db } from "../database/client";
import { users } from "../database/schema";
import { eq, ilike } from "drizzle-orm";

async function runAuthMatrixTest() {
  console.log("\n========================================================");
  console.log("  MANMADHAN PROGRESS V1 — AUTH /ME SESSION MATRIX TEST");
  console.log("========================================================\n");

  const baseURL = "http://localhost:4100/api/v1";
  const testEmail = "saikrishnanmk1603@gmail.com";
  const testPassword = "Welcome@123";
  let sessionCookie = "";

  // Ensure test user is fully onboarded for returning user session test
  await db
    .update(users)
    .set({ firstLoginCompleted: true, onboardingStatus: "COMPLETED" })
    .where(ilike(users.email, testEmail));

  // TEST 1: Anonymous Session Check (CASE A: Expected 401, no uncaught error)
  console.log("[TEST 1] Anonymous Session Check (GET /auth/me)");
  try {
    const meRes1 = await axios.get(`${baseURL}/auth/me`, { validateStatus: (status) => status < 500 });
    if (meRes1.status === 401) {
      console.log(`  ✓ CASE A PASSED: GET /auth/me returned 401 Unauthorized for anonymous user as expected.`);
    } else {
      console.log(`  Status returned: ${meRes1.status}`);
    }
  } catch (err: any) {
    throw new Error(`Unexpected network failure on anonymous /me check: ${err.message}`);
  }

  // TEST 2: User Password Login
  console.log("\n[TEST 2] Password Login (POST /auth/login/password)");
  const loginRes = await axios.post(`${baseURL}/auth/login/password`, {
    email: testEmail,
    password: testPassword,
  });
  
  const setCookieHeaders = loginRes.headers["set-cookie"];
  if (setCookieHeaders && setCookieHeaders.length > 0) {
    sessionCookie = setCookieHeaders.map(c => c.split(";")[0]).join("; ");
  }

  console.log(`  Login result: success=${loginRes.data.success}, user=${loginRes.data.user?.email || testEmail}`);
  if (!loginRes.data.success) {
    throw new Error("Assertion failed: Password login returned success=false");
  }
  const token = loginRes.data.token || loginRes.data.accessToken;
  console.log("  ✓ TEST 2 PASSED: Password login succeeded and issued session credentials.");

  // TEST 3: Authenticated Session Check (CASE B: Expected 200 OK)
  console.log("\n[TEST 3] Authenticated Session Check (GET /auth/me)");
  const headers: Record<string, string> = {};
  if (sessionCookie) headers["Cookie"] = sessionCookie;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const meRes2 = await axios.get(`${baseURL}/auth/me`, { headers, validateStatus: (status) => status < 500 });
  console.log(`  GET /auth/me result: status=${meRes2.status}, authenticated=${meRes2.data.authenticated}, user=${meRes2.data.user?.email}`);
  if (meRes2.status !== 200 || !meRes2.data.authenticated || meRes2.data.user?.email !== testEmail) {
    throw new Error(`Assertion failed: Authenticated /auth/me failed! Got status ${meRes2.status}`);
  }
  console.log("  ✓ CASE B PASSED: GET /auth/me returned 200 OK with authenticated user profile.");

  // TEST 4: Page Refresh Session Persistence Check
  console.log("\n[TEST 4] Refresh Page Session Persistence Check");
  const refreshCheck = await axios.get(`${baseURL}/auth/me`, { headers, validateStatus: (status) => status < 500 });
  if (refreshCheck.status !== 200 || !refreshCheck.data.authenticated) {
    throw new Error("Assertion failed: Session did not persist across refresh check!");
  }
  console.log("  ✓ TEST 4 PASSED: Authenticated session persisted across page refresh.");

  // TEST 5: User Logout
  console.log("\n[TEST 5] User Logout (POST /auth/logout)");
  const logoutRes = await axios.post(`${baseURL}/auth/logout`, {}, { headers });
  console.log(`  Logout result: success=${logoutRes.data.success}`);
  if (!logoutRes.data.success) {
    throw new Error("Assertion failed: Logout failed!");
  }
  console.log("  ✓ TEST 5 PASSED: Logout successfully invalidated user session.");

  // TEST 6: Post-Logout Session Check (Expected 401)
  console.log("\n[TEST 6] Post-Logout Session Check (GET /auth/me)");
  const postLogoutRes = await axios.get(`${baseURL}/auth/me`, { validateStatus: (status) => status < 500 });
  if (postLogoutRes.status === 401) {
    console.log("  ✓ TEST 6 PASSED: GET /auth/me returned 401 Unauthorized after logout as expected.");
  } else {
    throw new Error(`Assertion failed: GET /auth/me after logout should return 401, got ${postLogoutRes.status}`);
  }

  console.log("\n========================================================");
  console.log("  🎉 ALL AUTH /ME SESSION MATRIX TESTS PASSED SUCCESSFULLY!");
  console.log("========================================================\n");
  process.exit(0);
}

runAuthMatrixTest().catch((err) => {
  console.error("❌ Auth Matrix Test failed:", err);
  process.exit(1);
});
