"use client";

import { Calendar, Target, Flag, CheckSquare, Clock } from "lucide-react";

export function ProjectOverviewTab({ project }: { project: any }) {
  const completedTasks = project.tasks?.filter((t: any) => t.status === "Completed").length || 0;
  const totalTasks = project.tasks?.length || 0;
  
  const completedMilestones = project.milestones?.filter((m: any) => m.status === "Completed").length || 0;
  const totalMilestones = project.milestones?.length || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      
      {/* Left Column: Details & Stats */}
      <div className="lg:col-span-2 space-y-6">
        <section className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" /> Objective
          </h2>
          <p className="text-sm mt-3 text-foreground leading-relaxed">
            {project.goal || project.objective || "No primary objective defined for this project."}
          </p>
          
          {project.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            </div>
          )}
        </section>

        <section className="bg-card rounded-2xl p-6 shadow-sm border border-border">
           <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Execution Progress
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Task Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold text-foreground">{completedTasks} <span className="text-sm text-muted-foreground font-semibold">/ {totalTasks}</span></div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Tasks Completed</div>
                </div>
                <div className="text-sm font-bold text-primary">
                  {totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0}%
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${totalTasks > 0 ? (completedTasks/totalTasks)*100 : 0}%` }} />
              </div>
            </div>

            {/* Milestone Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold text-foreground">{completedMilestones} <span className="text-sm text-muted-foreground font-semibold">/ {totalMilestones}</span></div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Milestones Reached</div>
                </div>
                <div className="text-sm font-bold text-emerald-500">
                  {totalMilestones > 0 ? Math.round((completedMilestones/totalMilestones)*100) : 0}%
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${totalMilestones > 0 ? (completedMilestones/totalMilestones)*100 : 0}%` }} />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: Key Meta */}
      <div className="space-y-6">
        <section className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">Key Dates</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Start Date</p>
                <p className="text-sm font-semibold text-foreground">
                  {project.startDate ? new Date(project.startDate).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <Flag className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-500 uppercase">Deadline</p>
                <p className="text-sm font-bold text-foreground">
                  {project.deadline ? new Date(project.deadline).toLocaleDateString() : "No deadline"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Overall Health</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50 border border-border">
              <span className="text-sm font-semibold">System Health</span>
              <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                ${(project.health || 'Healthy') === 'Healthy' ? 'bg-emerald-500/10 text-emerald-500' : 
                  (project.health || 'Healthy') === 'At Risk' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {project.health || 'Healthy'}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50 border border-border">
              <span className="text-sm font-semibold">Tracked Time</span>
              <span className="text-sm font-bold text-foreground">
                0h 0m
              </span>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
