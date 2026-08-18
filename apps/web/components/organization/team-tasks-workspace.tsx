"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare, Loader2, AlertCircle, Clock, FolderKanban,
  User, Plus, RefreshCw, Search, CheckCircle2, AlertTriangle, ShieldCheck
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";
import { TaskCreateModal } from "@/components/organization/task-create-modal";
import { TaskAssignmentModal } from "@/components/tasks/task-assignment-modal";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";

export function TeamTasksWorkspace() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [scopeTab, setScopeTab] = useState<"team" | "my">("team");
  const [filterTab, setFilterTab] = useState<"All" | "Pending" | "In Progress" | "Due Today" | "Overdue">("All");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [initialTaskType, setInitialTaskType] = useState<any>("CUSTOM");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const openAssignModalWithType = (type: any) => {
    setInitialTaskType(type);
    setShowAssignModal(true);
  };

  const fetchTeamTasks = useCallback(async () => {
    try {
      setError("");
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (!workspaceId) {
        setLoading(false);
        return;
      }

      const res = await apiClient.get(`/org/tasks?workspaceId=${workspaceId}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTasks(res.data.data);
      } else if (res.data?.error) {
        setError(typeof res.data.error === "string" ? res.data.error : res.data.error.message || "Failed to load team tasks");
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || "Failed to load team tasks");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useRegisterRefresh(fetchTeamTasks);

  useEffect(() => {
    fetchTeamTasks();
  }, [fetchTeamTasks]);

  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => fetchTeamTasks();

    socket.on("task.updated", handleRefresh);
    socket.on("task.created", handleRefresh);
    socket.on("task.status_changed", handleRefresh);
    socket.on("TASK_ASSIGNED", handleRefresh);
    socket.on("TASK_ACCEPTED", handleRefresh);
    socket.on("TASK_COMPLETED", handleRefresh);

    return () => {
      socket.off("task.updated", handleRefresh);
      socket.off("task.created", handleRefresh);
      socket.off("task.status_changed", handleRefresh);
      socket.off("TASK_ASSIGNED", handleRefresh);
      socket.off("TASK_ACCEPTED", handleRefresh);
      socket.off("TASK_COMPLETED", handleRefresh);
    };
  }, [socket, fetchTeamTasks]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchTeamTasks();
  };

  // Scope tasks based on Segmented Toggle
  const scopedTasks = useMemo(() => {
    if (scopeTab === "my") {
      return tasks.filter((t) => t.assigneeId === user?.id);
    }
    return tasks.filter((t) => t.assigneeId !== user?.id);
  }, [tasks, scopeTab, user]);

  // KPI Metrics calculation
  const metrics = useMemo(() => {
    const todayStr = new Date().toDateString();
    const now = new Date();

    const assigned = scopedTasks.filter((t) => t.status === "Assigned" || t.status === "PENDING_ACCEPTANCE" || t.status === "Draft").length;
    const inProgress = scopedTasks.filter((t) => t.status === "In Progress" || t.status === "Accepted").length;
    const dueToday = scopedTasks.filter((t) => t.deadline && new Date(t.deadline).toDateString() === todayStr && t.status !== "Completed" && t.status !== "Approved").length;
    const overdue = scopedTasks.filter((t) => t.deadline && new Date(t.deadline) < now && t.status !== "Completed" && t.status !== "Approved").length;

    return { assigned, inProgress, dueToday, overdue };
  }, [scopedTasks]);

  // Filtering
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toDateString();
    const now = new Date();

    return scopedTasks.filter((t) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = t.title?.toLowerCase().includes(q);
        const matchesAssignee = t.assigneeName?.toLowerCase().includes(q);
        const matchesProject = t.projectName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAssignee && !matchesProject) return false;
      }

      // Filter Tab
      if (filterTab === "Pending") return t.status === "Assigned" || t.status === "PENDING_ACCEPTANCE" || t.status === "Draft";
      if (filterTab === "In Progress") return t.status === "In Progress" || t.status === "Accepted";
      if (filterTab === "Due Today") return t.deadline && new Date(t.deadline).toDateString() === todayStr && t.status !== "Completed" && t.status !== "Approved";
      if (filterTab === "Overdue") return t.deadline && new Date(t.deadline) < now && t.status !== "Completed" && t.status !== "Approved";

      return true;
    });
  }, [scopedTasks, search, filterTab]);

  return (
    <PullToRefresh onRefresh={fetchTeamTasks}>
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pb-12 max-w-[1440px] mx-auto w-full space-y-5 text-xs font-sans">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-[#E5E7EB] dark:border-[#272D36]">
          <div>
            <h1 className="text-[24px] sm:text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-[#B28D18] dark:text-[#C9A52A]" />
              <span>Tasks</span>
            </h1>
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-1">
              {scopeTab === "team"
                ? "Manage work assigned to Members under your management."
                : "Work assigned to you directly by the CEO."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            {/* Segmented Control Toggle */}
            <div className="p-1 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center gap-1">
              <button
                type="button"
                onClick={() => setScopeTab("my")}
                className={`px-3 py-1.5 rounded-[7px] text-[11.5px] font-bold transition-all cursor-pointer ${
                  scopeTab === "my"
                    ? "bg-[#FFFFFF] dark:bg-[#15191F] text-[#B28D18] dark:text-[#C9A52A] shadow-xs"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                My Assigned Work
              </button>

              <button
                type="button"
                onClick={() => setScopeTab("team")}
                className={`px-3 py-1.5 rounded-[7px] text-[11.5px] font-bold transition-all cursor-pointer ${
                  scopeTab === "team"
                    ? "bg-[#FFFFFF] dark:bg-[#15191F] text-[#B28D18] dark:text-[#C9A52A] shadow-xs"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                Team Tasks
              </button>
            </div>

            {scopeTab === "team" && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 px-4 h-[40px] rounded-[10px] bg-[#B28D18] hover:bg-[#967412] dark:bg-[#C9A52A] dark:hover:bg-[#B28D18] text-white dark:text-[#0B0D10] text-[12.5px] font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Assign Task</span>
              </button>
            )}

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center w-[40px] h-[40px] rounded-[10px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Refresh Team Tasks"
              title="Refresh Team Tasks"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Quick Task Creation Presets Bar ── */}
        {scopeTab === "team" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-bold uppercase text-[#B28D18] dark:text-[#C9A52A] tracking-wider shrink-0 pr-1">
              QUICK TASK PRESETS:
            </span>
            {[
              { type: "LEARNING", label: "+ Learning Task" },
              { type: "DOCUMENT", label: "+ Document Task" },
              { type: "RESEARCH", label: "+ Research Task" },
              { type: "REVIEW", label: "+ Review Task" },
              { type: "DEVELOPMENT", label: "+ Development Task" },
              { type: "CUSTOM", label: "+ Custom Task" },
            ].map((preset) => (
              <button
                key={preset.type}
                type="button"
                onClick={() => openAssignModalWithType(preset.type)}
                className="px-3 py-1 rounded-full bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] hover:border-[#B28D18] text-[#17202A] dark:text-[#F2F4F7] text-[11px] font-bold shrink-0 shadow-2xs transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-[12px] text-rose-600 dark:text-rose-400 text-[12.5px] font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* ── KPI Metric Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setFilterTab("Pending")}
            className={`p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border transition-all cursor-pointer ${
              filterTab === "Pending"
                ? "border-[#B28D18] dark:border-[#C9A52A] ring-1 ring-[#B28D18]"
                : "border-[#E5E7EB] dark:border-[#272D36]"
            }`}
          >
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
              ASSIGNED
            </span>
            <p className="text-[26px] font-extrabold text-[#B28D18] dark:text-[#C9A52A] font-mono leading-none mt-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : metrics.assigned}
            </p>
            <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">Pending acceptance</p>
          </div>

          <div
            onClick={() => setFilterTab("In Progress")}
            className={`p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border transition-all cursor-pointer ${
              filterTab === "In Progress"
                ? "border-blue-500 ring-1 ring-blue-500"
                : "border-[#E5E7EB] dark:border-[#272D36]"
            }`}
          >
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
              IN PROGRESS
            </span>
            <p className="text-[26px] font-extrabold text-blue-500 font-mono leading-none mt-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : metrics.inProgress}
            </p>
            <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">Currently active</p>
          </div>

          <div
            onClick={() => setFilterTab("Due Today")}
            className={`p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border transition-all cursor-pointer ${
              filterTab === "Due Today"
                ? "border-amber-500 ring-1 ring-amber-500"
                : "border-[#E5E7EB] dark:border-[#272D36]"
            }`}
          >
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
              DUE TODAY
            </span>
            <p className="text-[26px] font-extrabold text-amber-500 font-mono leading-none mt-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : metrics.dueToday}
            </p>
            <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">Approaching deadline</p>
          </div>

          <div
            onClick={() => setFilterTab("Overdue")}
            className={`p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border transition-all cursor-pointer ${
              filterTab === "Overdue"
                ? "border-rose-500 ring-1 ring-rose-500"
                : "border-[#E5E7EB] dark:border-[#272D36]"
            }`}
          >
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
              OVERDUE
            </span>
            <p className="text-[26px] font-extrabold text-rose-500 font-mono leading-none mt-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : metrics.overdue}
            </p>
            <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">Requires action</p>
          </div>
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#07090D] p-3 rounded-[14px] border border-[#E5E7EB] dark:border-[#272D36]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />
            <input
              type="text"
              placeholder="Search tasks, members, or projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 h-[36px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] rounded-[8px] text-[12px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(["All", "Pending", "In Progress", "Due Today", "Overdue"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 rounded-[7px] text-[11.5px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  filterTab === tab
                    ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10]"
                    : "bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Member Task Table ── */}
        <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
          <div className="hidden sm:grid grid-cols-12 px-5 py-3 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA] dark:bg-[#111419] text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">
            <span className="col-span-5">TASK</span>
            <span className="col-span-3">MEMBER</span>
            <span className="col-span-2">PROJECT</span>
            <span className="col-span-2 text-right">STATUS</span>
          </div>

          <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-[#F8F9FA] dark:bg-[#111419] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center space-y-2">
                <CheckSquare className="w-8 h-8 text-[#667085]/40" />
                <p className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No tasks found</p>
                <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                  Tasks assigned to your Members will appear here.
                </p>
              </div>
            ) : (
              filteredTasks.map((t) => {
                const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== "Completed" && t.status !== "Approved";

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="px-5 py-3.5 flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-3 sm:gap-2 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors cursor-pointer"
                  >
                    {/* Task Title */}
                    <div className="sm:col-span-5 space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">
                          {t.title}
                        </span>
                        {t.priority && (
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            t.priority === "High" || t.priority === "Urgent"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20"
                          }`}>
                            {t.priority}
                          </span>
                        )}
                      </div>
                      {t.deadline && (
                        <p className={`text-[11px] flex items-center gap-1 ${isOverdue ? "font-bold text-rose-600 dark:text-rose-400" : "text-[#667085] dark:text-[#8B95A5]"}`}>
                          <Clock className="w-3 h-3" />
                          <span>Due {new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </p>
                      )}
                    </div>

                    {/* Member */}
                    <div className="sm:col-span-3 flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#B28D18]/10 text-[#B28D18] border border-[#B28D18]/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {(t.assigneeName || "M").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] font-medium text-[#17202A] dark:text-[#F2F4F7] truncate">
                        {t.assigneeName || "Unassigned"}
                      </span>
                    </div>

                    {/* Project */}
                    <div className="sm:col-span-2 text-[11.5px] text-[#667085] dark:text-[#8B95A5] truncate">
                      {t.projectName ? (
                        <span className="flex items-center gap-1">
                          <FolderKanban className="w-3 h-3 text-[#B28D18]" />
                          <span className="truncate">{t.projectName}</span>
                        </span>
                      ) : (
                        "Standalone"
                      )}
                    </div>

                    {/* Status */}
                    <div className="sm:col-span-2 flex items-center justify-start sm:justify-end">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                        t.status === "In Progress" || t.status === "Accepted"
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : t.status === "Completed" || t.status === "Approved"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : isOverdue
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}>
                        {isOverdue ? "OVERDUE" : t.status || "PENDING"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal: Task Assignment Modal for CO-CEO */}
        <TaskCreateModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onCreated={fetchTeamTasks}
          role="CO-CEO"
          isPersonalWorkspace={false}
          initialType={initialTaskType}
        />

        {selectedTaskId && (
          <TaskAssignmentModal
            taskId={selectedTaskId}
            isOpen={Boolean(selectedTaskId)}
            onClose={() => setSelectedTaskId(null)}
            onRefresh={fetchTeamTasks}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
