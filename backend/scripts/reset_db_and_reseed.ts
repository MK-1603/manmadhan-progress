import { sql } from "drizzle-orm";
import { db } from "../database/client";
import { users, workspaces, workspaceMembers } from "../database/schema";
import { AuthService } from "../src/services/auth.service";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

interface SeedAccount {
	email: string;
	name: string;
	displayName: string;
	role: string;
	batchNumber: string;
	employeeId: string;
	systemOwner?: boolean;
}

async function resetAndReseedWithDummyAccounts() {
	console.log("==================================================");
	console.log("MANMADHAN PROGRESS — COMPLETE RESET & MULTI-ROLE SEED");
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
			console.log("Fallback per-table delete...");
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

	// 3. Create Main Organization Workspace
	const orgWorkspaceId = uuidv4();
	await db.insert(workspaces).values({
		id: orgWorkspaceId,
		name: "ManMadhan Organization Workspace",
		shortName: "ManMadhan",
		description: "Primary Organization Command & Execution System Workspace",
		type: "organization",
		createdAt: new Date(),
	});

	// 4. Define Test Dummy Accounts for Each Role
	const passwordHash = AuthService.hashPassword("Welcome@123");

	const accountsToSeed: SeedAccount[] = [
		{
			email: "hemanthmm1107@gmail.com",
			name: "MM1107",
			displayName: "MM1107 (CEO)",
			role: "CEO",
			batchNumber: "MM1107",
			employeeId: "MM1107-CEO",
			systemOwner: true,
		},
		{
			email: "coceo.test@manmadhan.com",
			name: "Co-CEO Test",
			displayName: "Co-CEO Test",
			role: "CO-CEO",
			batchNumber: "TEST-COCEO",
			employeeId: "COCEO-001",
		},
		{
			email: "manager.test@manmadhan.com",
			name: "Manager Test",
			displayName: "Manager Test",
			role: "MANAGER",
			batchNumber: "TEST-MGR",
			employeeId: "MGR-001",
		},
		{
			email: "member.test@manmadhan.com",
			name: "Member Test",
			displayName: "Member Test",
			role: "MEMBER",
			batchNumber: "TEST-MBR",
			employeeId: "MBR-001",
		},
	];

	console.log("\n2. Reseeding Multi-Role Accounts (Password: Welcome@123):");

	for (const acc of accountsToSeed) {
		const userId = uuidv4();
		const personalWorkspaceId = uuidv4();

		// Insert User (Seeded in First-Login Pending status for Universal OTP verification testing)
		await db.insert(users).values({
			id: userId,
			email: acc.email,
			name: acc.name,
			displayName: acc.displayName,
			role: acc.role,
			status: "Activated",
			isVerified: true,
			isOtpEnabled: false,
			isGoogleEnabled: false,
			firstLoginCompleted: false,
			onboardingStatus: "PENDING",
			systemOwner: Boolean(acc.systemOwner),
			batchNumber: acc.batchNumber,
			employeeId: acc.employeeId,
			passwordHash,
			createdAt: new Date(),
		});

		// Insert Org Workspace Membership
		await db.insert(workspaceMembers).values({
			id: uuidv4(),
			workspaceId: orgWorkspaceId,
			userId,
			role: acc.role,
			createdAt: new Date(),
		});

		// Insert Personal Workspace
		await db.insert(workspaces).values({
			id: personalWorkspaceId,
			name: `${acc.name}'s Personal Workspace`,
			shortName: "Personal",
			description: "Personal focus & daily execution workspace",
			type: "personal",
			createdAt: new Date(),
		});

		await db.insert(workspaceMembers).values({
			id: uuidv4(),
			workspaceId: personalWorkspaceId,
			userId,
			role: "OWNER",
			createdAt: new Date(),
		});

		console.log(`   [${acc.role.padEnd(7)}] ${acc.email.padEnd(28)} | Password: Welcome@123`);
	}

	console.log("\n==================================================");
	console.log("DATABASE RESET & MULTI-ROLE SEED VERIFICATION");
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

	console.log("\n✅ ALL DUMMY TEST ACCOUNTS SEEDED SUCCESSFULLY!");
	console.log("==================================================");
}

resetAndReseedWithDummyAccounts()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("Reset error:", err);
		process.exit(1);
	});
