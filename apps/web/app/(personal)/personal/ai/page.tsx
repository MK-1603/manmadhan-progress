"use client";

import { useState } from "react";
import apiClient from "@/lib/api-client";

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true); setError(null); setResponse(null);
    try {
      const result = await apiClient.post("/ai/generate", { prompt: prompt.trim() });
      setResponse(result.data?.response ?? result.data?.data?.response ?? "The configured AI provider returned no content.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI is unavailable");
    } finally { setLoading(false); }
  };

  return <div className="min-h-full p-6 md:p-10"><div className="mx-auto max-w-3xl"><p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Intelligence</p><h1 className="mt-2 text-3xl font-bold">AI Assistant</h1><p className="mt-2 text-sm text-muted-foreground">Ask the configured provider about your workspace. Responses are never simulated.</p><form onSubmit={submit} className="mt-8 space-y-3"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-32 w-full rounded-2xl border border-border bg-card p-4 text-sm outline-none focus:border-gold" placeholder="Ask a question about your work…" /><button disabled={loading || !prompt.trim()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{loading ? "Thinking…" : "Ask assistant"}</button></form>{error && <p className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">{error}</p>}{response && <div className="mt-5 whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-sm leading-7">{response}</div>}</div></div>;
}
