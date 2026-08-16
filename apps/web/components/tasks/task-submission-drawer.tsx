"use client";

import React, { useState } from "react";
import { X, Upload, GitPullRequest, CheckCircle2, AlertCircle, Loader2, FileText, ExternalLink } from "lucide-react";
import apiClient from "@/lib/api-client";
import { GlobalSheet } from "@/components/ui/global-sheet";

interface TaskSubmissionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: {
    id: string;
    title: string;
    description?: string;
    requiresDocument?: boolean;
    requiresGithub?: boolean;
  };
}

export function TaskSubmissionDrawer({
  isOpen,
  onClose,
  onSuccess,
  task,
}: TaskSubmissionDrawerProps) {
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [githubPrUrl, setGithubPrUrl] = useState("");
  const [githubCommitSha, setGithubCommitSha] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyingPr, setVerifyingPr] = useState(false);
  const [prVerified, setPrVerified] = useState(false);

  if (!isOpen) return null;

  const handleVerifyPr = async () => {
    if (!githubPrUrl.trim()) return;
    setVerifyingPr(true);
    setError("");

    try {
      const res = await apiClient.post("/github/verify-pr", { prUrl: githubPrUrl.trim() });
      if (res.data?.success && res.data?.data?.verified) {
        setPrVerified(true);
      } else {
        setError("Invalid Pull Request URL format.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to verify Pull Request URL.");
    } finally {
      setVerifyingPr(false);
    }
  };

  const handleSubmit = async () => {
    setError("");

    // Enforce Rule 17: Document tasks submission cannot be completed until required document is provided
    if (task.requiresDocument && !documentUrl.trim()) {
      setError("This task requires a document upload before submission.");
      return;
    }

    // Enforce Rule 19: GitHub tasks require PR/commit reference
    if (task.requiresGithub && !githubPrUrl.trim() && !githubCommitSha.trim()) {
      setError("This task requires GitHub Pull Request URL or Commit SHA reference.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        taskId: task.id,
        notes: notes.trim() || undefined,
        documentUrl: documentUrl.trim() || undefined,
        documentTitle: documentTitle.trim() || undefined,
        githubPrUrl: githubPrUrl.trim() || undefined,
        githubCommitSha: githubCommitSha.trim() || undefined,
      };

      const res = await apiClient.post(`/org/tasks/${task.id}/submit`, payload);
      if (res.data?.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(res.data?.error || "Submission failed.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Task submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex gap-3 w-full">
      <button
        onClick={onClose}
        className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        <span>Submit Task</span>
      </button>
    </div>
  );

  return (
    <GlobalSheet
      open={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle="TASK EXECUTION SUBMISSION"
      footerActions={footer}
      desktopMode="modal"
      desktopMaxWidth="max-w-lg"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Document Section */}
        {task.requiresDocument ? (
          <div className="bg-muted/40 border border-amber-500/30 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-amber-500 font-bold uppercase tracking-wider text-[11px]">
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> Required Document Upload</span>
              <span className="text-rose-500 text-[10px]">* Required</span>
            </div>
            <input
              type="text"
              placeholder="Document Title (e.g. PRD Specification v1.0)"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-2 text-foreground focus:border-amber-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Document URL / Storage Link"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-2 text-foreground focus:border-amber-500 focus:outline-none"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="block font-semibold text-muted-foreground">Optional Document Attachment</label>
            <input
              type="text"
              placeholder="Document URL / Link"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-2 text-foreground focus:border-amber-500 focus:outline-none"
            />
          </div>
        )}

        {/* GitHub Evidence Section */}
        {task.requiresGithub ? (
          <div className="bg-muted/40 border border-amber-500/30 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-amber-500 font-bold uppercase tracking-wider text-[11px]">
              <span className="flex items-center gap-1.5"><GitPullRequest className="w-4 h-4" /> GitHub Code Evidence</span>
              <span className="text-rose-500 text-[10px]">* Required</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://github.com/owner/repo/pull/42"
                value={githubPrUrl}
                onChange={(e) => { setGithubPrUrl(e.target.value); setPrVerified(false); }}
                className="flex-1 bg-background border border-border rounded-lg p-2 text-foreground focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={handleVerifyPr}
                disabled={verifyingPr || !githubPrUrl.trim()}
                className="px-3 py-1.5 bg-muted border border-border rounded-lg hover:bg-accent text-foreground font-semibold disabled:opacity-50"
              >
                {verifyingPr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify PR"}
              </button>
            </div>
            {prVerified && (
              <div className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Pull Request URL Verified
              </div>
            )}
          </div>
        ) : null}

        {/* Execution Summary Notes */}
        <div>
          <label className="block font-semibold text-muted-foreground mb-1">Execution Summary & Notes</label>
          <textarea
            rows={3}
            placeholder="Describe work completed, test results, or reviewer notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:border-amber-500 focus:outline-none resize-none"
          />
        </div>
      </div>
    </GlobalSheet>
  );
}
