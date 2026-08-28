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

type TabId = "OVERVIEW" | "TASKS" | "MILESTONES" | "TIMELINE" | "TEAM" | "DOCUMENTS" | "GITHUB" | "ACTIVITY" | "SETTINGS" | "AI_TOOLS" | "SUBMISSIONS";

const TABS: { id: TabId; label: string }[] = [
  { id: "OVERVIEW", label: "Overview" },
  { id: "TASKS", label: "Tasks" },
  { id: "MILESTONES", label: "Milestones" },
  { id: "SUBMISSIONS", label: "Submissions" },
  { id: "TIMELINE", label: "Timeline" },
  { id: "TEAM", label: "Team" },
  { id: "DOCUMENTS", label: "Documents" },
  { id: "GITHUB", label: "GitHub" },
  { id: "ACTIVITY", label: "Activity" },
  { id: "SETTINGS", label: "Settings" },
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
  const ownerName = project.ownerName || project.owner || "CEO";
  const executionLead = project.executionLead || project.assignment?.assignedTo;
  const members = project.members || project.team || [];
  const nextAction = project.nextAction || null;

  const nextMilestone = useMemo(() => {
    if (!milestones || milestones.length === 0) return null;
    return milestones.find((m) => (m.state || m.status) === "AVAILABLE" || (m.state || m.status) === "IN_PROGRESS") || milestones[0];
  }, [milestones]);

  const readinessChecks = useMemo(() => {
    return [
      { title: "Project Owner Verified", passed: true },
      { title: "Execution Lead Accepted", passed: Boolean(executionLead || project.assignment?.status === "ACCEPTED") },
      { title: "Project Plan Accepted", passed: project.projectPlanStatus === "ACCEPTED" || project.status === "ACTIVE" },
      { title: "Team Members Accepted", passed: members.length > 0 },
      { title: "GitHub Connected", passed: Boolean(project.github?.connected || project.github?.repoName) },
      { title: "Required Documents Ready", passed: (documents || []).some((d: any) => d.status === "APPROVED" || d.fileUrl) },
    ];
  }, [executionLead, project, members, documents]);

  const passedReadinessCount = readinessChecks.filter((c) => c.passed).length;
  const readinessPercent = Math.round((passedReadinessCount / readinessChecks.length) * 100);

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* ── ROW 1: CURRENT / NEXT REQUIRED ACTION (RENDERED ONLY IF ACTION PENDING) ── */}
      {nextAction && (
        <OvCard className="p-3.5 bg-gradient-to-r from-[#C9A52A]/10 via-[#C9A52A]/5 to-transparent border-[#C9A52A]/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded bg-[#C9A52A] text-[#0B0D10] uppercase tracking-wider">
                  Next Required Action
                </span>
                <span className="text-xs font-extrabold text-foreground">
                  {nextAction.title}
                </span>
              </div>
              <p className="text-[11.5px] text-muted-foreground">
                {nextAction.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTabSwitch((nextAction.targetTab as TabId) || "TASKS")}
              className="inline-flex items-center gap-1.5 px-4 h-[32px] rounded-xl bg-[#C9A52A] text-[#0B0D10] text-xs font-extrabold hover:brightness-105 transition-all cursor-pointer shrink-0"
            >
              <span>Take Action</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </OvCard>
      )}

      {/* ── 2-COLUMN EXECUTIVE LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* ── LEFT COLUMN: SNAPSHOT & READINESS (7 Cols) ── */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* PROJECT SNAPSHOT */}
          <OvCard className="p-4 space-y-3">
            <CardLabel>Project Snapshot</CardLabel>

            {(project.objective || project.description) && (
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Objective</span>
                <p className="text-xs text-foreground leading-relaxed font-medium">
                  {project.objective || project.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground font-semibold text-[11px] block">Status</span>
                <span className="font-extrabold text-emerald-500 mt-0.5 block">● {project.status || "Active"}</span>
              </div>

              <div>
                <span className="text-muted-foreground font-semibold text-[11px] block">Priority</span>
                <span className="font-extrabold text-amber-500 mt-0.5 block">{project.priority || "Medium"}</span>
              </div>

              <div>
                <span className="text-muted-foreground font-semibold text-[11px] block">Deadline</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">{fmtDate(project.deadline, "Flexible")}</span>
              </div>

              <div>
                <span className="text-muted-foreground font-semibold text-[11px] block">Owner</span>
                <span className="font-bold text-foreground mt-0.5 block">{ownerName}</span>
              </div>

              <div className="col-span-2 sm:col-span-2">
                <span className="text-muted-foreground font-semibold text-[11px] block">Execution Lead</span>
                <span className="font-bold text-foreground mt-0.5 block">
                  {executionLead?.name || executionLead?.email || "Not assigned"}
                </span>
              </div>
            </div>
          </OvCard>

          {/* PROJECT READINESS CHECKLIST */}
          <OvCard className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <CardLabel>Project Readiness</CardLabel>
              <span className="text-xs font-mono font-extrabold text-[#C9A52A]">
                {readinessPercent}% Ready ({passedReadinessCount}/{readinessChecks.length})
              </span>
            </div>

            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#C9A52A] h-full transition-all duration-500 rounded-full"
                style={{ width: `${readinessPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              {readinessChecks.map((chk, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className={chk.passed ? "text-emerald-500 font-extrabold" : "text-muted-foreground font-bold"}>
                    {chk.passed ? "✓" : "○"}
                  </span>
                  <span className={chk.passed ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {chk.title}
                  </span>
                </div>
              ))}
            </div>
          </OvCard>
        </div>

        {/* ── RIGHT COLUMN: PROGRESS & NEXT MILESTONE (5 Cols) ── */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* PROJECT PROGRESS */}
          <OvCard className="p-4 space-y-3">
            <CardLabel>Project Progress</CardLabel>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-foreground font-mono leading-none">{progressPercent}%</span>
              <span className="text-xs text-emerald-500 font-bold">On Track</span>
            </div>

            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9A52A] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-background border border-border">
                <span className="text-muted-foreground text-[10.5px] font-semibold block">Completed</span>
                <span className="font-mono font-extrabold text-emerald-500 text-sm mt-0.5 block">{completedCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-background border border-border">
                <span className="text-muted-foreground text-[10.5px] font-semibold block">Remaining</span>
                <span className="font-mono font-extrabold text-foreground text-sm mt-0.5 block">{remainingCount}</span>
              </div>
            </div>
          </OvCard>

          {/* NEXT MILESTONE */}
          <OvCard className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <CardLabel>Next Milestone</CardLabel>
              {nextMilestone && (
                <button
                  type="button"
                  onClick={() => onTabSwitch("MILESTONES")}
                  className="text-[11px] font-extrabold text-[#C9A52A] hover:underline cursor-pointer"
                >
                  View All →
                </button>
              )}
            </div>

            {nextMilestone ? (
              <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-foreground text-xs">{nextMilestone.name}</h4>
                  <span className="px-2 py-0.5 rounded bg-[#C9A52A]/10 text-[#C9A52A] font-extrabold text-[10px]">
                    {nextMilestone.state || nextMilestone.status || "Available"}
                  </span>
                </div>
                {nextMilestone.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {nextMilestone.description}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onTabSwitch("MILESTONES")}
                  className="w-full mt-2 py-1.5 rounded-lg border border-border hover:bg-muted text-foreground font-bold text-xs cursor-pointer transition-colors"
                >
                  Open Milestone
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-background border border-border text-center space-y-2">
                <p className="text-xs text-muted-foreground">No milestones created yet.</p>
                <button
                  type="button"
                  onClick={() => onTabSwitch("MILESTONES")}
                  className="px-3 py-1.5 rounded-xl bg-[#C9A52A] text-[#0B0D10] font-extrabold text-xs cursor-pointer"
                >
                  Add Milestone
                </button>
              </div>
            )}
          </OvCard>
        </div>
      </div>

      {/* ── BOTTOM SUMMARY BAR (TEAM, CONNECTIONS & RECENT ACTIVITY) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* TEAM SUMMARY */}
        <OvCard className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Team</span>
            <button type="button" onClick={() => onTabSwitch("TEAM")} className="text-[10.5px] text-[#C9A52A] font-bold hover:underline cursor-pointer">View Team</button>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="font-bold">{ownerName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Lead</span><span className="font-bold">{executionLead?.name || "Not assigned"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Members</span><span className="font-bold font-mono">{members.length} users</span></div>
          </div>
        </OvCard>

        {/* CONNECTIONS */}
        <OvCard className="p-3.5 space-y-2">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Project Connections</span>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Documents</span>
              <button type="button" onClick={() => onTabSwitch("DOCUMENTS")} className="text-foreground font-bold hover:text-[#C9A52A] cursor-pointer">
                {(documents || []).length > 0 ? `${documents.length} requirements` : "Not ready"} →
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">GitHub</span>
              <button type="button" onClick={() => onTabSwitch("GITHUB")} className="text-foreground font-bold hover:text-[#C9A52A] cursor-pointer">
                {project.github?.connected || project.github?.repoName ? "Connected" : "Not connected"} →
              </button>
            </div>
          </div>
        </OvCard>

        {/* RECENT ACTIVITY PREVIEW */}
        <OvCard className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Recent Activity</span>
            <button type="button" onClick={() => onTabSwitch("ACTIVITY")} className="text-[10.5px] text-[#C9A52A] font-bold hover:underline cursor-pointer">View Activity</button>
          </div>
          <div className="space-y-1 text-xs">
            {tasks.length > 0 ? (
              tasks.slice(0, 2).map((t: any) => (
                <div key={t.id} className="truncate text-muted-foreground">
                  <strong className="text-foreground font-semibold">{t.assigneeName || "Member"}</strong>: {t.title}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground italic">No recent activity recorded.</p>
            )}
          </div>
        </OvCard>
      </div>
    </div>
  );
}

// ─── WORK TAB (PROJECT WORK / DELIVERABLES) ───────────────────────────────────

function WorkTab({
  project,
  tasks,
  onAddTask,
  onWorkCreated,
}: {
  project: any;
  tasks: any[];
  onAddTask: () => void;
  onWorkCreated?: () => void;
}) {
  const workPackages: any[] = project?.workPackages || [];
  const [showCreateWorkModal, setShowCreateWorkModal] = useState(false);
  const [workTitle, setWorkTitle] = useState("");
  const [workDesc, setWorkDesc] = useState("");
  const [workCategory, setWorkCategory] = useState("Development");
  const [workDeliverable, setWorkDeliverable] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateWorkPackage = async () => {
    if (!workTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/org/projects/${project.id}/work`, {
        title: workTitle.trim(),
        description: workDesc.trim() || undefined,
        category: workCategory,
        deliverable: workDeliverable.trim() || undefined,
      });

      if (res.data?.success) {
        setShowCreateWorkModal(false);
        setWorkTitle("");
        setWorkDesc("");
        setWorkDeliverable("");
        if (onWorkCreated) onWorkCreated();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create work package");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
        <div>
          <p className="text-[9.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.1em]">Project Work & Work Packages</p>
          <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] mt-0.5">
            Architecture: Work Packages → Tasks → Deliverables
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateWorkModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 h-[38px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[12.5px] font-semibold hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" /> + Work Package
          </button>
          <button
            onClick={onAddTask}
            className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> + Task
          </button>
        </div>
      </div>

      {workPackages.length > 0 && (
        <div className="space-y-4">
          {workPackages.map((wp: any) => {
            const wpTasks = tasks.filter((t: any) => t.workId === wp.id || (!t.workId && workPackages.length === 1));
            return (
              <OvCard key={wp.id} className="p-4 space-y-3 border-l-4 border-l-[#C9A52A]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9.5px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider">
                        {wp.category || "Work Package"}
                      </span>
                      <h4 className="text-[14.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{wp.title}</h4>
                    </div>
                    {wp.description && (
                      <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-1">{wp.description}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-[#667085] dark:text-[#8B95A5] shrink-0">
                    Lead: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{wp.ownerName || "CO-CEO"}</strong>
                  </span>
                </div>

                {/* Child Tasks */}
                <div className="pt-2 border-t border-[#F0F2F5] dark:border-[#1D222A] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#667085] uppercase tracking-wider">
                    <span>Tasks ({wpTasks.length})</span>
                    {wp.deliverable && <span>Target Deliverable: {wp.deliverable}</span>}
                  </div>

                  {wpTasks.length === 0 ? (
                    <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] italic py-1">No tasks linked to this work package yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {wpTasks.map((t: any) => {
                        const isDone = t.status === "Completed" || t.status === "Approved";
                        return (
                          <div key={t.id} className="p-2.5 bg-[#F8F9FB] dark:bg-[#111419] rounded-lg border border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isDone ? "bg-emerald-500" : "bg-[#C9A52A]"}`} />
                              <span className={`text-[12.5px] font-semibold truncate ${isDone ? "line-through text-[#667085]" : "text-[#17202A] dark:text-[#F2F4F7]"}`}>
                                {t.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] shrink-0">
                              <span className="text-[#667085]">{t.assigneeName || "Assignee"}</span>
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase ${isDone ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                                {t.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </OvCard>
            );
          })}
        </div>
      )}

      {/* Standalone / Unlinked Tasks Section if any exist */}
      {tasks.length > 0 && workPackages.length === 0 && (
        <div className="space-y-3">
          {tasks.map((t: any) => {
            const status = t.status || "Active";
            const isDone = status === "Completed" || status === "Approved" || status === "Done";
            return (
              <OvCard key={t.id} className="p-4 hover:border-[#C9A52A] dark:hover:border-[#D4B12F] transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h4 className={`text-[14px] font-bold ${isDone ? "line-through text-[#667085]" : "text-[#17202A] dark:text-[#F2F4F7]"}`}>
                      {t.title}
                    </h4>
                    <p className="text-[12px] text-[#667085]">
                      Assigned to: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{t.assigneeName || "CO-CEO"}</strong>
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase self-start sm:self-center ${isDone ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                    {status}
                  </span>
                </div>
              </OvCard>
            );
          })}
        </div>
      )}

      {/* Create Work Package Modal */}
      {showCreateWorkModal && (
        <Modal onClose={() => setShowCreateWorkModal(false)}>
          <ModalHeader title="Create Work Package" onClose={() => setShowCreateWorkModal(false)} icon={<Layers className="w-4 h-4 text-[#C9A52A]" />} />
          <div className="p-5 space-y-3 font-sans text-xs">
            <div>
              <label className="font-bold text-[#17202A] dark:text-[#F2F4F7] block mb-1">Work Package Title *</label>
              <input
                type="text"
                placeholder="e.g. Build Authentication System"
                value={workTitle}
                onChange={(e) => setWorkTitle(e.target.value)}
                className="w-full px-3.5 h-[36px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-xl text-xs outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-[#17202A] dark:text-[#F2F4F7] block mb-1">Description</label>
              <textarea
                placeholder="Scope & requirements for this work package..."
                value={workDesc}
                onChange={(e) => setWorkDesc(e.target.value)}
                rows={2}
                className="w-full p-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-xl text-xs outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-[#17202A] dark:text-[#F2F4F7] block mb-1">Target Deliverable</label>
              <input
                type="text"
                placeholder="e.g. Authentication Module & OAuth Integration"
                value={workDeliverable}
                onChange={(e) => setWorkDeliverable(e.target.value)}
                className="w-full px-3.5 h-[36px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-xl text-xs outline-none"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setShowCreateWorkModal(false)} className="px-4 py-2 border rounded-xl font-semibold">Cancel</button>
              <button
                onClick={handleCreateWorkPackage}
                disabled={!workTitle.trim() || isSubmitting}
                className="px-4 py-2 bg-[#C9A52A] text-[#0B0D10] font-bold rounded-xl disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Work Package"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SUBMISSIONS TAB ──────────────────────────────────────────────────────────

function SubmissionsTab({
  projectId,
  submissions,
  onRefresh,
  onAddSubmission,
}: {
  projectId: string;
  submissions: ProjectSubmission[];
  onRefresh?: () => void;
  onAddSubmission?: (sub: ProjectSubmission) => void;
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
        onAddSubmission?.(res.data.data);
        onRefresh?.();
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
        onAddSubmission?.(fallbackSub);
        onRefresh?.();
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



function ActivityTab({ activity }: { activity: any[] }) {
  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-3">
        <h3 className="text-sm font-bold text-[#17202A] dark:text-[#F2F4F7]">Project Activity & Audit Log History</h3>
        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5]">{activity.length} recorded events</span>
      </div>

      <div className="space-y-2">
        {activity.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-[#667085] dark:text-[#8B95A5]">No activity log events recorded yet for this project.</div>
        ) : (
          activity.map((act, idx) => (
            <div key={act.id || idx} className="p-3.5 rounded-xl bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#C9A52A]/10 border border-[#C9A52A]/20 flex items-center justify-center text-[#C9A52A] text-xs font-bold shrink-0">
                <ActivityIcon className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <p className="text-xs font-bold text-[#17202A] dark:text-[#F2F4F7]">{act.eventType || act.details || "Project Event"}</p>
                <p className="text-[11px] text-[#667085] dark:text-[#8B95A5]">{act.details || act.description}</p>
                <span className="text-[10px] font-mono text-[#667085] dark:text-[#8B95A5]">{fmtDate(act.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SettingsTab({
  project,
  onUpdate,
  onArchive,
  onDelete,
}: {
  project: any;
  onUpdate: (updated: { name: string; description: string; priority: string; deadline: string }) => Promise<void>;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [section, setSection] = useState<"general" | "execution" | "access" | "integrations" | "danger">("general");
  const [name, setName] = useState(project.name || "");
  const [description, setDescription] = useState(project.description || "");
  const [priority, setPriority] = useState(project.priority || "Medium");
  const [deadline, setDeadline] = useState(project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdate({ name, description, priority, deadline });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (_err) {
      // Error handled in parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 font-sans text-xs">
      {/* Settings Navigation Sidebar */}
      <div className="md:col-span-3 space-y-1">
        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block px-3 py-1">
          Settings Console
        </span>
        {[
          { id: "general", label: "General", icon: BookOpen },
          { id: "execution", label: "Execution", icon: Layers },
          { id: "access", label: "Access & RBAC", icon: Shield },
          { id: "integrations", label: "Integrations", icon: Github },
          { id: "danger", label: "Danger Zone", icon: AlertTriangle },
        ].map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id as any)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold transition-all text-left cursor-pointer ${
                active
                  ? "bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Settings Content Area */}
      <div className="md:col-span-9 space-y-4">
        {section === "general" && (
          <form onSubmit={handleSave} className="p-5 rounded-2xl bg-card border border-border space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-extrabold text-foreground">General Project Details</h3>
              <p className="text-muted-foreground text-xs">Update project name, description, priority, and target deadline.</p>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold flex items-center gap-2 text-xs">
                <Check className="w-4 h-4" />
                <span>Project details updated successfully.</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="font-bold text-foreground block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:border-[#C9A52A]"
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:border-[#C9A52A] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground font-bold outline-none focus:border-[#C9A52A]"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Urgent">Urgent Priority</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Target Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground font-bold outline-none focus:border-[#C9A52A]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[#C9A52A] text-[#0B0D10] text-xs font-extrabold hover:brightness-105 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}

        {section === "execution" && (
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-extrabold text-foreground">Execution & Governance</h3>
              <p className="text-muted-foreground text-xs">Current project hierarchy, ownership rules, and member structure.</p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground font-semibold block">Project Owner</span>
                  <span className="font-extrabold text-foreground">{project.ownerName || project.owner || "CEO"}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#C9A52A]/10 text-[#C9A52A] font-extrabold">CEO</span>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground font-semibold block">Execution Lead</span>
                  <span className="font-extrabold text-foreground">{project.executionLead?.name || "Not assigned"}</span>
                </div>
                <span className="text-muted-foreground font-mono">{project.executionLead ? "CO-CEO Lead" : "Unassigned"}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground font-semibold block">Assigned Members</span>
                  <span className="font-extrabold text-foreground font-mono">{(project.members || project.team || []).length} members</span>
                </div>
                <span className="text-muted-foreground font-mono font-bold">Scoped Access</span>
              </div>
            </div>
          </div>
        )}

        {section === "access" && (
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-extrabold text-foreground">Project Access & Visibility (RBAC)</h3>
              <p className="text-muted-foreground text-xs">Database-level visibility rules for this workspace project.</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 space-y-2">
              <span className="font-extrabold uppercase tracking-wider text-[10px] block">Private Project Access Policy</span>
              <p className="text-xs leading-relaxed">
                This project is private by default. Access is strictly enforced at the backend database authorization layer.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-background border border-border flex justify-between">
                <span className="font-bold text-foreground">CEO</span>
                <span className="text-emerald-500 font-bold">Full View & Management</span>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border flex justify-between">
                <span className="font-bold text-foreground">Assigned CO-CEO</span>
                <span className="text-emerald-500 font-bold">Authorized Project Access</span>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border flex justify-between">
                <span className="font-bold text-foreground">Assigned Members</span>
                <span className="text-blue-500 font-bold">Explicit Task/Milestone Scope</span>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border flex justify-between">
                <span className="font-bold text-foreground">Unassigned Organization Members</span>
                <span className="text-rose-500 font-bold">No Access (404 Hidden)</span>
              </div>
            </div>
          </div>
        )}

        {section === "integrations" && (
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-extrabold text-foreground">Connected Integrations</h3>
              <p className="text-muted-foreground text-xs">Manage external GitHub repositories and platform connections.</p>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Github className="w-5 h-5 text-foreground" />
                <div>
                  <h4 className="font-extrabold text-foreground">GitHub Integration</h4>
                  <p className="text-muted-foreground text-[11px]">
                    {project.github?.connected || project.github?.repoName
                      ? `Connected to ${project.github?.owner}/${project.github?.repoName || "repository"}`
                      : "No repository connected yet."}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                project.github?.connected || project.github?.repoName
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : "bg-muted text-muted-foreground"
              }`}>
                {project.github?.connected || project.github?.repoName ? "Connected" : "Not Connected"}
              </span>
            </div>
          </div>
        )}

        {section === "danger" && (
          <div className="p-5 rounded-2xl bg-card border border-rose-500/30 space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-extrabold text-rose-500">Danger Zone</h3>
              <p className="text-muted-foreground text-xs">Destructive actions for this project workspace.</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <p className="font-extrabold text-xs text-foreground">Archive Project</p>
                <p className="text-muted-foreground text-[11px]">Mark project as read-only archived status.</p>
              </div>
              <button
                type="button"
                onClick={onArchive}
                className="px-3.5 py-1.5 rounded-xl border border-amber-500/40 text-amber-500 font-bold text-xs hover:bg-amber-500/10 cursor-pointer"
              >
                Archive
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <p className="font-extrabold text-xs text-rose-500">Delete Project</p>
                <p className="text-muted-foreground text-[11px]">Permanently remove project and all associated records.</p>
              </div>
              <button
                type="button"
                onClick={onDelete}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs hover:bg-rose-700 cursor-pointer shadow-2xs"
              >
                Delete Project
              </button>
            </div>
          </div>
        )}
      </div>
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
  const [addMenuOpen, setAddMenuOpen] = useState(false);
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
        <div className="hidden md:block space-y-3">
          {/* Row 1: Back Button & Compact Breadcrumb */}
          <div className="flex items-center gap-3">
            <Link
              href={`${base}/projects`}
              className="px-2.5 py-1 rounded-lg border border-border bg-card text-[#667085] hover:text-foreground text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Back to Projects"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span>Projects</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-bold truncate max-w-[300px]">
                {project.name}
              </span>
            </div>
          </div>

          {/* Row 2 & 3: Project Identity, Description, Metadata & Compact Progress */}
          <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-extrabold text-foreground tracking-tight leading-none">
                  {project.name}
                </h1>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${
                  project.status === "Active" || project.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                }`}>
                  ● {project.status || "Active"}
                </span>
              </div>

              {project.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 max-w-3xl pt-0.5">
                  {project.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                <span>Project Owner: <strong className="text-foreground font-bold">{project.owner || "CEO"}</strong></span>
                <span>·</span>
                <span>Project Lead: <strong className="text-[#C9A52A] font-extrabold">{project.coCeoLeadName || "CO-CEO"}</strong></span>
                <span>·</span>
                <span>Due: <span className="font-mono font-bold text-foreground">{fmtDate(project.deadline, "Flexible")}</span></span>
                <span>·</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">Progress</span>
                  <div className="w-20 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-[#C9A52A] rounded-full" style={{ width: `${Math.min(100, progressPercent)}%` }} />
                  </div>
                  <span className="font-mono font-bold text-foreground">{progressPercent}%</span>
                  <span>·</span>
                  <span className="text-emerald-500 font-bold">On Track</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <button
                  onClick={() => setAddMenuOpen(!addMenuOpen)}
                  className="inline-flex items-center gap-1.5 px-3.5 h-[34px] rounded-xl bg-[#C9A52A] text-[#0B0D10] text-xs font-extrabold hover:brightness-105 transition-all cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </button>

                {addMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] shadow-2xl py-1.5 z-40 text-[12.5px] font-sans">
                    <button
                      onClick={() => { setShowAddTaskModal(true); setAddMenuOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                    >
                      <CheckSquare className="w-4 h-4 text-[#C9A52A]" />
                      <div>
                        <p className="font-bold">Task</p>
                        <p className="text-[10px] text-[#667085]">Assign actionable item</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab("TASKS"); setAddMenuOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-bold">Work Package</p>
                        <p className="text-[10px] text-[#667085]">Define execution module</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab("MILESTONES"); setAddMenuOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                    >
                      <Flag className="w-4 h-4 text-amber-500" />
                      <div>
                        <p className="font-bold">Milestone</p>
                        <p className="text-[10px] text-[#667085]">Add project phase gate</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab("AI_TOOLS"); setAddMenuOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                    >
                      <Bot className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="font-bold">AI Tool (Hub)</p>
                        <p className="text-[10px] text-[#667085]">Link ManMadhan Hub tool</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab("TEAM"); setAddMenuOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="font-bold">Team Member</p>
                        <p className="text-[10px] text-[#667085]">Assign project resource</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab("DOCUMENTS"); setAddMenuOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <div>
                        <p className="font-bold">Document</p>
                        <p className="text-[10px] text-[#667085]">Add document/PRD</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab("SUBMISSIONS"); setAddMenuOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-rose-500" />
                      <div>
                        <p className="font-bold">Submission</p>
                        <p className="text-[10px] text-[#667085]">Submit project deliverable</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab("GITHUB"); setAddMenuOpen(false); }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                    >
                      <Github className="w-4 h-4 text-[#17202A] dark:text-[#F2F4F7]" />
                      <div>
                        <p className="font-bold">GitHub Resource</p>
                        <p className="text-[10px] text-[#667085]">Connect repo / branch</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
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

          {activeTab === "TASKS" && (
            <WorkTab project={project} tasks={tasks} onAddTask={() => setShowAddTaskModal(true)} onWorkCreated={fetchProjectDetails} />
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

          {activeTab === "SUBMISSIONS" && (
            <SubmissionsTab
              projectId={projectId}
              submissions={submissions}
              onRefresh={fetchProjectDetails}
            />
          )}

          {activeTab === "DOCUMENTS" && (
            <ProjectDocumentsView
              projectId={projectId}
              projectStatus={project.status}
              userRole={base === "/co-ceo" ? "CO-CEO" : base === "/member" ? "MEMBER" : "CEO"}
              onRefresh={fetchProjectDetails}
            />
          )}

          {activeTab === "GITHUB" && (
            <GitHubOAuthPanel projectId={projectId} project={project} />
          )}

          {activeTab === "ACTIVITY" && (
            <ActivityTab activity={activity} />
          )}

          {activeTab === "SETTINGS" && (
            <SettingsTab
              project={project}
              onUpdate={async (updated) => {
                await apiClient.patch(`/org/projects/${projectId}`, updated);
                await fetchProjectDetails();
              }}
              onArchive={handleArchiveProject}
              onDelete={() => setShowDeleteModal(true)}
            />
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
