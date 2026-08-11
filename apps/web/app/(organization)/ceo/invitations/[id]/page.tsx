"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, Mail, Calendar, Clock, AlertCircle, Loader2,
  Check, RotateCcw, X, Copy, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

export default function InvitationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState("");
  const [cancelError, setCancelError] = useState("");

  const fetchInvitation = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId || !id) return;
      const res = await apiClient.get(
        `/organization/invitations/${id}?workspaceId=${workspaceId}`
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
    fetchInvitation();
  }, [id]);

  const handleCancelInvitation = async () => {
    if (!inv || !id) return;
    setCancelling(true);
    setCancelError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/organization/invitations/cancel`, {
        invitationId: id,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="p-6 max-w-[700px] mx-auto">
        <Link
          href="/ceo/invitations"
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Invitations
        </Link>
        <div className="flex items-center gap-2 p-4 bg-card border border-border rounded-xl text-[13px] text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error || "Invitation not found."}
        </div>
      </div>
    );
  }

  const lifecycleSteps: LifecycleStep[] = [
    { label: "Created", timestamp: inv.createdAt, description: "Invitation created by " + (inv.invitedBy?.name || "CEO") },
    { label: "OTP Verified", timestamp: inv.otpVerifiedAt, description: "Recipient verified their email OTP" },
    { label: "Password Created", timestamp: inv.passwordCreatedAt, description: "Account password set" },
    { label: "Workspace Assigned", timestamp: inv.workspaceAssignedAt, description: "Added to organization workspace" },
    { label: "Activated", timestamp: inv.activatedAt, description: "Account fully activated and membership active" },
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
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-16 max-w-[700px] mx-auto w-full space-y-6">
      {/* Back navigation */}
      <Link
        href="/ceo/invitations"
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Invitations
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-foreground leading-tight">{inv.email}</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Invited by {inv.invitedBy?.name || "CEO"} · {formatDate(inv.createdAt)}
              </p>
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
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(inv.email);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border hover:border-primary rounded-xl text-[11px] font-semibold text-foreground transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy Email"}
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

      {/* Invitation Details */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-[13px] font-bold text-foreground mb-4">Invitation Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="px-4 py-3 bg-background border border-border rounded-xl">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Role</p>
            <p className="text-[13px] font-semibold text-foreground mt-1">{inv.role}</p>
          </div>
          <div className="px-4 py-3 bg-background border border-border rounded-xl">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Status</p>
            <p className="text-[13px] font-semibold text-foreground mt-1">{inv.status}</p>
          </div>
          <div className="px-4 py-3 bg-background border border-border rounded-xl">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Invited By</p>
            <p className="text-[13px] font-semibold text-foreground mt-1">{inv.invitedBy?.name || "—"}</p>
          </div>
          <div className="px-4 py-3 bg-background border border-border rounded-xl">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Expires</p>
            <p className={`text-[13px] font-semibold mt-1 ${isExpired && !isCompleted ? "text-rose-500" : "text-foreground"}`}>
              {formatDate(inv.expiresAt) || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Lifecycle */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-[13px] font-bold text-foreground mb-4">Invitation Lifecycle</h2>
        <div className="space-y-0">
          {lifecycleSteps.map((step, idx) => {
            const completed = !!step.timestamp;
            const isLast = idx === lifecycleSteps.length - 1;
            return (
              <div key={step.label} className="flex gap-3">
                {/* Icon + connector line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
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
                <div className="pb-6">
                  <p className={`text-[12px] font-semibold ${completed ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  {completed && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(step.timestamp)}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5 italic">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
