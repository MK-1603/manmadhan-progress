"use client";

import { motion } from "framer-motion";
import { Plus, FolderKanban, Search, Filter, Calendar, BarChart2, LayoutGrid, List as ListIcon, AlertTriangle, ArrowUpDown, RefreshCw, Folder } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";
import { useRouter } from "next/navigation";
import { PersonalProjectCreateModal } from "@/components/personal/personal-project-create-modal";
import { useSocket } from "@/components/providers/socket-provider";

interface Project {
  id: string;
  name: string;
  description: string | null;
  type: string;
  category: string | null;
  goal: string | null;
  status: string;
  priority: string;
  progress: number;
  deadline: string | null;
  createdAt: string;
  tasks: any[];
  milestones: any[];
}

export default function ProjectsPage() {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Views
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  
  const { user } = useAuth();
  const router = useRouter();
  const { socket } = useSocket();

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (statusFilter !== "All") queryParams.append("status", statusFilter);
      if (priorityFilter !== "All") queryParams.append("priority", priorityFilter);
      
      const res = await apiClient.get(`/personal/projects?${queryParams.toString()}`);
      if (res.data.success) {
        setProjects(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, priorityFilter]);

  useEffect(() => {
    setMounted(true);
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!socket) return;
    
    const handleProjectCreated = (p: Project) => setProjects(prev => [p, ...prev]);
    const handleProjectUpdated = (p: Project) => setProjects(prev => prev.map(proj => proj.id === p.id ? p : proj));
    const handleProjectArchived = (p: Project) => setProjects(prev => prev.filter(proj => proj.id !== p.id));
    
    socket.on("PROJECT_CREATED", handleProjectCreated);
    socket.on("PROJECT_UPDATED", handleProjectUpdated);
    socket.on("PROJECT_ARCHIVED", handleProjectArchived);

    return () => {
      socket.off("PROJECT_CREATED", handleProjectCreated);
      socket.off("PROJECT_UPDATED", handleProjectUpdated);
      socket.off("PROJECT_ARCHIVED", handleProjectArchived);
    };
  }, [socket]);

  if (!mounted) return null;

  return (
    <div className="h-[100dvh] flex flex-col bg-background font-sans text-foreground overflow-hidden">
      {/* HEADER */}
      <header className="shrink-0 px-6 md:px-10 pt-8 pb-4 border-b border-border bg-card/50 backdrop-blur-md z-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Personal</span>
              <span>/</span>
              <span className="text-foreground">Projects Workspace</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Active Projects</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-muted rounded-full border border-transparent focus:bg-background focus:border-border transition-colors w-64 outline-none" 
              />
            </div>
            
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm bg-muted rounded-full px-4 py-2 border-none outline-none appearance-none"
            >
              <option value="All">All Statuses</option>
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>

            <button onClick={() => void fetchProjects()} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><RefreshCw className="w-4 h-4" /></button>

            <div className="flex items-center bg-muted rounded-full p-1 ml-2">
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>

            <button 
              onClick={() => setNewProjectOpen(true)}
              className="flex items-center gap-2 ml-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all text-sm font-bold shadow-sm rounded-full"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE - INTERNAL SCROLL */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
        <div className="max-w-[1400px] mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-56 rounded-3xl bg-muted/20 border border-muted/50 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-border/60 rounded-3xl bg-card/20">
              <FolderKanban className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">No projects found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                {searchQuery || statusFilter !== "All" ? "Try adjusting your filters to find what you're looking for." : "Create your first project to start planning milestones, tasks, and execution."}
              </p>
              <button 
                onClick={() => setNewProjectOpen(true)}
                className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-bold rounded-full shadow-md"
              >
                Create Project
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={project.id}
                  onClick={() => router.push(`/personal/projects/${project.id}`)}
                  className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border 
                          ${project.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                            project.status === 'Planning' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                            'bg-muted text-muted-foreground border-transparent'}`}>
                          {project.status}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-muted text-foreground border border-transparent`}>
                          {project.priority}
                        </span>
                      </div>
                      
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-2 truncate group-hover:text-primary transition-colors">{project.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-6">
                      {project.goal || project.description || "No objective defined."}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Tasks</span>
                          <span className="text-sm font-bold">{project.tasks?.length || 0}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Milestones</span>
                          <span className="text-sm font-bold">{project.milestones?.length || 0}</span>
                        </div>
                      </div>

                      {project.deadline && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(project.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-3xl border border-border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Project</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Priority</th>
                    <th className="px-6 py-4 font-semibold">Progress</th>
                    <th className="px-6 py-4 font-semibold">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr 
                      key={project.id} 
                      onClick={() => router.push(`/personal/projects/${project.id}`)}
                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-bold text-foreground group-hover:text-primary transition-colors">{project.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider 
                          ${project.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold">{project.priority}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
                          </div>
                          <span className="text-xs font-bold text-muted-foreground">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-foreground flex items-center gap-2">
                        {project.deadline ? (
                          <><Calendar className="w-4 h-4" /> {new Date(project.deadline).toLocaleDateString()}</>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <PersonalProjectCreateModal
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onSuccess={(newProject: Project) => setProjects((prev) => [newProject, ...prev])}
      />
    </div>
  );
}
