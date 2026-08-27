"use client";

import React, { useState } from "react";
import { Sparkles, HelpCircle, Zap, Command, ChevronDown, ChevronUp, Loader2, ArrowRight } from "lucide-react";

interface PromptModeProps {
  promptText: string;
  setPromptText: (text: string) => void;
  isGenerating: boolean;
  onGenerateBlueprint: () => void;
}

const QUICK_ADD_CHIPS = [
  { label: "Add All", key: "ALL", primary: true },
  { label: "+ Title", key: "Title: " },
  { label: "+ Description", key: "Objective: " },
  { label: "+ Deadline", key: "Deadline: " },
  { label: "+ Requirements", key: "Requirements: " },
  { label: "+ Milestones", key: "Milestones: " },
  { label: "+ Members", key: "Members: " },
  { label: "+ GitHub", key: "GitHub: " },
  { label: "+ Tools", key: "Tools: " },
];

const PROMPT_EXAMPLES = [
  {
    title: "AI Interview Experience Platform",
    text: "Build an AI-powered interview experience platform for students. Include authentication, experience submissions, company search, interview questions, analytics, and GitHub integration. Priority High, Deadline 30 November 2026. Assign CO-CEO Arun as execution lead.",
  },
  {
    title: "Multi-Tenant B2B SaaS Platform",
    text: "Create a SaaS task management application with workspace authentication, organization hierarchy, project blueprints, Stripe billing integration, and team analytics. Target deadline 60 days.",
  },
  {
    title: "College Event Management Portal",
    text: "Build a college event management platform with student registration, approval workflows, QR code tickets, automated notifications, and final reporting. Priority High.",
  },
];

export function PromptMode({
  promptText,
  setPromptText,
  isGenerating,
  onGenerateBlueprint,
}: PromptModeProps) {
  const [showQuickRef, setShowQuickRef] = useState(false);
  const [showExamples, setShowExamples] = useState(true);

  const handleQuickAddClick = (key: string) => {
    if (key === "ALL") {
      const template = `Project Title: Enterprise AI Platform
Objective: Build scalable AI interview and execution operating system with real-time telemetry.
Deadline: 2026-11-30
Priority: High
Requirements: Multi-tenant RBAC, real database transactions, GitHub sync.
Milestones: Foundation, Requirements, Architecture, Development, Testing, Deployment.
Tools: Next.js, TypeScript, Node.js, PostgreSQL, GitHub.`;
      setPromptText(template);
      return;
    }

    const currentText = promptText.trim();
    if (!currentText) {
      setPromptText(key);
    } else {
      setPromptText(`${currentText}\n${key}`);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-gold" /> Natural Language Mandate
          </label>
          <span className="text-[11px] text-muted-foreground">Type prompt or select helpers below</span>
        </div>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Describe project mandate in plain language... (e.g., Build an AI interview platform with auth, company search, analytics, and GitHub integration by 30 Nov.)"
          rows={6}
          className="w-full p-3.5 bg-background border border-border focus:border-amber-500/50 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all leading-relaxed resize-y shadow-xs"
        />
      </div>

      {/* Structured Quick Add Chips */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quick Add Prompt Helpers</p>
          <span className="text-[9.5px] text-muted-foreground">Click chip to append key</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ADD_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleQuickAddClick(chip.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                chip.primary
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-gold hover:bg-amber-500 hover:text-white dark:hover:text-black"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-amber-500/40"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Reference Guide */}
      <div className="border border-border rounded-xl bg-muted/20 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setShowQuickRef(!showQuickRef)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11.5px] font-bold">
            <HelpCircle className="w-4 h-4 text-amber-600 dark:text-gold" /> Quick Reference Guide
          </span>
          {showQuickRef ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showQuickRef && (
          <div className="p-3 border-t border-border space-y-2 text-[11px] text-muted-foreground bg-background">
            <p className="font-semibold text-foreground">Include any of the following structured parameters in your prompt:</p>
            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="p-2 bg-card rounded-lg border border-border">
                <span className="font-bold text-amber-600 dark:text-gold">• Project Title & Scope</span>
                <p>Define clear project title and core objective.</p>
              </div>
              <div className="p-2 bg-card rounded-lg border border-border">
                <span className="font-bold text-blue-500">• Deadline & Priority</span>
                <p>Specify date (e.g. 30 Nov 2026) and High/Critical priority.</p>
              </div>
              <div className="p-2 bg-card rounded-lg border border-border">
                <span className="font-bold text-emerald-500">• Member Assignments</span>
                <p>Mention team members or CO-CEO execution lead.</p>
              </div>
              <div className="p-2 bg-card rounded-lg border border-border">
                <span className="font-bold text-purple-500">• Tools & GitHub</span>
                <p>Include tech stack tools and repo link.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Examples Accordion */}
      <div className="border border-border rounded-xl bg-muted/20 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11.5px] font-bold">
            <Zap className="w-4 h-4 text-purple-500" /> Realistic Prompt Examples
          </span>
          {showExamples ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showExamples && (
          <div className="p-3 border-t border-border bg-background space-y-2 text-[11px]">
            {PROMPT_EXAMPLES.map((ex, idx) => (
              <div key={idx} className="p-3 bg-card rounded-xl border border-border flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="font-bold text-foreground text-[12px]">{ex.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{ex.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPromptText(ex.text)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-gold hover:bg-amber-500 hover:text-white dark:hover:text-black font-bold text-[10.5px] transition-colors cursor-pointer shrink-0"
                >
                  Use Example
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Blueprint CTA Button */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onGenerateBlueprint}
          disabled={!promptText.trim() || isGenerating}
          className="px-6 h-[42px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white dark:bg-gold dark:hover:bg-gold/90 dark:text-black font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-lg flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Blueprint...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Project Blueprint</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
