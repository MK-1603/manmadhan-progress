"use client";

import { useState, useEffect } from "react";
import { FolderKanban, Search, Loader2, AlertCircle, Target, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { PremiumCard } from "@/components/ui/premium-card";
import Link from "next/link";

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "Active": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Planning": "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "On Hold": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Completed": "text-slate-400 bg-slate-400/10 border-slate-400/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

export default function CoCeoProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const { socket } = useSocket();

  const fetchProjects = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/org/projects?workspaceId=${workspaceId}`);
      if (res.data.success) setProjects(res.data.data);
    } catch { setError("Unable to load projects"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => {
    if (!socket) return;
    socket.on("project.created", fetchProjects);
    socket.on("project.updated", fetchProjects);
    return () => { socket.off("project.created"); socket.off("project.updated"); };
  }, [socket]);

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <FolderKanban className="w-6 h-6 text-primary" /> Projects
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Organization projects assigned to your team</p>
      </div>

      {error && <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16"><FolderKanban className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No projects found</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link href={`/co-ceo/projects/${p.id}`}>
                <PremiumCard className="hover:border-border/80 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(p.status)}`}>{p.status}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress || 0}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-foreground">{p.progress || 0}%</span>
                        {p.deadline && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(p.deadline).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                </PremiumCard>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
