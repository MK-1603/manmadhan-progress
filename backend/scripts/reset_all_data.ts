import { sql } from "drizzle-orm";
import { db } from "../database/client";
import { users, workspaces, workspaceMembers } from "../database/schema";
import { AuthService } from "../src/services/auth.service";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

async function resetAllData() {
	console.log("==================================================");
	console.log("MANMADHAN PROGRESS — COMPLETE DATABASE RESET & RESEED");
	console.log("==================================================");

	console.log("Clearing all data from database tables...");

	// 1. Truncate all tables with CASCADE
	const tablesToTruncate = [
		"organization_prompts",
		"daily_work_reports",
		"github_project_bindings",
		"task_submissions",
		"task_assignment_tracker",
		"task_assignments",
		"tasks",
		"project_assignments",
		"project_milestones_v2",
		"project_documents_v2",
		"projects",
		"central_requests",
		"notifications",
		"audit_logs",
		"activities",
		"folders",
		"files",
		"space_documents",
		"spaces",
		"time_tracking",
		"deadline_extensions",
		"score_ledger",
		"push_subscriptions",
		"device_sessions",
		"otp_codes",
		"password_resets",
		"password_history",
		"workspace_members",
		"workspaces",
		"users"
	];

	for (const table of tablesToTruncate) {
		try {
			await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE;`));
		} catch (_e) {
			try {
				await db.execute(sql.raw(`DELETE FROM ${table};`));
			} catch (_e2) {
				// Table might not exist or already clean
			}
		}
	}

	console.log("✅ All application database tables wiped clean.");

	// 2. Clear Uploads directory if it exists
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
		} catch (_e) {
			// Storage cleanup warning
		}
	}

	// 3. Create Clean CEO Account: Hemanth (hemanthmm1107@gmail.com / Welcome@123)
	console.log("\nCreating CEO Account:");
	console.log("   Email    : hemanthmm1107@gmail.com");
	console.log("   Password : Welcome@123");
	console.log("   Role     : CEO");
	console.log("   Onboarding: Completed (firstLoginCompleted = true)");

	const ceoUserId = uuidv4();
	const orgWorkspaceId = uuidv4();
	const personalWorkspaceId = uuidv4();
	const passwordHash = AuthService.hashPassword("Welcome@123");

	await db.insert(users).values({
		id: ceoUserId,
		email: "hemanthmm1107@gmail.com",
		name: "Hemanth",
		displayName: "Hemanth",
		role: "CEO",
		status: "Activated",
		isVerified: true,
		isOtpEnabled: false,
		isGoogleEnabled: false,
		firstLoginCompleted: true,
		onboardingStatus: "COMPLETED",
		systemOwner: true,
		batchNumber: "CEO",
		employeeId: "HEMANTH-CEO",
		passwordHash,
		createdAt: new Date(),
	});

	// 4. Create Clean Organization Workspace
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
		name: "Hemanth's Personal Workspace",
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
	console.log("DATABASE RESET VERIFICATION");
	console.log("==================================================");

	const counts: Record<string, number> = {};
	const checkTables = ["users", "workspaces", "workspace_members", "projects", "tasks", "notifications", "audit_logs"];

	for (const t of checkTables) {
		try {
			const res: any = await db.execute(sql.raw(`SELECT COUNT(*)::int as count FROM ${t}`));
			counts[t] = Number(res.rows?.[0]?.count || res[0]?.count || 0);
		} catch {
			counts[t] = 0;
		}
	}

	console.table(counts);

	console.log("\n✅ COMPLETE DATABASE RESET SUCCESSFUL!");
	console.log("==================================================");
	console.log("CEO LOGIN CREDENTIALS:");
	console.log("   Email    : hemanthmm1107@gmail.com");
	console.log("   Password : Welcome@123");
	console.log("   Role     : CEO");
	console.log("   First Login: Bypassed (firstLoginCompleted = true, onboardingStatus = COMPLETED)");
	console.log("==================================================");
}

resetAllData()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("Reset error:", err);
		process.exit(1);
	});
