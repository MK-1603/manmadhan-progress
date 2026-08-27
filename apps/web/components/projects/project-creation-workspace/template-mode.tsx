"use client";

import React, { useState, useMemo } from "react";
import { PROJECT_TEMPLATES, ProjectTemplate } from "./templates-data";
import { Check, ChevronRight, Layers, FileText } from "lucide-react";

interface TemplateModeProps {
  selectedTemplateId: string;
  onSelectTemplate: (template: ProjectTemplate) => void;
}

const CATEGORIES = ["All", "Product", "AI", "Engineering", "Business", "Academic"];

export function TemplateMode({ selectedTemplateId, onSelectTemplate }: TemplateModeProps) {
  const [activeCategory, setActiveCategory] = useState("All");

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
          const taskCount = tmpl.milestones.reduce((acc, m) => acc + m.tasks.length, 0);
          const docCount = 8; // Approved default document requirements count

          return (
            <div
              key={tmpl.id}
              onClick={() => onSelectTemplate(tmpl)}
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

              {/* Template Metrics & Features */}
              <div className="space-y-2 pt-2 border-t border-border/60 text-[10.5px]">
                <div className="grid grid-cols-3 gap-1 text-muted-foreground font-semibold">
                  <span>{tmpl.milestones.length} milestones</span>
                  <span>{taskCount} tasks</span>
                  <span className="text-right">{docCount} doc reqs</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground font-mono">Storage: 0 MB (Requirements only)</span>
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
  );
}
