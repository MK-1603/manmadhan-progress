"use client";

import { useState } from "react";
import { X, Search, CheckSquare, Folder, Sparkles, Target, Clock, AlertCircle } from "lucide-react";

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

  // CEO Custom Activity form state
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customCategory, setCustomCategory] = useState("Strategy");
  const [customPriority, setCustomPriority] = useState("High");
  const [customProjectId, setCustomProjectId] = useState("");
  const [customObjective, setCustomObjective] = useState("");
  const [customDuration, setCustomDuration] = useState("60");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-[640px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Start Focus Session
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select an organization task, project, or define a custom executive focus activity.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Focus Source Tabs */}
        <div className="flex border-b border-border bg-muted/10 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("TASK")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === "TASK"
                ? "border-primary text-primary bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckSquare className="w-4 h-4" /> Organization Task
          </button>
          <button
            onClick={() => setActiveTab("PROJECT")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === "PROJECT"
                ? "border-primary text-primary bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Folder className="w-4 h-4" /> Organization Project
          </button>
          <button
            onClick={() => setActiveTab("CEO_ACTIVITY")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === "CEO_ACTIVITY"
                ? "border-primary text-primary bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-4 h-4" /> CEO Focus Activity
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {activeTab === "TASK" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search organization tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No active organization tasks found matching your search.
                  </div>
                ) : (
                  filteredTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 bg-background hover:bg-muted/30 border border-border rounded-xl flex items-center justify-between gap-3 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                              t.priority === "Critical"
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                : t.priority === "High"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {t.priority || "Medium"}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium truncate">
                            {t.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground truncate">{t.title}</h4>
                        {t.projectName && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            📁 {t.projectName}
                          </p>
                        )}
                      </div>
                      <button
                        disabled={loading}
                        onClick={() => handleStartTask(t)}
                        className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
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
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search organization projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No organization projects found.
                  </div>
                ) : (
                  filteredProjects.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 bg-background hover:bg-muted/30 border border-border rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-foreground truncate">{p.name}</h4>
                        {p.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {p.description}
                          </p>
                        )}
                      </div>
                      <button
                        disabled={loading}
                        onClick={() => handleStartProject(p)}
                        className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
                      >
                        Focus on Project
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "CEO_ACTIVITY" && (
            <form onSubmit={handleStartCustom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Focus Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finalize Organization Roadmap V2"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Category
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary transition-colors"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Priority
                  </label>
                  <select
                    value={customPriority}
                    onChange={(e) => setCustomPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary transition-colors"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Optional Related Project
                  </label>
                  <select
                    value={customProjectId}
                    onChange={(e) => setCustomProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary transition-colors"
                  >
                    <option value="">None (Standalone CEO Work)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" /> Estimated Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Objective & Key Deliverable
                </label>
                <textarea
                  rows={2}
                  placeholder="What is the primary objective of this deep work session?"
                  value={customObjective}
                  onChange={(e) => setCustomObjective(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-border text-xs font-semibold text-foreground rounded-xl hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !customTitle.trim()}
                  className="px-5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Start Executive Focus
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
