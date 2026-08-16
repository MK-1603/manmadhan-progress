"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { GlobalSheet } from "@/components/ui/global-sheet";

interface EndFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  elapsedSeconds: number;
  projects: any[];
  onEndSession: (endData: {
    outcome: string;
    notes?: string;
    blockerType?: string;
    blockerNote?: string;
    followUpTaskId?: string;
  }) => Promise<void>;
  onCreateFollowUpTask?: (taskData: {
    title: string;
    description?: string;
    projectId?: string;
    priority?: string;
  }) => Promise<any>;
}

const OUTCOMES = [
  { id: "Completed", label: "Completed", icon: CheckCircle2, color: "text-emerald-500" },
  { id: "Partially Completed", label: "Partially Completed", icon: Clock, color: "text-blue-500" },
  { id: "Blocked", label: "Blocked", icon: AlertTriangle, color: "text-amber-500" },
  { id: "No Meaningful Progress", label: "No Meaningful Progress", icon: ShieldAlert, color: "text-rose-500" },
];

const BLOCKER_TYPES = [
  "Waiting for CO-CEO",
  "Waiting for Member",
  "Waiting for Approval",
  "Missing Information",
  "Technical Issue",
  "External Dependency",
  "Other",
];

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
}

export function EndFocusModal({
  isOpen,
  onClose,
  session,
  elapsedSeconds,
  projects,
  onEndSession,
  onCreateFollowUpTask,
}: EndFocusModalProps) {
  const [outcome, setOutcome] = useState("Completed");
  const [notes, setNotes] = useState("");
  const [blockerType, setBlockerType] = useState("Waiting for CO-CEO");
  const [blockerNote, setBlockerNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await onEndSession({
        outcome,
        notes: notes.trim() || undefined,
        blockerType: outcome === "Blocked" ? blockerType : undefined,
        blockerNote: outcome === "Blocked" ? blockerNote.trim() : undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to finalize focus session");
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      <button
        type="button"
        onClick={onClose}
        className="px-3.5 py-1.5 border border-border text-xs font-semibold text-foreground rounded-xl hover:bg-muted transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="end-focus-form"
        disabled={loading}
        className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
      >
        Save Record
      </button>
    </div>
  );

  return (
    <GlobalSheet
      open={isOpen}
      onClose={onClose}
      title="End Focus Session"
      subtitle={(session.title || "EXECUTIVE FOCUS").toUpperCase()}
      footerActions={footer}
      desktopMode="modal"
      desktopMaxWidth="max-w-[500px]"
    >
      <div className="space-y-4 text-xs select-text">
        {/* Duration Header Banner */}
        <div className="px-4 py-2.5 bg-muted/20 border border-border rounded-xl flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Focused Duration:</span>
          <span className="font-mono font-bold text-foreground text-sm">
            {formatDuration(elapsedSeconds)}
          </span>
        </div>

        <form id="end-focus-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs">
              {error}
            </div>
          )}

          {/* Outcome Buttons Grid */}
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Outcome
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map((o) => {
                const Icon = o.icon;
                const isSelected = outcome === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOutcome(o.id)}
                    className={`p-2.5 text-left rounded-xl border transition-all flex items-center gap-2 ${
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                        : "border-border bg-card hover:bg-muted/20 text-muted-foreground"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${o.color}`} />
                    <span className="text-xs font-bold truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* What did you accomplish? */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              What did you accomplish?
            </label>
            <textarea
              rows={2}
              placeholder="Summary of progress, decisions, or artifacts created..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Blocker Details (Rendered ONLY when outcome === "Blocked") */}
          {outcome === "Blocked" && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2.5">
              <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" /> Blocker Details
              </h4>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Blocker Category
                </label>
                <select
                  value={blockerType}
                  onChange={(e) => setBlockerType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-primary"
                >
                  {BLOCKER_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Explanation & Action Needed
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain what is blocking progress..."
                  value={blockerNote}
                  onChange={(e) => setBlockerNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </GlobalSheet>
  );
}
