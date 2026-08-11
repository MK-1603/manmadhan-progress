"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckSquare, Loader2, AlertCircle, Clock, FolderKanban,
  ShieldCheck, CheckCircle2, XCircle, Play, Sparkles
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import Link from "next/link";

export default function CEOMyWorkPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
      setError(err.response?.data?.error || "Failed to load CEO work items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyWork();
  }, [fetchMyWork]);

  const handleApproveTask = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.patch(`/org/tasks/${taskId}`, { workspaceId, status: "Approved" });
      fetchMyWork();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to approve work");
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
  const myProjects = data?.myProjects || [];
  const reviewList = data?.workRequiringReview || [];

  return (
    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto w-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-500" /> Executive Work & Mandates
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Organization project mandates, CEO personal assignments, and leadership reviews.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <PremiumCard className="p-3">
          <span className="text-[11px] text-muted-foreground">My Pending</span>
          <p className="text-xl font-bold text-amber-500 mt-0.5">{summary.pendingCount}</p>
        </PremiumCard>
        <PremiumCard className="p-3">
          <span className="text-[11px] text-muted-foreground">My Active</span>
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
          <span className="text-[11px] text-muted-foreground">Submissions</span>
          <p className="text-xl font-bold text-purple-500 mt-0.5">{summary.reviewCount}</p>
        </PremiumCard>
      </div>

      {/* Submissions Pending CEO Review */}
      {reviewList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-purple-500">
              Work Submitted for Review ({reviewList.length})
            </h2>
          </div>

          <div className="space-y-2">
            {reviewList.map((t: any) => (
              <PremiumCard key={t.id} className="p-3.5 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-foreground">{t.title}</h4>
                  <p className="text-[11px] text-muted-foreground">Submitted by {t.assigneeName || "Team Member"} • {t.projectName || "Project"}</p>
                </div>

                <button
                  onClick={() => handleApproveTask(t.id)}
                  disabled={actionLoading === t.id}
                  className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  {actionLoading === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Approve Work</span>
                </button>
              </PremiumCard>
            ))}
          </div>
        </div>
      )}

      {/* Projects Section */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Assigned Project Mandates ({myProjects.length})</h2>
        {myProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myProjects.map((p: any) => (
              <Link key={p.id} href={`/ceo/projects/${p.id}`}>
                <PremiumCard className="p-4 space-y-2 hover:border-amber-500/40 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{p.status}</span>
                    <span className="text-[10px] font-bold text-emerald-500">{p.health || "ON_TRACK"}</span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.objective || p.description || "No objective"}</p>
                </PremiumCard>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
            No projects explicitly owned by your account. Create a project to assign work.
          </div>
        )}
      </div>
    </div>
  );
}
