"use client";

import { X, CheckSquare, Folder, Calendar, Clock } from "lucide-react";

interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: any | null;
  project?: any | null;
}

export function TaskDetailDrawer({
  isOpen,
  onClose,
  task,
  project,
}: TaskDetailDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/60 animate-in fade-in duration-200">
      {/* Drawer Container: Bottom Sheet on Mobile (rounded-t-2xl max-h-[85dvh]), Side Drawer on Desktop */}
      <div className="w-full sm:max-w-md bg-card border-t sm:border-t-0 sm:border-l border-border rounded-t-2xl sm:rounded-none max-h-[85dvh] sm:max-h-full h-auto sm:h-full flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Task Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!task ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              No task details available.
            </div>
          ) : (
            <>
              {/* Task Title & Status */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                      task.priority === "Critical"
                        ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        : task.priority === "High"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {task.priority || "Medium"} Priority
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {task.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-foreground leading-snug">
                  {task.title}
                </h3>
              </div>

              <hr className="border-border" />

              {/* Project Info */}
              {(project || task.projectName) && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Project
                  </span>
                  <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-primary" />
                    {project?.name || task.projectName}
                  </p>
                </div>
              )}

              {/* Description */}
              {task.description && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Description
                  </span>
                  <div className="p-3 bg-muted/20 border border-border rounded-lg text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 border border-border rounded-lg space-y-1 bg-muted/10">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Deadline
                  </span>
                  <p className="text-xs font-mono text-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}
                  </p>
                </div>

                <div className="p-3 border border-border rounded-lg space-y-1 bg-muted/10">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Estimated Effort
                  </span>
                  <p className="text-xs font-mono text-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {task.estimatedMinutes ? `${task.estimatedMinutes}m` : "Not set"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
