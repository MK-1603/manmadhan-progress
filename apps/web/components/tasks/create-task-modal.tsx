"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CheckSquare, X, Loader2, AlertCircle, Calendar, User, Layers, Shield, FileText, Check, Search } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: any) => void;
  defaultProjectId?: string | null;
  defaultMilestoneId?: string | null;
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string | null;
  defaultAssigneeRole?: string | null;
}

const TASK_TYPES = [
  "Project Work",
  "Development",
  "Design",
  "Document",
  "Research",
  "Review",
  "Testing",
  "Bug / Fix",
  "Approval",
  "Deployment",
  "Meeting",
  "Other"
];

export function renderNeatTextWithMentions(text: string | null | undefined) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9._-]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const isMe = part.toLowerCase() === "@me";
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-bold ${
                isMe
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-[#C9A52A]/20 text-[#C9A52A] border border-[#C9A52A]/30"
              }`}
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId = null,
  defaultMilestoneId = null,
  defaultAssigneeId = null,
}: CreateTaskModalProps) {
  const { user } = useAuth();

  // Task Scope: PROJECT (requires project) vs ORGANIZATION (no project)
  const [taskScope, setTaskScope] = useState<"PROJECT" | "ORGANIZATION">(
    defaultProjectId ? "PROJECT" : "PROJECT"
  );

  // Form Fields State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("Project Work");
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || "");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(defaultMilestoneId || "");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(defaultAssigneeId || "");
  const [priority, setPriority] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");
  const [dueDate, setDueDate] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [evidenceRequired, setEvidenceRequired] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [notes, setNotes] = useState("");

  // Metadata
  const [projects, setProjects] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [eligibleAssignees, setEligibleAssignees] = useState<any[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search filter for task type
  const [typeSearch, setTypeSearch] = useState("");
  const filteredTaskTypes = useMemo(() => {
    if (!typeSearch.trim()) return TASK_TYPES;
    return TASK_TYPES.filter((t) => t.toLowerCase().includes(typeSearch.toLowerCase()));
  }, [typeSearch]);

  // Load Authorized Projects on Mount
  useEffect(() => {
    if (!isOpen) return;
    async function loadProjects() {
      try {
        const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
        const res = await apiClient.get(`/org/projects${wsId ? `?workspaceId=${wsId}` : ""}`);
        if (res.data?.success && Array.isArray(res.data.data)) {
          setProjects(res.data.data);
        }
      } catch (e) {
        console.warn("Failed to load projects for task creation:", e);
      }
    }
    loadProjects();
  }, [isOpen]);

  // Load Milestones when Selected Project Changes
  useEffect(() => {
    if (!isOpen || !selectedProjectId) {
      setMilestones([]);
      setSelectedMilestoneId("");
      return;
    }
    async function loadMilestones() {
      try {
        const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
        const res = await apiClient.get(`/org/projects/${selectedProjectId}/milestones${wsId ? `?workspaceId=${wsId}` : ""}`);
        if (res.data?.success && Array.isArray(res.data.data)) {
          setMilestones(res.data.data);
        } else {
          setMilestones([]);
        }
      } catch (e) {
        setMilestones([]);
      }
    }
    loadMilestones();
  }, [isOpen, selectedProjectId]);

  // Load Authorized Assignees (filtered by project if project is selected)
  useEffect(() => {
    if (!isOpen) return;
    async function loadAssignees() {
      setLoadingAssignees(true);
      try {
        const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
        const queryParams = new URLSearchParams();
        if (wsId) queryParams.set("workspaceId", wsId);
        if (taskScope === "PROJECT" && selectedProjectId) {
          queryParams.set("projectId", selectedProjectId);
        }
        const res = await apiClient.get(`/org/projects/eligible-assignees?${queryParams.toString()}`);
        if (res.data?.members || res.data?.coCeos) {
          const list = [...(res.data.coCeos || []), ...(res.data.members || [])];
          setEligibleAssignees(list);
        } else {
          setEligibleAssignees([]);
        }
      } catch (e) {
        console.warn("Failed to load assignees:", e);
      } finally {
        setLoadingAssignees(false);
      }
    }
    loadAssignees();
  }, [isOpen, taskScope, selectedProjectId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (taskScope === "PROJECT" && !selectedProjectId) {
      setError("Project Task must be assigned to an organization project.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        type: taskType,
        taskType,
        projectId: taskScope === "PROJECT" ? selectedProjectId : null,
        milestoneId: taskScope === "PROJECT" && selectedMilestoneId ? selectedMilestoneId : null,
        assigneeId: selectedAssigneeId || null,
        priority,
        deadline: dueDate || null,
        deliverable: deliverable.trim() || null,
        evidenceRequired,
        requirements: requirements.trim() || null,
        reviewerId: reviewerId || null,
        notes: notes.trim() || null,
      };

      const res = await apiClient.post(`/org/tasks${wsId ? `?workspaceId=${wsId}` : ""}`, payload);
      if (res.data?.success || res.data?.data) {
        onSuccess(res.data.data || res.data);
        onClose();
      } else {
        setError(res.data?.error || "Failed to create task.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Task creation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs font-sans text-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/80 shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <CheckSquare className="w-4.5 h-4.5 text-[#C9A52A]" />
              <span>Create Task</span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Create and assign organizational work
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Scope Selector (Project Task vs Organization Task) */}
          <div className="p-3 rounded-xl bg-background border border-border space-y-2">
            <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
              Task Scope *
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTaskScope("PROJECT")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer text-center ${
                  taskScope === "PROJECT"
                    ? "bg-[#C9A52A] text-[#0B0D10] border-[#C9A52A]"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                Project Task
              </button>
              <button
                type="button"
                onClick={() => {
                  setTaskScope("ORGANIZATION");
                  setSelectedProjectId("");
                  setSelectedMilestoneId("");
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer text-center ${
                  taskScope === "ORGANIZATION"
                    ? "bg-[#C9A52A] text-[#0B0D10] border-[#C9A52A]"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                Organization Task
              </button>
            </div>
          </div>

          {/* 2. Task Title & Description */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build OAuth 2.0 Session Engine & Integration Tests"
                className="w-full h-[38px] px-3.5 bg-background border border-border focus:border-[#C9A52A] rounded-xl text-xs text-foreground outline-none shadow-2xs font-semibold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail task requirements, mandate deliverables, and acceptance criteria..."
                rows={3}
                className="w-full p-3 bg-background border border-border focus:border-[#C9A52A] rounded-xl text-xs text-foreground outline-none resize-y leading-relaxed shadow-2xs"
              />
            </div>
          </div>

          {/* 3. Task Type (Searchable Dropdown) */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
              Task Type *
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full h-[38px] px-3.5 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer font-semibold"
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Context Section (Project & Milestone) */}
          {taskScope === "PROJECT" && (
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-3">
              <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                Project Context
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground block">Project *</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-[36px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer font-semibold"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground block">Milestone</label>
                  <select
                    value={selectedMilestoneId}
                    onChange={(e) => setSelectedMilestoneId(e.target.value)}
                    disabled={!selectedProjectId}
                    className="w-full h-[36px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer disabled:opacity-50 font-semibold"
                  >
                    <option value="">No Milestone / Flexible</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 5. Execution Section (Assignee, Priority, Due Date) */}
          <div className="p-3.5 rounded-2xl bg-card border border-border space-y-3">
            <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
              Execution Controls
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-[11px] font-bold text-foreground block">Assignee</label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="w-full h-[36px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer font-semibold"
                >
                  <option value="">Unassigned</option>
                  {eligibleAssignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground block">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full h-[36px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer font-semibold"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground block">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-[36px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer font-semibold"
                />
              </div>
            </div>
          </div>

          {/* 6. Deliverable & Evidence Section */}
          <div className="p-3.5 rounded-2xl bg-card border border-border space-y-3">
            <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
              Deliverable & Evidence
            </span>
            <div className="space-y-2">
              <input
                type="text"
                value={deliverable}
                onChange={(e) => setDeliverable(e.target.value)}
                placeholder="e.g. Working API endpoints, GitHub PR, & TRD doc"
                className="w-full h-[36px] px-3.5 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]"
              />

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={evidenceRequired}
                  onChange={(e) => setEvidenceRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-[#C9A52A] cursor-pointer"
                />
                <span className="text-xs font-semibold text-foreground">
                  Require Evidence (PR / Commit / Document) before completion approval
                </span>
              </label>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-foreground font-bold hover:bg-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs cursor-pointer shadow-xs hover:brightness-105 disabled:opacity-40 flex items-center gap-1.5"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Create Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
