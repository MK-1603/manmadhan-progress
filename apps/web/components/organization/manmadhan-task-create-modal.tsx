"use client";

import { useEffect, useState } from "react";
import { X, Calendar as CalIcon, Flag, Plus } from "lucide-react";
import apiClient from "@/lib/api-client";

export type Project = {
  id: string;
  name: string;
};

interface ManMadhanTaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  workspaceId: string;
  onSave: (task: any) => void;
}

export function ManMadhanTaskCreateModal({ isOpen, onClose, projects, workspaceId, onSave }: ManMadhanTaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [deadline, setDeadline] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState(""); // optional for now
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setDeadline("");
      setProjectId("");
      setAssigneeId("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

      const res = await apiClient.post("/manmadhan/tasks", payload);
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
            <Plus className="w-5 h-5 text-gold" /> Create ManMadhan Task
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
              placeholder="What needs to be done?" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all" 
              placeholder="Add details..." 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" /> Priority
              </label>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value)} 
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalIcon className="w-3.5 h-3.5" /> Deadline
              </label>
              <input 
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</label>
            <select 
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              <option value="">No Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-border mt-4">
            <button 
              type="button" 
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold bg-gold text-black hover:bg-gold/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
