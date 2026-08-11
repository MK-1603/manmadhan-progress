import React from "react";
import { Folder } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProjectProgress({ projects }: { projects: any[] }) {
  const router = useRouter();

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Active Projects</h3>
        </div>
        <button 
          onClick={() => router.push("/personal/projects")}
          className="text-xs font-semibold px-3 py-1 rounded-full border border-border/50 text-foreground hover:bg-secondary/50 transition-colors"
        >
          View all
        </button>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm">
          No active projects found.
        </div>
      ) : (
        <div className="flex flex-col gap-6 mt-1 flex-1">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="flex flex-col group cursor-pointer -mx-3 px-3 py-2 hover:bg-secondary/30 rounded-lg transition-colors"
              onClick={() => router.push(`/personal/projects/${project.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                  <span className="text-sm font-bold text-foreground">{project.name}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{project.progress}%</span>
              </div>
              <div className="w-full h-1 bg-border/50 rounded-full mb-2 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${project.progress}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{project.completedTasks} / {project.totalTasks} tasks</span>
                <span className="text-xs font-semibold text-muted-foreground">Due: {project.deadline ? new Date(project.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No Date'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
