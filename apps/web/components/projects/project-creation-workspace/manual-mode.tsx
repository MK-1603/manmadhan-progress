"use client";

import React from "react";
import { FolderKanban, Calendar, Flag, UserCheck, Users, Github, Wrench, FileText } from "lucide-react";

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
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FolderKanban className="w-3.5 h-3.5 text-amber-600 dark:text-gold" /> Project Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Enterprise AI Platform / Modern SaaS Application"
          className="w-full h-[40px] px-3.5 bg-background border border-border focus:border-amber-500/50 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Objective & Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detail core project objective, mandate, and expected deliverables..."
          rows={4}
          className="w-full p-3.5 bg-background border border-border focus:border-amber-500/50 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all resize-y leading-relaxed"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-amber-500" /> Priority Level
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full h-[40px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="Critical">Critical Priority</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" /> Target Deadline
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full h-[40px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-amber-500/50 cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Github className="w-3.5 h-3.5 text-purple-500" /> GitHub Repository URL
          </label>
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/org/repo"
            className="w-full h-[40px] px-3.5 bg-background border border-border focus:border-amber-500/50 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-emerald-500" /> Tools & Tech Stack
          </label>
          <input
            type="text"
            value={toolsText}
            onChange={(e) => setToolsText(e.target.value)}
            placeholder="e.g. Next.js, TypeScript, PostgreSQL, Tailwind"
            className="w-full h-[40px] px-3.5 bg-background border border-border focus:border-amber-500/50 rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all"
          />
        </div>
      </div>
    </div>
  );
}
