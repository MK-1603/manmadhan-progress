"use client";

import React, { useState, useMemo } from "react";
import { PROJECT_TEMPLATES, ProjectTemplate } from "./templates-data";
import { Check, ChevronRight, Layers, FileText } from "lucide-react";

interface TemplateModeProps {
  selectedTemplateId: string;
  onSelectTemplate: (template: ProjectTemplate) => void;
  substep: "CHOOSE" | "CONFIGURE";
  setSubstep: (step: "CHOOSE" | "CONFIGURE") => void;
  onProceedToAssignment: () => void;
}

const CATEGORIES = ["All", "Product", "AI", "Engineering", "Business", "Academic"];

export function TemplateMode({
  selectedTemplateId,
  onSelectTemplate,
  substep,
  setSubstep,
  onProceedToAssignment,
}: TemplateModeProps) {
  const [activeCategory, setActiveCategory] = useState("All");

  const selectedTemplate = useMemo(() => {
    return PROJECT_TEMPLATES.find((t) => t.id === selectedTemplateId) || PROJECT_TEMPLATES[0];
  }, [selectedTemplateId]);

  const filteredTemplates = useMemo(() => {
    if (activeCategory === "All") return PROJECT_TEMPLATES;
    const cat = activeCategory.toLowerCase();
    return PROJECT_TEMPLATES.filter((t) => {
      const text = (t.title + " " + t.subtitle + " " + t.badgeText + " " + t.description).toLowerCase();
      if (cat === "product") return text.includes("product") || text.includes("saas") || text.includes("web") || text.includes("mobile");
      if (cat === "ai") return text.includes("ai") || text.includes("ml") || text.includes("agent") || text.includes("automation");
      if (cat === "engineering") return text.includes("api") || text.includes("backend") || text.includes("devops") || text.includes("migration") || text.includes("software");
      if (cat === "business") return text.includes("business") || text.includes("marketing") || text.includes("event") || text.includes("operations");
      if (cat === "academic") return text.includes("academic") || text.includes("research") || text.includes("college");
      return true;
    });
  }, [activeCategory]);

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Template Substep Progress Strip */}
      <div className="flex items-center gap-2 pb-2 border-b border-border text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setSubstep("CHOOSE")}
          className={`px-3 py-1 rounded-lg cursor-pointer ${
            substep === "CHOOSE" ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          01 Choose Template
        </button>
        <span className="text-border">→</span>
        <button
          type="button"
          onClick={() => setSubstep("CONFIGURE")}
          className={`px-3 py-1 rounded-lg cursor-pointer ${
            substep === "CONFIGURE" ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          02 Configure Blueprint
        </button>
      </div>

      {/* ── SUBSTEP 1: CHOOSE TEMPLATE ───────────────────────────────────────── */}
      {substep === "CHOOSE" && (
        <div className="space-y-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-border">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-[#C9A52A] text-[#0B0D10] shadow-2xs"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Template Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTemplates.map((tmpl) => {
              const isSelected = selectedTemplateId === tmpl.id;
              const docCount = tmpl.documents.length || 5;

              return (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    onSelectTemplate(tmpl);
                    setSubstep("CONFIGURE");
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                    isSelected
                      ? "bg-[#C9A52A]/10 border-[#C9A52A] ring-1 ring-[#C9A52A]/40 shadow-2xs"
                      : "bg-card border-border hover:border-[#C9A52A]/40 hover:bg-card/80"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-foreground">{tmpl.title}</h4>
                      <span className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-[10px] font-extrabold uppercase tracking-wider border border-border">
                        {tmpl.badgeText}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{tmpl.subtitle}</p>
                  </div>

                  {/* Metrics */}
                  <div className="space-y-2 pt-2 border-t border-border/60 text-[10.5px]">
                    <div className="flex items-center justify-between text-muted-foreground font-semibold">
                      <span>{tmpl.category}</span>
                      <span>{docCount} document reqs</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground font-mono">Storage: 0 MB</span>
                      {isSelected ? (
                        <span className="px-2.5 py-1 rounded-lg bg-[#C9A52A] text-[#0B0D10] text-[10.5px] font-extrabold inline-flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[2.5]" /> Selected
                        </span>
                      ) : (
                        <span className="text-[#C9A52A] font-bold text-[11px] inline-flex items-center gap-0.5 hover:underline">
                          Configure <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUBSTEP 2: CONFIGURE BLUEPRINT ───────────────────────────────────── */}
      {substep === "CONFIGURE" && selectedTemplate && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <span className="text-[10px] font-extrabold text-[#C9A52A] uppercase tracking-wider block">Selected Template</span>
                <h4 className="text-sm font-bold text-foreground">{selectedTemplate.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSubstep("CHOOSE")}
                className="text-[11px] text-[#C9A52A] font-bold hover:underline"
              >
                Change Template
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{selectedTemplate.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-muted-foreground block font-semibold">Category</span>
                <span className="font-bold text-foreground">{selectedTemplate.category}</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold">Recommended Priority</span>
                <span className="font-bold text-amber-500">{selectedTemplate.recommendedPriority}</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold">Recommended Tools</span>
                <span className="font-bold text-foreground">{selectedTemplate.tools.join(", ")}</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold">Document Requirements</span>
                <span className="font-bold text-foreground">{selectedTemplate.documents.length} Requirements (0 MB)</span>
              </div>
            </div>
          </div>

          {/* Initial Assignment Notice */}
          <div className="p-3.5 rounded-xl bg-background border border-border space-y-1 text-xs">
            <span className="font-bold text-foreground block">Non-Assignment Enforcement:</span>
            <p className="text-[11px] text-muted-foreground">
              Selecting this template configures project structure only. CO-CEO Lead, Execution Lead, and Members remain <strong className="text-foreground">Unassigned</strong> until explicitly chosen in Step 2 Assignment.
            </p>
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setSubstep("CHOOSE")}
              className="px-4 py-2 rounded-xl border border-border text-foreground font-bold cursor-pointer hover:bg-muted"
            >
              ← Back to Choose
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
