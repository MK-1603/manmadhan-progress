"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderKanban, Search, Loader2, AlertCircle, Clock,
  CheckCircle2, RefreshCw, ChevronRight, Target, Circle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { PremiumCard } from "@/components/ui/premium-card";

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "Active":    "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Planning":  "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "On Hold":   "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Completed": "text-slate-400 bg-slate-400/10 border-slate-400/20",
    "Archived":  "text-muted-foreground bg-muted border-border",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

const taskStatusColor = (s: string) => {
  const m: Record<string, string> = {
    "Assigned":    "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "Accepted":    "text-sky-500 bg-sky-500/10 border-sky-500/20",
    "In Progress": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Review":      "text-purple-500 bg-purple-500/10 border-purple-500/20",
    "Approved":    "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Completed":   "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (["Approved","Completed"].includes(status)) return false;
  return new Date(deadline) < new Date();
}

export default function MemberProjectsPage() {
  const { socket } = useSocket();
  const [projects, setProjects]       = useState<any[]>([]);
  const [myTasks, setMyTasks]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [expanded, setExpanded]       = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const wid = localStorage.getItem("workspaceId");
      if (!wid) return;
      const [projectsRes, tasksRes] = await Promise.all([
        apiClient.get(`/org/projects?workspaceId=${wid}`),
        apiClient.get(`/org/tasks?workspaceId=${wid}`),
      ]);
      if (projectsRes.data.success) setProjects(projectsRes.data.data || []);
      if (tasksRes.data.success)    setMyTasks(tasksRes.data.data || []);
    } catch { setError("Unable to load projects"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (!socket) return;
    socket.on("project.updated", fetchAll);
    socket.on("task.updated", fetchAll);
    return () => { socket.off("project.updated"); socket.off("task.updated"); };
  }, [socket, fetchAll]);

  /* Only show projects where the member has at least one assigned task */
  const myProjectIds = new Set(myTasks.map(t => t.projectId).filter(Boolean));
  const myProjects   = projects.filter(p => myProjectIds.has(p.id));

  const filtered = myProjects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getProjectTasks = (projectId: string) =>
    myTasks.filter(t => t.projectId === projectId);

  return (
    <div className="p-6 lg:p-8 max-w-[1000px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">MEMBER</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-emerald-500" /> My Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Projects with tasks assigned to you — {myProjects.length} project{myProjects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={fetchAll} className="ml-auto text-xs hover:underline">Retry</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            {myProjects.length === 0
              ? "No projects associated with your work yet"
              : "No projects match your search"
            }
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {myProjects.length === 0
              ? "Projects appear here once a task is assigned to you within a project."
              : ""
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((project, i) => {
            const projectTasks = getProjectTasks(project.id);
            const completed    = projectTasks.filter(t => ["Approved","Completed"].includes(t.status)).length;
            const myProgress   = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
            const isExp        = expanded === project.id;
            const overdueCount = projectTasks.filter(t => isOverdue(t.deadline, t.status)).length;

            return (
              <motion.div key={project.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <PremiumCard className={`p-0 overflow-hidden transition-colors ${isExp ? "border-emerald-500/20" : ""}`}>
                  {/* Project header */}
                  <button
                    onClick={() => setExpanded(isExp ? null : project.id)}
                    className="w-full flex items-start gap-4 p-5 text-left hover:bg-accent/20 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(project.status)}`}>
                          {project.status}
                        </span>
                        {overdueCount > 0 && (
                          <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-500/20">
                            {overdueCount} overdue
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{project.description}</p>
                      )}
                      {/* My progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${myProgress}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-foreground shrink-0">{myProgress}%</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({completed}/{projectTasks.length} tasks)
                        </span>
                        {project.deadline && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            {new Date(project.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform ${isExp ? "rotate-90" : ""}`} />
                  </button>

                  {/* Expanded: my tasks in this project */}
                  <AnimatePresence>
                    {isExp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border bg-muted/10">
                          <div className="px-5 py-3 flex items-center justify-between">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              My Tasks in this Project ({projectTasks.length})
                            </p>
                          </div>
                          {projectTasks.length === 0 ? (
                            <div className="px-5 pb-5 text-xs text-muted-foreground">No tasks assigned in this project.</div>
                          ) : (
                            <div className="divide-y divide-border">
                              {projectTasks.map(task => (
                                <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors">
                                  <Circle className={`w-2 h-2 fill-current shrink-0 ${
                                    isOverdue(task.deadline, task.status) ? "text-rose-500"
                                    : task.status === "In Progress" ? "text-amber-500"
                                    : ["Approved","Completed"].includes(task.status) ? "text-emerald-500"
                                    : "text-muted-foreground/40"
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                                    {task.deadline && (
                                      <p className={`text-[11px] mt-0.5 ${isOverdue(task.deadline, task.status) ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
                                        {isOverdue(task.deadline, task.status) ? "Overdue · " : "Due "}
                                        {new Date(task.deadline).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${taskStatusColor(task.status)}`}>
                                    {task.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </PremiumCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
