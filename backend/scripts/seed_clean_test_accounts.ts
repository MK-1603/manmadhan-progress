import { sql } from "drizzle-orm";
import { db, authPool } from "../database/client";
import { users, workspaces, workspaceMembers } from "../database/schema";
import { AuthService } from "../src/services/auth.service";
import { v4 as uuidv4 } from "uuid";

async function seedCleanTestAccounts() {
	console.log("==================================================");
	console.log("MANMADHAN PROGRESS — CLEAN USER DATABASE RESET + SEED");
	console.log("==================================================");

	const safecall = async (query: string) => {
		try {
			await authPool.query(query);
		} catch (e) {
			// Ignore if table/column does not exist
		}
	};

	// 1. Dynamically inspect all tables/columns referencing users table
	console.log("Inspecting database foreign keys referencing users table...");
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
				AND ccu.table_name = 'users';
		`;
		const fkResults = await authPool.query(fkQuery);
		console.log(`Found ${fkResults.rows.length} foreign key reference constraints.`);

		for (const row of fkResults.rows) {
			const { table_name, column_name } = row;
			if (table_name === 'users') continue;

			try {
				await authPool.query(`UPDATE "${table_name}" SET "${column_name}" = NULL WHERE "${column_name}" IS NOT NULL;`);
			} catch {
				await authPool.query(`DELETE FROM "${table_name}";`);
			}
		}
	} catch (e) {
		console.warn("Notice during FK inspection:", e);
	}

	// 2. Remove all old users from users table
	console.log("Removing all old user records from users table...");
	await authPool.query(`DELETE FROM users;`);
	console.log("SUCCESS: All previous user records deleted.");

	// 3. Ensure primary Organization Workspace exists
	let orgWorkspace = await db.query.workspaces.findFirst({
		where: (w, { eq }) => eq(w.type, "organization"),
	});

	if (!orgWorkspace) {
		const wsId = uuidv4();
		await db.insert(workspaces).values({
			id: wsId,
			name: "ManMadhan Progress Workspace",
			shortName: "ManMadhan",
			description: "Execution OS Organization Workspace",
			type: "organization",
		});
		orgWorkspace = await db.query.workspaces.findFirst({
			where: (w, { eq }) => eq(w.id, wsId),
		});
	}

	const workspaceId = orgWorkspace?.id || uuidv4();

	// 4. Seed FIRST ACCOUNT: Seeded CEO Account
	const ceoUserId = uuidv4();
	const ceoEmail = "saikrishnanmk1603@gmail.com";
	const defaultPassword = "Welcome@123";
	const hashedCeoPassword = AuthService.hashPassword(defaultPassword);

	console.log("\nSeeding FIRST TEST ACCOUNT (CEO):");
	console.log(`   Email   : ${ceoEmail}`);
	console.log(`   Role    : CEO`);
	console.log(`   Batch   : MK1603`);
	console.log(`   First Login Completed : false`);
	console.log(`   Is Google Enabled     : false`);

	await db.insert(users).values({
		id: ceoUserId,
		email: ceoEmail,
		name: "Saikrishnan",
		displayName: "Saikrishnan (CEO)",
		role: "CEO",
		status: "Created",
		batchNumber: "MK1603",
		employeeId: "MK1603",
		passwordHash: hashedCeoPassword,
		isVerified: true,
		isInvited: true,
		systemOwner: true,
		isGoogleEnabled: false,
		firstLoginCompleted: false,
		managerId: null,
		googleId: null,
	});

	await db.insert(workspaceMembers).values({
		id: uuidv4(),
		workspaceId,
		userId: ceoUserId,
		role: "CEO",
	});

	// Re-associate main business entities to newly seeded CEO account
	await safecall(`UPDATE projects SET created_by = '${ceoUserId}' WHERE created_by IS NULL;`);
	await safecall(`UPDATE tasks SET created_by = '${ceoUserId}' WHERE created_by IS NULL;`);

	// 6. Validation Queries & Password Verification
	console.log("\n==================================================");
	console.log("FINAL DATABASE VALIDATION QUERIES");
	console.log("==================================================");

	const userList = await db.select({
		id: users.id,
		email: users.email,
		role: users.role,
		status: users.status,
		batchNumber: users.batchNumber,
		isVerified: users.isVerified,
		isGoogleEnabled: users.isGoogleEnabled,
		firstLoginCompleted: users.firstLoginCompleted,
		employeeId: users.employeeId,
		managerId: users.managerId,
	}).from(users);

	console.table(userList);

	console.log(`\nTotal Users Count: ${userList.length} (Expected: EXACTLY 2)`);

	// Verify Password Hashing with AuthService
	const isPasswordValid = AuthService.verifyPassword(defaultPassword, hashedCeoPassword);
	console.log(`AuthService Password Hash Verification for ${ceoEmail}: ${isPasswordValid ? "PASSED (VALID)" : "FAILED"}`);

	if (userList.length === 2 && isPasswordValid) {
		console.log("\n✅ DATABASE RESET & SEEDING COMPLETED SUCCESSFULLY.");
	} else {
		console.error("\n❌ VALIDATION FAILED.");
		process.exit(1);
	}
}

seedCleanTestAccounts()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("Seeding failed with error:", err);
		process.exit(1);
	});
