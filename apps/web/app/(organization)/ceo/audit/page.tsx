"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Loader2, AlertCircle, Search, RefreshCw, Filter } from "lucide-react";
import apiClient from "@/lib/api-client";

const EVENT_TYPES = [
  "All",
  "PROJECT_CREATED","PROJECT_UPDATED","PROJECT_DELETED",
  "TASK_CREATED","TASK_STATUS_UPDATE","TASK_APPROVED","TASK_REJECTED","TASK_DELETED",
  "DEADLINE_CHANGED","MILESTONE_CREATED","MILESTONE_APPROVED",
  "INVITATION_SENT","MEMBER_ACTIVATED",
  "LOGIN_SUCCESS",
];

function eventDot(type: string) {
  if (type.includes("CREATED") || type.includes("APPROVED") || type.includes("SUCCESS") || type.includes("ACTIVATED"))
    return "bg-emerald-500";
  if (type.includes("DELETED") || type.includes("REJECTED"))
    return "bg-red-500";
  if (type.includes("UPDATED") || type.includes("STATUS") || type.includes("CHANGED"))
    return "bg-blue-500";
  if (type.includes("INVITED") || type.includes("SENT"))
    return "bg-purple-500";
  return "bg-muted-foreground/40";
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function CEOAuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [page, setPage]     = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetch = useCallback(async (p = 1, append = false) => {
    if (p === 1) setLoading(true);
    try {
      const wsId = localStorage.getItem("workspaceId");
      if (!wsId) return;
      const res = await apiClient.get(`/org/approvals/audit?workspaceId=${wsId}&page=${p}&limit=50`);
      if (res.data.success) {
        const data = res.data.data || [];
        setEvents(prev => append ? [...prev, ...data] : data);
        setHasMore(data.length === 50);
      } else setError("Failed to load audit log.");
    } catch { setError("Unable to load audit log."); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    const matchSearch =
      (e.details  || "").toLowerCase().includes(q) ||
      (e.userName || "").toLowerCase().includes(q) ||
      (e.eventType|| "").toLowerCase().includes(q);
    const matchType = typeFilter === "All" || e.eventType === typeFilter;
    return matchSearch && matchType;
  });

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetch(next, true);
  };

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1200px] mx-auto space-y-5">

      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">ManMadhan · CEO</p>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none">Audit Log</h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">Complete read-only organization activity history.</p>
        </div>
        <button
          onClick={() => { setPage(1); fetch(1); }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-[12px] font-semibold text-foreground transition-colors self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
          <button onClick={() => fetch()} className="ml-auto font-semibold text-foreground hover:text-gold transition-colors">Retry</button>
        </div>
      )}

      {/* ── filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by event, user, or details..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 bg-card border border-border rounded-xl text-[12px] font-medium text-foreground focus:outline-none focus:border-gold appearance-none"
          >
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>{t === "All" ? "All Events" : t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <ShieldCheck className="w-5 h-5 text-muted-foreground/30" />
          <p className="text-[13px] font-semibold text-foreground">No events found</p>
          <p className="text-[12px] text-muted-foreground">
            {search || typeFilter !== "All" ? "Try adjusting your filters." : "Audit events will appear here."}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          {/* head */}
          <div className="hidden sm:grid grid-cols-[200px_160px_1fr_100px] gap-4 px-5 py-3 bg-muted/30 border-b border-border">
            {["Event","Actor","Details","Time"].map(h => (
              <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-border">
            {filtered.map((ev, i) => (
              <div key={ev.id || i} className="grid grid-cols-1 sm:grid-cols-[200px_160px_1fr_100px] gap-2 sm:gap-4 items-start px-5 py-3.5 hover:bg-muted/20 transition-colors">

                {/* event type */}
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${eventDot(ev.eventType)}`} />
                  <span className="text-[11px] font-semibold text-foreground">
                    {(ev.eventType || "").replace(/_/g, " ")}
                  </span>
                </div>

                {/* actor */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                    {(ev.userName || ev.userEmail || "S").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {ev.userName || ev.userEmail || "System"}
                  </span>
                </div>

                {/* details */}
                <p className="text-[12px] text-muted-foreground line-clamp-2">
                  {ev.details || "—"}
                </p>

                {/* time */}
                <div className="text-right">
                  <p className="text-[11px] font-mono text-muted-foreground">{timeAgo(ev.createdAt)}</p>
                  <p className="text-[10px] text-muted-foreground/60">{new Date(ev.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="px-5 py-4 border-t border-border flex justify-center">
              <button
                onClick={loadMore}
                className="px-5 py-2 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
