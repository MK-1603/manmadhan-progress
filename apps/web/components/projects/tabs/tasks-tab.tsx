"use client";

import { Calendar as CalIcon, Flag, GripVertical } from "lucide-react";

export function ProjectTasksTab({ project }: { project: any }) {
  const COLUMNS = ["Draft", "Assigned", "Accepted", "In Progress", "Blocked", "Review", "Approved", "Completed", "Archived"];

  const groupedTasks = COLUMNS.reduce((acc, col) => {
    acc[col] = project.tasks?.filter((t: any) => t.status === col) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="h-full w-full relative">
      <div className="absolute inset-0 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {COLUMNS.map(column => {
          const tasks = groupedTasks[column] || [];
          if (tasks.length === 0 && column !== "In Progress" && column !== "Draft" && column !== "Completed") return null;

          return (
            <section 
              key={column} 
              className="w-[320px] shrink-0 flex flex-col bg-card/50 rounded-2xl border border-border overflow-hidden shadow-sm"
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card shrink-0">
                <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary" /> {column}
                </h2>
                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {tasks.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {tasks.map(task => (
                  <article 
                    key={task.id} 
                    className="group bg-background rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-all hover:border-primary/30"
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors text-foreground">
                        {task.title}
                      </h3>
                      <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      {task.priority && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1
                          ${task.priority === 'High' || task.priority === 'Urgent' ? 'bg-rose-500/10 text-rose-500' : 
                            task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 
                            'bg-emerald-500/10 text-emerald-500'}
                        `}>
                          <Flag className="w-2.5 h-2.5" /> {task.priority}
                        </span>
                      )}
                      
                      {task.deadline && (
                        <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                          <CalIcon className="w-2.5 h-2.5" /> {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  );
}
