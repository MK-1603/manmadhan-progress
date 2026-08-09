"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Calendar, CheckCircle2, Circle, Clock, 
  MoreHorizontal, Play, Pause, Square, Trash2, Edit,
  Activity, Users, FileText
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../../../../components/auth/auth-context";
import { ManMadhanProjectEditModal } from "../../../../../components/organization/manmadhan-project-edit-modal";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  ownerId: string;
}

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await fetch(`/api/v1/manmadhan/projects/${id}?workspaceId=${workspaceId}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const json = await res.json();
      if (json.success) setProject(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await fetch(`/api/v1/manmadhan/projects/${id}`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus, workspaceId })
      });
      const json = await res.json();
      if (json.success) setProject(json.data);
      else alert(json.error);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await fetch(`/api/v1/manmadhan/projects/${id}?workspaceId=${workspaceId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const json = await res.json();
      if (json.success) {
        router.push("/ceo/projects");
      } else {
        alert(json.error || "Failed to delete project");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete project");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-center">
        <h2 className="text-xl font-bold text-foreground">Project not found</h2>
        <button onClick={() => router.back()} className="mt-4 text-gold hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      
      {/* Header */}
      <div className="shrink-0 px-6 py-6 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/ceo/projects" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <Link href="/ceo/projects" className="hover:text-foreground transition-colors">Projects</Link>
            <span>/</span>
            <span className="text-foreground">{project.name}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">{project.description || "No description provided."}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border">
              <button 
                onClick={() => updateStatus("Planning")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${project.status === "Planning" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
              >
                <Circle className="w-3.5 h-3.5" />
                Planning
              </button>
              <button 
                onClick={() => updateStatus("Active")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${project.status === "Active" ? "bg-blue-500/10 text-blue-500 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
              >
                <Play className="w-3.5 h-3.5" />
                Active
              </button>
              <button 
                onClick={() => updateStatus("Completed")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${project.status === "Completed" ? "bg-emerald-500/10 text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-muted/10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</span>
                  <Activity className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">0%</div>
                  <div className="w-full h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-gold w-0 transition-all duration-1000" />
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">0</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">Total tasks in project</div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team</span>
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">1</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">Active contributors</div>
                </div>
              </div>
            </div>

            {/* Tasks Section Placeholder */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Recent Tasks</h3>
                <Link href="/ceo/tasks" className="text-xs font-semibold text-gold hover:underline">View all</Link>
              </div>
              <div className="p-8 text-center flex flex-col items-center justify-center bg-muted/20">
                <FileText className="w-8 h-8 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No tasks yet</p>
                <p className="text-xs text-muted-foreground">Tasks assigned to this project will appear here.</p>
              </div>
            </div>

          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">Project Details</h3>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <span className="text-sm font-semibold text-foreground capitalize">{project.status}</span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Created</span>
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Project Lead</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-border flex items-center justify-center text-[10px] font-bold text-white">
                      CEO
                    </div>
                    <span className="text-sm font-medium text-foreground">Sai Krishnan</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-border/50 space-y-2">
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full h-9 rounded-lg border border-border text-foreground hover:bg-accent text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit Project
                </button>
                <button 
                  onClick={handleDeleteProject}
                  className="w-full h-9 rounded-lg text-rose-500 hover:bg-rose-500/10 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Project
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ManMadhanProjectEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        workspaceId={localStorage.getItem("workspaceId") || ""}
        project={project}
        onSuccess={(updated) => {
          setProject(updated);
        }}
      />
    </div>
  );
}
