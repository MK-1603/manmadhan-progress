import { eq } from "drizzle-orm";
import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../../database/client";
import {
	integrationAccounts,
	integrationGoogleCalendarEvents,
	integrationGoogleCalendars,
} from "../../../../database/schema/personal.schema";
import { EncryptionService } from "../EncryptionService";
import type { IIntegrationProvider } from "./IIntegrationProvider";

export class GoogleCalendarProvider implements IIntegrationProvider {
	public providerName = "GoogleCalendar";

	private getOAuthClient() {
		const redirectUri =
			process.env.GOOGLE_REDIRECT_URI ||
			process.env.GOOGLE_CALLBACK_URL ||
			process.env.GOOGLE_AUTH_CALLBACK_URL ||
			(process.env.SERVER_URL
				? `${process.env.SERVER_URL.replace(/\/$/, "")}/api/v1/auth/google/callback`
				: "http://localhost:4000/api/v1/auth/google/callback");

		return new google.auth.OAuth2(
			process.env.GOOGLE_CLIENT_ID,
			process.env.GOOGLE_CLIENT_SECRET,
			redirectUri,
		);
	}

	public getAuthUrl(): string {
		const oauth2Client = this.getOAuthClient();
		const scopes = [
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/calendar.readonly",
		];

		return oauth2Client.generateAuthUrl({
			access_type: "offline",
			scope: scopes,
			prompt: "consent", // Forces refresh token generation
		});
	}

	public async handleCallback(code: string) {
		const oauth2Client = this.getOAuthClient();
		const { tokens } = await oauth2Client.getToken(code);
		oauth2Client.setCredentials(tokens);

		const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
		const userInfo = await oauth2.userinfo.get();

		return {
			accountId: userInfo.data.id as string,
			accountName: userInfo.data.email as string,
			accessToken: tokens.access_token as string,
			refreshToken: tokens.refresh_token as string | undefined,
			expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
			metadata: {
				name: userInfo.data.name,
				picture: userInfo.data.picture,
			},
		};
	}

	public async validateOrRefreshToken(
		integrationAccountId: string,
	): Promise<boolean> {
		const [account] = await personalDb
			.select()
			.from(integrationAccounts)
			.where(eq(integrationAccounts.id, integrationAccountId));

		if (!account?.accessToken) return false;

		const oauth2Client = this.getOAuthClient();
		oauth2Client.setCredentials({
			access_token: EncryptionService.decrypt(account.accessToken!),
			refresh_token: account.refreshToken
				? EncryptionService.decrypt(account.refreshToken)
				: undefined,
			expiry_date: account.tokenExpiresAt
				? account.tokenExpiresAt.getTime()
				: undefined,
		});

		// Check if token is expired (or expires in next 5 mins)
		const isExpired =
			account.tokenExpiresAt &&
			account.tokenExpiresAt.getTime() < Date.now() + 300000;

		if (isExpired && account.refreshToken) {
			try {
				const res = await oauth2Client.getAccessToken();
				if (res.res?.data) {
					// Tokens were refreshed, update DB
					const newAccess = res.res.data.access_token;
					const newExpiry = res.res.data.expiry_date;
					if (newAccess) {
						await personalDb
							.update(integrationAccounts)
							.set({
								accessToken: EncryptionService.encrypt(newAccess),
								tokenExpiresAt: newExpiry ? new Date(newExpiry) : undefined,
							})
							.where(eq(integrationAccounts.id, integrationAccountId));
					}
				}
				return true;
			} catch (err) {
				console.error("Error refreshing Google token:", err);
				return false;
			}
		}

		// Not expired
		return true;
	}

