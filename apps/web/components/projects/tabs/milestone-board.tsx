"use client";

import { useState } from "react";
import { Plus, Calendar, Check, MoreVertical, Flag } from "lucide-react";
import apiClient from "@/lib/api-client";

export function MilestoneBoard({ project }: { project: any }) {
  const [milestones, setMilestones] = useState(project.milestones || []);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/projects/${project.id}/milestones?workspaceId=${workspaceId}`, {
        name,
        deadline: deadline || null,
        status: "Pending",
        order: milestones.length
      });
      if (res.data.success) {
        setMilestones([...milestones, res.data.data]);
        setCreating(false);
        setName("");
        setDeadline("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (m: any) => {
    const newStatus = m.status === "Completed" ? "Pending" : "Completed";
    setMilestones((current: any[]) => current.map((x: any) => x.id === m.id ? { ...x, status: newStatus } : x));
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.patch(`/projects/${project.id}/milestones/${m.id}?workspaceId=${workspaceId}`, {
        status: newStatus
      });
    } catch (err) {
      console.error(err);
      // Revert on failure
      setMilestones((current: any[]) => current.map((x: any) => x.id === m.id ? { ...x, status: m.status } : x));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Flag className="w-5 h-5 text-primary" /> Project Milestones
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Track key delivery phases and deadlines.</p>
        </div>
        {!creating && (
          <button 
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Milestone
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-card p-6 rounded-2xl border border-primary/30 shadow-md space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Milestone Name *</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                className="w-full text-sm bg-muted rounded-lg px-4 py-2 border-none outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Design Approved"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Target Date</label>
              <input 
                type="date" 
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full text-sm bg-muted rounded-lg px-4 py-2 border-none outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreating(false)} disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-muted text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} className="px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Creating..." : "Save Milestone"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {milestones.length === 0 && !creating ? (
          <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-muted/20">
            <p className="text-sm text-muted-foreground">No milestones defined yet.</p>
          </div>
        ) : (
          milestones.map((m: any) => (
            <div 
              key={m.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${m.status === 'Completed' ? 'bg-muted/30 border-border opacity-70' : 'bg-card border-border hover:border-primary/30 shadow-sm'}`}
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleComplete(m)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${m.status === 'Completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-muted-foreground hover:border-primary hover:text-primary text-transparent'}`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <div>
                  <h3 className={`text-sm font-bold ${m.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {m.name}
                  </h3>
                  {m.deadline && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" /> {new Date(m.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider 
                  ${m.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {m.status}
                </span>
                <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
