"use client";

import { X, Calendar, Clock, CheckCircle2, AlertTriangle, ShieldAlert, Tag, Folder, CheckSquare } from "lucide-react";

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
}

export function SessionDetailModal({ isOpen, onClose, session }: SessionDetailModalProps) {
  if (!isOpen || !session) return null;

  const outcomeColors: Record<string, string> = {
    Completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    "Partially Completed": "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Blocked: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    Interrupted: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    "No Meaningful Progress": "bg-rose-500/10 text-rose-500 border-rose-500/20",
    SYSTEM_STOPPED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-[560px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border bg-muted/20">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  outcomeColors[session.outcome || session.status] || "bg-muted text-muted-foreground border-border"
                }`}
              >
                {session.outcome || session.status}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {session.category || "Executive Focus"}
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground">{session.displayTitle || session.title || "CEO Focus Session"}</h2>
            {session.projectName && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-muted-foreground" /> {session.projectName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Timing stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-muted/30 border border-border rounded-xl">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Focused Time
              </span>
              <span className="font-mono font-bold text-foreground text-sm">
                {formatDuration(session.durationSeconds || 0)}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Started At
              </span>
              <span className="font-mono text-muted-foreground">
                {session.startTime ? new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Ended At
              </span>
              <span className="font-mono text-muted-foreground">
                {session.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
              </span>
            </div>
          </div>

          {/* Objective */}
          {session.objective && (
            <div>
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground mb-1">
                Objective
              </h4>
              <p className="p-3 bg-background border border-border rounded-xl text-foreground">
                {session.objective}
              </p>
            </div>
          )}

          {/* Accomplishment Notes */}
          <div>
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground mb-1">
              Accomplishment Notes
            </h4>
            <div className="p-3.5 bg-background border border-border rounded-xl text-foreground whitespace-pre-wrap min-h-[60px]">
              {session.notes || "No additional accomplishment notes recorded for this session."}
            </div>
          </div>

          {/* Blocker Information */}
          {session.blockerType && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
              <h4 className="font-bold text-amber-500 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Blocker: {session.blockerType}
              </h4>
              {session.blockerNote && (
                <p className="text-muted-foreground text-xs">{session.blockerNote}</p>
              )}
            </div>
          )}

          {/* Session Metadata */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border">
            <span>Priority: <strong className="text-foreground">{session.priority || "Medium"}</strong></span>
            <span>Date: <strong className="text-foreground">{session.startTime ? new Date(session.startTime).toLocaleDateString() : "N/A"}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
