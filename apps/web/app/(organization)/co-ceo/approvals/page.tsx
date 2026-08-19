"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  CheckCircle2, XCircle, Clock, MessageSquare, ChevronDown,
  AlertCircle, Loader2, RefreshCw, ClipboardCheck, ArrowLeft,
  Search, ShieldAlert, FileText, ExternalLink, Filter, X
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";

const APPROVAL_PRIORITY_OPTIONS: CustomSelectOption[] = [
  { value: "All", label: "All Priorities" },
  { value: "High", label: "High Priority", color: "bg-amber-500" },
  { value: "Medium", label: "Medium Priority", color: "bg-[#C9A52A]" },
  { value: "Low", label: "Low Priority", color: "bg-slate-400" },
];
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import { TaskAssignmentModal } from "@/components/tasks/task-assignment-modal";

type Tab = "pending" | "approved" | "rejected" | "changes";

interface ApprovalTaskItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  assigneeId?: string;
  assigneeName?: string;
  projectId?: string;
  projectName?: string;
  submittedAt?: string;
  approvedAt?: string;
  deadline?: string;
  priority?: string;
  rejectionFeedback?: string;
  submissionSummary?: string;
}

function timeAgo(d?: string | null) {
  if (!d) return "recently";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function CoCeoApprovalsPage() {
  const { socket, isConnected } = useSocket();
  const [tab, setTab] = useState<Tab>("pending");
  const [allTasks, setAllTasks] = useState<ApprovalTaskItem[]>([]);
  const [summaryData, setSummaryData] = useState<any>({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    changesRequestedCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ApprovalTaskItem | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState<{
    taskId: string;
    type: "request_changes" | "reject";
  } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const fetchApprovals = useCallback(async () => {
    try {
      setError("");
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (!wsId) {
        setLoading(false);
        return;
      }

      const res = await apiClient.get(`/org/approvals?workspaceId=${wsId}`);
      if (res.data?.success) {
        const d = res.data.data;
        const tasksArr: ApprovalTaskItem[] = d.tasks || d.pendingTasks || [];
        setAllTasks(tasksArr);

        if (d.summary) {
          setSummaryData(d.summary);
        } else {
          const pending = tasksArr.filter((t) => (t.status || "").toLowerCase() === "review").length;
          const approved = tasksArr.filter((t) => ["approved", "completed"].includes((t.status || "").toLowerCase())).length;
          const rejected = tasksArr.filter((t) => (t.status || "").toLowerCase() === "rejected").length;
          const changes = tasksArr.filter((t) => (t.status || "").toLowerCase() === "in progress" && Boolean(t.rejectionFeedback)).length;
          setSummaryData({
            pendingCount: pending,
            approvedCount: approved,
            rejectedCount: rejected,
            changesRequestedCount: changes,
          });
        }
      } else {
        setError(res.data?.error || "Failed to load approvals");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load approvals");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  useRegisterRefresh(fetchApprovals);

  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => fetchApprovals();

    socket.on("task.updated", handleRefresh);
    socket.on("task.submitted", handleRefresh);
    socket.on("approval.updated", handleRefresh);
    socket.on("approval.created", handleRefresh);

    return () => {
      socket.off("task.updated", handleRefresh);
      socket.off("task.submitted", handleRefresh);
      socket.off("approval.updated", handleRefresh);
      socket.off("approval.created", handleRefresh);
    };
  }, [socket, fetchApprovals]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchApprovals();
  };

  const handleApprove = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      const wsId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/approvals/tasks/${taskId}/approve?workspaceId=${wsId}`);
      if (res.data?.success) {
        setSelectedTask(null);
        fetchApprovals();
      } else {
        setError(res.data?.error || "Failed to approve task");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to approve task");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmFeedback = async () => {
    if (!showFeedbackModal) return;
    if (!feedbackText.trim()) {
      setError("Please provide feedback/reason before submitting.");
      return;
    }

    const { taskId, type } = showFeedbackModal;
    setActionLoading(taskId);
    try {
      const wsId = localStorage.getItem("workspaceId");
      const endpoint = type === "request_changes"
        ? `/org/approvals/tasks/${taskId}/request_changes?workspaceId=${wsId}`
        : `/org/approvals/tasks/${taskId}/reject?workspaceId=${wsId}`;

      const res = await apiClient.post(endpoint, {
        feedback: feedbackText.trim(),
        reason: feedbackText.trim(),
      });

      if (res.data?.success) {
        setShowFeedbackModal(null);
        setFeedbackText("");
        setSelectedTask(null);
        fetchApprovals();
      } else {
        setError(res.data?.error || "Failed to submit decision");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit decision");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter tasks by active tab, search, priority
  const filteredTasks = useMemo(() => {
    return allTasks.filter((item) => {
      const s = (item.status || "").toLowerCase();
      let matchesTab = false;
      if (tab === "pending") matchesTab = s === "review" || s.includes("submitted");
      else if (tab === "approved") matchesTab = s === "approved" || s === "completed";
      else if (tab === "rejected") matchesTab = s === "rejected";
      else if (tab === "changes") matchesTab = s === "in progress" && Boolean(item.rejectionFeedback);

      if (!matchesTab) return false;

      if (priorityFilter !== "All" && item.priority !== priorityFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesQuery =
          item.title?.toLowerCase().includes(q) ||
          item.assigneeName?.toLowerCase().includes(q) ||
          item.projectName?.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [allTasks, tab, priorityFilter, search]);

  const socketStatusLabel = isConnected ? "LIVE" : socket ? "RECONNECTING" : "OFFLINE";

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pb-12 max-w-[1440px] mx-auto w-full space-y-5 text-xs">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-[#E5E7EB] dark:border-[#272D36]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] uppercase tracking-wider">
              CO-CEO · REVIEW CENTER
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight flex items-center gap-2.5">
            <ClipboardCheck className="w-6 h-6 text-[#B28D18] dark:text-[#C9A52A]" />
            <span>Approvals</span>
          </h1>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-1">
            Review submitted work and respond with a clear decision.
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
            title="Refresh Approvals"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-[12px] text-rose-600 dark:text-rose-400 text-[12.5px] font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchApprovals} className="underline text-[11.5px]">Retry</button>
        </div>
      )}

      {/* ── KPI Metric Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
          <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
            PENDING
          </span>
          <p className="text-[26px] font-extrabold text-[#B28D18] dark:text-[#C9A52A] font-mono leading-none mt-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : summaryData.pendingCount}
          </p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1">Awaiting decision</p>
        </div>

        <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
          <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
            APPROVED TODAY
          </span>
          <p className="text-[26px] font-extrabold text-emerald-500 font-mono leading-none mt-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : summaryData.approvedCount}
          </p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1">Work approved</p>
        </div>

        <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
          <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
            CHANGES REQUESTED
          </span>
          <p className="text-[26px] font-extrabold text-blue-500 font-mono leading-none mt-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : summaryData.changesRequestedCount}
          </p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1">Sent for revision</p>
        </div>

        <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
          <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
            REJECTED TODAY
          </span>
          <p className="text-[26px] font-extrabold text-rose-500 font-mono leading-none mt-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : summaryData.rejectedCount}
          </p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1">Rejected submissions</p>
        </div>
      </div>

      {/* ── Segmented Tabs + Search Bar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Segmented Filter */}
        <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] p-1 rounded-[10px] overflow-x-auto shrink-0 [scrollbar-width:none]">
          {[
            { key: "pending", label: "Pending", count: summaryData.pendingCount, icon: Clock },
            { key: "approved", label: "Approved", count: summaryData.approvedCount, icon: CheckCircle2 },
            { key: "changes", label: "Changes Requested", count: summaryData.changesRequestedCount, icon: MessageSquare },
            { key: "rejected", label: "Rejected", count: summaryData.rejectedCount, icon: XCircle },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key as Tab)}
                className={`h-[32px] px-3 rounded-[7px] text-[11.5px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  active
                    ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10]"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-extrabold ${
                    active ? "bg-white/20 dark:bg-black/20" : "bg-gray-200 dark:bg-gray-800 text-[#667085]"
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />
            <input
              type="text"
              placeholder="Search approvals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 h-[34px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[12px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18]"
            />
          </div>

          {/* Priority Select */}
          <div className="w-[145px] shrink-0">
            <CustomSelect
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={APPROVAL_PRIORITY_OPTIONS}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* ── Pending Approvals Queue ── */}
      <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
        <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-[#F8F9FA] dark:bg-[#111419] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">You're all caught up</p>
              <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                {tab === "pending"
                  ? "No submissions are currently waiting for your review."
                  : `No ${tab} records to display.`}
              </p>
            </div>
          ) : (
            filteredTasks.map((item) => (
              <div
                key={item.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                      {item.title}
                    </span>
                    {item.priority && (
                      <span className={`px-2 py-0.2 rounded text-[9.5px] font-bold uppercase ${
                        item.priority === "High"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20"
                      }`}>
                        {item.priority}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#667085] dark:text-[#8B95A5] flex-wrap">
                    {item.assigneeName && (
                      <span>Submitted by <strong className="text-[#17202A] dark:text-[#F2F4F7]">{item.assigneeName}</strong></span>
                    )}
                    {item.projectName && (
                      <span>Project: <strong className="text-[#17202A] dark:text-[#F2F4F7]">{item.projectName}</strong></span>
                    )}
                    {item.submittedAt && (
                      <span>Submitted {timeAgo(item.submittedAt)}</span>
                    )}
                  </div>

                  {item.rejectionFeedback && (
                    <p className="text-[11px] text-rose-500 font-medium italic mt-1">
                      Feedback: "{item.rejectionFeedback}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  {tab === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(item.id)}
                        disabled={actionLoading === item.id}
                        className="px-3.5 py-1.5 rounded-[9px] bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {actionLoading === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowFeedbackModal({ taskId: item.id, type: "request_changes" })}
                        className="px-3.5 py-1.5 rounded-[9px] bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 text-[#B28D18] dark:text-[#C9A52A] text-[11.5px] font-bold hover:bg-[#B28D18]/20 cursor-pointer transition-colors"
                      >
                        Request Changes
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTask(item)}
                        className="px-3 py-1.5 rounded-[9px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] cursor-pointer transition-colors"
                      >
                        Review
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedTask(item)}
                      className="px-3.5 py-1.5 rounded-[9px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] cursor-pointer transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Approval Detail Modal (Desktop) / Sheet (Mobile) ── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#272D36] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#B28D18] uppercase tracking-wider">
                  SUBMISSION DETAILS
                </span>
                <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] mt-0.5">
                  {selectedTask.title}
                </h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 text-[#667085]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-[12px]">
              <div className="grid grid-cols-2 gap-2 p-3 bg-[#F8F9FA] dark:bg-[#111419] rounded-[10px] border border-[#E5E7EB] dark:border-[#272D36]">
                <div>
                  <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Submitted By</span>
                  <p className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{selectedTask.assigneeName || "Team Member"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Submitted Time</span>
                  <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{selectedTask.submittedAt ? new Date(selectedTask.submittedAt).toLocaleString() : "Recently"}</p>
                </div>
              </div>

              {selectedTask.description && (
                <div className="p-3.5 bg-[#F8F9FA] dark:bg-[#111419] rounded-[10px] border border-[#E5E7EB] dark:border-[#272D36] space-y-1">
                  <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Description / Work Summary</span>
                  <p className="text-[#17202A] dark:text-[#F2F4F7] leading-relaxed">{selectedTask.description}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#272D36]">
              {selectedTask.status === "Review" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedTask.id)}
                    disabled={actionLoading === selectedTask.id}
                    className="px-4 py-1.5 rounded-[8px] bg-emerald-600 text-white font-bold text-[12px] flex items-center gap-1.5"
                  >
                    {actionLoading === selectedTask.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedTask.id;
                      setSelectedTask(null);
                      setShowFeedbackModal({ taskId: id, type: "request_changes" });
                    }}
                    className="px-4 py-1.5 rounded-[8px] bg-[#B28D18] text-white font-bold text-[12px]"
                  >
                    Request Changes
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-1.5 rounded-[8px] border border-[#E5E7EB] dark:border-[#272D36] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Changes / Reject In-App Reason Modal ── */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
              {showFeedbackModal.type === "request_changes" ? "Request Changes on Work" : "Reject Submission"}
            </h3>
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
              Please provide clear feedback or instructions for the team member.
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Describe the changes required..."
              rows={4}
              className="w-full p-3 bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18]"
            />
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowFeedbackModal(null);
                  setFeedbackText("");
                }}
                className="px-3.5 py-1.5 rounded-[8px] border border-[#E5E7EB] dark:border-[#272D36] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFeedback}
                disabled={!feedbackText.trim() || actionLoading === showFeedbackModal.taskId}
                className="px-4 py-1.5 rounded-[8px] bg-[#B28D18] text-white text-[12px] font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading === showFeedbackModal.taskId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit Feedback</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
