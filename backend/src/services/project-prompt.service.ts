import { aiService } from "./ai.service";
import { logger } from "./logger.service";

export interface FeatureItem {
	name: string;
	description: string;
	priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface PromptProjectModel {
	project: {
		name: string;
		objective: string;
		description: string;
		scope: string[];
		outOfScope: string[];
		startDate: string; // YYYY-MM-DD
		deadline: string; // YYYY-MM-DD
		priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
		riskLevel: "LOW" | "MEDIUM" | "HIGH";
	};
	features: FeatureItem[];
	milestones: Array<{
		name: string;
		description: string;
		deadline: string; // YYYY-MM-DD
	}>;
	requirements: Array<{
		title: string;
		description: string;
		category:
			| "Business Objective"
			| "Functional"
			| "Non-functional"
			| "Constraint"
			| "Risk"
			| "Acceptance Criteria";
	}>;
	deliverables: string[];
	tasks: Array<{
		title: string;
		description: string;
		priority: "LOW" | "MEDIUM" | "HIGH";
		estimatedMinutes: number;
		deadline: string; // YYYY-MM-DD
		milestoneName?: string;
		featureName?: string;
		type:
			| "DEVELOPMENT"
			| "DOCUMENTATION"
			| "DESIGN"
			| "RESEARCH"
			| "TESTING"
			| "REVIEW"
			| "DEPLOYMENT"
			| "CONFIGURATION"
			| "MEETING"
			| "OTHER";
		requiresDocument?: boolean;
		requiresGithub?: boolean;
	}>;
	dependencies: Array<{
		taskTitle: string;
		dependsOnTaskTitle: string;
	}>;
	risks: string[];
	documents: Array<{
		docType:
			| "PRD"
			| "TRD"
			| "Application Workflow"
			| "User Manual"
			| "GitHub"
			| "Requirement Verification"
			| "Technical Review"
			| "Execution Review"
			| "Final Verification"
			| "Other";
		title: string;
		status:
			| "Required"
			| "Uploaded"
			| "Under Review"
			| "Approved"
			| "Needs Revision";
	}>;
	workflow: string[];
	githubRequirement: {
		required: boolean;
		recommendation: string;
	};
}

export class ProjectPromptService {
	/**
	 * Generates a structured project plan from a natural language prompt.
	 * Does NOT persist to DB; returns review mandate payload.
	 */
	static async generatePlanFromPrompt(
		promptText: string,
		workspaceType: "PERSONAL" | "ORGANIZATION" = "PERSONAL",
	): Promise<PromptProjectModel> {
		const currentDateStr = new Date().toISOString().split("T")[0];
		const systemPrompt = `
You are an expert Lead Project Architect.
Convert the user's prompt into a complete, structured execution plan in STRICT JSON format.

CONTEXT:
- Current Date: ${currentDateStr} (YYYY-MM-DD).
- Workspace Type: ${workspaceType}.

STRICT FORMAT RULES:
1. Output ONLY a valid JSON object. No explanation text, no markdown backticks outside json.
2. Generate ONLY the Project Template foundation (Title, Objective, Description, Scope, Dates, Priority, Features, Milestones, Requirements, Documents).
3. Do NOT auto-generate execution tasks. Keep "tasks": [].
4. DO NOT use unescaped double quotes inside string values (use single quotes for inner text).
5. Do NOT include literal unescaped newlines inside string values.
6. Dates MUST follow format YYYY-MM-DD (e.g. 2026-08-11, 2026-09-30).
7. All start dates >= ${currentDateStr}.

OUTPUT JSON STRUCTURE:
{
  "project": {
    "name": "string",
    "objective": "string",
    "description": "string",
    "scope": ["string"],
    "outOfScope": ["string"],
    "startDate": "YYYY-MM-DD",
    "deadline": "YYYY-MM-DD",
    "priority": "LOW | MEDIUM | HIGH | CRITICAL",
    "riskLevel": "LOW | MEDIUM | HIGH"
  },
  "features": [
    {
      "name": "string",
      "description": "string",
      "priority": "MEDIUM"
    }
  ],
  "milestones": [
    {
      "name": "string",
      "description": "string",
      "deadline": "YYYY-MM-DD"
    }
  ],
  "requirements": [
    {
      "title": "string",
      "description": "string",
      "category": "Functional"
    }
  ],
  "deliverables": ["string"],
  "tasks": [],
  "dependencies": [],
  "risks": ["string"],
  "documents": [
    { "docType": "PRD", "title": "Product Requirements Document (PRD)", "status": "Required" },
    { "docType": "TRD", "title": "Technical Architecture & TRD", "status": "Required" },
    { "docType": "Application Workflow", "title": "Application Workflow Spec", "status": "Required" },
    { "docType": "User Manual", "title": "User Manual & Guide", "status": "Required" },
    { "docType": "GitHub", "title": "Source Code Repository", "status": "Required" }
  ],
  "workflow": ["Prompt", "Review Mandate", "Execution", "Handover"],
  "githubRequirement": {
    "required": true,
    "recommendation": "Repository required for code execution & PR evidence"
  }
}

USER PROMPT:
"${promptText}"
`;

		try {
			const response = await aiService.generateWithSmartFailover(systemPrompt);
			let rawText = response.text || "";

			// Clean markdown code blocks
			rawText = rawText
				.replace(/```json/gi, "")
				.replace(/```/g, "")
				.trim();

			const parsed: PromptProjectModel = ProjectPromptService.safeParseJSON(
				rawText,
				promptText,
			);

			return ProjectPromptService.validateAndNormalizePlan(
				parsed,
				currentDateStr,
			);
		} catch (err: any) {
			logger.error(
				{ err, promptText },
				"Failed to parse AI project prompt JSON, returning safe template",
			);
			return ProjectPromptService.fallbackPlan(promptText, currentDateStr);
		}
	}

