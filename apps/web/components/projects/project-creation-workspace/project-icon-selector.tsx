"use client";

import React from "react";
import {
  FolderKanban, Sparkles, LayoutTemplate, Code, Shield,
  Rocket, Cpu, Globe, Database, Layers
} from "lucide-react";

export const PROJECT_ICONS = [
  { id: "FolderKanban", label: "Folder", Icon: FolderKanban },
  { id: "Sparkles", label: "Sparkles", Icon: Sparkles },
  { id: "LayoutTemplate", label: "Template", Icon: LayoutTemplate },
  { id: "Code", label: "Code", Icon: Code },
  { id: "Shield", label: "Shield", Icon: Shield },
  { id: "Rocket", label: "Rocket", Icon: Rocket },
  { id: "Cpu", label: "AI / Tech", Icon: Cpu },
  { id: "Globe", label: "Web", Icon: Globe },
  { id: "Database", label: "Data", Icon: Database },
  { id: "Layers", label: "Layers", Icon: Layers },
];

interface ProjectIconSelectorProps {
  selectedIcon: string;
  onSelectIcon: (iconId: string) => void;
}

export function ProjectIconSelector({ selectedIcon, onSelectIcon }: ProjectIconSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-extrabold text-[#C9A52A] uppercase tracking-wider">
        Project Icon
      </label>
      <div className="flex items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
        {PROJECT_ICONS.map(({ id, label, Icon }) => {
          const isSelected = selectedIcon === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectIcon(id)}
              className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? "border-[#C9A52A] bg-[#C9A52A]/10 text-[#C9A52A] ring-1 ring-[#C9A52A]"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-[#C9A52A]/40"
              }`}
              title={label}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[11px]">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
