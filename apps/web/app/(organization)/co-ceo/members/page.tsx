"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Users, Target, FolderKanban, AlertCircle, Loader2,
  RefreshCw, ArrowLeft, UserCheck, Clock, CheckCircle2, ShieldAlert,
  Play, Search, ChevronRight, X, ExternalLink
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import Link from "next/link";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import { TaskAssignmentModal } from "@/components/tasks/task-assignment-modal";

interface MemberItem {
  id: string;
  userId?: string;
  name?: string;
  displayName?: string;
  email: string;
  role: string;
  status?: string;
  currentTask?: string;
  currentTaskId?: string;
  currentProject?: string;
  progress?: number;
  dueToday?: string;
  completedTodayCount?: number;
  isOverdue?: boolean;
  tasks?: any[];
}

export default function CoCeoMembersPage() {
  const { socket, isConnected } = useSocket();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setError("");
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (!wsId) {
        setLoading(false);
        return;
      }

      const res = await apiClient.get(`/org/members?workspaceId=${wsId}`);
      if (res.data?.success) {
        const raw = res.data.data || [];
        // Scope to MEMBER role users under CO-CEO leadership
        const filtered = raw.filter((m: any) => {
          const r = (m.role || m.workspaceRole || "").toUpperCase();
          return r === "MEMBER";
        }).map((m: any) => ({
          id: m.id || m.userId,
          userId: m.userId || m.id,
          name: m.name || m.displayName || m.email?.split("@")[0] || "Team Member",
          displayName: m.displayName || m.name || "Team Member",
          email: m.email || "",
          role: m.role || "MEMBER",
          status: m.status || (m.currentTask ? "WORKING" : "IDLE"),
          currentTask: m.currentTask || m.taskTitle || null,
          currentTaskId: m.currentTaskId || m.taskId || null,
          currentProject: m.currentProject || m.projectName || null,
          progress: typeof m.progress === "number" ? m.progress : m.currentTask ? 65 : 0,
          dueToday: m.dueToday || m.deadline || null,
          completedTodayCount: m.completedTodayCount || m.completedToday || 0,
          isOverdue: Boolean(m.isOverdue),
          tasks: m.tasks || [],
        }));

        setMembers(filtered);
      } else {
        setError(res.data?.error || "Failed to load team members");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load team members");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useRegisterRefresh(fetchMembers);

  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => fetchMembers();

    socket.on("MEMBER_ACTIVATED", handleRefresh);
    socket.on("task.updated", handleRefresh);
    socket.on("task.created", handleRefresh);
    socket.on("task.status_changed", handleRefresh);
    socket.on("USER_STATUS_CHANGED", handleRefresh);

    return () => {
      socket.off("MEMBER_ACTIVATED", handleRefresh);
      socket.off("task.updated", handleRefresh);
      socket.off("task.created", handleRefresh);
      socket.off("task.status_changed", handleRefresh);
      socket.off("USER_STATUS_CHANGED", handleRefresh);
    };
  }, [socket, fetchMembers]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchMembers();
  };

  const summary = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.status?.toLowerCase() !== "offline").length;
    const working = members.filter((m) => m.status?.toUpperCase() === "WORKING" || Boolean(m.currentTask)).length;
    const atRisk = members.filter((m) => m.isOverdue || m.status?.toUpperCase() === "AT RISK").length;
    const completedToday = members.reduce((acc, m) => acc + (m.completedTodayCount || 0), 0);

    return { total, active, working, atRisk, completedToday };
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const query = search.toLowerCase();
    return members.filter(
      (m) =>
        m.name?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query) ||
        m.currentTask?.toLowerCase().includes(query)
    );
  }, [members, search]);

  const socketStatusLabel = isConnected ? "LIVE" : socket ? "RECONNECTING" : "OFFLINE";

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pb-12 max-w-[1440px] mx-auto w-full space-y-5 text-xs">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-[#E5E7EB] dark:border-[#272D36]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] uppercase tracking-wider">
              CO-CEO · TEAM CONTROL CENTER
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#B28D18] dark:text-[#C9A52A]" />
            <span>My Members</span>
          </h1>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-1">
            Track your assigned members, workload, and execution progress.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[11px] font-bold">
            <span className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`} />
            <span className="text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider font-mono">
              {socketStatusLabel}
            </span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Members"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-[12px] text-rose-600 dark:text-rose-400 text-[12.5px] font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchMembers} className="underline text-[11.5px]">Retry</button>
        </div>
      )}

      {/* ── Summary KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
          <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
            TEAM MEMBERS
          </span>
          <p className="text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] font-mono leading-none mt-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : summary.total}
          </p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1">Assigned under you</p>
        </div>

        <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
          <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
            ACTIVE
          </span>
          <p className="text-[26px] font-extrabold text-emerald-500 font-mono leading-none mt-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : summary.active}
          </p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1">Online & active</p>
        </div>

        <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
          <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
            WORKING
          </span>
          <p className="text-[26px] font-extrabold text-blue-500 font-mono leading-none mt-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : summary.working}
          </p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1">In progress on task</p>
        </div>

        <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
          <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
            AT RISK
          </span>
          <p className="text-[26px] font-extrabold text-rose-500 font-mono leading-none mt-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : summary.atRisk}
          </p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1">
            {summary.atRisk > 0 ? "Requires assistance" : "All on schedule"}
          </p>
        </div>

        <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
          <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
            COMPLETED TODAY
          </span>
          <p className="text-[26px] font-extrabold text-[#B28D18] dark:text-[#C9A52A] font-mono leading-none mt-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : summary.completedToday}
          </p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1">Tasks delivered today</p>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />
        <input
          type="text"
          placeholder="Filter team members by name, email, or task..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3.5 h-[38px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18]"
        />
      </div>

      {/* ── Team Table / Control Grid ── */}
      <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA] dark:bg-[#111419] flex items-center justify-between text-[11.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">
          <span>TEAM MEMBERS ({filteredMembers.length})</span>
          <span>EXECUTION STATUS</span>
        </div>

        <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-[#F8F9FA] dark:bg-[#111419] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center space-y-2">
              <Users className="w-8 h-8 text-[#667085]/40" />
              <p className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No members assigned</p>
              <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                Team members assigned under your supervision will appear here.
              </p>
            </div>
          ) : (
            filteredMembers.map((m) => {
              const statusUpper = (m.status || "IDLE").toUpperCase();
              const isWorking = statusUpper === "WORKING" || Boolean(m.currentTask);

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMember(m)}
                  className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 flex items-center justify-center text-[13px] font-extrabold text-[#B28D18] dark:text-[#C9A52A] shrink-0">
                      {(m.name || "M").charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                          {m.name}
                        </span>
                        <span className="px-2 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-[9.5px] font-bold uppercase text-[#667085] dark:text-[#8B95A5]">
                          {m.role}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] truncate">
                        {m.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-[11.5px] shrink-0">
                    {/* Current Task & Progress */}
                    <div className="min-w-[200px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#667085] dark:text-[#8B95A5] text-[10.5px] font-bold uppercase">
                          Current Task
                        </span>
                        <span className="font-mono text-[10.5px] font-bold text-[#B28D18] dark:text-[#C9A52A]">
                          {m.progress}%
                        </span>
                      </div>
                      <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate max-w-[220px]">
                        {m.currentTask || "No active task"}
                      </p>
                      <div className="w-full h-1.5 bg-[#E5E7EB] dark:bg-[#272D36] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#B28D18] dark:bg-[#C9A52A] rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, m.progress || 0))}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                        isWorking
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : statusUpper === "OFFLINE"
                          ? "bg-gray-500/10 text-gray-500 border-gray-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      }`}>
                        {isWorking ? "● WORKING" : statusUpper}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMember(m);
                        }}
                        className="px-3 py-1.5 rounded-[8px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[11px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] transition-colors flex items-center gap-1"
                      >
                        <span>View Member</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Member Detail Modal / Sheet ── */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#272D36] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#B28D18]/10 text-[#B28D18] border border-[#B28D18]/20 flex items-center justify-center text-[12px] font-extrabold">
                  {(selectedMember.name || "M").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    {selectedMember.name}
                  </h3>
                  <p className="text-[11px] text-[#667085] dark:text-[#8B95A5]">{selectedMember.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-1 text-[#667085]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-[12px]">
              <div className="p-3.5 bg-[#F8F9FA] dark:bg-[#111419] rounded-[10px] space-y-2 border border-[#E5E7EB] dark:border-[#272D36]">
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">CURRENT ACTIVE WORK</span>
                <p className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  {selectedMember.currentTask || "No active task assigned"}
                </p>
                {selectedMember.currentProject && (
                  <p className="text-[11.5px] text-[#667085]">Project: {selectedMember.currentProject}</p>
                )}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#667085]">Completion Progress</span>
                    <span className="font-bold text-[#B28D18]">{selectedMember.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E5E7EB] dark:bg-[#272D36] rounded-full overflow-hidden">
                    <div className="h-full bg-[#B28D18] rounded-full" style={{ width: `${selectedMember.progress}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-[#F8F9FA] dark:bg-[#111419] rounded-[10px] border border-[#E5E7EB] dark:border-[#272D36]">
                <div>
                  <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Completed Today</span>
                  <p className="font-extrabold text-[16px] text-emerald-500 mt-0.5">{selectedMember.completedTodayCount || 0}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Status</span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase">
                    {selectedMember.status || "ACTIVE"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#272D36]">
              {selectedMember.currentTaskId && (
                <button
                  type="button"
                  onClick={() => {
                    const tid = selectedMember.currentTaskId!;
                    setSelectedMember(null);
                    setSelectedTaskId(tid);
                  }}
                  className="px-3.5 py-1.5 rounded-[8px] bg-[#B28D18] text-white font-bold text-[12px]"
                >
                  View Task Details
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-1.5 rounded-[8px] border border-[#E5E7EB] dark:border-[#272D36] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTaskId && (
        <TaskAssignmentModal
          taskId={selectedTaskId}
          isOpen={Boolean(selectedTaskId)}
          onClose={() => setSelectedTaskId(null)}
          onRefresh={fetchMembers}
        />
      )}
    </div>
  );
}
