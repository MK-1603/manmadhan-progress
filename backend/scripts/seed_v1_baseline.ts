import { db, authPool } from "../database/client";
import { users, workspaces, workspaceMembers } from "../database/schema";
import { AuthService } from "../src/services/auth.service";
import { v4 as uuidv4 } from "uuid";
import { eq, ilike } from "drizzle-orm";

async function seedV1Baseline() {
	console.log("==================================================");
	console.log("MANMADHAN PROGRESS V1 — DEVELOPMENT BASELINE SEED");
	console.log("==================================================");

	const safecall = async (query: string) => {
		try {
			await authPool.query(query);
		} catch (e) {
			// Ignore if table/column does not exist
		}
	};

	// 1. Dynamic cleanup of old user & obsolete workspace foreign key references
	console.log("Inspecting database foreign keys for clean data reset...");
	try {
		const fkQuery = `
			SELECT DISTINCT
				kcu.table_name,
				kcu.column_name
			FROM information_schema.table_constraints AS tc
			JOIN information_schema.key_column_usage AS kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			JOIN information_schema.constraint_column_usage AS ccu
				ON ccu.constraint_name = tc.constraint_name
				AND ccu.table_schema = tc.table_schema
			WHERE tc.constraint_type = 'FOREIGN KEY'
				AND (ccu.table_name = 'users' OR ccu.table_name = 'workspaces');
		`;
		const fkResults = await authPool.query(fkQuery);
		
		for (const row of fkResults.rows) {
			const { table_name, column_name } = row;
			if (table_name === 'users' || table_name === 'workspaces') continue;

			try {
				await authPool.query(`UPDATE "${table_name}" SET "${column_name}" = NULL WHERE "${column_name}" IS NOT NULL;`);
			} catch {
				await authPool.query(`DELETE FROM "${table_name}";`);
			}
		}
	} catch (e) {
		console.warn("Notice during FK inspection:", e);
	}

	// Remove all old sessions, OTPs, memberships, obsolete workspaces, and users
	await safecall("DELETE FROM device_sessions;");
	await safecall("DELETE FROM otp_codes;");
	await safecall("DELETE FROM workspace_members;");
	await safecall("DELETE FROM workspaces;");
	await safecall("DELETE FROM users;");

	console.log("SUCCESS: All obsolete users, sessions, and old workspaces removed.");

	// 2. Create Finalized V1 Workspaces:
	// A. ManMadhan Organization Workspace
	const orgWorkspaceId = uuidv4();
	await db.insert(workspaces).values({
		id: orgWorkspaceId,
		name: "ManMadhan Workspace",
		shortName: "ManMadhan",
		description: "Execution OS Organization Workspace",
		type: "organization",
	});

	// B. Personal Workspace
	const personalWorkspaceId = uuidv4();
	await db.insert(workspaces).values({
		id: personalWorkspaceId,
		name: "Personal Workspace",
		shortName: "Personal",
		description: "Private Personal Space",
		type: "personal",
	});

	// 3. Seed ONLY ONE CEO Account
	const ceoUserId = uuidv4();
	const ceoEmail = "hemanthmm1107@gmail.com";
	const defaultPassword = "Welcome@123";
	const hashedCeoPassword = AuthService.hashPassword(defaultPassword);

	console.log("\nSeeding FIRST TEST ACCOUNT (CEO):");
	console.log(`   Email   : ${ceoEmail}`);
	console.log(`   Role    : CEO`);
	console.log(`   Batch   : MM1107`);
	console.log(`   First Login Completed : false`);
	console.log(`   Is Google Enabled     : false`);

	await db.insert(users).values({
		id: ceoUserId,
		email: ceoEmail,
		name: "MM1107",
		displayName: "MM1107",
		role: "CEO",
		status: "Created",
		batchNumber: "MM1107",
		employeeId: "MM1107-CEO",
		passwordHash: hashedCeoPassword,
		isVerified: true,
		isInvited: true,
		systemOwner: true,
		isGoogleEnabled: false,
		firstLoginCompleted: false,
		onboardingStatus: "FIRST_LOGIN_REQUIRED",
		managerId: null,
		googleId: null,
	});

	// 4. Bind CEO to ManMadhan Workspace (Organization RBAC)
	await db.insert(workspaceMembers).values({
		id: uuidv4(),
		workspaceId: orgWorkspaceId,
		userId: ceoUserId,
		role: "CEO",
	});

	// 5. Validation Queries
	const userCount = await db.select({ id: users.id, email: users.email }).from(users);
	const orgWsCount = await db.select({ id: workspaces.id, name: workspaces.name }).from(workspaces).where(eq(workspaces.type, "organization"));
	const personalWsCount = await db.select({ id: workspaces.id, name: workspaces.name }).from(workspaces).where(eq(workspaces.type, "personal"));
	const isPasswordValid = AuthService.verifyPassword(defaultPassword, hashedCeoPassword);

	console.log("\n==================================================");
	console.log("MANMADHAN PROGRESS — DEVELOPMENT SEED");
	console.log("==================================================");
	console.log("Organization:");
	console.log("  ManMadhan");
	console.log("\nWorkspaces:");
	console.log(`  1. ManMadhan Workspace (Organization) [Count: ${orgWsCount.length}]`);
	console.log(`  2. Personal Workspace (Private)       [Count: ${personalWsCount.length}]`);
	console.log("\nUsers:");
	console.log(`  1. CEO — ${ceoEmail} [Count: ${userCount.length}]`);
	console.log("\nBatch:");
	console.log("  MM1107");
	console.log("\nFirst Login:");
	console.log("  Required (Email + Password)");
	console.log("\nGoogle:");
	console.log("  Disabled until first login");
	console.log("\nPassword Hashing Check:");
	console.log(`  ${isPasswordValid ? "PASSED (VALID)" : "FAILED"}`);
	console.log("\nStatus:");
	console.log("  CLEAN DEVELOPMENT BASELINE");
	console.log("==================================================");

	if (userCount.length === 1 && orgWsCount.length === 1 && personalWsCount.length === 1 && isPasswordValid) {
		console.log("✅ V1 SEEDING SUCCESSFUL.");
	} else {
		console.error("❌ SEED VALIDATION FAILED.");
		process.exit(1);
	}
}

seedV1Baseline()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("Seeding failed with error:", err);
		process.exit(1);
	});