	public async sync(integrationAccountId: string, _userId: string) {
		const [account] = await personalDb
			.select()
			.from(integrationAccounts)
			.where(eq(integrationAccounts.id, integrationAccountId));

		if (!account || account.provider !== this.providerName) {
			throw new Error("Invalid account for Google Calendar sync");
		}

		const oauth2Client = this.getOAuthClient();
		oauth2Client.setCredentials({
			access_token: EncryptionService.decrypt(account.accessToken!),
			refresh_token: account.refreshToken
				? EncryptionService.decrypt(account.refreshToken)
				: undefined,
		});

		const calendar = google.calendar({ version: "v3", auth: oauth2Client });

		// 1. Fetch calendars
		const calendarListRes = await calendar.calendarList.list();
		const calendars = calendarListRes.data.items || [];

		let recordsProcessed = 0;
		let recordsAdded = 0;
		let recordsUpdated = 0;

		for (const cal of calendars) {
			const calId = cal.id!;

			// Upsert calendar in DB
			let dbCalendarId: string;
			const existingCals = await personalDb
				.select()
				.from(integrationGoogleCalendars)
				.where(eq(integrationGoogleCalendars.accountId, account.id));

			const existingCal = existingCals.find((c) => c.calendarId === calId);

			if (existingCal) {
				dbCalendarId = existingCal.id;
				await personalDb
					.update(integrationGoogleCalendars)
					.set({
						summary: cal.summary || "Unnamed Calendar",
						timeZone: cal.timeZone,
						backgroundColor: cal.backgroundColor,
						lastSyncAt: new Date(),
					})
					.where(eq(integrationGoogleCalendars.id, dbCalendarId));
			} else {
				dbCalendarId = uuidv4();
				await personalDb.insert(integrationGoogleCalendars).values({
					id: dbCalendarId,
					accountId: account.id,
					calendarId: calId,
					summary: cal.summary || "Unnamed Calendar",
					timeZone: cal.timeZone,
					backgroundColor: cal.backgroundColor,
					isSelected: !!cal.primary, // select primary by default
					lastSyncAt: new Date(),
				});
			}

			// Check if calendar is selected for sync
			const currentCal = existingCal || {
				isSelected: !!cal.primary,
			};

			if (!currentCal.isSelected) {
				continue;
			}

			// 2. Fetch events for this calendar
			// Get events from 1 month ago to 6 months in future
			const timeMin = new Date();
			timeMin.setMonth(timeMin.getMonth() - 1);
			const timeMax = new Date();
			timeMax.setMonth(timeMax.getMonth() + 6);

			let pageToken: string | undefined;
			do {
				const eventsRes: any = await calendar.events.list({
					calendarId: calId,
					timeMin: timeMin.toISOString(),
					timeMax: timeMax.toISOString(),
					singleEvents: true, // expands recurring events
					orderBy: "startTime",
					maxResults: 250,
					pageToken: pageToken,
				});

				const events = eventsRes.data.items || [];
				recordsProcessed += events.length;

				for (const evt of events) {
					const providerEventId = evt.id!;

					const existingEvents = await personalDb
						.select()
						.from(integrationGoogleCalendarEvents)
						.where(
							eq(integrationGoogleCalendarEvents.calendarId, dbCalendarId),
						);

					const existingEvent = existingEvents.find(
						(e) => e.providerEventId === providerEventId,
					);

					const evtData = {
						title: evt.summary || "Untitled Event",
						description: evt.description,
						startTime: evt.start?.dateTime
							? new Date(evt.start.dateTime)
							: evt.start?.date
								? new Date(evt.start.date)
								: null,
						endTime: evt.end?.dateTime
							? new Date(evt.end.dateTime)
							: evt.end?.date
								? new Date(evt.end.date)
								: null,
						timeZone: evt.start?.timeZone,
						location: evt.location,
						status: evt.status,
						organizer: evt.organizer?.email,
						eventUrl: evt.htmlLink,
						providerCreatedAt: evt.created ? new Date(evt.created) : null,
						providerUpdatedAt: evt.updated ? new Date(evt.updated) : null,
					};

					if (existingEvent) {
						await personalDb
							.update(integrationGoogleCalendarEvents)
							.set(evtData)
							.where(eq(integrationGoogleCalendarEvents.id, existingEvent.id));
						recordsUpdated++;
					} else {
						await personalDb.insert(integrationGoogleCalendarEvents).values({
							id: uuidv4(),
							calendarId: dbCalendarId,
							providerEventId,
							...evtData,
						});
						recordsAdded++;
					}
				}

				pageToken = eventsRes.data.nextPageToken || undefined;
			} while (pageToken);
		}

		return {
			success: true,
			recordsProcessed,
			recordsAdded,
			recordsUpdated,
			message: `Synced ${recordsProcessed} events across calendars.`,
		};
	}
}
