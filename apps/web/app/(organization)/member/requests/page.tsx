"use client";

import { useState, useEffect, useCallback } from "react";
import { Inbox, Loader2, AlertCircle, Plus, Calendar, User, Clock } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import { motion, AnimatePresence } from "framer-motion";

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    "Pending": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Approved": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Rejected": "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

export default function MemberRequestsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"extensions" | "leaves">("leaves");
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveType, setLeaveType] = useState("Casual");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { socket } = useSocket();

  const fetchRequests = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/org/approvals/requests?workspaceId=${workspaceId}`);
      if (res.data.success) setData(res.data.data);
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

  const handleLeaveSubmit = async () => {
    if (!leaveStart || !leaveEnd || !leaveReason.trim()) return;
    setSubmitting(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post("/org/approvals/leaves", {
        workspaceId, type: leaveType,
        startDate: leaveStart, endDate: leaveEnd, reason: leaveReason,
      });
      if (res.data.success) {
        setShowLeaveForm(false); setLeaveReason(""); setLeaveStart(""); setLeaveEnd("");
        fetchRequests();
      } else {
        setError(res.data.error || "Failed to submit");
      }
    } catch { setError("Failed to submit leave request"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6 text-primary" /> My Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Deadline extensions and leave requests</p>
        </div>
        <button
          onClick={() => { setShowLeaveForm(true); setTab("leaves"); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* Leave Request Form */}
      <AnimatePresence>
        {showLeaveForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <PremiumCard className="border-primary/20">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> New Leave Request
              </h3>
              <div className="grid sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Leave Type</label>
                  <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
                    {["Casual", "Sick", "Annual"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Start Date</label>
                  <input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">End Date</label>
                  <input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} min={leaveStart || new Date().toISOString().split("T")[0]} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Reason</label>
                <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} rows={3} placeholder="Briefly explain your reason for leave..." className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleLeaveSubmit}
                  disabled={submitting || !leaveStart || !leaveEnd || !leaveReason.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Submit Request
                </button>
                <button onClick={() => setShowLeaveForm(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </PremiumCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { id: "leaves", label: "Leave Requests", count: data?.leaves?.length || 0 },
          { id: "extensions", label: "Deadline Extensions", count: data?.extensions?.length || 0 },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
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
          {tab === "leaves" && (
            <div className="space-y-3">
              {!data?.leaves?.length ? (
                <div className="text-center py-12">
                  <User className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No leave requests yet</p>
                  <button onClick={() => setShowLeaveForm(true)} className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">Request Leave</button>
                </div>
              ) : data.leaves.map((leave: any) => (
                <PremiumCard key={leave.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{leave.type} Leave</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(leave.status)}`}>{leave.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(leave.startDate).toLocaleDateString()} → {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                      {leave.reason && <p className="text-xs text-foreground mt-1">{leave.reason}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {new Date(leave.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          )}

          {tab === "extensions" && (
            <div className="space-y-3">
              {!data?.extensions?.length ? (
                <div className="text-center py-12">
                  <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No deadline extension requests</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Request extensions from your task page</p>
                </div>
              ) : data.extensions.map((ext: any) => (
                <PremiumCard key={ext.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{ext.taskTitle || "Task"}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(ext.status)}`}>{ext.status}</span>
                      </div>
                      <p className="text-xs text-foreground">{ext.reason}</p>
                      <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Proposed: {new Date(ext.proposedDeadline).toLocaleDateString()}
                      </p>
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
