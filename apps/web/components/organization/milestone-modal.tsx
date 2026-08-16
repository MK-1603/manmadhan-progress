"use client";

import { useState } from "react";
import { X, Flag, Loader2, AlertCircle } from "lucide-react";
import apiClient from "@/lib/api-client";

interface MilestoneModalProps {
  isOpen: boolean;
  projectId: string;
  projectDeadline?: string;
  milestone?: any;
  onClose: () => void;
  onSaved: () => void;
}

export function MilestoneModal({ isOpen, projectId, projectDeadline, milestone, onClose, onSaved }: MilestoneModalProps) {
  const [name, setName] = useState(milestone?.name || "");
  const [description, setDescription] = useState(milestone?.description || "");
  
  const initialDeadline = milestone?.deadline
    ? new Date(milestone.deadline)
    : projectDeadline ? new Date(projectDeadline) : new Date(Date.now() + 14 * 24 * 3600 * 1000);

  const [deadlineDate, setDeadlineDate] = useState(initialDeadline.toISOString().split("T")[0]);
  const [deadlineTime, setDeadlineTime] = useState(initialDeadline.toTimeString().slice(0, 5));
  const [status, setStatus] = useState(milestone?.status || "Pending");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Milestone name is required");
      return;
    }

    const fullDeadlineStr = `${deadlineDate}T${deadlineTime}:00`;
    const msDeadline = new Date(fullDeadlineStr);

    if (projectDeadline && msDeadline.getTime() > new Date(projectDeadline).getTime()) {
      setError("Milestone target date/time cannot exceed the project executive deadline");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      let res;
      if (milestone?.id) {
        // PATCH existing milestone
        res = await apiClient.patch(`/org/projects/${projectId}/milestones/${milestone.id}`, {
          workspaceId,
          name: name.trim(),
          description: description.trim() || null,
          deadline: msDeadline.toISOString(),
          status,
        });
      } else {
        // POST new milestone
        res = await apiClient.post(`/org/projects/${projectId}/milestones`, {
          workspaceId,
          name: name.trim(),
          description: description.trim() || null,
          deadline: msDeadline.toISOString(),
          status,
        });
      }

      if (res.data.success) {
        onSaved();
        onClose();
      } else {
        setError(res.data.error || "Failed to save milestone");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to save milestone");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Flag className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {milestone ? "Edit Milestone" : "Add New Milestone"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-foreground block mb-1">Milestone Name *</label>
            <input
              type="text"
              placeholder="e.g. System Architecture & TRD Sign-off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-foreground block mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Milestone scope and key deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:border-primary outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">Target Date</label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">Target Time</label>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-foreground block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:border-primary outline-none"
            >
              {["Pending", "In Progress", "Completed", "Blocked"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-border">
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
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : milestone ? "Update Milestone" : "Add Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
