"use client";

import { useState, useEffect } from "react";
import { Trophy, Loader2, AlertCircle, TrendingUp, Clock, CheckCircle2, Star, RefreshCw } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";

const medalColors = ["text-gold", "text-slate-400", "text-amber-600"];

export default function CEOLeaderboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "alltime">("weekly");
  const { socket } = useSocket();

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/org/reports/leaderboard?workspaceId=${workspaceId}&period=${period}`);
      if (res.data.success) setData(res.data.data.leaderboard || []);
      else setError(res.data.error || "Failed to load leaderboard");
    } catch { setError("Unable to load leaderboard"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeaderboard(); }, [period]);
  useEffect(() => {
    if (!socket) return;
    socket.on("leaderboard.updated", fetchLeaderboard);
    return () => { socket.off("leaderboard.updated"); };
  }, [socket]);

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold" /> Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organization performance rankings based on verified work</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["weekly", "monthly", "alltime"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {p === "alltime" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={fetchLeaderboard} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No leaderboard data yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Scores are based on completed tasks and verified working hours</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-4 mb-2">
              {top3.map((entry, i) => (
                <PremiumCard key={entry.id} className={`text-center ${i === 0 ? "border-gold/30 bg-gold/5" : ""}`}>
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className={`text-2xl font-black ${medalColors[i]}`}>#{entry.rank}</div>
                    <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-bold text-foreground">
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.role}</p>
                    </div>
                    <div className={`text-xl font-black ${i === 0 ? "text-gold" : "text-foreground"}`}>{entry.score} pts</div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {entry.tasksCompleted}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500" /> {entry.hoursLogged}h</span>
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          )}

          {/* Rest of the list */}
          {rest.length > 0 && (
            <PremiumCard className="p-0 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rankings</h3>
              </div>
              <div className="divide-y divide-border">
                {rest.map(entry => (
                  <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors">
                    <span className="text-sm font-bold text-muted-foreground w-6 shrink-0">#{entry.rank}</span>
                    <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.role}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {entry.tasksCompleted}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500" /> {entry.hoursLogged}h</span>
                      <span className="font-bold text-foreground">{entry.score} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </PremiumCard>
          )}
        </>
      )}
    </div>
  );
}
