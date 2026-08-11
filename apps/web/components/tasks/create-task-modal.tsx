"use client";

import React, { useState, useEffect } from "react";
import { CheckSquare, X, Calendar, Clock, User, Shield, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api-client";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: any) => void;
  defaultProjectId?: string | null;
  defaultMilestoneId?: string | null;
  /** Pre-selects and locks the assignee (e.g. when opened from a CO-CEO profile page) */
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string | null;
  defaultAssigneeRole?: string | null;
}

const TASK_TYPES = [
  "Development",
  "Documentation",
  "Research",
  "Study",
  "Design",
  "Testing",
  "Planning",
  "Analysis",
  "Framework",
  "Writing",
  "Configuration",
  "Deployment",
  "Review",
  "Meeting",
  "Learning",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId = null,
  defaultMilestoneId = null,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Development");
  const [priority, setPriority] = useState("Medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId);
  const [milestoneId, setMilestoneId] = useState<string | null>(defaultMilestoneId);
  const [deadline, setDeadline] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [deliverable, setDeliverable] = useState("");

  const [members, setMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [availableMilestones, setAvailableMilestones] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load Workspace Members
    async function loadMembers() {
      try {
        const res = await apiClient.get("/organization/members");
        if (res.data?.data) {
          setMembers(res.data.data);
        }
      } catch (e) {
        console.error("Failed to load members:", e);
      }
    }

    // Load Projects
    async function loadProjects() {
      try {
        const res = await apiClient.get("/org/projects");
        if (res.data?.data && Array.isArray(res.data.data)) {
          setProjects(res.data.data);
        }
      } catch (e) {
        console.error("Failed to load projects:", e);
      }
    }

    loadMembers();
    loadProjects();
  }, [isOpen]);

  // Handle Project selection change to load its milestones
  useEffect(() => {
    if (!projectId || projectId === "NONE") {
      setMilestoneId(null);
      setAvailableMilestones([]);
      return;
    }

    async function loadMilestones() {
      try {
        const res = await apiClient.get(`/org/projects/${projectId}`);
        if (res.data?.data?.milestones) {
          setAvailableMilestones(res.data.data.milestones);
        } else {
          setAvailableMilestones([]);
        }
      } catch (e) {
        console.error("Failed to load milestones for project:", e);
        setAvailableMilestones([]);
      }
    }
    loadMilestones();
  }, [projectId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (!assigneeId) {
      setError("Please select an assignee for this task.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const cleanProjectId = projectId && projectId !== "NONE" ? projectId : null;
      const cleanMilestoneId = cleanProjectId && milestoneId ? milestoneId : null;

      const payload = {
        workspaceId,
        title: title.trim(),
        description: description.trim() || null,
        type,
        priority,
        assigneeId,
        projectId: cleanProjectId,
        milestoneId: cleanMilestoneId,
        deadline: deadline || null,
        startTime: startTime || null,
        endTime: endTime || null,
        approvalRequired,
        verificationRequired,
        deliverable: deliverable.trim() || null,
      };

      const res = await apiClient.post("/org/tasks", payload);
      if (res.data?.success) {
        onSuccess(res.data.data);
        onClose();
      } else {
        setError(res.data?.error || "Failed to create task");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-gold shrink-0" />
            <div>
              <h2 className="text-[19px] font-[650] text-foreground leading-tight">Create Task</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">Standalone or Project-linked Execution Task</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Section 1: Task Basics */}
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-foreground tracking-[0.06em] uppercase mb-2">
                TASK TITLE *
              </label>
              <input
                type="text"
                placeholder="e.g. Research OAuth Security or Setup Redis Cache"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-foreground tracking-[0.06em] uppercase mb-2">
                DESCRIPTION
              </label>
              <textarea
                rows={3}
                placeholder="Describe scope, objectives and instructions for this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-foreground tracking-[0.06em] uppercase mb-2">
                  TASK TYPE
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-gold"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-foreground tracking-[0.06em] uppercase mb-2">
                  PRIORITY
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-gold"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section 2: Assignment & Project Linkage */}
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-foreground tracking-[0.06em] uppercase mb-2">
                ASSIGN TO *
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-gold"
              >
                <option value="">Select Assignee (CO-CEO or Member)...</option>
                {members.filter(m => (m.role || "").toUpperCase().includes("CO")).length > 0 && (
                  <optgroup label="CO-CEOs">
                    {members.filter(m => (m.role || "").toUpperCase().includes("CO")).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email} (CO-CEO)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Members">
                  {members.filter(m => !(m.role || "").toUpperCase().includes("CO")).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email} (Member)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-foreground tracking-[0.06em] uppercase mb-2">
                  PROJECT (OPTIONAL)
                </label>
                <select
                  value={projectId || "NONE"}
                  onChange={(e) => setProjectId(e.target.value === "NONE" ? null : e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-gold"
                >
                  <option value="NONE">No Project (Standalone Task)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-foreground tracking-[0.06em] uppercase mb-2">
                  MILESTONE (OPTIONAL)
                </label>
                <select
                  disabled={!projectId || projectId === "NONE"}
                  value={milestoneId || ""}
                  onChange={(e) => setMilestoneId(e.target.value || null)}
                  className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-gold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!projectId || projectId === "NONE"
                      ? "Select Project First..."
                      : "Optional Milestone..."}
                  </option>
                  {availableMilestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || `Stage ${m.stageNumber}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-foreground tracking-[0.06em] uppercase mb-1.5">
                  TARGET DEADLINE
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground tracking-[0.06em] uppercase mb-1.5">
                  START TIME
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground tracking-[0.06em] uppercase mb-1.5">
                  END TIME
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-gold"
                />
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section 3: Verification & Governance */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border cursor-pointer hover:border-gold/50">
                <input
                  type="checkbox"
                  checked={approvalRequired}
                  onChange={(e) => setApprovalRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-background text-gold focus:ring-gold"
                />
                <span className="text-xs font-semibold text-foreground">Approval Required</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border cursor-pointer hover:border-gold/50">
                <input
                  type="checkbox"
                  checked={verificationRequired}
                  onChange={(e) => setVerificationRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-background text-gold focus:ring-gold"
                />
                <span className="text-xs font-semibold text-foreground">Verification Required</span>
              </label>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-foreground tracking-[0.06em] uppercase mb-2">
                EXPECTED DELIVERABLE
              </label>
              <input
                type="text"
                placeholder="e.g. PR link, PDF document, architecture summary"
                value={deliverable}
                onChange={(e) => setDeliverable(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-transparent border border-border text-muted-foreground font-semibold hover:bg-accent hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-[#0A0A0A] font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Creating Task..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
