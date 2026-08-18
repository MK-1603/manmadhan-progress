"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare, Loader2, AlertCircle, Clock, FolderKanban,
  Users, ChevronRight, ShieldCheck, RefreshCw, ArrowRight
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";
import { TaskAssignmentModal } from "@/components/tasks/task-assignment-modal";
import Link from "next/link";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";

export function CoCeoMyWorkWorkspace() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [teamTasksCount, setTeamTasksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError("");
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (!workspaceId) {
        setLoading(false);
        return;
      }

      const [tasksRes, membersRes] = await Promise.all([
        apiClient.get(`/org/tasks?workspaceId=${workspaceId}`).catch(() => null),
        apiClient.get(`/organization/members?workspaceId=${workspaceId}`).catch(() => null),
      ]);

      if (tasksRes?.data?.success && Array.isArray(tasksRes.data.data)) {
        const allTasks = tasksRes.data.data;
        // Filter tasks assigned directly to current CO-CEO by CEO
        const myTasks = allTasks.filter((t: any) => t.assigneeId === user?.id);
        setAssignedTasks(myTasks);

        // Count active tasks belonging to assigned members
        const teamTasks = allTasks.filter((t: any) => t.assigneeId !== user?.id);
        setTeamTasksCount(teamTasks.length);
      }

      if (membersRes?.data?.success && Array.isArray(membersRes.data.data)) {
        setTeamMembersCount(membersRes.data.data.length);
      }
    } catch (err: any) {
      setError("Failed to load workspace data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useRegisterRefresh(fetchData);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => fetchData();

    socket.on("task.updated", handleRefresh);
    socket.on("task.created", handleRefresh);
    socket.on("task.status_changed", handleRefresh);

    return () => {
      socket.off("task.updated", handleRefresh);
      socket.off("task.created", handleRefresh);
      socket.off("task.status_changed", handleRefresh);
    };
  }, [socket, fetchData]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchData();
  };

  return (
    <PullToRefresh onRefresh={fetchData}>
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pb-12 max-w-[1440px] mx-auto w-full space-y-6 text-xs font-sans">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB] dark:border-[#272D36]">
          <div>
            <h1 className="text-[24px] sm:text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-[#B28D18] dark:text-[#C9A52A]" />
              <span>MY WORK</span>
            </h1>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] mt-1">
              Work assigned to you and items requiring action.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center w-[40px] h-[40px] rounded-[10px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh My Work"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : ""}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-[12px] text-rose-600 dark:text-rose-400 text-[12.5px] font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* ── Section 1: ASSIGNED BY CEO ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] uppercase tracking-wider">
              ASSIGNED BY CEO ({assignedTasks.length})
            </span>
          </div>

          {loading ? (
            <div className="p-6 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-[#F8F9FA] dark:bg-[#111419] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : assignedTasks.length === 0 ? (
            <div className="p-8 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] text-center flex flex-col items-center justify-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-[#B28D18]/50" />
              <p className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                No tasks assigned by CEO
              </p>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] max-w-sm">
                Executive mandates assigned to you directly by the CEO will appear here for execution.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignedTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  className="p-4 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] hover:border-[#B28D18] dark:hover:border-[#C9A52A] rounded-[16px] transition-all cursor-pointer space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#B28D18] dark:text-[#C9A52A] tracking-wider block">
                        Assigned by CEO
                      </span>
                      <h3 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-snug">
                        {t.title}
                      </h3>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${
                      t.status === "In Progress" || t.status === "Accepted"
                        ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        : t.status === "Completed"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }`}>
                      {t.status || "PENDING"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11.5px] pt-2 border-t border-[#E5E7EB] dark:border-[#272D36]">
                    <div className="flex items-center gap-3 text-[#667085] dark:text-[#8B95A5]">
                      {t.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Due {new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </span>
                      )}
                      {t.projectName && (
                        <span className="flex items-center gap-1 truncate max-w-[140px]">
                          <FolderKanban className="w-3.5 h-3.5 text-[#B28D18]" />
                          <span className="truncate">{t.projectName}</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1 rounded-[7px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[11px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-1 hover:border-[#B28D18]"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 2: YOUR TEAM ── */}
        <div className="p-5 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[18px] space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#B28D18] dark:text-[#C9A52A] uppercase tracking-wider block">
                YOUR TEAM EXECUTION
              </span>
              <h3 className="text-[16px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight">
                {teamTasksCount} active tasks across {teamMembersCount} assigned Members
              </h3>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                Track team submissions, review completed work, and manage member assignments.
              </p>
            </div>

            <Link
              href="/co-ceo/tasks"
              className="px-4 py-2.5 rounded-[10px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[12px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shrink-0"
            >
              <span>View Team Tasks</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {selectedTaskId && (
          <TaskAssignmentModal
            taskId={selectedTaskId}
            isOpen={Boolean(selectedTaskId)}
            onClose={() => setSelectedTaskId(null)}
            onRefresh={fetchData}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
