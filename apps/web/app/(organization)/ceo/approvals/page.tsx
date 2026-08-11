"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardCheck, Loader2, AlertCircle, CheckCircle2, XCircle, Eye, Clock, Calendar, User, RefreshCw } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "tasks" | "extensions" | "leaves";

export default function CEOApprovalsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("tasks");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; type: "task" | "extension" | "leave" } | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const { socket } = useSocket();

  const fetchApprovals = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/org/approvals?workspaceId=${workspaceId}`);
      if (res.data.success) setData(res.data.data);
      else setError(res.data.error || "Failed to load approvals");
    } catch { setError("Unable to load approvals. Please try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  useEffect(() => {
    if (!socket) return;
    socket.on("approval.updated", fetchApprovals);
    socket.on("request.created", fetchApprovals);
    return () => { socket.off("approval.updated"); socket.off("request.created"); };
  }, [socket, fetchApprovals]);

  const handleApproveTask = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/approvals/tasks/${taskId}/approve`, { workspaceId });
      fetchApprovals();
    } catch { setError("Failed to approve task"); }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectFeedback.trim()) return;
    setActionLoading(rejectModal.id);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (rejectModal.type === "task") {
        await apiClient.post(`/org/approvals/tasks/${rejectModal.id}/reject`, { workspaceId, feedback: rejectFeedback });
      } else if (rejectModal.type === "extension") {
        await apiClient.post(`/org/approvals/extensions/${rejectModal.id}/reject`, { workspaceId, reason: rejectFeedback });
      } else if (rejectModal.type === "leave") {
        await apiClient.post(`/org/approvals/leaves/${rejectModal.id}/reject`, { workspaceId, reason: rejectFeedback });
      }
      setRejectModal(null); setRejectFeedback(""); fetchApprovals();
    } catch { setError("Failed to reject"); }
    setActionLoading(null);
  };

  const handleApproveExtension = async (extId: string) => {
    setActionLoading(extId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/approvals/extensions/${extId}/approve`, { workspaceId });
      fetchApprovals();
    } catch { setError("Failed to approve extension"); }
    setActionLoading(null);
  };

  const handleApproveLeave = async (leaveId: string) => {
    setActionLoading(leaveId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/approvals/leaves/${leaveId}/approve`, { workspaceId });
      fetchApprovals();
    } catch { setError("Failed to approve leave"); }
    setActionLoading(null);
  };

  const total = data ? (data.tasks?.length || 0) + (data.extensions?.length || 0) + (data.leaves?.length || 0) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" /> Approvals
            {total > 0 && <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">{total}</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve pending requests</p>
        </div>
        <button onClick={fetchApprovals} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {error && <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { id: "tasks", label: "Task Submissions", count: data?.tasks?.length || 0 },
          { id: "extensions", label: "Deadline Extensions", count: data?.extensions?.length || 0 },
          { id: "leaves", label: "Leave Requests", count: data?.leaves?.length || 0 },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
            {t.count > 0 && <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Task Submissions */}
          {tab === "tasks" && (
            <div className="space-y-3">
              {!data?.tasks?.length ? (
                <div className="text-center py-12"><CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No pending task approvals</p></div>
              ) : data.tasks.map((task: any) => (
                <PremiumCard key={task.id}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {task.assigneeName && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.assigneeName}</span>}
                        {task.projectName && <span>📁 {task.projectName}</span>}
                        {task.submittedAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Submitted {new Date(task.submittedAt).toLocaleDateString()}</span>}
                        <span className={`font-semibold ${task.priority === "Urgent" ? "text-rose-500" : task.priority === "High" ? "text-orange-500" : "text-foreground"}`}>{task.priority}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveTask(task.id)}
                        disabled={actionLoading === task.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500/90 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: task.id, type: "task" })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold rounded-lg hover:bg-rose-500/20 transition-colors"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          )}

          {/* Deadline Extensions */}
          {tab === "extensions" && (
            <div className="space-y-3">
              {!data?.extensions?.length ? (
                <div className="text-center py-12"><Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No pending deadline extension requests</p></div>
              ) : data.extensions.map((ext: any) => (
                <PremiumCard key={ext.id}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">{ext.taskTitle || "Task"}</h3>
                      <p className="text-xs text-muted-foreground mt-1">Requested by: {ext.userName}</p>
                      <p className="text-xs text-foreground mt-1">Reason: {ext.reason}</p>
                      <p className="text-xs text-blue-500 mt-0.5">Proposed deadline: {new Date(ext.proposedDeadline).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleApproveExtension(ext.id)} disabled={actionLoading === ext.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500/90 disabled:opacity-50 transition-colors">
                        {actionLoading === ext.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
                      </button>
                      <button onClick={() => setRejectModal({ id: ext.id, type: "extension" })} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold rounded-lg hover:bg-rose-500/20 transition-colors">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          )}

          {/* Leave Requests */}
          {tab === "leaves" && (
            <div className="space-y-3">
              {!data?.leaves?.length ? (
                <div className="text-center py-12"><User className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No pending leave requests</p></div>
              ) : data.leaves.map((leave: any) => (
                <PremiumCard key={leave.id}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{leave.type} Leave</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-amber-500 bg-amber-500/10 border-amber-500/20">Pending</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Requested by: {leave.userName}</p>
                      <p className="text-xs text-foreground mt-0.5">{new Date(leave.startDate).toLocaleDateString()} → {new Date(leave.endDate).toLocaleDateString()}</p>
                      {leave.reason && <p className="text-xs text-muted-foreground mt-0.5">Reason: {leave.reason}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleApproveLeave(leave.id)} disabled={actionLoading === leave.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500/90 disabled:opacity-50 transition-colors">
                        {actionLoading === leave.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
                      </button>
                      <button onClick={() => setRejectModal({ id: leave.id, type: "leave" })} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold rounded-lg hover:bg-rose-500/20 transition-colors">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRejectModal(null)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-sm font-bold text-foreground mb-3">Reject — Provide Reason</h3>
              <textarea
                value={rejectFeedback}
                onChange={e => setRejectFeedback(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => { setRejectModal(null); setRejectFeedback(""); }} className="flex-1 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
                <button onClick={handleReject} disabled={!rejectFeedback.trim() || !!actionLoading} className="flex-1 py-2 bg-rose-500 text-white rounded-lg text-sm font-semibold hover:bg-rose-500/90 disabled:opacity-50 transition-colors">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Reject"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
