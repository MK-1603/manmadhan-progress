import { AutomationService } from "../services/automation.service";
import { db } from "../../database/client";
import { automations, automationLogs } from "../../database/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  console.log("[TestLogs] Testing getLogs query...");
  try {
    const autoId = "3a26ca7f-f18e-4bbc-8679-2e75fffe7d7e";
    const wsId = "23aed916-2e39-4c0e-8172-791db9afbd1b";

    const res = await AutomationService.getLogs(autoId, wsId);
    console.log("[TestLogs] Query succeeded! Logs count:", res.length);
    process.exit(0);
  } catch (err: any) {
    console.error("[TestLogs] Caught error:", err?.message || err);
    console.error(err);
    process.exit(1);
  }
}

main();
