import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.config";

export interface ProjectAnalysisResult {
	type: string; // e.g. Full-stack Application, Backend Service, Enterprise Platform
	category: string;
	complexity: "Low" | "Medium" | "High" | "Enterprise";
	users: string[];
	roles: string[];
	coreFeatures: string[];
	technicalRequirements: {
		frontend: string[];
		backend: string[];
		database: string[];
		apis: string[];
		security: string[];
		deployment: string[];
	};
	milestonePlan: {
		stageNumber: number;
		milestoneCode: string;
		name: string;
		description: string;
		dependencies: number[];
	}[];
}

export class ProjectAnalyzerService {
	static async analyzePrompt(
		promptText: string,
	): Promise<ProjectAnalysisResult> {
		if (!promptText || promptText.trim().length < 5) {
			throw new Error("Project prompt must be at least 5 characters long");
		}

		// Use Gemini AI if configured, otherwise fallback to deterministic analysis rule-engine
		if (env.GEMINI_API_KEY) {
			try {
				const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
				const model = genAI.getGenerativeModel({
					model: env.GEMINI_MODEL || "gemini-3.6-flash",
				});

				const systemPrompt = `You are a Principal Software Architect for ManMadhan Progress.
Analyze the following project prompt and output a raw JSON object with this exact structure:
{
  "type": "Full-stack application",
  "category": "Software Engineering",
  "complexity": "High",
  "users": ["End User", "Admin"],
  "roles": ["CEO", "CO-CEO", "Member"],
  "coreFeatures": ["Authentication", "Dashboard", "API Integration"],
  "technicalRequirements": {
    "frontend": ["Next.js App Router", "Tailwind CSS"],
    "backend": ["Node.js Express", "Drizzle ORM"],
    "database": ["PostgreSQL Schema Isolation"],
    "apis": ["RESTful V1 Endpoints"],
    "security": ["JWT Authentication", "RBAC Verification"],
    "deployment": ["Docker / Cloud Hosting"]
  },
  "milestonePlan": [
    { "stageNumber": 1, "milestoneCode": "STAGE_01_ACTIVATION", "name": "01 — Activation", "description": "Assignment acceptance & repository binding", "dependencies": [] },
    { "stageNumber": 2, "milestoneCode": "STAGE_02_PRD", "name": "02 — PRD", "description": "Product Requirements Document", "dependencies": [1] },
    { "stageNumber": 3, "milestoneCode": "STAGE_03_TRD", "name": "03 — TRD", "description": "Technical Requirements Document", "dependencies": [2] },
    { "stageNumber": 4, "milestoneCode": "STAGE_04_WORKFLOW", "name": "04 — Application Workflow", "description": "Role journeys & visual workflow", "dependencies": [3] },
    { "stageNumber": 5, "milestoneCode": "STAGE_05_UIUX", "name": "05 — UI/UX Design Brief", "description": "Screen inventory & responsive design system", "dependencies": [4] },
    { "stageNumber": 6, "milestoneCode": "STAGE_06_DATABASE", "name": "06 — Backend & Database Plan", "description": "Entities, tables & index specifications", "dependencies": [5] },
    { "stageNumber": 7, "milestoneCode": "STAGE_07_IMPLEMENTATION", "name": "07 — Implementation Plan", "description": "Executable task breakdown for build phase", "dependencies": [6] },
    { "stageNumber": 8, "milestoneCode": "STAGE_08_FINAL_VERIFICATION", "name": "08 — Implementation & Final Verification", "description": "Implementation Execution, Code Verification & Final Review", "dependencies": [7] }
  ]
}
DO NOT include markdown code blocks around your response JSON. Respond only with raw JSON.`;

				const result = await model.generateContent(
					`${systemPrompt}\n\nProject Prompt:\n"${promptText}"`,
				);
				const responseText = result.response.text().trim();
				const jsonCleaned = responseText
					.replace(/^```json/i, "")
					.replace(/^```/i, "")
					.replace(/```$/i, "")
					.trim();
				return JSON.parse(jsonCleaned) as ProjectAnalysisResult;
			} catch (err) {
				console.warn("[ProjectAnalyzerService] AI analysis fallback:", err);
			}
		}

		// Rule-Based Fallback Project Analysis
		const promptLower = promptText.toLowerCase();
		const isEnterprise =
			promptLower.includes("enterprise") ||
			promptLower.includes("scale") ||
			promptLower.includes("multi");

		return {
			type: promptLower.includes("backend")
				? "Backend API Engine"
				: promptLower.includes("mobile")
					? "Mobile & Web App"
					: "Full-stack Application",
			category: "Software Engineering",
			complexity: isEnterprise ? "Enterprise" : "High",
			users: ["System User", "Workspace Admin", "Executive Approver"],
			roles: ["CEO", "CO-CEO", "Member"],
			coreFeatures: [
				"Role-Based Access Control",
				"Execution Dashboard",
				"8-Stage Milestone Workflow",
				"GitHub Evidence Synchronization",
			],
			technicalRequirements: {
				frontend: ["Next.js 14 App Router", "Tailwind CSS Design System"],
				backend: ["Node.js Express", "Drizzle ORM Engine"],
				database: ["PostgreSQL Multi-Tenant Schema"],
				apis: ["RESTful V1 API Endpoints", "Socket.IO Real-time Events"],
				security: ["JWT Authentication", "Server-side RBAC Validation"],
				deployment: ["Containerized Cloud Infrastructure"],
			},
			milestonePlan: [
				{
					stageNumber: 1,
					milestoneCode: "STAGE_01_ACTIVATION",
					name: "01 — Project Invite & Connect",
					description:
						"Prepare project assignment, invitation & repository binding",
					dependencies: [],
				},
				{
					stageNumber: 2,
					milestoneCode: "STAGE_02_PRD",
					name: "02 — PRD",
					description: "Product Requirements Document",
					dependencies: [1],
				},
				{
					stageNumber: 3,
					milestoneCode: "STAGE_03_TRD",
					name: "03 — TRD",
					description: "Technical Requirements Document",
					dependencies: [2],
				},
				{
					stageNumber: 4,
					milestoneCode: "STAGE_04_WORKFLOW",
					name: "04 — Application Workflow",
					description: "Role journeys & visual workflow",
					dependencies: [3],
				},
				{
					stageNumber: 5,
					milestoneCode: "STAGE_05_UIUX",
					name: "05 — UI/UX Design Brief",
					description: "Screen inventory & responsive design system",
					dependencies: [4],
				},
				{
					stageNumber: 6,
					milestoneCode: "STAGE_06_DATABASE",
					name: "06 — Backend & Database Plan",
					description: "Entities, tables & index specifications",
					dependencies: [5],
				},
				{
					stageNumber: 7,
					milestoneCode: "STAGE_07_IMPLEMENTATION",
					name: "07 — Implementation Plan",
					description: "Executable task breakdown for build phase",
					dependencies: [6],
				},
				{
					stageNumber: 8,
					milestoneCode: "STAGE_08_FINAL_VERIFICATION",
					name: "08 — Implementation & Final Verification",
					description:
						"Implementation Execution, Code Verification & Final Review",
					dependencies: [7],
				},
			],
		};
	}
}
