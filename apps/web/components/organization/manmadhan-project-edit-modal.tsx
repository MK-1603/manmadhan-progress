"use client";

import { useState, useEffect } from "react";
import { X, Check, Edit, Calendar, Flag } from "lucide-react";
import apiClient from "@/lib/api-client";

interface ManMadhanProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  project: any;
  onSuccess: (project: any) => void;
}

export function ManMadhanProjectEditModal({ isOpen, onClose, workspaceId, project, onSuccess }: ManMadhanProjectEditModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Medium");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setStartDate(project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "");
      setDeadline(project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : "");
      setPriority(project.priority || "Medium");
      setError(null);
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        description,
        startDate: startDate || null,
        deadline: deadline || null,
        priority,
        workspaceId,
      };
      
      const res = await apiClient.patch(`/manmadhan/projects/${project.id}`, payload);
      if (res.data.success) {
        onSuccess(res.data.data);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Edit className="w-5 h-5 text-gold" /> Edit Project
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar max-h-[70vh]">
          {error && (
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-lg text-sm font-semibold">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Project Name *</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full text-base bg-muted rounded-lg px-4 py-3 border-none outline-none focus:ring-2 focus:ring-gold/50 transition-shadow"
                placeholder="e.g. Q3 Organization Strategy"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-sm bg-muted rounded-lg px-4 py-3 border-none outline-none focus:ring-2 focus:ring-gold/50 transition-shadow min-h-[80px]"
                placeholder="Briefly describe the objective..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Start Date
                </label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full text-sm bg-muted rounded-lg px-4 py-3 border-none outline-none focus:ring-2 focus:ring-gold/50 transition-shadow"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5" /> Deadline
                </label>
                <input 
                  type="date" 
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full text-sm bg-muted rounded-lg px-4 py-3 border-none outline-none focus:ring-2 focus:ring-gold/50 transition-shadow"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Priority</label>
              <div className="flex gap-2">
                {["Low", "Medium", "High", "Critical"].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
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
          </div>
        </form>

        <footer className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
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
            className="px-5 py-2 rounded-lg text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-gold/20"
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
