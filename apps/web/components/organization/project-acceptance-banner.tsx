"use client";

import { useState } from "react";
import { ShieldCheck, CheckCircle2, MessageSquare, XCircle, Loader2, AlertCircle } from "lucide-react";
import apiClient from "@/lib/api-client";

interface ProjectAcceptanceBannerProps {
  project: any;
  onUpdated: () => void;
}

export function ProjectAcceptanceBanner({ project, onUpdated }: ProjectAcceptanceBannerProps) {
  const [showClarifyModal, setShowClarifyModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  
  const [clarifyQuestion, setClarifyQuestion] = useState("");
  const [declineReason, setDeclineReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (project?.status !== "PENDING_ACCEPTANCE") return null;

  const handleAccept = async () => {
    setLoading(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/projects/${project.id}/accept`, { workspaceId });
      if (res.data.success) {
        onUpdated();
      } else {
        setError(res.data.error || "Failed to accept project");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to accept project");
    } finally {
      setLoading(false);
    }
  };

  const handleClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarifyQuestion.trim()) return;

    setLoading(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/projects/${project.id}/clarify`, {
        workspaceId,
        question: clarifyQuestion.trim(),
      });
      if (res.data.success) {
        setShowClarifyModal(false);
        setClarifyQuestion("");
        onUpdated();
      } else {
        setError(res.data.error || "Failed to submit clarification request");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to submit clarification request");
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineReason.trim()) {
      setError("A reason is required to decline a project assignment");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/projects/${project.id}/decline`, {
        workspaceId,
        reason: declineReason.trim(),
      });
      if (res.data.success) {
        setShowDeclineModal(false);
        setDeclineReason("");
        onUpdated();
      } else {
        setError(res.data.error || "Failed to decline assignment");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to decline assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500">
                Mandate Pending Official Acceptance
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <p className="text-xs text-foreground mt-0.5 font-medium">
              You have been assigned this project mandate. Please review requirements and confirm acceptance before execution begins.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAccept}
            disabled={loading}
            className="px-4 py-1.5 bg-amber-500 text-black text-xs font-bold rounded-xl hover:bg-amber-400 transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Accept Project</>}
          </button>
          <button
            type="button"
            onClick={() => setShowClarifyModal(true)}
            className="px-3.5 py-1.5 bg-card border border-border text-xs font-semibold text-foreground rounded-xl hover:bg-muted transition-colors inline-flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Request Clarification
          </button>
          <button
            type="button"
            onClick={() => setShowDeclineModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors inline-flex items-center gap-1"
          >
            <XCircle className="w-3.5 h-3.5" /> Decline
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Clarification Modal */}
      {showClarifyModal && (
        <div className="p-3 bg-card border border-border rounded-xl space-y-2">
          <label className="text-[11px] font-bold text-foreground block uppercase tracking-wider">
            What needs clarification?
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Please clarify if mobile client development is included in Phase 1..."
            value={clarifyQuestion}
            onChange={(e) => setClarifyQuestion(e.target.value)}
            className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:border-primary outline-none resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowClarifyModal(false)}
              className="px-3 py-1 text-xs border border-border rounded-lg text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClarifySubmit}
              disabled={loading}
              className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg"
            >
              Send Clarification
            </button>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="p-3 bg-card border border-rose-500/30 rounded-xl space-y-2">
          <label className="text-[11px] font-bold text-rose-500 block uppercase tracking-wider">
            Reason for Declining Mandate (Required)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Current sprint capacity overloaded with ongoing client migration..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:border-rose-500 outline-none resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDeclineModal(false)}
              className="px-3 py-1 text-xs border border-border rounded-lg text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeclineSubmit}
              disabled={loading}
              className="px-3 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg"
            >
              Confirm Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
