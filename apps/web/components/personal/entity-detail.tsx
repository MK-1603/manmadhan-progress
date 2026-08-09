"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";

export function EntityDetail({ title, endpoint }: { title: string; endpoint: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { void apiClient.get(endpoint).then((result) => setData(result.data?.data ?? null)).catch((err) => setError(err instanceof Error ? err.message : "Unable to load record")).finally(() => setLoading(false)); }, [endpoint]);
  return <div className="min-h-full p-6 md:p-10"><div className="mx-auto max-w-3xl"><p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Personal Workspace</p><h1 className="mt-2 text-3xl font-bold">{title}</h1>{loading ? <p className="mt-8 text-sm text-muted-foreground">Loading…</p> : error ? <p className="mt-8 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">{error}</p> : !data ? <p className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">This record does not exist.</p> : <div className="mt-8 space-y-3 rounded-2xl border border-border bg-card p-6">{Object.entries(data).filter(([, value]) => value !== null && typeof value !== "object").map(([key, value]) => <div key={key} className="flex justify-between gap-6 border-b border-border/60 py-3 last:border-0"><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{key.replace(/[A-Z]/g, (letter) => ` ${letter}`).trim()}</span><span className="text-right text-sm">{String(value)}</span></div>)}</div>}</div></div>;
}
