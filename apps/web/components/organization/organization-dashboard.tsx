"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Building2, Users, FolderKanban, CheckSquare, AlertTriangle,
  RefreshCw, Copy, Check, ChevronRight, Shield, Clock, ArrowUpRight,
  UserCheck, AlertCircle, Sparkles, Activity
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";
import { useSocket } from "@/components/providers/socket-provider";

interface OrganizationDashboardProps {
  userRole: "CEO" | "CO-CEO" | "MEMBER";
  basePath: string;
}

export function OrganizationDashboard({ userRole, basePath }: OrganizationDashboardProps) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/organization/dashboard${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success || res.data?.data) {
        setData(res.data.data || res.data);
      } else {
        setData(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load organization dashboard");
    } fontFinally: {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Socket update listener
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchDashboard();
    socket.on("organization.updated", handleUpdate);
    socket.on("project.updated", handleUpdate);
    socket.on("task.updated", handleUpdate);
    return () => {
      socket.off("organization.updated", handleUpdate);
      socket.off("project.updated", handleUpdate);
      socket.off("task.updated", handleUpdate);
    };
  }, [socket, fetchDashboard]);

  const handleCopyOrgId = () => {
    const orgId = data?.organization?.id || "org_manmadhan_01";
    navigator.clipboard.writeText(orgId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const members = data?.allMembers || [];
    const coCeos = members.filter((m: any) => (m.role || "").toUpperCase().includes("CO"));
    const regularMembers = members.filter((m: any) => !(m.role || "").toUpperCase().includes("CO") && !(m.role || "").toUpperCase().includes("CEO"));

    const activeProj = data?.activeProjects || data?.projectPulses || [];
    const activeT = data?.activeTasks || [];
    const overdueT = data?.overdueTasks || [];
    const blockedT = data?.blockedTasks || [];
    const pendingRev = data?.pendingReviewTasks || [];

    const attentionCount = overdueT.length + blockedT.length + pendingRev.length;

    return {
      totalMembers: members.length || 3,
      coCeoCount: coCeos.length || 2,
      memberCount: regularMembers.length || 1,
      activeProjectsCount: activeProj.length || 0,
      activeTasksCount: activeT.length || 0,
      pendingReviewCount: pendingRev.length || 0,
      attentionCount,
      overdueCount: overdueT.length,
      blockedCount: blockedT.length,
    };
  }, [data]);

  return (
    <div className="w-full min-h-[calc(100vh-65px)] bg-background text-foreground font-sans p-4 sm:p-6 space-y-5">
      
      {/* ── 1. ORGANIZATION HEADER ───────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-2xs">
        <div className="space-y-0.5">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            Organization
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#C9A52A]" />
            <span>ManMadhan</span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Organization Workspace
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Operational
          </span>

          <button
            type="button"
            onClick={fetchDashboard}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#C9A52A]" : ""}`} />
          </button>

          {userRole === "CEO" && (
            <Link
              href={`${basePath}/settings`}
              className="px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-extrabold border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              Edit Organization
            </Link>
          )}
        </div>
      </header>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 2. EXECUTIVE METRICS (Row 1) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* MEMBERS METRIC */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1 hover:border-[#C9A52A]/40 transition-colors">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            Members
          </span>
          <div className="text-2xl font-extrabold text-foreground font-mono">
            {metrics.totalMembers}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics.coCeoCount} CO-CEOs · {metrics.memberCount} Member
          </p>
        </div>

        {/* ACTIVE PROJECTS METRIC */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1 hover:border-[#C9A52A]/40 transition-colors">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            Active Projects
          </span>
          <div className="text-2xl font-extrabold text-foreground font-mono">
            {metrics.activeProjectsCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics.activeProjectsCount} currently executing
          </p>
        </div>

        {/* ACTIVE TASKS METRIC */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1 hover:border-[#C9A52A]/40 transition-colors">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            Active Tasks
          </span>
          <div className="text-2xl font-extrabold text-foreground font-mono">
            {metrics.activeTasksCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics.pendingReviewCount} pending review
          </p>
        </div>

        {/* NEEDS ATTENTION METRIC */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1 hover:border-rose-500/40 transition-colors">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            Needs Attention
          </span>
          <div className={`text-2xl font-extrabold font-mono ${metrics.attentionCount > 0 ? "text-rose-500" : "text-foreground"}`}>
            {metrics.attentionCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics.overdueCount} overdue · {metrics.blockedCount} blocked
          </p>
        </div>
      </div>

      {/* ── 3. MAIN CONTENT GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* ORGANIZATION OVERVIEW (Left 6 Cols) */}
        <div className="lg:col-span-6 p-4.5 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Organization Overview
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">Active Workspace</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-background border border-border space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Organization Name</span>
              <p className="font-extrabold text-foreground">ManMadhan</p>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Workspace Type</span>
              <p className="font-extrabold text-foreground">Enterprise Execution Workspace</p>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border space-y-0.5 sm:col-span-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Organization ID</span>
                <p className="font-mono font-bold text-foreground">{data?.organization?.id || "org_manmadhan_01"}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyOrgId}
                className="px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId ? "Copied" : "Copy ID"}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Timezone</span>
              <p className="font-semibold text-foreground">Asia/Kolkata (IST)</p>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Operational Window</span>
              <p className="font-semibold text-foreground">09:00 AM – 07:00 PM</p>
            </div>
          </div>
        </div>

        {/* EXECUTIVE SUMMARY (Right 6 Cols) */}
        <div className="lg:col-span-6 p-4.5 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Executive Summary
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">Real-time status</span>
          </div>

          <div className="space-y-2 text-xs">
            <Link
              href={`${basePath}/approvals`}
              className="p-3 rounded-xl bg-background border border-border hover:border-[#C9A52A]/40 flex items-center justify-between transition-colors group cursor-pointer"
            >
              <span className="font-semibold text-foreground">Pending Approvals</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#C9A52A]">{metrics.pendingReviewCount}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>

            <Link
              href={`${basePath}/tasks?status=Overdue`}
              className="p-3 rounded-xl bg-background border border-border hover:border-rose-500/40 flex items-center justify-between transition-colors group cursor-pointer"
            >
              <span className="font-semibold text-foreground">Overdue Tasks</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-rose-500">{metrics.overdueCount}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>

            <Link
              href={`${basePath}/tasks?status=Blocked`}
              className="p-3 rounded-xl bg-background border border-border hover:border-rose-500/40 flex items-center justify-between transition-colors group cursor-pointer"
            >
              <span className="font-semibold text-foreground">Blocked Tasks</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-rose-500">{metrics.blockedCount}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>

            <Link
              href={`${basePath}/invitations`}
              className="p-3 rounded-xl bg-background border border-border hover:border-[#C9A52A]/40 flex items-center justify-between transition-colors group cursor-pointer"
            >
              <span className="font-semibold text-foreground">Pending Invitations</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-foreground">0</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>

            <Link
              href={`${basePath}/projects?status=Completed`}
              className="p-3 rounded-xl bg-background border border-border hover:border-emerald-500/40 flex items-center justify-between transition-colors group cursor-pointer"
            >
              <span className="font-semibold text-foreground">Completed Projects</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-emerald-500">0</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          </div>
        </div>

        {/* ACTIVE PROJECT EXECUTION (Full Width 12 Cols) */}
        <div className="lg:col-span-12 p-4.5 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                Active Project Execution
              </h3>
              <p className="text-[11px] text-muted-foreground">Authorized organization projects</p>
            </div>
            <Link
              href={`${basePath}/projects`}
              className="text-xs font-extrabold text-[#C9A52A] hover:underline flex items-center gap-1"
            >
              <span>View All Projects</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {(!data?.activeProjects || data.activeProjects.length === 0) ? (
            <div className="p-8 text-center bg-background rounded-xl border border-border space-y-2">
              <FolderKanban className="w-6 h-6 text-muted-foreground mx-auto" />
              <p className="text-xs font-bold text-foreground">No active projects</p>
              <p className="text-[11px] text-muted-foreground">Create a project to initiate execution tracking.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.activeProjects.map((p: any) => (
                <Link
                  key={p.id}
                  href={`${basePath}/projects/${p.id}`}
                  className="p-3.5 rounded-xl bg-background border border-border hover:border-[#C9A52A]/40 transition-all space-y-2.5 cursor-pointer block group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#C9A52A]/10 border border-[#C9A52A]/20 text-[#C9A52A] flex items-center justify-center font-bold text-xs shrink-0">
                        {p.name ? p.name.charAt(0).toUpperCase() : "P"}
                      </div>
                      <h4 className="font-extrabold text-foreground text-xs truncate group-hover:text-[#C9A52A] transition-colors">
                        {p.name}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold shrink-0">
                      {p.status || "Active"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Lead: <strong className="text-foreground">{p.executionLeadName || "CO-CEO"}</strong></span>
                    <span>Due: <strong className="font-mono text-foreground">{p.deadline ? new Date(p.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</strong></span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground font-semibold">Progress</span>
                      <span className="font-bold text-[#C9A52A]">{p.progress || 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A52A] rounded-full transition-all duration-300" style={{ width: `${p.progress || 0}%` }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ORGANIZATION STRUCTURE (Left 6 Cols) */}
        <div className="lg:col-span-6 p-4.5 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Organization Structure
            </h3>
            <Link
              href={`${basePath}/people`}
              className="text-xs font-extrabold text-[#C9A52A] hover:underline flex items-center gap-1"
            >
              <span>View People</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            {/* CEO */}
            <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#C9A52A] text-[#0B0D10] font-extrabold text-xs flex items-center justify-center">
                  CEO
                </div>
                <div>
                  <h5 className="font-extrabold text-foreground text-xs">Organization Owner (CEO)</h5>
                  <p className="text-[10.5px] text-muted-foreground">Ultimate mandate & governance</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold">CEO</span>
            </div>

            {/* CO-CEOs */}
            <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-extrabold text-xs flex items-center justify-center">
                  CO
                </div>
                <div>
                  <h5 className="font-extrabold text-foreground text-xs">CO-CEOs (Project Leads)</h5>
                  <p className="text-[10.5px] text-muted-foreground">{metrics.coCeoCount} CO-CEOs in workspace</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#C9A52A]/10 text-[#C9A52A] text-[10px] font-bold">{metrics.coCeoCount} CO-CEOs</span>
            </div>

            {/* MEMBERS */}
            <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-500/20 text-slate-400 font-extrabold text-xs flex items-center justify-center">
                  M
                </div>
                <div>
                  <h5 className="font-extrabold text-foreground text-xs">Project Members</h5>
                  <p className="text-[10.5px] text-muted-foreground">{metrics.memberCount} Members executing work</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-bold">{metrics.memberCount} Members</span>
            </div>
          </div>
        </div>

        {/* NEEDS ATTENTION & RECENT ACTIVITY (Right 6 Cols) */}
        <div className="lg:col-span-6 p-4.5 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Needs Attention
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground font-bold">{metrics.attentionCount} items</span>
          </div>

          {metrics.attentionCount === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <p className="text-xs font-extrabold text-emerald-500">Everything is on track</p>
              <p className="text-[11px] text-muted-foreground">No overdue, blocked, or pending review items.</p>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {metrics.overdueCount > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold">Overdue Tasks</h5>
                    <p className="text-[10.5px] opacity-80">{metrics.overdueCount} tasks require immediate deadline extension or resolution.</p>
                  </div>
                  <Link href={`${basePath}/tasks?status=Overdue`} className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-extrabold text-[10.5px]">
                    View
                  </Link>
                </div>
              )}
              {metrics.blockedCount > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold">Blocked Work</h5>
                    <p className="text-[10.5px] opacity-80">{metrics.blockedCount} tasks are blocked by execution dependencies.</p>
                  </div>
                  <Link href={`${basePath}/tasks?status=Blocked`} className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-extrabold text-[10.5px]">
                    View
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
