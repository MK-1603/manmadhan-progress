import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	personalBooks,
	personalCalendarEvents,
	personalProjects,
	personalTasks,
	reminders,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { aiService } from "../services/ai.service";
import { logger } from "../services/logger.service";
import { extractUrls, fetchUrlMetadata } from "../utils/url.utils";

export const personalAiRouter = Router();

personalAiRouter.use(authenticate);

const PLAN_SYSTEM_PROMPT = `
You are the intelligence engine for the ManMadhan Progress Personal Workspace.
The user will give you a natural language prompt. Your job is to extract all intents and create a highly structured JSON plan.
You must output ONLY valid JSON. No markdown formatting, no backticks, no explanations.

The JSON schema must strictly follow this structure:
{
  "projects": [
    { "name": "string", "description": "string", "deadline": "ISO date string or null", "estimatedEffort": "number (minutes)" }
  ],
  "tasks": [
    { "title": "string", "description": "string", "deadline": "ISO date string or null", "estimatedMinutes": "number" }
  ],
  "books": [
    { "title": "string", "author": "string", "dailyPageTarget": "number", "sourceUrl": "string or null" }
  ],
  "podcasts": [
    { "title": "string", "publisher": "string", "sourceUrl": "string or null" }
  ],
  "calendarEvents": [
    { "title": "string", "startDate": "ISO date string", "endDate": "ISO date string", "description": "string" }
  ],
  "reminders": [
    { "title": "string", "remindAt": "ISO date string" }
  ]
}

- For relative dates (e.g. "tomorrow", "next Friday"), use the current date to calculate.
- If the user provides a multi-action prompt, decompose it into multiple objects.
- Do not create structural records unless explicitly requested or strongly implied.
`;

// 1. Generate Structured Plan from Prompt
personalAiRouter.post("/plan", async (req: Request, res: Response) => {
	try {
		const { prompt } = req.body;
		const _userId = (req as any).user?.id;

		if (!prompt) {
			return res
				.status(400)
				.json({ success: false, error: "Prompt is required." });
		}

		// 0. Extract URLs and fetch metadata
		const urls = extractUrls(prompt);
		const metadataList = await Promise.all(
			urls.map((url) => fetchUrlMetadata(url)),
		);

		let urlContext = "";
		if (metadataList.length > 0) {
			urlContext =
				"\n\nExtracted URL Metadata (Use this exact data if relevant to the prompt):\n";
			metadataList.forEach((m) => {
				urlContext += `- URL: ${m.url}\n  Title: ${m.title || "Unknown"}\n  Description: ${m.description || "Unknown"}\n  Site: ${m.siteName || "Unknown"}\n`;
			});
		}

		// Enhance prompt with context (current date + URLs)
		const contextPrompt = `
Current Date and Time: ${new Date().toISOString()}
User Prompt: ${prompt}
${urlContext}
`;

		// 1. Call AI Service
		const aiResponse = await aiService.generateWithSmartFailover(
			`${PLAN_SYSTEM_PROMPT}\n\n${contextPrompt}`,
			"groq", // Use fast model
		);

		// 2. Parse JSON
		let planData: Record<string, unknown> = {};
		try {
			// Remove any potential markdown block backticks just in case
			const cleanedText = aiResponse.text
				.replace(/```json/g, "")
				.replace(/```/g, "")
				.trim();
			planData = JSON.parse(cleanedText);
		} catch (_parseError) {
			logger.error(`AI returned invalid JSON: ${aiResponse.text}`);
			return res.status(500).json({
				success: false,
				error: "AI failed to generate a valid structured plan.",
			});
		}

		res.json({
			success: true,
			data: planData,
			provider: aiResponse.provider,
		});
	} catch (error: any) {
		logger.error(`AI Plan Error: ${error.message}`);
		res.status(500).json({
			success: false,
			error: `Failed to generate plan: ${error.message}`,
		});
	}
});

// 2. Execute the Approved Plan
personalAiRouter.post("/execute", async (req: Request, res: Response) => {
	try {
		const { plan, workspaceId } = req.body;
		const userId = (req as any).user?.id;

		if (!plan || !workspaceId) {
			return res
				.status(400)
				.json({ success: false, error: "Plan and workspaceId are required." });
		}

		const results = {
			projects: 0,
			tasks: 0,
			books: 0,
			calendarEvents: 0,
			reminders: 0,
		};

		// Use transaction if DB supports it safely here, otherwise sequential
		await db.transaction(async (tx) => {
			// 1. Projects
			if (plan.projects && plan.projects.length > 0) {
				for (const p of plan.projects) {
					await tx.insert(personalProjects).values({
						id: uuidv4(),
						ownerUserId: userId,
						name: p.name,
						description: p.description || null,
						deadline: p.deadline ? new Date(p.deadline) : null,
						estimatedEffort: p.estimatedEffort || null,
						status: "Planning",
					});
					results.projects++;
				}
			}

			// 2. Tasks
			if (plan.tasks && plan.tasks.length > 0) {
				for (const t of plan.tasks) {
					await tx.insert(personalTasks).values({
						id: uuidv4(),
						ownerUserId: userId,
						title: t.title,
						description: t.description || null,
						deadline: t.deadline ? new Date(t.deadline) : null,
						estimatedMinutes: t.estimatedMinutes || null,
						status: "TODO",
					});
					results.tasks++;
				}
			}

			// 3. Books
			if (plan.books && plan.books.length > 0) {
				for (const b of plan.books) {
					await tx.insert(personalBooks).values({
						id: uuidv4(),
						ownerUserId: userId,
						title: b.title,
						author: b.author || null,
						dailyPageTarget: b.dailyPageTarget || 20,
						status: "Want to Read",
						sourceUrl: b.sourceUrl || null,
					});
					results.books++;
				}
			}

			// 3.5 Podcasts
			// Need to import personalPodcasts at the top, I'll do it if it fails or just use db.insert directly with table string if possible, wait I must import it.
			// Assuming I'll import it in another replacement chunk.
			if (plan.podcasts && plan.podcasts.length > 0) {
				for (const p of plan.podcasts) {
					await tx
						.insert(require("../../database/schema").personalPodcasts)
						.values({
							id: uuidv4(),
							ownerUserId: userId,
							title: p.title,
							publisher: p.publisher || null,
							websiteUrl: p.sourceUrl || null,
						});
					// Update results counter
					(results as any).podcasts = ((results as any).podcasts || 0) + 1;
				}
			}

			// 4. Calendar Events
			if (plan.calendarEvents && plan.calendarEvents.length > 0) {
				for (const c of plan.calendarEvents) {
					await tx.insert(personalCalendarEvents).values({
						id: uuidv4(),
						ownerUserId: userId,
						title: c.title,
						description: c.description || null,
						startDate: new Date(c.startDate),
						endDate: c.endDate ? new Date(c.endDate) : null,
					});
					results.calendarEvents++;
				}
			}

			// 5. Reminders
			if (plan.reminders && plan.reminders.length > 0) {
				for (const r of plan.reminders) {
					await tx.insert(reminders).values({
						id: uuidv4(),
						userId: userId,
						workspaceId: workspaceId,
						title: r.title,
						remindAt: new Date(r.remindAt),
					});
					results.reminders++;
				}
			}
		});

		res.json({
			success: true,
			message: "Plan executed successfully.",
			data: results,
		});
	} catch (error: any) {
		logger.error(`AI Execute Error: ${error.message}`);
		res.status(500).json({
			success: false,
			error: `Failed to execute plan: ${error.message}`,
		});
	}
});
