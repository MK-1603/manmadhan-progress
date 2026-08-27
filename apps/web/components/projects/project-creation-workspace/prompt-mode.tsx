"use client";

import React, { useState } from "react";
import { FileText, ArrowRight, Loader2, Check } from "lucide-react";

interface PromptModeProps {
  promptText: string;
  setPromptText: (text: string) => void;
  isGenerating: boolean;
  onGenerateBlueprint: () => void;
}

const QUICK_ADD_PILLS = [
  { label: "Title", key: "Title: " },
  { label: "Description", key: "Objective: " },
  { label: "Category", key: "Category: Product Engineering\n" },
  { label: "Goal", key: "Goal: " },
  { label: "Deadline", key: "Deadline: " },
  { label: "Priority", key: "Priority: High\n" },
  { label: "Constraints", key: "Constraints: " },
  { label: "Deliverables", key: "Deliverables: " },
  { label: "Documents", key: "Documents: PRD, TRD, Architecture\n" },
  { label: "Tech Stack", key: "Tech Stack: Next.js, PostgreSQL\n" },
  { label: "Milestones", key: "Milestones: " },
  { label: "Team", key: "Team: " },
  { label: "GitHub", key: "GitHub: " },
  { label: "Success Criteria", key: "Success Criteria: " },
];

export function PromptMode({
  promptText,
  setPromptText,
  isGenerating,
  onGenerateBlueprint,
}: PromptModeProps) {
  const handleQuickAddClick = (key: string) => {
    const currentText = promptText.trim();
    if (!currentText) {
      setPromptText(key);
    } else {
      setPromptText(`${currentText}\n${key}`);
    }
  };

  const wordCount = promptText.trim() ? promptText.trim().split(/\s+/).length : 0;
  const charCount = promptText.length;

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header & Subtitle */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#C9A52A]" /> Project Brief
          </label>
          <span className="text-[10.5px] text-muted-foreground font-mono">
            {wordCount} words · {charCount} chars
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Describe the outcome, scope, deadline and team requirements.
        </p>
      </div>

      {/* Controlled Textarea */}
      <div className="relative rounded-2xl bg-background border border-border focus-within:border-[#C9A52A]/60 focus-within:ring-1 focus-within:ring-[#C9A52A]/20 transition-all shadow-2xs overflow-hidden">
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Build an AI-powered interview platform with authentication, company search, analytics and GitHub integration by 30 November."
          rows={6}
          className="w-full p-4 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none leading-relaxed resize-y"
        />
        <div className="px-4 py-2 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[10.5px] text-muted-foreground">
          <span>Include title, objective, target date, and key features.</span>
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

      {/* Quick Add Pills */}
      <div className="space-y-2 pt-1">
        <span className="text-[11px] font-bold text-muted-foreground block">Add to brief:</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ADD_PILLS.map((pill) => (
            <button
              key={pill.label}
              type="button"
              onClick={() => handleQuickAddClick(pill.key)}
              className="px-3 py-1 rounded-xl bg-card border border-border hover:border-[#C9A52A]/40 text-foreground font-bold text-[11px] transition-all cursor-pointer"
            >
              [{pill.label}]
            </button>
          ))}
        </div>
      </div>

      {/* Generate Blueprint CTA */}
      <div className="pt-3 border-t border-border/50 flex justify-end">
        <button
          type="button"
          disabled={isGenerating || !promptText.trim()}
          onClick={onGenerateBlueprint}
          className="px-6 h-[42px] rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs cursor-pointer shadow-xs hover:brightness-105 disabled:opacity-40 flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Blueprint...</span>
            </>
          ) : (
            <>
              <span>Generate Blueprint</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
