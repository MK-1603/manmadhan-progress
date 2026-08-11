"use client";

import { useState } from "react";
import { X, FolderKanban, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import apiClient from "@/lib/api-client";

interface EditProjectModalProps {
  isOpen: boolean;
  project: any;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditProjectModal({ isOpen, project, onClose, onUpdated }: EditProjectModalProps) {
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [objective, setObjective] = useState(project?.objective || "");
  
  // Format Date & Time strings
  const initialStart = project?.startDate ? new Date(project.startDate) : new Date();
  const initialEnd = project?.deadline ? new Date(project.deadline) : new Date(Date.now() + 30 * 24 * 3600 * 1000);

  const [startDate, setStartDate] = useState(initialStart.toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState(initialStart.toTimeString().slice(0, 5));
  const [deadlineDate, setDeadlineDate] = useState(initialEnd.toISOString().split("T")[0]);
  const [deadlineTime, setDeadlineTime] = useState(initialEnd.toTimeString().slice(0, 5));

  const [priority, setPriority] = useState(project?.priority || "High");
  const [status, setStatus] = useState(project?.status || "REQUIREMENTS_IN_PROGRESS");
  const [health, setHealth] = useState(project?.health || "Healthy");
  const [githubUrl, setGithubUrl] = useState(project?.githubUrl || "");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const fullStartStr = `${startDate}T${startTime}:00`;
    const fullEndStr = `${deadlineDate}T${deadlineTime}:00`;

    const startDateTime = new Date(fullStartStr);
    const endDateTime = new Date(fullEndStr);

    if (endDateTime.getTime() <= startDateTime.getTime()) {
      setError("Project Start Date & Time must be strictly earlier than Deadline Date & Time");
      return;
    }

    setLoading(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.patch(`/org/projects/${project.id}`, {
        workspaceId,
        name: name.trim(),
        description: description.trim() || null,
        objective: objective.trim() || null,
        startDate: startDateTime.toISOString(),
        deadline: endDateTime.toISOString(),
        priority,
        status,
        health,
        githubUrl: githubUrl.trim() || null,
        reason: reason.trim() || null,
      });

      if (res.data.success) {
        onUpdated();
        onClose();
      } else {
        setError(res.data.error || "Failed to update project");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to save project updates");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Edit Project Mandate Details
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Update project metadata, start date & time, deadline, priority, and status
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Details */}
          <div className="space-y-3 p-3.5 bg-muted/10 border border-border rounded-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Basic Information</h3>
            <div>
              <label className="text-[10px] font-bold text-foreground uppercase block mb-1">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-foreground uppercase block mb-1">Objective</label>
              <input
                type="text"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-foreground uppercase block mb-1">Description / Scope</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:border-primary outline-none resize-none"
              />
            </div>
          </div>

          {/* Schedule & Timing (Date + Time) */}
          <div className="p-3.5 border border-primary/30 bg-primary/5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Project Schedule & Timings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase block">Start Date & Time</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:border-primary outline-none"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-28 px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase block">Deadline Date & Time</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:border-primary outline-none"
                  />
                  <input
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="w-28 px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Priority & Status Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-muted/10 border border-border rounded-xl">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:border-primary outline-none"
              >
                {["Low", "Medium", "High", "Urgent"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:border-primary outline-none"
              >
                {["REQUIREMENTS_IN_PROGRESS", "READY_FOR_EXECUTION", "Active", "In Progress", "Planning", "Completed", "On Hold"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Health</label>
              <select
                value={health}
                onChange={(e) => setHealth(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:border-primary outline-none"
              >
                {["Healthy", "At Risk", "Blocked", "Critical"].map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Modification Reason */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
              Reason for Changes (Logged to Timeline)
            </label>
            <input
              type="text"
              placeholder="e.g. Updated project scope and adjusted start time per executive review"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:border-primary outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-border text-xs font-semibold text-foreground rounded-xl hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
