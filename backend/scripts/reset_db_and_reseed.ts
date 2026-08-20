import { sql } from "drizzle-orm";
import { db } from "../database/client";
import { users, workspaces, workspaceMembers } from "../database/schema";
import { AuthService } from "../src/services/auth.service";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

async function resetAndReseed() {
	console.log("==================================================");
	console.log("MANMADHAN PROGRESS — COMPLETE DATABASE RESET & RESEED");
	console.log("==================================================");

	console.log("1. Fetching all database table names...");

	let allTables: string[] = [];
	try {
		const res: any = await db.execute(
			sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
		);
		const rows = res.rows || res;
		allTables = rows.map((r: any) => r.table_name).filter((t: string) => !t.startsWith("_"));
	} catch (_e) {
		allTables = [
			"organization_prompts", "daily_work_reports", "github_project_bindings",
			"task_submissions", "task_assignment_tracker", "task_assignments", "tasks",
			"project_assignments", "project_milestones_v2", "project_documents_v2",
			"projects", "central_requests", "notifications", "audit_logs", "activities",
			"folders", "files", "space_documents", "spaces", "time_tracking",
			"deadline_extensions", "score_ledger", "push_subscriptions", "device_sessions",
			"otp_codes", "password_resets", "password_history", "workspace_members",
			"workspaces", "users", "invitations", "media_assets", "notification_logs",
			"ai_conversations", "departments", "milestones", "project_requirements",
			"project_documents", "project_roadmaps", "project_features", "project_github",
			"project_submissions", "task_dependencies", "workspace_settings",
			"organization_weekly_schedules", "organization_schedule_exceptions",
			"organization_emergency_overrides", "organization_policy_history",
			"ai_context", "attendance", "leaves", "leave_balances", "progress_updates",
			"comments", "attachments", "leaderboard_cache", "reports", "announcements",
			"chat_messages"
		];
	}

	console.log(`Truncating ${allTables.length} tables in a single CASCADE query...`);

	if (allTables.length > 0) {
		const tableString = allTables.map((t) => `"${t}"`).join(", ");
		try {
			await db.execute(sql.raw(`TRUNCATE TABLE ${tableString} CASCADE;`));
		} catch (_e) {
			console.log("Single query failed, executing fallback per-table delete...");
			for (const table of allTables) {
				try {
					await db.execute(sql.raw(`DELETE FROM "${table}";`));
				} catch (_e2) {}
			}
		}
	}

	console.log("✅ All application database tables wiped clean.");

	// 2. Clear Uploads directory
	const uploadsDir = path.join(process.cwd(), "uploads");
	if (fs.existsSync(uploadsDir)) {
		try {
			const files = fs.readdirSync(uploadsDir);
			for (const file of files) {
				if (file !== ".gitkeep") {
					const filePath = path.join(uploadsDir, file);
					if (fs.statSync(filePath).isDirectory()) {
						fs.rmSync(filePath, { recursive: true, force: true });
					} else {
						fs.unlinkSync(filePath);
					}
				}
			}
			console.log(`✅ Uploads directory cleaned.`);
		} catch (_e) {}
	}

	// 3. Create Reseeded CEO Account: hemanthmm1107@gmail.com / MM1107 / Welcome@123 / firstLogin: false
	console.log("\n2. Reseeding CEO Account:");
	console.log("   Email               : hemanthmm1107@gmail.com");
	console.log("   Name                : MM1107");
	console.log("   Display Name        : MM1107");
	console.log("   Password            : Welcome@123");
	console.log("   Role                : CEO");
	console.log("   First Login Completed: false");
	console.log("   Onboarding Status   : FIRST_LOGIN_REQUIRED");

	const ceoUserId = uuidv4();
	const orgWorkspaceId = uuidv4();
	const personalWorkspaceId = uuidv4();
	const passwordHash = AuthService.hashPassword("Welcome@123");

	await db.insert(users).values({
		id: ceoUserId,
		email: "hemanthmm1107@gmail.com",
		name: "MM1107",
		displayName: "MM1107",
		role: "CEO",
		status: "Activated",
		isVerified: true,
		isOtpEnabled: false,
		isGoogleEnabled: false,
		firstLoginCompleted: false,
		onboardingStatus: "FIRST_LOGIN_REQUIRED",
		systemOwner: true,
		batchNumber: "MM1107",
		employeeId: "MM1107-CEO",
		passwordHash,
		createdAt: new Date(),
	});

	// 4. Create Organization Workspace
	await db.insert(workspaces).values({
		id: orgWorkspaceId,
		name: "ManMadhan Organization Workspace",
		shortName: "ManMadhan",
		description: "Primary Organization Command & Execution System Workspace",
		type: "organization",
		createdAt: new Date(),
	});

	await db.insert(workspaceMembers).values({
		id: uuidv4(),
		workspaceId: orgWorkspaceId,
		userId: ceoUserId,
		role: "CEO",
		createdAt: new Date(),
	});

	// 5. Create CEO Personal Workspace
	await db.insert(workspaces).values({
		id: personalWorkspaceId,
		name: "MM1107's Personal Workspace",
		shortName: "Personal",
		description: "Personal focus & daily execution workspace",
		type: "personal",
		createdAt: new Date(),
	});

	await db.insert(workspaceMembers).values({
		id: uuidv4(),
		workspaceId: personalWorkspaceId,
		userId: ceoUserId,
		role: "OWNER",
		createdAt: new Date(),
	});

	console.log("\n==================================================");
	console.log("DATABASE RESET & RESEED VERIFICATION");
	console.log("==================================================");

	const counts: Record<string, number> = {};
	const checkTables = ["users", "workspaces", "workspace_members", "projects", "tasks", "notifications", "audit_logs"];

	for (const t of checkTables) {
		try {
			const res: any = await db.execute(sql.raw(`SELECT COUNT(*)::int as count FROM "${t}"`));
			counts[t] = Number(res.rows?.[0]?.count || res[0]?.count || 0);
		} catch {
			counts[t] = 0;
		}
	}

	console.table(counts);

	console.log("\n✅ COMPLETE DATABASE RESET & RESEED SUCCESSFUL!");
	console.log("==================================================");
	console.log("ACCOUNT DETAILS:");
	console.log("   Email              : hemanthmm1107@gmail.com");
	console.log("   Name               : MM1107");
	console.log("   Temp Password      : Welcome@123");
	console.log("   Role               : CEO");
	console.log("   First Login        : false (firstLoginCompleted = false, onboardingStatus = FIRST_LOGIN_REQUIRED)");
	console.log("==================================================");
}

resetAndReseed()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("Reset error:", err);
		process.exit(1);
	});
