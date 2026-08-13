import { eq } from "drizzle-orm";
import Parser from "rss-parser";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../../database/client";
import {
	integrationAccounts,
	integrationRssArticles,
	integrationRssFeeds,
} from "../../../../database/schema/personal.schema";
import type { IIntegrationProvider } from "./IIntegrationProvider";

export class RSSProvider implements IIntegrationProvider {
	public providerName = "RSS";

	private parser: Parser;

	constructor() {
		this.parser = new Parser({
			customFields: {
				item: [
					["media:content", "mediaContent", { keepArray: false }],
					["content:encoded", "contentEncoded"],
				],
			},
		});
	}

	// RSS does not use standard OAuth, but we implement the interface to allow generic connection
	public async handleCallback(url: string) {
		// We treat the "code" as the feed URL for RSS
		// Validate that it's a real URL
		let feedUrl: URL;
		try {
			feedUrl = new URL(url);
		} catch {
			throw new Error("Invalid RSS feed URL");
		}

		// Try to parse the feed
		const feedData = await this.parser.parseURL(feedUrl.toString());

		return {
			accountId: feedUrl.toString(), // The URL is the unique ID for RSS
			accountName: feedData.title || feedUrl.hostname,
			accessToken: "rss-no-token", // Dummy token
			metadata: {
				description: feedData.description,
				siteUrl: feedData.link,
				imageUrl: feedData.image?.url,
			},
		};
	}

	public async sync(integrationAccountId: string, _userId: string) {
		const [account] = await personalDb
			.select()
			.from(integrationAccounts)
			.where(eq(integrationAccounts.id, integrationAccountId));

		if (!account || account.provider !== this.providerName) {
			throw new Error("Invalid account for RSS sync");
		}

		// For RSS, the accountId is the feed URL itself.
		const feedUrl = account.accountId;
		if (!feedUrl) throw new Error("No feed URL found.");

		let dbFeedId: string;
		const existingFeeds = await personalDb
			.select()
			.from(integrationRssFeeds)
			.where(eq(integrationRssFeeds.accountId, account.id));

		const existingFeed = existingFeeds.find((f) => f.feedUrl === feedUrl);

		let feedData: Awaited<ReturnType<Parser["parseURL"]>>;
		try {
			feedData = await this.parser.parseURL(feedUrl);
		} catch (error: any) {
			throw new Error(`Failed to fetch RSS feed: ${error.message}`);
		}

		const feedMetadata = {
			title: feedData.title,
			description: feedData.description,
			siteUrl: feedData.link,
			imageUrl: feedData.image?.url,
			lastSyncAt: new Date(),
		};

		if (existingFeed) {
			dbFeedId = existingFeed.id;
			await personalDb
				.update(integrationRssFeeds)
				.set(feedMetadata)
				.where(eq(integrationRssFeeds.id, dbFeedId));
		} else {
			dbFeedId = uuidv4();
			await personalDb.insert(integrationRssFeeds).values({
				id: dbFeedId,
				accountId: account.id,
				feedUrl,
				isActive: true,
				...feedMetadata,
			});
		}

		let recordsProcessed = 0;
		let recordsAdded = 0;
		let recordsUpdated = 0;

		const existingArticles = await personalDb
			.select()
			.from(integrationRssArticles)
			.where(eq(integrationRssArticles.feedId, dbFeedId));

		for (const item of feedData.items) {
			recordsProcessed++;

			const guid = item.guid || item.id || item.link; // Fallback for identifier
			if (!guid) continue;

			const existingArticle = existingArticles.find((a) => a.guid === guid);

			const articleData = {
				title: item.title || "Untitled",
				summary: item.contentSnippet || item.summary,
				content: (item as any).contentEncoded || item.content,
				link: item.link,
				author: item.creator || item.author,
				pubDate: item.pubDate ? new Date(item.pubDate) : null,
			};

			if (existingArticle) {
				await personalDb
					.update(integrationRssArticles)
					.set(articleData)
					.where(eq(integrationRssArticles.id, existingArticle.id));
				recordsUpdated++;
			} else {
				await personalDb.insert(integrationRssArticles).values({
					id: uuidv4(),
					feedId: dbFeedId,
					guid,
					...articleData,
				});
				recordsAdded++;
			}
		}

		return {
			success: true,
			recordsProcessed,
			recordsAdded,
			recordsUpdated,
			message: `Synced ${recordsProcessed} articles.`,
		};
	}
}
