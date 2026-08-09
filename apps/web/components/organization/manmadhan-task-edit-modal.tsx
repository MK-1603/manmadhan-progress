"use client";

import { useEffect, useState } from "react";
import { X, Calendar as CalIcon, Flag, Edit, Check } from "lucide-react";
import apiClient from "@/lib/api-client";
import { Project } from "./manmadhan-task-create-modal";

interface ManMadhanTaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  workspaceId: string;
  task: any;
  onSave: (task: any) => void;
}

export function ManMadhanTaskEditModal({ isOpen, onClose, projects, workspaceId, task, onSave }: ManMadhanTaskEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [deadline, setDeadline] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState(""); 
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority || "Medium");
      setDeadline(task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : "");
      setProjectId(task.projectId || "");
      setAssigneeId(task.assigneeId || "");
      setError(null);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        deadline: deadline || null,
        projectId: projectId || null,
        assigneeId: assigneeId || null,
        workspaceId
      };

      const res = await apiClient.patch(`/manmadhan/tasks/${task.id}`, payload);
      onSave(res.data.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <header className="flex items-center justify-between px-6 py-4 border-b border-muted">
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Edit className="w-5 h-5 text-gold" /> Edit Task
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title *</label>
            <input 
              autoFocus
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all" 
              placeholder="e.g. Draft Q3 Marketing Plan"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all min-h-[80px]" 
              placeholder="Add details about this task..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalIcon className="w-3.5 h-3.5" /> Deadline
              </label>
              <input 
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</label>
              <select 
                value={projectId} 
                onChange={e => setProjectId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 appearance-none"
              >
                <option value="">No Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
            <div className="flex gap-2">
              {["Low", "Medium", "High", "Critical"].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    priority === p 
                      ? p === "High" || p === "Critical" ? "bg-rose-500/10 border-rose-500/50 text-rose-500" : "bg-gold/10 border-gold/50 text-gold"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </form>

        <footer className="px-6 py-4 border-t border-muted bg-muted/20 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </footer>
      </div>
    </div>
  );
}
