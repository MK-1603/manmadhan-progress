import { and, eq, or } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { db } from "../../database/client";
import {
	githubConnections,
	projectAssignments,
	projectGithub,
	projectMembers,
	projects,
	workspaceMembers,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { GitHubIntegrationService } from "../services/github-integration.service";
import { EncryptionService } from "../services/integrations/EncryptionService";
import { logger } from "../services/logger.service";

export const githubRouter = Router();

// ── Environment Resolution & Validation Helpers ────────────────────────────────
function getGitHubClientId(): string | null {
	return (
		process.env.GITHUB_CLIENT_ID ||
		process.env.GITHUB_INTEGRATION_CLIENT_ID ||
		process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ||
		null
	);
}

function getGitHubClientSecret(): string | null {
	return (
		process.env.GITHUB_CLIENT_SECRET ||
		process.env.GITHUB_INTEGRATION_CLIENT_SECRET ||
		null
	);
}

function getGitHubRedirectUri(): string {
	if (process.env.GITHUB_REDIRECT_URI && process.env.GITHUB_REDIRECT_URI.trim()) {
		return process.env.GITHUB_REDIRECT_URI.trim();
	}

	const isProduction =
		process.env.NODE_ENV === "production" ||
		!!process.env.RENDER ||
		!!process.env.VERCEL;

	if (isProduction) {
		const backendUrl = (
			process.env.BACKEND_URL ||
			process.env.SERVER_URL ||
			process.env.BASE_URL ||
			"https://manmadhan-progress.onrender.com"
		).replace(/\/$/, "");
		return `${backendUrl}/api/v1/github/oauth/callback`;
	}

	return "http://localhost:4100/api/v1/github/oauth/callback";
}

function getFrontendOrigin(): string {
	const isProduction =
		process.env.NODE_ENV === "production" ||
		!!process.env.RENDER ||
		!!process.env.VERCEL;

	if (isProduction) {
		return (
			process.env.CLIENT_URL ||
			process.env.FRONTEND_URL ||
			"https://manmadhan-progress-web.vercel.app"
		).replace(/\/$/, "");
	}

	return (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
}

function sanitizeReturnUrl(rawReturnUrl: string | undefined | null): string {
	const defaultUrl = `${getFrontendOrigin()}/ceo/projects`;
	if (!rawReturnUrl) return defaultUrl;

	const urlStr = String(rawReturnUrl).trim();
	if (urlStr.startsWith("/")) {
		return `${getFrontendOrigin()}${urlStr}`;
	}

	try {
		const parsed = new URL(urlStr);
		const allowedDomains = [
			"manmadhan-progress-web.vercel.app",
			"vercel.app",
			"localhost",
			"127.0.0.1",
		];
		const isAllowed = allowedDomains.some(
			(domain) =>
				parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`),
		);

		if (isAllowed) return urlStr;
	} catch {
		// Invalid URL fallback
	}

	return defaultUrl;
}

// Log configuration status on startup
logger.info(`[GitHub OAuth] Configured Redirect URI: ${getGitHubRedirectUri()}`);

async function requireProjectMembership(req: Request, projectId: string) {
	const user = (req as any).user;
	const userId = user?.id;
	if (!userId) {
		return { ok: false as const, status: 401, error: "Authentication required" };
	}

	const [project] = await db
		.select({
			workspaceId: projects.workspaceId,
			ownerId: projects.ownerId,
			createdBy: projects.createdBy,
			executionLeadId: projects.executionLeadId,
		})
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1);

	if (!project)
		return { ok: false as const, status: 404, error: "Project not found" };

	if (user?.role === "CEO") {
		return { ok: true as const, workspaceId: project.workspaceId || "default-workspace" };
	}

	if (project.ownerId === userId || project.createdBy === userId || project.executionLeadId === userId) {
		return { ok: true as const, workspaceId: project.workspaceId || "default-workspace" };
	}

	const [assign] = await db
		.select({ id: projectAssignments.id })
		.from(projectAssignments)
		.where(
			and(
				eq(projectAssignments.projectId, projectId),
				or(
					eq(projectAssignments.assignedToUserId, userId),
					eq(projectAssignments.responsibleCoCeoId, userId)
				)
			)
		)
		.limit(1);

	if (assign) {
		return { ok: true as const, workspaceId: project.workspaceId || "default-workspace" };
	}

	const [member] = await db
		.select({ id: projectMembers.id })
		.from(projectMembers)
		.where(
			and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, userId)
			)
		)
		.limit(1);

	if (member) {
		return { ok: true as const, workspaceId: project.workspaceId || "default-workspace" };
	}

	return {
		ok: false as const,
		status: 404,
		error: "Project not found",
	};
}

// ── 1. GET Start OAuth Flow (Public Endpoint) ──────────────────────────────────
const handleOAuthStart = async (req: Request, res: Response) => {
	try {
		const { slot = "ACCOUNT_A", state, projectId, returnUrl } = req.query;
		const clientId = getGitHubClientId();
		const redirectUri = getGitHubRedirectUri();

		if (!clientId) {
			return res.status(500).json({
				success: false,
				error: "Server configuration error: GITHUB_CLIENT_ID is missing in environment variables.",
			});
		}

		// State payload containing slot, returnUrl, workspaceId, userId
		let stateStr = String(state || "");
		if (!stateStr || stateStr === "ACCOUNT_A" || stateStr === "ACCOUNT_B") {
			const payload = {
				slot: String(slot || "ACCOUNT_A"),
				projectId: projectId ? String(projectId) : null,
				returnUrl: returnUrl ? String(returnUrl) : null,
			};
			stateStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
		}

		const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
			redirectUri,
		)}&scope=repo,user,read:org&state=${encodeURIComponent(stateStr)}`;

		return res.redirect(githubAuthUrl);
	} catch (err: any) {
		logger.error(`GitHub OAuth start error: ${err.message}`);
		return res.status(500).json({ success: false, error: err.message || "Failed to start GitHub OAuth" });
	}
};

githubRouter.get("/oauth/start", handleOAuthStart);
githubRouter.get("/start", handleOAuthStart);

// ── 2. GET OAuth Callback Endpoint (Public Endpoint) ─────────────────────────
const handleOAuthCallback = async (req: Request, res: Response) => {
	let safeReturnUrl = `${getFrontendOrigin()}/ceo/projects`;
	let accountSlot: "ACCOUNT_A" | "ACCOUNT_B" = "ACCOUNT_A";

	try {
		const { code, state, error, error_description } = req.query;

		// Extract state payload if available
		if (state) {
			try {
				const decodedStr = Buffer.from(String(state), "base64url").toString("utf-8");
				const parsed = JSON.parse(decodedStr);
				if (parsed.returnUrl) safeReturnUrl = sanitizeReturnUrl(parsed.returnUrl);
				if (parsed.slot && ["ACCOUNT_A", "ACCOUNT_B"].includes(parsed.slot)) {
					accountSlot = parsed.slot;
				}
			} catch {
				if (String(state) === "ACCOUNT_B") accountSlot = "ACCOUNT_B";
			}
		}

		// Handle user cancellation or GitHub OAuth error cleanly without logging user out
		if (error) {
			logger.warn(`GitHub OAuth cancelled or error: ${error} - ${error_description}`);
			const targetUrl = new URL(safeReturnUrl);
			targetUrl.searchParams.set("github_status", "cancelled");
			targetUrl.searchParams.set("error", String(error_description || error));
			return res.redirect(targetUrl.toString());
		}

		if (!code || typeof code !== "string") {
			const targetUrl = new URL(safeReturnUrl);
			targetUrl.searchParams.set("github_status", "error");
			targetUrl.searchParams.set("error", "No code provided from GitHub");
			return res.redirect(targetUrl.toString());
		}

		const clientId = getGitHubClientId();
		const clientSecret = getGitHubClientSecret();
		const redirectUri = getGitHubRedirectUri();

		if (!clientId || !clientSecret) {
			logger.error("GitHub Client ID or Client Secret missing during OAuth callback");
			const targetUrl = new URL(safeReturnUrl);
			targetUrl.searchParams.set("github_status", "error");
			targetUrl.searchParams.set("error", "GitHub OAuth configuration error on server");
			return res.redirect(targetUrl.toString());
		}

		// Code exchange for access_token
		const tokenResponse = await axios.post(
			"https://github.com/login/oauth/access_token",
			{
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: redirectUri,
			},
			{
				headers: { Accept: "application/json" },
			},
		);

		if (tokenResponse.data?.error) {
			logger.error(`GitHub token exchange error: ${tokenResponse.data.error_description || tokenResponse.data.error}`);
			const targetUrl = new URL(safeReturnUrl);
			targetUrl.searchParams.set("github_status", "error");
			targetUrl.searchParams.set("error", tokenResponse.data.error_description || tokenResponse.data.error);
			return res.redirect(targetUrl.toString());
		}

		const accessToken = tokenResponse.data?.access_token;
		if (!accessToken) {
			const targetUrl = new URL(safeReturnUrl);
			targetUrl.searchParams.set("github_status", "error");
			targetUrl.searchParams.set("error", "No access token received from GitHub");
			return res.redirect(targetUrl.toString());
		}

		// Fetch GitHub user profile
		const userRes = await axios.get("https://api.github.com/user", {
			headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "ManMadhan-Progress" },
		});
		const ghUser = userRes.data;

		// Fetch primary email if available
		let ghEmail = ghUser.email;
		if (!ghEmail) {
			try {
				const emailRes = await axios.get("https://api.github.com/user/emails", {
					headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "ManMadhan-Progress" },
				});
				if (Array.isArray(emailRes.data)) {
					const primaryObj = emailRes.data.find((e: any) => e.primary) || emailRes.data[0];
					if (primaryObj?.email) ghEmail = primaryObj.email;
				}
			} catch {}
		}

		// Attach user ID if logged in session available
		const userId = (req as any).user?.id || ghUser.id;

		// Persist GitHub Connection to database
		await GitHubIntegrationService.connectAccount(
			userId,
			accountSlot,
			String(ghUser.id),
			ghUser.login,
			accessToken,
			ghEmail || undefined,
			ghUser.avatar_url || undefined,
		);

		const targetUrl = new URL(safeReturnUrl);
		targetUrl.searchParams.set("github_status", "connected");
		targetUrl.searchParams.set("slot", accountSlot);
		targetUrl.searchParams.set("username", ghUser.login);
		return res.redirect(targetUrl.toString());
	} catch (err: any) {
		logger.error(`GitHub OAuth Callback Error: ${err.stack || err.message}`);
		const targetUrl = new URL(safeReturnUrl);
		targetUrl.searchParams.set("github_status", "error");
		targetUrl.searchParams.set("error", err.message || "Failed to complete GitHub OAuth");
		return res.redirect(targetUrl.toString());
	}
};

githubRouter.get("/oauth/callback", handleOAuthCallback);
githubRouter.get("/callback", handleOAuthCallback);

// ── PROTECTED ENDPOINTS (Require Authentication) ───────────────────────────────
githubRouter.use(authenticate);

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
githubRouter.post("/disconnect-account", async (req: Request, res: Response) => {
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
});

// ── GET Repositories for Connected Slot ──────────────────────────────────────
githubRouter.get("/repos", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const slot = (req.query.slot as "ACCOUNT_A" | "ACCOUNT_B") || "ACCOUNT_A";

		const [connection] = await db
			.select()
			.from(githubConnections)
			.where(
				and(
					eq(githubConnections.userId, userId),
					eq(githubConnections.accountSlot, slot),
				),
			)
			.limit(1);

		if (!connection || !connection.accessTokenEncrypted) {
			return res.json({ success: true, data: [] });
		}

		const token = EncryptionService.decrypt(connection.accessTokenEncrypted);
		const reposRes = await axios.get("https://api.github.com/user/repos?per_page=100&sort=updated", {
			headers: { Authorization: `Bearer ${token}`, "User-Agent": "ManMadhan-Progress" },
		});

		const repos = reposRes.data.map((r: any) => ({
			id: String(r.id),
			name: r.name,
			fullName: r.full_name,
			owner: r.owner?.login,
			defaultBranch: r.default_branch || "main",
			htmlUrl: r.html_url,
		}));

		res.json({ success: true, data: repos });
	} catch (err: any) {
		res.status(500).json({ success: false, error: err.message || "Failed to fetch repositories" });
	}
});

// ── GET Branches for Repository ──────────────────────────────────────────────
githubRouter.get("/branches", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const slot = (req.query.slot as "ACCOUNT_A" | "ACCOUNT_B") || "ACCOUNT_A";
		const repo = String(req.query.repo || "").trim();

		if (!repo) return res.status(400).json({ success: false, error: "repo query parameter required" });

		const [connection] = await db
			.select()
			.from(githubConnections)
			.where(
				and(
					eq(githubConnections.userId, userId),
					eq(githubConnections.accountSlot, slot),
				),
			)
			.limit(1);

		if (!connection || !connection.accessTokenEncrypted) {
			return res.json({ success: true, data: ["main"] });
		}

		const token = EncryptionService.decrypt(connection.accessTokenEncrypted);
		const branchesRes = await axios.get(`https://api.github.com/repos/${repo}/branches`, {
			headers: { Authorization: `Bearer ${token}`, "User-Agent": "ManMadhan-Progress" },
		});

		const branches = branchesRes.data.map((b: any) => b.name);
		res.json({ success: true, data: branches });
	} catch {
		res.json({ success: true, data: ["main"] });
	}
});

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

		// Extract owner and repoName from URL
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
