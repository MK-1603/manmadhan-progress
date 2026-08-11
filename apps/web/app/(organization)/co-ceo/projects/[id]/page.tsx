"use client";
// CO-CEO project detail — same as CEO but can't edit
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Target, CheckSquare, Flag, BarChart3, Loader2, AlertCircle, Clock, Calendar } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "Active": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "In Progress": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Review": "text-purple-500 bg-purple-500/10 border-purple-500/20",
    "Completed": "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
    "Draft": "text-muted-foreground bg-muted border-border",
    "Planning": "text-blue-500 bg-blue-500/10 border-blue-500/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

type Tab = "overview" | "milestones" | "tasks";

export default function CoCeoProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    const fetch = async () => {
      try {
        const workspaceId = localStorage.getItem("workspaceId");
        const res = await apiClient.get(`/org/projects/${id}?workspaceId=${workspaceId}`);
        if (res.data.success) setProject(res.data.data);
        else setError(res.data.error || "Not found");
      } catch { setError("Unable to load project"); }
      finally { setLoading(false); }
    };
    if (id) fetch();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[calc(100vh-80px)]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (error || !project) return <div className="p-6"><div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error || "Not found"}</div></div>;

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(project.status)}`}>{project.status}</span>
        </div>
        {project.objective && <p className="text-sm text-muted-foreground mt-1">{project.objective}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <PremiumCard className="p-4"><p className="text-xs text-muted-foreground">Progress</p><p className="text-2xl font-bold text-primary mt-0.5">{project.progress || 0}%</p></PremiumCard>
        <PremiumCard className="p-4"><p className="text-xs text-muted-foreground">Tasks</p><p className="text-2xl font-bold text-foreground mt-0.5">{project.stats?.completed || 0}/{project.stats?.total || 0}</p></PremiumCard>
        <PremiumCard className="p-4"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-2xl font-bold text-amber-500 mt-0.5">{project.stats?.inProgress || 0}</p></PremiumCard>
        <PremiumCard className="p-4"><p className="text-xs text-muted-foreground">Overdue</p><p className={`text-2xl font-bold mt-0.5 ${project.stats?.overdue > 0 ? "text-rose-500" : "text-foreground"}`}>{project.stats?.overdue || 0}</p></PremiumCard>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([{ id: "overview", label: "Overview" }, { id: "milestones", label: "Milestones" }, { id: "tasks", label: "Tasks" }] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {project.description && <PremiumCard><h3 className="text-sm font-semibold mb-2">Description</h3><p className="text-sm text-muted-foreground">{project.description}</p></PremiumCard>}
          </div>
          <PremiumCard>
            <h3 className="text-sm font-semibold mb-3">Details</h3>
            <div className="space-y-2 text-xs">
              {project.deadline && <div className="flex justify-between"><span className="text-muted-foreground">Deadline</span><span className="font-medium text-foreground">{new Date(project.deadline).toLocaleDateString()}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className="font-semibold text-foreground">{project.priority}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Health</span><span className={`font-semibold ${project.health === "Healthy" ? "text-emerald-500" : project.health === "At Risk" ? "text-amber-500" : "text-rose-500"}`}>{project.health}</span></div>
            </div>
          </PremiumCard>
        </div>
      )}

      {tab === "milestones" && (
        <div className="space-y-3">
          {(!project.milestones?.length) ? <p className="text-sm text-muted-foreground text-center py-8">No milestones</p>
            : project.milestones.map((ms: any, i: number) => (
              <PremiumCard key={ms.id}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{ms.name}</p>
                    {ms.deadline && <p className="text-xs text-muted-foreground">Due {new Date(ms.deadline).toLocaleDateString()}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(ms.status)}`}>{ms.status}</span>
                </div>
              </PremiumCard>
            ))}
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-2">
          {(!project.tasks?.length) ? <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
            : project.tasks.map((t: any) => (
              <PremiumCard key={t.id}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    {t.assigneeName && <p className="text-xs text-muted-foreground">→ {t.assigneeName}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {t.deadline && <span className="text-xs text-muted-foreground">{new Date(t.deadline).toLocaleDateString()}</span>}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(t.status)}`}>{t.status}</span>
                  </div>
                </div>
              </PremiumCard>
            ))}
        </div>
      )}
    </div>
  );
}
