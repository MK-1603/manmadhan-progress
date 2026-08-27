"use client";

import React, { useState } from "react";
import { BlueprintMilestone, BlueprintTask } from "./templates-data";
import {
  Layers, Plus, Trash2, Edit3, ChevronDown, ChevronUp, Flag, CheckSquare,
  UserCheck, Users, Github, Calendar, Check, AlertCircle, Wrench
} from "lucide-react";

interface MemberOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BlueprintEditorProps {
  milestones: BlueprintMilestone[];
  setMilestones: React.Dispatch<React.SetStateAction<BlueprintMilestone[]>>;
  coCeoList: MemberOption[];
  memberList: MemberOption[];
  selectedCoCeoId: string;
  setSelectedCoCeoId: (id: string) => void;
  selectedMemberIds: string[];
  setSelectedMemberIds: (ids: string[]) => void;
  githubUrl: string;
  setGithubUrl: (url: string) => void;
  toolsText: string;
  setToolsText: (tools: string) => void;
}

export function BlueprintEditor({
  milestones,
  setMilestones,
  coCeoList,
  memberList,
  selectedCoCeoId,
  setSelectedCoCeoId,
  selectedMemberIds,
  setSelectedMemberIds,
  githubUrl,
  setGithubUrl,
  toolsText,
  setToolsText,
}: BlueprintEditorProps) {
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string>(milestones[0]?.id || "");
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");

  // Task creation modal inline
  const [addingTaskForMilestoneId, setAddingTaskForMilestoneId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");

  // Milestone Actions
  const handleAddMilestone = () => {
    if (!newMilestoneName.trim()) return;
    const stageNum = milestones.length + 1;
    const newM: BlueprintMilestone = {
      id: `m-custom-${Date.now()}`,
      stageNumber: stageNum,
      name: `M${stageNum} — ${newMilestoneName.trim()}`,
      description: newMilestoneDesc.trim() || "Custom project milestone phase.",
      deliverables: ["Milestone Deliverable Verification"],
      tasks: [],
    };
    setMilestones((prev) => [...prev, newM]);
    setNewMilestoneName("");
    setNewMilestoneDesc("");
    setEditingMilestoneId(null);
    setExpandedMilestoneId(newM.id);
  };

  const handleDeleteMilestone = (id: string) => {
    if (milestones.length <= 1) {
      alert("Project must contain at least 1 milestone phase.");
      return;
    }
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  // Task Actions
  const handleAddTask = (milestoneId: string) => {
    if (!newTaskTitle.trim()) return;
    const newTask: BlueprintTask = {
      id: `t-custom-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      priority: newTaskPriority,
      assigneeRole: "EXECUTION_LEAD",
    };
    setMilestones((prev) =>
      prev.map((m) => (m.id === milestoneId ? { ...m, tasks: [...m.tasks, newTask] } : m))
    );
    setNewTaskTitle("");
    setNewTaskDesc("");
    setAddingTaskForMilestoneId(null);
  };

  const handleDeleteTask = (milestoneId: string, taskId: string) => {
    setMilestones((prev) =>
      prev.map((m) =>
        m.id === milestoneId ? { ...m, tasks: m.tasks.filter((t) => t.id !== taskId) } : m
      )
    );
  };

  const handleToggleMemberSelect = (userId: string) => {
    if (selectedMemberIds.includes(userId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== userId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId]);
    }
  };

  return (
    <div className="space-y-5 font-sans text-xs">
      {/* Role Assignment & Leadership Matrix */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-600 dark:text-gold" />
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Project Leadership & Execution Matrix</h4>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Owner: CEO (Read-only System Rule)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* CO-CEO In Charge Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-500" /> CO-CEO Execution Lead
            </label>
            <select
              value={selectedCoCeoId}
              onChange={(e) => setSelectedCoCeoId(e.target.value)}
              className="w-full h-[38px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="">Select CO-CEO Execution Lead...</option>
              {coCeoList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          {/* Tools & Tech Stack */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-emerald-500" /> Tech Stack & Tools
            </label>
            <input
              type="text"
              value={toolsText}
              onChange={(e) => setToolsText(e.target.value)}
              placeholder="e.g. Next.js, TypeScript, Node.js, GitHub"
              className="w-full h-[38px] px-3 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Assigned Team Members Checklist */}
        <div className="space-y-2 pt-1">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-500" /> Assign Team Members ({selectedMemberIds.length} Selected)
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-background rounded-xl border border-border">
            {memberList.length === 0 ? (
              <span className="text-[11px] text-muted-foreground p-1">No additional organization members found.</span>
            ) : (
              memberList.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleToggleMemberSelect(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-gold"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-amber-600 dark:text-gold" />}
                    <span>{m.name || m.email}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Interactive Milestones & Tasks Builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600 dark:text-gold" />
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
              Project Milestones & Task Hierarchy ({milestones.length} Phases)
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setEditingMilestoneId("new")}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-gold hover:bg-amber-500 hover:text-white dark:hover:text-black font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Milestone Phase
          </button>
        </div>

        {/* Add New Milestone Form Inline */}
        {editingMilestoneId === "new" && (
          <div className="p-3.5 rounded-xl bg-card border border-amber-500/40 space-y-2.5">
            <h5 className="font-bold text-foreground">Add Custom Milestone Phase</h5>
            <input
              type="text"
              value={newMilestoneName}
              onChange={(e) => setNewMilestoneName(e.target.value)}
              placeholder="Milestone Name (e.g. M7 — Security Audit & Performance)"
              className="w-full h-[36px] px-3 bg-background border border-border rounded-lg text-xs outline-none focus:border-amber-500/50"
            />
            <textarea
              value={newMilestoneDesc}
              onChange={(e) => setNewMilestoneDesc(e.target.value)}
              placeholder="Milestone description & deliverable requirements..."
              rows={2}
              className="w-full p-2.5 bg-background border border-border rounded-lg text-xs outline-none focus:border-amber-500/50 resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingMilestoneId(null)}
                className="px-3 py-1 rounded border border-border text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="px-3 py-1 rounded bg-amber-500 text-white dark:bg-gold dark:text-black font-bold"
              >
                Add Phase
              </button>
            </div>
          </div>
        )}

        {/* List of Milestones */}
        <div className="space-y-2.5">
          {milestones.map((m) => {
            const isExpanded = expandedMilestoneId === m.id;

            return (
              <div key={m.id} className="rounded-xl border border-border bg-card overflow-hidden transition-all">
                <div
                  onClick={() => setExpandedMilestoneId(isExpanded ? "" : m.id)}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Flag className="w-4 h-4 text-amber-600 dark:text-gold shrink-0" />
                    <span className="font-bold text-foreground text-xs truncate">{m.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-mono shrink-0">
                      {m.tasks.length} tasks
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMilestone(m.id);
                      }}
                      className="p-1 text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                      title="Delete milestone phase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-border bg-background/50 space-y-3">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{m.description}</p>

                    {/* Tasks List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> Milestone Action Items ({m.tasks.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setAddingTaskForMilestoneId(m.id)}
                          className="text-[10.5px] font-bold text-amber-600 dark:text-gold hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>

                      {/* Inline Add Task Form */}
                      {addingTaskForMilestoneId === m.id && (
                        <div className="p-3 bg-card border border-border rounded-xl space-y-2">
                          <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Task action item title..."
                            className="w-full h-[34px] px-3 bg-background border border-border rounded-lg text-xs outline-none"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <select
                              value={newTaskPriority}
                              onChange={(e) => setNewTaskPriority(e.target.value as any)}
                              className="h-[30px] px-2 bg-background border border-border rounded text-[11px]"
                            >
                              <option value="Critical">Critical Priority</option>
                              <option value="High">High Priority</option>
                              <option value="Medium">Medium Priority</option>
                              <option value="Low">Low Priority</option>
                            </select>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setAddingTaskForMilestoneId(null)}
                                className="px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddTask(m.id)}
                                className="px-2.5 py-1 text-[11px] bg-amber-500 text-white dark:bg-gold dark:text-black font-bold rounded"
                              >
                                Add Task
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        {m.tasks.length === 0 ? (
                          <div className="p-2 text-center text-[10.5px] text-muted-foreground">No tasks defined for this phase yet.</div>
                        ) : (
                          m.tasks.map((t) => (
                            <div key={t.id} className="p-2.5 bg-card rounded-lg border border-border flex items-center justify-between gap-2">
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate text-[11.5px]">{t.title}</p>
                                {t.description && <p className="text-[10.5px] text-muted-foreground line-clamp-1">{t.description}</p>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-gold text-[9.5px] font-bold uppercase">
                                  {t.priority}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(m.id, t.id)}
                                  className="text-muted-foreground hover:text-rose-500 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
