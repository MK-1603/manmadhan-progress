"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen, Plus, UserCheck, FileText, CheckCircle2, ChevronRight,
  ShieldCheck, Loader2, Sparkles, Layers, Search, AlertCircle, Trash2, CheckSquare, Clock, Filter, Activity
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { CreateLearningPlanModal } from "@/components/organization/create-learning-plan-modal";

type TabId = "OVERVIEW" | "PLANS" | "TOPICS" | "ASSIGNMENTS" | "DOCUMENTS" | "PROGRESS" | "ACTIVITY";

const TABS: { id: TabId; label: string }[] = [
  { id: "OVERVIEW", label: "Overview" },
  { id: "PLANS", label: "Plans" },
  { id: "TOPICS", label: "Topics" },
  { id: "ASSIGNMENTS", label: "Assignments" },
  { id: "DOCUMENTS", label: "Documents" },
  { id: "PROGRESS", label: "Progress" },
  { id: "ACTIVITY", label: "Activity" },
];

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
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activePlanDetail, setActivePlanDetail] = useState<any | null>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);

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
  }, [fetchWorkspaceSummary, fetchPlans]);

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
      if (selectedPlanId) fetchPlanDetail(selectedPlanId);
    } catch (e) {
      console.error("Failed to update topic status:", e);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this learning plan?")) return;
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.delete(`/org/learning/plans/${planId}${wsId ? `?workspaceId=${wsId}` : ""}`);
      setSelectedPlanId(null);
      fetchWorkspaceSummary();
      fetchPlans();
    } catch (e) {
      alert("Failed to delete learning plan.");
    }
  };

  const filteredPlans = plans.filter((p) =>
    (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full max-h-full flex flex-col justify-between overflow-hidden px-4 sm:px-6 md:px-10 py-4 sm:py-5 max-w-[1400px] mx-auto bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans space-y-4">
      {/* ── Fixed Header Region ────────────────────────────────────────── */}
      <div className="shrink-0 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F]" />
              <h1 className="text-[22px] sm:text-[26px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                Learning Workspace
              </h1>
            </div>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] mt-1">
              Build structured learning systems, track topic execution, and measure team mastery.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="relative w-48 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
              <input
                type="text"
                placeholder="Search learning..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-[38px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Learning Plan</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1">
            <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Active Plans</div>
            <div className="text-[20px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{summary.activePlans}</div>
          </div>
          <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1">
            <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Total Topics</div>
            <div className="text-[20px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{summary.totalTopics}</div>
          </div>
          <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1">
            <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">In Progress</div>
            <div className="text-[20px] font-bold text-amber-600 dark:text-amber-400">{summary.inProgress}</div>
          </div>
          <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1">
            <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Completed</div>
            <div className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400">{summary.completed}</div>
          </div>
          <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Overall Progress</div>
            <div className="text-[20px] font-bold text-[#C9A52A] dark:text-[#D4B12F]">{summary.overallProgress}%</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#E4E7EC] dark:border-[#272D36] pb-1 [scrollbar-width:none]">
          {TABS.map((tab) => (
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
      </div>

      {/* ── Scrollable Body Region ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-6 space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12.5px] font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 flex items-center justify-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[14px] border border-[#E4E7EC] dark:border-[#272D36]">
            <Loader2 className="w-7 h-7 animate-spin text-[#C9A52A] dark:text-[#D4B12F]" />
          </div>
        ) : plans.length === 0 ? (
          /* REAL EMPTY STATE */
          <div className="p-10 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[14px] border border-[#E4E7EC] dark:border-[#272D36] space-y-4 max-w-lg mx-auto my-8">
            <BookOpen className="w-12 h-12 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
            <div className="space-y-1.5">
              <h3 className="text-[16.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                No learning plans yet
              </h3>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                Create a structured learning plan to organize topics, assignments, resources, and progress tracking across your team.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-5 h-[40px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Learning Plan</span>
            </button>
          </div>
        ) : (
          /* Active Content Views */
          <div className="space-y-6">
            {/* OVERVIEW / PLANS TAB */}
            {(activeTab === "OVERVIEW" || activeTab === "PLANS") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    Active Learning Plans
                  </h3>
                  <span className="text-[12px] text-[#667085]">{filteredPlans.length} plans</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border transition-all cursor-pointer space-y-4 shadow-xs ${
                        selectedPlanId === plan.id
                          ? "border-[#C9A52A] ring-1 ring-[#C9A52A]"
                          : "border-[#E4E7EC] dark:border-[#272D36] hover:border-[#C9A52A]/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-snug">
                            {plan.name}
                          </h4>
                          {plan.objective && (
                            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] line-clamp-2 mt-1">
                              {plan.objective}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }}
                          className="p-1 text-[#667085] hover:text-rose-500 transition-colors"
                          title="Delete plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1 bg-[#F8F9FB] dark:bg-[#111419] p-3 rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36]">
                        <div className="flex items-center justify-between text-[11.5px] font-mono">
                          <span className="text-[#667085]">Execution Progress</span>
                          <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">
                            {plan.completedTopics}/{plan.totalTopics} topics ({plan.progressPercent}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full transition-all duration-500"
                            style={{ width: `${plan.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11.5px] text-[#667085] border-t border-[#E4E7EC]/60 dark:border-[#272D36]/60 pt-3">
                        <span>Owner: <strong className="text-[#17202A] dark:text-[#F2F4F7]">{plan.ownerName || "Unassigned"}</strong></span>
                        <span className="font-bold text-[#C9A52A] flex items-center gap-1">
                          Open Plan <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TOPICS TAB */}
            {(activeTab === "TOPICS" || activeTab === "OVERVIEW") && activePlanDetail && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-3">
                  <div>
                    <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                      Topics & Modules — {activePlanDetail.name}
                    </h3>
                    <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
                      Track execution status and topic completion.
                    </p>
                  </div>
                </div>

                {activePlanDetail.topics.length === 0 ? (
                  <div className="p-6 text-center bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] text-[13px] text-[#667085]">
                    No topics added to this plan yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activePlanDetail.topics.map((t: any, idx: number) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#C9A52A]/50 transition-colors shadow-xs"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] font-mono font-bold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-2">
                              {t.title}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20">
                                {t.category || "General"}
                              </span>
                            </h4>
                            {t.description && (
                              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
                                {t.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <select
                            value={t.status}
                            onChange={(e) => handleUpdateTopicStatus(t.id, e.target.value)}
                            className="h-[34px] px-3 rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] outline-none"
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
                )}
              </div>
            )}

            {/* ACTIVITY TAB */}
            {(activeTab === "ACTIVITY" || activeTab === "OVERVIEW") && activePlanDetail?.activities && (
              <div className="space-y-3 pt-2">
                <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#C9A52A]" /> Recent Learning Activity
                </h3>
                <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] p-4 divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                  {activePlanDetail.activities.length === 0 ? (
                    <div className="p-4 text-center text-[12.5px] text-[#667085]">
                      No recorded learning activity yet.
                    </div>
                  ) : (
                    activePlanDetail.activities.map((act: any) => (
                      <div key={act.id} className="py-2.5 flex items-center justify-between text-[12.5px]">
                        <div>
                          <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{act.actorName || "System"}</span>{" "}
                          <span className="text-[#667085]">{act.details || act.action}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#667085]">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

      {/* Create Plan Modal */}
      <CreateLearningPlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchWorkspaceSummary();
          fetchPlans();
        }}
      />
    </div>
  );
}
