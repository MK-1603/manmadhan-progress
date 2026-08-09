import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.config";
import { logger } from "./logger.service";

// ─── SDK Client Initialization ───────────────────────────────────────────────
export const geminiClient = env.GEMINI_API_KEY && !env.GEMINI_API_KEY.includes("placeholder")
  ? new GoogleGenerativeAI(env.GEMINI_API_KEY)
  : null;

export const groqClient = env.GROQ_API_KEY && !env.GROQ_API_KEY.includes("placeholder")
  ? new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: 5000, // 5 second timeout for ultra-fast Groq execution
    })
  : null;

// ─── System Instruction for Monorepo Stack ──────────────────────────────────
const SYSTEM_INSTRUCTION = `You are the Lead Systems Architect for the ManMadhan Progress monorepo.
Always write code examples in TypeScript (Node.js, Express, Next.js, React Native/Expo, Cloudinary, Firebase, Neon PostgreSQL).
Do NOT write Python code examples under any circumstances.
Provide concise, clear, structured architectural breakdowns with bullet points and short code blocks.`;

// ─── Per-Provider Health & Quota Tracker ─────────────────────────────────────
interface ProviderHealth {
  hitsToday: number;
  totalHits: number;
  dailyQuotaLimit: number;
  lastError: string | null;
  lastErrorTime: string | null;
  isHealthy: boolean;
  cooldownUntil: number;
}

const COOLDOWN_MS = 60_000;

const providerHealth: Record<string, ProviderHealth> = {
  groq:   { hitsToday: 0, totalHits: 0, dailyQuotaLimit: 14400, lastError: null, lastErrorTime: null, isHealthy: true, cooldownUntil: 0 },
  gemini: { hitsToday: 0, totalHits: 0, dailyQuotaLimit: 1500,  lastError: null, lastErrorTime: null, isHealthy: true, cooldownUntil: 0 },
};

let lastResetDate = new Date().toDateString();
const checkDailyReset = () => {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    for (const p of Object.values(providerHealth)) {
      p.hitsToday = 0;
      p.isHealthy = true;
      p.cooldownUntil = 0;
      p.lastError = null;
      p.lastErrorTime = null;
    }
    lastResetDate = today;
    logger.info("AI Gateway: Daily quota counters reset at midnight.");
  }
};

const markProviderDown = (provider: string, error: string) => {
  const h = providerHealth[provider];
  if (!h) return;
  h.lastError = error;
  h.lastErrorTime = new Date().toISOString();
  h.isHealthy = false;
  h.cooldownUntil = Date.now() + COOLDOWN_MS;
};

const isProviderAvailable = (provider: string): boolean => {
  const h = providerHealth[provider];
  if (!h) return false;

  if (!h.isHealthy && Date.now() > h.cooldownUntil) {
    h.isHealthy = true;
  }
  return h.isHealthy;
};

// ─── Provider Generate Functions ─────────────────────────────────────────────
async function generateWithGroq(prompt: string): Promise<{ text: string; model: string }> {
  if (!groqClient) throw new Error("Groq API key not configured in backend/.env");
  const modelName = env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const response = await groqClient.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: prompt },
    ],
    max_tokens: 512,
    temperature: 0.3,
  });
  providerHealth.groq.hitsToday++;
  providerHealth.groq.totalHits++;
  return {
    text: response.choices[0]?.message?.content || "",
    model: modelName,
  };
}

async function generateWithGemini(prompt: string): Promise<{ text: string; model: string }> {
  if (!geminiClient) throw new Error("Google Gemini API key not configured in backend/.env");
  
  const modelsToTry = ["gemini-3.6-flash", "gemini-flash-latest"];
  let lastErr: any = null;

  for (const modelName of modelsToTry) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini request timed out after 10000ms`)), 10000)
      );

      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise,
      ]);

      providerHealth.gemini.hitsToday++;
      providerHealth.gemini.totalHits++;
      return { text: result.response.text(), model: modelName };
    } catch (err: any) {
      lastErr = err;
      logger.warn({ model: modelName, error: err.message }, `Gemini model ${modelName} returned error/timeout. Trying fallback...`);
    }
  }

  throw lastErr || new Error("All Gemini models failed or timed out");
}

const providerMap: Record<string, { generate: (prompt: string) => Promise<{ text: string; model: string }>; hasClient: boolean }> = {
  groq:   { generate: generateWithGroq,   hasClient: Boolean(groqClient) },
  gemini: { generate: generateWithGemini, hasClient: Boolean(geminiClient) },
};

export interface AIResponsePayload {
  provider: string;
  model: string;
  executionTimeMs: number;
  text: string;
  failoverUsed: boolean;
  failoverTrail?: string[];
}

export const aiService = {
  getMetrics() {
    return {
      metrics: providerHealth,
      configuredProviders: {
        groq: Boolean(groqClient),
        gemini: Boolean(geminiClient),
      },
    };
  },

  async generateWithSmartFailover(
    prompt: string,
    preferredProvider: string = "groq"
  ): Promise<AIResponsePayload> {
    checkDailyReset();
    const startTime = performance.now();

    const allProviders = ["groq", "gemini"];
    const order = [preferredProvider, ...allProviders.filter((p) => p !== preferredProvider)];
    const failoverTrail: string[] = [];

    for (const provider of order) {
      const entry = providerMap[provider];
      if (!entry || !entry.hasClient) continue;

      if (!isProviderAvailable(provider)) {
        const h = providerHealth[provider];
        const secsLeft = Math.ceil((h.cooldownUntil - Date.now()) / 1000);
        failoverTrail.push(`${provider.toUpperCase()}: on cooldown (${secsLeft}s remaining — last error: ${h.lastError})`);
        continue;
      }

      try {
        const res = await entry.generate(prompt);
        const executionTimeMs = Math.round(performance.now() - startTime);

        return {
          provider,
          model: res.model,
          executionTimeMs,
          text: res.text,
          failoverUsed: provider !== preferredProvider,
          failoverTrail: failoverTrail.length > 0 ? failoverTrail : undefined,
        };
      } catch (err: any) {
        const errorMsg = err.message || `${provider} request failed`;
        markProviderDown(provider, errorMsg);
        failoverTrail.push(`${provider.toUpperCase()}: ${errorMsg}`);
        logger.warn(
          { provider, error: errorMsg, cooldownSec: COOLDOWN_MS / 1000 },
          `AI provider "${provider}" failed. Marked unhealthy for ${COOLDOWN_MS / 1000}s cooldown. Trying next...`
        );
      }
    }

    throw new Error(
      `All AI providers are either down, on cooldown, or have no API keys configured.\n\nFailover trail:\n${failoverTrail.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}`
    );
  },
};
