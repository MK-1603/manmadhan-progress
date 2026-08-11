import { sql } from "drizzle-orm";
import { db } from "../database/client";
import { organizationPrompts } from "../database/schema";
import { v4 as uuidv4 } from "uuid";

async function run() {
	console.log("Syncing organization_prompts database table...");
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS organization_prompts (
			id TEXT PRIMARY KEY,
			workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
			created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
			title TEXT NOT NULL,
			description TEXT,
			category TEXT DEFAULT 'Projects' NOT NULL,
			content TEXT NOT NULL,
			variables JSONB DEFAULT '[]'::jsonb NOT NULL,
			is_builtin BOOLEAN DEFAULT false NOT NULL,
			is_favorite BOOLEAN DEFAULT false NOT NULL,
			usage_count INTEGER DEFAULT 0 NOT NULL,
			created_at TIMESTAMP DEFAULT NOW() NOT NULL,
			updated_at TIMESTAMP DEFAULT NOW() NOT NULL
		);
	`);
	console.log("✅ organization_prompts table ensured.");

	// Seed built-in prompts if none exist
	const [existingCount] = await db.select({ count: sql<number>`count(*)` }).from(organizationPrompts);
	if (Number(existingCount?.count || 0) === 0) {
		console.log("Seeding initial built-in organization prompts...");
		const defaultPrompts = [
			{
				id: uuidv4(),
				title: "Generate Technical Requirements Document (TRD)",
				description: "Produces an enterprise-grade TRD including architecture, data models, APIs, and security rules.",
				category: "Documents",
				content: "Please generate a comprehensive Technical Requirements Document (TRD) for {{PROJECT_NAME}}.\nTech Stack: {{TECH_STACK}}\nCore Requirements:\n{{CORE_REQUIREMENTS}}\n\nInclude System Architecture, DB Schema, API Contracts, and Risk Matrix.",
				variables: [
					{ name: "PROJECT_NAME", label: "Project Name", default: "ManMadhan Expansion" },
					{ name: "TECH_STACK", label: "Tech Stack", default: "Next.js, Node.js, PostgreSQL" },
					{ name: "CORE_REQUIREMENTS", label: "Core Requirements", default: "RBAC, Real-time updates, Audit logging" },
				],
				isBuiltin: true,
			},
			{
				id: uuidv4(),
				title: "Analyze Project Risks & Mitigation Strategy",
				description: "Evaluates timeline, technical bottlenecks, team dependencies, and security compliance risks.",
				category: "Analysis",
				content: "Analyze operational and technical risks for project {{PROJECT_NAME}}.\nCurrent Status: {{CURRENT_STATUS}}\nDependencies: {{DEPENDENCIES}}\n\nProvide actionable risk mitigation steps and severity ranking.",
				variables: [
					{ name: "PROJECT_NAME", label: "Project Name", default: "ManMadhan Mobile App" },
					{ name: "CURRENT_STATUS", label: "Current Status", default: "Stage 3 - Execution" },
					{ name: "DEPENDENCIES", label: "Dependencies", default: "Backend API deployment" },
				],
				isBuiltin: true,
			},
			{
				id: uuidv4(),
				title: "Break Feature Mandate into Subtasks",
				description: "Decomposes high-level project requirement into actionable sprint subtasks with estimated hours.",
				category: "Tasks",
				content: "Decompose feature requirement {{FEATURE_NAME}} into granular developer tasks.\nTarget Component: {{TARGET_COMPONENT}}\nContext: {{CONTEXT_NOTE}}\n\nFormat as subtasks with priority (P0/P1/P2) and criteria.",
				variables: [
					{ name: "FEATURE_NAME", label: "Feature Name", default: "Organization Logo Upload" },
					{ name: "TARGET_COMPONENT", label: "Target Component", default: "Settings Dashboard" },
					{ name: "CONTEXT_NOTE", label: "Context Note", default: "Must support SVG, PNG, WebP" },
				],
				isBuiltin: true,
			},
			{
				id: uuidv4(),
				title: "Prepare Daily Progress Executive Summary",
				description: "Formats daily completed tasks, pending verification items, and blockers into CEO report.",
				category: "Reports",
				content: "Summarize organization progress for date {{DATE}}.\nCompleted Tasks: {{COMPLETED_TASKS}}\nPending Approvals: {{PENDING_APPROVALS}}\nBlockers: {{BLOCKERS}}\n\nProvide CEO high-level overview and team recommendations.",
				variables: [
					{ name: "DATE", label: "Date", default: "2026-08-11" },
					{ name: "COMPLETED_TASKS", label: "Completed Tasks Summary", default: "Project Assignment & Workspace Sync" },
					{ name: "PENDING_APPROVALS", label: "Pending Approvals", default: "Stage 2 Architecture Review" },
					{ name: "BLOCKERS", label: "Blockers", default: "None" },
				],
				isBuiltin: true,
			},
		];

		for (const p of defaultPrompts) {
			await db.insert(organizationPrompts).values(p);
		}
		console.log("✅ Seeded 4 initial built-in organization prompts.");
	}
}

run().then(() => process.exit(0)).catch((err) => {
	console.error("Sync error:", err);
	process.exit(1);
});
