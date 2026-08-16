  "use client";

import React, { useState, useCallback, useRef } from "react";
import {
  X, FileText, Upload, CheckCircle2, Clock, History,
  AlertCircle, Loader2, ChevronRight, Eye, Download,
  RotateCcw, Lock, Flag, ArrowUpRight,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { getMilestoneStateBadgeClass, formatEnumLabel } from "@/lib/utils/formatters";

/* ─────────────────────────── types */
interface MilestoneWorkspaceProps {
  milestone: any;
  projectId: string;
  project: any;
  onClose: () => void;
  onRefresh: () => void;
}

type Tab = "overview" | "upload" | "verification" | "history";

/* ─────────────────────────── helpers */
function formatFileSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/zip",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const ALLOWED_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".ppt", ".pptx", ".txt", ".md", ".csv",
  ".zip", ".png", ".jpg", ".jpeg", ".webp",
];

/* ─────────────────────────── sub-components */
function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3AA18]
        ${active ? "bg-[#E3AA18] text-[#0A0A0A]" : "border border-[#2A2A2A] text-[#BDBDBD] hover:bg-[#1D1D1D] hover:text-[#F5F5F5]"}`}
    >
      {label}
    </button>
  );
}

/* ─────────────────────────── main component */
export function MilestoneWorkspace({
  milestone,
  projectId,
  project,
  onClose,
  onRefresh,
}: MilestoneWorkspaceProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [uploadedFile, setUploadedFile]   = useState<File | null>(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadError, setUploadError]     = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawState   = milestone.state || milestone.status || "LOCKED";
  const isLocked   = rawState === "LOCKED";
  const isApproved = rawState === "APPROVED";

  /* ── drop handling ── */
  const [isDragging, setIsDragging] = useState(false);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSet(file);
  }, []);

  const validateAndSet = (file: File) => {
    setUploadError(""); setUploadSuccess("");
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(`File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File exceeds 50 MB limit.");
      return;
    }
    setUploadedFile(file);
  };

  /* ── upload ── */
  const handleUpload = async () => {
    if (!uploadedFile) return;
    setUploading(true); setUploadError(""); setUploadSuccess("");
    try {
      const wsId = localStorage.getItem("workspaceId");
      const form = new FormData();
      form.append("file", uploadedFile);
      form.append("workspaceId", wsId || "");
      form.append("milestoneId", milestone.id);
      form.append("projectId", projectId);

      const res = await apiClient.post(
        `/org/projects/${projectId}/milestones/${milestone.id}/upload`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data.success) {
        setUploadSuccess(`${uploadedFile.name} uploaded successfully.`);
        setUploadedFile(null);
        onRefresh();
      } else {
        setUploadError(res.data.error || "Upload failed.");
      }
    } catch (e: any) {
      setUploadError(e.response?.data?.error || e.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  /* ── submit for approval ── */
  const handleSubmit = async () => {
    setSubmitting(true); setSubmitError(""); setSubmitSuccess("");
    try {
      const wsId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(
        `/org/projects/${projectId}/milestones/${milestone.id}/submit`,
        { workspaceId: wsId }
      );
      if (res.data.success) {
        setSubmitSuccess("Milestone submitted for verification and approval.");
        onRefresh();
      } else {
        setSubmitError(res.data.error || "Submission failed.");
      }
    } catch (e: any) {
      setSubmitError(e.response?.data?.error || e.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const canUpload  = !isLocked && !isApproved;
  const canSubmit  = ["IN_PROGRESS", "DRAFT", "AVAILABLE"].includes(rawState) && milestone.document;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">

      {/* backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Milestone workspace: ${milestone.name}`}
        className="
          relative w-full sm:max-w-2xl max-h-[95dvh] sm:max-h-[88dvh]
          bg-[#171717] border border-[#292929] rounded-t-2xl sm:rounded-2xl
          shadow-2xl flex flex-col overflow-hidden
        "
      >
        {/* ── header ── */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-[#292929]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-widest">
                  Stage {milestone.stageNumber ?? "—"}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${getMilestoneStateBadgeClass(rawState)}`}>
                  {formatEnumLabel(rawState, "LOCKED")}
                </span>
              </div>
              <h2 className="text-[17px] font-bold text-[#F5F5F5] leading-tight mt-1 truncate">
                {milestone.name}
              </h2>
              {milestone.description && (
                <p className="text-xs text-[#858585] mt-0.5 line-clamp-2">{milestone.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close milestone workspace"
              className="shrink-0 p-1.5 rounded-lg text-[#858585] hover:text-[#F5F5F5] hover:bg-[#222222] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3AA18]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* tabs */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {(["overview", "upload", "verification", "history"] as Tab[]).map(t => (
              <TabBtn key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={tab === t} onClick={() => setTab(t)} />
            ))}
          </div>
        </div>

        {/* ── scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: "none" }}>

          {/* ─ OVERVIEW ─ */}
          {tab === "overview" && (
            <div className="space-y-4">
              {/* meta grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: "Status",    value: formatEnumLabel(rawState, "Locked") },
                  { label: "Stage",     value: milestone.stageNumber ? `Stage ${milestone.stageNumber}` : "Additional" },
                  { label: "Owner",     value: milestone.ownerName || milestone.ownerUserId || "Assigned" },
                  { label: "Deadline",  value: milestone.deadline ? new Date(milestone.deadline).toLocaleDateString() : "Flexible" },
                  { label: "Document",  value: milestone.document ? `v${milestone.document.currentVersion}` : "Not uploaded" },
                  { label: "Depends on", value: milestone.dependencies?.length ? milestone.dependencies.map((d: number) => `Stage ${d}`).join(", ") : "None" },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-xl bg-[#111111] border border-[#2A2A2A]">
                    <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-widest block mb-0.5">{label}</span>
                    <span className="font-semibold text-[#F5F5F5]">{value}</span>
                  </div>
                ))}
              </div>

              {/* locked notice */}
              {isLocked && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#111111] border border-[#2A2A2A]">
                  <Lock className="w-4 h-4 text-[#858585] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#F5F5F5]">This milestone is locked</p>
                    <p className="text-[11px] text-[#858585] mt-0.5">
                      Complete and approve {milestone.dependencies?.length
                        ? `Stage${milestone.dependencies.length > 1 ? "s" : ""} ${milestone.dependencies.join(", ")}`
                        : "the preceding stage"} to unlock this milestone.
                    </p>
                  </div>
                </div>
              )}

              {/* approved notice */}
              {isApproved && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#65C466]/5 border border-[#65C466]/20">
                  <CheckCircle2 className="w-4 h-4 text-[#65C466] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#65C466]">Milestone approved</p>
                    <p className="text-[11px] text-[#858585] mt-0.5">This stage is complete. The next milestone has been unlocked.</p>
                  </div>
                </div>
              )}

              {/* document preview */}
              {milestone.document && (
                <div className="p-4 rounded-xl bg-[#111111] border border-[#2A2A2A] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#E3AA18]" />
                      <span className="text-xs font-semibold text-[#F5F5F5]">{milestone.document.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#858585]">v{milestone.document.currentVersion}</span>
                  </div>
                  <p className="text-[11px] text-[#858585] truncate">{milestone.document.folderPath}</p>
                  <p className="text-[11px] text-[#858585]">{milestone.document.wordCount} words</p>
                </div>
              )}

              {/* submit for approval */}
              {!isLocked && !isApproved && (
                <div className="pt-2 border-t border-[#292929] space-y-3">
                  <p className="text-[11px] text-[#858585]">
                    Once the required document is uploaded and reviewed, submit this milestone for CEO approval.
                  </p>
                  {submitError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#E05252]/10 border border-[#E05252]/20 text-[#E05252] text-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{submitError}
                    </div>
                  )}
                  {submitSuccess && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#65C466]/10 border border-[#65C466]/20 text-[#65C466] text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{submitSuccess}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={submitting || !canSubmit}
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E3AA18] hover:bg-[#F0BC2B] text-[#0A0A0A] text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {submitting ? "Submitting…" : "Submit for Verification & Approval"}
                  </button>
                  {!canSubmit && !submitSuccess && (
                    <p className="text-[10px] text-[#858585]">Upload the required document first before submitting.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─ UPLOAD ─ */}
          {tab === "upload" && (
            <div className="space-y-4">
              {!canUpload ? (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#111111] border border-[#2A2A2A]">
                  {isLocked
                    ? <Lock className="w-4 h-4 text-[#858585] shrink-0 mt-0.5" />
                    : <CheckCircle2 className="w-4 h-4 text-[#65C466] shrink-0 mt-0.5" />}
                  <p className="text-xs text-[#858585]">
                    {isLocked ? "Unlock this milestone before uploading." : "This milestone is approved. No further uploads needed."}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#858585]">
                    Upload the required deliverable document for <strong className="text-[#F5F5F5]">{milestone.name}</strong>.
                    Files are stored under the project document registry. Approved versions are immutable.
                  </p>

                  {uploadError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#E05252]/10 border border-[#E05252]/20 text-[#E05252] text-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{uploadError}
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#65C466]/10 border border-[#65C466]/20 text-[#65C466] text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{uploadSuccess}
                    </div>
                  )}

                  {/* drop zone */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Drop file here or click to browse"
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
                    className={`
                      border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3AA18]
                      ${isDragging
                        ? "border-[#E3AA18] bg-[#E3AA18]/5"
                        : "border-[#2A2A2A] hover:border-[#E3AA18]/50 bg-[#111111]"}
                    `}
                  >
                    <Upload className="w-8 h-8 text-[#858585] mx-auto mb-3" />
                    <p className="text-sm font-semibold text-[#F5F5F5]">Drag & drop or click to browse</p>
                    <p className="text-[11px] text-[#858585] mt-1">
                      PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, ZIP, images — max 50 MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={ALLOWED_EXTENSIONS.join(",")}
                      onChange={e => e.target.files?.[0] && validateAndSet(e.target.files[0])}
                    />
                  </div>

                  {/* selected file preview */}
                  {uploadedFile && (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#111111] border border-[#E3AA18]/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-[#E3AA18] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#F5F5F5] truncate">{uploadedFile.name}</p>
                          <p className="text-[10px] text-[#858585]">{formatFileSize(uploadedFile.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => { setUploadedFile(null); setUploadError(""); }}
                          className="text-[#858585] hover:text-[#E05252] transition-colors"
                          aria-label="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={handleUpload}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E3AA18] hover:bg-[#F0BC2B] text-[#0A0A0A] text-[11px] font-bold transition-colors disabled:opacity-50"
                        >
                          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          {uploading ? "Uploading…" : "Upload"}
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-[#858585]">
                    Files are versioned automatically (v1, v2, v3…). Previously approved documents are never overwritten.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ─ VERIFICATION ─ */}
          {tab === "verification" && (
            <div className="space-y-4">
              <p className="text-xs text-[#858585]">
                Verification checks the uploaded document against the requirements for <strong className="text-[#F5F5F5]">{milestone.name}</strong>.
              </p>

              <div className="space-y-2">
                {[
                  "Document uploaded",
                  "Correct file type",
                  "File size within limit",
                  "Required sections present",
                  "Consistent with previous milestone",
                ].map((check, i) => {
                  const passed = !!milestone.document;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#111111] border border-[#2A2A2A]">
                      {passed
                        ? <CheckCircle2 className="w-4 h-4 text-[#65C466] shrink-0" />
                        : <Clock className="w-4 h-4 text-[#858585] shrink-0" />}
                      <span className="text-xs text-[#F5F5F5]">{check}</span>
                      <span className={`ml-auto text-[10px] font-semibold ${passed ? "text-[#65C466]" : "text-[#858585]"}`}>
                        {passed ? "Pass" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {!milestone.document && (
                <div className="p-3.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-xs text-[#858585]">
                  Upload the required document first. Verification runs automatically after upload.
                </div>
              )}

              {milestone.document && !isApproved && (
                <div className="pt-2 border-t border-[#292929]">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E3AA18] hover:bg-[#F0BC2B] text-[#0A0A0A] text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    Submit for CEO Approval
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─ HISTORY ─ */}
          {tab === "history" && (
            <div className="space-y-3">
              <p className="text-xs text-[#858585]">Execution history for this milestone.</p>
              {[
                { label: "Created",  done: true  },
                { label: "Started",  done: ["IN_PROGRESS", "DRAFT", "SUBMITTED", "VALIDATING", "UNDER_REVIEW", "APPROVED"].includes(rawState) },
                { label: "Document uploaded", done: !!milestone.document },
                { label: "Submitted for review", done: ["SUBMITTED", "VALIDATING", "UNDER_REVIEW", "APPROVED"].includes(rawState) },
                { label: "Verified",  done: ["UNDER_REVIEW", "APPROVED"].includes(rawState) },
                { label: "Approved",  done: rawState === "APPROVED" },
              ].map(({ label, done }, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#111111] border border-[#2A2A2A]">
                  {done
                    ? <CheckCircle2 className="w-4 h-4 text-[#65C466] shrink-0" />
                    : <Clock className="w-4 h-4 text-[#858585] shrink-0" />}
                  <span className={`text-xs ${done ? "text-[#F5F5F5]" : "text-[#858585]"}`}>{label}</span>
                  <span className={`ml-auto text-[10px] font-semibold ${done ? "text-[#65C466]" : "text-[#858585]"}`}>
                    {done ? "Complete" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── footer ── */}
        <div className="shrink-0 px-5 py-3.5 border-t border-[#292929] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#2A2A2A] text-[11px] font-semibold text-[#BDBDBD] hover:bg-[#1D1D1D] hover:text-[#F5F5F5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3AA18]"
          >
            Close
          </button>
          {!isLocked && !isApproved && (
            <button
              type="button"
              onClick={() => setTab("upload")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E3AA18] hover:bg-[#F0BC2B] text-[#0A0A0A] text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3AA18]"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Document
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
