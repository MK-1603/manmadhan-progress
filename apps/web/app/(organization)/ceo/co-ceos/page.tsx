"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, UserCheck, Loader2, AlertCircle, Mail, UserPlus, Shield, Folder, CheckSquare, Users, Clock, ChevronRight } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import Link from "next/link";

export default function CEOCoCeosPage() {
  const [coCeos, setCoCeos] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalCount: 0,
    activeCount: 0,
    projectsCount: 0,
    tasksCount: 0,
    overdueCount: 0,
    pendingApprovalsCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { socket } = useSocket();

  const fetchCoCeos = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/organization/co-ceos?workspaceId=${workspaceId}`);
      if (res.data.success) {
        setCoCeos(res.data.coCeos || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch {
      setError("Unable to load CO-CEOs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoCeos();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("INVITATION_ACCEPTED", fetchCoCeos);
    socket.on("MEMBER_ACTIVATED", fetchCoCeos);
    return () => {
      socket.off("INVITATION_ACCEPTED");
      socket.off("MEMBER_ACTIVATED");
    };
  }, [socket]);

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
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-purple-500" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">CO-CEOs</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Leadership team — co-chief executive officers workload & execution authority
          </p>
        </div>
        <Link
          href="/ceo/invitations"
          className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Invite CO-CEO
        </Link>
      </div>

      {/* Top Executive Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        {[
          { label: "Total CO-CEOs", value: summary.totalCount, color: "text-foreground" },
          { label: "Active", value: summary.activeCount, color: "text-emerald-500" },
          { label: "Projects", value: summary.projectsCount, color: "text-amber-500" },
          { label: "Tasks", value: summary.tasksCount, color: "text-blue-500" },
          { label: "Overdue", value: summary.overdueCount, color: summary.overdueCount > 0 ? "text-rose-500" : "text-emerald-500" },
          { label: "Approvals", value: summary.pendingApprovalsCount, color: "text-purple-500" },
        ].map((s) => (
          <PremiumCard key={s.label} className="p-2.5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </PremiumCard>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* CO-CEO Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : coCeos.length === 0 ? (
        <div className="text-center py-16 p-6 border border-border rounded-2xl bg-card space-y-3">
          <UserCheck className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-bold text-foreground">No CO-CEOs assigned yet</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Invite co-chief executive officers to delegate project ownership, task planning, and team management.
          </p>
          <Link
            href="/ceo/invitations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
          >
            <UserPlus className="w-4 h-4" /> Send Invitation
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coCeos.map((c) => (
            <PremiumCard key={c.id} className="p-4 space-y-4 hover:border-purple-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 font-bold text-sm flex items-center justify-center shrink-0">
                      {c.name ? c.name.charAt(0).toUpperCase() : "C"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground truncate">{c.name || c.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                    c.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  }`}>
                    {c.status}
                  </span>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 text-center p-2.5 bg-background border border-border rounded-xl">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-muted-foreground block">Projects</span>
                    <span className="text-xs font-bold text-amber-500">{c.projectsCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-muted-foreground block">Tasks</span>
                    <span className="text-xs font-bold text-blue-500">{c.tasksCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-muted-foreground block">Members</span>
                    <span className="text-xs font-bold text-purple-500">{c.membersCount || 0}</span>
                  </div>
                </div>

                {/* Active Current Task Context */}
                {c.currentWork ? (
                  <div className="p-2.5 bg-background border border-border rounded-xl text-xs space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-muted-foreground block">Active Mandate</span>
                    <p className="font-bold text-foreground truncate">{c.currentWork.title}</p>
                    <p className="text-[10px] text-amber-500 font-semibold">{c.currentWork.projectName}</p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-background border border-border rounded-xl text-[11px] text-muted-foreground">
                    No active project mandate currently assigned.
                  </div>
                )}
              </div>

              {/* Action Button — navigates to dedicated page */}
              <Link
                href={`/ceo/co-ceos/${c.id}`}
                className="w-full mt-3 py-2 bg-card border border-border hover:border-primary text-xs font-bold text-foreground rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                View Leadership Profile <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </PremiumCard>
          ))}
        </div>
      )}
    </div>
  );
}
