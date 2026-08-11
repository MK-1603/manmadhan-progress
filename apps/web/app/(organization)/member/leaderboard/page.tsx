"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, Loader2, AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";

const medalColor = (rank: number) => {
  if (rank === 1) return "text-gold";
  if (rank === 2) return "text-slate-400";
  if (rank === 3) return "text-amber-600";
  return "text-muted-foreground";
};

export default function MemberLeaderboardPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [data, setData]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "alltime">("weekly");

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const wid = localStorage.getItem("workspaceId");
      if (!wid) return;
      const res = await apiClient.get(`/org/reports/leaderboard?workspaceId=${wid}&period=${period}`);
      if (res.data.success) setData(res.data.data.leaderboard || []);
      else setError(res.data.error || "Failed to load leaderboard");
    } catch { setError("Unable to load leaderboard"); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    if (!socket) return;
    socket.on("leaderboard.updated", fetch);
    return () => { socket.off("leaderboard.updated"); };
  }, [socket, fetch]);

  const myEntry = data.find(e => e.id === user?.id);

  return (
    <div className="p-6 lg:p-8 max-w-[800px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">MEMBER</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold" /> Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organisation performance rankings — top performers and your position
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["weekly","monthly","alltime"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {p === "alltime" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={fetch} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
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
      {myEntry && !loading && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(user?.displayName || user?.name || "M").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Your Position</p>
            <p className="text-xs text-muted-foreground">
              Rank <strong>#{myEntry.rank}</strong> · <strong>{myEntry.score} pts</strong> · {myEntry.tasksCompleted} tasks completed
            </p>
          </div>
          <span className={`text-xl font-black ${medalColor(myEntry.rank)}`}>#{myEntry.rank}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No leaderboard data yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Rankings appear after tasks are approved</p>
        </div>
      ) : (
        <PremiumCard className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Rankings — {period === "alltime" ? "All Time" : period === "weekly" ? "This Week" : "This Month"}
            </p>
          </div>
          <div className="divide-y divide-border">
            {data.map(entry => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-accent/20 transition-colors ${
                  entry.id === user?.id ? "bg-emerald-500/5" : ""
                }`}
              >
                <span className={`text-sm font-bold w-7 shrink-0 ${medalColor(entry.rank)}`}>
                  #{entry.rank}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  entry.id === user?.id ? "bg-emerald-600 text-white" : "bg-muted border border-border text-foreground"
                }`}>
                  {(entry.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {entry.name}
                    {entry.id === user?.id && (
                      <span className="ml-1.5 text-[10px] font-bold text-emerald-400">(you)</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" />{entry.tasksCompleted}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500" />{entry.hoursLogged}h</span>
                  <span className={`font-bold min-w-[52px] text-right ${entry.id === user?.id ? "text-emerald-500" : "text-foreground"}`}>
                    {entry.score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </PremiumCard>
      )}

      {/* Scoring rules */}
      <PremiumCard className="bg-muted/20">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">How Points Are Earned</p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0">+</span><span><strong className="text-foreground">10 points</strong> — task approved on time</span></div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">+</span><span><strong className="text-foreground">5 points</strong> — task approved late</span></div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-muted text-muted-foreground flex items-center justify-center text-[10px] shrink-0">!</span><span>Scores are calculated and updated after task approval</span></div>
        </div>
      </PremiumCard>
    </div>
  );
}
