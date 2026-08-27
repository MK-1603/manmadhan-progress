"use client";

import React, { useState } from "react";
import { PROJECT_TEMPLATES, ProjectTemplate } from "./templates-data";
import { Code2, Cpu, Rocket, BookOpen, GraduationCap, Megaphone, Sparkles, Check, ChevronRight, Layers, Flag } from "lucide-react";

interface TemplateModeProps {
  selectedTemplateId: string;
  onSelectTemplate: (template: ProjectTemplate) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Code2: <Code2 className="w-5 h-5 text-blue-500" />,
  Cpu: <Cpu className="w-5 h-5 text-purple-500" />,
  Rocket: <Rocket className="w-5 h-5 text-amber-500" />,
  BookOpen: <BookOpen className="w-5 h-5 text-emerald-500" />,
  GraduationCap: <GraduationCap className="w-5 h-5 text-indigo-500" />,
  Megaphone: <Megaphone className="w-5 h-5 text-rose-500" />,
  Sparkles: <Sparkles className="w-5 h-5 text-amber-600 dark:text-gold" />,
};

export function TemplateMode({ selectedTemplateId, onSelectTemplate }: TemplateModeProps) {
  const [activePreviewId, setActivePreviewId] = useState<string>(selectedTemplateId || "software-product");

  const previewTemplate = PROJECT_TEMPLATES.find((t) => t.id === activePreviewId) || PROJECT_TEMPLATES[0];

  return (
    <div className="space-y-5 font-sans">
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Select Project Template</h3>
        <p className="text-[11px] text-muted-foreground">Choose a data-driven engineering or organizational template framework.</p>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROJECT_TEMPLATES.map((tmpl) => {
          const isSelected = selectedTemplateId === tmpl.id;
          const isPreviewing = activePreviewId === tmpl.id;

          return (
            <div
              key={tmpl.id}
              onClick={() => {
                setActivePreviewId(tmpl.id);
                onSelectTemplate(tmpl);
              }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                isSelected
                  ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/30 shadow-md"
                  : isPreviewing
                  ? "bg-card border-border shadow-sm"
                  : "bg-card/50 border-border hover:border-amber-500/40 hover:bg-card"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center">
                    {ICON_MAP[tmpl.iconName] || <Sparkles className="w-5 h-5 text-amber-500" />}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-extrabold uppercase tracking-wider">
                    {tmpl.badgeText}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-foreground">{tmpl.title}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">{tmpl.subtitle}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-semibold flex items-center gap-1">
                  <Flag className="w-3.5 h-3.5 text-amber-600 dark:text-gold" /> {tmpl.milestones.length} Milestones
                </span>

                {isSelected ? (
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-white dark:bg-gold dark:text-black text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Selected
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-gold font-bold flex items-center gap-0.5">
                    Configure <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Template Structure Preview */}
      {previewTemplate && (
        <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-gold uppercase tracking-wider">Structure Preview</span>
              <h4 className="text-sm font-bold text-foreground">{previewTemplate.title} Framework</h4>
            </div>
            <button
              type="button"
              onClick={() => onSelectTemplate(previewTemplate)}
              className="px-4 py-1.5 rounded-lg bg-amber-500 text-white dark:bg-gold dark:text-black font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              Use {previewTemplate.title} Blueprint
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{previewTemplate.description}</p>

          <div className="space-y-2">
            <h5 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Milestone Gate Hierarchy</h5>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {previewTemplate.milestones.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl bg-background border border-border space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{m.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{m.tasks.length} Initial Tasks</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
