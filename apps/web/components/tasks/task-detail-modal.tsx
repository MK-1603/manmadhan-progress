"use client";

import React, { useState } from "react";
import {
  CheckSquare, X, Calendar, Clock, User, Shield, AlertCircle, FileText, CheckCircle2, Trash2, Edit3, Flag, Upload, ExternalLink, Link as LinkIcon, Lock
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { useAuth } from "@/components/auth/auth-context";

interface TaskDetailModalProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailModal({ task, isOpen, onClose, onUpdate }: TaskDetailModalProps) {
  const { user } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Work Submission State
  const [deployUrl, setDeployUrl] = useState(task?.submission?.deployUrl || "");
  const [repoUrl, setRepoUrl] = useState(task?.submission?.repoUrl || "");
  const [note, setNote] = useState(task?.submission?.note || "");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Review Feedback State
  const [feedbackNote, setFeedbackNote] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  if (!isOpen || !task) return null;

  // Determine permissions
  const currentUserId = user?.id || "current-user";
  const currentUserRole = user?.role || "CEO";

  const isAssignee =
    task.assignedToId === currentUserId ||
    task.assigneeName === user?.name ||
    currentUserRole === "MEMBER" ||
    currentUserRole === "CO_CEO";

  const isAssignerOrReviewer =
    currentUserRole === "CEO" ||
    currentUserRole === "CO_CEO" ||
    task.createdBy === currentUserId;

  const handleStatusChange = async (newStatus: string) => {
    setError(null);
    setIsSubmittingStatus(true);
    try {
      if (task.isDemo) {
        task.status = newStatus;
        onUpdate();
      } else {
        const res = await apiClient.patch(`/org/tasks/${task.id}`, { status: newStatus });
        if (res.data?.success) {
          onUpdate();
        } else {
          setError(res.data?.error || "Failed to update status");
        }
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to update task status.");
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 1024 * 1024) {
        setFileError("File exceeds the maximum 1 MB size limit.");
        setFile(null);
        return;
      }
      setFile(selected);
    }
  };

  const handleSubmitWork = async () => {
    setSubmitSuccess(null);
    setError(null);
    setIsSubmittingWork(true);
    try {
      if (task.isDemo) {
        task.status = "Review";
        task.submission = {
          deployUrl,
          repoUrl,
          fileName: file?.name,
          note,
          submittedBy: user?.name || task.assigneeName || "Assignee",
          submittedAt: new Date().toISOString(),
        };
        setSubmitSuccess("Work submitted for review successfully.");
        onUpdate();
      } else {
        const formData = new FormData();
        if (deployUrl) formData.append("deployUrl", deployUrl);
        if (repoUrl) formData.append("repoUrl", repoUrl);
        if (note) formData.append("note", note);
        if (file) formData.append("file", file);

        const res = await apiClient.post(`/org/tasks/${task.id}/submit`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.success) {
          setSubmitSuccess("Work submitted for review successfully.");
          onUpdate();
        } else {
          setError(res.data?.error || "Failed to submit work.");
        }
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to submit work.");
    } finally {
      setIsSubmittingWork(false);
    }
  };

  const handleReviewAction = async (action: "APPROVE" | "REJECT") => {
    setIsReviewing(true);
    try {
      if (task.isDemo) {
        task.status = action === "APPROVE" ? "Completed" : "In Progress";
        if (action === "REJECT") task.reviewFeedback = feedbackNote;
        onUpdate();
      } else {
        await apiClient.post(`/org/tasks/${task.id}/review`, { action, feedback: feedbackNote });
        onUpdate();
      }
    } catch (e: any) {
      setError(e.message || "Failed to review submission.");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete task "${task.title}"?`)) return;
    setError(null);
    setIsDeleting(true);
    try {
      if (task.isDemo) {
        onUpdate();
        onClose();
      } else {
        const res = await apiClient.delete(`/org/tasks/${task.id}`);
        if (res.data?.success) {
          onUpdate();
          onClose();
        } else {
          setError(res.data?.error || "Failed to delete task");
        }
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to delete task.");
    } finally {
      setIsDeleting(false);
    }
  };

  /* ── Body Content ────────────────────────────────────────────────────────── */
  const renderBody = () => (
    <div className="space-y-4 font-sans text-[12px]">
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11.5px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {submitSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11.5px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* Header Info */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] border border-[#C9A52A]/20 text-[10px] font-bold uppercase">
            {task.type || "Development"}
          </span>
          <span className="px-2 py-0.5 rounded bg-[#F8F9FB] dark:bg-[#111419] text-[#17202A] dark:text-[#F2F4F7] border border-[#E4E7EC] dark:border-[#272D36] text-[10px] font-bold uppercase">
            {task.projectName || "Standalone Task"}
          </span>
        </div>
        <h2 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{task.title}</h2>
      </div>

      {/* Description */}
      <div>
        <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block mb-1">
          Description
        </span>
        <p className="text-[12px] text-[#17202A] dark:text-[#F2F4F7] leading-relaxed bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] p-3 rounded-[9px]">
          {task.description || "No description provided."}
        </p>
      </div>

      {/* PERMANENT ASSIGNMENT RECORD */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
          Assignment Record
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] p-3 rounded-[9px]">
          <div>
            <span className="text-[9.5px] text-[#667085] dark:text-[#8B95A5] block">Created By</span>
            <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] text-[11px] truncate block">{task.createdByRole || "CEO"}</span>
          </div>
          <div>
            <span className="text-[9.5px] text-[#667085] dark:text-[#8B95A5] block">Assigned By</span>
            <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] text-[11px] truncate block">{task.assignedByRole || "CO-CEO"}</span>
          </div>
          <div>
            <span className="text-[9.5px] text-[#667085] dark:text-[#8B95A5] block">Assigned To</span>
            <span className="font-bold text-[#C9A52A] dark:text-[#D4B12F] text-[11px] truncate block">{task.assigneeName || "Unassigned"}</span>
          </div>
          <div>
            <span className="text-[9.5px] text-[#667085] dark:text-[#8B95A5] block">Assigned At</span>
            <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] text-[11px] block">
              {task.assignedAt ? new Date(task.assignedAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" }) : "15 Aug 2026"}
            </span>
          </div>
        </div>
      </div>

      {/* ASSIGNEE ACTION AREA VS NON-ASSIGNEE NOTICE */}
      <div className="space-y-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider block">
            Work Submission
          </span>
          <span className="text-[10.5px] font-semibold text-[#667085] dark:text-[#8B95A5]">
            Status: <strong className="text-[#C9A52A]">{task.status}</strong>
          </span>
        </div>

        {isAssignee ? (
          <div className="space-y-2.5 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] p-3.5 rounded-[9px]">
            <div>
              <label className="block text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase mb-1">Deployment URL</label>
              <input
                type="url"
                placeholder="https://app.manmadhan.org"
                value={deployUrl}
                onChange={(e) => setDeployUrl(e.target.value)}
                className="w-full h-[36px] px-3 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[7px] text-[11.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase mb-1">Repository URL</label>
              <input
                type="url"
                placeholder="https://github.com/org/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full h-[36px] px-3 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[7px] text-[11.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase mb-1">
                Evidence File (Max 1 MB)
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="block w-full text-[11px] text-[#667085] file:mr-3 file:py-1.5 file:px-3 file:rounded-[7px] file:border-0 file:text-[11px] file:font-semibold file:bg-[#C9A52A]/10 file:text-[#C9A52A] hover:file:bg-[#C9A52A]/20 cursor-pointer"
              />
              {fileError && <p className="text-[10.5px] text-rose-500 font-semibold mt-1">{fileError}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase mb-1">Completion Summary</label>
              <textarea
                rows={2}
                placeholder="Describe what was completed..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2.5 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[7px] text-[11.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmitWork}
              disabled={isSubmittingWork}
              className="w-full h-[38px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-semibold rounded-[8px] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSubmittingWork ? "Submitting..." : "Submit Work for Review"}</span>
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-[9px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-[11.5px]">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Only the assigned member ({task.assigneeName || "Assignee"}) can submit this work.</span>
            </div>
            {task.submission && (
              <div className="pt-2 border-t border-[#E4E7EC] dark:border-[#272D36] space-y-1 text-[11.5px]">
                <p>Submitted By: <strong className="text-[#17202A] dark:text-[#F2F4F7]">{task.submission.submittedBy || task.assigneeName}</strong></p>
                {task.submission.deployUrl && <p className="truncate">Deploy: <a href={task.submission.deployUrl} target="_blank" rel="noreferrer" className="text-[#C9A52A] underline">{task.submission.deployUrl}</a></p>}
                {task.submission.repoUrl && <p className="truncate">Repo: <a href={task.submission.repoUrl} target="_blank" rel="noreferrer" className="text-[#C9A52A] underline">{task.submission.repoUrl}</a></p>}
                {task.submission.note && <p className="italic">"{task.submission.note}"</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* REVIEW ACTION AREA (FOR CEO / CO-CEO / ASSIGNER WHEN SUBMISSION EXISTS) */}
      {isAssignerOrReviewer && (task.status === "Review" || task.status === "Submitted") && (
        <div className="p-3.5 rounded-[9px] bg-[#C9A52A]/10 border border-[#C9A52A]/30 space-y-2.5">
          <h4 className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#C9A52A]" /> Submission Review & Verification
          </h4>
          <textarea
            rows={2}
            placeholder="Add reviewer feedback or change request notes..."
            value={feedbackNote}
            onChange={(e) => setFeedbackNote(e.target.value)}
            className="w-full p-2 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[7px] text-[11.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleReviewAction("APPROVE")}
              disabled={isReviewing}
              className="flex-1 h-[36px] bg-emerald-600 text-white font-bold text-[11.5px] rounded-[7px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              Approve Work
            </button>
            <button
              type="button"
              onClick={() => handleReviewAction("REJECT")}
              disabled={isReviewing}
              className="flex-1 h-[36px] bg-rose-600 text-white font-bold text-[11.5px] rounded-[7px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              Request Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /* ── Action Footer ──────────────────────────────────────────────────────── */
  const renderFooter = () => (
    <div className="flex items-center justify-between w-full font-sans">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-3.5 h-[38px] rounded-[8px] border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11.5px] font-semibold hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 h-[38px] rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[11.5px] font-semibold hover:bg-[#F3F4F6] transition-colors cursor-pointer"
        >
          Close
        </button>

        {isAssignee && task.status !== "Completed" && task.status !== "Approved" && (
          <button
            type="button"
            onClick={() => handleStatusChange(task.status === "In Progress" ? "Completed" : "In Progress")}
            disabled={isSubmittingStatus}
            className="px-4 h-[38px] rounded-[8px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{task.status === "In Progress" ? "Mark Complete" : "Start Task"}</span>
          </button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileSheet isOpen={isOpen} onClose={onClose} title="Task Execution Details" footerActions={renderFooter()}>
        {renderBody()}
      </MobileSheet>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[4px] flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] rounded-[14px] max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#C9A52A] dark:text-[#D4B12F]" />
            <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Task Execution Details</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-[7px] text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F3F4F6] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">{renderBody()}</div>

        <div className="px-5 py-3 border-t border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] shrink-0">
          {renderFooter()}
        </div>
      </div>
    </div>
  );
}
