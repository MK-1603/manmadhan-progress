"use client";

import React, { useState } from "react";
import { CheckSquare, X, Calendar, Clock, User, Shield, AlertCircle, FileText, CheckCircle2, Trash2, Edit3, Flag } from "lucide-react";
import apiClient from "@/lib/api-client";
import { formatEnumLabel } from "@/lib/utils/formatters";

interface TaskDetailModalProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailModal({ task, isOpen, onClose, onUpdate }: TaskDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleStatusChange = async (newStatus: string) => {
    setError(null);
    setIsSubmittingStatus(true);
    try {
      const res = await apiClient.patch(`/org/tasks/${task.id}`, { status: newStatus });
      if (res.data?.success) {
        onUpdate();
      } else {
        setError(res.data?.error || "Failed to update status");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to update task status.");
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete task "${task.title}"?`)) return;
    setError(null);
    setIsDeleting(true);
    try {
      const res = await apiClient.delete(`/org/tasks/${task.id}`);
      if (res.data?.success) {
        onUpdate();
        onClose();
      } else {
        setError(res.data?.error || "Failed to delete task");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to delete task.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-gold shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20 text-[10px] font-semibold uppercase">
                  {formatEnumLabel(task.type || "Task")}
                </span>
                <span className="px-2 py-0.5 rounded bg-background text-foreground border border-border text-[10px] font-semibold uppercase">
                  {task.projectName || (task.projectId ? "Project Task" : "Standalone Task")}
                </span>
              </div>
              <h2 className="text-base font-semibold text-foreground mt-1">{task.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Description */}
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Description
            </span>
            <p className="text-xs text-foreground leading-relaxed bg-background border border-border p-3.5 rounded-xl">
              {task.description || "No description provided."}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-background border border-border p-4 rounded-xl">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Status</span>
              <span className="font-semibold text-foreground mt-0.5 block">{formatEnumLabel(task.status)}</span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Priority</span>
              <span className="font-semibold text-gold mt-0.5 block">{task.priority || "Medium"}</span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Assignee</span>
              <span className="font-semibold text-foreground mt-0.5 block truncate">
                {task.assigneeName || task.assigneeEmail || "Unassigned"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Target Deadline</span>
              <span className="font-semibold text-foreground mt-0.5 block">
                {task.deadline ? new Date(task.deadline).toLocaleDateString() : "Flexible"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Project</span>
              <span className="font-semibold text-foreground mt-0.5 block truncate">
                {task.projectName || "Standalone Task"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Deliverable</span>
              <span className="font-semibold text-foreground mt-0.5 block truncate">
                {task.deliverable || "None"}
              </span>
            </div>
          </div>

          {/* Workflow Requirements */}
          {(task.approvalRequired || task.verificationRequired) && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gold/5 border border-gold/20">
              <Shield className="w-4 h-4 text-gold shrink-0" />
              <div className="text-[11px] text-foreground">
                {task.approvalRequired && <span className="mr-3 font-semibold text-foreground">✓ Approval Required</span>}
                {task.verificationRequired && <span className="font-semibold text-foreground">✓ Verification Required</span>}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3.5 py-2 rounded-xl bg-transparent border border-destructive/30 text-destructive font-semibold hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>

          <div className="flex items-center gap-2">
            {task.status !== "Completed" && task.status !== "Approved" && (
              <button
                onClick={() => handleStatusChange(task.status === "In Progress" ? "Completed" : "In Progress")}
                disabled={isSubmittingStatus}
                className="px-4 py-2 rounded-xl bg-gold hover:bg-gold-hover text-[#0A0A0A] font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {task.status === "In Progress" ? "Mark Complete" : "Start Task"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
