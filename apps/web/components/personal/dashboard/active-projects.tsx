import React from "react";
import { Plus } from "lucide-react";
import Link from "next/link";

export interface DashboardProjectPulse {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  completedTasks: number;
  remainingTasks: number;
  totalTasks: number;
  deadline?: string;
}

interface ActiveProjectsProps {
  projects?: DashboardProjectPulse[];
  className?: string;
}

const PROJECT_COLORS = ["#D4AF37", "#3B82F6", "#22C55E", "#A855F7", "#F97316"];

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

export function ActiveProjects({ projects = [], className = "" }: ActiveProjectsProps) {
  const display = projects.slice(0, 3);

  return (
    <div className={`bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col h-full transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">
          Active Projects
        </span>
        <Link href="/personal/projects" className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
          View all
        </Link>
      </div>

      <div className="flex flex-col gap-5 flex-1">
        {display.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
            <p className="text-[13px] font-semibold text-foreground">No active projects</p>
            <p className="text-[12px] text-muted-foreground">You have no ongoing projects.</p>
          </div>
        ) : (
          display.map((p, i) => {
            const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
            return (
              <div key={p.id || i} className="flex items-center gap-4">
                <div
                  className="w-9 h-9 rounded-xl flex shrink-0 items-center justify-center text-[12px] font-bold border border-border"
                  style={{ color }}
                >
                  {initials(p.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[13.5px] font-semibold text-foreground truncate">{p.name}</p>
                    <span className="text-[12px] font-semibold text-foreground ml-2">{p.progress}%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mb-2">
                    {p.description || `${p.completedTasks} of ${p.totalTasks} tasks`}
                  </p>
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p.progress}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Link
        href="/personal/projects"
        className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        New Project
      </Link>
    </div>
  );
}