	private static safeParseJSON(rawText: string, promptText: string): any {
		// 1. Attempt direct parse
		try {
			return JSON.parse(rawText);
		} catch (e) {
			// Continue to repair strategies
		}

		// 2. Extract JSON object substring
		let jsonStr = rawText;
		const firstBrace = jsonStr.indexOf("{");
		const lastBrace = jsonStr.lastIndexOf("}");

		if (firstBrace !== -1) {
			if (lastBrace > firstBrace) {
				jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
			} else {
				jsonStr = jsonStr.substring(firstBrace);
			}
		}

		try {
			return JSON.parse(jsonStr);
		} catch (e) {
			// Continue to advanced repair
		}

		// 3. Fix unescaped control characters & quotes
		let repaired = jsonStr
			.replace(/[\r\n\t]/g, " ")
			.replace(/,\s*([}\]])/g, "$1"); // remove trailing commas

		try {
			return JSON.parse(repaired);
		} catch (e) {
			// Continue to truncation auto-close
		}

		// 4. Auto-repair truncated JSON (unbalanced quotes, brackets, braces)
		try {
			let openQuotes = false;
			const stack: string[] = [];

			for (let i = 0; i < repaired.length; i++) {
				const char = repaired[i];
				if (char === '"' && repaired[i - 1] !== "\\") {
					openQuotes = !openQuotes;
				} else if (!openQuotes) {
					if (char === "{" || char === "[") {
						stack.push(char);
					} else if (char === "}" || char === "]") {
						stack.pop();
					}
				}
			}

			if (openQuotes) repaired += '"';

			while (stack.length > 0) {
				const last = stack.pop();
				if (last === "{") repaired += "}";
				else if (last === "[") repaired += "]";
			}

			return JSON.parse(repaired);
		} catch (e) {
			logger.warn(
				{ err: e, rawTextLength: rawText.length },
				"JSON auto-repair exhausted, returning dynamic project fallback",
			);
			throw new Error("Unable to parse AI response into valid JSON");
		}
	}

	private static validateAndNormalizePlan(
		plan: PromptProjectModel,
		currentDateStr: string,
	): PromptProjectModel {
		if (!plan.project || !plan.project.name) {
			throw new Error("Invalid project structure");
		}

		const startDate = plan.project.startDate || currentDateStr;
		let deadline = plan.project.deadline;

		if (!deadline || deadline <= startDate) {
			const start = new Date(startDate);
			const end = new Date(start);
			end.setDate(end.getDate() + 30);
			deadline = end.toISOString().split("T")[0];
		}

		plan.project.startDate = startDate;
		plan.project.deadline = deadline;
		plan.project.priority = plan.project.priority || "MEDIUM";
		plan.project.riskLevel = plan.project.riskLevel || "LOW";
		plan.project.scope = Array.isArray(plan.project.scope)
			? plan.project.scope
			: [];
		plan.project.outOfScope = Array.isArray(plan.project.outOfScope)
			? plan.project.outOfScope
			: [];

		if (!Array.isArray(plan.features) || plan.features.length === 0) {
			plan.features = [
				{
					name: "Authentication & Security",
					description: "Identity, auth & session handling",
					priority: "HIGH",
				},
				{
					name: "Core Business Logic",
					description: "Primary project execution features",
					priority: "HIGH",
				},
				{
					name: "Testing & Documentation",
					description: "Verification & manuals",
					priority: "MEDIUM",
				},
			];
		}

		if (!Array.isArray(plan.milestones) || plan.milestones.length === 0) {
			plan.milestones = [
				{
					name: "Requirements & Architecture",
					description: "Define PRD, TRD & Workflow",
					deadline: startDate,
				},
				{
					name: "Feature Implementation",
					description: "Build core application features",
					deadline: deadline,
				},
			];
		}

		if (!Array.isArray(plan.documents) || plan.documents.length === 0) {
			plan.documents = [
				{
					docType: "PRD",
					title: "Product Requirements Document (PRD)",
					status: "Required",
				},
				{
					docType: "TRD",
					title: "Technical Requirements Document (TRD)",
					status: "Required",
				},
				{
					docType: "Application Workflow",
					title: "Application Workflow Specification",
					status: "Required",
				},
				{
					docType: "User Manual",
					title: "User Manual & Guide",
					status: "Required",
				},
				{
					docType: "GitHub",
					title: "Source Code Repository",
					status: "Required",
				},
			];
		}

		if (!Array.isArray(plan.tasks)) plan.tasks = [];

		// Ensure document tasks have requiresDocument: true
		plan.tasks.forEach((t) => {
			if (
				t.type === "DOCUMENTATION" ||
				(t.title && t.title.toLowerCase().includes("prd"))
			) {
				t.requiresDocument = true;
			}
			if (
				t.type === "DEVELOPMENT" ||
				(t.title && t.title.toLowerCase().includes("api"))
			) {
				t.requiresGithub = true;
			}
		});

		plan.githubRequirement = plan.githubRequirement || {
			required: true,
			recommendation: "GitHub repository connected",
		};

		return plan;
	}

	private static fallbackPlan(
		promptText: string,
		currentDateStr: string,
	): PromptProjectModel {
		const endDate = new Date(currentDateStr);
		endDate.setDate(endDate.getDate() + 30);
		const deadlineStr = endDate.toISOString().split("T")[0];
		const cleanTitle =
			promptText.length > 50 ? promptText.substring(0, 47) + "..." : promptText;

		return {
			project: {
				name: cleanTitle,
				objective: promptText,
				description: promptText,
				scope: ["Core features development", "Testing & Documentation"],
				outOfScope: ["Unspecified third-party integrations"],
				startDate: currentDateStr,
				deadline: deadlineStr,
				priority: "MEDIUM",
				riskLevel: "LOW",
			},
			features: [
				{
					name: "Authentication & Security",
					description: "Identity, auth & session handling",
					priority: "HIGH",
				},
				{
					name: "Core Application Execution",
					description: "Main feature deliverables",
					priority: "HIGH",
				},
			],
			milestones: [
				{
					name: "Requirements & Setup",
					description: "Initial setup & scope definition",
					deadline: currentDateStr,
				},
				{
					name: "Core Development",
					description: "Implementation of key requirements",
					deadline: deadlineStr,
				},
			],
			requirements: [
				{
					title: "Functional Scope",
					description: "Complete scope as requested in prompt",
					category: "Functional",
				},
			],
			deliverables: ["Working Application", "Documentation"],
			tasks: [],
			dependencies: [],
			risks: ["Schedule delay", "Unresolved scope change"],
			documents: [
				{
					docType: "PRD",
					title: "Product Requirements Document (PRD)",
					status: "Required",
				},
				{
					docType: "TRD",
					title: "Technical Architecture Spec",
					status: "Required",
				},
				{
					docType: "Application Workflow",
					title: "Application Workflow Spec",
					status: "Required",
				},
				{
					docType: "User Manual",
					title: "User Guide & Manual",
					status: "Required",
				},
				{
					docType: "GitHub",
					title: "GitHub Repository Link",
					status: "Required",
				},
			],
			workflow: ["Prompt", "Review Mandate", "Execution", "Completion"],
			githubRequirement: {
				required: true,
				recommendation: "GitHub repository recommended for code evidence",
			},
		};
	}
}
