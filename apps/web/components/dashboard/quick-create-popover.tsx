"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, X, ArrowLeft, Search, Briefcase, CheckSquare, Users, Calendar, FileText, Bell, Building2, UserCircle, ArrowRight, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../auth/auth-context";
import apiClient from "@/lib/api-client";

type CreationStep = "COMMAND_CENTER" | "CREATE_TASK" | "CREATE_PROJECT" | "CREATE_TEAM" | "CREATE_EVENT" | "CREATE_NOTE" | "CREATE_REMINDER";

export function QuickCreatePopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<CreationStep>("COMMAND_CENTER");
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<any[]>([]);

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectPriority, setProjectPriority] = useState<"low" | "medium" | "high">("medium");
  const [projectDeadline, setProjectDeadline] = useState("");

  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const isPersonal = pathname?.startsWith("/personal");
  const defaultRoleFromPath = pathname?.startsWith("/co-ceo") ? "CO-CEO" : pathname?.startsWith("/member") ? "MEMBER" : isPersonal ? "PERSONAL" : "CEO";
  const userRole = (user?.role || defaultRoleFromPath).toUpperCase();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch org members if in org mode
  useEffect(() => {
    if (isOpen && !isPersonal && userRole !== "MEMBER") {
      apiClient.get("/organization/members")
        .then(res => {
          if (res.data.success) setMembers(res.data.data || []);
        })
        .catch(() => {});
    }
  }, [isOpen, isPersonal, userRole]);

  // Reset states on open/close
  const handleOpenClose = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => {
        setCurrentStep("COMMAND_CENTER");
        setSearchQuery("");
        setSubmitError("");
        setSubmitSuccess(false);
        setIsSubmitting(false);
        setTaskTitle("");
        setTaskDesc("");
        setProjectName("");
        setProjectDesc("");
      }, 200);
    }
  };

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        if (currentStep !== "COMMAND_CENTER") {
          setCurrentStep("COMMAND_CENTER");
        } else {
          handleOpenClose(false);
        }
      }

      if (currentStep === "COMMAND_CENTER" && !searchQuery) {
        if (e.key === "1") setCurrentStep("CREATE_TASK");
        else if (e.key === "2") setCurrentStep("CREATE_PROJECT");
        else if (e.key === "3" && !isPersonal) setCurrentStep("CREATE_TEAM");
        else if (e.key === "4") setCurrentStep("CREATE_EVENT");
        else if (e.key === "5") setCurrentStep("CREATE_NOTE");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, searchQuery, isPersonal]);

  // Command actions data
  const orgActions = [
    {
      id: "CREATE_TASK",
      title: "Task",
      description: "Add a task to your workflow",
      shortcut: "1",
      icon: CheckSquare,
      color: "text-emerald-500",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "CREATE_PROJECT",
      title: "Project",
      description: "Start a new execution project",
      shortcut: "2",
      icon: Briefcase,
      color: "text-gold",
      badge: "bg-gold/15 text-gold border-gold/20",
    },
    {
      id: "CREATE_TEAM",
      title: "Team",
      description: "Create or manage an execution team",
      shortcut: "3",
      icon: Users,
      color: "text-blue-500",
      badge: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      id: "CREATE_EVENT",
      title: "Calendar Event",
      description: "Schedule something on the calendar",
      shortcut: "4",
      icon: Calendar,
      color: "text-purple-500",
      badge: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    },
    {
      id: "CREATE_NOTE",
      title: "Note",
      description: "Capture a new note or documentation",
      shortcut: "5",
      icon: FileText,
      color: "text-cyan-400",
      badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    },
    {
      id: "CREATE_REMINDER",
      title: "Reminder",
      description: "Set a workspace notification reminder",
      shortcut: "6",
      icon: Bell,
      color: "text-amber-500",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
  ];

  const personalActions = [
    {
      id: "CREATE_TASK",
      title: "Personal Task",
      description: "Add a personal task to your checklist",
      shortcut: "1",
      icon: CheckSquare,
      color: "text-emerald-500",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "CREATE_PROJECT",
      title: "Personal Project",
      description: "Start a personal project",
      shortcut: "2",
      icon: Briefcase,
      color: "text-gold",
      badge: "bg-gold/15 text-gold border-gold/20",
    },
    {
      id: "CREATE_NOTE",
      title: "Note",
      description: "Write a personal note",
      shortcut: "3",
      icon: FileText,
      color: "text-cyan-400",
      badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    },
    {
      id: "CREATE_REMINDER",
      title: "Reminder",
      description: "Set a quick reminder",
      shortcut: "4",
      icon: Bell,
      color: "text-amber-500",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
    {
      id: "CREATE_EVENT",
      title: "Calendar Event",
      description: "Schedule a personal event",
      shortcut: "5",
      icon: Calendar,
      color: "text-purple-500",
      badge: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    },
  ];

  const actions = isPersonal ? personalActions : orgActions;

  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return actions;
    return actions.filter(
      a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           a.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, actions]);

  // Form submit handlers with REAL API endpoints
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const res = await apiClient.post("/tasks", {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        priority: taskPriority,
        dueDate: taskDueDate || undefined,
        assignedTo: taskAssignee || undefined,
        workspaceType: isPersonal ? "PERSONAL" : "ORGANIZATION",
      });

      if (res.data.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          handleOpenClose(false);
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const res = await apiClient.post("/projects", {
        name: projectName.trim(),
        description: projectDesc.trim(),
        priority: projectPriority,
        deadline: projectDeadline || undefined,
        workspaceType: isPersonal ? "PERSONAL" : "ORGANIZATION",
      });

      if (res.data.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          handleOpenClose(false);
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Primary Header + Button */}
      <button 
        onClick={() => handleOpenClose(!isOpen)}
        aria-label="Quick Create"
        className="w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center shadow-xs cursor-pointer shrink-0 transition-transform active:scale-95 focus:outline-none select-none"
        title="Create New"
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
          className="flex items-center justify-center"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </motion.div>
      </button>

      {/* Unified Creation Modal System Portal */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => handleOpenClose(false)}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              />

              {/* Shared Modal Dialog Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full max-w-[720px] max-h-[85vh] rounded-[18px] bg-card border border-border/50 shadow-2xl overflow-hidden flex flex-col z-10"
              >

                {/* VIEW 1: COMMAND CENTER */}
                {currentStep === "COMMAND_CENTER" && (
                  <div className="flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-border/60 flex flex-col gap-4 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-xl font-extrabold text-foreground tracking-tight">Create New</h3>
                          <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold text-[10px] font-extrabold border border-gold/30">
                            Command Center
                          </span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleOpenClose(false)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4 stroke-[2]" />
                        </button>
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground stroke-[2]" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search creation options..."
                          className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border/70 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all"
                          autoFocus
                        />
                      </div>

                      {/* Workspace Context Badge */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        {isPersonal ? (
                          <UserCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <Building2 className="w-4 h-4 text-gold shrink-0" />
                        )}
                        <span>{isPersonal ? "Personal Workspace" : `ManMadhan Progress · ${userRole}`}</span>
                      </div>
                    </div>

                    {/* 3-Column Grid Actions Body */}
                    <div className="p-6 overflow-y-auto max-h-[55vh] scrollbar-thin scrollbar-thumb-muted-foreground/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        {filteredActions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <motion.button
                              key={action.id}
                              whileHover={{ y: -2, scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setCurrentStep(action.id as CreationStep)}
                              className="relative h-[115px] p-4 rounded-[12px] border border-border/60 bg-muted/20 hover:bg-accent/60 transition-all flex flex-col justify-between text-left cursor-pointer group hover:border-gold/30 hover:shadow-md"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className={`w-9 h-9 rounded-[9px] border flex items-center justify-center ${action.badge}`}>
                                  <Icon className="w-5 h-5 stroke-[2]" />
                                </div>
                                <span className="text-[11px] font-bold text-muted-foreground/70 bg-background/80 px-2 py-0.5 rounded-md border border-border/40">
                                  {action.shortcut}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-sm font-bold text-foreground group-hover:text-gold transition-colors truncate">
                                  {action.title}
                                </h4>
                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                  {action.description}
                                </p>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-border/60 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <div className="flex items-center gap-3">
                        <span><strong className="text-foreground">1-5</strong> Quick select</span>
                        <span><strong className="text-foreground">Esc</strong> Close</span>
                      </div>
                      <span>Press any action to open details</span>
                    </div>
                  </div>
                )}

                {/* VIEW 2: CREATE TASK FORM */}
                {currentStep === "CREATE_TASK" && (
                  <div className="flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCurrentStep("COMMAND_CENTER")}
                          className="w-8 h-8 rounded-xl bg-background border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                          title="Back to command center"
                        >
                          <ArrowLeft className="w-4 h-4 stroke-[2]" />
                        </button>
                        <div>
                          <h3 className="text-lg font-extrabold text-foreground leading-tight">Create Task</h3>
                          <p className="text-xs text-muted-foreground">Add a new task to your execution workflow</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleOpenClose(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>

                    {/* Task Form Body */}
                    <form onSubmit={handleTaskSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
                      {submitError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{submitError}</span>
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-foreground">Task Title *</label>
                        <input
                          type="text"
                          required
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder="e.g. Complete quarterly financial review"
                          className="w-full h-11 px-3.5 rounded-xl bg-background border border-border/70 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
                          autoFocus
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-foreground">Description</label>
                        <textarea
                          rows={3}
                          value={taskDesc}
                          onChange={(e) => setTaskDesc(e.target.value)}
                          placeholder="Add detail notes or task requirements..."
                          className="w-full p-3 rounded-xl bg-background border border-border/70 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-foreground">Priority</label>
                          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60">
                            {(["low", "medium", "high", "urgent"] as const).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setTaskPriority(p)}
                                className={`h-8 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                                  taskPriority === p
                                    ? p === "urgent" ? "bg-rose-500 text-white shadow-xs"
                                      : p === "high" ? "bg-amber-500 text-white shadow-xs"
                                      : p === "medium" ? "bg-gold text-white shadow-xs"
                                      : "bg-emerald-500 text-white shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-foreground">Due Date</label>
                          <input
                            type="date"
                            value={taskDueDate}
                            onChange={(e) => setTaskDueDate(e.target.value)}
                            className="w-full h-11 px-3.5 rounded-xl bg-background border border-border/70 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
                          />
                        </div>
                      </div>

                      {!isPersonal && members.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-foreground">Assignee</label>
                          <select
                            value={taskAssignee}
                            onChange={(e) => setTaskAssignee(e.target.value)}
                            className="w-full h-11 px-3 rounded-xl bg-background border border-border/70 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
                          >
                            <option value="">Select team member...</option>
                            {members.map(m => (
                              <option key={m.id} value={m.userId || m.id}>
                                {m.name || m.email} ({m.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => setCurrentStep("COMMAND_CENTER")}
                          className="h-10 px-4 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!taskTitle.trim() || isSubmitting}
                          className="h-10 px-5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          {submitSuccess ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-400" />
                              <span>Created Task!</span>
                            </>
                          ) : isSubmitting ? (
                            <span>Creating...</span>
                          ) : (
                            <span>Create Task</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* VIEW 3: CREATE PROJECT FORM */}
                {currentStep === "CREATE_PROJECT" && (
                  <div className="flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCurrentStep("COMMAND_CENTER")}
                          className="w-8 h-8 rounded-xl bg-background border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                          title="Back to command center"
                        >
                          <ArrowLeft className="w-4 h-4 stroke-[2]" />
                        </button>
                        <div>
                          <h3 className="text-lg font-extrabold text-foreground leading-tight">Create Project</h3>
                          <p className="text-xs text-muted-foreground">Start a new execution project</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleOpenClose(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>

                    {/* Project Form Body */}
                    <form onSubmit={handleProjectSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
                      {submitError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{submitError}</span>
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-foreground">Project Name *</label>
                        <input
                          type="text"
                          required
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="e.g. Q3 Product Roadmap Launch"
                          className="w-full h-11 px-3.5 rounded-xl bg-background border border-border/70 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
                          autoFocus
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-foreground">Description</label>
                        <textarea
                          rows={3}
                          value={projectDesc}
                          onChange={(e) => setProjectDesc(e.target.value)}
                          placeholder="Project scope, objectives, and deliverables..."
                          className="w-full p-3 rounded-xl bg-background border border-border/70 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-foreground">Priority</label>
                          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60">
                            {(["low", "medium", "high"] as const).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setProjectPriority(p)}
                                className={`h-8 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                                  projectPriority === p
                                    ? p === "high" ? "bg-amber-500 text-white shadow-xs"
                                      : p === "medium" ? "bg-gold text-white shadow-xs"
                                      : "bg-emerald-500 text-white shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-foreground">Target Deadline</label>
                          <input
                            type="date"
                            value={projectDeadline}
                            onChange={(e) => setProjectDeadline(e.target.value)}
                            className="w-full h-11 px-3.5 rounded-xl bg-background border border-border/70 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
                          />
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => setCurrentStep("COMMAND_CENTER")}
                          className="h-10 px-4 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!projectName.trim() || isSubmitting}
                          className="h-10 px-5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          {submitSuccess ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-400" />
                              <span>Created Project!</span>
                            </>
                          ) : isSubmitting ? (
                            <span>Creating...</span>
                          ) : (
                            <span>Create Project</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* OTHER STEPS (TEAM, EVENT, NOTE, REMINDER) */}
                {["CREATE_TEAM", "CREATE_EVENT", "CREATE_NOTE", "CREATE_REMINDER"].includes(currentStep) && (
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="p-6 pb-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCurrentStep("COMMAND_CENTER")}
                          className="w-8 h-8 rounded-xl bg-background border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4 stroke-[2]" />
                        </button>
                        <div>
                          <h3 className="text-lg font-extrabold text-foreground leading-tight">
                            {currentStep === "CREATE_TEAM" ? "Create Team" : currentStep === "CREATE_EVENT" ? "Schedule Event" : currentStep === "CREATE_NOTE" ? "Create Note" : "Set Reminder"}
                          </h3>
                          <p className="text-xs text-muted-foreground">Configure creation parameters</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleOpenClose(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>

                    <div className="p-6 flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-foreground">Title *</label>
                        <input
                          type="text"
                          required
                          value={eventTitle}
                          onChange={(e) => setEventTitle(e.target.value)}
                          placeholder="Enter title..."
                          className="w-full h-11 px-3.5 rounded-xl bg-background border border-border/70 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
                          autoFocus
                        />
                      </div>

                      <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => setCurrentStep("COMMAND_CENTER")}
                          className="h-10 px-4 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSubmitSuccess(true);
                            setTimeout(() => handleOpenClose(false), 800);
                          }}
                          className="h-10 px-5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          {submitSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : null}
                          <span>Submit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
