import { personalDb } from "../../../database/client";
import { integrationAccounts } from "../../../database/schema/personal.schema";
import { eq } from "drizzle-orm";
import { IIntegrationProvider } from "./providers/IIntegrationProvider";
import { EncryptionService } from "./EncryptionService";
import { v4 as uuidv4 } from "uuid";
import { GoogleCalendarProvider } from "./providers/GoogleCalendarProvider";
import { GitHubProvider } from "./providers/GitHubProvider";
import { RSSProvider } from "./providers/RSSProvider";


export class IntegrationService {
  private static providers: Map<string, IIntegrationProvider> = new Map();

  public static initialize() {
    this.registerProvider(new GoogleCalendarProvider());
    this.registerProvider(new GitHubProvider());
    this.registerProvider(new RSSProvider());
  }

  public static registerProvider(provider: IIntegrationProvider) {
    this.providers.set(provider.providerName, provider);
  }

  public static getProvider(providerName: string): IIntegrationProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Integration provider '${providerName}' not found or not supported.`);
    }
    return provider;
  }

  /**
   * Completes the OAuth connection flow by exchanging the code and saving the account.
   */
  public static async connectOAuth(providerName: string, userId: string, code: string): Promise<any> {
    const provider = this.getProvider(providerName);
    if (!provider.handleCallback) {
      throw new Error(`Provider '${providerName}' does not support OAuth callbacks.`);
    }

    const { accountId, accountName, accessToken, refreshToken, expiresAt, metadata } = await provider.handleCallback(code);

    // Check if we already have this account connected for this user
    const existing = await personalDb
      .select()
      .from(integrationAccounts)
      .where(eq(integrationAccounts.ownerUserId, userId));

    const existingAccount = existing.find(a => a.provider === providerName && a.accountId === accountId);

    const encryptedAccessToken = EncryptionService.encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? EncryptionService.encrypt(refreshToken) : null;

    if (existingAccount) {
      // Update tokens
      await personalDb.update(integrationAccounts).set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken || existingAccount.refreshToken,
        tokenExpiresAt: expiresAt || existingAccount.tokenExpiresAt,
        accountName,
        status: "Connected",
        updatedAt: new Date(),
        metadata: metadata || existingAccount.metadata
      }).where(eq(integrationAccounts.id, existingAccount.id));

      return existingAccount;
    } else {
      // Create new integration
      const newId = uuidv4();

      let integrationType = "Unknown";
      if (providerName === "GoogleCalendar") integrationType = "Calendar";
      if (providerName === "GitHub") integrationType = "VersionControl";
      if (providerName === "RSS") integrationType = "Feed";

      await personalDb.insert(integrationAccounts).values({
        id: newId,
        ownerUserId: userId,
        provider: providerName,
        integrationType,
        accountId,
        accountName,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
        status: "Connected",
        metadata: metadata || {}
      });

      const [created] = await personalDb.select().from(integrationAccounts).where(eq(integrationAccounts.id, newId));
      return created;
    }
  }

  /**
   * Synchronizes data for a specific integration account.
   */
  public static async syncIntegration(integrationAccountId: string, userId: string) {
    const [account] = await personalDb
      .select()
      .from(integrationAccounts)
      .where(eq(integrationAccounts.id, integrationAccountId));

    if (!account) {
      throw new Error("Integration account not found.");
    }

    if (account.ownerUserId !== userId) {
      throw new Error("Unauthorized.");
    }

    const provider = this.getProvider(account.provider);

    // Refresh token if needed
    if (provider.validateOrRefreshToken) {
      const refreshed = await provider.validateOrRefreshToken(account.id);
      if (!refreshed) {
        await personalDb.update(integrationAccounts).set({ status: "Reauthorization required" }).where(eq(integrationAccounts.id, account.id));
        throw new Error("Failed to validate or refresh token. Reauthorization required.");
      }
    }

    // Perform the actual sync
    try {
      await personalDb.update(integrationAccounts).set({ status: "Syncing" }).where(eq(integrationAccounts.id, account.id));

      const result = await provider.sync(account.id, userId);

      await personalDb.update(integrationAccounts).set({
        lastSyncAt: new Date(),
        status: "Connected",
        updatedAt: new Date()
      }).where(eq(integrationAccounts.id, account.id));

      return result;
    } catch (error: any) {
      await personalDb.update(integrationAccounts).set({
        status: "Sync failed",
        updatedAt: new Date()
      }).where(eq(integrationAccounts.id, account.id));

      throw error;
    }
  }
}
