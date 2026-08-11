"use client";

import { useState, useEffect, useCallback } from "react";
import { Inbox, Loader2, AlertCircle, Calendar, User, Clock, CheckCircle2, XCircle } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    "Pending": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Approved": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Rejected": "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

export default function CEORequestsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"extensions" | "leaves">("extensions");
  const { socket } = useSocket();

  const fetchRequests = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/org/approvals/requests?workspaceId=${workspaceId}`);
      if (res.data.success) setData(res.data.data);
      else setError(res.data.error || "Failed to load requests");
    } catch { setError("Unable to load requests"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => {
    if (!socket) return;
    socket.on("request.created", fetchRequests);
    socket.on("request.updated", fetchRequests);
    return () => { socket.off("request.created"); socket.off("request.updated"); };
  }, [socket, fetchRequests]);

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Inbox className="w-6 h-6 text-primary" /> Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">All deadline extension and leave requests</p>
      </div>

      {error && <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}

      <div className="flex gap-1 border-b border-border">
        {([
          { id: "extensions", label: "Deadline Extensions", count: data?.extensions?.length || 0 },
          { id: "leaves", label: "Leave Requests", count: data?.leaves?.length || 0 },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
            {t.count > 0 && <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {tab === "extensions" && (
            <div className="space-y-3">
              {!data?.extensions?.length ? (
                <div className="text-center py-12"><Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No deadline extension requests</p></div>
              ) : data.extensions.map((ext: any) => (
                <PremiumCard key={ext.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{ext.taskTitle || "Task"}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(ext.status)}`}>{ext.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">By: {ext.userName}</p>
                      <p className="text-xs text-foreground mt-1">Reason: {ext.reason}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-blue-500" /> Proposed: {new Date(ext.proposedDeadline).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Requested: {new Date(ext.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          )}

          {tab === "leaves" && (
            <div className="space-y-3">
              {!data?.leaves?.length ? (
                <div className="text-center py-12"><User className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No leave requests</p></div>
              ) : data.leaves.map((leave: any) => (
                <PremiumCard key={leave.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{leave.type} Leave</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(leave.status)}`}>{leave.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">By: {leave.userName}</p>
                      <p className="text-xs text-foreground mt-0.5">{new Date(leave.startDate).toLocaleDateString()} → {new Date(leave.endDate).toLocaleDateString()}</p>
                      {leave.reason && <p className="text-xs text-muted-foreground mt-0.5">Reason: {leave.reason}</p>}
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
