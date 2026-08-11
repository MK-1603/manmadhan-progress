"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckSquare, Loader2, AlertCircle, Clock, FolderKanban,
  Play, CheckCircle2, XCircle, ShieldCheck, ExternalLink, Sparkles
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { PremiumCard } from "@/components/ui/premium-card";
import { useAuth } from "@/components/auth/auth-context";
import Link from "next/link";

type WorkTab = "all" | "pending" | "active" | "today" | "overdue" | "completed" | "review";

export default function CoCeoMyWorkPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<WorkTab>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMyWork = useCallback(async () => {
    try {
      setLoading(true);
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.get(`/org/my-work?workspaceId=${workspaceId}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load My Work queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyWork();
  }, [fetchMyWork]);

  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated", fetchMyWork);
    socket.on("task.created", fetchMyWork);
    socket.on("notification.created", fetchMyWork);
    return () => {
      socket.off("task.updated");
      socket.off("task.created");
      socket.off("notification.created");
    };
  }, [socket, fetchMyWork]);

  const handleAcceptTask = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/my-work/tasks/${taskId}/accept`, { workspaceId });
      fetchMyWork();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to accept task");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineTask = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/my-work/tasks/${taskId}/decline`, { workspaceId, reason: "Declined by CO-CEO" });
      fetchMyWork();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to decline task");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const summary = data?.summary || { pendingCount: 0, activeCount: 0, dueTodayCount: 0, overdueCount: 0, completedCount: 0, reviewCount: 0 };
  const pendingList = data?.pendingAcceptance || [];
  const activeList = data?.activeWork || [];
  const overdueList = data?.overdue || [];
  const completedList = data?.completed || [];
  const reviewList = data?.workRequiringReview || [];

  return (
    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-amber-500" /> My Work Queue
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Everything assigned to you, from acceptance to completion.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Compact Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <PremiumCard className="p-3">
          <span className="text-[11px] text-muted-foreground">Pending</span>
          <p className="text-xl font-bold text-amber-500 mt-0.5">{summary.pendingCount}</p>
        </PremiumCard>
        <PremiumCard className="p-3">
          <span className="text-[11px] text-muted-foreground">Active</span>
          <p className="text-xl font-bold text-blue-500 mt-0.5">{summary.activeCount}</p>
        </PremiumCard>
        <PremiumCard className="p-3">
          <span className="text-[11px] text-muted-foreground">Due Today</span>
          <p className="text-xl font-bold text-orange-500 mt-0.5">{summary.dueTodayCount}</p>
        </PremiumCard>
        <PremiumCard className="p-3">
          <span className="text-[11px] text-muted-foreground">Overdue</span>
          <p className="text-xl font-bold text-rose-500 mt-0.5">{summary.overdueCount}</p>
        </PremiumCard>
        <PremiumCard className="p-3">
          <span className="text-[11px] text-muted-foreground">Completed</span>
          <p className="text-xl font-bold text-emerald-500 mt-0.5">{summary.completedCount}</p>
        </PremiumCard>
        <PremiumCard className="p-3">
          <span className="text-[11px] text-muted-foreground">Team Review</span>
          <p className="text-xl font-bold text-purple-500 mt-0.5">{summary.reviewCount}</p>
        </PremiumCard>
      </div>

      {/* PENDING ACCEPTANCE SECTION */}
      {pendingList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Pending Acceptance ({pendingList.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingList.map((t: any) => (
              <div key={t.id} className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">NEW ASSIGNMENT</span>
                    <h3 className="text-sm font-bold text-foreground mt-0.5">{t.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.projectName || "Organization Project"}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {t.priority || "Medium"}
                  </span>
                </div>

                {t.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                )}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                  <span>Deadline: <strong className="text-foreground">{t.deadline ? new Date(t.deadline).toLocaleDateString() : "Not set"}</strong></span>
                  <span>Est: {t.estimatedMinutes || 120} mins</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleDeclineTask(t.id)}
                    disabled={actionLoading === t.id}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAcceptTask(t.id)}
                    disabled={actionLoading === t.id}
                    className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    {actionLoading === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Accept Work</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE WORK SECTION */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Active Work ({activeList.length})
        </h2>

        {activeList.length > 0 ? (
          <div className="space-y-2">
            {activeList.map((t: any) => (
              <PremiumCard key={t.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-foreground">{t.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      {t.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t.projectName || "Organization Project"}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/co-ceo/focus"
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-primary/90 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Start Work</span>
                  </Link>
                </div>
              </PremiumCard>
            ))}
          </div>
        ) : (
          <div className="p-8 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
            No active work currently in progress. Accept pending assignments above to start work.
          </div>
        )}
      </div>
    </div>
  );
}
