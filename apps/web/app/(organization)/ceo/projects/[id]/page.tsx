"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, FileText,
  MoreHorizontal, AlertTriangle, Trash2, Archive, Edit3, Eye,
  X, Plus, Target, Activity as ActivityIcon, Loader2, AlertCircle,
  Github, GitBranch, Users, TrendingUp, Layers, BarChart3,
  ChevronRight, BookOpen, Shield, Upload, ExternalLink, Filter,
  Check, MessageSquare, HardDrive, RefreshCw, Send, CheckSquare,
  Flag, Folder, Bot
} from "lucide-react";

import apiClient from "@/lib/api-client";
import { ProjectMilestonesView } from "@/components/organization/project-milestones-view";
import { MilestoneWorkspace } from "@/components/organization/milestone-workspace";
import { GitHubOAuthPanel } from "@/components/integrations/github-oauth-panel";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { ProjectDocumentsView } from "@/components/organization/project-documents-view";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { EditProjectModal } from "@/components/organization/edit-project-modal";
import { ProjectTeamView } from "@/components/organization/project-team-view";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = "OVERVIEW" | "TEAM" | "WORK" | "AI_TOOLS" | "MILESTONES" | "DOCUMENTS" | "SUBMISSIONS" | "GITHUB" | "TIMELINE";

const TABS: { id: TabId; label: string }[] = [
  { id: "OVERVIEW", label: "Overview" },
  { id: "TEAM", label: "Team" },
  { id: "WORK", label: "Work" },
  { id: "AI_TOOLS", label: "AI Tools (Hub)" },
  { id: "MILESTONES", label: "Milestones" },
  { id: "DOCUMENTS", label: "Documents" },
  { id: "SUBMISSIONS", label: "Submissions" },
  { id: "GITHUB", label: "GitHub" },
  { id: "TIMELINE", label: "Timeline" },
];


