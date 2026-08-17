"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen, Plus, FileText, CheckCircle2, ChevronRight,
  Loader2, Search, AlertCircle, Trash2, Clock, RefreshCw, X, ChevronDown, Check,
  Activity, BarChart3, Layers, Filter
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { CreateLearningPlanModal } from "@/components/organization/create-learning-plan-modal";

type TabId = "OVERVIEW" | "PLANS" | "TOPICS" | "ASSIGNMENTS" | "DOCUMENTS" | "PROGRESS" | "ACTIVITY";

const PRIMARY_MOBILE_TABS: { id: TabId; label: string }[] = [
  { id: "OVERVIEW", label: "Overview" },
  { id: "PLANS", label: "Plans" },
  { id: "TOPICS", label: "Topics" },
  { id: "ASSIGNMENTS", label: "Assignments" },
];

const MORE_MOBILE_TABS: { id: TabId; label: string }[] = [
  { id: "DOCUMENTS", label: "Documents" },
  { id: "PROGRESS", label: "Progress" },
  { id: "ACTIVITY", label: "Activity" },
];

const NAVIGATION_TABS: { id: TabId; label: string }[] = [
  ...PRIMARY_MOBILE_TABS,
  ...MORE_MOBILE_TABS,
];

const STATUS_BADGE_STYLE: Record<string, string> = {
  "ACTIVE": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "COMPLETED": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "IN_PROGRESS": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "PENDING": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "NOT_STARTED": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "DRAFT": "bg-slate-500/10 text-slate-500 border-slate-500/20",
  "PAUSED": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "BLOCKED": "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export default function OrganizationLearningPage() {
  const [activeTab, setActiveTab] = useState<TabId>("OVERVIEW");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Summary KPIs
  const [summary, setSummary] = useState({
    activePlans: 0,
    totalTopics: 0,
    inProgress: 0,
    completed: 0,
    overallProgress: 0,
  });

  // Data Lists
  const [plans, setPlans] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Modals & Mobile Bottom Sheets
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [deleteTargetPlanId, setDeleteTargetPlanId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWorkspaceSummary = useCallback(async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/learning/summary${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (e) {
      console.error("Failed to fetch learning summary:", e);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/learning/plans${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        setPlans(res.data.data || []);
        setError("");
      } else {
        setError(res.data?.error || "Failed to load learning plans.");
      }
    } catch (err: any) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 401) {
        setError("Session expired. Please log in again.");
      } else if (status === 403) {
        setError("Access denied. Insufficient permissions.");
      } else {
        setError("Unable to load Learning. We couldn't retrieve your workspace data.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTopics = useCallback(async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/learning/topics${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) setTopics(res.data.data || []);
    } catch (e) {
      console.error("Failed to fetch topics:", e);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/learning/assignments${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) setAssignments(res.data.data || []);
    } catch (e) {
      console.error("Failed to fetch assignments:", e);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/learning/documents${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) setDocuments(res.data.data || []);
    } catch (e) {
      console.error("Failed to fetch documents:", e);
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/learning/progress${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) setProgressData(res.data.data);
    } catch (e) {
      console.error("Failed to fetch progress:", e);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/learning/activity${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) setActivities(res.data.data || []);
    } catch (e) {
      console.error("Failed to fetch activities:", e);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchWorkspaceSummary();
    fetchPlans();
    fetchTopics();
    fetchAssignments();
    fetchDocuments();
    fetchProgress();
    fetchActivities();
  }, [fetchWorkspaceSummary, fetchPlans, fetchTopics, fetchAssignments, fetchDocuments, fetchProgress, fetchActivities]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleUpdateTopicStatus = async (topicId: string, newStatus: string) => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.put(`/org/learning/topics/${topicId}${wsId ? `?workspaceId=${wsId}` : ""}`, {
        status: newStatus,
      });
      fetchWorkspaceSummary();
      fetchPlans();
      fetchTopics();
    } catch (e) {
      console.error("Failed to update topic status:", e);
    }
  };

  const handleExecuteDeletePlan = async () => {
    if (!deleteTargetPlanId) return;
    setIsDeleting(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.delete(`/org/learning/plans/${deleteTargetPlanId}${wsId ? `?workspaceId=${wsId}` : ""}`);
      setSelectedPlanId(null);
      setDeleteTargetPlanId(null);
      fetchWorkspaceSummary();
      fetchPlans();
    } catch (e) {
      console.error("Failed to delete learning plan:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((p) =>
      (p.name || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (p.objective || "").toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [plans, searchQuery]);

  const filteredTopics = useMemo(() => {
    return topics.filter((t) =>
      (t.title || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (t.category || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (t.planName || "").toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [topics, searchQuery]);

  const isMoreTabActive = MORE_MOBILE_TABS.some((t) => t.id === activeTab);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none">
      
      {/* ========================================================================= */}
      {/* ── DESKTOP VIEWPORT LAYOUT (hidden md:flex) - 100% UNTOUCHED ───────────── */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col w-full h-full overflow-hidden">
        {/* Desktop Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />
                <h1 className="text-[28px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                  Learning Workspace
                </h1>
              </div>
              <p className="text-[13.5px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">
                Plan learning, assign topics, and track mastery.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-[280px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                <input
                  type="text"
                  placeholder="Search learning..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 h-[42px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 h-[42px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-2xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ New Plan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop 5 KPI Strip */}
        <div className="shrink-0 px-6 py-2.5 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF]/40 dark:bg-[#15191F]/40">
          {loading ? (
            <div className="grid grid-cols-5 gap-3 h-[78px] animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-full rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] p-3 flex flex-col justify-between">
                  <div className="h-3 w-1/2 bg-slate-200 dark:bg-[#272D36] rounded" />
                  <div className="h-6 w-1/3 bg-slate-200 dark:bg-[#272D36] rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3 h-[78px]">
              <div className="h-[78px] px-4 py-2.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">ACTIVE PLANS</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-[24px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-none">{summary.activePlans}</span>
                  <span className="text-[10.5px] text-[#667085]">Currently active</span>
                </div>
              </div>

              <div className="h-[78px] px-4 py-2.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">TOTAL TOPICS</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-[24px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-none">{summary.totalTopics}</span>
                  <span className="text-[10.5px] text-[#667085]">Across all plans</span>
                </div>
              </div>

              <div className="h-[78px] px-4 py-2.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">IN PROGRESS</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-[24px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-none">{summary.inProgress}</span>
                  <span className="text-[10.5px] text-[#667085]">Currently learning</span>
                </div>
              </div>

              <div className="h-[78px] px-4 py-2.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">COMPLETED</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-[24px] font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{summary.completed}</span>
                  <span className="text-[10.5px] text-[#667085]">Mastered topics</span>
                </div>
              </div>

              <div className="h-[78px] px-4 py-2.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">OVERALL MASTERY</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-[24px] font-extrabold text-[#C9A52A] dark:text-[#D4B12F] leading-none">{summary.overallProgress}%</span>
                  <span className="text-[10.5px] text-[#667085]">Overall mastery</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className="shrink-0 px-6 py-2 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F]">
          <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
            {NAVIGATION_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-[8px] text-[12.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-2xs"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Main Content Workspace */}
        <div className="flex-1 min-h-0 px-6 py-4 overflow-y-auto">
          {error ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[16px] border border-rose-500/20 space-y-3 max-w-md mx-auto shadow-2xs">
              <AlertCircle className="w-10 h-10 text-rose-500 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Unable to load learning data.</h3>
                <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">We couldn't retrieve this workspace right now.</p>
              </div>
              <button onClick={refreshAll} className="px-4 h-[36px] rounded-[9px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 cursor-pointer inline-flex items-center gap-1.5 mt-2">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : loading ? (
            <div className="w-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-4 space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[56px] w-full bg-[#F8F9FB] dark:bg-[#111419] rounded-[10px] flex items-center justify-between px-4">
                  <div className="w-1/3 h-4 bg-slate-200 dark:bg-[#272D36] rounded" />
                  <div className="w-1/6 h-4 bg-slate-200 dark:bg-[#272D36] rounded" />
                </div>
              ))}
            </div>
          ) : plans.length === 0 && (activeTab === "OVERVIEW" || activeTab === "PLANS") ? (
            <div className="w-full h-full flex flex-col rounded-[16px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] overflow-hidden shadow-2xs">
              <div className="px-6 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419]">
                <h3 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Learning Plans</h3>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] flex items-center justify-center border border-[#C9A52A]/20 shrink-0">
                  <BookOpen className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No learning plans yet</h3>
                  <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">Create a structured learning plan to organize topics, assignments, resources, and progress.</p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-1.5 px-5 h-[38px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 cursor-pointer mt-1">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ New Plan</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col">
              {(activeTab === "OVERVIEW" || activeTab === "PLANS") && (
                <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-2xs overflow-hidden h-full flex flex-col">
                  <div className="px-5 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] flex items-center justify-between shrink-0">
                    <h3 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Active Learning Plans</h3>
                    <span className="text-[11.5px] text-[#667085]">{filteredPlans.length} plans</span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="sticky top-0 bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#667085] uppercase tracking-wider z-10">
                        <tr className="h-[44px]">
                          <th className="p-3 pl-4">PLAN</th>
                          <th className="p-3">OWNER</th>
                          <th className="p-3">TOPICS</th>
                          <th className="p-3">PROGRESS</th>
                          <th className="p-3">PRIORITY</th>
                          <th className="p-3">TARGET DATE</th>
                          <th className="p-3">STATUS</th>
                          <th className="p-3 text-right pr-4">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                        {filteredPlans.map((plan) => (
                          <tr key={plan.id} className="h-[58px] hover:bg-[#F8F9FB] dark:hover:bg-[#111419] transition-colors">
                            <td className="p-3 pl-4 font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                              <div>
                                <span>{plan.name}</span>
                                {plan.objective && <p className="text-[11px] font-normal text-[#667085] truncate max-w-sm">{plan.objective}</p>}
                              </div>
                            </td>
                            <td className="p-3 text-[12.5px] font-medium text-[#17202A] dark:text-[#F2F4F7]">{plan.ownerName || "Unassigned"}</td>
                            <td className="p-3 text-[12.5px] font-medium">{plan.totalTopics || 0}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2 max-w-[140px]">
                                <div className="flex-1 h-1.5 bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                                  <div className="h-full bg-[#C9A52A] rounded-full" style={{ width: `${plan.progressPercent || 0}%` }} />
                                </div>
                                <span className="text-[11px] font-mono font-bold text-[#667085]">{plan.progressPercent || 0}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-[12px] font-semibold">{plan.priority}</td>
                            <td className="p-3 text-[12px] text-[#667085]">{plan.targetDate ? new Date(plan.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${STATUS_BADGE_STYLE[plan.status] || STATUS_BADGE_STYLE["ACTIVE"]}`}>{plan.status}</span>
                            </td>
                            <td className="p-3 text-right pr-4">
                              <button type="button" onClick={() => setDeleteTargetPlanId(plan.id)} className="p-1.5 rounded-md text-[#667085] hover:text-rose-600 transition-colors" title="Delete plan">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Topics, Assignments, Documents, Progress, Activity views for Desktop */}
              {activeTab === "TOPICS" && (
                <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-2xs overflow-hidden h-full flex flex-col">
                  <div className="px-5 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] flex items-center justify-between shrink-0">
                    <h3 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Learning Topics</h3>
                    <span className="text-[11.5px] text-[#667085]">{filteredTopics.length} topics</span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="sticky top-0 bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#667085] uppercase tracking-wider z-10">
                        <tr className="h-[44px]">
                          <th className="p-3 pl-4">TOPIC</th>
                          <th className="p-3">PLAN</th>
                          <th className="p-3">ASSIGNEE</th>
                          <th className="p-3">STATUS</th>
                          <th className="p-3">MASTERY</th>
                          <th className="p-3 text-right pr-4">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                        {filteredTopics.map((t) => (
                          <tr key={t.id} className="h-[58px] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]">
                            <td className="p-3 pl-4 font-semibold text-[#17202A] dark:text-[#F2F4F7]">{t.title}</td>
                            <td className="p-3 text-[12px] text-[#667085]">{t.planName}</td>
                            <td className="p-3 font-medium text-[#17202A] dark:text-[#F2F4F7]">{t.assigneeName || "Unassigned"}</td>
                            <td className="p-3">
                              <select value={t.status} onChange={(e) => handleUpdateTopicStatus(t.id, e.target.value)} className="h-[32px] px-2.5 rounded-[7px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] outline-none">
                                <option value="NOT_STARTED">Not Started</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="BLOCKED">Blocked</option>
                              </select>
                            </td>
                            <td className="p-3 font-mono font-bold text-[12px] text-[#C9A52A]">{t.status === "COMPLETED" ? "100%" : t.status === "IN_PROGRESS" ? "50%" : "0%"}</td>
                            <td className="p-3 text-right pr-4">
                              <button onClick={async () => { await apiClient.delete(`/org/learning/topics/${t.id}`); fetchTopics(); fetchWorkspaceSummary(); }} className="p-1.5 rounded-md text-[#667085] hover:text-rose-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "ASSIGNMENTS" && (
                <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-2xs overflow-hidden h-full flex flex-col">
                  <div className="px-5 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] flex items-center justify-between shrink-0">
                    <h3 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Learning Assignments</h3>
                    <span className="text-[11.5px] text-[#667085]">{assignments.length} assignments</span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="sticky top-0 bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#667085] uppercase tracking-wider z-10">
                        <tr className="h-[44px]">
                          <th className="p-3 pl-4">ASSIGNED TO</th>
                          <th className="p-3">STATUS</th>
                          <th className="p-3">DUE DATE</th>
                          <th className="p-3 text-right pr-4">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                        {assignments.map((asg) => (
                          <tr key={asg.id} className="h-[58px] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]">
                            <td className="p-3 pl-4 font-semibold text-[#17202A] dark:text-[#F2F4F7]">{asg.assigneeName || "Unassigned"}</td>
                            <td className="p-3"><span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${STATUS_BADGE_STYLE[asg.status] || STATUS_BADGE_STYLE["PENDING"]}`}>{asg.status}</span></td>
                            <td className="p-3 text-[12px] text-[#667085]">{asg.dueDate ? new Date(asg.dueDate).toLocaleDateString() : "Flexible"}</td>
                            <td className="p-3 text-right pr-4 text-[12px] font-semibold text-[#C9A52A]">View Details</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "DOCUMENTS" && (
                <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-2xs overflow-hidden h-full flex flex-col">
                  <div className="px-5 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] flex items-center justify-between shrink-0">
                    <h3 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Learning Documents</h3>
                    <span className="text-[11.5px] text-[#667085]">{documents.length} resources</span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="sticky top-0 bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#667085] uppercase tracking-wider z-10">
                        <tr className="h-[44px]">
                          <th className="p-3 pl-4">DOCUMENT</th>
                          <th className="p-3">TYPE</th>
                          <th className="p-3">OWNER</th>
                          <th className="p-3">CREATED</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                        {documents.map((doc) => (
                          <tr key={doc.id} className="h-[58px] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]">
                            <td className="p-3 pl-4 font-semibold text-[#17202A] dark:text-[#F2F4F7]">{doc.title}</td>
                            <td className="p-3 text-[12px] font-mono text-[#667085]">{doc.fileType || "HANDBOOK"}</td>
                            <td className="p-3 text-[12.5px] font-medium">{doc.uploaderName || "System"}</td>
                            <td className="p-3 text-[12px] text-[#667085]">{new Date(doc.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "PROGRESS" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-5 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-2 shadow-2xs">
                      <span className="text-[10.5px] font-bold text-[#667085] uppercase tracking-wider">Total Active Plans</span>
                      <div className="text-[32px] font-extrabold text-[#17202A] dark:text-[#F2F4F7]">{progressData?.totalPlans || summary.activePlans}</div>
                    </div>
                    <div className="p-5 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-2 shadow-2xs">
                      <span className="text-[10.5px] font-bold text-[#667085] uppercase tracking-wider">Mastered Topics</span>
                      <div className="text-[32px] font-extrabold text-emerald-600">{progressData?.completedTopics || summary.completed} / {progressData?.totalTopics || summary.totalTopics}</div>
                    </div>
                    <div className="p-5 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-2 shadow-2xs">
                      <span className="text-[10.5px] font-bold text-[#667085] uppercase tracking-wider">Overall Mastery</span>
                      <div className="text-[32px] font-extrabold text-[#C9A52A]">{progressData?.overallMastery || summary.overallProgress}%</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ACTIVITY" && (
                <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-2xs overflow-hidden flex flex-col h-full">
                  <div className="px-5 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] flex items-center justify-between shrink-0">
                    <h3 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Learning Audit Trail</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60 p-4">
                    {activities.map((act) => (
                      <div key={act.id} className="py-3 flex items-center justify-between text-[12.5px]">
                        <div>
                          <strong className="text-[#17202A] dark:text-[#F2F4F7]">{act.actorName || "System"}</strong>{" "}
                          <span className="text-[#667085]">{act.details || act.action}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#667085]">{new Date(act.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>


      {/* ========================================================================= */}
      {/* ── MOBILE BREAKPOINT LAYOUT (flex md:hidden) - FINAL RECONSTRUCTION ────── */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col w-full h-[100dvh] overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12]">
        
        {/* ── 1. MOBILE LEARNING PAGE HEADER (105-120px MAX HEIGHT) ─────────────── */}
        <div className="shrink-0 px-4 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none flex items-center gap-1.5">
                <BookOpen className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />
                <span>Learning</span>
              </h1>
              <p className="text-[13px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">
                Plan, assign, and track mastery.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 px-3 h-[38px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0 shadow-2xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Plan</span>
            </button>
          </div>

          {/* Full Width Compact Search Input */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
            <input
              type="text"
              placeholder="Search learning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 h-[38px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
            />
          </div>
        </div>

        {/* ── 2. MOBILE COMPACT 4-COLUMN KPI STRIP (72-82px HEIGHT) ──────────── */}
        <div className="shrink-0 px-4 py-2 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF]/40 dark:bg-[#15191F]/40 h-[74px]">
          {loading ? (
            <div className="grid grid-cols-4 gap-2 h-full animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-full rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] p-2 flex flex-col justify-between">
                  <div className="h-2 w-2/3 bg-slate-200 dark:bg-[#272D36] rounded" />
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-[#272D36] rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 h-full">
              <div className="p-2 rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
                <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">PLANS</span>
                <span className="text-[20px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-none">{summary.activePlans}</span>
              </div>

              <div className="p-2 rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
                <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">TOPICS</span>
                <span className="text-[20px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-none">{summary.totalTopics}</span>
              </div>

              <div className="p-2 rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
                <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">ACTIVE</span>
                <span className="text-[20px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-none">{summary.inProgress}</span>
              </div>

              <div className="p-2 rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
                <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">MASTERY</span>
                <span className="text-[20px] font-extrabold text-[#C9A52A] dark:text-[#D4B12F] leading-none">{summary.overallProgress}%</span>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. MOBILE NAVIGATION TABS (SINGLE ROW + MORE ▾) ──────────────────── */}
        <div className="shrink-0 px-4 py-2 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F]">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
              {PRIMARY_MOBILE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-2xs"
                      : "text-[#667085] dark:text-[#8B95A5]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMoreSheet(true)}
              className={`px-2.5 py-1.5 rounded-[8px] text-[12px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                isMoreTabActive
                  ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                  : "text-[#667085] dark:text-[#8B95A5]"
              }`}
            >
              <span>{isMoreTabActive ? MORE_MOBILE_TABS.find((t) => t.id === activeTab)?.label : "More"}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── 4. MOBILE MAIN CONTENT SURFACE (SCROLLS INTERNALLY) ───────────── */}
        <div className="flex-1 min-h-0 px-4 py-3 overflow-y-auto">
          {error ? (
            /* ERROR STATE */
            <div className="w-full py-8 px-4 text-center bg-[#FFFFFF] dark:bg-[#15191F] border border-rose-500/20 rounded-[14px] space-y-3 shadow-2xs">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto shrink-0" />
              <div className="space-y-1">
                <h3 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Unable to load Learning</h3>
                <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">We couldn't retrieve your workspace data.</p>
              </div>
              <button
                type="button"
                onClick={refreshAll}
                className="px-4 h-[36px] rounded-[8px] bg-[#C9A52A] text-[#0B0D10] text-[12px] font-bold inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : loading ? (
            /* SKELETON LOADING */
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-2">
                  <div className="h-4 w-2/3 bg-slate-200 dark:bg-[#272D36] rounded" />
                  <div className="h-3 w-1/2 bg-slate-200 dark:bg-[#272D36] rounded" />
                </div>
              ))}
            </div>
          ) : plans.length === 0 && (activeTab === "OVERVIEW" || activeTab === "PLANS") ? (
            /* COMPACT EMPTY STATE CARD (220-260px MAX HEIGHT) */
            <div className="w-full rounded-[14px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] p-6 text-center space-y-3 shadow-2xs max-h-[260px] flex flex-col items-center justify-center my-auto">
              <div className="w-12 h-12 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] flex items-center justify-center border border-[#C9A52A]/20 shrink-0">
                <BookOpen className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  No learning plans yet
                </h3>
                <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] leading-snug">
                  Create your first plan to organize topics, assignments, and progress.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Create Plan</span>
              </button>
            </div>
          ) : (
            /* TAB ACTIVE DATA VIEWS */
            <div className="space-y-3">
              {/* 1. OVERVIEW / PLANS CARD LIST */}
              {(activeTab === "OVERVIEW" || activeTab === "PLANS") && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Active Learning ({filteredPlans.length})</span>
                  </div>
                  {filteredPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-tight">
                            {plan.name}
                          </h4>
                          {plan.objective && (
                            <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] line-clamp-1 mt-0.5">
                              {plan.objective}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border shrink-0 ${STATUS_BADGE_STYLE[plan.status] || STATUS_BADGE_STYLE["ACTIVE"]}`}>
                          {plan.status}
                        </span>
                      </div>

                      <div className="space-y-1 bg-[#F8F9FB] dark:bg-[#111419] p-2 rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36]">
                        <div className="flex items-center justify-between text-[10.5px] font-mono">
                          <span className="text-[#667085]">{plan.completedTopics || 0} / {plan.totalTopics || 0} topics</span>
                          <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{plan.progressPercent || 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                          <div className="h-full bg-[#C9A52A] rounded-full" style={{ width: `${plan.progressPercent || 0}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#667085] pt-0.5">
                        <span>Due: <strong className="text-[#17202A] dark:text-[#F2F4F7]">{plan.targetDate ? new Date(plan.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Flexible"}</strong></span>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetPlanId(plan.id)}
                          className="text-rose-500 font-semibold p-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 2. TOPICS CARD LIST */}
              {activeTab === "TOPICS" && (
                <div className="space-y-2.5">
                  {filteredTopics.length === 0 ? (
                    <div className="p-6 text-center text-[12px] text-[#667085] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px]">No learning topics created yet.</div>
                  ) : (
                    filteredTopics.map((t) => (
                      <div key={t.id} className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-2 shadow-2xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{t.title}</h4>
                            <p className="text-[11px] text-[#667085]">{t.planName}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20 shrink-0">
                            {t.category || "General"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-[#E4E7EC]/60 dark:border-[#272D36]/60">
                          <span className="text-[11px] text-[#667085]">Assignee: <strong className="text-[#17202A] dark:text-[#F2F4F7]">{t.assigneeName || "Unassigned"}</strong></span>
                          <select
                            value={t.status}
                            onChange={(e) => handleUpdateTopicStatus(t.id, e.target.value)}
                            className="h-[28px] px-2 rounded-[6px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#17202A] dark:text-[#F2F4F7] outline-none"
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="BLOCKED">Blocked</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 3. ASSIGNMENTS CARD LIST */}
              {activeTab === "ASSIGNMENTS" && (
                <div className="space-y-2.5">
                  {assignments.length === 0 ? (
                    <div className="p-6 text-center text-[12px] text-[#667085] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px]">No learning assignments recorded yet.</div>
                  ) : (
                    assignments.map((asg) => (
                      <div key={asg.id} className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Assignment #{asg.id.slice(0, 6)}</h4>
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${STATUS_BADGE_STYLE[asg.status] || STATUS_BADGE_STYLE["PENDING"]}`}>
                            {asg.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#667085]">
                          <span>Assigned to <strong className="text-[#17202A] dark:text-[#F2F4F7]">{asg.assigneeName || "Unassigned"}</strong></span>
                          <span>Due: {asg.dueDate ? new Date(asg.dueDate).toLocaleDateString() : "Flexible"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 4. DOCUMENTS LIST */}
              {activeTab === "DOCUMENTS" && (
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <div className="p-6 text-center text-[12px] text-[#667085] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px]">No learning documents linked yet.</div>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex items-center gap-3 shadow-2xs">
                        <FileText className="w-6 h-6 text-[#C9A52A] shrink-0" />
                        <div>
                          <h4 className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{doc.title}</h4>
                          <p className="text-[11px] text-[#667085]">{doc.fileType || "HANDBOOK"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 5. PROGRESS SUMMARY */}
              {activeTab === "PROGRESS" && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-[#667085] uppercase">Total Plans</span>
                    <div className="text-[22px] font-extrabold text-[#17202A] dark:text-[#F2F4F7]">{progressData?.totalPlans || summary.activePlans}</div>
                  </div>
                  <div className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-[#667085] uppercase">Completed</span>
                    <div className="text-[22px] font-extrabold text-emerald-600">{progressData?.completedTopics || summary.completed}</div>
                  </div>
                </div>
              )}

              {/* 6. ACTIVITY TIMELINE */}
              {activeTab === "ACTIVITY" && (
                <div className="space-y-2">
                  {activities.map((act) => (
                    <div key={act.id} className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] space-y-1 shadow-2xs">
                      <div>
                        <strong className="text-[#17202A] dark:text-[#F2F4F7]">{act.actorName || "System"}</strong>{" "}
                        <span className="text-[#667085]">{act.details || act.action}</span>
                      </div>
                      <span className="text-[10.5px] font-mono text-[#667085] block">
                        {new Date(act.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Bottom Sheet for "More" Navigation */}
        {showMoreSheet && (
          <div
            className="md:hidden fixed inset-0 z-[140] flex flex-col justify-end bg-black/70 backdrop-blur-xs font-sans transition-opacity animate-in fade-in duration-150"
            onClick={() => setShowMoreSheet(false)}
          >
            <div
              className="bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[20px] p-4 space-y-3 max-h-[65dvh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-[#E4E7EC] dark:bg-[#272D36] rounded-full mx-auto" />
              <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
                <h3 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Learning Workspace Sections</h3>
                <button
                  type="button"
                  onClick={() => setShowMoreSheet(false)}
                  className="p-1 rounded-full text-[#667085]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {MORE_MOBILE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowMoreSheet(false);
                    }}
                    className={`w-full h-[44px] px-3.5 rounded-[10px] text-left text-[13px] font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-[#C9A52A]/10 text-[#C9A52A]"
                        : "text-[#17202A] dark:text-[#F2F4F7]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {activeTab === tab.id && <CheckCircle2 className="w-4 h-4 text-[#C9A52A]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Plan Modal / Bottom Sheet */}
      <CreateLearningPlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refreshAll}
      />

      {/* Delete Plan Modal */}
      {deleteTargetPlanId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-[16px] font-bold">Delete Learning Plan?</h3>
            </div>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
              This action cannot be undone. All associated topics and progress records will be permanently removed from PostgreSQL.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetPlanId(null)}
                className="h-[36px] px-4 rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[12.5px] font-semibold text-[#667085]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDeletePlan}
                className="h-[36px] px-5 rounded-[8px] bg-rose-500 text-white text-[12.5px] font-bold hover:bg-rose-600 transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
