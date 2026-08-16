"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mail, User, Shield, RotateCcw, Ban, CheckCircle2, Circle, Clock, ArrowRight, Calendar
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

interface InvitationDetailDrawerProps {
  invitation: any | null;
  onClose: () => void;
  onResend: (id: string) => void;
  onRevoke: (id: string) => void;
  actionLoading: boolean;
}

const STAGES = [
  { label: "Created", key: "DRAFT" },
  { label: "Sent", key: "PENDING" },
  { label: "Waiting", key: "WAITING_ACCEPTANCE" },
  { label: "Accepted", key: "ACCEPTED" },
  { label: "Joined", key: "WORKSPACE_JOINED" },
  { label: "Profile", key: "PROFILE_COMPLETED" },
  { label: "Active", key: "ACTIVE" },
];

function getStageIndex(state: string): number {
  switch (state) {
    case "ACTIVE": return 6;
    case "PROFILE_COMPLETED": return 5;
    case "PROFILE_INCOMPLETE": return 4;
    case "WORKSPACE_JOINED": return 4;
    case "ACCEPTED": return 3;
    case "WAITING_ACCEPTANCE": return 2;
    case "PENDING": return 1;
    case "DRAFT": return 0;
    default: return 2;
  }
}

export function InvitationDetailDrawer({
  invitation, onClose, onResend, onRevoke, actionLoading
}: InvitationDetailDrawerProps) {
  if (!invitation) return null;

  const activeIdx = getStageIndex(invitation.lifecycleState || invitation.status);
  const isTerminated = ["EXPIRED", "CANCELLED", "DECLINED"].includes(invitation.lifecycleState);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-card border-l border-border h-full shadow-2xl flex flex-col p-6 space-y-5 overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold text-sm flex items-center justify-center">
                {invitation.email ? invitation.email.charAt(0).toUpperCase() : "I"}
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{invitation.name || invitation.email}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {invitation.role}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {(invitation.lifecycleState || invitation.status).replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* REPORTING TO SUPERVISOR BLOCK */}
          {invitation.role === "MEMBER" && (
            <div className="p-3 bg-background border border-border rounded-xl space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-purple-400 block">Reporting Supervisor</span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">
                  {invitation.assignedCoCeoName ? `${invitation.assignedCoCeoName} (CO-CEO)` : "Assigned directly to CEO"}
                </span>
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
            </div>
          )}

          {/* INVITATION PROGRESS STEPPER */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
              Invitation Lifecycle Journey
            </label>
            <div className="p-3 bg-background border border-border rounded-xl space-y-2.5">
              {STAGES.map((s, idx) => {
                const isDone = idx <= activeIdx;
                const isCurrent = idx === activeIdx;

                return (
                  <div key={s.key} className="flex items-center gap-3 text-xs">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={`font-semibold ${isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground/60"}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timestamps & Audit Context */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-background border border-border rounded-xl space-y-0.5">
              <span className="text-[9px] font-bold uppercase text-muted-foreground block">Created Date</span>
              <span className="font-mono text-foreground">
                {invitation.createdAt ? new Date(invitation.createdAt).toLocaleDateString() : "Recent"}
              </span>
            </div>
            <div className="p-2.5 bg-background border border-border rounded-xl space-y-0.5">
              <span className="text-[9px] font-bold uppercase text-muted-foreground block">Expiry Status</span>
              <span className="font-mono text-foreground">
                {invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString() : "7 Days"}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            {!isTerminated && invitation.lifecycleState !== "ACTIVE" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onResend(invitation.id)}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Resend
                </button>
                <button
                  onClick={() => onRevoke(invitation.id)}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-xl hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" /> Revoke
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-card border border-border text-xs font-bold rounded-xl text-foreground ml-auto"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
