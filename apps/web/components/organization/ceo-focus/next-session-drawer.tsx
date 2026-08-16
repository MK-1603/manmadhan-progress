"use client";

import { X, Play, Folder, CheckSquare, Sparkles } from "lucide-react";

interface NextSessionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: any[];
  onStartNextSession: (task: any) => void;
}

export function NextSessionDrawer({
  isOpen,
  onClose,
  tasks,
  onStartNextSession,
}: NextSessionDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Mobile Bottom Sheet / Desktop Centered Modal */}
      <div className="w-full sm:max-w-md bg-card border-t sm:border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[80dvh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Next Focus Session</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Select what to work on next.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task List Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No pending active tasks available.
            </div>
          ) : (
            tasks.slice(0, 6).map((t) => (
              <div
                key={t.id}
                className="p-3 border border-border rounded-xl bg-card hover:border-primary/40 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        t.priority === "Critical"
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : t.priority === "High"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {t.priority || "Medium"}
                    </span>
                    {t.projectName && (
                      <span className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                        <Folder className="w-3 h-3" /> {t.projectName}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-foreground truncate">{t.title}</h4>
                </div>

                <button
                  onClick={() => {
                    onStartNextSession(t);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shrink-0 flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-primary-foreground" /> Focus
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-border text-xs font-semibold text-foreground rounded-xl hover:bg-muted transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
