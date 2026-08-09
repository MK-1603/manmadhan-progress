"use client";

import { useEffect, useState } from "react";
import { X, Calendar as CalIcon, Flag, Clock, Check, MoreVertical, Archive, Play, Focus } from "lucide-react";
import apiClient from "@/lib/api-client";
import { Task, Project } from "./task-modal"; // I will update Task type there

interface TaskDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  projects: Project[];
  workspaceId: string;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDetailPanel({ isOpen, onClose, task, projects, workspaceId, onUpdate, onDelete }: TaskDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Draft");
  const [priority, setPriority] = useState("Medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  
  // Real-time edits
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority || "Medium");
      setEstimatedMinutes(task.estimatedMinutes ? String(task.estimatedMinutes) : "");
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        title,
        description: description || null,
        status,
        priority,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
      };
      const res = await apiClient.patch(`/tasks/${task.id}`, payload);
      onUpdate(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await apiClient.delete(`/tasks/${task.id}`);
      onDelete(task.id);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFocus = async () => {
    try {
      await apiClient.post("/focus/start", { workspaceId, taskId: task.id });
      // Redirect to personal dashboard or similar
      window.location.href = "/personal/dashboard";
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-background border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-full duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur shrink-0">
        <div className="flex items-center gap-4">
          <select 
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setTimeout(handleSave, 100);
            }}
            className="text-xs font-semibold bg-muted px-3 py-1.5 rounded-full border-none outline-none cursor-pointer"
          >
            {["Draft", "Assigned", "Accepted", "In Progress", "Blocked", "Review", "Approved", "Completed", "Archived"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button onClick={handleFocus} className="flex items-center gap-2 text-xs font-semibold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-full transition-colors">
            <Focus className="w-3.5 h-3.5" /> Focus Now
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleDelete} className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors">
            <Archive className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Title & Description */}
        <div className="space-y-4">
          <input 
            type="text" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleSave}
            className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground"
            placeholder="Task Title..."
          />
          <textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={handleSave}
            className="w-full min-h-[120px] text-sm bg-transparent border border-transparent hover:border-border focus:border-primary rounded-xl p-3 outline-none resize-y transition-colors"
            placeholder="Add description..."
          />
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Priority</label>
            <select 
              value={priority}
              onChange={e => {
                setPriority(e.target.value);
                setTimeout(handleSave, 100);
              }}
              className="w-full text-sm bg-muted rounded-lg px-3 py-2 border-none outline-none"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Estimate (Mins)</label>
            <input 
              type="number" 
              value={estimatedMinutes}
              onChange={e => setEstimatedMinutes(e.target.value)}
              onBlur={handleSave}
              className="w-full text-sm bg-muted rounded-lg px-3 py-2 border-none outline-none"
              placeholder="e.g. 60"
            />
          </div>
        </div>

        {/* Tabs for extra details */}
        <div className="border-b border-border">
          <div className="flex items-center gap-6">
            {['overview', 'subtasks', 'dependencies', 'activity'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-semibold border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="text-sm text-muted-foreground italic">
            This is where custom fields, tags, and checklist items will go.
          </div>
        )}

        {activeTab === 'subtasks' && (
          <div className="text-sm text-muted-foreground italic">
            Subtasks list will go here.
          </div>
        )}

      </div>
    </div>
  );
}
