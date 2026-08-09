"use client";

import { useState } from "react";
import { X, Check, ArrowRight, ArrowLeft, Plus, Trash2, UploadCloud, File, Image as ImageIcon, Calendar, Flag } from "lucide-react";
import apiClient from "@/lib/api-client";
import { format } from "date-fns";

interface PersonalProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
}

export function PersonalProjectCreateModal({ isOpen, onClose, onSuccess }: PersonalProjectCreateModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Personal");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [status, setStatus] = useState("Planning");
  const [priority, setPriority] = useState("Medium");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estimatedEffort, setEstimatedEffort] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [syncToCalendar, setSyncToCalendar] = useState(false);

  const [goal, setGoal] = useState("");
  const [successCriteria, setSuccessCriteria] = useState<string[]>([]);
  const [criteriaInput, setCriteriaInput] = useState("");

  const [milestones, setMilestones] = useState<{name: string; description: string; deadline: string; priority: string}[]>([]);
  const [milestoneForm, setMilestoneForm] = useState({ name: "", description: "", deadline: "", priority: "Medium" });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  const [files, setFiles] = useState<{fileName: string; fileType: string; fileSize: number; url: string}[]>([]);

  if (!isOpen) return null;

  const handleNext = () => setStep(s => Math.min(s + 1, 6));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleAddCriteria = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && criteriaInput.trim()) {
      e.preventDefault();
      setSuccessCriteria([...successCriteria, criteriaInput.trim()]);
      setCriteriaInput("");
    }
  };

  const handleAddMilestone = () => {
    if (!milestoneForm.name.trim()) return;
    setMilestones([...milestones, { ...milestoneForm }]);
    setMilestoneForm({ name: "", description: "", deadline: "", priority: "Medium" });
    setShowMilestoneForm(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    
    // Mocking file upload for UI. In reality this would hit an S3 presigned URL or /api/upload
    const newFiles = Array.from(fileList).map(f => ({
      fileName: f.name,
      fileType: f.type,
      fileSize: f.size,
      url: URL.createObjectURL(f) // Mock URL
    }));
    
    setFiles([...files, ...newFiles]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name, description, type, category, tags, goal,
        status, priority, startDate: startDate || null, deadline: deadline || null,
        estimatedEffort: estimatedEffort ? parseInt(estimatedEffort) : null,
        remindAt: remindAt || null,
        syncToCalendar,
        successCriteria, milestones, files
      };
      
      const res = await apiClient.post("/personal/projects", payload);
      if (res.data.success) {
        onSuccess(res.data.data);
        onClose();
      } else {
        setError(res.data.error || "Failed to create project");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-background rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-xl font-bold text-foreground">Create Project</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Step {step} of 6</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm border border-red-500/20">{error}</div>}
          
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">1. Identity</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Project Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. AI Engineering Learning" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Short Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]" placeholder="Briefly describe what this project is about..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Project Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                      <option>Learning</option><option>Development</option><option>Research</option><option>Career</option><option>Personal</option><option>Startup</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Category</label>
                    <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Education" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tags (Press Enter)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent text-xs font-medium text-foreground">
                        {t} <button onClick={() => setTags(tags.filter(x => x !== t))}><X className="w-3 h-3 hover:text-red-400"/></button>
                      </span>
                    ))}
                  </div>
                  <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Add tag..." />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">2. Execution</h3>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option>Planning</option><option>Active</option><option>On Hold</option><option>Completed</option><option>Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Target Deadline</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} min={startDate} className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Estimated Effort (Hours)</label>
                  <input type="number" value={estimatedEffort} onChange={e => setEstimatedEffort(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. 60" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Reminder Date</label>
                  <input type="date" value={remindAt} onChange={e => setRemindAt(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="syncToCalendar" checked={syncToCalendar} onChange={e => setSyncToCalendar(e.target.checked)} className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-primary" />
                  <label htmlFor="syncToCalendar" className="text-sm font-medium">Sync deadline to Calendar</label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">3. Goal & Success Criteria</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Project Goal</label>
                  <textarea value={goal} onChange={e => setGoal(e.target.value)} className="w-full p-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px]" placeholder="What is this project expected to accomplish?" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Success Criteria (Press Enter)</label>
                  <div className="space-y-2 mb-3">
                    {successCriteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/50 border border-border">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-sm flex-1">{c}</span>
                        <button onClick={() => setSuccessCriteria(successCriteria.filter((_, idx) => idx !== i))}><X className="w-4 h-4 text-muted-foreground hover:text-red-400"/></button>
                      </div>
                    ))}
                  </div>
                  <input type="text" value={criteriaInput} onChange={e => setCriteriaInput(e.target.value)} onKeyDown={handleAddCriteria} className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Add success criterion..." />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">4. Milestones (Optional)</h3>
              <div className="space-y-3">
                {milestones.map((m, i) => (
                  <div key={i} className="flex flex-col p-4 rounded-xl border border-border bg-accent/30 relative">
                    <button onClick={() => setMilestones(milestones.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-muted-foreground hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                    <span className="font-bold text-sm text-foreground">{m.name}</span>
                    {m.description && <span className="text-xs text-muted-foreground mt-1">{m.description}</span>}
                    <div className="flex gap-4 mt-3">
                      <span className="text-xs px-2 py-1 rounded-md bg-background border border-border font-medium flex items-center gap-1.5"><Calendar className="w-3 h-3"/> {m.deadline || 'No deadline'}</span>
                      <span className="text-xs px-2 py-1 rounded-md bg-background border border-border font-medium flex items-center gap-1.5"><Flag className="w-3 h-3"/> {m.priority}</span>
                    </div>
                  </div>
                ))}
                
                {!showMilestoneForm ? (
                  <button onClick={() => setShowMilestoneForm(true)} className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                    <Plus className="w-4 h-4" /> Add Milestone
                  </button>
                ) : (
                  <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-4">
                    <input type="text" value={milestoneForm.name} onChange={e => setMilestoneForm({...milestoneForm, name: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring" placeholder="Milestone Name" />
                    <textarea value={milestoneForm.description} onChange={e => setMilestoneForm({...milestoneForm, description: e.target.value})} className="w-full p-3 rounded-lg border border-input bg-background text-sm min-h-[60px] focus:ring-2 focus:ring-ring" placeholder="Description (optional)" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="date" value={milestoneForm.deadline} onChange={e => setMilestoneForm({...milestoneForm, deadline: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring" />
                      <select value={milestoneForm.priority} onChange={e => setMilestoneForm({...milestoneForm, priority: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring">
                        <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button onClick={() => setShowMilestoneForm(false)} className="px-4 py-2 text-sm font-medium hover:text-muted-foreground">Cancel</button>
                      <button onClick={handleAddMilestone} className="px-4 py-2 text-sm font-semibold bg-foreground text-background rounded-lg hover:bg-foreground/90">Save Milestone</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">5. Files & Resources</h3>
              
              <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center relative hover:bg-accent/30 transition-colors">
                <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <UploadCloud className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm font-semibold text-foreground">Drag & drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                <p className="text-[10px] text-muted-foreground/70 mt-4">PDF • DOCX • XLSX • PPTX • Images</p>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium mb-2">Uploaded Files:</p>
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/50 border border-border">
                      {f.fileType.includes("image") ? <ImageIcon className="w-4 h-4 text-blue-500" /> : <File className="w-4 h-4 text-orange-500" />}
                      <span className="text-sm flex-1 truncate">{f.fileName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(f.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))}><X className="w-4 h-4 text-muted-foreground hover:text-red-400"/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">6. Project Summary</h3>
              <div className="bg-accent/40 rounded-xl p-5 border border-border space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-foreground">{name || "Untitled Project"}</h4>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded-md bg-background border border-border font-medium">{type}</span>
                    <span className="text-xs px-2 py-1 rounded-md bg-background border border-border font-medium">{status}</span>
                    <span className="text-xs px-2 py-1 rounded-md bg-background border border-border font-medium">{priority}</span>
                  </div>
                </div>

                {goal && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Goal</span>
                    <p className="text-sm mt-1 text-foreground leading-relaxed">{goal}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div>
                    <span className="text-xs text-muted-foreground block">Timeline</span>
                    <span className="text-sm font-semibold">{startDate ? format(new Date(startDate), "MMM d") : "TBD"} → {deadline ? format(new Date(deadline), "MMM d") : "TBD"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Milestones</span>
                    <span className="text-sm font-semibold">{milestones.length}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Criteria</span>
                    <span className="text-sm font-semibold">{successCriteria.length}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Files</span>
                    <span className="text-sm font-semibold">{files.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between shrink-0 bg-accent/10">
          <div>
            {step > 1 && (
              <button onClick={handlePrev} className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-foreground bg-accent hover:bg-accent/80 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>
          <div>
            {step < 6 ? (
              <button onClick={handleNext} disabled={step === 1 && !name.trim()} className="px-5 py-2 flex items-center gap-2 text-sm font-semibold text-background bg-foreground hover:bg-foreground/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 flex items-center gap-2 text-sm font-semibold text-background bg-gold hover:bg-gold/90 rounded-lg transition-colors disabled:opacity-50">
                {saving ? "Creating..." : "Create Project"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
