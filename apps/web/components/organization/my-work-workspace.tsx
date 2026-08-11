"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckSquare, Loader2, AlertCircle, Clock, FolderKanban,
  Play, CheckCircle2, XCircle, ShieldCheck, ExternalLink, ArrowRight, User, Flag, Calendar
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { PremiumCard } from "@/components/ui/premium-card";
import { TaskAssignmentModal } from "@/components/tasks/task-assignment-modal";
import { ProjectAssignmentModal } from "@/components/organization/project-assignment-modal";
import Link from "next/link";

interface MyWorkWorkspaceProps {
  userRole?: string;
}

export function MyWorkWorkspace({ userRole = "MEMBER" }: MyWorkWorkspaceProps) {
  const { socket } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [startWorkLoading, setStartWorkLoading] = useState<string | null>(null);

  const fetchMyWork = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.get(`/org/my-work?workspaceId=${workspaceId}`);
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.error || "Failed to load My Work queue");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load My Work queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyWork();
  }, [fetchMyWork]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTaskId = params.get("taskId");
      const urlProjectId = params.get("projectId");
      if (urlTaskId) {
        setSelectedTaskId(urlTaskId);
      }
      if (urlProjectId) {
        setSelectedProjectId(urlProjectId);
      }
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated", fetchMyWork);
    socket.on("task.created", fetchMyWork);
    socket.on("project.updated", fetchMyWork);
    socket.on("notification.created", fetchMyWork);
    return () => {
      socket.off("task.updated");
      socket.off("task.created");
      socket.off("project.updated");
      socket.off("notification.created");
    };
  }, [socket, fetchMyWork]);

  const handleStartWork = async (taskId: string) => {
    setStartWorkLoading(taskId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/tasks/${taskId}/start-work?workspaceId=${workspaceId}`);
      if (res.data?.success) {
        fetchMyWork();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to start work");
    } finally {
      setStartWorkLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  const summary = data?.summary || { pendingCount: 0, activeCount: 0, dueTodayCount: 0, overdueCount: 0, completedCount: 0 };
  const pendingTaskList = data?.pendingAcceptance || [];
  const pendingProjectList = data?.pendingProjectAssignments || [];
  const activeTaskList = data?.activeWork || [];
  const assignedProjectsList = data?.assignedProjects || [];
  const completedList = data?.completed || [];

  return (
    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto w-full space-y-6 text-xs">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-gold" /> My Work
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Work assigned to you and items requiring your action.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-gold/10 text-gold border border-gold/20 font-bold uppercase text-[10px] tracking-wider">
            {userRole} WORKSPACE
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Pending Acceptance</span>
          <p className="text-2xl font-bold text-gold mt-1">{summary.pendingCount}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-card border border-border">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">In Progress</span>
          <p className="text-2xl font-bold text-blue-500 mt-1">{summary.activeCount}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-card border border-border">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Due Today</span>
          <p className="text-2xl font-bold text-orange-500 mt-1">{summary.dueTodayCount}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-card border border-border">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Overdue</span>
          <p className="text-2xl font-bold text-destructive mt-1">{summary.overdueCount}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-card border border-border">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Completed</span>
          <p className="text-2xl font-bold text-[#65C466] mt-1">{summary.completedCount}</p>
        </div>
      </div>

      {/* SECTION 1: PENDING PROJECT ASSIGNMENTS */}
      {pendingProjectList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-2">
              <FolderKanban className="w-4 h-4" /> Pending Project Assignments ({pendingProjectList.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingProjectList.map((proj: any) => (
              <div
                key={proj.id}
                className="bg-card border border-gold/30 hover:border-gold rounded-2xl p-5 space-y-4 shadow-sm transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 text-[10px] font-bold uppercase tracking-wider">
                      PENDING ACCEPTANCE
                    </span>
                    <span className="text-[10px] font-semibold text-gold uppercase font-mono">
                      {proj.currentStage || "Stage 01 / 08"}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground leading-snug">{proj.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{proj.description || proj.objective || "No objective"}</p>

                  <div className="flex justify-between items-center text-[11px] bg-background border border-border p-3 rounded-xl">
                    <span className="text-muted-foreground font-semibold">Assigned By</span>
                    <span className="font-semibold text-foreground">{proj.assignedByName || "CEO"} ({proj.assignedByRole || "CEO"})</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProjectId(proj.id)}
                  className="w-full py-2 px-4 rounded-xl bg-gold hover:bg-gold-hover text-[#0A0A0A] font-bold text-xs transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm"
                >
                  <span>Review Project Assignment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: ASSIGNED PROJECTS */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-gold" /> Assigned Projects ({assignedProjectsList.length})
        </h2>

        {assignedProjectsList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedProjectsList.map((proj: any) => (
              <div
                key={proj.id}
                className="bg-card border border-border hover:border-gold/40 rounded-2xl p-5 space-y-4 shadow-sm transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#65C466]/10 text-[#65C466] border border-[#65C466]/20 text-[10px] font-bold uppercase tracking-wider">
                      {proj.assignmentStatus || "ACCEPTED"}
                    </span>
                    <span className="text-[10px] font-semibold text-gold uppercase font-mono">
                      {proj.currentStage || "Stage 01 / 08"}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground leading-snug">{proj.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{proj.description || proj.objective || "No objective"}</p>
                </div>

                <Link
                  href={userRole.includes("CO") ? `/co-ceo/projects/${proj.id}` : `/ceo/projects/${proj.id}`}
                  className="w-full py-2 px-4 rounded-xl bg-accent hover:bg-accent/80 text-foreground font-semibold text-xs transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <span>Open Project</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-card border border-border rounded-2xl text-center text-muted-foreground text-xs">
            No projects assigned to your account.
          </div>
        )}
      </div>

      {/* SECTION 3: PENDING TASK ASSIGNMENTS */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> Pending Task Assignments ({pendingTaskList.length})
          </h2>
        </div>

        {pendingTaskList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTaskList.map((item: any) => {
              const task = item.task || item;
              const proj = item.project;
              const ms = item.milestone;
              const assigner = item.assigner;
              const assignee = item.assignee;

              return (
                <div
                  key={task.id}
                  className="bg-card border border-gold/30 hover:border-gold rounded-2xl p-5 space-y-4 shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 text-[10px] font-bold uppercase tracking-wider">
                        {item.assignmentStatus || "PENDING ACCEPTANCE"}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        {task.priority || "Medium"} Priority
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground leading-snug">{task.title}</h3>

                    <div className="space-y-2 bg-background border border-border p-3 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-[10px] font-semibold uppercase">Project</span>
                        <span className="font-semibold text-foreground truncate max-w-[170px]">
                          {proj?.name || item.projectName || "Standalone Task"}
                        </span>
                      </div>
                      {proj?.currentStage && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-[10px] font-semibold uppercase">Stage</span>
                          <span className="font-semibold text-gold">{proj.currentStage}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-[10px] font-semibold uppercase">Milestone</span>
                        <span className="font-semibold text-foreground truncate max-w-[170px]">
                          {ms?.name || item.milestoneName || "No Milestone"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground text-[10px] font-semibold uppercase block">Assigned By</span>
                        <span className="font-semibold text-foreground">
                          {assigner?.name || item.assignedByName || "CEO"}
                        </span>
                        <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground">
                          {assigner?.role || item.assignedByRole || "CEO"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] font-semibold uppercase block">Assigned To</span>
                        <span className="font-semibold text-foreground">
                          {assignee?.name || "You"}
                        </span>
                        <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-gold/10 text-gold">
                          {assignee?.role || item.assigneeRole || userRole}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-gold" />
                      <span>Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "Flexible"}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className="w-full py-2 px-4 rounded-xl bg-gold hover:bg-gold-hover text-[#0A0A0A] font-bold text-xs transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm"
                  >
                    <span>Review Assignment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-card border border-border rounded-2xl text-center text-muted-foreground text-xs">
            No pending task assignments requiring your acceptance.
          </div>
        )}
      </div>

      {/* SECTION 4: MY ACTIVE TASKS */}
      <div className="space-y-3 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-blue-500" /> My Active Tasks ({activeTaskList.length})
        </h2>

        {activeTaskList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTaskList.map((item: any) => {
              const task = item.task || item;
              const proj = item.project;
              const ms = item.milestone;

              return (
                <div
                  key={task.id}
                  className="bg-card border border-border hover:border-blue-500/40 rounded-2xl p-5 space-y-4 shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider">
                        {task.status}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        {task.priority || "Medium"}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground leading-snug">{task.title}</h3>

                    <div className="space-y-1.5 bg-background border border-border p-3 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-[10px] font-semibold uppercase">Project</span>
                        <span className="font-semibold text-foreground truncate max-w-[170px]">
                          {proj?.name || item.projectName || "Standalone Task"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-[10px] font-semibold uppercase">Milestone</span>
                        <span className="font-semibold text-foreground truncate max-w-[170px]">
                          {ms?.name || item.milestoneName || "No Milestone"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {task.status === "ACCEPTED" || task.status === "Accepted" ? (
                      <button
                        type="button"
                        onClick={() => handleStartWork(task.id)}
                        disabled={startWorkLoading === task.id}
                        className="flex-1 py-2 px-3 rounded-xl bg-gold hover:bg-gold-hover text-[#0A0A0A] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {startWorkLoading === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>Start Work</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedTaskId(task.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-accent hover:bg-accent/80 text-foreground font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>Open Details</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-card border border-border rounded-2xl text-center text-muted-foreground text-xs">
            No active tasks currently in progress.
          </div>
        )}
      </div>

      {/* SECTION 5: RECENTLY COMPLETED */}
      {completedList.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#65C466] flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> Recently Completed ({completedList.length})
          </h2>
          <div className="space-y-2">
            {completedList.slice(0, 5).map((item: any) => {
              const task = item.task || item;
              return (
                <div key={task.id} className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground">{task.title}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      {item.projectName || "Standalone Task"} • Completed
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#65C466]/10 text-[#65C466] border border-[#65C466]/20 font-bold text-[10px]">
                    APPROVED
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Real Task Assignment Modal */}
      {selectedTaskId && (
        <TaskAssignmentModal
          taskId={selectedTaskId}
          isOpen={Boolean(selectedTaskId)}
          onClose={() => setSelectedTaskId(null)}
          onRefresh={fetchMyWork}
        />
      )}

      {/* Real Project Assignment Modal */}
      {selectedProjectId && (
        <ProjectAssignmentModal
          projectId={selectedProjectId}
          isOpen={Boolean(selectedProjectId)}
          onClose={() => setSelectedProjectId(null)}
          onRefresh={fetchMyWork}
        />
      )}
    </div>
  );
}

