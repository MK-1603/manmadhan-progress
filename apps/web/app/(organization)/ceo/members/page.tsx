"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Users, Loader2, AlertCircle, UserPlus, Search, ChevronRight } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import Link from "next/link";

export default function CEOMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalCount: 0,
    activeCount: 0,
    tasksAssignedCount: 0,
    completedCount: 0,
    overdueCount: 0,
    blockedCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const { socket } = useSocket();

  const fetchMembers = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/organization/members?workspaceId=${workspaceId}`);
      if (res.data.success) {
        setMembers(res.data.data || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch {
      setError("Unable to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("MEMBER_ACTIVATED", fetchMembers);
    return () => {
      socket.off("MEMBER_ACTIVATED");
    };
  }, [socket]);

  const filtered = members.filter((m) => {
    const s = search.toLowerCase();
    const matchSearch =
      (m.name || "").toLowerCase().includes(s) ||
      (m.email || "").toLowerCase().includes(s) ||
      (m.displayName || "").toLowerCase().includes(s);
    const matchRole = roleFilter === "All" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="p-4 lg:p-6 max-w-[1240px] mx-auto w-full space-y-6">
      {/* Back Button */}
      <Link
        href="/ceo/organization"
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Organization
      </Link>

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">ManMadhan · CEO</p>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none">Members</h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">
            Organization execution team workload, supervisor assignment and task progress.
          </p>
        </div>
        <Link
          href="/ceo/invitations"
          className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-hover text-[#111827] text-[12px] font-bold rounded-xl transition-colors self-start"
        >
          <UserPlus className="w-3.5 h-3.5" /> Invite Member
        </Link>
      </div>

      {/* Top Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        {[
          { label: "Total Team",     value: summary.totalCount || members.length },
          { label: "Active",         value: summary.activeCount || members.filter(m => m.status === "ACTIVE").length },
          { label: "Tasks Assigned", value: summary.tasksAssignedCount || 0 },
          { label: "Completed",      value: summary.completedCount || 0 },
          { label: "Overdue",        value: summary.overdueCount || 0 },
          { label: "Blocked",        value: summary.blockedCount || 0 },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-3.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{s.label}</p>
            <p className="text-[22px] font-bold text-foreground mt-1 leading-none">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members by name or email..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 bg-card border border-border rounded-xl text-[12px] font-semibold text-foreground focus:outline-none focus:border-gold"
        >
          {["All", "CEO", "CO-CEO", "MEMBER"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* Members Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center border border-border border-dashed rounded-2xl">
          <Users className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-[13px] font-semibold text-foreground">No members found</p>
          <p className="text-[12px] text-muted-foreground max-w-xs">
            Members appear here once invited and assigned to project execution.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-border/80 transition-colors">
              {/* header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted border border-border font-bold text-foreground text-[14px] flex items-center justify-center shrink-0">
                    {(m.name || m.email || "M").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{m.name || m.email}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg border shrink-0 ${
                  m.status === "ACTIVE" || m.status === "Activated"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}>
                  {m.status || "ACTIVE"}
                </span>
              </div>

              {/* reports to */}
              <div className="px-3 py-2 bg-background border border-border rounded-xl text-[11px] text-muted-foreground">
                Reports to: <span className="font-semibold text-foreground">
                  {m.assignedCoCeoName ? `${m.assignedCoCeoName} (CO-CEO)` : "Organization Leadership"}
                </span>
              </div>

              {/* metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Projects",  value: m.projectsCount  || 0 },
                  { label: "Tasks",     value: m.tasksCount     || 0 },
                  { label: "Done",      value: m.completedTasks || 0 },
                ].map(stat => (
                  <div key={stat.label} className="bg-background border border-border rounded-xl py-2">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                    <p className="text-[15px] font-bold text-foreground mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* current work */}
              {m.currentWork ? (
                <div className="px-3 py-2.5 bg-background border border-border rounded-xl text-[11px] space-y-0.5">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Current Work</p>
                  <p className="font-semibold text-foreground truncate">{m.currentWork.title}</p>
                  {m.currentWork.projectName && (
                    <p className="text-muted-foreground truncate">{m.currentWork.projectName}</p>
                  )}
                </div>
              ) : (
                <div className="px-3 py-2.5 bg-background border border-border rounded-xl text-[11px] text-muted-foreground">
                  No active task currently assigned.
                </div>
              )}

              {/* View button — navigates to dedicated page */}
              <Link
                href={`/ceo/members/${m.id}`}
                className="w-full py-2 rounded-xl border border-border bg-card hover:bg-muted text-[12px] font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors"
              >
                View Profile <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
