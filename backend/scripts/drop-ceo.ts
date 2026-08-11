import { eq } from "drizzle-orm";
import { db } from "../database/client";
import { users, workspaceMembers, workspaces } from "../database/schema";

async function run() {
	const ceoEmail = "saikrishnanmk1603@gmail.com";
	console.log("Removing CEO account...");

	const existingUser = await db
		.select()
		.from(users)
		.where(eq(users.email, ceoEmail))
		.limit(1);
	if (existingUser.length > 0) {
		const userId = existingUser[0].id;
		await db
			.delete(workspaceMembers)
			.where(eq(workspaceMembers.userId, userId));
		await db.delete(users).where(eq(users.id, userId));
		console.log("CEO account and workspace memberships removed.");
	} else {
		console.log("CEO account not found.");
	}
	process.exit(0);
}

run().catch(console.error);
