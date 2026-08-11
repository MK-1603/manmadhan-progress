"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trophy, Loader2, AlertCircle, CheckCircle2, Clock, RefreshCw, TrendingUp
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";

const medalColors = ["text-gold", "text-slate-400", "text-amber-600"];
const medalBg = ["bg-gold/10 border-gold/30", "bg-slate-500/10 border-slate-500/20", "bg-amber-600/10 border-amber-600/20"];

export default function CoCeoLeaderboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "alltime">("weekly");
  const { socket } = useSocket();

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(
        `/org/reports/leaderboard?workspaceId=${workspaceId}&period=${period}`
      );
      if (res.data.success) setData(res.data.data.leaderboard || []);
      else setError(res.data.error || "Failed to load leaderboard");
    } catch { setError("Unable to load leaderboard"); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  useEffect(() => {
    if (!socket) return;
    socket.on("leaderboard.updated", fetchLeaderboard);
    return () => { socket.off("leaderboard.updated"); };
  }, [socket, fetchLeaderboard]);

  const myEntry = data.find(e => e.id === user?.id);
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold" /> Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organization performance rankings based on verified completed work
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["weekly", "monthly", "alltime"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                  period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "alltime" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={fetchLeaderboard}
            className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* My rank callout */}
      {myEntry && (
        <div className="flex items-center gap-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(user?.displayName || user?.name || "C").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Your Position</p>
            <p className="text-xs text-muted-foreground">
              Rank #{myEntry.rank} · {myEntry.score} pts · {myEntry.tasksCompleted} tasks completed
            </p>
          </div>
          <span className="text-lg font-black text-purple-500">#{myEntry.rank}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No leaderboard data yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Rankings update when tasks are approved and scores are calculated
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-4">
              {top3.map((entry, i) => (
                <PremiumCard
                  key={entry.id}
                  className={`text-center ${i === 0 ? "border-gold/30 bg-gold/5" : ""} ${entry.id === user?.id ? "border-purple-500/30 bg-purple-500/5" : ""}`}
                >
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className={`text-2xl font-black ${medalColors[i]}`}>#{entry.rank}</div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-foreground border ${medalBg[i]}`}>
                      {(entry.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {entry.name}
                        {entry.id === user?.id && (
                          <span className="ml-1 text-[10px] font-bold text-purple-400">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.role}</p>
                    </div>
                    <div className={`text-xl font-black ${i === 0 ? "text-gold" : "text-foreground"}`}>
                      {entry.score} pts
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {entry.tasksCompleted}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-500" /> {entry.hoursLogged}h
                      </span>
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          )}

          {/* Full rankings table */}
          {data.length > 0 && (
            <PremiumCard className="p-0 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Full Rankings — {period === "alltime" ? "All Time" : period.charAt(0).toUpperCase() + period.slice(1)}
                </h3>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="divide-y divide-border">
                {data.map(entry => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors ${
                      entry.id === user?.id ? "bg-purple-500/5" : ""
                    }`}
                  >
                    <span className={`text-sm font-bold w-7 shrink-0 ${
                      entry.rank <= 3 ? medalColors[entry.rank - 1] : "text-muted-foreground"
                    }`}>
                      #{entry.rank}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                      {(entry.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {entry.name}
                        {entry.id === user?.id && (
                          <span className="ml-1 text-[10px] font-bold text-purple-400">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.role}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {entry.tasksCompleted}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-500" />
                        {entry.hoursLogged}h
                      </span>
                      <span className="font-bold text-foreground min-w-[60px] text-right">
                        {entry.score} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </PremiumCard>
          )}
        </>
      )}

      {/* Scoring info */}
      <PremiumCard className="bg-muted/20">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          How Scores Are Calculated
        </p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0">+</span>
            <span><strong className="text-foreground">10 points</strong> — Task approved on time</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">+</span>
            <span><strong className="text-foreground">5 points</strong> — Task approved late</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-muted text-muted-foreground flex items-center justify-center font-bold shrink-0">!</span>
            <span>Scores update immediately upon task approval</span>
          </div>
        </div>
      </PremiumCard>
    </div>
  );
}
