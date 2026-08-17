import { and, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	projectGithub,
	projects,
	workspaceMembers,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";

import { GitHubIntegrationService } from "../services/github-integration.service";

export const githubRouter = Router();
githubRouter.use(authenticate);

async function requireProjectMembership(req: Request, projectId: string) {
	const user = (req as any).user;
	const userId = user?.id;
	const [project] = await db
		.select({ workspaceId: projects.workspaceId })
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1);
	if (!project)
		return { ok: false as const, status: 404, error: "Project not found" };

	if (user?.role === "CEO" || user?.role === "CO-CEO" || user?.role === "ADMIN") {
		return { ok: true as const, workspaceId: project.workspaceId || "default-workspace" };
	}

	const [membership] = await db
		.select({ id: workspaceMembers.id })
		.from(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.workspaceId, project.workspaceId),
				eq(workspaceMembers.userId, userId),
			),
		)
		.limit(1);
	if (!membership)
		return {
			ok: false as const,
			status: 403,
			error: "You are not a member of this project workspace",
		};
	return { ok: true as const, workspaceId: project.workspaceId };
}

// ── GET User Dual GitHub Accounts ──────────────────────────────────────────────
githubRouter.get("/accounts", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const accounts = await GitHubIntegrationService.getUserAccounts(userId);
		res.json({ success: true, data: accounts });
	} catch (err: any) {
		res.status(500).json({
			success: false,
			error: err.message || "Failed to fetch GitHub accounts",
		});
	}
});

// ── POST Connect Account Slot (ACCOUNT_A / ACCOUNT_B) ────────────────────────
githubRouter.post("/connect-account", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { accountSlot, username, token, email } = req.body;

		if (!accountSlot || !["ACCOUNT_A", "ACCOUNT_B"].includes(accountSlot)) {
			return res.status(400).json({
				success: false,
				error: "Valid accountSlot required (ACCOUNT_A or ACCOUNT_B)",
			});
		}
		if (!username || !token) {
			return res.status(400).json({
				success: false,
				error: "GitHub Username and Access Token are required",
			});
		}

		const connected = await GitHubIntegrationService.connectAccount(
			userId,
			accountSlot,
			username,
			username,
			token,
			email,
		);

		res.json({ success: true, data: connected });
	} catch (err: any) {
		res.status(500).json({
			success: false,
			error: err.message || "Failed to connect GitHub account",
		});
	}
});

// ── POST Disconnect Account Slot ─────────────────────────────────────────────
githubRouter.post(
	"/disconnect-account",
	async (req: Request, res: Response) => {
		try {
			const userId = (req as any).user?.id;
			const { accountSlot } = req.body;

			if (!accountSlot || !["ACCOUNT_A", "ACCOUNT_B"].includes(accountSlot)) {
				return res
					.status(400)
					.json({ success: false, error: "Valid accountSlot required" });
			}

			await GitHubIntegrationService.disconnectAccount(userId, accountSlot);
			res.json({ success: true });
		} catch (err: any) {
			res.status(500).json({
				success: false,
				error: err.message || "Failed to disconnect GitHub account",
			});
		}
	},
);

// ── GET GitHub Status for a Project ──────────────────────────────────────────
githubRouter.get("/status", async (req: Request, res: Response) => {
	try {
		const projectId = String(req.query.projectId || "").trim();
		if (!projectId) {
			return res.status(400).json({
				success: false,
				error: "projectId query parameter is required",
			});
		}
		const access = await requireProjectMembership(req, projectId);
		if (!access.ok)
			return res
				.status(access.status)
				.json({ success: false, error: access.error });

		const [record] = await db
			.select()
			.from(projectGithub)
			.where(eq(projectGithub.projectId, projectId))
			.limit(1);

		if (!record) {
			return res.status(200).json({
				success: true,
				data: {
					connected: false,
					status: "Not Connected",
					message: "No GitHub repository connected to this project.",
				},
			});
		}

		return res.status(200).json({
			success: true,
			data: {
				connected: true,
				id: record.id,
				projectId: record.projectId,
				repositoryUrl: record.repositoryUrl,
				owner: record.owner,
				repoName: record.repoName,
				defaultBranch: record.defaultBranch,
				status: record.status,
				createdAt: record.createdAt,
			},
		});
	} catch (err: any) {
		return res.status(500).json({
			success: false,
			error: err.message || "Failed to fetch GitHub status",
		});
	}
});

// ── POST Connect GitHub Repository ───────────────────────────────────────────
githubRouter.post("/connect", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { projectId, repositoryUrl, defaultBranch = "main" } = req.body;

		if (!projectId || !repositoryUrl) {
			return res.status(400).json({
				success: false,
				error: "projectId and repositoryUrl are required",
			});
		}
		const access = await requireProjectMembership(req, String(projectId));
		if (!access.ok)
			return res
				.status(access.status)
				.json({ success: false, error: access.error });

		// Extract owner and repoName from URL (e.g., https://github.com/owner/repo)
		let owner = "";
		let repoName = "";
		try {
			const parsedUrl = new URL(repositoryUrl);
			const parts = parsedUrl.pathname.split("/").filter(Boolean);
			if (parts.length >= 2) {
				owner = parts[0];
				repoName = parts[1].replace(/\.git$/, "");
			}
		} catch {
			// Ignore URL parsing errors
		}

		// Check if existing record exists
		const [existing] = await db
			.select()
			.from(projectGithub)
			.where(eq(projectGithub.projectId, projectId))
			.limit(1);

		let resultRecord: typeof existing | undefined;
		if (existing) {
			const [updated] = await db
				.update(projectGithub)
				.set({
					repositoryUrl,
					owner: owner || existing.owner,
					repoName: repoName || existing.repoName,
					defaultBranch,
					status: "Connected",
					connectedById: userId,
				})
				.where(eq(projectGithub.id, existing.id))
				.returning();
			resultRecord = updated;
		} else {
			const [inserted] = await db
				.insert(projectGithub)
				.values({
					id: uuidv4(),
					projectId,
					repositoryUrl,
					owner,
					repoName,
					defaultBranch,
					status: "Connected",
					connectedById: userId,
				})
				.returning();
			resultRecord = inserted;
		}

		return res.status(200).json({
			success: true,
			data: resultRecord,
			message: "GitHub repository connected successfully",
		});
	} catch (err: any) {
		return res.status(500).json({
			success: false,
			error: err.message || "Failed to connect GitHub repository",
		});
	}
});

// ── POST Verify Pull Request Reference ───────────────────────────────────────
githubRouter.post("/verify-pr", async (req: Request, res: Response) => {
	try {
		const { prUrl } = req.body;
		if (!prUrl || typeof prUrl !== "string") {
			return res
				.status(400)
				.json({ success: false, error: "prUrl is required" });
		}

		// Validate URL format (github.com/owner/repo/pull/123)
		const prRegex =
			/^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+\/pull\/\d+$/i;
		if (!prRegex.test(prUrl.trim())) {
			return res.status(400).json({
				success: false,
				error:
					"Invalid GitHub Pull Request URL format. Expected: https://github.com/owner/repo/pull/123",
			});
		}

		const parts = prUrl.trim().split("/");
		const prNumber = parts[parts.length - 1];
		const repoName = parts[parts.length - 3];
		const owner = parts[parts.length - 4];

		return res.status(200).json({
			success: true,
			data: {
				verified: true,
				prUrl: prUrl.trim(),
				owner,
				repoName,
				prNumber,
			},
		});
	} catch (err: any) {
		return res.status(500).json({
			success: false,
			error: err.message || "Failed to verify PR URL",
		});
	}
});
