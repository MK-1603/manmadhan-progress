"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Filter, MoreHorizontal, LayoutGrid, List,
  Calendar, Clock, CheckCircle2, Circle, AlertCircle, Trash2, FolderKanban
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../../../components/auth/auth-context";
import apiClient from "@/lib/api-client";
import { ManMadhanProjectCreateModal } from "@/components/organization/manmadhan-project-create-modal";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  ownerId: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/manmadhan/projects?workspaceId=${workspaceId}`);
      if (res.data.success) setProjects(res.data.data);
    } catch (e) {
      console.error("Failed to fetch projects", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "Planning": return <Circle className="w-4 h-4 text-slate-400" />;
      case "Active": return <Clock className="w-4 h-4 text-blue-500" />;
      case "Completed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      
      {/* Header */}
      <div className="shrink-0 px-6 py-6 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-gold" />
              Projects
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage all organization projects and track their high-level progress.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="h-9 px-4 rounded-lg bg-gold hover:bg-gold/90 text-black font-semibold text-sm flex items-center gap-2 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-9 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button className="h-9 px-3 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <div className="h-9 p-1 rounded-lg border border-border bg-card flex items-center">
              <button 
                onClick={() => setView("list")}
                className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-muted/10">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FolderKanban className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No projects found</h3>
            <p className="text-sm text-muted-foreground mb-6">Get started by creating a new project to organize your team's work.</p>
            <button className="h-9 px-4 rounded-lg bg-gold hover:bg-gold/90 text-black font-semibold text-sm flex items-center gap-2 shadow-sm transition-colors">
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        ) : (
          <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "flex flex-col gap-2"}>
            <AnimatePresence>
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {view === "list" ? (
                    <Link href={`/ceo/projects/${project.id}`}>
                      <div className="group flex items-center gap-4 p-3 pr-4 rounded-xl border border-transparent bg-card hover:border-border hover:shadow-sm transition-all cursor-pointer">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          {getStatusIcon(project.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-gold transition-colors">{project.name}</h3>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description || "No description"}</p>
                        </div>
                        <div className="flex items-center gap-6 shrink-0">
                          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(project.createdAt).toLocaleDateString()}
                          </div>
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground capitalize">
                            {project.status}
                          </span>
                          <button className="p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <Link href={`/ceo/projects/${project.id}`}>
                      <div className="group flex flex-col p-5 rounded-xl border border-border bg-card hover:border-gold/50 hover:shadow-md transition-all cursor-pointer h-full">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            {getStatusIcon(project.status)}
                          </div>
                          <span className="inline-flex items-center rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground capitalize">
                            {project.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-foreground line-clamp-1 mb-1 group-hover:text-gold transition-colors">{project.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1">{project.description || "No description provided for this project."}</p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(project.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex -space-x-2">
                            {/* Dummy avatars */}
                            <div className="w-6 h-6 rounded-full border-2 border-card bg-slate-700" />
                            <div className="w-6 h-6 rounded-full border-2 border-card bg-slate-600" />
                            <div className="w-6 h-6 rounded-full border-2 border-card bg-slate-800 flex items-center justify-center text-[8px] font-bold text-white">+3</div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ManMadhanProjectCreateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={typeof window !== 'undefined' ? localStorage.getItem("workspaceId") || "" : ""}
        onSuccess={(proj) => setProjects(prev => [proj, ...prev])}
      />
    </div>
  );
}
