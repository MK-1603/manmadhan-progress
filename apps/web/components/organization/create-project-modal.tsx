"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Loader2, Check, Trash2, Search, CheckCircle2, ChevronRight } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useRouter } from "next/navigation";

function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

const STEPS = [
  { id: 1, name: "Details", label: "01 Details" },
  { id: 2, name: "Assignment", label: "02 Assignment" },
  { id: 3, name: "Timeline", label: "03 Timeline" },
  { id: 4, name: "Goals", label: "04 Goals & Deliverables" },
  { id: 5, name: "Review", label: "05 Review & Create" },
];

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const router = useRouter();

  // Wizard Step State (1-5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("ORGANIZATION");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");

  // Step 2: Assignment
  const [assignedToUser, setAssignedToUser] = useState<AssigneeUser | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<AssigneeUser[]>([]);
  const [responsibleCoCeoId, setResponsibleCoCeoId] = useState("");

  // Step 3: Timeline
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("40");

  // Step 4: Goals, Deliverables & Initial Tasks
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

  // Directory & Autocomplete State
  const [allUsers, setAllUsers] = useState<AssigneeUser[]>([]);
  const [coCeos, setCoCeos] = useState<AssigneeUser[]>([]);
  const [existingProjectNames, setExistingProjectNames] = useState<string[]>([]);

  // Assignee Popover
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Member Popover
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  // Current User / Identity Context
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; role?: string }>({
    name: "Authorized CEO",
    role: "CEO",
  });

  // Result / State after submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdProjectResult, setCreatedProjectResult] = useState<any | null>(null);

  // Deduplication Idempotency Key
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setName("");
      setDescription("");
      setProjectType("ORGANIZATION");
      setPriority("Medium");
      setAssignedToUser(null);
      setSelectedMembers([]);
      setResponsibleCoCeoId("");
      setStartDate("");
      setDeadline("");
      setEstimatedHours("40");
      setGoals([]);
      setNewGoalInput("");
      setDeliverables([]);
      setNewDeliverableInput("");
      setInitialTasks([]);
      setShowAddTaskForm(false);
      setError("");
      setCreatedProjectResult(null);
      setIdempotencyKey(generateUUID());
      fetchDirectoryAndContext();
    }
  }, [isOpen]);

  const fetchDirectoryAndContext = async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const [assigneesRes, existingRes, meRes] = await Promise.allSettled([
        apiClient.get(`/org/projects/eligible-assignees${wsId ? `?workspaceId=${wsId}` : ""}`),
        apiClient.get(`/org/projects${wsId ? `?workspaceId=${wsId}` : ""}`),
        apiClient.get("/auth/me"),
      ]);

      if (assigneesRes.status === "fulfilled" && assigneesRes.value.data?.data) {
        setCoCeos(assigneesRes.value.data.data.coCeos || []);
        setAllUsers(assigneesRes.value.data.data.all || []);
      }

      if (existingRes.status === "fulfilled" && existingRes.value.data?.data) {
        const names = (existingRes.value.data.data || []).map((p: any) => (p.name || "").toLowerCase().trim());
        setExistingProjectNames(names);
      }

      if (meRes.status === "fulfilled" && meRes.value.data?.user) {
        setCurrentUser({
          id: meRes.value.data.user.id,
          name: meRes.value.data.user.name || meRes.value.data.user.email,
          role: meRes.value.data.user.role || "CEO",
        });
      }
    } catch (err) {
      console.error("Failed to load project creation directory:", err);
    }
  };

  // Close dropdowns when clicking outside
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

  // Filtered Assignees & Members
  const filteredAssignees = useMemo(() => {
    if (!assigneeSearchQuery.trim()) return allUsers;
    const q = assigneeSearchQuery.toLowerCase().trim();
    return allUsers.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
  }, [allUsers, assigneeSearchQuery]);

  const filteredMembers = useMemo(() => {
    const selectedIds = new Set(selectedMembers.map((m) => m.id));
    if (assignedToUser) selectedIds.add(assignedToUser.id);

    return allUsers.filter((u) => {
      if (selectedIds.has(u.id)) return false;
      if (!memberSearchQuery.trim()) return true;
      const q = memberSearchQuery.toLowerCase().trim();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [allUsers, selectedMembers, assignedToUser, memberSearchQuery]);

  // Goal handlers
  const handleAddGoal = () => {
    if (newGoalInput.trim()) {
      setGoals((prev) => [...prev, newGoalInput.trim()]);
      setNewGoalInput("");
    }
  };

  const handleRemoveGoal = (idx: number) => {
    setGoals((prev) => prev.filter((_, i) => i !== idx));
  };

  // Deliverable handlers
  const handleAddDeliverable = () => {
    if (newDeliverableInput.trim()) {
      setDeliverables((prev) => [...prev, newDeliverableInput.trim()]);
      setNewDeliverableInput("");
    }
  };

  const handleRemoveDeliverable = (idx: number) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== idx));
  };

  // Initial task handlers
  const handleAddInitialTask = () => {
    if (!taskTitleInput.trim()) return;
    const newTask: InitialTaskItem = {
      id: generateUUID(),
      title: taskTitleInput.trim(),
      description: taskDescInput.trim(),
      assigneeId: taskAssigneeInput || (assignedToUser?.id || ""),
      deadline: taskDeadlineInput || deadline || "",
      priority: taskPriorityInput,
      estimatedMinutes: (parseInt(taskEstHoursInput, 10) || 1) * 60,
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

  // Readiness / Duplicate Check
  const isDuplicateName = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    return trimmed.length > 0 && existingProjectNames.includes(trimmed);
  }, [name, existingProjectNames]);

  const isTimelineValid = useMemo(() => {
    if (startDate && deadline) {
      return new Date(startDate) <= new Date(deadline);
    }
    return true;
  }, [startDate, deadline]);

  // Step Navigation Validation
  const validateStep = (step: number): boolean => {
    setError("");

    if (step === 1) {
      if (!name.trim()) {
        setError("Project Name is required.");
        return false;
      }
      if (!description.trim()) {
        setError("Project Description is required.");
        return false;
      }
      if (isDuplicateName) {
        setError(`A project named "${name.trim()}" already exists in this organization workspace.`);
        return false;
      }
    }

    if (step === 2) {
      if (!assignedToUser) {
        setError("Project Assignee is required.");
        return false;
      }
      const isMember = assignedToUser.role.toUpperCase() === "MEMBER";
      if (currentUser.role === "CEO" && isMember && !responsibleCoCeoId) {
        setError("Supervising CO-CEO selection is required when assigning directly to a Member.");
        return false;
      }
    }

    if (step === 3) {
      if (!startDate) {
        setError("Start Date is required.");
        return false;
      }
      if (!deadline) {
        setError("Deadline is required.");
        return false;
      }
      if (!isTimelineValid) {
        setError("Start Date cannot be strictly after Deadline.");
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(5, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setError("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleJumpToStep = (stepNumber: number) => {
    setError("");
    setCurrentStep(stepNumber);
  };

  // Timeline Preview Calculation
  const timelinePreviewText = useMemo(() => {
    if (!startDate || !deadline) return "";
    try {
      const s = new Date(startDate);
      const d = new Date(deadline);
      const diffDays = Math.ceil((d.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      const sFmt = s.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      const dFmt = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
      return `${diffDays} days (${sFmt} → ${dFmt})`;
    } catch {
      return "";
    }
  }, [startDate, deadline]);

  // Submission Handler
  const handleCreateProject = async () => {
    setError("");

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setSubmitting(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const validWsId = wsId && wsId !== "undefined" && wsId !== "null" ? wsId : undefined;

      const isMemberAssignee = assignedToUser?.role.toUpperCase() === "MEMBER";

      const payload = {
        workspaceId: validWsId,
        title: name.trim(),
        description: description.trim(),
        mandate: description.trim(),
        projectType,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        priority,
        assignedToUserId: assignedToUser?.id,
        memberUserIds: selectedMembers.map((m) => m.id),
        assignmentType: isMemberAssignee ? "CEO_TO_MEMBER" : "CEO_TO_CO_CEO",
        responsibleCoCeoId: isMemberAssignee ? (responsibleCoCeoId || assignedToUser?.id) : assignedToUser?.id,
        goals,
        deliverables,
        initialTasks,
        idempotencyKey,
      };

      const res = await apiClient.post(`/org/projects/create-v2${validWsId ? `?workspaceId=${validWsId}` : ""}`, payload);

      if (res.data?.success) {
        setCreatedProjectResult(res.data.data?.project || { id: generateUUID(), name: name.trim() });
        onSuccess(res.data.data?.project);
      } else {
        setError(res.data?.error || "Unable to create project.");
      }
    } catch (err: any) {
      const errObj = err?.response?.data?.error;
      const msg = typeof errObj === "string" ? errObj : errObj?.message || err?.message || "Unable to create project. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-x-hidden select-none">
      
      <div className="w-full sm:max-w-2xl bg-white dark:bg-[#15191F] border border-zinc-200 dark:border-[#272D36] rounded-t-[20px] sm:rounded-[16px] shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[85vh] overflow-hidden font-sans">
        
        {/* ── MODAL HEADER ── */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-[#272D36] flex items-center justify-between bg-zinc-50 dark:bg-[#111419] shrink-0">
          <div>
            <h2 className="text-[17px] font-extrabold text-zinc-900 dark:text-[#F2F4F7] tracking-tight">
              Create Project
            </h2>
            <p className="text-[12px] text-zinc-500 dark:text-[#8B95A5] mt-0.5">
              Set up a new organization project.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-200/60 dark:bg-[#272D36]/60 text-zinc-500 dark:text-[#8B95A5] hover:text-zinc-900 dark:hover:text-[#F2F4F7] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── COMPACT 5-STEP INDICATOR ── */}
        {!createdProjectResult && (
          <div className="px-6 py-3 border-b border-zinc-200 dark:border-[#272D36] bg-zinc-50/50 dark:bg-[#111419]/50 shrink-0">
            <div className="flex items-center justify-between gap-1 overflow-x-auto [scrollbar-width:none]">
              {STEPS.map((s) => {
                const isActive = currentStep === s.id;
                const isCompleted = currentStep > s.id;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (s.id < currentStep) handleJumpToStep(s.id);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11.5px] font-bold transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-[#C9A52A]/15 text-[#C9A52A] border border-[#C9A52A]/30"
                        : isCompleted
                        ? "text-zinc-900 dark:text-[#F2F4F7] hover:text-[#C9A52A] cursor-pointer"
                        : "text-zinc-400 dark:text-[#667085]"
                    }`}
                  >
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MODAL CONTENT BODY (SCROLLABLE) ── */}
        {createdProjectResult ? (
          /* ── SUCCESS VIEW ── */
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-5 my-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 stroke-[2]" />
            </div>

            <div className="space-y-1 max-w-md">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                Project Created
              </span>
              <h3 className="text-[20px] font-extrabold text-zinc-900 dark:text-[#F2F4F7]">
                {createdProjectResult.name}
              </h3>
              <p className="text-[12.5px] text-zinc-500 dark:text-[#8B95A5] leading-relaxed">
                Organization project, milestones, document folders, and notifications created.
              </p>
            </div>

            <div className="w-full max-w-md p-4 rounded-[12px] bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] text-left space-y-2 text-[12px]">
              <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                <span>Assignee:</span>
                <span className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{assignedToUser?.name} ({assignedToUser?.role})</span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                <span>Team Members:</span>
                <span className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{selectedMembers.length} assigned</span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                <span>Priority:</span>
                <span className="font-bold text-[#C9A52A]">{priority}</span>
              </div>
              {deadline && (
                <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                  <span>Deadline:</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-[#F2F4F7]">{new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2 w-full max-w-md">
              <button
                onClick={onClose}
                className="flex-1 h-[40px] rounded-[8px] bg-zinc-100 dark:bg-[#272D36] text-zinc-900 dark:text-[#F2F4F7] text-[12.5px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Done
              </button>
              <button
                onClick={() => {
                  onClose();
                  router.push(`/ceo/projects/${createdProjectResult.id}`);
                }}
                className="flex-1 h-[40px] rounded-[8px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Open Project</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ── STEP CONTENT ── */
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs bg-white dark:bg-[#15191F]">
            
            {/* Global Error Banner */}
            {error && (
              <div className="p-3.5 rounded-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12.5px] font-semibold">
                {error}
              </div>
            )}

            {/* ── STEP 1: DETAILS ── */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[14px] font-extrabold text-zinc-900 dark:text-[#F2F4F7]">Project Details</h3>
                  <p className="text-[12px] text-zinc-500 dark:text-[#8B95A5]">Define the project and what needs to be accomplished.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">
                      Project Name <span className="text-rose-500">*</span>
                    </label>
                    {isDuplicateName && (
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-500">Duplicate Name Detected</span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Build ManMadhan AI Platform"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full h-[40px] px-3.5 bg-zinc-50 dark:bg-[#111419] border ${
                      isDuplicateName ? "border-rose-500" : "border-zinc-200 dark:border-[#272D36]"
                    } rounded-[8px] text-[13px] text-zinc-900 dark:text-[#F2F4F7] placeholder-zinc-400 dark:placeholder-[#667085] outline-none focus:border-[#C9A52A]`}
                  />
                  <p className="text-[11px] text-zinc-500 dark:text-[#667085]">Give the project a clear, recognizable name.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">
                    Project Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe what needs to be accomplished and the expected outcome..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] rounded-[8px] text-[13px] text-zinc-900 dark:text-[#F2F4F7] placeholder-zinc-400 dark:placeholder-[#667085] outline-none focus:border-[#C9A52A] resize-none"
                  />
                  <p className="text-[11px] text-zinc-500 dark:text-[#667085]">Describe what needs to be accomplished and the expected outcome.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">Project Type</label>
                    <input
                      type="text"
                      disabled
                      value={projectType}
                      className="w-full h-[38px] px-3 bg-zinc-100 dark:bg-[#111419]/60 border border-zinc-200 dark:border-[#272D36] rounded-[8px] text-[12px] text-zinc-500 dark:text-[#8B95A5]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">Priority Level</label>
                    <select
                      value={priority}
                      onChange={(e: any) => setPriority(e.target.value)}
                      className="w-full h-[38px] px-3 bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] rounded-[8px] text-[12.5px] text-zinc-900 dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: ASSIGNMENT ── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[14px] font-extrabold text-zinc-900 dark:text-[#F2F4F7]">Project Assignment</h3>
                  <p className="text-[12px] text-zinc-500 dark:text-[#8B95A5]">Define ownership and who will execute the work.</p>
                </div>

                {/* Owner */}
                <div className="p-3 rounded-[8px] bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] flex items-center justify-between text-[12px]">
                  <span className="text-zinc-500 dark:text-[#8B95A5]">Project Owner</span>
                  <span className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{currentUser.name || "Authorized Owner"} ({currentUser.role || "CEO"})</span>
                </div>

                {/* Assignee */}
                <div className="space-y-1.5 relative" ref={assigneeDropdownRef}>
                  <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">
                    Project Assignee <span className="text-rose-500">*</span>
                  </label>

                  {assignedToUser ? (
                    <div className="flex items-center justify-between p-2.5 bg-[#C9A52A]/10 border border-[#C9A52A]/30 rounded-[8px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{assignedToUser.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] text-[10px] font-extrabold uppercase">
                          {assignedToUser.role}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAssignedToUser(null)}
                        className="p-1 text-zinc-500 dark:text-[#8B95A5] hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-[#8B95A5]" />
                      <input
                        type="text"
                        placeholder="Type @ or search person..."
                        value={assigneeSearchQuery}
                        onFocus={() => setShowAssigneeDropdown(true)}
                        onChange={(e) => {
                          setAssigneeSearchQuery(e.target.value);
                          setShowAssigneeDropdown(true);
                        }}
                        className="w-full h-[40px] pl-9 pr-3.5 bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] rounded-[8px] text-[12.5px] text-zinc-900 dark:text-[#F2F4F7] placeholder-zinc-400 dark:placeholder-[#667085] outline-none focus:border-[#C9A52A]"
                      />

                      {showAssigneeDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-[#15191F] border border-zinc-200 dark:border-[#272D36] rounded-[10px] shadow-xl z-50 p-1 divide-y divide-zinc-100 dark:divide-[#272D36]/40">
                          {filteredAssignees.length === 0 ? (
                            <div className="p-3 text-center text-zinc-500 dark:text-[#8B95A5] text-[12px]">No members found</div>
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
                                className="w-full p-2.5 flex items-center justify-between text-left hover:bg-zinc-100 dark:hover:bg-[#C9A52A]/10 rounded-[6px] transition-colors cursor-pointer"
                              >
                                <div>
                                  <div className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{u.name}</div>
                                  <div className="text-[11px] text-zinc-500 dark:text-[#8B95A5]">{u.email}</div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#272D36] text-[10px] font-bold uppercase text-zinc-600 dark:text-[#8B95A5]">
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

                {/* Supervising CO-CEO */}
                {assignedToUser && assignedToUser.role.toUpperCase() === "MEMBER" && currentUser.role === "CEO" && (
                  <div className="space-y-1.5 p-3 rounded-[8px] bg-amber-500/10 border border-amber-500/20">
                    <label className="text-[12px] font-bold text-amber-600 dark:text-amber-400">
                      Supervising CO-CEO <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={responsibleCoCeoId}
                      onChange={(e) => setResponsibleCoCeoId(e.target.value)}
                      className="w-full h-[36px] px-3 bg-white dark:bg-[#111419] border border-amber-500/30 rounded-[6px] text-[12px] text-zinc-900 dark:text-[#F2F4F7] outline-none"
                    >
                      <option value="">Select Supervising CO-CEO...</option>
                      {coCeos.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} (CO-CEO)</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Members */}
                <div className="space-y-1.5 relative" ref={memberDropdownRef}>
                  <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">Project Members</label>
                  
                  <div className="flex flex-wrap gap-2 mb-1">
                    {selectedMembers.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-[#272D36] text-zinc-900 dark:text-[#F2F4F7] text-[11.5px] font-semibold border border-zinc-200 dark:border-[#272D36]">
                        <span>@{m.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedMembers((prev) => prev.filter((item) => item.id !== m.id))}
                          className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-[#8B95A5]" />
                    <input
                      type="text"
                      placeholder="Type @ to add member..."
                      value={memberSearchQuery}
                      onFocus={() => setShowMemberDropdown(true)}
                      onChange={(e) => {
                        setMemberSearchQuery(e.target.value);
                        setShowMemberDropdown(true);
                      }}
                      className="w-full h-[38px] pl-9 pr-3.5 bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] rounded-[8px] text-[12px] text-zinc-900 dark:text-[#F2F4F7] placeholder-zinc-400 dark:placeholder-[#667085] outline-none focus:border-[#C9A52A]"
                    />

                    {showMemberDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-[#15191F] border border-zinc-200 dark:border-[#272D36] rounded-[10px] shadow-xl z-50 p-1 divide-y divide-zinc-100 dark:divide-[#272D36]/40">
                        {filteredMembers.length === 0 ? (
                          <div className="p-3 text-center text-zinc-500 dark:text-[#8B95A5] text-[12px]">No eligible members left</div>
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
                              className="w-full p-2.5 flex items-center justify-between text-left hover:bg-zinc-100 dark:hover:bg-[#C9A52A]/10 rounded-[6px] transition-colors cursor-pointer"
                            >
                              <div>
                                <div className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{u.name}</div>
                                <div className="text-[11px] text-zinc-500 dark:text-[#8B95A5]">{u.email}</div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#272D36] text-[10px] font-bold uppercase text-zinc-600 dark:text-[#8B95A5]">
                                {u.role}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: TIMELINE ── */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[14px] font-extrabold text-zinc-900 dark:text-[#F2F4F7]">Project Timeline</h3>
                  <p className="text-[12px] text-zinc-500 dark:text-[#8B95A5]">Set when execution starts and when the project is expected to finish.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">
                      Start Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-[40px] px-3 bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] rounded-[8px] text-[12.5px] text-zinc-900 dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">
                      Deadline <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full h-[40px] px-3 bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] rounded-[8px] text-[12.5px] text-zinc-900 dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">Estimated Hours</label>
                  <input
                    type="number"
                    min="1"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full h-[38px] px-3 bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] rounded-[8px] text-[12.5px] text-zinc-900 dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                  />
                </div>

                {/* Timeline Preview */}
                {timelinePreviewText && (
                  <div className="p-3 rounded-[8px] bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] flex items-center justify-between text-[12px]">
                    <span className="text-zinc-500 dark:text-[#8B95A5]">Duration Preview</span>
                    <span className="font-mono font-bold text-[#C9A52A]">{timelinePreviewText}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: GOALS & DELIVERABLES ── */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[14px] font-extrabold text-zinc-900 dark:text-[#F2F4F7]">Goals & Deliverables</h3>
                  <p className="text-[12px] text-zinc-500 dark:text-[#8B95A5]">Define what success looks like for this project.</p>
                </div>

                {/* Goals */}
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">Project Goals</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add project goal..."
                      value={newGoalInput}
                      onChange={(e) => setNewGoalInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddGoal())}
                      className="flex-1 h-[36px] px-3 bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] rounded-[6px] text-[12px] text-zinc-900 dark:text-[#F2F4F7] placeholder-zinc-400 dark:placeholder-[#667085] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddGoal}
                      className="px-3 h-[36px] rounded-[6px] bg-[#C9A52A] text-[#0B0D10] font-bold text-[11.5px]"
                    >
                      + Add Goal
                    </button>
                  </div>
                  {goals.map((g, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-[6px] bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] text-[12px]">
                      <span className="text-zinc-900 dark:text-[#F2F4F7]">{idx + 1}. {g}</span>
                      <button type="button" onClick={() => handleRemoveGoal(idx)} className="text-zinc-400 dark:text-[#8B95A5] hover:text-rose-600 dark:hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Deliverables */}
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">Deliverables</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add deliverable outcome..."
                      value={newDeliverableInput}
                      onChange={(e) => setNewDeliverableInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDeliverable())}
                      className="flex-1 h-[36px] px-3 bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] rounded-[6px] text-[12px] text-zinc-900 dark:text-[#F2F4F7] placeholder-zinc-400 dark:placeholder-[#667085] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddDeliverable}
                      className="px-3 h-[36px] rounded-[6px] bg-[#C9A52A] text-[#0B0D10] font-bold text-[11.5px]"
                    >
                      + Add Deliverable
                    </button>
                  </div>
                  {deliverables.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-[6px] bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] text-[12px]">
                      <span className="text-zinc-900 dark:text-[#F2F4F7]">• {d}</span>
                      <button type="button" onClick={() => handleRemoveDeliverable(idx)} className="text-zinc-400 dark:text-[#8B95A5] hover:text-rose-600 dark:hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Optional Initial Tasks */}
                <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-[#272D36]">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-zinc-900 dark:text-[#F2F4F7]">Initial Tasks ({initialTasks.length})</label>
                    <button
                      type="button"
                      onClick={() => setShowAddTaskForm(!showAddTaskForm)}
                      className="px-2.5 py-1 rounded-[6px] bg-[#C9A52A]/10 text-[#C9A52A] font-bold text-[11px] border border-[#C9A52A]/20"
                    >
                      {showAddTaskForm ? "Cancel" : "+ Add Task"}
                    </button>
                  </div>

                  {showAddTaskForm && (
                    <div className="p-3 rounded-[8px] bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] space-y-2.5">
                      <input
                        type="text"
                        placeholder="Task Name *"
                        value={taskTitleInput}
                        onChange={(e) => setTaskTitleInput(e.target.value)}
                        className="w-full h-[36px] px-3 bg-white dark:bg-[#15191F] border border-zinc-200 dark:border-[#272D36] rounded-[6px] text-[12px] text-zinc-900 dark:text-[#F2F4F7]"
                      />
                      <textarea
                        rows={2}
                        placeholder="Task Description"
                        value={taskDescInput}
                        onChange={(e) => setTaskDescInput(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-[#15191F] border border-zinc-200 dark:border-[#272D36] rounded-[6px] text-[12px] text-zinc-900 dark:text-[#F2F4F7] resize-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={taskAssigneeInput}
                          onChange={(e) => setTaskAssigneeInput(e.target.value)}
                          className="h-[36px] px-2.5 bg-white dark:bg-[#15191F] border border-zinc-200 dark:border-[#272D36] rounded-[6px] text-[12px] text-zinc-900 dark:text-[#F2F4F7]"
                        >
                          <option value="">Assignee (Default: Project Assignee)</option>
                          {assignedToUser && <option value={assignedToUser.id}>{assignedToUser.name} ({assignedToUser.role})</option>}
                          {selectedMembers.map((m) => (
                            <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                          ))}
                        </select>

                        <input
                          type="date"
                          value={taskDeadlineInput}
                          onChange={(e) => setTaskDeadlineInput(e.target.value)}
                          className="h-[36px] px-2.5 bg-white dark:bg-[#15191F] border border-zinc-200 dark:border-[#272D36] rounded-[6px] text-[12px] text-zinc-900 dark:text-[#F2F4F7]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddInitialTask}
                        className="w-full h-[34px] bg-[#C9A52A] text-[#0B0D10] font-bold text-[11.5px] rounded-[6px]"
                      >
                        Confirm Initial Task
                      </button>
                    </div>
                  )}

                  {initialTasks.map((t) => (
                    <div key={t.id} className="p-2.5 rounded-[6px] bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] flex items-center justify-between text-[12px]">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{t.title}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-[#8B95A5]">{t.description || "No description"}</div>
                      </div>
                      <button type="button" onClick={() => handleRemoveInitialTask(t.id)} className="text-zinc-400 dark:text-[#8B95A5] hover:text-rose-600 dark:hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 5: REVIEW & CREATE ── */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[14px] font-extrabold text-zinc-900 dark:text-[#F2F4F7]">Review Project</h3>
                  <p className="text-[12px] text-zinc-500 dark:text-[#8B95A5]">Review the project details before creating it.</p>
                </div>

                {/* Section 1: Details */}
                <div className="p-3.5 rounded-[10px] bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] space-y-1.5 text-[12px]">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#272D36] pb-1.5">
                    <span className="font-extrabold text-zinc-900 dark:text-[#F2F4F7] uppercase tracking-wider text-[11px]">Project Details</span>
                    <button type="button" onClick={() => handleJumpToStep(1)} className="text-[11.5px] font-bold text-[#C9A52A] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="font-extrabold text-[14px] text-zinc-900 dark:text-[#F2F4F7]">{name}</div>
                  <p className="text-zinc-500 dark:text-[#8B95A5] leading-relaxed">{description}</p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-500 dark:text-[#8B95A5]">
                    <span>Type: <strong className="text-zinc-900 dark:text-[#F2F4F7]">{projectType}</strong></span>
                    <span>Priority: <strong className="text-[#C9A52A]">{priority}</strong></span>
                  </div>
                </div>

                {/* Section 2: Assignment */}
                <div className="p-3.5 rounded-[10px] bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] space-y-1.5 text-[12px]">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#272D36] pb-1.5">
                    <span className="font-extrabold text-zinc-900 dark:text-[#F2F4F7] uppercase tracking-wider text-[11px]">Assignment</span>
                    <button type="button" onClick={() => handleJumpToStep(2)} className="text-[11.5px] font-bold text-[#C9A52A] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                    <span>Owner:</span>
                    <span className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{currentUser.name || "Owner"} ({currentUser.role || "CEO"})</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                    <span>Assignee:</span>
                    <span className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{assignedToUser?.name} ({assignedToUser?.role})</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                    <span>Team Members:</span>
                    <span className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{selectedMembers.length} assigned</span>
                  </div>
                </div>

                {/* Section 3: Timeline */}
                <div className="p-3.5 rounded-[10px] bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] space-y-1.5 text-[12px]">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#272D36] pb-1.5">
                    <span className="font-extrabold text-zinc-900 dark:text-[#F2F4F7] uppercase tracking-wider text-[11px]">Timeline</span>
                    <button type="button" onClick={() => handleJumpToStep(3)} className="text-[11.5px] font-bold text-[#C9A52A] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                    <span>Dates:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-[#F2F4F7]">{startDate} → {deadline}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                    <span>Estimated Hours:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-[#F2F4F7]">{estimatedHours} hrs</span>
                  </div>
                </div>

                {/* Section 4: Goals & Deliverables */}
                <div className="p-3.5 rounded-[10px] bg-zinc-50 dark:bg-[#111419] border border-zinc-200 dark:border-[#272D36] space-y-1.5 text-[12px]">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#272D36] pb-1.5">
                    <span className="font-extrabold text-zinc-900 dark:text-[#F2F4F7] uppercase tracking-wider text-[11px]">Goals & Deliverables</span>
                    <button type="button" onClick={() => handleJumpToStep(4)} className="text-[11.5px] font-bold text-[#C9A52A] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                    <span>Goals:</span>
                    <span className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{goals.length} defined</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                    <span>Deliverables:</span>
                    <span className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{deliverables.length} defined</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 dark:text-[#8B95A5]">
                    <span>Initial Tasks:</span>
                    <span className="font-bold text-zinc-900 dark:text-[#F2F4F7]">{initialTasks.length} tasks</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── MODAL FOOTER ── */}
        {!createdProjectResult && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-[#272D36] flex items-center justify-between bg-zinc-50 dark:bg-[#111419] shrink-0">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 h-[38px] rounded-[8px] bg-white dark:bg-[#272D36] border border-zinc-200 dark:border-transparent text-zinc-700 dark:text-[#F2F4F7] text-[12.5px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 h-[38px] rounded-[8px] bg-zinc-200/60 dark:bg-[#272D36]/60 text-zinc-600 dark:text-[#8B95A5] hover:text-zinc-900 dark:hover:text-[#F2F4F7] text-[12.5px] font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 h-[38px] rounded-[8px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateProject}
                  disabled={submitting}
                  className="px-6 h-[38px] rounded-[8px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
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
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
