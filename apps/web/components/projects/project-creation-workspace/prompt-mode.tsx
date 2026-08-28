import React, { useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { ProjectIconSelector } from "./project-icon-selector";

interface PromptModeProps {
  projectIcon?: string;
  setProjectIcon?: (icon: string) => void;
  promptText: string;
  setPromptText: React.Dispatch<React.SetStateAction<string>>;
  substep: "DESCRIBE" | "UNDERSTAND" | "REFINE";
  setSubstep: (step: "DESCRIBE" | "UNDERSTAND" | "REFINE") => void;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  priority: "Critical" | "High" | "Medium" | "Low";
  setPriority: (val: "Critical" | "High" | "Medium" | "Low") => void;
  deadline: string;
  setDeadline: (val: string) => void;
  toolsText: string;
  setToolsText: (val: string) => void;
  requirements: string[];
  setRequirements: React.Dispatch<React.SetStateAction<string[]>>;
  deliverables: string[];
  setDeliverables: React.Dispatch<React.SetStateAction<string[]>>;
  successCriteria: string[];
  setSuccessCriteria: React.Dispatch<React.SetStateAction<string[]>>;
  onProceedToAssignment: () => void;
}

const ALL_DETAILS_SCAFFOLD = `Project Title: 
Project Description: 
Category: Product Engineering
Goal: 
Deadline: 
Priority: High
Constraints: 
Requirements: 
Deliverables: 
Success Criteria: 
Document Requirements: PRD, TRD, Architecture
Tech Stack: 
GitHub Repository: `;

const QUICK_ADD_PILLS = [
  { label: "Title", key: "Project Title: " },
  { label: "Description", key: "Project Description: " },
  { label: "Category", key: "Category: Product Engineering\n" },
  { label: "Goal", key: "Goal: " },
  { label: "Deadline", key: "Deadline: " },
  { label: "Priority", key: "Priority: High\n" },
  { label: "Constraints", key: "Constraints: " },
  { label: "Requirements", key: "Requirements: " },
  { label: "Deliverables", key: "Deliverables: " },
  { label: "Success Criteria", key: "Success Criteria: " },
  { label: "Documents", key: "Document Requirements: PRD, TRD, Architecture\n" },
  { label: "Tech Stack", key: "Tech Stack: Next.js, PostgreSQL\n" },
  { label: "GitHub", key: "GitHub Repository: " },
];

export function PromptMode({
  projectIcon = "FolderKanban",
  setProjectIcon,
  promptText,
  setPromptText,
  substep,
  setSubstep,
  title,
  setTitle,
  description,
  setDescription,
  category,
  setCategory,
  priority,
  setPriority,
  deadline,
  setDeadline,
  toolsText,
  setToolsText,
  requirements,
  setRequirements,
  deliverables,
  setDeliverables,
  successCriteria,
  setSuccessCriteria,
  onProceedToAssignment,
}: PromptModeProps) {
  const [newReq, setNewReq] = useState("");
  const [newDel, setNewDel] = useState("");
  const [newCrit, setNewCrit] = useState("");

  const handleAddAllDetails = () => {
    if (!promptText.trim()) {
      setPromptText(ALL_DETAILS_SCAFFOLD);
    } else {
      setPromptText((prev) => `${prev.trim()}\n\n${ALL_DETAILS_SCAFFOLD}`);
    }
  };

  const handleQuickAddClick = (key: string) => {
    const currentText = promptText.trim();
    if (!currentText) setPromptText(key);
    else setPromptText(`${currentText}\n${key}`);
  };

  const handleParsePrompt = () => {
    if (!promptText.trim()) return;

    // Smart prompt parsing
    let parsedTitle = "";
    let parsedDesc = promptText;

    const titleMatch = promptText.match(/Project Title:\s*([^\n]+)/i);
    if (titleMatch && titleMatch[1].trim()) {
      parsedTitle = titleMatch[1].trim();
    } else {
      parsedTitle = promptText.length > 50 ? `${promptText.substring(0, 48)}...` : promptText;
    }

    const descMatch = promptText.match(/Project Description:\s*([^\n]+)/i);
    if (descMatch && descMatch[1].trim()) {
      parsedDesc = descMatch[1].trim();
    }

    setTitle(parsedTitle);
    setDescription(parsedDesc);

    if (requirements.length === 0) {
      setRequirements(["PRD Document", "Technical Architecture (TRD)", "Security Audit"]);
    }
    if (deliverables.length === 0) {
      setDeliverables(["Working Application Prototype", "Connected Repository", "Acceptance Test Suite"]);
    }
    if (successCriteria.length === 0) {
      setSuccessCriteria(["Zero critical vulnerabilities", "Passed end-to-end integration tests"]);
    }
    setSubstep("UNDERSTAND");
  };

  const handleAddRequirement = () => {
    if (!newReq.trim()) return;
    setRequirements((prev) => [...prev, newReq.trim()]);
    setNewReq("");
  };

  const handleDeleteRequirement = (idx: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddDeliverable = () => {
    if (!newDel.trim()) return;
    setDeliverables((prev) => [...prev, newDel.trim()]);
    setNewDel("");
  };

  const handleDeleteDeliverable = (idx: number) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddCriteria = () => {
    if (!newCrit.trim()) return;
    setSuccessCriteria((prev) => [...prev, newCrit.trim()]);
    setNewCrit("");
  };

  const handleDeleteCriteria = (idx: number) => {
    setSuccessCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Substep Progress Strip */}
      <div className="flex items-center gap-2 pb-2 border-b border-border text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setSubstep("DESCRIBE")}
          className={`px-3 py-1 rounded-lg cursor-pointer ${
            substep === "DESCRIBE" ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          01 Describe
        </button>
        <span className="text-border">→</span>
        <button
          type="button"
          disabled={!promptText.trim()}
          onClick={() => setSubstep("UNDERSTAND")}
          className={`px-3 py-1 rounded-lg cursor-pointer disabled:opacity-40 ${
            substep === "UNDERSTAND" ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          02 Understand
        </button>
        <span className="text-border">→</span>
        <button
          type="button"
          disabled={!promptText.trim()}
          onClick={() => setSubstep("REFINE")}
          className={`px-3 py-1 rounded-lg cursor-pointer disabled:opacity-40 ${
            substep === "REFINE" ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          03 Refine
        </button>
      </div>

      {/* ── SUBSTEP 1: DESCRIBE ────────────────────────────────────────────── */}
      {substep === "DESCRIBE" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#C9A52A]" /> Project Brief
            </label>
            <p className="text-[11px] text-muted-foreground">
              Describe what you want to create or insert a structured prompt scaffold.
            </p>
          </div>

          <div className="relative rounded-2xl bg-background border border-border focus-within:border-[#C9A52A]/60 focus-within:ring-1 focus-within:ring-[#C9A52A]/20 transition-all shadow-2xs overflow-hidden">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Build an AI-powered interview experience platform with authentication, company search and analytics."
              rows={7}
              className="w-full p-4 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none leading-relaxed resize-y font-sans"
            />
            <div className="px-4 py-2 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[10.5px] text-muted-foreground">
              <span>Include title, objective, deadline, and key requirements.</span>
              {promptText.trim() && (
                <button
                  type="button"
                  onClick={() => setPromptText("")}
                  className="text-muted-foreground hover:text-foreground font-bold underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Add Pills & Scaffold Insertion */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground">Add to brief:</span>
              <button
                type="button"
                onClick={handleAddAllDetails}
                className="px-3 py-1 rounded-xl bg-[#C9A52A] text-[#0B0D10] font-extrabold text-[11px] hover:brightness-105 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add All Details
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_ADD_PILLS.map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => handleQuickAddClick(pill.key)}
                  className="px-2.5 py-1 rounded-xl bg-card border border-border hover:border-[#C9A52A]/40 text-foreground font-semibold text-[11px] transition-all cursor-pointer"
                >
                  [{pill.label}]
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-end">
            <button
              type="button"
              disabled={!promptText.trim()}
              onClick={handleParsePrompt}
              className="px-5 h-[38px] rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs cursor-pointer shadow-xs hover:brightness-105 disabled:opacity-40 flex items-center gap-2"
            >
              <span>Understand & Extract Draft →</span>
            </button>
          </div>
        </div>
      )}

      {/* ── SUBSTEP 2: UNDERSTAND ───────────────────────────────────────────── */}
      {substep === "UNDERSTAND" && (
        <div className="space-y-4">
          <div className="space-y-1 border-b border-border pb-2">
            <h4 className="text-xs font-extrabold text-foreground">Parsed Project Information</h4>
            <p className="text-[11px] text-muted-foreground">Review and edit the extracted draft parameters before refining scope.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground">Project Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-[38px] px-3.5 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground">Objective & Scope Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-[38px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full h-[38px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer"
                >
                  <option value="Critical">Critical Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setSubstep("DESCRIBE")}
              className="px-4 py-2 rounded-xl border border-border text-foreground font-bold cursor-pointer hover:bg-muted"
            >
              ← Back to Brief
            </button>
            <button
              type="button"
              onClick={() => setSubstep("REFINE")}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs cursor-pointer shadow-xs hover:brightness-105 flex items-center gap-1.5"
            >
              <span>Refine Scope Requirements →</span>
            </button>
          </div>
        </div>
      )}

      {/* ── SUBSTEP 3: REFINE ───────────────────────────────────────────────── */}
      {substep === "REFINE" && (
        <div className="space-y-4">
          <div className="space-y-1 border-b border-border pb-2">
            <h4 className="text-xs font-extrabold text-foreground">Refine Scope & Requirements</h4>
            <p className="text-[11px] text-muted-foreground">Add, edit, or remove requirements, deliverables, and success criteria.</p>
          </div>

          {setProjectIcon && (
            <ProjectIconSelector selectedIcon={projectIcon} onSelectIcon={setProjectIcon} />
          )}

          {/* Requirements List */}
          <div className="space-y-2">
            <label className="text-[11px] font-extrabold text-foreground block uppercase tracking-wider">
              Scope Requirements ({requirements.length})
            </label>
            <div className="space-y-1.5">
              {requirements.map((req, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{req}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRequirement(idx)}
                    className="text-muted-foreground hover:text-rose-500 p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newReq}
                onChange={(e) => setNewReq(e.target.value)}
                placeholder="Add requirement..."
                className="flex-1 h-[34px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]"
              />
              <button
                type="button"
                onClick={handleAddRequirement}
                className="px-3 h-[34px] rounded-xl bg-secondary border border-border text-foreground font-bold text-xs hover:bg-muted"
              >
                Add
              </button>
            </div>
          </div>

          {/* Deliverables List */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <label className="text-[11px] font-extrabold text-foreground block uppercase tracking-wider">
              Deliverables ({deliverables.length})
            </label>
            <div className="space-y-1.5">
              {deliverables.map((del, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{del}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteDeliverable(idx)}
                    className="text-muted-foreground hover:text-rose-500 p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDel}
                onChange={(e) => setNewDel(e.target.value)}
                placeholder="Add deliverable..."
                className="flex-1 h-[34px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]"
              />
              <button
                type="button"
                onClick={handleAddDeliverable}
                className="px-3 h-[34px] rounded-xl bg-secondary border border-border text-foreground font-bold text-xs hover:bg-muted"
              >
                Add
              </button>
            </div>
          </div>

          {/* Success Criteria List */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <label className="text-[11px] font-extrabold text-foreground block uppercase tracking-wider">
              Success Criteria ({successCriteria.length})
            </label>
            <div className="space-y-1.5">
              {successCriteria.map((crit, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{crit}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCriteria(idx)}
                    className="text-muted-foreground hover:text-rose-500 p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCrit}
                onChange={(e) => setNewCrit(e.target.value)}
                placeholder="Add success criterion..."
                className="flex-1 h-[34px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]"
              />
              <button
                type="button"
                onClick={handleAddCriteria}
                className="px-3 h-[34px] rounded-xl bg-secondary border border-border text-foreground font-bold text-xs hover:bg-muted"
              >
                Add
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setSubstep("UNDERSTAND")}
              className="px-4 py-2 rounded-xl border border-border text-foreground font-bold cursor-pointer hover:bg-muted"
            >
              ← Back to Understand
            </button>
            <button
              type="button"
              onClick={onProceedToAssignment}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs cursor-pointer shadow-xs hover:brightness-105 flex items-center gap-1.5"
            >
              <span>Proceed to Assignment →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
