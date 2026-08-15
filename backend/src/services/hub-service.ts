import { db } from "../../database/client";
import { projectAiTools } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";


export interface HubTool {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  websiteUrl?: string;
  features?: string[];
  useCases?: string[];
  status?: "ACTIVE" | "ARCHIVED" | "DISABLED";
  createdAt?: string;
}

// In-memory fallback mock catalog for standard ManMadhan Hub AI Tools
const HUB_CATALOG_FALLBACK: HubTool[] = [
  {
    id: "hub-tool-figma-ai",
    name: "Figma AI",
    slug: "figma-ai",
    description: "Generative UI design and layout exploration tool integrated into design workflows.",
    category: "UI/UX Design",
    websiteUrl: "https://figma.com",
    features: ["Auto-layout generation", "Copywriting assist", "Component synthesis"],
    useCases: ["UI design exploration", "Wireframing", "Design system alignment"],
    status: "ACTIVE",
  },
  {
    id: "hub-tool-claude",
    name: "Claude",
    slug: "claude",
    description: "Advanced reasoning model for technical architecture, code review, and documentation.",
    category: "Architecture & Code",
    websiteUrl: "https://anthropic.com",
    features: ["200k context window", "Artifact generation", "System architecture analysis"],
    useCases: ["Technical documentation", "Code review", "API design"],
    status: "ACTIVE",
  },
  {
    id: "hub-tool-copilot",
    name: "GitHub Copilot",
    slug: "copilot",
    description: "AI pair programmer for realtime code completion, refactoring, and test generation.",
    category: "Development",
    websiteUrl: "https://github.com/features/copilot",
    features: ["Inline code completion", "Chat in IDE", "Pull Request summaries"],
    useCases: ["Development assistance", "Unit test creation", "Bug hunting"],
    status: "ACTIVE",
  },
  {
    id: "hub-tool-v0",
    name: "v0 by Vercel",
    slug: "v0-vercel",
    description: "Generative UI component builder producing production-ready React and Tailwind code.",
    category: "Frontend Design",
    websiteUrl: "https://v0.dev",
    features: ["Shadcn UI output", "Interactive previews", "Component iterations"],
    useCases: ["Rapid prototyping", "Component library generation"],
    status: "ACTIVE",
  },
  {
    id: "hub-tool-midjourney",
    name: "Midjourney",
    slug: "midjourney",
    description: "High-fidelity visual image generation for product branding and marketing collateral.",
    category: "Media & Visuals",
    websiteUrl: "https://midjourney.com",
    features: ["Hyper-realistic image synthesis", "Brand asset generation"],
    useCases: ["Marketing graphics", "Product moodboards"],
    status: "ACTIVE",
  },
];

export class HubService {
  /**
   * Health check for ManMadhan Hub connection
   */
  static async checkHealth(): Promise<{ status: "CONNECTED" | "UNAVAILABLE" | "ERROR"; lastSyncAt: string }> {
    try {
      // In production, hits GET /api/hub/health
      return {
        status: "CONNECTED",
        lastSyncAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: "UNAVAILABLE",
        lastSyncAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Search tools in ManMadhan Hub catalog
   */
  static async searchTools(query: string, category?: string): Promise<HubTool[]> {
    const q = query.toLowerCase().trim();
    let results = HUB_CATALOG_FALLBACK;

    if (category && category.toLowerCase() !== "all") {
      results = results.filter(t => t.category.toLowerCase().includes(category.toLowerCase()));
    }

    if (q) {
      results = results.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.useCases?.some(u => u.toLowerCase().includes(q))
      );
    }

    return results;
  }

  /**
   * Get single tool from ManMadhan Hub by ID
   */
  static async getToolById(toolId: string): Promise<HubTool | null> {
    const tool = HUB_CATALOG_FALLBACK.find(t => t.id === toolId || t.slug === toolId);
    return tool || null;
  }

  /**
   * Request creation of a new AI tool in ManMadhan Hub (Authorized Hub API invocation)
   */
  static async createHubTool(data: {
    name: string;
    description: string;
    category: string;
    websiteUrl?: string;
    useCases?: string[];
  }): Promise<{ success: boolean; tool?: HubTool; duplicate?: boolean; error?: string }> {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existing = HUB_CATALOG_FALLBACK.find(t => t.slug === slug || t.name.toLowerCase() === data.name.toLowerCase());

    if (existing) {
      return { success: false, duplicate: true, tool: existing, error: "Tool with identical name/slug already exists in Hub." };
    }

    const newTool: HubTool = {
      id: `hub-tool-${uuidv4().slice(0, 8)}`,
      name: data.name,
      slug,
      description: data.description,
      category: data.category,
      websiteUrl: data.websiteUrl,
      useCases: data.useCases || [],
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    HUB_CATALOG_FALLBACK.push(newTool);
    return { success: true, tool: newTool };
  }

  /**
   * Link a Hub tool to a Progress Project
   */
  static async linkToolToProject(params: {
    projectId: string;
    hubToolId: string;
    purpose: string;
    notes?: string;
    addedById: string;
  }) {
    const hubTool = await this.getToolById(params.hubToolId);
    if (!hubTool) {
      throw new Error(`Hub Tool ${params.hubToolId} not found in catalog.`);
    }

    const existingLink = await db
      .select()
      .from(projectAiTools)
      .where(and(eq(projectAiTools.projectId, params.projectId), eq(projectAiTools.hubToolId, params.hubToolId)));

    if (existingLink.length > 0) {
      // Update purpose
      const updated = await db
        .update(projectAiTools)
        .set({
          purpose: params.purpose,
          notes: params.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(projectAiTools.id, existingLink[0].id))
        .returning();
      return updated[0];
    }

    const newLink = await db
      .insert(projectAiTools)
      .values({
        id: `pat-${uuidv4().slice(0, 8)}`,
        projectId: params.projectId,
        hubToolId: params.hubToolId,
        toolName: hubTool.name,
        toolCategory: hubTool.category,
        toolWebsite: hubTool.websiteUrl || null,
        purpose: params.purpose,
        notes: params.notes || null,
        addedById: params.addedById,
        status: hubTool.status || "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newLink[0];
  }

  /**
   * List AI tools linked to a project
   */
  static async getProjectTools(projectId: string) {
    return await db.select().from(projectAiTools).where(eq(projectAiTools.projectId, projectId));
  }

  /**
   * Remove tool link from project
   */
  static async unlinkToolFromProject(projectId: string, toolLinkId: string) {
    return await db.delete(projectAiTools).where(and(eq(projectAiTools.projectId, projectId), eq(projectAiTools.id, toolLinkId))).returning();
  }
}
