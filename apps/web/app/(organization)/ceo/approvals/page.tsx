"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck, Loader2, AlertCircle, CheckCircle2,
  XCircle, Clock, Calendar, User, RefreshCw, X,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";

type Tab = "tasks" | "extensions" | "leaves";

function timeAgo(d?: string) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}

export default function CEOApprovalsPage() {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [tab, setTab]           = useState<Tab>("tasks");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; type: Tab } | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const { socket } = useSocket();

  const fetch = useCallback(async () => {
    try {
      const wsId = localStorage.getItem("workspaceId");
      if (!wsId) return;
      const res = await apiClient.get(`/org/approvals?workspaceId=${wsId}`);
      if (res.data.success) setData(res.data.data);
      else setError(res.data.error || "Failed to load approvals.");
    } catch { setError("Unable to load approvals."); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    if (!socket) return;
    socket.on("approval.updated", fetch);
    socket.on("request.created", fetch);
    return () => { socket.off("approval.updated", fetch); socket.off("request.created", fetch); };
  }, [socket, fetch]);

  const approveTask = async (id: string) => {
    setActionLoading(id);
    try {
      const wsId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/approvals/tasks/${id}/approve`, { workspaceId: wsId });
      fetch();
    } catch { setError("Failed to approve task."); }
    setActionLoading(null);
  };

  const approveExtension = async (id: string) => {
    setActionLoading(id);
    try {
      const wsId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/approvals/extensions/${id}/approve`, { workspaceId: wsId });
      fetch();
    } catch { setError("Failed to approve extension."); }
    setActionLoading(null);
  };

  const approveLeave = async (id: string) => {
    setActionLoading(id);
    try {
      const wsId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/approvals/leaves/${id}/approve`, { workspaceId: wsId });
      fetch();
    } catch { setError("Failed to approve leave."); }
    setActionLoading(null);
  };

  const reject = async () => {
    if (!rejectModal || !rejectFeedback.trim()) return;
    setActionLoading(rejectModal.id);
    try {
      const wsId = localStorage.getItem("workspaceId");
      const base = rejectModal.type === "tasks" ? "tasks" : rejectModal.type === "extensions" ? "extensions" : "leaves";
      const field = rejectModal.type === "tasks" ? "feedback" : "reason";
      await apiClient.post(`/org/approvals/${base}/${rejectModal.id}/reject`, { workspaceId: wsId, [field]: rejectFeedback });
      setRejectModal(null); setRejectFeedback(""); fetch();
    } catch { setError("Failed to reject."); }
    setActionLoading(null);
  };

  const total = data ? (data.tasks?.length ?? 0) + (data.extensions?.length ?? 0) + (data.leaves?.length ?? 0) : 0;

  const TABS = [
    { id: "tasks",      label: "Task Submissions",     count: data?.tasks?.length      ?? 0 },
    { id: "extensions", label: "Deadline Extensions",  count: data?.extensions?.length  ?? 0 },
    { id: "leaves",     label: "Leave Requests",       count: data?.leaves?.length      ?? 0 },
  ] as const;

  const ApproveBtn = ({ id, onApprove }: { id: string; onApprove: (id: string) => void }) => (
    <button
      onClick={() => onApprove(id)}
      disabled={actionLoading === id}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold hover:bg-gold-hover text-[#111827] text-[11px] font-bold transition-colors disabled:opacity-50"
    >
      {actionLoading === id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
      Approve
    </button>
  );

  const RejectBtn = ({ id, type }: { id: string; type: Tab }) => (
    <button
      onClick={() => { setRejectModal({ id, type }); setRejectFeedback(""); }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <XCircle className="w-3 h-3" /> Reject
    </button>
  );

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1100px] mx-auto space-y-5">

      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">ManMadhan · CEO</p>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none">Approvals</h1>
            {total > 0 && (
              <span className="w-6 h-6 rounded-full bg-gold text-[#111827] text-[10px] font-bold flex items-center justify-center">
                {total}
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground mt-1.5">Review and approve pending task, deadline, and leave requests.</p>
        </div>
        <button
          onClick={fetch}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-[12px] font-semibold text-foreground transition-colors self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* ── tabs ── */}
      <div className="flex gap-0 border-b border-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`
              flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors -mb-px
              ${tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}
            `}
          >
            {t.label}
            {t.count > 0 && (
              <span className="w-4 h-4 rounded-full bg-gold text-[#111827] text-[9px] font-bold flex items-center justify-center">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </div>
      ) : (
        <>
          {/* Task Submissions */}
          {tab === "tasks" && (
            <div>
              {!data?.tasks?.length ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center border border-border border-dashed rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground/30" />
                  <p className="text-[13px] font-semibold text-foreground">No pending task approvals</p>
                  <p className="text-[12px] text-muted-foreground">All submitted tasks are up to date.</p>
                </div>
              ) : (
                <div className="border border-border rounded-2xl overflow-hidden bg-card divide-y divide-border">
                  {data.tasks.map((task: any) => (
                    <div key={task.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-[13px] font-semibold text-foreground">{task.title}</p>
                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                          {task.assigneeName && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.assigneeName}</span>
                          )}
                          {task.projectName && <span>{task.projectName}</span>}
                          {task.submittedAt && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(task.submittedAt)}</span>
                          )}
                          {task.priority && task.priority !== "Medium" && (
                            <span className="font-semibold text-foreground">{task.priority}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ApproveBtn id={task.id} onApprove={approveTask} />
                        <RejectBtn id={task.id} type="tasks" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deadline Extensions */}
          {tab === "extensions" && (
            <div>
              {!data?.extensions?.length ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center border border-border border-dashed rounded-2xl">
                  <Calendar className="w-5 h-5 text-muted-foreground/30" />
                  <p className="text-[13px] font-semibold text-foreground">No pending extension requests</p>
                </div>
              ) : (
                <div className="border border-border rounded-2xl overflow-hidden bg-card divide-y divide-border">
                  {data.extensions.map((ext: any) => (
                    <div key={ext.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-[13px] font-semibold text-foreground">{ext.taskTitle || "Task"}</p>
                        <p className="text-[12px] text-muted-foreground">Requested by <span className="text-foreground font-medium">{ext.userName}</span></p>
                        {ext.reason && <p className="text-[12px] text-muted-foreground">{ext.reason}</p>}
                        {ext.proposedDeadline && (
                          <p className="text-[11px] text-muted-foreground">
                            Proposed: <span className="font-semibold text-foreground">{new Date(ext.proposedDeadline).toLocaleDateString()}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ApproveBtn id={ext.id} onApprove={approveExtension} />
                        <RejectBtn id={ext.id} type="extensions" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Leave Requests */}
          {tab === "leaves" && (
            <div>
              {!data?.leaves?.length ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center border border-border border-dashed rounded-2xl">
                  <User className="w-5 h-5 text-muted-foreground/30" />
                  <p className="text-[13px] font-semibold text-foreground">No pending leave requests</p>
                </div>
              ) : (
                <div className="border border-border rounded-2xl overflow-hidden bg-card divide-y divide-border">
                  {data.leaves.map((leave: any) => (
                    <div key={leave.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-foreground">{leave.type} Leave</p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border">Pending</span>
                        </div>
                        <p className="text-[12px] text-muted-foreground">
                          Requested by <span className="text-foreground font-medium">{leave.userName}</span>
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                        </p>
                        {leave.reason && <p className="text-[12px] text-muted-foreground">{leave.reason}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ApproveBtn id={leave.id} onApprove={approveLeave} />
                        <RejectBtn id={leave.id} type="leaves" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── reject modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold text-foreground">Reject — Reason Required</p>
              <button onClick={() => setRejectModal(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              autoFocus
              rows={3}
              value={rejectFeedback}
              onChange={e => setRejectFeedback(e.target.value)}
              placeholder="Provide a clear reason for rejection..."
              className="w-full px-3.5 py-3 bg-background border border-border rounded-xl text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold resize-none"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectFeedback(""); }}
                className="px-4 py-2 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                disabled={!rejectFeedback.trim() || !!actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border text-[12px] font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
