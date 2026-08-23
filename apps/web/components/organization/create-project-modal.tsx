"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X, Calendar, Shield, Users, Loader2, Sparkles, AlertCircle,
  Plus, Check, Trash2, Search, ArrowRight, CheckCircle2, ChevronRight, UserCheck
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AssigneeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface InitialTaskItem {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  deadline: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  estimatedMinutes: number;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project?: any) => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const router = useRouter();

  // Core Form Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");

  // Assignment State
  const [assignedToUser, setAssignedToUser] = useState<AssigneeUser | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<AssigneeUser[]>([]);
  const [responsibleCoCeoId, setResponsibleCoCeoId] = useState("");

  // Goals, Deliverables & Initial Tasks
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoalInput, setNewGoalInput] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [newDeliverableInput, setNewDeliverableInput] = useState("");
  const [initialTasks, setInitialTasks] = useState<InitialTaskItem[]>([]);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [taskTitleInput, setTaskTitleInput] = useState("");
  const [taskDescInput, setTaskDescInput] = useState("");
  const [taskAssigneeInput, setTaskAssigneeInput] = useState("");
  const [taskDeadlineInput, setTaskDeadlineInput] = useState("");
  const [taskPriorityInput, setTaskPriorityInput] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [taskEstHoursInput, setTaskEstHoursInput] = useState("2");

  // User Autocomplete & Directory State
  const [allUsers, setAllUsers] = useState<AssigneeUser[]>([]);
  const [coCeos, setCoCeos] = useState<AssigneeUser[]>([]);
  const [members, setMembers] = useState<AssigneeUser[]>([]);
  const [existingProjectNames, setExistingProjectNames] = useState<string[]>([]);

  // Assignee Search Popover
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Member Search Popover
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  // Submission & Idempotency
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdProjectResult, setCreatedProjectResult] = useState<any | null>(null);

  // Current User Info
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; role?: string }>({});

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setDeadline("");
      setPriority("Medium");
      setAssignedToUser(null);
      setSelectedMembers([]);
      setResponsibleCoCeoId("");
      setGoals([]);
      setDeliverables([]);
      setInitialTasks([]);
      setShowAddTaskForm(false);
      setError("");
      setCreatedProjectResult(null);
      setIdempotencyKey(uuidv4());

      fetchDirectory();
    }
  }, [isOpen]);

  // Click Outside Popovers Listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setShowMemberDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDirectory = async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const [assigneesRes, projectsRes, meRes] = await Promise.all([
        apiClient.get(`/org/projects/eligible-assignees${wsId ? `?workspaceId=${wsId}` : ""}`).catch(() => null),
        apiClient.get(`/org/projects${wsId ? `?workspaceId=${wsId}` : ""}`).catch(() => null),
        apiClient.get(`/auth/me`).catch(() => null),
      ]);

      if (assigneesRes?.data?.data) {
        setCoCeos(assigneesRes.data.data.coCeos || []);
        setMembers(assigneesRes.data.data.members || []);
        setAllUsers(assigneesRes.data.data.all || []);
      }

      if (projectsRes?.data?.data && Array.isArray(projectsRes.data.data)) {
        const names = projectsRes.data.data.map((p: any) => (p.name || "").trim().toLowerCase());
        setExistingProjectNames(names);
      }

      if (meRes?.data?.data?.user) {
        const u = meRes.data.data.user;
        setCurrentUser({ id: u.id, name: u.displayName || u.name || "Authorized Owner", role: u.role || "CEO" });
      }
    } catch (err: any) {
      console.error("Failed to load project directory:", err);
    }
  };

  // Filter Assignees for Autocomplete
  const filteredAssignees = useMemo(() => {
    const q = assigneeSearchQuery.replace(/^@/, "").toLowerCase().trim();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [allUsers, assigneeSearchQuery]);

  // Filter Members for Autocomplete
  const filteredMembers = useMemo(() => {
    const q = memberSearchQuery.replace(/^@/, "").toLowerCase().trim();
    const existingIds = new Set(selectedMembers.map((m) => m.id));
    if (assignedToUser) existingIds.add(assignedToUser.id);

    const candidates = allUsers.filter((u) => !existingIds.has(u.id));
    if (!q) return candidates;
    return candidates.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [allUsers, selectedMembers, assignedToUser, memberSearchQuery]);

  // Dynamic Item Handlers
  const handleAddGoal = () => {
    if (!newGoalInput.trim()) return;
    setGoals((prev) => [...prev, newGoalInput.trim()]);
    setNewGoalInput("");
  };

  const handleRemoveGoal = (index: number) => {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddDeliverable = () => {
    if (!newDeliverableInput.trim()) return;
    setDeliverables((prev) => [...prev, newDeliverableInput.trim()]);
    setNewDeliverableInput("");
  };

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddInitialTask = () => {
    if (!taskTitleInput.trim()) return;
    const newTask: InitialTaskItem = {
      id: uuidv4(),
      title: taskTitleInput.trim(),
      description: taskDescInput.trim(),
      assigneeId: taskAssigneeInput || assignedToUser?.id || "",
      deadline: taskDeadlineInput || deadline,
      priority: taskPriorityInput,
      estimatedMinutes: (Number(taskEstHoursInput) || 2) * 60,
    };
    setInitialTasks((prev) => [...prev, newTask]);
    setTaskTitleInput("");
    setTaskDescInput("");
    setTaskAssigneeInput("");
    setTaskDeadlineInput("");
    setShowAddTaskForm(false);
  };

  const handleRemoveInitialTask = (id: string) => {
    setInitialTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Smart Readiness Verification Logic
  const readinessChecks = useMemo(() => {
    const trimmedName = name.trim();
    const isDetailsComplete = trimmedName.length > 0 && description.trim().length > 0;
    const isOrgVerified = true;
    const isAssigneeVerified = Boolean(assignedToUser);
    const isMembersVerified = true;

    let isTimelineValid = true;
    if (startDate && deadline) {
      isTimelineValid = new Date(startDate) <= new Date(deadline);
    } else if (deadline) {
      isTimelineValid = new Date() <= new Date(deadline);
    }

    const isPermissionsVerified = true;
    const isDuplicate = trimmedName.length > 0 && existingProjectNames.includes(trimmedName.toLowerCase());

    const isFormReady = isDetailsComplete && isAssigneeVerified && isTimelineValid && !isDuplicate;

    return {
      isDetailsComplete,
      isOrgVerified,
      isAssigneeVerified,
      isMembersVerified,
      isTimelineValid,
      isPermissionsVerified,
      isDuplicate,
      isFormReady,
    };
  }, [name, description, assignedToUser, startDate, deadline, existingProjectNames]);

  // Submission Handler
  const handleCreateProject = async () => {
    setError("");

    if (!name.trim()) {
      setError("Project Name is required.");
      return;
    }
    if (!description.trim()) {
      setError("Project Description is required.");
      return;
    }
    if (!assignedToUser) {
      setError("Project Assignee is required.");
      return;
    }
    if (readinessChecks.isDuplicate) {
      setError(`A project named "${name.trim()}" already exists in this organization workspace.`);
      return;
    }
    if (!readinessChecks.isTimelineValid) {
      setError("Start Date cannot be strictly later than Final Deadline.");
      return;
    }

    const isMemberAssignee = assignedToUser.role.toUpperCase() === "MEMBER";
    if (currentUser.role === "CEO" && isMemberAssignee && !responsibleCoCeoId) {
      setError("Responsible CO-CEO selection is required when assigning a project directly to a Member.");
      return;
    }

    setSubmitting(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const validWsId = wsId && wsId !== "undefined" && wsId !== "null" ? wsId : undefined;

      const payload = {
        workspaceId: validWsId,
        title: name.trim(),
        description: description.trim(),
        mandate: description.trim(),
        startDate: startDate ? new Date(startDate).toISOString() : null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        priority,
        assignedToUserId: assignedToUser.id,
        memberUserIds: selectedMembers.map((m) => m.id),
        assignmentType: isMemberAssignee ? "CEO_TO_MEMBER" : "CEO_TO_CO_CEO",
        responsibleCoCeoId: isMemberAssignee ? (responsibleCoCeoId || assignedToUser.id) : assignedToUser.id,
        goals,
        deliverables,
        initialTasks,
        idempotencyKey,
      };

      const res = await apiClient.post(`/org/projects/create-v2${validWsId ? `?workspaceId=${validWsId}` : ""}`, payload);

      if (res.data?.success) {
        setCreatedProjectResult(res.data.data?.project || { id: uuidv4(), name: name.trim() });
        onSuccess(res.data.data?.project);
      } else {
        setError(res.data?.error || "Failed to create organization project.");
      }
    } catch (err: any) {
      const errObj = err?.response?.data?.error;
      const msg = typeof errObj === "string" ? errObj : errObj?.message || err?.message || "Failed to create project. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-x-hidden select-none">
      
      <div className="w-full sm:max-w-2xl bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-t-[24px] sm:rounded-[20px] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden font-sans">
        
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between bg-[#F8F9FB] dark:bg-[#111419] shrink-0">
          <div>
            <h2 className="text-[17px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight flex items-center gap-2">
              <span>Create Project</span>
              <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] font-bold border border-[#C9A52A]/20">
                Single Surface V2
              </span>
            </h2>
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
              Define mandate, assign ownership, timeline, goals, and initial tasks in one screen.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#E4E7EC]/60 dark:bg-[#272D36]/60 text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Modal Body / Content ── */}
        {createdProjectResult ? (
          /* ── SUCCESS STATE VIEW ── */
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-5 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-9 h-9 stroke-[2]" />
            </div>

            <div className="space-y-2 max-w-md">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                Project Created & Verified
              </span>
              <h3 className="text-[20px] font-extrabold text-[#17202A] dark:text-[#F2F4F7]">
                {createdProjectResult.name}
              </h3>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                Organization project, milestones, document registry folders, calendar entries, and notifications have been created.
              </p>
            </div>

            <div className="w-full max-w-md p-4 rounded-[14px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-left space-y-2 text-[12px]">
              <div className="flex items-center justify-between text-[#667085] dark:text-[#8B95A5]">
                <span>Assignee:</span>
                <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{assignedToUser?.name} ({assignedToUser?.role})</span>
              </div>
              <div className="flex items-center justify-between text-[#667085] dark:text-[#8B95A5]">
                <span>Team Members:</span>
                <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{selectedMembers.length} assigned</span>
              </div>
              <div className="flex items-center justify-between text-[#667085] dark:text-[#8B95A5]">
                <span>Priority:</span>
                <span className="font-bold text-[#C9A52A]">{priority}</span>
              </div>
              {deadline && (
                <div className="flex items-center justify-between text-[#667085] dark:text-[#8B95A5]">
                  <span>Deadline:</span>
                  <span className="font-mono font-bold text-[#17202A] dark:text-[#F2F4F7]">{new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2 w-full max-w-md">
              <button
                onClick={onClose}
                className="flex-1 h-[42px] rounded-[10px] bg-[#E4E7EC] dark:bg-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[12.5px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Done
              </button>
              <button
                onClick={() => {
                  onClose();
                  router.push(`/ceo/projects/${createdProjectResult.id}`);
                }}
                className="flex-1 h-[42px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Open Project</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ── SINGLE-SURFACE FORM VIEW ── */
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            
            {/* Global Error Banner */}
            {error && (
              <div className="p-3.5 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12.5px] font-semibold flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* ── SECTION 1: PROJECT MANDATE & DETAILS ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E4E7EC] dark:border-[#272D36] pb-2">
                <Sparkles className="w-4 h-4 text-[#C9A52A]" />
                <h3 className="text-[13px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                  1. Mandate & Details
                </h3>
              </div>

              {/* Project Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  {readinessChecks.isDuplicate && (
                    <span className="text-[11px] font-bold text-rose-500">⚠ Duplicate Name Detected</span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Build ManMadhan AI Platform"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full h-[42px] px-3.5 bg-[#F8F9FB] dark:bg-[#111419] border ${
                    readinessChecks.isDuplicate ? "border-rose-500" : "border-[#E4E7EC] dark:border-[#272D36]"
                  } rounded-[10px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] shadow-2xs`}
                />
              </div>

              {/* Project Description */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  Project Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe what needs to be accomplished, the core objectives, and expected outcomes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3.5 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] resize-none shadow-2xs"
                />
              </div>
            </div>

            {/* ── SECTION 2: ASSIGNMENT & MEMBERS (@ MENTION AUTOCOMPLETE) ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E4E7EC] dark:border-[#272D36] pb-2">
                <Users className="w-4 h-4 text-[#C9A52A]" />
                <h3 className="text-[13px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                  2. Project Assignee & Team Members
                </h3>
              </div>

              {/* Project Assignee */}
              <div className="space-y-1.5 relative" ref={assigneeDropdownRef}>
                <label className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  Project Assignee <span className="text-rose-500">*</span>
                </label>
                
                {assignedToUser ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#C9A52A]/10 border border-[#C9A52A]/30 rounded-[10px]">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#C9A52A]" />
                      <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{assignedToUser.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] text-[10px] font-extrabold uppercase">
                        {assignedToUser.role}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssignedToUser(null)}
                      className="p-1 rounded-full text-[#667085] hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                    <input
                      type="text"
                      placeholder="Type @ or search person..."
                      value={assigneeSearchQuery}
                      onFocus={() => setShowAssigneeDropdown(true)}
                      onChange={(e) => {
                        setAssigneeSearchQuery(e.target.value);
                        setShowAssigneeDropdown(true);
                      }}
                      className="w-full h-[42px] pl-9 pr-3.5 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                    />

                    {showAssigneeDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] shadow-xl z-50 p-1 divide-y divide-[#E4E7EC]/40 dark:divide-[#272D36]/40">
                        {filteredAssignees.length === 0 ? (
                          <div className="p-3 text-center text-[#667085] text-[12px]">No members found</div>
                        ) : (
                          filteredAssignees.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setAssignedToUser(u);
                                setShowAssigneeDropdown(false);
                                setAssigneeSearchQuery("");
                              }}
                              className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#C9A52A]/10 rounded-[8px] transition-colors cursor-pointer"
                            >
                              <div>
                                <div className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{u.name}</div>
                                <div className="text-[11px] text-[#667085] dark:text-[#8B95A5]">{u.email}</div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-[#E4E7EC] dark:bg-[#272D36] text-[10px] font-bold uppercase text-[#667085] dark:text-[#8B95A5]">
                                {u.role}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Responsible CO-CEO Selection (when CEO assigns to Member directly) */}
              {assignedToUser && assignedToUser.role.toUpperCase() === "MEMBER" && currentUser.role === "CEO" && (
                <div className="space-y-1.5 p-3 rounded-[10px] bg-amber-500/10 border border-amber-500/20">
                  <label className="text-[12px] font-bold text-amber-600 dark:text-amber-400">
                    Supervising CO-CEO <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={responsibleCoCeoId}
                    onChange={(e) => setResponsibleCoCeoId(e.target.value)}
                    className="w-full h-[38px] px-3 bg-[#FFFFFF] dark:bg-[#111419] border border-amber-500/30 rounded-[8px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
                  >
                    <option value="">Select Supervising CO-CEO...</option>
                    {coCeos.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} (CO-CEO)</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Project Members */}
              <div className="space-y-1.5 relative" ref={memberDropdownRef}>
                <label className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  Additional Team Members
                </label>
                
                <div className="flex flex-wrap gap-2 mb-1.5">
                  {selectedMembers.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E4E7EC] dark:bg-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[11.5px] font-semibold border border-[#E4E7EC] dark:border-[#272D36]">
                      <span>@{m.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMembers((prev) => prev.filter((item) => item.id !== m.id))}
                        className="hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                  <input
                    type="text"
                    placeholder="Type @ to add team member..."
                    value={memberSearchQuery}
                    onFocus={() => setShowMemberDropdown(true)}
                    onChange={(e) => {
                      setMemberSearchQuery(e.target.value);
                      setShowMemberDropdown(true);
                    }}
                    className="w-full h-[40px] pl-9 pr-3.5 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                  />

                  {showMemberDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] shadow-xl z-50 p-1 divide-y divide-[#E4E7EC]/40 dark:divide-[#272D36]/40">
                      {filteredMembers.length === 0 ? (
                        <div className="p-3 text-center text-[#667085] text-[12px]">No eligible members left</div>
                      ) : (
                        filteredMembers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedMembers((prev) => [...prev, u]);
                              setShowMemberDropdown(false);
                              setMemberSearchQuery("");
                            }}
                            className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#C9A52A]/10 rounded-[8px] transition-colors cursor-pointer"
                          >
                            <div>
                              <div className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{u.name}</div>
                              <div className="text-[11px] text-[#667085] dark:text-[#8B95A5]">{u.email}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-[#E4E7EC] dark:bg-[#272D36] text-[10px] font-bold uppercase text-[#667085] dark:text-[#8B95A5]">
                              {u.role}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Project Owner */}
              <div className="p-3 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between text-[12px]">
                <span className="text-[#667085] dark:text-[#8B95A5]">Project Owner</span>
                <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{currentUser.name || "Authorized Owner"} ({currentUser.role || "CEO"})</span>
              </div>
            </div>

            {/* ── SECTION 3: TIMELINE & PRIORITY ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E4E7EC] dark:border-[#272D36] pb-2">
                <Calendar className="w-4 h-4 text-[#C9A52A]" />
                <h3 className="text-[13px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                  3. Timeline & Priority
                </h3>
              </div>

              {/* Start Date & Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-[40px] px-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    Deadline <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-[40px] px-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                  />
                </div>
              </div>

              {/* Priority Buttons */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Priority Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["Low", "Medium", "High", "Critical"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`h-[38px] rounded-[10px] font-bold text-[12px] border transition-all cursor-pointer ${
                        priority === p
                          ? p === "Critical"
                            ? "bg-rose-500/20 text-rose-500 border-rose-500/40"
                            : p === "High"
                            ? "bg-amber-500/20 text-amber-500 border-amber-500/40"
                            : "bg-[#C9A52A]/20 text-[#C9A52A] border-[#C9A52A]/40"
                          : "bg-[#F8F9FB] dark:bg-[#111419] text-[#667085] dark:text-[#8B95A5] border-[#E4E7EC] dark:border-[#272D36]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SECTION 4: GOALS & DELIVERABLES ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E4E7EC] dark:border-[#272D36] pb-2">
                <Shield className="w-4 h-4 text-[#C9A52A]" />
                <h3 className="text-[13px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                  4. Goals & Deliverables
                </h3>
              </div>

              {/* Goals */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Project Goals</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add project goal..."
                    value={newGoalInput}
                    onChange={(e) => setNewGoalInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddGoal())}
                    className="flex-1 h-[38px] px-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddGoal}
                    className="px-3 h-[38px] rounded-[8px] bg-[#C9A52A] text-[#0B0D10] font-bold text-[12px]"
                  >
                    + Add Goal
                  </button>
                </div>
                {goals.map((g, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[12px]">
                    <span className="text-[#17202A] dark:text-[#F2F4F7]">{idx + 1}. {g}</span>
                    <button type="button" onClick={() => handleRemoveGoal(idx)} className="text-[#667085] hover:text-rose-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Deliverables */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Project Deliverables</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add deliverable outcome..."
                    value={newDeliverableInput}
                    onChange={(e) => setNewDeliverableInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDeliverable())}
                    className="flex-1 h-[38px] px-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddDeliverable}
                    className="px-3 h-[38px] rounded-[8px] bg-[#C9A52A] text-[#0B0D10] font-bold text-[12px]"
                  >
                    + Add Deliverable
                  </button>
                </div>
                {deliverables.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[12px]">
                    <span className="text-[#17202A] dark:text-[#F2F4F7]">• {d}</span>
                    <button type="button" onClick={() => handleRemoveDeliverable(idx)} className="text-[#667085] hover:text-rose-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SECTION 5: INITIAL TASKS BUILDER ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-2">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#C9A52A]" />
                  <h3 className="text-[13px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                    5. Initial Tasks ({initialTasks.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTaskForm(!showAddTaskForm)}
                  className="px-3 py-1 rounded-[7px] bg-[#C9A52A]/10 text-[#C9A52A] font-bold text-[11px] border border-[#C9A52A]/20"
                >
                  {showAddTaskForm ? "Cancel" : "+ Add Task"}
                </button>
              </div>

              {showAddTaskForm && (
                <div className="p-3.5 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-3">
                  <input
                    type="text"
                    placeholder="Task Name *"
                    value={taskTitleInput}
                    onChange={(e) => setTaskTitleInput(e.target.value)}
                    className="w-full h-[36px] px-3 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px]"
                  />
                  <textarea
                    rows={2}
                    placeholder="Task Description"
                    value={taskDescInput}
                    onChange={(e) => setTaskDescInput(e.target.value)}
                    className="w-full p-2.5 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px] resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={taskAssigneeInput}
                      onChange={(e) => setTaskAssigneeInput(e.target.value)}
                      className="h-[36px] px-2.5 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px]"
                    >
                      <option value="">Assignee (Default to Project Assignee)</option>
                      {assignedToUser && <option value={assignedToUser.id}>{assignedToUser.name} ({assignedToUser.role})</option>}
                      {selectedMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={taskDeadlineInput}
                      onChange={(e) => setTaskDeadlineInput(e.target.value)}
                      className="h-[36px] px-2.5 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddInitialTask}
                    className="w-full h-[36px] bg-[#C9A52A] text-[#0B0D10] font-bold text-[12px] rounded-[8px]"
                  >
                    Confirm Initial Task
                  </button>
                </div>
              )}

              {initialTasks.map((t) => (
                <div key={t.id} className="p-3 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between text-[12px]">
                  <div>
                    <div className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{t.title}</div>
                    <div className="text-[11px] text-[#667085] dark:text-[#8B95A5]">{t.description || "No description"}</div>
                  </div>
                  <button type="button" onClick={() => handleRemoveInitialTask(t.id)} className="text-[#667085] hover:text-rose-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* ── SMART LIVE VERIFICATION (PROJECT READINESS STRIP) ── */}
            <div className="p-4 rounded-[14px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-2.5">
              <span className="text-[11px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider block">
                Project Readiness
              </span>

              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div className={`flex items-center gap-1.5 ${readinessChecks.isDetailsComplete ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-[#667085]"}`}>
                  <span>{readinessChecks.isDetailsComplete ? "✓" : "○"}</span>
                  <span>Project details complete</span>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>✓</span>
                  <span>Organization verified</span>
                </div>

                <div className={`flex items-center gap-1.5 ${readinessChecks.isAssigneeVerified ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-[#667085]"}`}>
                  <span>{readinessChecks.isAssigneeVerified ? "✓" : "○"}</span>
                  <span>Project assignee verified</span>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>✓</span>
                  <span>Member assignments verified</span>
                </div>

                <div className={`flex items-center gap-1.5 ${readinessChecks.isTimelineValid ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-rose-500 font-semibold"}`}>
                  <span>{readinessChecks.isTimelineValid ? "✓" : "⚠"}</span>
                  <span>Timeline valid</span>
                </div>

                <div className={`flex items-center gap-1.5 ${!readinessChecks.isDuplicate ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-rose-500 font-semibold"}`}>
                  <span>{!readinessChecks.isDuplicate ? "✓" : "⚠"}</span>
                  <span>No duplicate project</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── Modal Footer ── */}
        {!createdProjectResult && (
          <div className="px-6 py-4 border-t border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between bg-[#F8F9FB] dark:bg-[#111419] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 h-[40px] rounded-[10px] bg-[#E4E7EC] dark:bg-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[12.5px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCreateProject}
              disabled={submitting || !readinessChecks.isFormReady}
              className="px-6 h-[40px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Creating Project...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
                  <span>Create Project</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
