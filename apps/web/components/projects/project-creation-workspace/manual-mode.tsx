"use client";

import React from "react";
import { FolderKanban, Calendar, Flag, Github, Wrench, FileText, Lock } from "lucide-react";

interface ManualModeProps {
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  priority: "Critical" | "High" | "Medium" | "Low";
  setPriority: (val: "Critical" | "High" | "Medium" | "Low") => void;
  deadline: string;
  setDeadline: (val: string) => void;
  githubUrl: string;
  setGithubUrl: (val: string) => void;
  toolsText: string;
  setToolsText: (val: string) => void;
}

export function ManualMode({
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  deadline,
  setDeadline,
  githubUrl,
  setGithubUrl,
  toolsText,
  setToolsText,
}: ManualModeProps) {
  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="p-3.5 rounded-2xl bg-[#C9A52A]/10 border border-[#C9A52A]/25 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#C9A52A]" />
          <span className="font-bold text-foreground">Ownership Enforcement:</span>
          <span className="text-muted-foreground">Project Owner is permanently set to CEO 🔒</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FolderKanban className="w-4 h-4 text-[#C9A52A]" /> Project Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Enterprise AI Platform / Modern SaaS Application"
          className="w-full h-[42px] px-4 bg-background border border-border focus:border-[#C9A52A]/60 focus:ring-2 focus:ring-[#C9A52A]/20 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all shadow-xs"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-muted-foreground" /> Objective & Scope Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detail core project objective, mandate deliverables, and technical execution goals..."
          rows={4}
          className="w-full p-4 bg-background border border-border focus:border-[#C9A52A]/60 focus:ring-2 focus:ring-[#C9A52A]/20 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all resize-y leading-relaxed shadow-xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Flag className="w-4 h-4 text-[#C9A52A]" /> Priority Level
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full h-[42px] px-3.5 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]/60 cursor-pointer shadow-xs font-semibold"
          >
            <option value="Critical">Critical Priority</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-500" /> Target Deadline
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full h-[42px] px-3.5 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]/60 cursor-pointer shadow-xs font-semibold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Github className="w-4 h-4 text-purple-500" /> GitHub Repository URL
          </label>
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/org/repository (Optional)"
            className="w-full h-[42px] px-4 bg-background border border-border focus:border-[#C9A52A]/60 focus:ring-2 focus:ring-[#C9A52A]/20 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all shadow-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-emerald-500" /> Tech Stack / Tools
          </label>
          <input
            type="text"
            value={toolsText}
            onChange={(e) => setToolsText(e.target.value)}
            placeholder="Next.js, TypeScript, PostgreSQL, Tailwind CSS"
            className="w-full h-[42px] px-4 bg-background border border-border focus:border-[#C9A52A]/60 focus:ring-2 focus:ring-[#C9A52A]/20 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all shadow-xs"
          />
        </div>
      </div>
    </div>
  );
}
