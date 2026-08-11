"use client";

import React, { useState, useEffect } from "react";
import { X, CheckSquare, Clock, User, Shield, AlertCircle, CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";
import apiClient from "@/lib/api-client";
import { formatEnumLabel } from "@/lib/utils/formatters";

interface TaskAssignmentModalProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function TaskAssignmentModal({
  taskId,
  isOpen,
  onClose,
  onRefresh,
}: TaskAssignmentModalProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [declineMode, setDeclineMode] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !taskId) return;
    setIsLoading(true);
    setError(null);

    const workspaceId = localStorage.getItem("workspaceId") || "";
    apiClient
      .get(`/org/tasks/${taskId}/assignment?workspaceId=${workspaceId}`)
      .then((res) => {
        if (res.data?.success) {
          setData(res.data.data);
        } else {
          setError(res.data?.error || "Failed to load task assignment details");
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message || "Failed to load assignment");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [taskId, isOpen]);

  if (!isOpen) return null;

  const task = data?.task;
  const tracker = data?.tracker;
  const assignee = data?.assignee;
  const assigner = data?.assigner;

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const workspaceId = localStorage.getItem("workspaceId") || "";
      const res = await apiClient.post(`/org/tasks/${taskId}/assignment/accept?workspaceId=${workspaceId}`);
      if (res.data?.success) {
        setSuccessMsg("Task assignment accepted! You can now start work.");
        setTimeout(() => {
          onRefresh();
          onClose();
        }, 1000);
      } else {
        setError(res.data?.error || "Failed to accept task assignment");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to accept task assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineReason.trim()) {
      setError("Please provide a decline reason.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const workspaceId = localStorage.getItem("workspaceId") || "";
      const res = await apiClient.post(`/org/tasks/${taskId}/assignment/decline?workspaceId=${workspaceId}`, {
        reason: declineReason.trim(),
      });
      if (res.data?.success) {
        setSuccessMsg("Assignment declined. The creator has been notified.");
        setTimeout(() => {
          onRefresh();
          onClose();
        }, 1000);
      } else {
        setError(res.data?.error || "Failed to decline task assignment");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to decline task assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold shrink-0">
              <CheckSquare className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 text-[10px] font-bold uppercase tracking-wider">
                  {data?.assignmentStatus || "PENDING ACCEPTANCE"}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Task Assignment
                </span>
              </div>
              <h2 className="text-base font-bold text-foreground mt-0.5">
                {isLoading ? "Loading..." : task?.title || "Task Assignment"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-[#65C466]/10 border border-[#65C466]/20 text-[#65C466] flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-gold" />
              <p>Fetching task assignment metadata...</p>
            </div>
          ) : (
            <>
              {/* Task Mandate & Description */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Description
                </span>
                <p className="text-xs text-foreground leading-relaxed bg-background border border-border p-3.5 rounded-xl">
                  {task?.description || "No specific instructions provided for this task assignment."}
                </p>
              </div>

              {/* Assignment Parties */}
              <div className="grid grid-cols-2 gap-3 bg-background border border-border p-4 rounded-xl">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Assigned To
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center font-bold text-gold shrink-0">
                      {assignee?.name?.[0]?.toUpperCase() || "A"}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground truncate">{assignee?.name || "Unassigned"}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        {assignee?.role || "MEMBER"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Assigned By
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-foreground shrink-0">
                      {assigner?.name?.[0]?.toUpperCase() || "C"}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground truncate">{assigner?.name || "System"}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        {assigner?.role || "CEO"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-background border border-border p-4 rounded-xl">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Project</span>
                  <span className="font-semibold text-foreground mt-0.5 block truncate">
                    {data?.projectName || (task?.projectId ? "Project Task" : "STANDALONE TASK")}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Milestone</span>
                  <span className="font-semibold text-foreground mt-0.5 block truncate">
                    {data?.milestoneName || "No Milestone"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Priority</span>
                  <span className="font-semibold text-gold mt-0.5 block">{task?.priority || "Medium"}</span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Deadline</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {task?.deadline ? new Date(task.deadline).toLocaleDateString() : "Flexible"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Schedule</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {task?.startTime ? `${new Date(task.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Flexible"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Deliverable</span>
                  <span className="font-semibold text-foreground mt-0.5 block truncate">
                    {task?.deliverable || "Execution"}
                  </span>
                </div>
              </div>

              {/* Decline Reason Mode */}
              {declineMode && (
                <form onSubmit={handleDecline} className="space-y-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <label className="block text-[11px] font-bold uppercase text-destructive">
                    Reason for Declining Task Assignment *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide clear reasons why this task assignment is being declined..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="w-full p-3 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-destructive"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDeclineMode(false)}
                      className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-destructive text-white font-semibold hover:bg-destructive/90 disabled:opacity-50"
                    >
                      {isSubmitting ? "Declining..." : "Confirm Decline"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0 bg-card">
          <button
            type="button"
            onClick={() => setDeclineMode(true)}
            disabled={isSubmitting || declineMode || task?.status === "ACCEPTED"}
            className="px-4 py-2 rounded-xl border border-destructive/30 text-destructive font-semibold hover:bg-destructive/10 transition-colors disabled:opacity-40"
          >
            Decline
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-semibold hover:bg-accent hover:text-foreground transition-colors"
            >
              Close
            </button>

            {task?.status === "PENDING_ACCEPTANCE" || task?.status === "Assigned" ? (
              <button
                type="button"
                onClick={handleAccept}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gold hover:bg-gold-hover text-[#0A0A0A] font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isSubmitting ? "Accepting..." : "Accept Task"}
              </button>
            ) : (
              <span className="px-4 py-2 rounded-xl bg-muted text-muted-foreground font-semibold border border-border">
                {task?.status || "Processed"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