export interface ProjectSubmission {
  id: string;
  title: string;
  description: string;
  submittedBy: string;
  submittedRole?: string;
  submittedAt: string;
  status: "Under Review" | "Approved" | "Changes Requested" | "Rejected";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  deploymentUrl?: string;
  applicationUrl?: string;
  repositoryUrl?: string;
  versionTag?: string;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(dateStr?: string | null, fallback = "—") {
  if (!dateStr) return fallback;
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function fmtTime(dateStr?: string | null) {
  if (!dateStr) return "09:00 AM";
  try {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "09:00 AM";
  }
}

function fmtDay(dateStr?: string | null) {
  if (!dateStr) return "Friday";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return "Friday";
  }
}

function daysRemaining(deadlineStr?: string | null) {
  if (!deadlineStr) return null;
  const diff = new Date(deadlineStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function deriveHealth(project: any, completedCount: number, totalCount: number): { label: string; color: string } {
  if (project.health) {
    const h = project.health.toLowerCase();
    if (h.includes("track") || h.includes("healthy")) return { label: "On Track", color: "text-emerald-600 dark:text-emerald-400" };
    if (h.includes("risk")) return { label: "At Risk", color: "text-amber-600 dark:text-amber-400" };
    if (h.includes("block")) return { label: "Blocked", color: "text-rose-600 dark:text-rose-400" };
    if (h.includes("overdue") || h.includes("late")) return { label: "Overdue", color: "text-rose-600 dark:text-rose-400" };
    if (h.includes("complete")) return { label: "Completed", color: "text-emerald-600 dark:text-emerald-400" };
  }
  if (project.deadline) {
    const days = daysRemaining(project.deadline);
    if (days !== null && days < 0) return { label: "Overdue", color: "text-rose-600 dark:text-rose-400" };
    if (days !== null && days < 5) return { label: "At Risk", color: "text-amber-600 dark:text-amber-400" };
  }
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  if (pct >= 90) return { label: "On Track", color: "text-emerald-600 dark:text-emerald-400" };
  return { label: "On Track", color: "text-emerald-600 dark:text-emerald-400" };
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Modal({ onClose, children, maxW = "max-w-md" }: { onClose: () => void; children: React.ReactNode; maxW?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[4px] flex items-center justify-center p-4">
      <div className={`w-full ${maxW} bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-2xl overflow-hidden font-sans`}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose, icon }: { title: string; onClose: () => void; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E7EC] dark:border-[#272D36]">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[14.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{title}</span>
      </div>
      <button onClick={onClose} className="p-1 text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function OvCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[11px] ${className}`}>
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.1em] mb-3">{children}</p>;
}

function PersonRow({ name, role, badge }: { name: string; role?: string; badge?: string }) {
  const initials = name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-8 h-8 rounded-full bg-[#C9A52A]/15 border border-[#C9A52A]/30 flex items-center justify-center text-[10px] font-bold text-[#C9A52A] dark:text-[#D4B12F] shrink-0">
        {initials || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate">{name}</p>
        {role && <p className="text-[11px] text-[#667085] dark:text-[#8B95A5]">{role}</p>}
      </div>
      {badge && (
        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider shrink-0">
          {badge}
        </span>
      )}
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[#E4E7EC] dark:bg-[#272D36] ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="w-full space-y-4 p-4 sm:p-6 font-sans">
      <Skeleton className="h-4 w-36" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="h-[6px] w-full rounded-full bg-[#E4E7EC] dark:bg-[#272D36]">
        <div className="h-full w-2/3 bg-[#C9A52A]/30 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────

function OverviewTab({
  project, tasks, milestones, documents, submissions,
  completedCount, totalCount, remainingCount, progressPercent,
  onTabSwitch,
}: {
  project: any; tasks: any[]; milestones: any[]; documents: any[]; submissions: ProjectSubmission[];
  completedCount: number; totalCount: number; remainingCount: number; progressPercent: number;
  onTabSwitch: (tab: TabId) => void;
}) {
  const health = deriveHealth(project, completedCount, totalCount);
  const days = daysRemaining(project.deadline);
  const completedMilestones = milestones.filter((m) => {
    const s = (m.state || m.status || "").toUpperCase();
    return s === "APPROVED" || s === "COMPLETED";
  });
  const ownerName = project.ownerName || project.owner || "CEO";
  const assignedTo = project.assignment?.assignedTo;
  const requirements: any[] = project.requirements || [];
  const firstReq = requirements[0];
  const stats = project.stats || {};
  const overdueCount = stats.overdue || 0;
  const inProgressCount = stats.inProgress || 0;
  const approvedSubmissions = submissions.filter((s) => s.status === "Approved").length;

  return (
    <div className="space-y-4 font-sans">
      {/* ROW 1: PROJECT SUMMARY + OWNERSHIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OvCard className="p-4 space-y-3">
          <CardLabel>Project Summary</CardLabel>
          {(project.objective || project.description) && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5]">Objective</p>
              <p className="text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] leading-relaxed">{project.objective || project.description}</p>
            </div>
          )}
          {project.mandate && (
            <div className="space-y-1 pt-2 border-t border-[#F0F2F5] dark:border-[#1D222A]">
              <p className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5]">Mandate</p>
              <p className="text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] leading-relaxed line-clamp-3">{project.mandate}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-2 border-t border-[#F0F2F5] dark:border-[#1D222A] text-[12px]">
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">Status</p>
              <p className={`font-semibold mt-0.5 ${(project.status || "").toLowerCase() === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}`}>
                ● {project.status || "Active"}
              </p>
            </div>
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">Target Deadline</p>
              <p className="font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] mt-0.5">{fmtDate(project.deadline, "Flexible")}</p>
            </div>
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">Created</p>
              <p className="font-mono text-[#17202A] dark:text-[#F2F4F7] mt-0.5">{fmtDate(project.createdAt)}</p>
            </div>
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">Last Updated</p>
              <p className="font-mono text-[#17202A] dark:text-[#F2F4F7] mt-0.5">{fmtDate(project.updatedAt)}</p>
            </div>
          </div>
        </OvCard>

        <OvCard className="p-4 space-y-4">
          <CardLabel>Project Ownership & Assignment</CardLabel>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5]">Project Owner</p>
            <PersonRow name={ownerName} role="Chief Executive Officer" badge="Owner" />
          </div>
          <div className="space-y-1.5 pt-3 border-t border-[#F0F2F5] dark:border-[#1D222A]">
            <p className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5]">Execution Lead</p>
            {assignedTo ? (
              <PersonRow name={assignedTo.name || assignedTo.email || "CO-CEO"} role={assignedTo.role || "CO-CEO"} badge="Lead" />
            ) : (
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] italic">No execution lead assigned.</p>
            )}
          </div>
          <div className="space-y-2 pt-3 border-t border-[#F0F2F5] dark:border-[#1D222A]">
            <p className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5]">Assigned Members</p>
            {(project.team || []).length > 0 ? (
              <div className="space-y-2">
                {(project.team || []).map((m: any) => (
                  <PersonRow key={m.id || m.name} name={m.name || m.email} role={m.role} />
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] italic">No members assigned to this project.</p>
            )}
          </div>
        </OvCard>
      </div>

      {/* ROW 2: HEALTH + EXECUTION SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OvCard className="p-4 space-y-3">
          <CardLabel>Project Health</CardLabel>
          <div className="flex items-baseline gap-2">
            <span className={`text-[20px] font-bold leading-none ${health.color}`}>●</span>
            <span className={`text-[15px] font-bold ${health.color}`}>{health.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">Target Date</p>
              <p className="font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] mt-0.5">{fmtDate(project.deadline, "Flexible")}</p>
            </div>
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">Days Remaining</p>
              <p className={`font-semibold mt-0.5 ${days === null ? "text-[#17202A] dark:text-[#F2F4F7]" : days < 0 ? "text-rose-600 dark:text-rose-400" : days < 7 ? "text-amber-600 dark:text-amber-400" : "text-[#17202A] dark:text-[#F2F4F7]"}`}>
                {days === null ? "—" : days === 0 ? "Due today" : days < 0 ? `${Math.abs(days)}d overdue` : `${days} days`}
              </p>
            </div>
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">Overdue Work</p>
              <p className={`font-semibold mt-0.5 ${overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-[#17202A] dark:text-[#F2F4F7]"}`}>{overdueCount}</p>
            </div>
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">Active Risks</p>
              <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7] mt-0.5">0</p>
            </div>
          </div>
        </OvCard>

        <OvCard className="p-4 space-y-3">
          <CardLabel>Execution Summary</CardLabel>
          <div className="flex items-end gap-1.5">
            <span className="text-[30px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-none font-mono">{progressPercent}%</span>
            <span className="text-[12px] text-[#667085] dark:text-[#8B95A5] mb-1">overall progress</span>
          </div>
          <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
            <div className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full transition-all duration-700" style={{ width: `${Math.min(100, progressPercent)}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px] pt-1">
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">Assigned Work</p>
              <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7] mt-0.5">{totalCount}</p>
            </div>
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">Completed</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{completedCount}</p>
            </div>
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">In Progress</p>
              <p className="font-semibold text-[#C9A52A] dark:text-[#D4B12F] mt-0.5">{inProgressCount}</p>
            </div>
            <div>
              <p className="text-[#667085] dark:text-[#8B95A5]">Remaining</p>
              <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7] mt-0.5">{remainingCount}</p>
            </div>
          </div>
        </OvCard>
      </div>

      {/* ROW 3: RECENT PROJECT ACTIVITY */}
      <OvCard className="p-4 space-y-3">
        <CardLabel>Recent Project Activity</CardLabel>
        {tasks.length === 0 && milestones.length === 0 ? (
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] italic">Project activity will appear here as work begins.</p>
        ) : (
          <div className="divide-y divide-[#F0F2F5] dark:divide-[#1D222A]">
            {tasks.slice(0, 5).map((t: any) => {
              const isDone = t.status === "Completed" || t.status === "Approved";
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDone ? "bg-emerald-500" : "bg-[#C9A52A] dark:bg-[#D4B12F]"}`} />
                    <p className="text-[12px] text-[#17202A] dark:text-[#F2F4F7] truncate">
                      <strong className="font-semibold">{t.assigneeName || "Team Member"}</strong>{" "}
                      <span className="text-[#667085] dark:text-[#8B95A5]">{isDone ? "completed deliverable" : "working on"} &ldquo;{t.title}&rdquo;</span>
                    </p>
                  </div>
                  {t.deadline && <span className="font-mono text-[11px] text-[#667085] dark:text-[#8B95A5] shrink-0">{fmtDate(t.deadline)}</span>}
                </div>
              );
            })}
          </div>
        )}
      </OvCard>
    </div>
  );
}

// ─── WORK TAB (PROJECT WORK / DELIVERABLES) ───────────────────────────────────

function WorkTab({ tasks, onAddTask }: { tasks: any[]; onAddTask: () => void }) {
  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
        <div>
          <p className="text-[9.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.1em]">Project Work</p>
          <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] mt-0.5">
            Assigned Deliverables for this Project
          </h3>
        </div>
        <button
          onClick={onAddTask}
          className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Assign Work
        </button>
      </div>

      {tasks.length === 0 ? (
        <OvCard className="p-8 text-center space-y-2">
          <CheckSquare className="w-8 h-8 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
          <p className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No project work assigned yet.</p>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] max-w-md mx-auto">
            Assign the first project deliverable when execution begins.
          </p>
          <button
            onClick={onAddTask}
            className="inline-flex items-center gap-1.5 px-4 h-[36px] rounded-[9px] border border-[#C9A52A]/40 text-[#C9A52A] dark:text-[#D4B12F] text-[12px] font-semibold hover:bg-[#C9A52A]/10 transition-colors cursor-pointer mx-auto mt-2"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Assign Work
          </button>
        </OvCard>
      ) : (
        <div className="space-y-3">
          {tasks.map((t: any) => {
            const status = t.status || "Active";
            const isDone = status === "Completed" || status === "Approved" || status === "Done";
            const isActive = status === "Active" || status === "In Progress" || status === "Accepted";
            return (
              <OvCard key={t.id} className="p-4 hover:border-[#C9A52A] dark:hover:border-[#D4B12F] transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-[14px] font-bold ${isDone ? "line-through text-[#667085] dark:text-[#8B95A5]" : "text-[#17202A] dark:text-[#F2F4F7]"}`}>
                        {t.title}
                      </h4>
                    </div>
                    <div className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                      Assigned to: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{t.assigneeName || "CO-CEO"}</strong>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] pt-0.5">
                      <span className={`font-bold px-2 py-0.5 rounded border uppercase ${isDone
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : isActive
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                        }`}>
                        {status}
                      </span>
                      {t.priority && (
                        <span className="font-semibold text-[#667085] dark:text-[#8B95A5]">· {t.priority}</span>
                      )}
                      {t.deadline && (
                        <span className="font-mono text-[#667085] dark:text-[#8B95A5]">· Due {fmtDate(t.deadline)}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={onAddTask}
                    className="px-3.5 h-[34px] rounded-[7px] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] transition-colors cursor-pointer self-start sm:self-center"
                  >
                    View Work
                  </button>
                </div>
              </OvCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SUBMISSIONS TAB ──────────────────────────────────────────────────────────

function SubmissionsTab({
  projectId,
  submissions,
  onAddSubmission,
}: {
  projectId: string;
  submissions: ProjectSubmission[];
  onAddSubmission: (sub: ProjectSubmission) => void;
}) {
  const [filter, setFilter] = useState<string>("All");
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const [subTitle, setSubTitle] = useState("");
  const [subDesc, setSubDesc] = useState("");
  const [subDeployUrl, setSubDeployUrl] = useState("");
  const [subAppUrl, setSubAppUrl] = useState("");
  const [subRepoUrl, setSubRepoUrl] = useState("");
  const [subVersion, setSubVersion] = useState("");
  const [subFile, setSubFile] = useState<File | null>(null);
  const [subFileError, setSubFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setSubFileError(null);
    if (!f) {
      setSubFile(null);
      return;
    }
    if (f.size > 1024 * 1024) {
      setSubFileError("File exceeds the 1 MB limit.");
      setSubFile(null);
      return;
    }
    setSubFile(f);
  };

  const handleSubmitDeliverable = async () => {
    if (!subTitle.trim() || !subDesc.trim()) {
      setSubFileError("Title and deliverable description are required.");
      return;
    }
    if (subFile && subFile.size > 1024 * 1024) {
      setSubFileError("File exceeds the 1 MB limit.");
      return;
    }

    setIsSubmitting(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") || "" : "";
      const res = await apiClient.post(`/org/projects/${projectId}/submissions${wsId ? `?workspaceId=${wsId}` : ""}`, {
        title: subTitle.trim(),
        description: subDesc.trim(),
        deploymentUrl: subDeployUrl.trim() || null,
        applicationUrl: subAppUrl.trim() || null,
        repositoryUrl: subRepoUrl.trim() || null,
        versionTag: subVersion.trim() || null,
        fileName: subFile?.name || null,
        fileSize: subFile?.size || null,
      });

      if (res.data?.success && res.data.data) {
        onAddSubmission(res.data.data);
      } else {
        const fallbackSub: ProjectSubmission = {
          id: `sub-${Date.now()}`,
          title: subTitle.trim(),
          description: subDesc.trim(),
          submittedBy: "User",
          submittedRole: "CO-CEO",
          submittedAt: new Date().toISOString(),
          status: "Under Review",
          fileName: subFile?.name,
          fileSize: subFile?.size,
          deploymentUrl: subDeployUrl.trim() || undefined,
          applicationUrl: subAppUrl.trim() || undefined,
          repositoryUrl: subRepoUrl.trim() || undefined,
          versionTag: subVersion.trim() || undefined,
        };
        onAddSubmission(fallbackSub);
      }
      setShowSubmitModal(false);
      setSubTitle("");
      setSubDesc("");
      setSubDeployUrl("");
      setSubAppUrl("");
      setSubRepoUrl("");
      setSubVersion("");
      setSubFile(null);
      setSubFileError(null);
    } catch (err: any) {
      setSubFileError(err?.response?.data?.error || "Failed to submit deliverable.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "All") return submissions;
    return submissions.filter((s) => s.status.toLowerCase() === filter.toLowerCase());
  }, [submissions, filter]);

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
        <div>
          <p className="text-[9.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.1em]">Submissions</p>
          <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] mt-0.5">
            Submitted Deliverables
          </h3>
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto"
        >
          <Upload className="w-3.5 h-3.5" /> Submit Deliverable
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {["All", "Pending", "Under Review", "Approved", "Changes Requested"].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-[7px] text-[11.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${filter === st
                ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                : "bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
          >
            {st}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <OvCard className="p-8 text-center space-y-2">
          <CheckSquare className="w-8 h-8 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
          <p className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No work submitted yet.</p>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] max-w-md mx-auto">
            Submitted deliverables, production links, and packages will appear here for executive review.
          </p>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-1.5 px-4 h-[36px] rounded-[9px] border border-[#C9A52A]/40 text-[#C9A52A] dark:text-[#D4B12F] text-[12px] font-semibold hover:bg-[#C9A52A]/10 transition-colors cursor-pointer mx-auto mt-2"
          >
            <Upload className="w-3.5 h-3.5" /> Submit Deliverable
          </button>
        </OvCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <OvCard key={sub.id} className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{sub.title}</h4>
                  <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
                    Submitted by <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{sub.submittedBy}</strong> · {fmtDate(sub.submittedAt)} {fmtTime(sub.submittedAt)}
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full border text-[10.5px] font-bold uppercase shrink-0 self-start sm:self-auto ${sub.status === "Approved"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : sub.status === "Under Review"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  }`}>
                  {sub.status}
                </span>
              </div>

              <p className="text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] leading-relaxed">
                {sub.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-[11.5px] pt-1">
                {sub.deploymentUrl && (
                  <a href={sub.deploymentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#C9A52A] dark:text-[#D4B12F] hover:underline">
                    <ExternalLink className="w-3 h-3" /> Deployment
                  </a>
                )}
                {sub.fileName && (
                  <span className="inline-flex items-center gap-1 text-[#667085] dark:text-[#8B95A5] font-mono">
                    <FileText className="w-3 h-3 text-[#C9A52A]" /> {sub.fileName}
                  </span>
                )}
              </div>
            </OvCard>
          ))}
        </div>
      )}

      {showSubmitModal && (
        <Modal onClose={() => setShowSubmitModal(false)} maxW="max-w-lg">
          <ModalHeader title="Submit Deliverable" onClose={() => setShowSubmitModal(false)} icon={<Upload className="w-4 h-4 text-[#C9A52A] dark:text-[#D4B12F]" />} />
          <div className="px-5 py-4 space-y-3.5 text-[12.5px]">
            <div>
              <label className="block font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">Deliverable Title *</label>
              <input
                type="text"
                placeholder="e.g. Production Application Build & Authentication Engine"
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                className="w-full px-3.5 h-[40px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">Deliverable Description *</label>
              <textarea
                rows={3}
                placeholder="Describe completed work, features implemented, and verification results..."
                value={subDesc}
                onChange={(e) => setSubDesc(e.target.value)}
                className="w-full p-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">Deployment URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={subDeployUrl}
                  onChange={(e) => setSubDeployUrl(e.target.value)}
                  className="w-full px-3 h-[38px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">Application URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={subAppUrl}
                  onChange={(e) => setSubAppUrl(e.target.value)}
                  className="w-full px-3 h-[38px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">Attach File (1 MB max)</label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full text-[11.5px] text-[#667085] file:mr-3 file:py-1.5 file:px-3 file:rounded-[7px] file:border-0 file:text-[11.5px] file:font-semibold file:bg-[#C9A52A]/15 file:text-[#C9A52A] cursor-pointer"
              />
              <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1 flex items-center gap-1">
                <HardDrive className="w-3 h-3" /> Maximum file size: 1 MB per file
              </p>
            </div>

            {subFileError && (
              <div className="p-3 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{subFileError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
              <button onClick={() => setShowSubmitModal(false)} className="px-4 h-[38px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleSubmitDeliverable}
                disabled={isSubmitting}
                className="px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-semibold hover:opacity-90 cursor-pointer"
              >
                Submit Deliverable
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TIMELINE TAB ─────────────────────────────────────────────────────────────

function TimelineTab({ project, tasks, milestones, submissions }: { project: any; tasks: any[]; milestones: any[]; submissions: ProjectSubmission[] }) {
  const events = useMemo(() => {
    const list: {
      id: string;
      dateStr: string;
      timeStr: string;
      dayStr: string;
      actor: string;
      action: string;
      category: string;
    }[] = [];

    if (project.createdAt) {
      list.push({
        id: "ev-created",
        dateStr: fmtDate(project.createdAt),
        timeStr: fmtTime(project.createdAt),
        dayStr: fmtDay(project.createdAt),
        actor: project.owner || "CEO",
        action: "created project workspace",
        category: "Status Changes",
      });
    }

    if (project.assignment?.createdAt) {
      list.push({
        id: "ev-assigned",
        dateStr: fmtDate(project.assignment.createdAt),
        timeStr: fmtTime(project.assignment.createdAt),
        dayStr: fmtDay(project.assignment.createdAt),
        actor: project.owner || "CEO",
        action: "assigned execution lead to CO-CEO",
        category: "Assignments",
      });
    }

    tasks.forEach((t) => {
      list.push({
        id: `ev-task-${t.id}`,
        dateStr: fmtDate(t.createdAt || project.createdAt),
        timeStr: fmtTime(t.createdAt || project.createdAt),
        dayStr: fmtDay(t.createdAt || project.createdAt),
        actor: project.owner || "CEO",
        action: `assigned work "${t.title}"`,
        category: "Work",
      });
    });

    milestones.forEach((m) => {
      list.push({
        id: `ev-ms-${m.id}`,
        dateStr: fmtDate(m.createdAt || project.createdAt),
        timeStr: fmtTime(m.createdAt || project.createdAt),
        dayStr: fmtDay(m.createdAt || project.createdAt),
        actor: "CEO",
        action: `created milestone "${m.name}"`,
        category: "Milestones",
      });
    });

    submissions.forEach((s) => {
      list.push({
        id: `ev-sub-${s.id}`,
        dateStr: fmtDate(s.submittedAt),
        timeStr: fmtTime(s.submittedAt),
        dayStr: fmtDay(s.submittedAt),
        actor: s.submittedBy,
        action: `submitted deliverable "${s.title}"`,
        category: "Submissions",
      });
    });

    return list;
  }, [project, tasks, milestones, submissions]);

  return (
    <div className="space-y-4 font-sans">
      <div className="pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
        <p className="text-[9.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.1em]">TIMELINE</p>
        <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] mt-0.5">
          Chronological Project History
        </h3>
      </div>

      {events.length === 0 ? (
        <OvCard className="p-8 text-center space-y-2">
          <Clock className="w-8 h-8 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
          <p className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Project activity will appear here as work progresses.</p>
        </OvCard>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E4E7EC] dark:before:bg-[#272D36]">
          {events.map((ev) => (
            <div key={ev.id} className="relative flex items-start justify-between gap-3">
              <div className="absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-[#C9A52A] dark:border-[#D4B12F] bg-[#FFFFFF] dark:bg-[#15191F] flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A52A]" />
              </div>
              <div className="flex-1 p-3.5 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    {ev.actor} {ev.action}
                  </span>
                  <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] uppercase">
                    {ev.category}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[#667085] dark:text-[#8B95A5]">
                  {ev.dateStr} · {ev.dayStr} · {ev.timeStr}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI TOOLS TAB (MANMADHAN HUB INTEGRATION) ───────────────────────────────────

function AiToolsTab({ projectId }: { projectId: string }) {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [purposeText, setPurposeText] = useState("");
  const [selectedToolToLink, setSelectedToolToLink] = useState<any>(null);

  const fetchLinkedTools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/org/integrations/projects/${projectId}/ai-tools`);
      if (res.data?.success) setTools(res.data.data || []);
    } catch {
      setTools([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchLinkedTools();
  }, [fetchLinkedTools]);

  const handleSearchHub = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await apiClient.get(`/org/integrations/hub/tools/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.data?.success) setSearchResults(res.data.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLinkTool = async () => {
    if (!selectedToolToLink || !purposeText.trim()) {
      alert("Please select a tool and specify its purpose for this project.");
      return;
    }

    try {
      const res = await apiClient.post(`/org/integrations/projects/${projectId}/ai-tools`, {
        hubToolId: selectedToolToLink.id,
        purpose: purposeText.trim(),
      });

      if (res.data?.success) {
        setShowSearchModal(false);
        setSelectedToolToLink(null);
        setPurposeText("");
        fetchLinkedTools();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to link AI tool.");
    }
  };

  const handleUnlink = async (toolLinkId: string) => {
    try {
      await apiClient.delete(`/org/integrations/projects/${projectId}/ai-tools/${toolLinkId}`);
      fetchLinkedTools();
    } catch (err: any) {
      console.error("Failed to unlink AI tool:", err);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
        <div>
          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C9A52A] uppercase tracking-wider">
            ● ManMadhan Hub · Platform Integration
          </div>
          <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] mt-0.5">
            Referenced AI Tools & Intelligence
          </h3>
        </div>
        <button
          onClick={() => setShowSearchModal(true)}
          className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add AI Tool from Hub
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A52A]" />
        </div>
      ) : tools.length === 0 ? (
        <OvCard className="p-8 text-center space-y-2">
          <Bot className="w-8 h-8 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
          <p className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No AI tools linked to this project yet.</p>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] max-w-md mx-auto">
            Search ManMadhan Hub to link AI tools (e.g. Figma AI, Claude, GitHub Copilot) with designated usage purposes.
          </p>
          <button
            onClick={() => setShowSearchModal(true)}
            className="inline-flex items-center gap-1.5 px-4 h-[36px] rounded-[9px] border border-[#C9A52A]/40 text-[#C9A52A] text-[12px] font-semibold hover:bg-[#C9A52A]/10 transition-colors cursor-pointer mx-auto mt-2"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Search ManMadhan Hub
          </button>
        </OvCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {tools.map((t: any) => (
            <OvCard key={t.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-2">
                    {t.toolName}
                    <span className="text-[9.5px] font-bold bg-[#C9A52A]/10 text-[#C9A52A] px-2 py-0.5 rounded border border-[#C9A52A]/20">
                      {t.toolCategory || "AI Tool"}
                    </span>
                  </h4>
                  <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-1">
                    Purpose: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{t.purpose}</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleUnlink(t.id)}
                  className="p-1 text-[#667085] hover:text-rose-500 transition-colors cursor-pointer"
                  title="Remove from project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="pt-2 border-t border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between text-[11px] font-mono text-[#667085]">
                <span>Source: ManMadhan Hub</span>
                <span>Added: {fmtDate(t.createdAt)}</span>
              </div>
            </OvCard>
          ))}
        </div>
      )}

      {/* Hub Search & Link Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <h3 className="text-base font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#C9A52A]" /> Search ManMadhan Hub Catalog
              </h3>
              <button onClick={() => setShowSearchModal(false)} className="text-[#667085] hover:text-[#17202A] font-bold text-sm">✕</button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search AI tools (e.g. Figma, Claude, RAG, design)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchHub()}
                className="flex-1 px-3.5 h-[38px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-xl text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
              />
              <button
                onClick={handleSearchHub}
                disabled={isSearching}
                className="px-4 h-[38px] bg-[#C9A52A] text-[#0B0D10] text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pt-1">
              {searchResults.length === 0 ? (
                <p className="text-xs text-[#667085] text-center py-4 italic">Type a query and click Search to query ManMadhan Hub.</p>
              ) : (
                searchResults.map((tool) => (
                  <div
                    key={tool.id}
                    onClick={() => setSelectedToolToLink(tool)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedToolToLink?.id === tool.id
                        ? "border-[#C9A52A] bg-[#C9A52A]/10 font-medium"
                        : "border-[#E4E7EC] dark:border-[#272D36] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[#17202A] dark:text-[#F2F4F7]">
                      <span>{tool.name}</span>
                      <span className="text-[10px] text-[#667085] font-mono">{tool.category}</span>
                    </div>
                    <p className="text-[11px] text-[#667085] mt-1 line-clamp-1">{tool.description}</p>
                  </div>
                ))
              )}
            </div>

            {selectedToolToLink && (
              <div className="space-y-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
                <label className="text-xs font-bold text-[#17202A] dark:text-[#F2F4F7] block">
                  Designated Usage Purpose for this Project:
                </label>
                <input
                  type="text"
                  placeholder="e.g. UI design exploration, Technical documentation"
                  value={purposeText}
                  onChange={(e) => setPurposeText(e.target.value)}
                  className="w-full px-3.5 h-[36px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-xl text-xs text-[#17202A] dark:text-[#F2F4F7] outline-none"
                />
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSearchModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E4E7EC] dark:border-[#272D36] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkTool}
                disabled={!selectedToolToLink || !purposeText.trim()}
                className="px-4 py-2 rounded-xl bg-[#C9A52A] text-[#0B0D10] text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Link Tool to Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE COMPONENT ──────────────────────────────────────────────────────


export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>("OVERVIEW");
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);

  // Mobile Bottom Sheets
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);
  const [showMobileOverflowSheet, setShowMobileOverflowSheet] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProjectDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/org/projects/${projectId}`);
      if (res.data?.success && res.data.data) {
        const p = res.data.data;
        setProject(p);
        setMilestones(p.milestones || []);
        setDocuments(p.documents || []);
        setTasks(p.tasks || []);
        setSubmissions(p.submissions || []);
        setActivity(p.activity || []);
        setEditName(p.name || "");
        setEditDescription(p.description || "");
        setEditDeadline(p.deadline ? new Date(p.deadline).toISOString().split("T")[0] : "");
      } else {
        setError(res.data?.error || "Project not found.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to load project details.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchProjectDetails();
  }, [projectId, fetchProjectDetails]);

  // Close actions dropdown on click outside
  useEffect(() => {
    if (!actionsOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-actions-menu]")) setActionsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionsOpen]);

  const handleUpdateProject = async () => {
    setIsUpdating(true);
    try {
      const res = await apiClient.patch(`/org/projects/${projectId}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        deadline: editDeadline || null,
      });
      if (res.data?.success) {
        setShowEditModal(false);
        await fetchProjectDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update project.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchiveProject = async () => {
    try {
      await apiClient.post(`/org/projects/${projectId}/archive`);
      router.push("/ceo/projects");
    } catch (err: any) {
      console.error("Failed to archive project:", err);
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmText !== "DELETE") {
      alert('Type "DELETE" to confirm.');
      return;
    }
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.delete(`/org/projects/${projectId}${wsId ? `?workspaceId=${wsId}` : ""}`);
      router.push(`${base}/projects`);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete project.");
    }
  };

  const handleAddSubmission = (sub: ProjectSubmission) => {
    setSubmissions((prev) => [sub, ...prev]);
  };

  const base =
    typeof window !== "undefined"
      ? window.location.pathname.startsWith("/co-ceo") ? "/co-ceo"
        : window.location.pathname.startsWith("/member") ? "/member"
          : "/ceo"
      : "/ceo";

  if (isLoading) return <LoadingSkeleton />;

  if (error || !project) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-3 my-auto font-sans">
        <p className="text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">Project not found</p>
        <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">{error || "This project does not exist in your workspace."}</p>
        <Link
          href={`${base}/projects`}
          className="inline-flex items-center gap-1.5 mt-2 text-[12.5px] font-semibold text-[#C9A52A] dark:text-[#D4B12F] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
        </Link>
      </div>
    );
  }

  const completedCount = project.completedTasks ?? tasks.filter((t: any) => t.status === "Completed" || t.status === "Done").length;
  const totalCount = (project.totalTasks ?? tasks.length) || 1;
  const remainingCount = Math.max(0, totalCount - completedCount);
  const progressPercent = project.progress ?? Math.round((completedCount / (totalCount || 1)) * 100);
  const health = deriveHealth(project, completedCount, totalCount);

  return (
    <div className="w-full h-full max-h-full flex flex-col overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans">
      {/* ── Fixed top region ─────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 sm:px-6 md:px-10 pt-3 sm:pt-4 pb-0 space-y-3 sm:space-y-4 max-w-[1400px] w-full mx-auto">

        {/* ── MOBILE COMPACT HEADER (<= 767px) ────────────────────────────── */}
        <div className="md:hidden space-y-2.5 pb-2.5 border-b border-[#E4E7EC] dark:border-[#272D36]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Projects</p>
              <h1 className="text-[20px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight truncate max-w-[220px]">
                {project.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileActionSheet(true)}
                className="w-9 h-9 rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-transform"
                title="Add to project"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowMobileOverflowSheet(true)}
                className="w-9 h-9 rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] dark:text-[#8B95A5] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                title="More actions"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11.5px] flex-wrap">
            <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              ● {project.status || "Active"}
            </span>
            <span className="text-[#667085] dark:text-[#8B95A5]">Owner: <strong className="text-[#17202A] dark:text-[#F2F4F7]">{project.owner || "CEO"}</strong></span>
            <span className="text-[#667085] dark:text-[#8B95A5]">Due: <span className="font-mono text-[#17202A] dark:text-[#F2F4F7]">{fmtDate(project.deadline, "Flexible")}</span></span>
          </div>

          {project.description && (
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* ── DESKTOP HEADER (>= 768px) ───────────────────────────────────── */}
        <div className="hidden md:block space-y-4">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#667085] dark:text-[#8B95A5]">
            <Link href={`${base}/projects`} className="hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors">
              Projects
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#17202A] dark:text-[#F2F4F7] font-semibold truncate">
              {project.name}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4 border-b border-[#E4E7EC] dark:border-[#272D36] pb-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[24px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                  {project.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full border text-[10.5px] font-semibold whitespace-nowrap ${project.status === "Active" || project.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  }`}>
                  ● {project.status || "Active"}
                </span>
              </div>
              {project.description && (
                <p className="text-[13px] text-[#667085] dark:text-[#8B95A5] max-w-2xl line-clamp-2">
                  {project.description}
                </p>
              )}
              <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] pt-0.5">
                Owner: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{project.owner || "CEO"}</strong>
                {" · "}
                Due: <span className="font-mono text-[#17202A] dark:text-[#F2F4F7]">{fmtDate(project.deadline, "Flexible")}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowAddTaskModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Assign Work</span>
              </button>
              <div className="relative" data-actions-menu>
                <button
                  onClick={() => setActionsOpen(!actionsOpen)}
                  className="p-2.5 rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] dark:text-[#8B95A5] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {actionsOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] shadow-xl py-1 z-30 text-[12.5px]">
                    <button
                      onClick={() => { setShowPromptModal(true); setActionsOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C9A52A] dark:text-[#D4B12F]" /> View Mandate
                    </button>
                    <button
                      onClick={() => { setShowEditModal(true); setActionsOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#667085]" /> Edit Project
                    </button>
                    <div className="my-1 border-t border-[#E4E7EC] dark:border-[#272D36]" />
                    <button
                      onClick={() => { handleArchiveProject(); setActionsOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" /> Archive Project
                    </button>
                    <button
                      onClick={() => { setShowDeleteModal(true); setActionsOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Project
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 pb-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider text-[9.5px] font-bold">
              PROJECT PROGRESS
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-[#667085] dark:text-[#8B95A5]">
                {completedCount} completed · {remainingCount} remaining
              </span>
              <span className={`font-semibold ${health.color}`}>● {health.label}</span>
              <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{progressPercent}%</span>
            </div>
          </div>
          <div className="h-[5px] w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Workspace tabs (Horizontal scrollable on mobile) */}
        <div className="flex items-center overflow-x-auto gap-0 border-b border-[#E4E7EC] dark:border-[#272D36] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[12.5px] font-semibold whitespace-nowrap transition-all cursor-pointer border-b-2 -mb-px ${activeTab === tab.id
                  ? "border-[#C9A52A] dark:border-[#D4B12F] text-[#17202A] dark:text-[#F2F4F7]"
                  : "border-transparent text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content region ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-24 sm:pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="px-4 sm:px-6 md:px-10 py-4 sm:py-5 max-w-[1400px] w-full mx-auto">
          {activeTab === "OVERVIEW" && (
            <OverviewTab
              project={project}
              tasks={tasks}
              milestones={milestones}
              documents={documents}
              submissions={submissions}
              completedCount={completedCount}
              totalCount={totalCount}
              remainingCount={remainingCount}
              progressPercent={progressPercent}
              onTabSwitch={setActiveTab}
            />
          )}

          {activeTab === "TEAM" && (
            <ProjectTeamView projectId={projectId} ownerName={project.owner} />
          )}

          {activeTab === "WORK" && (
            <WorkTab tasks={tasks} onAddTask={() => setShowAddTaskModal(true)} />
          )}

          {activeTab === "SUBMISSIONS" && (
            <SubmissionsTab
              projectId={projectId}
              submissions={submissions}
              onAddSubmission={handleAddSubmission}
            />
          )}

          {activeTab === "TIMELINE" && (
            <TimelineTab
              project={project}
              tasks={tasks}
              milestones={milestones}
              submissions={submissions}
            />
          )}

          {activeTab === "MILESTONES" && (
            <ProjectMilestonesView
              milestones={milestones}
              onSelectMilestone={(m) => setSelectedMilestone(m)}
              projectId={projectId}
              onRefresh={fetchProjectDetails}
            />
          )}

          {activeTab === "DOCUMENTS" && (
            <ProjectDocumentsView
              projectId={projectId}
              documents={documents}
              onRefresh={fetchProjectDetails}
            />
          )}

          {activeTab === "AI_TOOLS" && (
            <AiToolsTab projectId={projectId} />
          )}

          {activeTab === "GITHUB" && (
            <GitHubOAuthPanel projectId={projectId} project={project} />
          )}

        </div>
      </div>

      {/* ── MOBILE BOTTOM ACTION SHEET (+ Button) ───────────────────────── */}
      <MobileSheet
        isOpen={showMobileActionSheet}
        onClose={() => setShowMobileActionSheet(false)}
        title="ADD TO PROJECT"
      >
        <div className="space-y-2 py-1 font-sans text-[13.5px]">
          <button
            onClick={() => {
              setShowMobileActionSheet(false);
              setShowAddTaskModal(true);
            }}
            className="w-full min-h-[48px] px-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
          >
            <CheckSquare className="w-4.5 h-4.5 text-[#C9A52A] dark:text-[#D4B12F]" />
            <span>Assign Work</span>
          </button>
          <button
            onClick={() => {
              setShowMobileActionSheet(false);
              setActiveTab("MILESTONES");
            }}
            className="w-full min-h-[48px] px-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
          >
            <Flag className="w-4.5 h-4.5 text-[#C9A52A] dark:text-[#D4B12F]" />
            <span>Add Milestone</span>
          </button>
          <button
            onClick={() => {
              setShowMobileActionSheet(false);
              setActiveTab("DOCUMENTS");
            }}
            className="w-full min-h-[48px] px-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
          >
            <Folder className="w-4.5 h-4.5 text-[#C9A52A] dark:text-[#D4B12F]" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={() => {
              setShowMobileActionSheet(false);
              setActiveTab("SUBMISSIONS");
            }}
            className="w-full min-h-[48px] px-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
          >
            <Upload className="w-4.5 h-4.5 text-[#C9A52A] dark:text-[#D4B12F]" />
            <span>Add Submission</span>
          </button>
        </div>
      </MobileSheet>

      {/* ── MOBILE OVERFLOW BOTTOM SHEET (••• Button) ────────────────────── */}
      <MobileSheet
        isOpen={showMobileOverflowSheet}
        onClose={() => setShowMobileOverflowSheet(false)}
        title="PROJECT ACTIONS"
      >
        <div className="space-y-2 py-1 font-sans text-[13.5px]">
          <button
            onClick={() => {
              setShowMobileOverflowSheet(false);
              setShowPromptModal(true);
            }}
            className="w-full min-h-[48px] px-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
          >
            <Eye className="w-4.5 h-4.5 text-[#C9A52A] dark:text-[#D4B12F]" />
            <span>View Mandate</span>
          </button>
          <button
            onClick={() => {
              setShowMobileOverflowSheet(false);
              setShowEditModal(true);
            }}
            className="w-full min-h-[48px] px-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
          >
            <Edit3 className="w-4.5 h-4.5 text-[#667085]" />
            <span>Edit Project</span>
          </button>
          <button
            onClick={() => {
              setShowMobileOverflowSheet(false);
              handleArchiveProject();
            }}
            className="w-full min-h-[48px] px-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
          >
            <Archive className="w-4.5 h-4.5" />
            <span>Archive Project</span>
          </button>
          <button
            onClick={() => {
              setShowMobileOverflowSheet(false);
              setShowDeleteModal(true);
            }}
            className="w-full min-h-[48px] px-4 rounded-[12px] bg-rose-500/10 border border-rose-500/20 font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
          >
            <Trash2 className="w-4.5 h-4.5" />
            <span>Delete Project</span>
          </button>
        </div>
      </MobileSheet>

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {/* View Mandate */}
      {showPromptModal && (
        <Modal onClose={() => setShowPromptModal(false)} maxW="max-w-lg">
          <ModalHeader title="Project Mandate" onClose={() => setShowPromptModal(false)} icon={<BookOpen className="w-4 h-4 text-[#C9A52A] dark:text-[#D4B12F]" />} />
          <div className="px-5 py-4">
            <p className="text-[13px] text-[#17202A] dark:text-[#F2F4F7] leading-relaxed">
              {project.mandate || project.objective || project.description || "No mandate defined."}
            </p>
          </div>
        </Modal>
      )}

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={showEditModal}
        project={project}
        onClose={() => setShowEditModal(false)}
        onSuccess={fetchProjectDetails}
      />

      {/* Delete Project */}
      {showDeleteModal && (
        <Modal onClose={() => setShowDeleteModal(false)}>
          <ModalHeader title="Delete Project" onClose={() => setShowDeleteModal(false)} icon={<Trash2 className="w-4 h-4 text-rose-500" />} />
          <div className="px-5 py-4 space-y-3.5 text-[12.5px]">
            <p className="text-[#667085] dark:text-[#8B95A5]">
              This action is permanent and cannot be undone. Type <strong className="text-rose-600 dark:text-rose-400">DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              placeholder="DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3.5 h-[42px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] font-mono text-[13px] text-rose-600 dark:text-rose-400 outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 h-[40px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleteConfirmText !== "DELETE"}
                className="px-4 h-[40px] rounded-[9px] bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-40 cursor-pointer"
              >
                Delete Project
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Task / Assign Work */}
      <CreateTaskModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onSuccess={fetchProjectDetails}
        defaultProjectId={projectId}
      />

      {/* Milestone detail workspace */}
      {selectedMilestone && (
        <MilestoneWorkspace
          milestone={selectedMilestone}
          projectId={projectId}
          project={project}
          onClose={() => setSelectedMilestone(null)}
          onRefresh={() => { fetchProjectDetails(); setSelectedMilestone(null); }}
        />
      )}
    </div>
  );
}
