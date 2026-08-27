"use client";

import React, { useState } from "react";
import { PROJECT_TEMPLATES, ProjectTemplate } from "./templates-data";
import { Code2, Cpu, Rocket, BookOpen, GraduationCap, Megaphone, Sparkles, Check, ChevronRight, Flag, Layers } from "lucide-react";

interface TemplateModeProps {
  selectedTemplateId: string;
  onSelectTemplate: (template: ProjectTemplate) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Code2: <Code2 className="w-5 h-5 text-blue-500" />,
  Cpu: <Cpu className="w-5 h-5 text-purple-500" />,
  Rocket: <Rocket className="w-5 h-5 text-[#C9A52A]" />,
  BookOpen: <BookOpen className="w-5 h-5 text-emerald-500" />,
  GraduationCap: <GraduationCap className="w-5 h-5 text-indigo-500" />,
  Megaphone: <Megaphone className="w-5 h-5 text-rose-500" />,
  Sparkles: <Sparkles className="w-5 h-5 text-[#C9A52A]" />,
};

export function TemplateMode({ selectedTemplateId, onSelectTemplate }: TemplateModeProps) {
  const [activePreviewId, setActivePreviewId] = useState<string>(selectedTemplateId || "software-product");

  const previewTemplate = PROJECT_TEMPLATES.find((t) => t.id === activePreviewId) || PROJECT_TEMPLATES[0];

  return (
    <div className="space-y-5 font-sans">
      <div className="space-y-1">
        <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#C9A52A]" /> Select Executive Project Template
        </h3>
        <p className="text-[11px] text-muted-foreground">Choose a data-driven engineering or organizational framework blueprint.</p>
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
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                isSelected
                  ? "bg-[#C9A52A]/10 border-[#C9A52A] shadow-[0_0_20px_rgba(201,165,42,0.15)] ring-1 ring-[#C9A52A]/40"
                  : isPreviewing
                  ? "bg-card border-border shadow-sm"
                  : "bg-card/60 border-border hover:border-[#C9A52A]/40 hover:bg-card"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center shadow-xs">
                    {ICON_MAP[tmpl.iconName] || <Sparkles className="w-5 h-5 text-[#C9A52A]" />}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-[9.5px] font-extrabold uppercase tracking-wider border border-border">
                    {tmpl.badgeText}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-foreground">{tmpl.title}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mt-1">{tmpl.subtitle}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-semibold flex items-center gap-1 font-mono text-[10.5px]">
                  <Flag className="w-3.5 h-3.5 text-[#C9A52A]" /> {tmpl.milestones.length} Milestones
                </span>

                {isSelected ? (
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#C9A52A] text-black text-[10px] font-extrabold flex items-center gap-1 shadow-xs">
                    <Check className="w-3 h-3 stroke-[2.5]" /> Selected
                  </span>
                ) : (
                  <span className="text-[#C9A52A] font-bold text-[11px] flex items-center gap-0.5 hover:underline">
                    Configure <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Template Structure Preview */}
      {previewTemplate && (
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <span className="text-[10px] font-extrabold text-[#C9A52A] uppercase tracking-wider">Structure Preview</span>
              <h4 className="text-sm font-bold text-foreground mt-0.5">{previewTemplate.title} Blueprint Framework</h4>
            </div>
            <button
              type="button"
              onClick={() => onSelectTemplate(previewTemplate)}
              className="px-5 h-[38px] rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs transition-all hover:brightness-105 cursor-pointer shadow-md flex items-center justify-center gap-1.5 self-start sm:self-auto"
            >
              <span>Use {previewTemplate.title} Blueprint</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{previewTemplate.description}</p>

          <div className="space-y-2.5">
            <h5 className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Milestone Gate Hierarchy</span>
              <span className="font-mono text-muted-foreground">{previewTemplate.milestones.length} Phases</span>
            </h5>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {previewTemplate.milestones.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-background border border-border space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs">{m.name}</span>
                    <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground font-mono text-[10px]">
                      {m.tasks.length} Action Items
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
