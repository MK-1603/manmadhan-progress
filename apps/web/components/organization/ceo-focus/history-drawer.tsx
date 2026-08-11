"use client";

import { X, Clock, Folder } from "lucide-react";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: any[];
  onSelectSession: (session: any) => void;
}

function formatShortDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function HistoryDrawer({
  isOpen,
  onClose,
  history,
  onSelectSession,
}: HistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Mobile Bottom Sheet (rounded-t-2xl max-h-[85dvh]) / Desktop Side Panel */}
      <div className="w-full sm:max-w-lg bg-card border-t sm:border-t-0 sm:border-l border-border rounded-t-2xl sm:rounded-none max-h-[85dvh] sm:max-h-full h-auto sm:h-full flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Session History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable History List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs space-y-1">
              <Clock className="w-6 h-6 text-muted-foreground/40 mx-auto" />
              <p>No focus sessions recorded yet.</p>
            </div>
          ) : (
            history.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectSession(s)}
                className="p-3.5 border border-border rounded-xl hover:border-primary/40 cursor-pointer transition-colors space-y-1.5 bg-card hover:bg-muted/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {s.startTime ? new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                      </span>
                      {s.category && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {s.category}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold text-foreground truncate">
                      {s.displayTitle || s.title || "Focus Activity"}
                    </h4>
                    {s.projectName && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Folder className="w-3 h-3 text-muted-foreground" /> {s.projectName}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-foreground block">
                      {formatShortDuration(s.durationSeconds || 0)}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase mt-1 inline-block ${
                        s.outcome === "Completed" || s.status === "Completed"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : s.outcome === "Partially Completed"
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : s.outcome === "Blocked"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      }`}
                    >
                      {s.outcome || s.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
