"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  ClipboardCheck, AlertCircle, Loader2, RefreshCw, ArrowLeft,
  CheckCircle2, Clock, MessageSquare, XCircle, ChevronRight,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";
import Link from "next/link";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  Draft:              { label: "Draft",            color: "bg-muted text-muted-foreground border-border" },
  Submitted:          { label: "Submitted",        color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "Pending Review":   { label: "Pending Review",   color: "bg-gold/10 text-gold border-gold/20" },
  Approved:           { label: "Approved",         color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  "Changes Requested":{ label: "Changes Requested",color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  Completed:          { label: "Completed",        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function MemberSubmissionsPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const wsId = localStorage.getItem("workspaceId");
      // Try submissions endpoint, fall back to tasks with submitted status
      try {
        const res = await apiClient.get(`/org/submissions?workspaceId=${wsId}`);
        if (res.data?.success) {
          setSubmissions(res.data.data || []);
          return;
        }
      } catch {}

      // Fallback: get my tasks filtered by submitted states
      const res = await apiClient.get(`/org/tasks?workspaceId=${wsId}&assigneeId=${user?.id}`);
      if (res.data?.success) {
        const all = res.data.data || [];
        setSubmissions(all.filter((t: any) =>
          ["Submitted", "Pending Review", "Approved", "Changes Requested", "Completed"].includes(t.status)
        ));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated", fetchSubmissions);
    return () => { socket.off("task.updated", fetchSubmissions); };
  }, [socket, fetchSubmissions]);

  const filters = ["All", "Submitted", "Pending Review", "Approved", "Changes Requested", "Completed"];
  const visible = activeFilter === "All"
    ? submissions
    : submissions.filter(s => s.status === activeFilter);

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/member/dashboard" className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              Member · Submissions
            </p>
            <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-gold" /> My Submissions
            </h1>
          </div>
        </div>
        <button onClick={fetchSubmissions} className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-[12px] text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total",            value: submissions.length,                                     color: "text-foreground" },
          { label: "Pending Review",   value: submissions.filter(s => s.status === "Pending Review").length,  color: "text-gold" },
          { label: "Approved",         value: submissions.filter(s => s.status === "Approved" || s.status === "Completed").length, color: "text-emerald-600" },
          { label: "Changes Requested",value: submissions.filter(s => s.status === "Changes Requested").length, color: "text-blue-500" },
          { label: "Submitted",        value: submissions.filter(s => s.status === "Submitted").length, color: "text-muted-foreground" },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={`text-[26px] font-bold font-mono leading-none mt-1.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1 flex-wrap">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              activeFilter === f
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-gold" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <ClipboardCheck className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-[14px] font-semibold text-foreground">No submissions yet</p>
          <p className="text-[12px] text-muted-foreground max-w-xs">
            Submit your assigned work from My Work to see it here.
          </p>
          <Link href="/member/my-work" className="mt-2 px-4 py-2 rounded-xl bg-gold hover:bg-gold/90 text-[#111827] text-[11px] font-bold transition-colors">
            Go to My Work
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((sub: any) => {
            const statusInfo = STATUS_MAP[sub.status] || { label: sub.status, color: "bg-muted text-muted-foreground border-border" };
            return (
              <div key={sub.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-bold text-foreground">{sub.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      {sub.projectName && <span>{sub.projectName}</span>}
                      {sub.submittedAt && <span>· Submitted {timeAgo(sub.submittedAt)}</span>}
                    </div>
                  </div>
                  {(sub.status === "Changes Requested") && (
                    <Link
                      href="/member/my-work"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold transition-colors shrink-0"
                    >
                      Resume <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                {sub.rejectionFeedback && (
                  <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                    <p className="text-[11px] font-semibold text-blue-600 mb-1">Feedback</p>
                    <p className="text-[12px] text-foreground">{sub.rejectionFeedback}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
