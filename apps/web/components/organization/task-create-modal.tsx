"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import apiClient from "@/lib/api-client";
import { GlobalSheet } from "@/components/ui/global-sheet";

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  role: "CEO" | "CO-CEO";
  projectId?: string;
  milestoneId?: string;
}

export function TaskCreateModal({ isOpen, onClose, onCreated, role, projectId, milestoneId }: TaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [deadline, setDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [estimatedMinutes, setEstimatedMinutes] = useState("60");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const workspaceId = localStorage.getItem("workspaceId");
    if (!workspaceId) return;
    Promise.all([
      apiClient.get(`/org/projects?workspaceId=${workspaceId}`),
      apiClient.get(`/organization/members?workspaceId=${workspaceId}`),
    ]).then(([pRes, mRes]) => {
      if (pRes.data.success) setProjects(pRes.data.data);
      if (mRes.data.success) setMembers(mRes.data.data);
    }).catch(console.error);
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Task title is required"); return; }
    setLoading(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post("/org/tasks", {
        workspaceId,
        title: title.trim(),
        description: description || null,
        priority,
        deadline: deadline || null,
        assigneeId: assigneeId || null,
        projectId: selectedProjectId || projectId || null,
        milestoneId: milestoneId || null,
        estimatedMinutes: Number(estimatedMinutes),
      });
      if (res.data.success) {
        onCreated();
        onClose();
        setTitle(""); setDescription(""); setPriority("Medium"); setDeadline(""); setAssigneeId(""); setEstimatedMinutes("60");
      } else {
        setError(res.data.error || "Failed to create task");
      }
    } catch (e: any) {
      setError(e.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const footer = (
    <div className="flex items-center justify-between w-full">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !title.trim()}
        className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Create Task
      </button>
    </div>
  );

  return (
    <GlobalSheet
      open={isOpen}
      onClose={onClose}
      title="Create Task"
      subtitle="ORGANIZATION MANDATE"
      footerActions={footer}
      desktopMode="modal"
      desktopMaxWidth="max-w-lg"
    >
      <div className="space-y-4 text-xs select-text">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Task Title *</label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Enter task title..."
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional task description..."
            rows={2}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30">
              {["Low", "Medium", "High", "Urgent"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
        </div>

        {!projectId && projects.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Project (optional)</label>
            <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {members.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Assign to</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30">
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.displayName || m.name} ({m.role})</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Estimated time (minutes)</label>
          <input type="number" value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} min="15" step="15" className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
      </div>
    </GlobalSheet>
  );
}
