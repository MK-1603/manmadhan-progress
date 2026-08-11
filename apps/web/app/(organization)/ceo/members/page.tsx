"use client";

import { useState, useEffect } from "react";
import { Users, Loader2, AlertCircle, Mail, UserPlus, Search, Briefcase, ChevronRight } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import Link from "next/link";
import { PersonDetailDrawer } from "@/components/organization/person-detail-drawer";

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
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
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
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Members</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organization execution team workload, supervisor assignment & task progress
          </p>
        </div>
        <Link
          href="/ceo/invitations"
          className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Invite Member
        </Link>
      </div>

      {/* Top Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        {[
          { label: "Total Team", value: summary.totalCount || members.length, color: "text-foreground" },
          { label: "Active", value: summary.activeCount || members.filter(m => m.status === "ACTIVE").length, color: "text-emerald-500" },
          { label: "Tasks Assigned", value: summary.tasksAssignedCount || 0, color: "text-blue-500" },
          { label: "Completed", value: summary.completedCount || 0, color: "text-emerald-500" },
          { label: "Overdue", value: summary.overdueCount || 0, color: summary.overdueCount > 0 ? "text-rose-500" : "text-emerald-500" },
          { label: "Blocked", value: summary.blockedCount || 0, color: summary.blockedCount > 0 ? "text-rose-400" : "text-muted-foreground" },
        ].map((s) => (
          <PremiumCard key={s.label} className="p-2.5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </PremiumCard>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members by name, email, or role..."
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-xl text-xs font-semibold text-foreground focus:border-primary outline-none"
        >
          {["All", "CEO", "CO-CEO", "MEMBER"].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Members Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 p-6 border border-border rounded-2xl bg-card space-y-2">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-bold text-foreground">No members found</p>
          <p className="text-[11px] text-muted-foreground">
            Members will appear here once invited and assigned to project execution.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <PremiumCard key={m.id} className="p-4 space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                      {m.name ? m.name.charAt(0).toUpperCase() : "M"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground truncate">{m.name || m.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                    m.status === "ACTIVE" || m.status === "Activated" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  }`}>
                    {m.status || "ACTIVE"}
                  </span>
                </div>

                {/* Supervisor Relationship */}
                <div className="p-2 bg-background border border-border rounded-lg text-[11px] font-medium text-muted-foreground">
                  <span className="font-bold text-foreground">Reports to: </span>
                  {m.assignedCoCeoName ? `${m.assignedCoCeoName} (CO-CEO)` : "Organization Leadership"}
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 text-center p-2.5 bg-background border border-border rounded-xl">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-muted-foreground block">Projects</span>
                    <span className="text-xs font-bold text-amber-500">{m.projectsCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-muted-foreground block">Tasks</span>
                    <span className="text-xs font-bold text-blue-500">{m.tasksCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-muted-foreground block">Completed</span>
                    <span className="text-xs font-bold text-emerald-500">{m.completedTasks || 0}</span>
                  </div>
                </div>

                {/* Active Current Work */}
                {m.currentWork ? (
                  <div className="p-2.5 bg-background border border-border rounded-xl text-xs space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-muted-foreground block">Current Work</span>
                    <p className="font-bold text-foreground truncate">{m.currentWork.title}</p>
                    <p className="text-[10px] text-amber-500 font-semibold">{m.currentWork.projectName}</p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-background border border-border rounded-xl text-[11px] text-muted-foreground">
                    No active task currently assigned.
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => setSelectedPerson(m)}
                className="w-full mt-3 py-2 bg-card border border-border hover:border-primary text-xs font-bold text-foreground rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                View Member Profile <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </PremiumCard>
          ))}
        </div>
      )}

      {/* Slide-over Profile Drawer */}
      <PersonDetailDrawer person={selectedPerson} onClose={() => setSelectedPerson(null)} />
    </div>
  );
}
