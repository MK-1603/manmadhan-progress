"use client";

import { useState } from "react";
import { X, Check, Target, Calendar, Flag, BarChart2 } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess: (project: any) => void;
}

export function ProjectCreateModal({ isOpen, onClose, workspaceId, onSuccess }: ProjectCreateModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Medium");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
        objective,
        startDate: startDate || null,
        deadline: deadline || null,
        priority,
        workspaceId,
      };
      
      const res = await apiClient.post("/projects", payload);
      if (res.data.success) {
        onSuccess(res.data.data);
        onClose();
        setName("");
        setDescription("");
        setObjective("");
        setStartDate("");
        setDeadline("");
        setPriority("Medium");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Target className="w-5 h-5 text-primary" /> Create New Project
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
                className="w-full text-base bg-muted rounded-lg px-4 py-3 border-none outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                placeholder="e.g. Website Redesign Q4"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-sm bg-muted rounded-lg px-4 py-3 border-none outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[80px]"
                placeholder="High-level description of the project..."
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Objective / Success Criteria</label>
              <textarea 
                value={objective}
                onChange={e => setObjective(e.target.value)}
                className="w-full text-sm bg-muted rounded-lg px-4 py-3 border-none outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[80px]"
                placeholder="What defines success for this project? (e.g. Increase conversion rate by 15%)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Start Date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full text-sm bg-muted rounded-lg px-3 py-2 border-none outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Deadline</label>
                <input 
                  type="date" 
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full text-sm bg-muted rounded-lg px-3 py-2 border-none outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Flag className="w-3 h-3" /> Priority</label>
                <select 
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full text-sm bg-muted rounded-lg px-3 py-2 border-none outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        <footer className="px-6 py-4 border-t border-border bg-card flex justify-end items-center gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="px-5 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted transition-colors text-foreground">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !name.trim()} className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving ? "Creating..." : <><Check className="w-4 h-4" /> Create Project</>}
          </button>
        </footer>
      </div>
    </div>
  );
}
