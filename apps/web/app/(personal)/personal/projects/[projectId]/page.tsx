"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { 
  ArrowLeft, Calendar, LayoutGrid, Target, Clock, Activity, Folder, 
  FileText, CheckSquare, Edit3, MoreVertical, Flag, AlertTriangle, Focus, 
  Play
} from "lucide-react";

// Sub-components to be created
import { ProjectOverviewTab } from "@/components/projects/tabs/overview-tab";
import { ProjectPlanTab } from "@/components/projects/tabs/plan-tab";
import { ProjectTasksTab } from "@/components/projects/tabs/tasks-tab";
import { MilestoneBoard } from "@/components/projects/tabs/milestone-board";
import { ProjectActivityTab } from "@/components/projects/tabs/activity-tab";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { socket } = useSocket();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await apiClient.get(`/personal/projects/${projectId}`);
        if (res.data.success) {
          setProject(res.data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (!socket || !project) return;
    
    const handleUpdate = (updatedProj: any) => {
      if (updatedProj.id === project.id) setProject(updatedProj);
    };
    const handleMilestone = () => {
      // Refresh project to get updated stats
      apiClient.get(`/personal/projects/${projectId}`)
        .then(res => setProject(res.data.data));
    };

    socket.on("PROJECT_UPDATED", handleUpdate);
    socket.on("MILESTONE_CREATED", handleMilestone);
    socket.on("MILESTONE_UPDATED", handleMilestone);
    socket.on("MILESTONE_DELETED", handleMilestone);
    socket.on("TASK_CREATED", handleMilestone); // Assuming task changes affect project progress
    socket.on("TASK_UPDATED", handleMilestone);
    socket.on("TASK_DELETED", handleMilestone);

    return () => {
      socket.off("PROJECT_UPDATED", handleUpdate);
      socket.off("MILESTONE_CREATED", handleMilestone);
      socket.off("MILESTONE_UPDATED", handleMilestone);
      socket.off("MILESTONE_DELETED", handleMilestone);
      socket.off("TASK_CREATED", handleMilestone);
      socket.off("TASK_UPDATED", handleMilestone);
      socket.off("TASK_DELETED", handleMilestone);
    };
  }, [socket, project?.id, projectId]);

  if (loading) {
    return <div className="h-[100dvh] bg-background flex items-center justify-center">Loading Workspace...</div>;
  }

  if (!project) {
    return <div className="h-[100dvh] bg-background flex items-center justify-center">Project not found</div>;
  }

  const TABS = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "plan", label: "Plan", icon: Target },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "milestones", label: "Milestones", icon: Flag },
    { id: "documents", label: "Documents", icon: Folder },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "time", label: "Time", icon: Clock },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  return (
    <div className="h-[100dvh] flex flex-col bg-background font-sans text-foreground overflow-hidden">
      {/* FIXED PROJECT HEADER */}
      <header className="shrink-0 bg-card border-b border-border z-20">
        {/* Top bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/personal/projects")}
              className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider 
                  ${project.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                  {project.status}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2 py-0.5 rounded text-foreground">
                  {project.priority}
                </span>
                {project.health === "At Risk" && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded">
                    <AlertTriangle className="w-3 h-3" /> At Risk
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                {project.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-sm font-bold rounded-lg transition-colors">
              <Focus className="w-4 h-4" /> Start Focus
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground hover:bg-muted/80 text-sm font-bold rounded-lg transition-colors">
              <Edit3 className="w-4 h-4" /> Edit
            </button>
            <button className="p-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 flex gap-6 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* PROJECT WORKSPACE - INTERNAL SCROLL */}
      <main className="flex-1 overflow-y-auto bg-muted/10 custom-scrollbar relative">
        <div className="max-w-[1400px] mx-auto p-6 md:p-10 h-full">
          {activeTab === "overview" && <ProjectOverviewTab project={project} />}
          {activeTab === "plan" && <ProjectPlanTab project={project} />}
          {activeTab === "tasks" && <ProjectTasksTab project={project} />}
          {activeTab === "milestones" && <MilestoneBoard project={project} />}
          {activeTab === "activity" && <ProjectActivityTab project={project} />}
          
          {/* Placeholders for others */}
          {["documents", "notes", "time"].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-border/60 rounded-3xl bg-card">
              <Folder className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">{TABS.find(t=>t.id===activeTab)?.label} Module</h3>
              <p className="text-sm text-muted-foreground">This section integrates with existing core modules.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
