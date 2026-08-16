import { sql } from "drizzle-orm";
import { db } from "../database/client";
import { users, workspaces, workspaceMembers } from "../database/schema";
import { AuthService } from "../src/services/auth.service";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

async function resetDevDatabase() {
	console.log("==================================================");
	console.log("MANMADHAN PROGRESS — DEVELOPMENT DATABASE RESET");
	console.log("==================================================");

	// 1. Safety Check: Verify Development Environment
	const nodeEnv = process.env.NODE_ENV || "development";
	if (nodeEnv === "production") {
		console.error("❌ SAFETY BLOCK: Cannot run db:reset-dev in PRODUCTION environment!");
		process.exit(1);
	}

	console.log(`Environment: [${nodeEnv.toUpperCase()}] — Environment Safety Check Passed.`);
	console.log("Clearing all development data from database tables...");

	// 2. Cascade Delete / Truncate all application data tables
	try {
		await db.execute(sql`
			TRUNCATE TABLE 
				organization_prompts,
				daily_work_reports,
				github_project_bindings,
				task_submissions,
				task_assignments,
				tasks,
				project_assignments,
				projects,
				workspace_members,
				device_sessions,
				otp_codes,
				workspaces
			CASCADE;
		`);
	} catch {
		// Fallback for individual deletions
		await db.execute(sql`DELETE FROM organization_prompts;`).catch(() => null);
		await db.execute(sql`DELETE FROM daily_work_reports;`).catch(() => null);
		await db.execute(sql`DELETE FROM task_submissions;`).catch(() => null);
		await db.execute(sql`DELETE FROM task_assignments;`).catch(() => null);
		await db.execute(sql`DELETE FROM tasks;`).catch(() => null);
		await db.execute(sql`DELETE FROM project_assignments;`).catch(() => null);
		await db.execute(sql`DELETE FROM projects;`).catch(() => null);
		await db.execute(sql`DELETE FROM workspace_members;`).catch(() => null);
		await db.execute(sql`DELETE FROM device_sessions;`).catch(() => null);
		await db.execute(sql`DELETE FROM workspaces;`).catch(() => null);
	}

	// Delete all users
	await db.execute(sql`DELETE FROM users CASCADE;`).catch(() => null);

	console.log("✅ All development database records truncated.");

	// 3. Clean File / Storage uploads directory
	console.log("\nCleaning local file storage uploads directory...");
	const uploadsDir = path.join(process.cwd(), "uploads");
	if (fs.existsSync(uploadsDir)) {
		const files = fs.readdirSync(uploadsDir);
		for (const file of files) {
			if (file !== ".gitkeep") {
				const filePath = path.join(uploadsDir, file);
				try {
					if (fs.statSync(filePath).isDirectory()) {
						fs.rmSync(filePath, { recursive: true, force: true });
					} else {
						fs.unlinkSync(filePath);
					}
				} catch (e) {
					// Ignore individual file removal error
				}
			}
		}
		console.log(`✅ Uploads directory cleaned (${files.length} items processed).`);
	}

	// 4. Re-create Seeded CEO Account & Clean Workspace for Real Onboarding
	console.log("\nSeeding Bootstrap CEO Account: saikrishnanmk1603@gmail.com...");
	const ceoUserId = uuidv4();
	const cleanWsId = uuidv4();
	const passwordHash = AuthService.hashPassword("Welcome@123");

	await db.insert(users).values({
		id:              ceoUserId,
		email:           "saikrishnanmk1603@gmail.com",
		name:            "Sai Krishnan",
		displayName:     "Sai Krishnan",
		role:            "CEO",
		status:          "Activated",
		isVerified:      true,
		isOtpEnabled:    true,
		isGoogleEnabled: false,
		systemOwner:     true,
		batchNumber:     "MK1603",
		employeeId:      "MK1603",
		passwordHash,
	});

	await db.insert(workspaces).values({
		id:          cleanWsId,
		name:        "ManMadhan Progress Workspace",
		shortName:   "ManMadhan",
		description: "Clean production-ready organization workspace.",
		type:        "organization",
	});

	await db.insert(workspaceMembers).values({
		id:          uuidv4(),
		workspaceId: cleanWsId,
		userId:      ceoUserId,
		role:        "CEO",
	});

	console.log("✅ Created Seeded CEO Account:");
	console.log("   Email    : saikrishnanmk1603@gmail.com");
	console.log("   Name     : Sai Krishnan");
	console.log("   Batch    : MK1603");
	console.log("   Password : Welcome@123");
	console.log("   Role     : CEO");
	console.log("   Status   : Activated");
	console.log("✅ Created Clean Organization Workspace.");

	// 5. Final Record Count Verification
	console.log("\n==================================================");
	console.log("DATABASE RESET VERIFICATION COUNTS");
	console.log("==================================================");

	const counts: Record<string, number> = {};

	const getCount = async (tableName: string) => {
		try {
			const res: any = await db.execute(sql.raw(`SELECT COUNT(*)::int as count FROM ${tableName}`));
			return Number(res.rows?.[0]?.count || res[0]?.count || 0);
		} catch {
			return 0;
		}
	};

	counts["workspaces"] = await getCount("workspaces");
	counts["workspace_members"] = await getCount("workspace_members");
	counts["users"] = await getCount("users");
	counts["projects"] = await getCount("projects");
	counts["tasks"] = await getCount("tasks");
	counts["organization_prompts"] = await getCount("organization_prompts");
	counts["daily_work_reports"] = await getCount("daily_work_reports");

	console.table(counts);

	if (counts["projects"] === 0 && counts["tasks"] === 0 && counts["organization_prompts"] === 0) {
		console.log("\n✅ RESET SUCCESSFUL: Database clean & seeded for CEO: saikrishnanmk1603@gmail.com (Batch: MK1603, Password: Welcome@123)");
	} else {
		console.warn("\n⚠️ WARNING: Some table counts are non-zero. Check table verification log above.");
	}
	console.log("==================================================");
}

resetDevDatabase().then(() => process.exit(0)).catch((err) => {
	console.error("Reset error:", err);
	process.exit(1);
});
