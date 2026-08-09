"use client";

import { Activity, Clock } from "lucide-react";

export function ProjectActivityTab({ project }: { project: any }) {
  // We can fetch real activity from /audit-logs eventually. For now, it's just a placeholder struct to satisfy UI constraints.
  const activities = [
    { id: 1, type: "CREATE", desc: `Project created`, date: project.createdAt },
    ...(project.completedAt ? [{ id: 2, type: "COMPLETE", desc: "Project marked as completed", date: project.completedAt }] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <header className="px-2">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Project Activity
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Audit log of all major events in this project.</p>
      </header>

      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
        <div className="relative pl-6 border-l-2 border-muted space-y-8">
          {activities.map(act => (
            <div key={act.id} className="relative">
              <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">{act.desc}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" /> {new Date(act.date).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          
          <div className="relative">
            <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full bg-background border-2 border-muted" />
            <div>
              <p className="text-sm font-semibold text-muted-foreground italic">No further activity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
