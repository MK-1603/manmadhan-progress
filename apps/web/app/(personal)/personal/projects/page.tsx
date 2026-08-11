"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, FolderKanban, Clock, Target, Flag, MoreVertical, Edit, Copy, Archive, Trash2, CheckCircle2, ChevronRight, Search } from "lucide-react";
import { PromptComposer } from "@/components/personal/shared/prompt-composer";
import { useSocket } from "@/components/providers/socket-provider";
import { useConfirm } from "@/hooks/use-confirm";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Utility for click outside
function useOnClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export default function ProjectsPage() {
  const { socket, isConnected } = useSocket();
  const { confirm } = useConfirm();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All"); // All, Active, On Track, At Risk, Delayed, Completed, Archived

  const fetchProjects = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/projects");
      setProjects(response.data.data);
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("project_created", (newProject: any) => {
      setProjects(prev => [newProject, ...prev]);
    });

    socket.on("project_updated", (updatedProject: any) => {
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    });

    socket.on("project_deleted", ({ id }: { id: string }) => {
      setProjects(prev => prev.filter(p => p.id !== id));
    });

    return () => {
      socket.off("project_created");
      socket.off("project_updated");
      socket.off("project_deleted");
    };
  }, [socket, isConnected]);

  const handleDuplicate = async (id: string) => {
    try {
      await apiClient.post(`/personal/projects/${id}/duplicate`);
    } catch (err) {
      console.error("Failed to duplicate project", err);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await apiClient.patch(`/personal/projects/${id}`, { status: "Archived" });
    } catch (err) {
      console.error("Failed to archive project", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project permanently?")) return;
    try {
      await apiClient.delete(`/personal/projects/${id}`);
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  };

  // Derived state
  const filteredProjects = projects.filter(p => {
    if (filterStatus === "Active") {
      if (p.status === "Completed" || p.status === "Archived") return false;
    } else if (filterStatus !== "All" && p.status !== filterStatus) {
      return false;
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      if (!p.name?.toLowerCase().includes(s) && !p.goal?.toLowerCase().includes(s) && !p.description?.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "On Track": return "bg-[#16A34A]/10 text-[#16A34A]";
      case "At Risk": return "bg-[#F5B800]/10 text-[#D99A00] dark:text-[#F5B800]";
      case "Delayed": return "bg-[#EF4444]/10 text-[#EF4444]";
      case "Completed": return "bg-[#3B82F6]/10 text-[#3B82F6]";
      case "Archived": return "bg-[#52525B]/10 text-[#52525B] dark:text-[#A1A1AA]";
      default: return "bg-[#F4F4F5] dark:bg-[#1D1D1D] text-[#52525B] dark:text-[#A1A1AA]";
    }
  };

  const getDaysLeft = (deadline: string) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days;
  };

  const getIconColor = (name: string) => {
    const colors = ["bg-[#8B5CF6]", "bg-[#3B82F6]", "bg-[#F97316]", "bg-[#14B8A6]", "bg-[#F43F5E]"];
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight tracking-tight mb-2">
            Projects
          </h1>
          <p className="text-[16px] text-[#52525B] dark:text-[#A1A1AA] max-w-[600px]">
            Plan, build and complete your meaningful projects.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
          <div className="relative min-w-[200px] flex-1 lg:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-full border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto hide-scrollbar pb-2">
        {["All", "Active", "On Track", "At Risk", "Delayed", "Completed"].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === status ? "bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808]" : "bg-transparent text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"}`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Prompt Composer */}
      <div className="mb-10 w-full max-w-[800px] bg-white dark:bg-[#111111] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#242424] shadow-sm">
        <h2 className="text-lg font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">Describe what you want to build</h2>
        <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] mb-4">Describe your goal, deadline, available time and what you want to accomplish.</p>
        <PromptComposer 
          type="project" 
          placeholder="e.g. Build an AI SaaS platform by September 30. I can work 3 hours a day. Create milestones and daily tasks." 
          onSuccess={fetchProjects}
        />
      </div>

      {/* Projects List */}
      <div className="flex-1 pb-20 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoaderCircle className="w-8 h-8 text-[#A1A1AA] animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-center">
            <FolderKanban className="w-12 h-12 text-[#A1A1AA] dark:text-[#52525B] mb-4" />
            <h3 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">No projects found</h3>
            <p className="text-[#52525B] dark:text-[#A1A1AA] max-w-md">
              Try adjusting your filters or create a new project above.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden lg:block w-full overflow-x-auto border border-[#E5E7EB] dark:border-[#242424] rounded-2xl bg-white dark:bg-[#111111] shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] dark:border-[#242424]">
                    <th className="font-semibold text-xs text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider p-4 pl-6">Project</th>
                    <th className="font-semibold text-xs text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider p-4">Progress</th>
                    <th className="font-semibold text-xs text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider p-4">Tasks</th>
                    <th className="font-semibold text-xs text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider p-4">Milestones</th>
                    <th className="font-semibold text-xs text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider p-4">Deadline</th>
                    <th className="font-semibold text-xs text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider p-4">Status</th>
                    <th className="font-semibold text-xs text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider p-4 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map(project => {
                    const daysLeft = getDaysLeft(project.deadline);
                    return (
                      <tr key={project.id} className="border-b border-[#E5E7EB] dark:border-[#242424] hover:bg-[#F4F4F5]/50 dark:hover:bg-[#1D1D1D]/50 transition-colors group">
                        <td className="p-4 pl-6 cursor-pointer" onClick={() => router.push(`/personal/projects/${project.id}`)}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 ${getIconColor(project.name)}`}>
                              {project.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-[#171717] dark:text-[#F5F5F5] group-hover:text-[#D99A00] dark:group-hover:text-[#F5B800] transition-colors">{project.name}</div>
                              <div className="text-xs text-[#52525B] dark:text-[#A1A1AA] line-clamp-1 max-w-[280px]">{project.description || project.goal || "No description"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-[#E5E7EB] dark:bg-[#242424] rounded-full overflow-hidden">
                              <div className="h-full bg-[#16A34A]" style={{ width: `${project.progress || 0}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F5]">{project.progress || 0}%</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">{project.completedTasks || 0} / {project.totalTasks || 0}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">{project.completedMilestones || 0} / {project.totalMilestones || 0}</div>
                        </td>
                        <td className="p-4">
                          {project.deadline ? (
                            <div>
                              <div className="text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">{new Date(project.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              <div className={`text-xs mt-0.5 ${daysLeft !== null && daysLeft < 0 ? "text-[#EF4444]" : "text-[#D99A00] dark:text-[#F5B800]"}`}>
                                {daysLeft !== null ? (daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)} days` : `${daysLeft} days left`) : ""}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-[#A1A1AA]">Not set</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </td>
                        <td className="p-4 text-center relative">
                          <ThreeDotMenu project={project} onDuplicate={handleDuplicate} onArchive={handleArchive} onDelete={handleDelete} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="flex flex-col gap-4 lg:hidden">
              {filteredProjects.map(project => {
                const daysLeft = getDaysLeft(project.deadline);
                return (
                  <div key={project.id} className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-4 shadow-sm flex flex-col relative group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => router.push(`/personal/projects/${project.id}`)}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 ${getIconColor(project.name)}`}>
                          {project.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#171717] dark:text-[#F5F5F5] text-base group-hover:text-[#D99A00] dark:group-hover:text-[#F5B800] transition-colors">{project.name}</div>
                          <div className="text-xs text-[#52525B] dark:text-[#A1A1AA] line-clamp-1">{project.description || project.goal || "No description"}</div>
                        </div>
                      </div>
                      <div className="ml-2">
                        <ThreeDotMenu project={project} onDuplicate={handleDuplicate} onArchive={handleArchive} onDelete={handleDelete} />
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[#E5E7EB] dark:bg-[#242424] rounded-full overflow-hidden">
                          <div className="h-full bg-[#16A34A]" style={{ width: `${project.progress || 0}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F5]">{project.progress || 0}%</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#52525B] dark:text-[#A1A1AA] mt-3">
                      <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {project.completedTasks || 0}/{project.totalTasks || 0} tasks</div>
                      <div className="flex items-center gap-1"><Target className="w-3 h-3"/> {project.completedMilestones || 0}/{project.totalMilestones || 0} milestones</div>
                    </div>
                    
                    {project.deadline && (
                      <div className="text-xs text-[#171717] dark:text-[#F5F5F5] font-medium mt-3 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#A1A1AA]" />
                        {new Date(project.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span className={`ml-1 ${daysLeft !== null && daysLeft < 0 ? "text-[#EF4444]" : "text-[#52525B] dark:text-[#A1A1AA]"}`}>
                          • {daysLeft !== null ? (daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)} days` : `${daysLeft} days left`) : ""}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Separate component for the menu to handle its own open/close state robustly
function ThreeDotMenu({ project, onDuplicate, onArchive, onDelete }: { project: any, onDuplicate: (id:string)=>void, onArchive: (id:string)=>void, onDelete: (id:string)=>void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useOnClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative inline-block">
      <button 
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 rounded-full text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors focus:outline-none"
        aria-label="More options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <button 
            onClick={(e) => { e.stopPropagation(); setOpen(false); router.push(`/personal/projects/${project.id}`); }}
            className="w-full px-4 py-2 text-left text-sm text-[#171717] dark:text-[#F5F5F5] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] flex items-center gap-2"
          >
            <FolderKanban className="w-4 h-4 text-[#A1A1AA]" />
            Open Project
          </button>
          {/* Real edit would open a modal, omitted for brevity / fallback to Open Project */}
          <button 
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDuplicate(project.id); }}
            className="w-full px-4 py-2 text-left text-sm text-[#171717] dark:text-[#F5F5F5] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] flex items-center gap-2"
          >
            <Copy className="w-4 h-4 text-[#A1A1AA]" />
            Duplicate Project
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setOpen(false); onArchive(project.id); }}
            className="w-full px-4 py-2 text-left text-sm text-[#171717] dark:text-[#F5F5F5] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] flex items-center gap-2"
          >
            <Archive className="w-4 h-4 text-[#A1A1AA]" />
            Archive Project
          </button>
          
          <div className="h-[1px] w-full bg-[#E5E7EB] dark:bg-[#242424] my-1" />
          
          <button 
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(project.id); }}
            className="w-full px-4 py-2 text-left text-sm text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#450a0a]/30 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Project
          </button>
        </div>
      )}
    </div>
  );
}
