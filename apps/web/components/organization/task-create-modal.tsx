"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, AlertCircle, BookOpen, FileText, Search, Code,
  Eye, Palette, CheckSquare, Users, ShieldAlert, Layers, ArrowRight, ArrowLeft, Check
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { GlobalSheet } from "@/components/ui/global-sheet";
import { useAuth } from "@/components/auth/auth-context";
import { CustomMemberSelect } from "@/components/ui/custom-member-select";
import { AppSelect } from "@/components/ui/app-select";

export type TaskType =
  | "LEARNING"
  | "DOCUMENT"
  | "RESEARCH"
  | "DEVELOPMENT"
  | "REVIEW"
  | "DESIGN"
  | "TESTING"
  | "MEETING"
  | "ADMINISTRATIVE"
  | "CUSTOM";

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  role?: "CEO" | "CO-CEO" | "MEMBER";
  projectId?: string;
  milestoneId?: string;
  isPersonalWorkspace?: boolean;
  initialType?: TaskType;
}

const TASK_TEMPLATES: { type: TaskType; label: string; icon: any; description: string }[] = [
  { type: "LEARNING", label: "Learning", icon: BookOpen, description: "Assign study topics, documentation URLs & notes submission." },
  { type: "DOCUMENT", label: "Document", icon: FileText, description: "PRD, TRD, API docs, specifications & technical writeups." },
  { type: "RESEARCH", label: "Research", icon: Search, description: "Market analysis, technology evaluation & findings report." },
  { type: "DEVELOPMENT", label: "Development", icon: Code, description: "Features, modules, bug fixes & acceptance criteria." },
  { type: "REVIEW", label: "Review", icon: Eye, description: "Code review, document review & submission feedback." },
  { type: "DESIGN", label: "Design", icon: Palette, description: "UI/UX, wireframes, graphic assets & specifications." },
  { type: "TESTING", label: "Testing", icon: CheckSquare, description: "QA testing, test cases & bug evidence." },
  { type: "MEETING", label: "Meeting", icon: Users, description: "Syncs, agendas, participant requirements & follow-ups." },
  { type: "ADMINISTRATIVE", label: "Administrative", icon: ShieldAlert, description: "Operations, compliance & administrative tasks." },
  { type: "CUSTOM", label: "Custom Task", icon: Layers, description: "Flexible task template for general execution." },
];

