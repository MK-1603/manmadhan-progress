"use client";

import { useState, useEffect } from "react";
import {
  Mail, AlertCircle, Loader2, Check, X, Copy, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";

interface LifecycleStep {
  label: string;
  timestamp: string | null | undefined;
  description: string;
}

function formatDate(ts: string | null | undefined) {
  if (!ts) return null;
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface InvitationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitationId: string | null;
}

export function InvitationDetailModal({ isOpen, onClose, invitationId }: InvitationDetailModalProps) {
  const [inv, setInv] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState("");
  const [cancelError, setCancelError] = useState("");

  const fetchInvitation = async () => {
    if (!invitationId) return;
    setLoading(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.get(
        `/organization/invitations/${invitationId}?workspaceId=${workspaceId}`
      );
      if (res.data.success) {
        setInv(res.data.data);
      } else {
        setError(res.data.error || "Failed to load invitation");
      }
    } catch {
      setError("Unable to load invitation details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && invitationId) {
      fetchInvitation();
    } else {
      setInv(null);
      setError("");
      setCancelSuccess("");
      setCancelError("");
    }
  }, [isOpen, invitationId]);

  const handleCancelInvitation = async () => {
    if (!inv || !invitationId) return;
    setCancelling(true);
    setCancelError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/organization/invitations/cancel`, {
        invitationId,
        workspaceId,
      });
      if (res.data.success) {
        setCancelSuccess("Invitation cancelled successfully.");
        fetchInvitation();
      } else {
        setCancelError(res.data.error || "Failed to cancel invitation.");
      }
    } catch {
      setCancelError("Unable to cancel invitation. Try again.");
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error || !inv) {
      return (
        <div className="p-6">
          <div className="flex items-center gap-2 p-4 bg-card border border-border rounded-xl text-[13px] text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error || "Invitation not found."}
          </div>
        </div>
      );
    }

    const lifecycleSteps: LifecycleStep[] = [
      { label: "Created", timestamp: inv.createdAt, description: "Invitation created by " + (inv.invitedBy?.name || "CEO") },
      { label: "Sent", timestamp: inv.createdAt, description: "Sent to email" },
      { label: "Waiting", timestamp: inv.createdAt, description: "Waiting for user action" },
      { label: "Accepted", timestamp: inv.otpVerifiedAt, description: "OTP verified" },
      { label: "Joined", timestamp: inv.workspaceAssignedAt, description: "Joined workspace" },
      { label: "Profile", timestamp: inv.passwordCreatedAt, description: "Profile setup" },
      { label: "Active", timestamp: inv.activatedAt, description: "Account active" },
    ];

    const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
    const isCancelled = inv.status === "Cancelled" || inv.status === "Revoked";
    const isActive = inv.status === "Pending" || inv.status === "Delivered" || inv.status === "Sent";
    const isCompleted = inv.status === "Activated" || inv.status === "Completed" || inv.activatedAt;

    const statusColor = isCancelled
      ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
      : isCompleted
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      : isExpired
      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
      : "bg-blue-500/10 text-blue-500 border-blue-500/20";

    return (
      <div className="p-5 sm:p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-[16px] sm:text-[18px] font-bold text-foreground leading-tight truncate max-w-[200px] sm:max-w-xs">{inv.email}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    {inv.role}
                  </span>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${statusColor}`}>
                    {isExpired && !isCompleted && !isCancelled ? "EXPIRED" : inv.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Copy / Cancel actions for active invitations */}
            {isActive && !isExpired && (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(inv.email);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border hover:border-primary rounded-xl text-[11px] font-semibold text-foreground transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                </button>
                <button
                  onClick={handleCancelInvitation}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500 rounded-xl text-[11px] font-semibold text-rose-500 transition-colors disabled:opacity-50"
                >
                  {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  Cancel
                </button>
              </div>
            )}
          </div>

          {cancelSuccess && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[12px] text-emerald-500">
              <Check className="w-3.5 h-3.5" /> {cancelSuccess}
            </div>
          )}
          {cancelError && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[12px] text-rose-500">
              <AlertCircle className="w-3.5 h-3.5" /> {cancelError}
            </div>
          )}
        </div>

        {/* Lifecycle */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Invitation Lifecycle Journey</h2>
          <div className="space-y-0">
            {lifecycleSteps.map((step, idx) => {
              const completed = !!step.timestamp;
              const isLast = idx === lifecycleSteps.length - 1;
              return (
                <div key={step.label} className="flex gap-3">
                  {/* Icon + connector line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${
                        completed
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                          : "bg-muted border-border text-muted-foreground"
                      }`}
                    >
                      {completed ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 h-8 my-0.5 ${completed ? "bg-emerald-500/30" : "bg-border"}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-4 pt-0.5">
                    <p className={`text-[13px] font-bold ${completed ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Summary Boxes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="px-4 py-3 bg-background border border-border rounded-xl">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Created Date</p>
            <p className="text-[13px] font-semibold text-foreground mt-1">{formatDate(inv.createdAt)?.split(',')[0] || "—"}</p>
          </div>
          <div className="px-4 py-3 bg-background border border-border rounded-xl">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Expiry Status</p>
            <p className={`text-[13px] font-semibold mt-1 ${isExpired && !isCompleted ? "text-rose-500" : "text-foreground"}`}>
              {formatDate(inv.expiresAt)?.split(',')[0] || "—"}
            </p>
          </div>
        </div>

      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-[600px] bg-background border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col relative"
          >
            {/* Top handle for mobile sheet look */}
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-12 h-1.5 bg-border rounded-full" />
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted text-muted-foreground rounded-full transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {renderContent()}

            <div className="p-4 sm:p-5 border-t border-border bg-card flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-background border border-border hover:bg-muted text-[13px] font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
