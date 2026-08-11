"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  CheckCircle2, XCircle, Clock, MessageSquare, ChevronDown,
  AlertCircle, Loader2, RefreshCw, ClipboardCheck, ArrowLeft,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import Link from "next/link";

type Tab = "pending" | "approved" | "rejected" | "changes";

const STATUS_COLOR: Record<string, string> = {
  pending:  "bg-gold/10 text-gold border-gold/20",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  changes:  "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function CoCeoApprovalsPage() {
  const { socket } = useSocket();
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const wsId = localStorage.getItem("workspaceId");
      const res = await apiClient.get(`/org/approvals?workspaceId=${wsId}`);
      if (res.data?.success) setItems(res.data.data?.tasks || res.data.data || []);
      else setError(res.data?.error || "Failed to load approvals");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated", fetchApprovals);
    socket.on("approval.updated", fetchApprovals);
    return () => {
      socket.off("task.updated", fetchApprovals);
      socket.off("approval.updated", fetchApprovals);
    };
  }, [socket, fetchApprovals]);

  const filterItems = (t: Tab) => {
    return items.filter(item => {
      const s = (item.status || "").toLowerCase();
      if (t === "pending")  return s.includes("pending") || s.includes("submitted");
      if (t === "approved") return s.includes("approved") || s.includes("completed");
      if (t === "rejected") return s.includes("rejected") || s.includes("declined");
      if (t === "changes")  return s.includes("changes") || s.includes("revision");
      return false;
    });
  };

  const doAction = async (taskId: string, action: "approve" | "request_changes", comment?: string) => {
    setActionLoading(taskId);
    try {
      const wsId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/approvals/${taskId}/${action}?workspaceId=${wsId}`, { comment });
      setFeedbackId(null);
      setFeedbackText("");
      await fetchApprovals();
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "pending",  label: "Pending",           icon: Clock },
    { key: "approved", label: "Approved",           icon: CheckCircle2 },
    { key: "rejected", label: "Rejected",           icon: XCircle },
    { key: "changes",  label: "Changes Requested",  icon: MessageSquare },
  ];

  const visible = filterItems(tab);

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/co-ceo/dashboard" className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              CO-CEO · Team Management
            </p>
            <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-gold" /> Approvals
            </h1>
          </div>
        </div>
        <button onClick={fetchApprovals} className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-[12px] text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              tab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
            {filterItems(t.key).length > 0 && (
              <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                tab === t.key ? "bg-gold text-[#111827]" : "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {filterItems(t.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-gold" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <ClipboardCheck className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-[14px] font-semibold text-foreground">No {tab} approvals</p>
          <p className="text-[12px] text-muted-foreground max-w-xs">
            {tab === "pending" ? "No submissions waiting for your review." : `No ${tab} items to show.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item: any) => (
            <div key={item.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${STATUS_COLOR[tab] || STATUS_COLOR.pending}`}>
                      {item.status}
                    </span>
                    {item.priority && (
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        {item.priority} Priority
                      </span>
                    )}
                  </div>
                  <h3 className="text-[14px] font-bold text-foreground">{item.title}</h3>
                  {item.assigneeName && (
                    <p className="text-[12px] text-muted-foreground mt-1">
                      Submitted by <span className="font-semibold text-foreground">{item.assigneeName}</span>
                      {item.submittedAt && <span> · {timeAgo(item.submittedAt)}</span>}
                    </p>
                  )}
                </div>
              </div>

              {item.submissionSummary && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Submission Summary</p>
                  <p className="text-[12px] text-foreground">{item.submissionSummary}</p>
                </div>
              )}

              {tab === "pending" && (
                <>
                  {feedbackId === item.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                        placeholder="Describe the changes needed..."
                        className="w-full p-3 rounded-xl border border-border bg-muted text-[12px] text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-gold"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => doAction(item.id, "request_changes", feedbackText)}
                          disabled={actionLoading === item.id || !feedbackText.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                        >
                          {actionLoading === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                          Request Changes
                        </button>
                        <button
                          onClick={() => setFeedbackId(null)}
                          className="px-4 py-2 rounded-xl border border-border bg-muted text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => doAction(item.id, "approve")}
                        disabled={actionLoading === item.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                      >
                        {actionLoading === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Approve
                      </button>
                      <button
                        onClick={() => setFeedbackId(item.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Request Changes
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
