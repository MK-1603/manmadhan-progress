import React from "react";
import { Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import apiClient from "@/lib/api-client";

export function ExecutionPlan({ priorities, onAction }: { priorities: any[], onAction: () => void }) {
  const router = useRouter();

  const handleTaskClick = (taskId: string) => {
    // Open the actual task detail page
    router.push(`/personal/tasks/${taskId}`);
  };

  const totalDuration = priorities?.reduce((acc, task) => acc + (task.estimatedMinutes || 0), 0) || 0;
  const totalHours = Math.floor(totalDuration / 60);
  const totalMinutes = totalDuration % 60;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Today's Plan</h3>
        </div>
        <button 
          onClick={() => router.push("/personal/tasks")}
          className="text-xs font-semibold px-3 py-1 rounded-full border border-border/50 text-foreground hover:bg-secondary/50 transition-colors"
        >
          View all
        </button>
      </div>

      {!priorities || priorities.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm">
          No tasks scheduled for today.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1 flex-1">
            {priorities.map((task) => {
              const isCompleted = task.status === "Completed";
              const isInProgress = task.status === "In Progress" || task.status === "RUNNING";
              
              const timeString = task.deadline 
                ? format(new Date(task.deadline), "HH:mm") 
                : "--:--";

              return (
                <div 
                  key={task.id} 
                  className="group flex items-center justify-between py-2.5 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : isInProgress ? 'bg-amber-500' : 'bg-muted-foreground'}`} />
                    <div className="w-10 text-[11px] font-bold text-muted-foreground">
                      {timeString}
                    </div>
                    <div className={`text-sm font-semibold ${isCompleted ? "text-muted-foreground line-through opacity-70" : "text-foreground"}`}>
                      {task.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {isCompleted ? (
                      <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 uppercase tracking-wide">
                        Completed
                      </div>
                    ) : isInProgress ? (
                      <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 uppercase tracking-wide">
                        In Progress
                      </div>
                    ) : (
                      <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-muted-foreground uppercase tracking-wide">
                        Upcoming
                      </div>
                    )}
                    <div className="w-8 text-right text-xs font-semibold text-muted-foreground">
                      {task.estimatedMinutes || 60}m
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Total Scheduled</p>
              <p className="text-sm font-bold text-foreground">{priorities.length} tasks</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Total Duration</p>
              <p className="text-sm font-bold text-foreground">
                {String(totalHours).padStart(2, "0")}h {String(totalMinutes).padStart(2, "0")}m
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
