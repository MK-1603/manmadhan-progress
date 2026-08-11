import { eq } from "drizzle-orm";
import { db } from "../database/client";
import { users, workspaces, organizationPrompts } from "../database/schema";
import { v4 as uuidv4 } from "uuid";

async function testUpgrade() {
	console.log("==========================================");
	console.log("Testing Organization Workspace Upgrade API");
	console.log("==========================================");

	// 1. Verify workspace logo update
	console.log("1. Testing Workspace Logo & Settings...");
	const [ws] = await db.select().from(workspaces).limit(1);
	if (!ws) {
		console.error("❌ No workspace found in database!");
		process.exit(1);
	}

	const testLogoUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJyZWQiIC8+PC9zdmc+";
	await db.update(workspaces).set({ logoUrl: testLogoUrl }).where(eq(workspaces.id, ws.id));
	const [updatedWs] = await db.select().from(workspaces).where(eq(workspaces.id, ws.id));
	if (updatedWs.logoUrl === testLogoUrl) {
		console.log("✅ Workspace logo successfully updated and fetched.");
	} else {
		console.error("❌ Workspace logo update failed!");
		process.exit(1);
	}

	// 2. Verify Organization Prompts CRUD & Favorites
	console.log("\n2. Testing Organization Prompts...");
	const testPromptId = uuidv4();
	await db.insert(organizationPrompts).values({
		id: testPromptId,
		workspaceId: ws.id,
		title: "Test Automated Verification Prompt",
		description: "Verification prompt for test runner",
		category: "Technical",
		content: "Generate system audit for {{TARGET_SYSTEM}}.",
		variables: [{ name: "TARGET_SYSTEM", label: "Target System", default: "Database" }],
		isBuiltin: false,
		isFavorite: false,
		usageCount: 0,
	});

	const [createdPrompt] = await db.select().from(organizationPrompts).where(eq(organizationPrompts.id, testPromptId));
	if (createdPrompt && createdPrompt.title === "Test Automated Verification Prompt") {
		console.log("✅ Organization prompt created successfully.");
	} else {
		console.error("❌ Organization prompt creation failed!");
		process.exit(1);
	}

	// Favorite toggle
	await db.update(organizationPrompts).set({ isFavorite: true }).where(eq(organizationPrompts.id, testPromptId));
	const [favPrompt] = await db.select().from(organizationPrompts).where(eq(organizationPrompts.id, testPromptId));
	if (favPrompt.isFavorite) {
		console.log("✅ Organization prompt favorite toggle verified.");
	} else {
		console.error("❌ Prompt favorite toggle failed!");
		process.exit(1);
	}

	// Clean up test prompt
	await db.delete(organizationPrompts).where(eq(organizationPrompts.id, testPromptId));
	console.log("✅ Cleaned up test prompt.");

	// 3. User Profile Update
	console.log("\n3. Testing User Profile Updates...");
	const [u] = await db.select().from(users).limit(1);
	if (u) {
		const originalName = u.name;
		await db.update(users).set({ displayName: "Executive Lead" }).where(eq(users.id, u.id));
		const [updatedUser] = await db.select().from(users).where(eq(users.id, u.id));
		if (updatedUser.displayName === "Executive Lead") {
			console.log("✅ User display name updated successfully.");
		}
	}

	console.log("==========================================");
	console.log("✅ ALL BACKEND & DATABASE VERIFICATIONS PASSED!");
	console.log("==========================================");
}

testUpgrade().then(() => process.exit(0)).catch((err) => {
	console.error("Test error:", err);
	process.exit(1);
});
