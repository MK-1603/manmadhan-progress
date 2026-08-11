export interface IIntegrationProvider {
	/** The unique identifier for this provider (e.g., 'GoogleCalendar', 'GitHub', 'RSS') */
	providerName: string;

	/** Generates the OAuth authorization URL */
	getAuthUrl?(): string;

	/** Handles the OAuth callback and returns tokens/account info */
	handleCallback?(code: string): Promise<{
		accountId: string;
		accountName: string;
		accessToken: string;
		refreshToken?: string;
		expiresAt?: Date;
		metadata?: any;
	}>;

	/** Synchronizes data from the external service into the database */
	sync(
		integrationAccountId: string,
		userId: string,
	): Promise<{
		success: boolean;
		recordsProcessed: number;
		recordsAdded?: number;
		recordsUpdated?: number;
		message?: string;
	}>;

	/** Validates or refreshes the access token if needed */
	validateOrRefreshToken?(integrationAccountId: string): Promise<boolean>;
}
