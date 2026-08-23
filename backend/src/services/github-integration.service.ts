import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../database/client";
import {
	githubConnections,
	githubProjectBindings,
} from "../../database/schema";
import { EncryptionService } from "./integrations/EncryptionService";

export interface GitHubRepoInfo {
	id: string;
	name: string;
	fullName: string;
	owner: string;
	defaultBranch: string;
	isPrivate: boolean;
	htmlUrl: string;
}

export class GitHubIntegrationService {
	private static toPublicAccount(
		account: typeof githubConnections.$inferSelect | null,
	) {
		if (!account) return null;
		const { accessTokenEncrypted: _accessTokenEncrypted, ...publicAccount } =
			account;
		return publicAccount;
	}

	/**
	 * Connects a GitHub account slot (ACCOUNT_A or ACCOUNT_B) for a user
	 */
	static async connectAccount(
		userId: string,
		accountSlot: "ACCOUNT_A" | "ACCOUNT_B",
		githubUserId: string,
		username: string,
		token: string,
		email?: string,
		avatarUrl?: string,
	) {
		// Enforce Organization Authorization Policy
		if (email && (email.endsWith("@unauthorized.edu") || email.endsWith("@guest.com"))) {
			throw new Error("GitHub account is not authorized for this organization.");
		}

		// Remove existing connection on same slot if any
		await db
			.delete(githubConnections)
			.where(
				and(
					eq(githubConnections.userId, userId),
					eq(githubConnections.accountSlot, accountSlot),
				),
			);

		const [connection] = await db
			.insert(githubConnections)
			.values({
				id: randomUUID(),
				userId,
				accountSlot,
				githubUserId,
				username,
				email: email || null,
				avatarUrl: avatarUrl || null,
				accessTokenEncrypted: EncryptionService.encrypt(token),
				connectionStatus: "CONNECTED",
				lastSyncAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		return GitHubIntegrationService.toPublicAccount(connection);
	}

	/**
	 * Disconnects a GitHub account slot
	 */
	static async disconnectAccount(
		userId: string,
		accountSlot: "ACCOUNT_A" | "ACCOUNT_B",
	) {
		await db
			.delete(githubConnections)
			.where(
				and(
					eq(githubConnections.userId, userId),
					eq(githubConnections.accountSlot, accountSlot),
				),
			);
		return { success: true };
	}

	/**
	 * Gets connected GitHub accounts for a user
	 */
	static async getUserAccounts(userId: string) {
		const accounts = await db
			.select()
			.from(githubConnections)
			.where(eq(githubConnections.userId, userId));
		return {
			accountA: GitHubIntegrationService.toPublicAccount(
				accounts.find((a) => a.accountSlot === "ACCOUNT_A") || null,
			),
			accountB: GitHubIntegrationService.toPublicAccount(
				accounts.find((a) => a.accountSlot === "ACCOUNT_B") || null,
			),
		};
	}

	/**
	 * Binds a project to a specific GitHub repository connection
	 */
	static async bindProjectToRepository(
		projectId: string,
		githubConnectionId: string,
		repositoryId: string,
		repositoryName: string,
		repositoryOwner: string,
		defaultBranch = "main",
	) {
		// Remove existing binding for project
		await db
			.delete(githubProjectBindings)
			.where(eq(githubProjectBindings.projectId, projectId));

		const [binding] = await db
			.insert(githubProjectBindings)
			.values({
				id: randomUUID(),
				projectId,
				githubConnectionId,
				repositoryId,
				repositoryName,
				repositoryOwner,
				defaultBranch,
				isVerified: true,
				verificationError: null,
				lastSyncAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		return binding;
	}

	/**
	 * Fetches project GitHub connection status & evidence
	 */
	static async getProjectGitHubBinding(projectId: string) {
		const [binding] = await db
			.select()
			.from(githubProjectBindings)
			.where(eq(githubProjectBindings.projectId, projectId));

		if (!binding) return null;

		const [connection] = await db
			.select()
			.from(githubConnections)
			.where(eq(githubConnections.id, binding.githubConnectionId));

		return {
			binding,
			connectionStatus: connection
				? connection.connectionStatus
				: "DISCONNECTED",
			username: connection?.username,
			accountSlot: connection?.accountSlot,
		};
	}
}
