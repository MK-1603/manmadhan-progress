"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Loader2, AlertCircle, Search, Filter, ChevronDown } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";

const EVENT_TYPES = ["All", "PROJECT_CREATED", "PROJECT_UPDATED", "PROJECT_DELETED", "TASK_CREATED", "TASK_STATUS_UPDATE", "TASK_APPROVED", "TASK_REJECTED", "TASK_DELETED", "DEADLINE_EXTENSION_APPROVED", "LEAVE_APPROVED", "LOGIN_SUCCESS"];

const eventIcon = (type: string) => {
  const icons: Record<string, string> = {
    PROJECT_CREATED: "📁", PROJECT_UPDATED: "✏️", PROJECT_DELETED: "🗑️",
    TASK_CREATED: "✅", TASK_STATUS_UPDATE: "🔄", TASK_APPROVED: "✔️", TASK_REJECTED: "✖️",
    TASK_DELETED: "🗑️", DEADLINE_EXTENSION_APPROVED: "📅", LEAVE_APPROVED: "🏖️",
    LOGIN_SUCCESS: "🔑", INVITATION_SENT: "📧",
  };
  return icons[type] || "📌";
};

const eventBadgeColor = (type: string) => {
  if (type.includes("CREATED") || type.includes("APPROVED") || type.includes("SUCCESS")) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  if (type.includes("DELETED") || type.includes("REJECTED")) return "text-rose-500 bg-rose-500/10 border-rose-500/20";
  if (type.includes("UPDATED") || type.includes("STATUS")) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
  return "text-muted-foreground bg-muted border-border";
};

function timeAgo(d: string) {
  const secs = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function CEOAuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchAudit = useCallback(async (p = 1, append = false) => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/org/approvals/audit?workspaceId=${workspaceId}&page=${p}&limit=50`);
      if (res.data.success) {
        const data = res.data.data || [];
        setEvents(prev => append ? [...prev, ...data] : data);
        setHasMore(data.length === 50);
      }
    } catch { setError("Unable to load audit log"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const filtered = events.filter(e => {
    const s = search.toLowerCase();
    const matchSearch = (e.details || "").toLowerCase().includes(s) || (e.userName || "").toLowerCase().includes(s) || (e.eventType || "").toLowerCase().includes(s);
    const matchType = typeFilter === "All" || e.eventType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" /> Audit Log
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Complete read-only organization activity history</p>
      </div>

      {error && <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audit log..." className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t === "All" ? "All Events" : t.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16"><ShieldCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No audit events found</p></div>
      ) : (
        <PremiumCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-left">Event</th>
                  <th className="px-5 py-3.5 text-left">User</th>
                  <th className="px-5 py-3.5 text-left">Details</th>
                  <th className="px-5 py-3.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev, i) => (
                  <tr key={ev.id || i} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{eventIcon(ev.eventType)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${eventBadgeColor(ev.eventType)}`}>
                          {ev.eventType.replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-foreground">{ev.userName || ev.userEmail || "System"}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-[300px] truncate">{ev.details || "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="text-xs text-muted-foreground">
                        <p>{timeAgo(ev.createdAt)}</p>
                        <p className="text-[10px]">{new Date(ev.createdAt).toLocaleString()}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="p-4 text-center border-t border-border">
              <button onClick={() => { const next = page + 1; setPage(next); fetchAudit(next, true); }} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-accent transition-colors">
                Load more
              </button>
            </div>
          )}
        </PremiumCard>
      )}
    </div>
  );
}
