"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen, Plus, UserCheck, FileText, CheckCircle2, ChevronRight,
  ShieldCheck, Loader2, Sparkles, Layers, Search, AlertCircle, Trash2, CheckSquare, Clock, Filter, Activity, TrendingUp, AlertTriangle, RefreshCw, X, User, ChevronDown
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { CreateLearningPlanModal } from "@/components/organization/create-learning-plan-modal";

type TabId = "OVERVIEW" | "PLANS" | "TOPICS" | "ASSIGNMENTS" | "DOCUMENTS" | "PROGRESS" | "ACTIVITY";

const PRIMARY_TABS: { id: TabId; label: string }[] = [
  { id: "OVERVIEW", label: "Overview" },
  { id: "PLANS", label: "Plans" },
  { id: "TOPICS", label: "Topics" },
  { id: "ASSIGNMENTS", label: "Assignments" },
];

const MORE_TABS: { id: TabId; label: string }[] = [
  { id: "DOCUMENTS", label: "Documents" },
  { id: "PROGRESS", label: "Progress" },
  { id: "ACTIVITY", label: "Activity" },
];

const ALL_TABS = [...PRIMARY_TABS, ...MORE_TABS];

export default function LearningPage() {
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
  const [activePlanDetail, setActivePlanDetail] = useState<any | null>(null);

  // Modals & Bottom Sheets
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
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/learning/plans${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        setPlans(res.data.data || []);
        if (res.data.data.length > 0 && !selectedPlanId) {
          setSelectedPlanId(res.data.data[0].id);
        }
        setError("");
      } else {
        setError(res.data?.error || "Failed to load learning plans.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load learning workspace data.");
    } finally {
      setLoading(false);
    }
  }, [selectedPlanId]);

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

  const fetchPlanDetail = useCallback(async (planId: string) => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/learning/plans/${planId}${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        setActivePlanDetail(res.data.data);
      }
    } catch (e) {
      console.error("Failed to load plan detail:", e);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaceSummary();
    fetchPlans();
    fetchTopics();
    fetchAssignments();
    fetchDocuments();
    fetchProgress();
    fetchActivities();
  }, [fetchWorkspaceSummary, fetchPlans, fetchTopics, fetchAssignments, fetchDocuments, fetchProgress, fetchActivities]);

  useEffect(() => {
    if (selectedPlanId) {
      fetchPlanDetail(selectedPlanId);
    }
  }, [selectedPlanId, fetchPlanDetail]);

  const handleUpdateTopicStatus = async (topicId: string, newStatus: string) => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.put(`/org/learning/topics/${topicId}${wsId ? `?workspaceId=${wsId}` : ""}`, {
        status: newStatus,
      });
      fetchWorkspaceSummary();
      fetchPlans();
      fetchTopics();
      if (selectedPlanId) fetchPlanDetail(selectedPlanId);
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
      (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [plans, searchQuery]);

  const isMoreTabActive = MORE_TABS.some((t) => t.id === activeTab);

  return (
    <div className="w-full h-full max-h-full flex flex-col justify-between overflow-hidden px-4 sm:px-6 md:px-10 py-3 sm:py-5 max-w-[1600px] mx-auto bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans space-y-3 sm:space-y-4 select-none pb-20 md:pb-0">
      
      {/* ── Fixed Header Region ────────────────────────────────────────── */}
      <div className="shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#E4E7EC] dark:border-[#272D36]">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#C9A52A] dark:text-[#D4B12F]" />
              <h1 className="text-[20px] sm:text-[26px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                Learning Workspace
              </h1>
            </div>
            <p className="text-[12px] sm:text-[12.5px] text-[#667085] dark:text-[#8B95A5] mt-1 line-clamp-1 sm:line-clamp-none">
              Build structured learning systems, track topic execution, and measure team mastery.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
              <input
                type="text"
                placeholder="Search learning..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-[36px] sm:h-[38px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[12px] sm:text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 h-[36px] sm:h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] sm:text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Create Learning Plan</span>
              <span className="sm:hidden">New Plan</span>
            </button>
          </div>
        </div>

        {/* Desktop 5 KPI Cards / Mobile 2x2 Grid + Progress Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="h-[80px] sm:h-[96px] p-3 sm:p-4 rounded-[12px] sm:rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
            <div className="text-[10px] sm:text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Active Plans</div>
            <div className="flex items-baseline justify-between">
              <div className="text-[22px] sm:text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-none">{summary.activePlans}</div>
              <span className="hidden sm:inline text-[10.5px] text-[#667085]">Currently active</span>
            </div>
          </div>

          <div className="h-[80px] sm:h-[96px] p-3 sm:p-4 rounded-[12px] sm:rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
            <div className="text-[10px] sm:text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Total Topics</div>
            <div className="flex items-baseline justify-between">
              <div className="text-[22px] sm:text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-none">{summary.totalTopics}</div>
              <span className="hidden sm:inline text-[10.5px] text-[#667085]">Across all plans</span>
            </div>
          </div>

          <div className="h-[80px] sm:h-[96px] p-3 sm:p-4 rounded-[12px] sm:rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
            <div className="text-[10px] sm:text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">In Progress</div>
            <div className="flex items-baseline justify-between">
              <div className="text-[22px] sm:text-[26px] font-extrabold text-amber-600 dark:text-amber-400 leading-none">{summary.inProgress}</div>
              <span className="hidden sm:inline text-[10.5px] text-[#667085]">Currently learning</span>
            </div>
          </div>

          <div className="h-[80px] sm:h-[96px] p-3 sm:p-4 rounded-[12px] sm:rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
            <div className="text-[10px] sm:text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Completed</div>
            <div className="flex items-baseline justify-between">
              <div className="text-[22px] sm:text-[26px] font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{summary.completed}</div>
              <span className="hidden sm:inline text-[10.5px] text-[#667085]">Mastered topics</span>
            </div>
          </div>

          <div className="h-[80px] sm:h-[96px] p-3 sm:p-4 rounded-[12px] sm:rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs col-span-2 sm:col-span-1">
            <div className="text-[10px] sm:text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Overall Progress</div>
            <div className="flex items-baseline justify-between">
              <div className="text-[22px] sm:text-[26px] font-extrabold text-[#C9A52A] dark:text-[#D4B12F] leading-none">{summary.overallProgress}%</div>
              <span className="hidden sm:inline text-[10.5px] text-[#667085]">Overall mastery</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Desktop: All tabs / Mobile: Primary tabs + More ▾ sheet) */}
        <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-1">
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {/* Desktop rendered tabs */}
            <div className="hidden md:flex items-center gap-1.5">
              {ALL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                      : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile rendered primary tabs */}
            <div className="flex md:hidden items-center gap-1">
              {PRIMARY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                      : "text-[#667085] dark:text-[#8B95A5]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowMoreSheet(true)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  isMoreTabActive
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                    : "text-[#667085] dark:text-[#8B95A5]"
                }`}
              >
                <span>{isMoreTabActive ? MORE_TABS.find(t => t.id === activeTab)?.label : "More"}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable Body Region ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-6 space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12.5px] font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => { fetchWorkspaceSummary(); fetchPlans(); }}
              className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] font-bold hover:bg-rose-500/30"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-4 shadow-xs">
                <div className="h-4 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-2/3" />
                <div className="h-3 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-full" />
                <div className="h-8 bg-[#F8F9FB] dark:bg-[#111419] rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36]" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-3 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-1/3" />
                  <div className="h-3 bg-[#C9A52A]/30 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : plans.length === 0 && activeTab === "OVERVIEW" ? (
          /* WORKSPACE EMPTY STATE */
          <div className="w-full h-full min-h-[300px] rounded-[16px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto">
            <div className="w-12 h-12 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] flex items-center justify-center border border-[#C9A52A]/20">
              <BookOpen className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                No learning plans yet
              </h3>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                Create a structured learning plan to organize topics, assignments, resources, and progress tracking across your team.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Learning Plan</span>
            </button>
          </div>
        ) : (
          /* ACTIVE TAB CONTENT */
          <div className="space-y-5">
            
            {/* 1. OVERVIEW & PLANS TAB */}
            {(activeTab === "OVERVIEW" || activeTab === "PLANS") && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    Active Learning Plans
                  </h3>
                  <span className="text-[11.5px] text-[#667085]">{filteredPlans.length} plans</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredPlans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-4 sm:p-5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border transition-all cursor-pointer space-y-3.5 shadow-xs ${
                        selectedPlanId === plan.id
                          ? "border-[#C9A52A] ring-1 ring-[#C9A52A]"
                          : "border-[#E4E7EC] dark:border-[#272D36] hover:border-[#C9A52A]/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-[14.5px] sm:text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-snug">
                            {plan.name}
                          </h4>
                          {plan.objective && (
                            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] line-clamp-2 mt-1">
                              {plan.objective}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTargetPlanId(plan.id); }}
                          className="p-1 text-[#667085] hover:text-rose-500 transition-colors"
                          title="Delete plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1 bg-[#F8F9FB] dark:bg-[#111419] p-3 rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36]">
                        <div className="flex items-center justify-between text-[11px] sm:text-[11.5px] font-mono">
                          <span className="text-[#667085]">Progress</span>
                          <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">
                            {plan.completedTopics}/{plan.totalTopics} ({plan.progressPercent}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full transition-all duration-500"
                            style={{ width: `${plan.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11.5px] text-[#667085] border-t border-[#E4E7EC]/60 dark:border-[#272D36]/60 pt-2.5">
                        <span>Owner: <strong className="text-[#17202A] dark:text-[#F2F4F7]">{plan.ownerName || "Unassigned"}</strong></span>
                        <span className="font-bold text-[#C9A52A] flex items-center gap-1">
                          Open <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. TOPICS TAB (Desktop Table / Mobile Responsive Cards) */}
            {activeTab === "TOPICS" && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-2.5">
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    Workspace Learning Topics ({topics.length})
                  </h3>
                </div>

                {topics.length === 0 ? (
                  <div className="p-6 text-center bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] text-[12.5px] text-[#667085]">
                    No learning topics created yet.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
                      <table className="w-full text-left text-[12.5px]">
                        <thead className="bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#667085] uppercase tracking-wider">
                          <tr className="h-[44px]">
                            <th className="p-3">Topic Title</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Plan</th>
                            <th className="p-3">Assignee</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                          {topics.map((t) => (
                            <tr key={t.id} className="hover:bg-[#F8F9FB] dark:hover:bg-[#111419] transition-colors">
                              <td className="p-3 font-semibold text-[#17202A] dark:text-[#F2F4F7]">{t.title}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20">
                                  {t.category || "General"}
                                </span>
                              </td>
                              <td className="p-3 text-[#667085] font-medium">{t.planName}</td>
                              <td className="p-3 font-medium text-[#17202A] dark:text-[#F2F4F7]">{t.assigneeName || "Unassigned"}</td>
                              <td className="p-3">
                                <select
                                  value={t.status}
                                  onChange={(e) => handleUpdateTopicStatus(t.id, e.target.value)}
                                  className="h-[32px] px-2.5 rounded-[7px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] outline-none"
                                >
                                  <option value="NOT_STARTED">Not Started</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="COMPLETED">Completed</option>
                                  <option value="BLOCKED">Blocked</option>
                                </select>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={async () => {
                                    await apiClient.delete(`/org/learning/topics/${t.id}`);
                                    fetchTopics();
                                    fetchWorkspaceSummary();
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="md:hidden space-y-2.5">
                      {topics.map((t) => (
                        <div key={t.id} className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-2.5 shadow-2xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{t.title}</h4>
                              <p className="text-[11px] text-[#667085]">{t.planName}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20 shrink-0">
                              {t.category || "General"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11.5px] text-[#667085]">Assignee: <strong className="text-[#17202A] dark:text-[#F2F4F7]">{t.assigneeName || "Unassigned"}</strong></span>
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
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 3. ASSIGNMENTS TAB */}
            {activeTab === "ASSIGNMENTS" && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-2.5">
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    Learning Assignments ({assignments.length})
                  </h3>
                </div>

                {assignments.length === 0 ? (
                  <div className="p-6 text-center bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] text-[12.5px] text-[#667085]">
                    No learning assignments recorded yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {assignments.map((asg) => (
                      <div key={asg.id} className="p-4 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{asg.title || "Topic Assignment"}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase">
                            {asg.status}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-[#667085] flex items-center justify-between">
                          <span>Assignee: <strong>{asg.assigneeName || "Unassigned"}</strong></span>
                          <span className="font-mono">{asg.dueDate ? new Date(asg.dueDate).toLocaleDateString() : "Flexible"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. DOCUMENTS TAB */}
            {activeTab === "DOCUMENTS" && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-2.5">
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    Learning Documents & Resources ({documents.length})
                  </h3>
                </div>

                {documents.length === 0 ? (
                  <div className="p-6 text-center bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] text-[12.5px] text-[#667085]">
                    No learning documents linked yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-4 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex items-center gap-3 shadow-xs">
                        <FileText className="w-8 h-8 text-[#C9A52A] shrink-0" />
                        <div>
                          <h4 className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{doc.title}</h4>
                          <p className="text-[11px] text-[#667085]">Uploaded by {doc.uploaderName || "System"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. PROGRESS ANALYTICS TAB */}
            {activeTab === "PROGRESS" && (
              <div className="space-y-3.5">
                <h3 className="text-[15px] sm:text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  Workspace Mastery & Analytics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-4 sm:p-5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1.5 shadow-2xs">
                    <div className="text-[10.5px] font-bold text-[#667085] uppercase">Total Plans</div>
                    <div className="text-[24px] sm:text-[28px] font-extrabold text-[#17202A] dark:text-[#F2F4F7]">{progressData?.totalPlans || 0}</div>
                  </div>
                  <div className="p-4 sm:p-5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1.5 shadow-2xs">
                    <div className="text-[10.5px] font-bold text-[#667085] uppercase">Topics Mastered</div>
                    <div className="text-[24px] sm:text-[28px] font-extrabold text-emerald-600">{progressData?.completedTopics || 0} / {progressData?.totalTopics || 0}</div>
                  </div>
                  <div className="p-4 sm:p-5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1.5 shadow-2xs">
                    <div className="text-[10.5px] font-bold text-[#667085] uppercase">Overall Mastery Rate</div>
                    <div className="text-[24px] sm:text-[28px] font-extrabold text-[#C9A52A]">{progressData?.overallMastery || 0}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. ACTIVITY FEED TAB */}
            {activeTab === "ACTIVITY" && (
              <div className="space-y-3.5">
                <h3 className="text-[15px] sm:text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#C9A52A]" /> Chronological Learning Audit Feed
                </h3>
                <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] p-4 divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60 shadow-xs">
                  {activities.length === 0 ? (
                    <div className="p-4 text-center text-[12.5px] text-[#667085]">
                      No activity recorded yet.
                    </div>
                  ) : (
                    activities.map((act) => (
                      <div key={act.id} className="py-2.5 flex items-center justify-between text-[12.5px]">
                        <div>
                          <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{act.actorName || "System"}</span>{" "}
                          <span className="text-[#667085]">{act.details || act.action}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#667085]">
                          {new Date(act.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Mobile "More" Sections Touch Sheet */}
      {showMoreSheet && (
        <div className="md:hidden fixed inset-0 z-[120] flex flex-col justify-end bg-black/70 backdrop-blur-xs font-sans">
          <div className="bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[20px] p-5 space-y-4 max-h-[80dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Learning Workspace Sections</h3>
              <button onClick={() => setShowMoreSheet(false)} className="p-1 text-[#667085]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1">
              {MORE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setShowMoreSheet(false);
                  }}
                  className={`w-full p-3 rounded-[10px] text-left text-[13px] font-bold transition-colors flex items-center justify-between ${
                    activeTab === tab.id
                      ? "bg-[#C9A52A]/10 text-[#C9A52A]"
                      : "text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
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

      {/* Create Plan Modal */}
      <CreateLearningPlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchWorkspaceSummary();
          fetchPlans();
          fetchTopics();
        }}
      />

      {/* Custom Delete Confirmation Modal */}
      {deleteTargetPlanId && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
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
