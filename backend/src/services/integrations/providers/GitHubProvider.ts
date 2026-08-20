import { Octokit } from "@octokit/rest";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../../database/client";
import {
	integrationAccounts,
	integrationGithubIssues,
	integrationGithubRepos,
} from "../../../../database/schema/personal.schema";
import { EncryptionService } from "../EncryptionService";
import type { IIntegrationProvider } from "./IIntegrationProvider";

export class GitHubProvider implements IIntegrationProvider {
	public providerName = "GitHub";

	public getAuthUrl(): string {
		const clientId = process.env.GITHUB_INTEGRATION_CLIENT_ID || process.env.GITHUB_CLIENT_ID;
		const redirectUri =
			process.env.GITHUB_REDIRECT_URI ||
			process.env.GITHUB_CALLBACK_URL ||
			process.env.GITHUB_AUTH_CALLBACK_URL ||
			(process.env.SERVER_URL
				? `${process.env.SERVER_URL.replace(/\/$/, "")}/api/v1/auth/github/callback`
				: "http://localhost:4000/api/v1/auth/github/callback");
		const scopes = "repo,user";

		return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}`;
	}

	public async handleCallback(code: string) {
		const clientId = process.env.GITHUB_INTEGRATION_CLIENT_ID;
		const clientSecret = process.env.GITHUB_INTEGRATION_CLIENT_SECRET;

		const tokenResponse = await fetch(
			"https://github.com/login/oauth/access_token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					client_id: clientId,
					client_secret: clientSecret,
					code,
				}),
			},
		);

		const tokenData = await tokenResponse.json();
		if (tokenData.error) {
			throw new Error(
				`GitHub OAuth Error: ${tokenData.error_description || tokenData.error}`,
			);
		}

		const accessToken = tokenData.access_token;

		// Fetch user info
		const octokit = new Octokit({ auth: accessToken });
		const { data: user } = await octokit.users.getAuthenticated();

		return {
			accountId: user.id.toString(),
			accountName: user.login,
			accessToken: accessToken,
			refreshToken: tokenData.refresh_token, // might be undefined depending on GitHub app setup
			expiresAt: tokenData.expires_in
				? new Date(Date.now() + tokenData.expires_in * 1000)
				: undefined,
			metadata: {
				avatarUrl: user.avatar_url,
				name: user.name,
			},
		};
	}

	public async validateOrRefreshToken(
		_integrationAccountId: string,
	): Promise<boolean> {
		// GitHub classic tokens typically do not expire unless revoked.
		// Fine-grained PATs or newer user-to-server tokens might.
		// For now, we just assume it's valid if it exists.
		return true;
	}

	public async sync(integrationAccountId: string, _userId: string) {
		const [account] = await personalDb
			.select()
			.from(integrationAccounts)
			.where(eq(integrationAccounts.id, integrationAccountId));

		if (!account || account.provider !== this.providerName) {
			throw new Error("Invalid account for GitHub sync");
		}

		const accessToken = EncryptionService.decrypt(account.accessToken!);
		const octokit = new Octokit({ auth: accessToken });

		let recordsProcessed = 0;
		let recordsAdded = 0;
		let recordsUpdated = 0;

		// 1. Fetch repositories
		// We only fetch recent active repositories to not overwhelm the API
		const { data: repos } = await octokit.repos.listForAuthenticatedUser({
			sort: "updated",
			per_page: 50, // top 50 recently updated repos
		});

		for (const repo of repos) {
			const repoId = repo.id;

			let dbRepoId: string;
			const existingRepos = await personalDb
				.select()
				.from(integrationGithubRepos)
				.where(eq(integrationGithubRepos.accountId, account.id));

			const existingRepo = existingRepos.find((r) => r.repoId === repoId);

			const repoData = {
				name: repo.name,
				fullName: repo.full_name,
				description: repo.description,
				htmlUrl: repo.html_url,
				language: repo.language,
				stargazersCount: repo.stargazers_count,
				lastSyncAt: new Date(),
			};

			if (existingRepo) {
				dbRepoId = existingRepo.id;
				await personalDb
					.update(integrationGithubRepos)
					.set(repoData)
					.where(eq(integrationGithubRepos.id, dbRepoId));
			} else {
				dbRepoId = uuidv4();
				await personalDb.insert(integrationGithubRepos).values({
					id: dbRepoId,
					accountId: account.id,
					repoId,
					isSelected: true, // Default true
					...repoData,
				});
			}

			// Check if selected
			const currentRepo = existingRepo || { isSelected: true };
			if (!currentRepo.isSelected) continue;

			// 2. Fetch issues (which includes PRs in GitHub API) for this repo
			// We only fetch recent issues (last 30 days)
			const since = new Date();
			since.setDate(since.getDate() - 30);

			try {
				const { data: issues } = await octokit.issues.listForRepo({
					owner: repo.owner.login,
					repo: repo.name,
					state: "all",
					since: since.toISOString(),
					per_page: 100,
				});

				recordsProcessed += issues.length;

				const existingIssues = await personalDb
					.select()
					.from(integrationGithubIssues)
					.where(eq(integrationGithubIssues.repoId, dbRepoId));

				for (const issue of issues) {
					const providerIssueId = issue.id;
					const existingIssue = existingIssues.find(
						(i) => i.providerIssueId === providerIssueId,
					);

					const issueData = {
						number: issue.number,
						title: issue.title,
						state: issue.state,
						htmlUrl: issue.html_url,
						isPullRequest: !!issue.pull_request,
						providerCreatedAt: issue.created_at
							? new Date(issue.created_at)
							: null,
						providerUpdatedAt: issue.updated_at
							? new Date(issue.updated_at)
							: null,
					};

					if (existingIssue) {
						await personalDb
							.update(integrationGithubIssues)
							.set(issueData)
							.where(eq(integrationGithubIssues.id, existingIssue.id));
						recordsUpdated++;
					} else {
						await personalDb.insert(integrationGithubIssues).values({
							id: uuidv4(),
							repoId: dbRepoId,
							providerIssueId,
							...issueData,
						});
						recordsAdded++;
					}
				}
			} catch (err) {
				// Some repos might have issues disabled
				console.warn(`Could not fetch issues for ${repo.full_name}`, err);
			}
		}

		return {
			success: true,
			recordsProcessed,
			recordsAdded,
			recordsUpdated,
			message: `Synced ${recordsProcessed} issues/PRs across ${repos.length} repositories.`,
		};
	}
}
