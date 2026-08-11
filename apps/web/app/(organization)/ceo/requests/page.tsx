"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, XCircle, Clock, AlertCircle, Shield,
  FileText, CheckSquare, GitBranch, RefreshCw,
  FolderKanban, ChevronDown, ArrowUpRight, Loader2,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { formatEnumLabel } from "@/lib/utils/formatters";

type FilterTab = "PENDING" | "PROJECTS" | "TASKS" | "DOCUMENTS" | "COMPLETED" | "ALL";

function typeIcon(t: string) {
  if (t === "PROJECT_ASSIGNMENT" || t === "PROJECT_CHANGE") return <FolderKanban className="w-3.5 h-3.5" />;
  if (t === "TASK_APPROVAL" || t === "TASK_CHANGE") return <CheckSquare className="w-3.5 h-3.5" />;
  if (t === "DOCUMENT_REVIEW") return <FileText className="w-3.5 h-3.5" />;
  if (t === "GITHUB_VERIFICATION") return <GitBranch className="w-3.5 h-3.5" />;
  return <Shield className="w-3.5 h-3.5" />;
}

function statusPill(status: string) {
  const s = status?.toUpperCase() ?? "";
  if (s === "APPROVED")          return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
  if (s === "REJECTED")          return "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20";
  if (s === "CHANGES_REQUESTED") return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
  return "bg-muted text-muted-foreground border border-border";
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const TABS: { id: FilterTab; label: string }[] = [
  { id: "PENDING",   label: "Pending" },
  { id: "PROJECTS",  label: "Projects" },
  { id: "TASKS",     label: "Tasks" },
  { id: "DOCUMENTS", label: "Documents" },
  { id: "COMPLETED", label: "Completed" },
  { id: "ALL",       label: "All" },
];

export default function CentralRequestsPage() {
  const [requests, setRequests]     = useState<any[]>([]);
  const [tab, setTab]               = useState<FilterTab>("PENDING");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [reason, setReason]         = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/org/requests");
      if (res.data?.success) setRequests(res.data.data || []);
      else setError("Failed to load requests.");
    } catch { setError("Unable to load requests."); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const decide = async (decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED") => {
    if (!selectedReq) return;
    if (decision !== "APPROVED" && !reason.trim()) {
      setActionError("Please provide a reason for this decision.");
      return;
    }
    setProcessing(true); setActionError("");
    try {
      const res = await apiClient.post(`/org/requests/${selectedReq.id}/decision`, { decision, reason: reason.trim() });
      if (res.data?.success) { setSelectedReq(null); setReason(""); fetch(); }
      else setActionError(res.data?.error || "Failed to process decision.");
    } catch (e: any) {
      setActionError(e.response?.data?.error || "Failed to process decision.");
    } finally { setProcessing(false); }
  };

  const filtered = requests.filter(r => {
    if (tab === "PENDING")   return r.status === "PENDING" || r.status === "IN_REVIEW";
    if (tab === "PROJECTS")  return r.requestType?.includes("PROJECT");
    if (tab === "TASKS")     return r.requestType?.includes("TASK");
    if (tab === "DOCUMENTS") return r.requestType?.includes("DOCUMENT");
    if (tab === "COMPLETED") return ["APPROVED","REJECTED","CHANGES_REQUESTED"].includes(r.status);
    return true;
  });

  const pendingCount = requests.filter(r => r.status === "PENDING" || r.status === "IN_REVIEW").length;

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1200px] mx-auto space-y-6">

      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            ManMadhan · CEO
          </p>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none">
            Requests
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">
            Project, task, document and verification approval requests.
          </p>
        </div>
        <button
          onClick={fetch}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-[12px] font-semibold text-foreground transition-colors self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* ── tabs ── */}
      <div className="flex items-center gap-2 border-b border-border pb-0 overflow-x-auto">
        {TABS.map(t => {
          const isPending = t.id === "PENDING" && pendingCount > 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px
                ${tab === t.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"}
              `}
            >
              {t.label}
              {isPending && (
                <span className="w-4 h-4 rounded-full bg-gold text-[#111827] text-[9px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <CheckCircle2 className="w-5 h-5 text-muted-foreground/30" />
          <p className="text-[13px] font-semibold text-foreground">No requests in this view</p>
          <p className="text-[12px] text-muted-foreground">
            {tab === "PENDING" ? "All requests are up to date." : "Nothing to show here."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card">
          {filtered.map(r => (
            <div
              key={r.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
            >
              {/* type icon */}
              <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                {typeIcon(r.requestType)}
              </div>

              {/* content */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-[13px] font-semibold text-foreground truncate">{r.title}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {formatEnumLabel(r.requestType)}
                  </span>
                  {r.requesterName && (
                    <span className="text-[11px] text-muted-foreground">{r.requesterName}</span>
                  )}
                  <span className="text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
                </div>
              </div>

              {/* status + action */}
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${statusPill(r.status)}`}>
                  {formatEnumLabel(r.status)}
                </span>
                {(r.status === "PENDING" || r.status === "IN_REVIEW") && (
                  <button
                    onClick={() => { setSelectedReq(r); setReason(""); setActionError(""); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gold hover:bg-gold-hover text-[#111827] text-[11px] font-semibold transition-colors"
                  >
                    Review <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── review modal ── */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* modal header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {typeIcon(selectedReq.requestType)}
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {formatEnumLabel(selectedReq.requestType)}
                  </span>
                </div>
                <p className="text-[15px] font-bold text-foreground leading-snug">{selectedReq.title}</p>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="ml-4 p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* modal body */}
            <div className="px-6 py-5 space-y-4">
              {selectedReq.description && (
                <p className="text-[13px] text-muted-foreground leading-relaxed">{selectedReq.description}</p>
              )}

              {/* metadata */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-xl border border-border">
                {[
                  { label: "Type",      value: formatEnumLabel(selectedReq.requestType) },
                  { label: "Status",    value: formatEnumLabel(selectedReq.status) },
                  { label: "Submitted", value: new Date(selectedReq.createdAt).toLocaleDateString() },
                  { label: "Requester", value: selectedReq.requesterName || "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
                    <p className="text-[13px] font-semibold text-foreground mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {actionError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {actionError}
                </div>
              )}

              <div>
                <label className="block text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Feedback / Reason
                  <span className="ml-1 text-muted-foreground/60 normal-case tracking-normal font-normal">
                    (required for Changes / Rejection)
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Describe your decision or provide actionable feedback..."
                  className="w-full px-3.5 py-3 bg-background border border-border rounded-xl text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold resize-none"
                />
              </div>
            </div>

            {/* modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  disabled={processing}
                  onClick={() => decide("CHANGES_REQUESTED")}
                  className="px-3.5 py-2 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-semibold hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                >
                  Request Changes
                </button>
                <button
                  disabled={processing}
                  onClick={() => decide("REJECTED")}
                  className="px-3.5 py-2 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 text-[11px] font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  disabled={processing}
                  onClick={() => decide("APPROVED")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold-hover text-[#111827] text-[11px] font-bold transition-colors disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
