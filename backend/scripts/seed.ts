import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../database/client";
import { users, workspaceMembers, workspaces } from "../database/schema";
import { AuthService } from "../src/services/auth.service";

// ─── CEO Bootstrap Credentials ────────────────────────────────────────────────
const CEO_EMAIL    = "saikrishnanmk1603@gmail.com";
const CEO_NAME     = "Sai Krishnan";
const BATCH_NUMBER = "MK1603";
const CEO_PASSWORD = "Welcome@123";
// ──────────────────────────────────────────────────────────────────────────────

async function seed() {
	console.log("🌱 Starting database seeding...");
	console.log(`   CEO Email    : ${CEO_EMAIL}`);
	console.log(`   CEO Name     : ${CEO_NAME}`);
	console.log(`   CEO Password : ${CEO_PASSWORD}`);

	// 1. Check if CEO already exists
	const existingUser = await db
		.select()
		.from(users)
		.where(eq(users.email, CEO_EMAIL))
		.limit(1);

	let userId = "";

	if (existingUser.length > 0) {
		console.log(`\n✅ CEO account already exists — updating credentials...`);
		userId = existingUser[0].id;
		await db
			.update(users)
			.set({
				name:          CEO_NAME,
				displayName:   CEO_NAME,
				role:          "CEO",
				status:        "Activated",
				isVerified:    true,
				isOtpEnabled:  true,
				isGoogleEnabled: false,
				systemOwner:   true,
				batchNumber:   BATCH_NUMBER,
				employeeId:    BATCH_NUMBER,
				passwordHash:  AuthService.hashPassword(CEO_PASSWORD),
			})
			.where(eq(users.email, CEO_EMAIL));
		console.log(`✅ CEO account updated: ${CEO_EMAIL}`);
	} else {
		// Create CEO user from scratch
		userId = randomUUID();
		await db.insert(users).values({
			id:              userId,
			email:           CEO_EMAIL,
			name:            CEO_NAME,
			displayName:     CEO_NAME,
			role:            "CEO",
			status:          "Activated",
			isVerified:      true,
			isGoogleEnabled: false,
			isOtpEnabled:    true,
			isInvited:       false,
			systemOwner:     true,
			batchNumber:     BATCH_NUMBER,
			employeeId:      BATCH_NUMBER,
			passwordHash:    AuthService.hashPassword(CEO_PASSWORD),
		});
		console.log(`✅ Created CEO account: ${CEO_EMAIL}`);
	}

	// 2. Ensure organization workspace exists and CEO is a member
	const existingWorkspace = await db
		.select()
		.from(workspaces)
		.innerJoin(
			workspaceMembers,
			eq(workspaces.id, workspaceMembers.workspaceId),
		)
		.where(eq(workspaceMembers.userId, userId))
		.limit(1);

	if (existingWorkspace.length > 0) {
		console.log(`✅ Workspace already exists — skipping creation.`);
	} else {
		const workspaceId = randomUUID();
		await db.insert(workspaces).values({
			id:          workspaceId,
			name:        "ManMadhan Progress Workspace",
			shortName:   "ManMadhan",
			description: "Organization workspace for ManMadhan Progress.",
			type:        "organization",
		});
		console.log(`✅ Created Organization Workspace.`);

		await db.insert(workspaceMembers).values({
			id:          randomUUID(),
			workspaceId,
			userId,
			role:        "CEO",
		});
		console.log(`✅ Assigned CEO to workspace.`);
	}

	console.log("\n🎉 Seeding complete.");
	console.log("────────────────────────────────────────");
	console.log(`   Email    : ${CEO_EMAIL}`);
	console.log(`   Name     : ${CEO_NAME}`);
	console.log(`   Password : ${CEO_PASSWORD}`);
	console.log(`   Role     : CEO`);
	console.log(`   Status   : Activated`);
	console.log("────────────────────────────────────────");
	process.exit(0);
}

seed().catch((error) => {
	console.error("❌ Seeding failed:", error);
	process.exit(1);
});
