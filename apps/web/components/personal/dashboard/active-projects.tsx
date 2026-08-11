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

export function ActiveProjects({ projects = [], className = "" }: ActiveProjectsProps) {
  // If no projects provided or empty, show placeholders to keep layout intact for first render, 
  // but if explicitly empty, show empty state.
  const displayProjects = projects.length > 0 ? projects.slice(0, 3) : [];

  const getColor = (i: number) => {
    const colors = ["#D99A00", "#3B82F6", "#22C55E", "#A855F7", "#EF4444"];
    return colors[i % colors.length];
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#242424] rounded-[14px] p-6 flex flex-col h-full shadow-sm dark:shadow-none transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
          ACTIVE PROJECTS
        </h2>
        <Link href="/personal/projects" className="text-[12px] font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors">
          View all
        </Link>
      </div>

      <div className="flex flex-col gap-5 flex-1 justify-start">
        {displayProjects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h3 className="text-[14px] font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">No active projects</h3>
            <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA]">You are not working on any projects right now.</p>
          </div>
        ) : (
          displayProjects.map((p, i) => {
            const color = getColor(i);
            return (
              <div key={p.id || i} className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-lg flex flex-shrink-0 items-center justify-center font-bold text-[14px] border border-[#E5E7EB] dark:border-[#242424]"
                  style={{ color }}
                >
                  {getInitials(p.name)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[14px] font-bold text-[#171717] dark:text-[#F5F5F5] truncate">
                      {p.name}
                    </p>
                    <span className="text-[13px] font-semibold text-[#171717] dark:text-[#F5F5F5] ml-2">
                      {p.progress}%
                    </span>
                  </div>
                  <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA] truncate mb-2">
                    {p.description || `${p.completedTasks} of ${p.totalTasks} tasks completed`}
                  </p>
                  
                  <div className="w-full h-1.5 bg-[#F3F4F6] dark:bg-[#1D1D1D] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${p.progress}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Link href="/personal/projects" className="mt-6 flex items-center justify-center w-full gap-2 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#242424] text-[13px] font-semibold text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] hover:bg-[#F3F4F6] dark:hover:bg-[#1D1D1D] transition-colors mt-auto">
        <Plus className="w-4 h-4" />
        New Project
      </Link>
    </div>
  );
}
