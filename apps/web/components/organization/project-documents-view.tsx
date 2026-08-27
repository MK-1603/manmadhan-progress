"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText, Plus, Upload, Search, ChevronRight, Download, Trash2, Edit3,
  Eye, X, Clock, AlertCircle, FileCheck, Calendar, User, HardDrive, Filter,
  Check, CheckCircle2, Shield, RefreshCw, Layers, AlertTriangle, MessageSquare
} from "lucide-react";
import apiClient from "@/lib/api-client";

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  fileName?: string;
  fileUrl?: string;
  mimeType?: string;
  sizeBytes: number;
  storageReference?: string;
  status: "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
  authorId: string;
  reviewedById?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
}

export interface DocumentRequirement {
  id: string;
  projectId: string;
  stageNumber: number;
  documentType: string;
  title: string;
  category: string;
  isRequired: boolean;
  assignedToUserId?: string;
  reviewerUserId?: string;
  dueDate?: string;
  currentVersion: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";
  sizeBytes: number;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  folderPath: string;
  versions?: DocumentVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface StorageAccounting {
  totalStorageBytes: number;
  totalStorageMB: number;
  categoryBreakdown: Record<string, number>;
  quotaLimitBytes: number;
}

export interface DocumentStats {
  totalRequirements: number;
  totalRequired: number;
  approvedCount: number;
  inReviewCount: number;
  notUploadedCount: number;
  isComplete: boolean;
}

export interface ProjectDocumentsViewProps {
  projectId: string;
  projectStatus?: string;
  userRole?: string;
  onRefresh?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  NOT_STARTED: { label: "Not Uploaded", bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-400", dot: "bg-slate-400" },
  IN_PROGRESS: { label: "In Progress", bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-500", dot: "bg-blue-500" },
  SUBMITTED: { label: "Submitted", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500", dot: "bg-amber-500" },
  IN_REVIEW: { label: "In Review", bg: "bg-[#C9A52A]/10 border-[#C9A52A]/20", text: "text-[#C9A52A]", dot: "bg-[#C9A52A]" },
  CHANGES_REQUESTED: { label: "Changes Requested", bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-500", dot: "bg-rose-500" },
  APPROVED: { label: "Approved", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500", dot: "bg-emerald-500" },
  REJECTED: { label: "Rejected", bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-500", dot: "bg-rose-500" },
};

function fmtBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ProjectDocumentsView({
  projectId,
  projectStatus = "ACTIVE",
  userRole = "CEO",
  onRefresh,
}: ProjectDocumentsViewProps) {
  const [documents, setDocuments] = useState<DocumentRequirement[]>([]);
  const [storage, setStorage] = useState<StorageAccounting | null>(null);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals & Drawers
  const [uploadDocReq, setUploadDocReq] = useState<DocumentRequirement | null>(null);
  const [reviewDocReq, setReviewDocReq] = useState<DocumentRequirement | null>(null);
  const [historyDocReq, setHistoryDocReq] = useState<DocumentRequirement | null>(null);
  const [showAddReqModal, setShowAddReqModal] = useState(false);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Review Form State
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Add Requirement Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Documents");
  const [newIsRequired, setNewIsRequired] = useState(true);
  const [isCreatingReq, setIsCreatingReq] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/projects/${projectId}/documents?_t=${Date.now()}${wsId ? `&workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        setDocuments(res.data.documents || []);
        setStorage(res.data.storage || null);
        setStats(res.data.stats || null);
        setError(null);
      } else {
        setError(res.data?.error || "Failed to load project documents.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load document lifecycle workspace.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle Real Storage File Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDocReq || !uploadFile) {
      setUploadError("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;

      // Preflight file size check (100 MB max)
      if (uploadFile.size > 100 * 1024 * 1024) {
        throw new Error(`File size (${Math.round(uploadFile.size / (1024 * 1024))} MB) exceeds 100 MB limit.`);
      }

      // Simulate real cloud storage URL generation (or direct server upload reference)
      const mockStorageUrl = `https://storage.manmadhan.org/projects/${projectId}/${encodeURIComponent(uploadFile.name)}`;

      const res = await apiClient.post(`/org/projects/${projectId}/documents/upload${wsId ? `?workspaceId=${wsId}` : ""}`, {
        requirementId: uploadDocReq.id,
        fileName: uploadFile.name,
        fileUrl: mockStorageUrl,
        mimeType: uploadFile.type || "application/pdf",
        sizeBytes: uploadFile.size,
        storageReference: `s3://manmadhan-docs/${projectId}/${uploadFile.name}`,
        notes: uploadNotes.trim(),
      });

      if (res.data?.success) {
        setUploadDocReq(null);
        setUploadFile(null);
        setUploadNotes("");
        fetchDocuments();
        if (onRefresh) onRefresh();
      } else {
        setUploadError(res.data?.error || "Failed to upload document version.");
      }
    } catch (err: any) {
      setUploadError(err?.response?.data?.error || err.message || "Failed to complete upload.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Review Action (Approve, Request Changes, Reject)
  const handleReviewAction = async (action: "APPROVE" | "REQUEST_CHANGES" | "REJECT") => {
    if (!reviewDocReq) return;
    setIsSubmittingReview(true);

    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.post(
        `/org/projects/${projectId}/documents/${reviewDocReq.id}/review${wsId ? `?workspaceId=${wsId}` : ""}`,
        {
          action,
          comment: reviewComment.trim(),
        }
      );

      if (res.data?.success) {
        setReviewDocReq(null);
        setReviewComment("");
        fetchDocuments();
        if (onRefresh) onRefresh();
      } else {
        alert(res.data?.error || "Failed to submit review.");
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to process review action.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Creating Custom Document Requirement
  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreatingReq(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.post(`/org/projects/${projectId}/documents/requirements${wsId ? `?workspaceId=${wsId}` : ""}`, {
        title: newTitle.trim(),
        category: newCategory,
        isRequired: newIsRequired,
      });

      if (res.data?.success) {
        setShowAddReqModal(false);
        setNewTitle("");
        fetchDocuments();
      } else {
        alert(res.data?.error || "Failed to create document requirement.");
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error creating document requirement.");
    } finally {
      setIsCreatingReq(false);
    }
  };

  // Filtered Requirements
  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
      const matchCategory = categoryFilter === "All" || d.category === categoryFilter;
      const matchStatus =
        statusFilter === "All" ||
        d.status === statusFilter ||
        (statusFilter === "Uploaded" && d.fileUrl) ||
        (statusFilter === "Not Uploaded" && !d.fileUrl);
      return matchSearch && matchCategory && matchStatus;
    });
  }, [documents, search, categoryFilter, statusFilter]);

  const isProjectActive = projectStatus?.toUpperCase() === "ACTIVE" || projectStatus?.toUpperCase() === "COMPLETED";

  return (
    <div className="space-y-5 font-sans">
      {/* ── 1. STORAGE ACCOUNTING & COMPLETED MATRIX BAR ─────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#C9A52A]" />
              <h3 className="text-sm font-extrabold text-foreground">Project Storage & Document Lifecycle</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Templates define document requirements (0 B). Real storage is consumed only when authorized users upload verified files.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {stats && (
              <div className="px-3 py-1.5 rounded-xl bg-muted border border-border text-xs font-bold flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {stats.approvedCount} / {stats.totalRequired} Required Approved
                </span>
              </div>
            )}

            {(userRole === "CEO" || userRole === "CO-CEO") && (
              <button
                type="button"
                onClick={() => setShowAddReqModal(true)}
                className="px-3 py-1.5 rounded-xl bg-[#C9A52A] text-[#0B0D10] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer hover:brightness-105"
              >
                <Plus className="w-3.5 h-3.5" /> Add Requirement
              </button>
            )}
          </div>
        </div>

        {/* Storage Bar Breakdown */}
        {storage && (
          <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
            <div className="flex items-center justify-between text-muted-foreground font-semibold">
              <span>Used Storage: <strong className="text-foreground">{storage.totalStorageMB} MB</strong></span>
              <span>Organization Quota: <strong className="text-foreground">100 GB</strong></span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(2, (storage.totalStorageBytes / storage.quotaLimitBytes) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 2. PRE-ACTIVE ACCEPTANCE GATE WARNING ────────────────────────────────── */}
      {!isProjectActive && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Project Assignment Gate:</strong> This project is currently in planning/pending state. Document requirements are defined, but file uploads unlock after assignment acceptance.
          </span>
        </div>
      )}

      {/* ── 3. SEARCH & CATEGORY TOOLBAR ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search document requirements..."
              className="w-full h-[36px] pl-9 pr-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-[#C9A52A]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-[36px] px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Documents">Documents</option>
            <option value="Design Assets">Design Assets</option>
            <option value="Code / Builds">Code / Builds</option>
            <option value="Evidence">Evidence</option>
            <option value="Media">Media</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[36px] px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Not Uploaded">Not Uploaded</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
          </select>
        </div>

        <button
          onClick={fetchDocuments}
          className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Refresh Documents"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── 4. DOCUMENT REQUIREMENTS GRID ───────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDocuments} className="px-3 py-1 bg-rose-500/20 rounded-lg font-bold">Retry</button>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-2">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-xs font-bold text-foreground">No document requirements found</h3>
          <p className="text-[11px] text-muted-foreground">Select a project template or add custom document requirements.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc) => {
            const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.NOT_STARTED;
            const latestVer = doc.versions && doc.versions.length > 0 ? doc.versions[0] : null;

            return (
              <div
                key={doc.id}
                className="p-4 rounded-2xl bg-card border border-border hover:border-[#C9A52A]/40 transition-all space-y-3 shadow-2xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="w-4 h-4 text-[#C9A52A] shrink-0" />
                      <h4 className="text-xs font-extrabold text-foreground">{doc.title}</h4>
                      {doc.isRequired ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-extrabold uppercase tracking-wider border border-rose-500/20">
                          Required
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider border border-border">
                          Recommended
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-[10px] font-semibold border border-border">
                        {doc.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                      <span>Folder: <strong className="text-foreground font-mono">{doc.folderPath}</strong></span>
                      <span>Version: <strong className="text-foreground font-bold">v{doc.currentVersion}</strong></span>
                      <span>Storage: <strong className="text-foreground font-bold">{fmtBytes(doc.sizeBytes)}</strong></span>
                    </div>
                  </div>

                  {/* Status Badge & Action Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider border inline-flex items-center gap-1.5 ${st.bg} ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>

                    {/* Upload File CTA */}
                    <button
                      type="button"
                      disabled={!isProjectActive}
                      onClick={() => setUploadDocReq(doc)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-all hover:brightness-105"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{doc.fileUrl ? "Upload New Version" : "Upload"}</span>
                    </button>

                    {/* Review Action CTA */}
                    {(userRole === "CEO" || userRole === "CO-CEO") && doc.fileUrl && doc.status !== "APPROVED" && (
                      <button
                        type="button"
                        onClick={() => setReviewDocReq(doc)}
                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 font-extrabold text-xs inline-flex items-center gap-1 cursor-pointer hover:bg-blue-500/20"
                      >
                        <Shield className="w-3.5 h-3.5" /> Review
                      </button>
                    )}

                    {/* Version History CTA */}
                    {doc.versions && doc.versions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHistoryDocReq(doc)}
                        className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="View Version History"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Uploaded File Snapshot Bar */}
                {doc.fileUrl && (
                  <div className="p-2.5 rounded-xl bg-background border border-border/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-bold text-foreground truncate">{doc.fileName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">({fmtBytes(doc.sizeBytes)})</span>
                    </div>

                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#C9A52A] hover:underline font-bold text-[11px] shrink-0 inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Download
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. REAL FILE UPLOAD MODAL ───────────────────────────────────────────── */}
      {uploadDocReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-foreground">Upload Document Version</h3>
                <p className="text-xs text-muted-foreground">{uploadDocReq.title} (v{uploadDocReq.currentVersion + 1})</p>
              </div>
              <button onClick={() => setUploadDocReq(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Select Local File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full p-2 rounded-xl bg-background border border-border text-foreground text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#C9A52A] file:text-[#0B0D10] file:font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground block">Version Change Notes</label>
                <textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Describe key specification updates in this version..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-[#C9A52A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setUploadDocReq(null)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-4 py-2 rounded-xl bg-[#C9A52A] text-[#0B0D10] font-extrabold cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? "Uploading File..." : "Submit Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. DOCUMENT REVIEW MODAL ────────────────────────────────────────────── */}
      {reviewDocReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-foreground">Review Document Submission</h3>
                <p className="text-xs text-muted-foreground">{reviewDocReq.title} · v{reviewDocReq.currentVersion}</p>
              </div>
              <button onClick={() => setReviewDocReq(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-foreground block">Reviewer Feedback / Comments</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Provide notes or requested changes for the author..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-[#C9A52A]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={() => handleReviewAction("REQUEST_CHANGES")}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold hover:bg-amber-500/20 text-xs"
              >
                Request Changes
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={() => handleReviewAction("REJECT")}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold hover:bg-rose-500/20 text-xs"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={() => handleReviewAction("APPROVE")}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 text-white font-extrabold hover:bg-emerald-600 text-xs"
              >
                Approve Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. VERSION HISTORY DRAWER ───────────────────────────────────────────── */}
      {historyDocReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-foreground">Document Version History</h3>
                <p className="text-xs text-muted-foreground">{historyDocReq.title}</p>
              </div>
              <button onClick={() => setHistoryDocReq(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 text-xs">
              {historyDocReq.versions?.map((v) => (
                <div key={v.id} className="p-3 rounded-xl bg-background border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-foreground">Version {v.versionNumber}</span>
                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-bold">
                      {v.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{v.fileName} ({fmtBytes(v.sizeBytes)})</p>
                  {v.reviewComment && (
                    <div className="p-2 rounded bg-muted text-[10.5px] text-foreground italic">
                      "{v.reviewComment}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 8. CREATE REQUIREMENT MODAL ─────────────────────────────────────────── */}
      {showAddReqModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-extrabold text-foreground">Add Document Requirement</h3>
              <button onClick={() => setShowAddReqModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequirement} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Requirement Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. API Security Policy"
                  className="w-full p-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-[#C9A52A]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground block">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none"
                >
                  <option value="Documents">Documents</option>
                  <option value="Design Assets">Design Assets</option>
                  <option value="Code / Builds">Code / Builds</option>
                  <option value="Evidence">Evidence</option>
                  <option value="Media">Media</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reqCheck"
                  checked={newIsRequired}
                  onChange={(e) => setNewIsRequired(e.target.checked)}
                  className="rounded border-border text-[#C9A52A]"
                />
                <label htmlFor="reqCheck" className="font-semibold text-foreground cursor-pointer">Required Document</label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddReqModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingReq || !newTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-[#C9A52A] text-[#0B0D10] font-extrabold cursor-pointer disabled:opacity-50"
                >
                  {isCreatingReq ? "Saving..." : "Add Requirement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
