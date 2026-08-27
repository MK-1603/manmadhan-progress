"use client";

import React, { useState } from "react";
import { Wand2, HelpCircle, Zap, ChevronDown, ChevronUp, Loader2, ArrowRight, Check } from "lucide-react";

interface PromptModeProps {
  promptText: string;
  setPromptText: (text: string) => void;
  isGenerating: boolean;
  onGenerateBlueprint: () => void;
}

const QUICK_ADD_CHIPS = [
  { label: "+ Add All Structure", key: "ALL", primary: true },
  { label: "+ Title", key: "Title: " },
  { label: "+ Description", key: "Objective: " },
  { label: "+ Deadline", key: "Deadline: " },
  { label: "+ Priority", key: "Priority: High\n" },
  { label: "+ Requirements", key: "Requirements: " },
  { label: "+ Milestones", key: "Milestones: " },
  { label: "+ Members", key: "Members: " },
  { label: "+ GitHub", key: "GitHub: " },
  { label: "+ Tools", key: "Tools: " },
];

const PROMPT_EXAMPLES = [
  {
    title: "Full-Stack Web Application Mandate",
    tag: "Engineering",
    text: "Build a full-stack Web application with workspace authentication, organization hierarchy, project blueprints, billing integration, and team analytics. Priority High, Target deadline 60 days.",
  },
  {
    title: "AI & Automated Workflow Service",
    tag: "AI & Automation",
    text: "Develop an AI-powered automated workflow platform with natural language prompt processing, structured output verification, real-time socket updates, and GitHub sync. Priority Critical.",
  },
  {
    title: "Organization Operations & Resource Portal",
    tag: "Operations",
    text: "Construct a central organization management platform with member registration, approval workflows, QR verification, automated notifications, and executive reporting.",
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
      const template = `Title: New Organization Project
Objective: Define project mandate, core deliverables, and technical execution goals.
Deadline: 2026-11-30
Priority: High
Requirements: Multi-tenant RBAC permissions, real database transactions, GitHub sync.
Milestones: Foundation, Requirements, Architecture, Development, Security Audit, Deployment.
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

  const wordCount = promptText.trim() ? promptText.trim().split(/\s+/).length : 0;
  const charCount = promptText.length;

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Prompt Area Header & Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-extrabold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Wand2 className="w-4 h-4 text-[#C9A52A]" /> Natural Language Project Mandate
          </label>
          <span className="text-[10.5px] text-muted-foreground font-mono">
            {wordCount} words · {charCount} chars
          </span>
        </div>

        <div className="relative rounded-2xl bg-background border border-border focus-within:border-[#C9A52A]/60 focus-within:ring-2 focus-within:ring-[#C9A52A]/20 transition-all shadow-xs overflow-hidden">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Describe project mandate in plain language... (e.g., Build a web platform with auth, company search, analytics, and GitHub integration by 30 Nov. Assign CO-CEO as lead.)"
            rows={6}
            className="w-full p-4 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none leading-relaxed resize-y"
          />
          <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between text-[10.5px] text-muted-foreground">
            <span>Tip: Include title, objective, target date, and key features.</span>
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
      </div>

      {/* Structured Quick Add Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">Quick Add Prompt Helpers</p>
          <span className="text-[9.5px] text-muted-foreground">Click chip to insert key</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ADD_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleQuickAddClick(chip.key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                chip.primary
                  ? "bg-[#C9A52A]/15 border-[#C9A52A]/40 text-[#C9A52A] hover:bg-[#C9A52A] hover:text-black shadow-xs"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-[#C9A52A]/40"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Reference Guide */}
      <div className="border border-border rounded-2xl bg-card overflow-hidden text-xs shadow-xs">
        <button
          type="button"
          onClick={() => setShowQuickRef(!showQuickRef)}
          className="w-full px-4 py-3 flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-xs font-bold text-foreground">
            <HelpCircle className="w-4 h-4 text-[#C9A52A]" /> Prompt Structure Reference Guide
          </span>
          {showQuickRef ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showQuickRef && (
          <div className="p-4 border-t border-border space-y-3 text-[11px] bg-background">
            <p className="font-semibold text-foreground">The AI parser extracts the following structured parameters:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[10.5px]">
              <div className="p-3 bg-card rounded-xl border border-border space-y-1">
                <span className="font-bold text-[#C9A52A] block">• Title & Scope</span>
                <p className="text-muted-foreground">Specify clear project name and core mandate objective.</p>
              </div>
              <div className="p-3 bg-card rounded-xl border border-border space-y-1">
                <span className="font-bold text-blue-500 block">• Deadline & Priority</span>
                <p className="text-muted-foreground">Target completion date and Critical/High/Medium priority.</p>
              </div>
              <div className="p-3 bg-card rounded-xl border border-border space-y-1">
                <span className="font-bold text-emerald-500 block">• Member Assignments</span>
                <p className="text-muted-foreground">Assign CO-CEO execution lead and team members.</p>
              </div>
              <div className="p-3 bg-card rounded-xl border border-border space-y-1">
                <span className="font-bold text-purple-500 block">• Tech Stack & Tools</span>
                <p className="text-muted-foreground">List tools, framework requirements, and GitHub repo link.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Realistic Examples Accordion */}
      <div className="border border-border rounded-2xl bg-card overflow-hidden text-xs shadow-xs">
        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="w-full px-4 py-3 flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Zap className="w-4 h-4 text-purple-500" /> Production Prompt Mandates
          </span>
          {showExamples ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showExamples && (
          <div className="p-4 border-t border-border bg-background space-y-2.5">
            {PROMPT_EXAMPLES.map((ex, idx) => (
              <div key={idx} className="p-3.5 bg-card rounded-xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors hover:border-[#C9A52A]/40">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-xs">{ex.title}</p>
                    <span className="px-2 py-0.5 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] text-[9.5px] font-bold border border-[#C9A52A]/20">
                      {ex.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{ex.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPromptText(ex.text)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#C9A52A]/15 border border-[#C9A52A]/30 text-[#C9A52A] hover:bg-[#C9A52A] hover:text-black font-bold text-[10.5px] transition-all cursor-pointer shrink-0"
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
          className="px-6 h-[44px] rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-md hover:brightness-105 flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Prompt & Building Blueprint...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Generate Project Blueprint</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
