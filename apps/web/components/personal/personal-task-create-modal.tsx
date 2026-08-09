"use client";

import { useEffect, useState } from "react";
import { X, Calendar as CalIcon, Flag, Plus, UploadCloud, File, Image as ImageIcon } from "lucide-react";
import apiClient from "@/lib/api-client";
import { format } from "date-fns";

export type Project = {
  id: string;
  name: string;
  milestones?: { id: string; name: string }[];
};

interface PersonalTaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onSave: (task: any) => void;
}

export function PersonalTaskCreateModal({ isOpen, onClose, projects, onSave }: PersonalTaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [deadline, setDeadline] = useState("");
  const [projectId, setProjectId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [type, setType] = useState("Task");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  
  const [remindAt, setRemindAt] = useState("");
  const [syncToCalendar, setSyncToCalendar] = useState(false);
  const [focusDuration, setFocusDuration] = useState("");
  const [startFocusNow, setStartFocusNow] = useState(false);
  
  const [files, setFiles] = useState<{fileName: string; fileType: string; fileSize: number; url: string}[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setDeadline("");
      setProjectId("");
      setMilestoneId("");
      setType("Task");
      setEstimatedMinutes("");
      setRemindAt("");
      setSyncToCalendar(false);
      setFocusDuration("");
      setStartFocusNow(false);
      setFiles([]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    
    const newFiles = Array.from(fileList).map(f => ({
      fileName: f.name,
      fileType: f.type,
      fileSize: f.size,
      url: URL.createObjectURL(f)
    }));
    
    setFiles([...files, ...newFiles]);
  };

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
        title,
        description,
        priority,
        deadline: deadline || null,
        projectId: projectId || null,
        milestoneId: milestoneId || null,
        type,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        remindAt: remindAt || null,
        syncToCalendar,
        focusDuration: focusDuration ? parseInt(focusDuration) : null,
        files
      };
      
      const res = await apiClient.post("/personal/tasks", payload);
      if (res.data.success) {
        if (startFocusNow) {
          await apiClient.post("/focus/start", { workspaceId: "personal", taskId: res.data.data.id }).catch(() => {});
          // Note: you might want to router.push('/personal/focus') here if we had a router.
        }
        onSave(res.data.data);
        onClose();
      } else {
        setError(res.data.error || "Failed to create task");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-background rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-xl font-bold text-foreground">Create Task</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm border border-red-500/20">{error}</div>}
          
          <div>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60 px-0" 
              placeholder="Task name" 
              autoFocus
            />
          </div>

          <div>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full text-sm bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60 px-0 resize-none min-h-[60px]" 
              placeholder="Add description..." 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Project</label>
              <select value={projectId} onChange={e => {setProjectId(e.target.value); setMilestoneId("");}} className="w-full h-9 text-sm px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring">
                <option value="">No Project (Inbox)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Milestone</label>
              <select value={milestoneId} onChange={e => setMilestoneId(e.target.value)} disabled={!projectId || !selectedProject?.milestones?.length} className="w-full h-9 text-sm px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring disabled:opacity-50">
                <option value="">No Milestone</option>
                {selectedProject?.milestones?.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-9 text-sm px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring">
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full h-9 text-sm px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring">
                <option>Task</option><option>Study</option><option>Development</option><option>Research</option><option>Meeting</option><option>Review</option><option>Other</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Deadline</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full h-9 text-sm px-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Est. Mins</label>
              <input type="number" value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} placeholder="30" className="w-full h-9 text-sm px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reminder Date</label>
              <input type="date" value={remindAt} onChange={e => setRemindAt(e.target.value)} className="w-full h-9 text-sm px-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Focus Time (mins)</label>
              <input type="number" value={focusDuration} onChange={e => setFocusDuration(e.target.value)} placeholder="e.g. 45" className="w-full h-9 text-sm px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="syncToCalendarTask" checked={syncToCalendar} onChange={e => setSyncToCalendar(e.target.checked)} className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-primary" />
              <label htmlFor="syncToCalendarTask" className="text-sm font-medium">Add to Calendar</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="startFocusNow" checked={startFocusNow} onChange={e => setStartFocusNow(e.target.checked)} className="w-4 h-4 rounded border-input bg-background text-emerald-500 focus:ring-2 focus:ring-emerald-500" />
              <label htmlFor="startFocusNow" className="text-sm font-medium text-emerald-500">Start Focus Immediately</label>
            </div>
          </div>

          {/* Files */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-medium text-muted-foreground">Attachments</label>
              <label className="cursor-pointer text-xs font-medium flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Plus className="w-3 h-3" /> Add File
                <input type="file" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/50 border border-border">
                    {f.fileType.includes("image") ? <ImageIcon className="w-4 h-4 text-blue-500" /> : <File className="w-4 h-4 text-orange-500" />}
                    <span className="text-sm flex-1 truncate">{f.fileName}</span>
                    <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))}><X className="w-4 h-4 text-muted-foreground hover:text-red-400"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex items-center justify-end shrink-0 bg-accent/10">
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:text-muted-foreground">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-semibold text-background bg-foreground hover:bg-foreground/90 rounded-lg transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Create Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
