"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, Loader2, AlertCircle, CheckCircle2, Clock, RefreshCw, AlertTriangle, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";

type Period = "today" | "weekly" | "monthly" | "alltime";
type RoleFilter = "ALL" | "CO-CEO" | "MEMBER";

const RANK_LABEL = ["1st", "2nd", "3rd"];

function rankColor(rank: number) {
  if (rank === 1) return "text-gold";
  if (rank === 2) return "text-slate-400";
  if (rank === 3) return "text-amber-600";
  return "text-muted-foreground";
}

export default function CEOLeaderboardPage() {
  const router = useRouter();
  const { socket } = useSocket();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("weekly");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const wsId = localStorage.getItem("workspaceId");
      if (!wsId) return;
      const res = await apiClient.get(
        `/org/reports/leaderboard?workspaceId=${wsId}&period=${period}&role=${roleFilter}`
      );
      if (res.data.success) {
        setData(res.data.data.leaderboard || []);
      } else {
        setError(res.data.error || "Failed to load leaderboard.");
      }
    } catch {
      setError("Unable to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [period, roleFilter]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!socket) return;
    socket.on("leaderboard.updated", fetchLeaderboard);
    socket.on("task.approved", fetchLeaderboard);
    return () => {
      socket.off("leaderboard.updated", fetchLeaderboard);
      socket.off("task.approved", fetchLeaderboard);
    };
  }, [socket, fetchLeaderboard]);

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  const periods: { id: Period; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
    { id: "alltime", label: "All Time" },
  ];

  const roles: { id: RoleFilter; label: string }[] = [
    { id: "ALL", label: "All Roles" },
    { id: "CO-CEO", label: "CO-CEOs Only" },
    { id: "MEMBER", label: "Members Only" },
  ];

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-6 pb-16 max-w-[950px] mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href="/ceo/organization"
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Organization
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">ManMadhan · CEO Governance</p>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none">Performance Leaderboard</h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">
            Real-time CO-CEO & Member rankings derived from verified task completion & quality. CEO is excluded.
          </p>
        </div>
        <button
          onClick={fetchLeaderboard}
          className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground transition-colors self-start sm:self-center shrink-0"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-gold" : ""}`} />
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border/80 rounded-2xl">
        {/* Role Filter */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                roleFilter === r.id ? "bg-gold text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                period === p.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center border border-border border-dashed rounded-2xl">
          <Trophy className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-[13px] font-semibold text-foreground">No rankings found for selected filters</p>
          <p className="text-[12px] text-muted-foreground">Scores update automatically when members complete and get tasks approved.</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-4">
              {top3.map((entry, i) => (
                <div
                  key={entry.id}
                  className={`bg-card border rounded-2xl p-5 flex flex-col items-center gap-3 text-center ${
                    i === 0 ? "border-gold/40 shadow-lg shadow-gold/5" : "border-border"
                  }`}
                >
                  <div className={`text-[11px] font-bold uppercase tracking-widest ${rankColor(entry.rank)}`}>
                    {RANK_LABEL[i] ?? `#${entry.rank}`}
                  </div>

                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-base font-bold text-foreground ${
                      i === 0 ? "border-gold bg-gold/10" : "border-border bg-muted"
                    }`}
                  >
                    {entry.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>

                  <div>
                    <p className="text-[13px] font-semibold text-foreground truncate max-w-[200px]">{entry.name}</p>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border mt-1 inline-block ${
                      entry.role === "CO-CEO" || entry.role === "co-ceo"
                        ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    }`}>
                      {entry.role}
                    </span>
                  </div>

                  <p className={`text-[22px] font-bold ${i === 0 ? "text-gold" : "text-foreground"}`}>
                    {entry.score} <span className="text-[12px] font-medium text-muted-foreground">pts</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px] text-muted-foreground w-full border-t border-border pt-3">
                    <span className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {entry.tasksCompleted} done
                    </span>
                    <span className="flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-500" /> {entry.qualityScore ?? 0}% quality
                    </span>
                    <span className="flex items-center justify-center gap-1 col-span-2">
                      <AlertTriangle className={`w-3 h-3 ${entry.overdueTasks > 0 ? "text-rose-500" : "text-emerald-500"}`} />
                      {entry.overdueTasks ?? 0} overdue
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rest of rankings */}
          {rest.length > 0 && (
            <div className="border border-border rounded-2xl overflow-hidden bg-card">
              <div className="hidden sm:grid grid-cols-[48px_1fr_90px_100px_90px_80px] gap-4 px-5 py-3 bg-muted/30 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                <span>Rank</span>
                <span>Name</span>
                <span>Tasks</span>
                <span>Quality</span>
                <span>Overdue</span>
                <span>Score</span>
              </div>
              <div className="divide-y divide-border">
                {rest.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-1 sm:grid-cols-[48px_1fr_90px_100px_90px_80px] gap-2 sm:gap-4 items-center px-5 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <span className={`text-[12px] font-bold ${rankColor(entry.rank)}`}>#{entry.rank}</span>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold text-foreground shrink-0">
                        {entry.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{entry.name}</p>
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                          entry.role === "CO-CEO" || entry.role === "co-ceo"
                            ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        }`}>
                          {entry.role}
                        </span>
                      </div>
                    </div>
                    <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {entry.tasksCompleted}
                    </span>
                    <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-500" /> {entry.qualityScore ?? 0}%
                    </span>
                    <span className={`text-[12px] flex items-center gap-1 ${entry.overdueTasks > 0 ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
                      <AlertTriangle className="w-3 h-3" /> {entry.overdueTasks ?? 0}
                    </span>
                    <span className="text-[13px] font-bold text-foreground">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10.5px] text-muted-foreground text-center">
            Leaderboard updates in real-time via WebSockets when tasks are completed and approved. CEO is strictly excluded.
          </p>
        </>
      )}
    </div>
  );
}
