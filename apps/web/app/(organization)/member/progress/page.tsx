"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  BarChart3, AlertCircle, Loader2, RefreshCw, ArrowLeft,
  CheckCircle2, Clock, Target, TrendingUp, Award,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";
import { useSocket } from "@/components/providers/socket-provider";
import Link from "next/link";

export default function MemberProgressPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tasks, setTasks] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const wsId = localStorage.getItem("workspaceId");
      const [tasksRes, lbRes] = await Promise.all([
        apiClient.get(`/org/tasks?workspaceId=${wsId}&assigneeId=${user?.id}`),
        apiClient.get(`/org/reports/leaderboard?workspaceId=${wsId}&period=weekly`).catch(() => null),
      ]);
      if (tasksRes.data?.success) setTasks(tasksRes.data.data || []);
      if (lbRes?.data?.success) setLeaderboard(lbRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load progress data");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated", fetchProgress);
    return () => { socket.off("task.updated", fetchProgress); };
  }, [socket, fetchProgress]);

  const completed = tasks.filter(t => ["Approved", "Completed"].includes(t.status)).length;
  const active    = tasks.filter(t => ["In Progress", "Assigned", "Accepted"].includes(t.status)).length;
  const pending   = tasks.filter(t => ["Submitted", "Pending Review"].includes(t.status)).length;
  const overdue   = tasks.filter(t => {
    if (!t.deadline) return false;
    if (["Approved", "Completed"].includes(t.status)) return false;
    return new Date(t.deadline) < new Date();
  }).length;

  const onTime = tasks.filter(t => {
    if (!["Approved", "Completed"].includes(t.status)) return false;
    if (!t.deadline || !t.completedAt) return false;
    return new Date(t.completedAt) <= new Date(t.deadline);
  }).length;

  const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  const onTimeRate     = completed > 0 ? Math.round((onTime / completed) * 100) : 0;

  // Find self in leaderboard
  const myRank = leaderboard.findIndex(e => e.userId === user?.id || e.id === user?.id);
  const myLeaderEntry = myRank >= 0 ? leaderboard[myRank] : null;

  const stats = [
    { label: "Completed",      value: completed,        color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Active",         value: active,           color: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
    { label: "Pending Review", value: pending,          color: "text-gold",        bg: "bg-gold/10",        border: "border-gold/20" },
    { label: "Overdue",        value: overdue,          color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
    { label: "Total Tasks",    value: tasks.length,     color: "text-foreground",  bg: "bg-muted",          border: "border-border" },
    { label: "Completion Rate",value: `${completionRate}%`, color: "text-foreground", bg: "bg-muted",      border: "border-border" },
  ];

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
              Member · Performance
            </p>
            <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gold" /> My Progress
            </h1>
          </div>
        </div>
        <button onClick={fetchProgress} className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-[12px] text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-gold" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.map(s => (
              <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4`}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`text-[28px] font-bold font-mono leading-none mt-1.5 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Performance Bar */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="text-[12px] font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-gold" /> Performance Metrics
            </h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="font-semibold text-muted-foreground">Task Completion Rate</span>
                  <span className="font-bold text-foreground">{completionRate}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="font-semibold text-muted-foreground">On-Time Completion</span>
                  <span className="font-bold text-foreground">{onTimeRate}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${onTimeRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Position */}
          {myLeaderEntry && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="text-[12px] font-bold text-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                <Award className="w-3.5 h-3.5 text-gold" /> Leaderboard Position
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <span className="text-[18px] font-bold text-gold">#{myRank + 1}</span>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-foreground">{user?.displayName || user?.name || "You"}</p>
                  <p className="text-[12px] text-muted-foreground">
                    Score: <span className="font-bold text-foreground">{myLeaderEntry.score || myLeaderEntry.totalScore || 0}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Tasks */}
          {tasks.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Recent Tasks</span>
              </div>
              <div className="divide-y divide-border">
                {tasks.slice(0, 8).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{t.title}</p>
                      {t.projectName && (
                        <p className="text-[11px] text-muted-foreground">{t.projectName}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                      ["Approved","Completed"].includes(t.status)
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : ["In Progress","Assigned"].includes(t.status)
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