export function TaskCreateModal({
  isOpen,
  onClose,
  onCreated,
  role = "CO-CEO",
  projectId,
  milestoneId,
  isPersonalWorkspace = false,
  initialType = "CUSTOM",
}: TaskCreateModalProps) {
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [taskType, setTaskType] = useState<TaskType>(initialType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [deadline, setDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [estimatedMinutes, setEstimatedMinutes] = useState("60");

  // Dynamic template fields
  const [learningTopic, setLearningTopic] = useState("");
  const [learningObjective, setLearningObjective] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [docType, setDocType] = useState("PRD");
  const [researchTopic, setResearchTopic] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [submissionRequired, setSubmissionRequired] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setStep(initialType ? 2 : 1);
    setTaskType(initialType || "CUSTOM");
    const workspaceId = localStorage.getItem("workspaceId");
    if (!workspaceId) return;

    Promise.all([
      apiClient.get(`/org/projects?workspaceId=${workspaceId}`).catch(() => null),
      apiClient.get(`/organization/members?workspaceId=${workspaceId}`).catch(() => null),
    ]).then(([pRes, mRes]) => {
      if (pRes?.data?.success) setProjects(pRes.data.data);
      if (mRes?.data?.success) setMembers(mRes.data.data);
    });
  }, [isOpen, initialType]);

  const eligibleMembers = useMemo(() => {
    if (isPersonalWorkspace || role === "MEMBER") return [];
    if (role === "CO-CEO") {
      return members.filter((m: any) => {
        const memberRole = String(m.role || m.workspaceRole || "").toUpperCase();
        if (memberRole !== "MEMBER") return false;
        if (m.managerId) return m.managerId === user?.id;
        return true;
      });
    }
    return members;
  }, [members, role, isPersonalWorkspace, user]);

  const selectedMember = useMemo(() => {
    return eligibleMembers.find((m) => m.id === assigneeId || m.userId === assigneeId);
  }, [eligibleMembers, assigneeId]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === (selectedProjectId || projectId));
  }, [projects, selectedProjectId, projectId]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }
    if (role === "CO-CEO" && !isPersonalWorkspace && !assigneeId && eligibleMembers.length > 0) {
      setError("Please select an assigned Member to receive this task.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const targetAssignee = isPersonalWorkspace || role === "MEMBER" ? user?.id : (assigneeId || null);

      const payload = {
        workspaceId,
        taskType,
        title: title.trim(),
        description: description || null,
        priority,
        deadline: deadline || null,
        assigneeId: targetAssignee,
        projectId: selectedProjectId || projectId || null,
        milestoneId: milestoneId || null,
        estimatedMinutes: Number(estimatedMinutes),
        learningTopic: learningTopic || null,
        learningObjective: learningObjective || null,
        resourceUrl: resourceUrl || null,
        expectedOutcome: expectedOutcome || null,
        docType: docType || null,
        researchTopic: researchTopic || null,
        acceptanceCriteria: acceptanceCriteria || null,
        submissionRequired: Boolean(submissionRequired),
      };

      const res = await apiClient.post("/org/tasks", payload);
      if (res.data?.success) {
        onCreated();
        onClose();
        // Reset form
        setTitle(""); setDescription(""); setPriority("Medium"); setDeadline("");
        setAssigneeId(""); setEstimatedMinutes("60"); setStep(1);
      } else {
        setError(res.data?.error?.message || res.data?.error || "Failed to create task");
      }
    } catch (e: any) {
      setError(e.response?.data?.error?.message || e.response?.data?.error || e.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const targetName = selectedMember ? (selectedMember.name || selectedMember.displayName || "Member") : "Member";
  const submitButtonLabel = role === "CO-CEO" && !isPersonalWorkspace && assigneeId
    ? `Assign to ${targetName}`
    : "Assign Task";

  const footer = (
    <div className="flex items-center justify-between w-full text-xs">
      {step === 2 ? (
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-1.5 px-3 py-2 text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Template</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-[#667085] dark:text-[#8B95A5] font-semibold hover:text-[#17202A] transition-colors"
        >
          Cancel
        </button>
      )}

      {step === 1 ? (
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] font-bold shadow-xs hover:opacity-90 transition-opacity"
        >
          <span>Configure Details</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !title.trim() || (role === "CO-CEO" && !assigneeId && eligibleMembers.length > 0)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] font-bold shadow-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{submitButtonLabel}</span>
        </button>
      )}
    </div>
  );

  return (
    <GlobalSheet
      open={isOpen}
      onClose={onClose}
      title={role === "CO-CEO" ? "CREATE TEAM TASK" : "CREATE TASK"}
      subtitle={role === "CO-CEO" ? "Assign task to your assigned Member." : "ORGANIZATION MANDATE"}
      footerActions={footer}
      desktopMode="modal"
      desktopMaxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs font-sans">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-[10px] text-rose-600 dark:text-rose-400 text-[12px] font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Choose Task Template */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] uppercase tracking-wider">
                STEP 1 OF 2: CHOOSE TASK TEMPLATE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TASK_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = taskType === tmpl.type;
                return (
                  <div
                    key={tmpl.type}
                    onClick={() => {
                      setTaskType(tmpl.type);
                      setStep(2);
                    }}
                    className={`p-3 rounded-[12px] border transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? "bg-[#B28D18]/10 border-[#B28D18] dark:border-[#C9A52A] shadow-xs"
                        : "bg-[#FFFFFF] dark:bg-[#07090D] border-[#E5E7EB] dark:border-[#272D36] hover:border-[#B28D18]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-[#17202A] dark:text-[#F2F4F7] text-[13px]">
                        <Icon className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />
                        <span>{tmpl.label}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />}
                    </div>
                    <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] leading-snug">
                      {tmpl.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Configure Task Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#272D36]">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#B28D18]/15 text-[#B28D18] dark:text-[#C9A52A] font-extrabold uppercase text-[10px] tracking-wider">
                  TEMPLATE: {taskType}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5]">
                STEP 2 OF 2
              </span>
            </div>

            {/* Target Assignee Dropdown */}
            {!isPersonalWorkspace && role !== "MEMBER" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-[#B28D18] dark:text-[#C9A52A] tracking-wider block">
                  ASSIGN TO (REQUIRED) *
                </label>
                <CustomMemberSelect
                  value={assigneeId}
                  onChange={(val) => setAssigneeId(val)}
                  members={eligibleMembers}
                  placeholder="Search and select assigned Member..."
                />
              </div>
            )}

            {/* Title & Description */}
            <div className="space-y-3">
              <div>
                <label className="text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] block mb-1">
                  Task Title *
                </label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Enter ${taskType.toLowerCase()} task title...`}
                  className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18]"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] block mb-1">
                  Description & Requirements
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide explicit execution instructions..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[12px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18] resize-none"
                />
              </div>
            </div>

            {/* Template Dynamic Fields */}
            {taskType === "LEARNING" && (
              <div className="p-3 bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] rounded-[12px] space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] block mb-1">Learning Topic</label>
                    <input
                      value={learningTopic}
                      onChange={(e) => setLearningTopic(e.target.value)}
                      placeholder="e.g. GraphQL Schemas"
                      className="w-full px-3 py-2 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[8px] text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] block mb-1">Documentation URL</label>
                    <input
                      value={resourceUrl}
                      onChange={(e) => setResourceUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[8px] text-[12px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] block mb-1">Expected Outcome / Deliverable</label>
                  <input
                    value={expectedOutcome}
                    onChange={(e) => setExpectedOutcome(e.target.value)}
                    placeholder="e.g. Submit notes and implementation code"
                    className="w-full px-3 py-2 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[8px] text-[12px]"
                  />
                </div>
              </div>
            )}

            {taskType === "DOCUMENT" && (
              <div className="p-3 bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] rounded-[12px] grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] block mb-1">Document Type</label>
                  <AppSelect
                    value={docType}
                    onChange={(val) => setDocType(val)}
                    options={["PRD", "TRD", "Technical Doc", "API Spec", "Security Report", "User Guide"].map((d) => ({
                      value: d,
                      label: d,
                    }))}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] block mb-1">Expected Format</label>
                  <input
                    value={expectedOutcome}
                    onChange={(e) => setExpectedOutcome(e.target.value)}
                    placeholder="e.g. PDF / Markdown"
                    className="w-full px-3 py-2 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[8px] text-[12px]"
                  />
                </div>
              </div>
            )}

            {taskType === "DEVELOPMENT" && (
              <div className="p-3 bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] rounded-[12px] space-y-2">
                <label className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] block mb-1">Acceptance Criteria</label>
                <textarea
                  value={acceptanceCriteria}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  placeholder="e.g. Unit tests pass, zero TypeScript errors"
                  rows={2}
                  className="w-full px-3 py-2 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[8px] text-[12px] resize-none"
                />
              </div>
            )}

            {/* Priority, Deadline & Estimated Time */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] block mb-1">Priority</label>
                <AppSelect
                  value={priority}
                  onChange={(val) => setPriority(val)}
                  options={[
                    { value: "Low", label: "Low", color: "bg-blue-500" },
                    { value: "Medium", label: "Medium", color: "bg-amber-500" },
                    { value: "High", label: "High", color: "bg-rose-500" },
                    { value: "Urgent", label: "Urgent", color: "bg-purple-500" },
                  ]}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] block mb-1">Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[12px] font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] block mb-1">Est. Minutes</label>
                <input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  min="15"
                  step="15"
                  className="w-full px-3 py-2 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[12px] font-semibold"
                />
              </div>
            </div>

            {/* Project Selection */}
            {!projectId && projects.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] block mb-1">Project (Optional)</label>
                <AppSelect
                  value={selectedProjectId}
                  onChange={(val) => setSelectedProjectId(val)}
                  options={[
                    { value: "", label: "No Project" },
                    ...projects.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </div>
            )}

            {/* Task Summary Preview */}
            <div className="p-3.5 bg-[#B28D18]/5 border border-[#B28D18]/20 rounded-[12px] space-y-1.5">
              <span className="text-[10px] font-bold text-[#B28D18] dark:text-[#C9A52A] uppercase tracking-wider block">
                ASSIGNMENT SUMMARY PREVIEW
              </span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#17202A] dark:text-[#F2F4F7]">
                <span>Type: <b>{taskType}</b></span>
                <span>Assignee: <b>{selectedMember ? (selectedMember.name || selectedMember.displayName) : "Unassigned"}</b></span>
                {selectedProject && <span>Project: <b>{selectedProject.name}</b></span>}
                <span>Priority: <b>{priority}</b></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </GlobalSheet>
  );
}
