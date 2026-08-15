"use client";

import { useState, useEffect } from "react";
import { X, Search, CheckSquare, Folder, Briefcase, Target, Clock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StartFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: any[];
  projects: any[];
  onStartSession: (sessionData: {
    sourceType: "TASK" | "PROJECT" | "CEO_ACTIVITY";
    taskId?: string;
    projectId?: string;
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    objective?: string;
    estimatedDuration?: number;
  }) => Promise<void>;
}

const CATEGORIES = [
  "Strategy",
  "Planning",
  "Product",
  "Technical",
  "Architecture",
  "Review",
  "Approval",
  "Documentation",
  "Research",
  "Organization",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export function StartFocusModal({ isOpen, onClose, tasks, projects, onStartSession }: StartFocusModalProps) {
  const [activeTab, setActiveTab] = useState<"TASK" | "PROJECT" | "CEO_ACTIVITY">("TASK");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Executive Work form state
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customCategory, setCustomCategory] = useState("Strategy");
  const [customPriority, setCustomPriority] = useState("High");
  const [customProjectId, setCustomProjectId] = useState("");
  const [customObjective, setCustomObjective] = useState("");
  const [customDuration, setCustomDuration] = useState("60");

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTasks = tasks.filter(
    (t) =>
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = projects.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartTask = async (task: any) => {
    setLoading(true);
    setError("");
    try {
      await onStartSession({
        sourceType: "TASK",
        taskId: task.id,
        projectId: task.projectId,
        title: task.title,
        priority: task.priority || "High",
        category: "Technical",
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start focus session");
    } finally {
      setLoading(false);
    }
  };

  const handleStartProject = async (project: any) => {
    setLoading(true);
    setError("");
    try {
      await onStartSession({
        sourceType: "PROJECT",
        projectId: project.id,
        title: `Focus: ${project.name}`,
        priority: project.priority || "High",
        category: "Product",
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start focus session");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) {
      setError("Please enter a focus title");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onStartSession({
        sourceType: "CEO_ACTIVITY",
        title: customTitle.trim(),
        description: customDescription.trim() || undefined,
        category: customCategory,
        priority: customPriority,
        projectId: customProjectId || undefined,
        objective: customObjective.trim() || undefined,
        estimatedDuration: parseInt(customDuration, 10) || 60,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start custom focus session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[4px] p-0 sm:p-4 transition-opacity duration-200">
        
        {/* Backdrop Tap to Close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Container: Centered Modal on Desktop, iOS Drag-to-Dismiss Bottom Sheet on Mobile */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.velocity.y > 400) {
              onClose();
            }
          }}
          className="relative z-10 w-full max-w-[600px] max-h-[calc(100dvh-24px)] sm:max-h-[min(720px,calc(100dvh-48px))] bg-[#FFFFFF] dark:bg-[#15191F] border-t sm:border border-[#E4E7EC] dark:border-[#272D36] rounded-t-[20px] sm:rounded-[16px] shadow-2xl flex flex-col overflow-hidden my-0 sm:my-auto pb-[max(12px,env(safe-area-inset-bottom))] sm:pb-0 touch-pan-y"
        >
          {/* iOS Drag Handle */}
          <div className="w-10 h-1 rounded-full bg-[#D1D5DB] dark:bg-[#374151] mx-auto mt-2.5 mb-1 sm:hidden shrink-0 cursor-grab active:cursor-grabbing" />

          {/* Modal Header */}
          <div className="flex items-start justify-between px-5 sm:px-6 pt-3 sm:pt-4 pb-2.5 border-b border-[#E4E7EC] dark:border-[#272D36] shrink-0">
            <div className="space-y-0.5">
              <h2 className="text-[17px] sm:text-[19px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight flex items-center gap-2">
                <Target className="w-4.5 h-4.5 text-[#C9A52A] dark:text-[#D4B12F]" />
                <span>Start Focus Session</span>
              </h2>
              <p className="text-[12.5px] sm:text-[13px] text-[#667085] dark:text-[#8B95A5]">
                Select what you want to focus on.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors cursor-pointer shrink-0 -mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Global Error Banner */}
          {error && (
            <div className="mx-5 sm:mx-6 mt-2.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400 text-[12px] flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Segmented Selector Tabs (Task | Project | Executive Work) */}
          <div className="grid grid-cols-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] p-1.5 gap-1 shrink-0 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setActiveTab("TASK")}
              className={`py-2 px-2 sm:px-3 text-[12px] sm:text-[12.5px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "TASK"
                  ? "bg-[#FFFFFF] dark:bg-[#15191F] text-[#17202A] dark:text-[#F2F4F7] shadow-2xs border border-[#E4E7EC] dark:border-[#272D36]"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Task</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PROJECT")}
              className={`py-2 px-2 sm:px-3 text-[12px] sm:text-[12.5px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "PROJECT"
                  ? "bg-[#FFFFFF] dark:bg-[#15191F] text-[#17202A] dark:text-[#F2F4F7] shadow-2xs border border-[#E4E7EC] dark:border-[#272D36]"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              <Folder className="w-3.5 h-3.5 shrink-0" />
              <span>Project</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("CEO_ACTIVITY")}
              className={`py-2 px-2 sm:px-3 text-[12px] sm:text-[12.5px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "CEO_ACTIVITY"
                  ? "bg-[#FFFFFF] dark:bg-[#15191F] text-[#17202A] dark:text-[#F2F4F7] shadow-2xs border border-[#E4E7EC] dark:border-[#272D36]"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span>Executive Work</span>
            </button>
          </div>

          {/* Form & Search Content Region (Tight 16px Top Spacing) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {activeTab === "TASK" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#667085] dark:text-[#8B95A5]" />
                  <input
                    type="text"
                    placeholder="Search organization tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 h-[44px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-[13px] text-[#667085] dark:text-[#8B95A5]">
                      No active organization tasks found.
                    </div>
                  ) : (
                    filteredTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 bg-[#F8F9FB] dark:bg-[#111419] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                t.priority === "Critical"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                  : t.priority === "High"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                              }`}
                            >
                              {t.priority || "Medium"}
                            </span>
                            <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] font-medium truncate">
                              {t.status}
                            </span>
                          </div>
                          <h4 className="text-[13.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate">{t.title}</h4>
                          {t.projectName && (
                            <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] mt-0.5 truncate flex items-center gap-1">
                              <Folder className="w-3 h-3" /> {t.projectName}
                            </p>
                          )}
                        </div>
                        <button
                          disabled={loading}
                          onClick={() => handleStartTask(t)}
                          className="px-3.5 h-[36px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-semibold rounded-[8px] hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0 cursor-pointer"
                        >
                          Start Focus
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "PROJECT" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#667085] dark:text-[#8B95A5]" />
                  <input
                    type="text"
                    placeholder="Search organization projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 h-[44px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  {filteredProjects.length === 0 ? (
                    <div className="text-center py-8 text-[13px] text-[#667085] dark:text-[#8B95A5]">
                      No active organization projects found.
                    </div>
                  ) : (
                    filteredProjects.map((p) => (
                      <div
                        key={p.id}
                        className="p-3.5 bg-[#F8F9FB] dark:bg-[#111419] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate">{p.name}</h4>
                          {p.description && (
                            <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] line-clamp-1 mt-0.5">
                              {p.description}
                            </p>
                          )}
                        </div>
                        <button
                          disabled={loading}
                          onClick={() => handleStartProject(p)}
                          className="px-3.5 h-[36px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-semibold rounded-[8px] hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0 cursor-pointer"
                        >
                          Start Focus
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "CEO_ACTIVITY" && (
              <form id="ceo-custom-form" onSubmit={handleStartCustom} className="space-y-3">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                    Focus Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Finalize Organization Roadmap V2"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3.5 h-[44px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                      Category
                    </label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3.5 h-[44px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                      Priority
                    </label>
                    <select
                      value={customPriority}
                      onChange={(e) => setCustomPriority(e.target.value)}
                      className="w-full px-3.5 h-[44px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                      Optional Related Project
                    </label>
                    <select
                      value={customProjectId}
                      onChange={(e) => setCustomProjectId(e.target.value)}
                      className="w-full px-3.5 h-[44px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors"
                    >
                      <option value="">None (Standalone Executive Work)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#667085] dark:text-[#8B95A5]" /> Estimated Duration (Mins)
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="480"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className="w-full px-3.5 h-[44px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                    Objective & Key Deliverable
                  </label>
                  <textarea
                    rows={2}
                    placeholder="What is the primary objective of this deep work session?"
                    value={customObjective}
                    onChange={(e) => setCustomObjective(e.target.value)}
                    className="w-full p-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors resize-none"
                  />
                </div>
              </form>
            )}
          </div>

          {/* Modal Footer (Fixed at Bottom) */}
          <div className="pt-3 pb-2 px-5 sm:px-6 flex items-center justify-end gap-2.5 border-t border-[#E4E7EC] dark:border-[#272D36] shrink-0 bg-[#FFFFFF] dark:bg-[#15191F]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial h-[44px] px-4 rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {activeTab === "CEO_ACTIVITY" && (
              <button
                type="submit"
                form="ceo-custom-form"
                disabled={loading || !customTitle.trim()}
                className="flex-1 sm:flex-initial h-[44px] px-5 rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
              >
                {loading ? "Starting..." : "Start Focus"}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
