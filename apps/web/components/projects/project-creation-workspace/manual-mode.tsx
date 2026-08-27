"use client";

import React from "react";
import { Lock } from "lucide-react";

interface ManualModeProps {
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
  githubUrl: string;
  setGithubUrl: (val: string) => void;
  toolsText: string;
  setToolsText: (val: string) => void;
  requirementsText: string;
  setRequirementsText: (val: string) => void;
  deliverablesText: string;
  setDeliverablesText: (val: string) => void;
  successCriteriaText: string;
  setSuccessCriteriaText: (val: string) => void;
  substep: "INFORMATION" | "CONTROLS" | "REQUIREMENTS";
  setSubstep: (step: "INFORMATION" | "CONTROLS" | "REQUIREMENTS") => void;
  onProceedToAssignment: () => void;
}

export function ManualMode({
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
  githubUrl,
  setGithubUrl,
  toolsText,
  setToolsText,
  requirementsText,
  setRequirementsText,
  deliverablesText,
  setDeliverablesText,
  successCriteriaText,
  setSuccessCriteriaText,
  substep,
  setSubstep,
  onProceedToAssignment,
}: ManualModeProps) {
  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Manual Substep Progress Strip */}
      <div className="flex items-center gap-2 pb-2 border-b border-border text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setSubstep("INFORMATION")}
          className={`px-3 py-1 rounded-lg cursor-pointer ${
            substep === "INFORMATION" ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          01 Information
        </button>
        <span className="text-border">→</span>
        <button
          type="button"
          onClick={() => setSubstep("CONTROLS")}
          className={`px-3 py-1 rounded-lg cursor-pointer ${
            substep === "CONTROLS" ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          02 Controls
        </button>
        <span className="text-border">→</span>
        <button
          type="button"
          onClick={() => setSubstep("REQUIREMENTS")}
          className={`px-3 py-1 rounded-lg cursor-pointer ${
            substep === "REQUIREMENTS" ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          03 Requirements
        </button>
      </div>

      {/* Ownership Enforcement Notice */}
      <div className="p-3 rounded-xl bg-[#C9A52A]/10 border border-[#C9A52A]/25 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#C9A52A]" />
          <span className="font-bold text-foreground">Ownership Enforcement:</span>
          <span className="text-muted-foreground">Project Owner is set to CEO</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#C9A52A]/20 text-[#C9A52A] font-extrabold text-[10px]">Read-only</span>
      </div>

      {/* ── SUBSTEP 1: INFORMATION ─────────────────────────────────────────── */}
      {substep === "INFORMATION" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
              Project Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Enterprise AI Platform / Next.js SaaS Infrastructure"
              className="w-full h-[40px] px-3.5 bg-background border border-border focus:border-[#C9A52A]/60 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none shadow-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
              Objective & Scope Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail core project objective, mandate deliverables, and execution goals..."
              rows={4}
              className="w-full p-3.5 bg-background border border-border focus:border-[#C9A52A]/60 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none resize-y leading-relaxed shadow-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Engineering / AI System / Product"
              className="w-full h-[40px] px-3.5 bg-background border border-border focus:border-[#C9A52A]/60 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none shadow-xs"
            />
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-end">
            <button
              type="button"
              disabled={!title.trim() || !description.trim()}
              onClick={() => setSubstep("CONTROLS")}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs cursor-pointer shadow-xs hover:brightness-105 disabled:opacity-40 flex items-center gap-1.5"
            >
              <span>Continue to Controls →</span>
            </button>
          </div>
        </div>
      )}

      {/* ── SUBSTEP 2: CONTROLS ────────────────────────────────────────────── */}
      {substep === "CONTROLS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-[40px] px-3.5 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]/60 cursor-pointer shadow-xs font-semibold"
              >
                <option value="Critical">Critical Priority</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
                Target Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-[40px] px-3.5 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]/60 cursor-pointer shadow-xs font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
                GitHub Repository URL (Optional)
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/org/repository"
                className="w-full h-[40px] px-3.5 bg-background border border-border focus:border-[#C9A52A]/60 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
                Tech Stack / Tools
              </label>
              <input
                type="text"
                value={toolsText}
                onChange={(e) => setToolsText(e.target.value)}
                placeholder="Next.js, TypeScript, PostgreSQL, Tailwind CSS"
                className="w-full h-[40px] px-3.5 bg-background border border-border focus:border-[#C9A52A]/60 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none shadow-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setSubstep("INFORMATION")}
              className="px-4 py-2 rounded-xl border border-border text-foreground font-bold cursor-pointer hover:bg-muted"
            >
              ← Back to Information
            </button>
            <button
              type="button"
              onClick={() => setSubstep("REQUIREMENTS")}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs cursor-pointer shadow-xs hover:brightness-105 flex items-center gap-1.5"
            >
              <span>Continue to Requirements →</span>
            </button>
          </div>
        </div>
      )}

      {/* ── SUBSTEP 3: REQUIREMENTS ────────────────────────────────────────── */}
      {substep === "REQUIREMENTS" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
              Requirements (Comma Separated)
            </label>
            <textarea
              value={requirementsText}
              onChange={(e) => setRequirementsText(e.target.value)}
              placeholder="PRD approval, Authentication system, API routes"
              rows={2}
              className="w-full p-3 bg-background border border-border focus:border-[#C9A52A]/60 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none shadow-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
              Deliverables (Comma Separated)
            </label>
            <textarea
              value={deliverablesText}
              onChange={(e) => setDeliverablesText(e.target.value)}
              placeholder="Working Prototype, Production Deployment, TRD Doc"
              rows={2}
              className="w-full p-3 bg-background border border-border focus:border-[#C9A52A]/60 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none shadow-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
              Success Criteria
            </label>
            <textarea
              value={successCriteriaText}
              onChange={(e) => setSuccessCriteriaText(e.target.value)}
              placeholder="Passed E2E testing, zero critical vulnerabilities"
              rows={2}
              className="w-full p-3 bg-background border border-border focus:border-[#C9A52A]/60 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none shadow-xs"
            />
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setSubstep("CONTROLS")}
              className="px-4 py-2 rounded-xl border border-border text-foreground font-bold cursor-pointer hover:bg-muted"
            >
              ← Back to Controls
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
