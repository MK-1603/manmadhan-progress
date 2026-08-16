"use client";

import { useState, useEffect } from "react";
import {
  Users, UserCheck, Mail, Loader2, AlertCircle, UserPlus,
  Search, ChevronRight, CheckCircle2, Clock, Briefcase
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { InvitePersonModal } from "@/components/organization/invite-person-modal";
import { CoCeoDetailModal } from "@/components/organization/co-ceo-detail-modal";
import { MemberDetailModal } from "@/components/organization/member-detail-modal";
import { InvitationDetailModal } from "@/components/organization/invitation-detail-modal";

type Tab = "co-ceos" | "members" | "invitations";

export default function OrganizationPeoplePage() {
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState<Tab>("co-ceos");
  const [coCeos, setCoCeos] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"CO-CEO" | "MEMBER">("MEMBER");

  const [selectedCoCeoId, setSelectedCoCeoId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    coCeoCount: 0,
    memberCount: 0,
    activeCount: 0,
    pendingInvitations: 0,
  });

  const fetchData = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;

      const [coCeoRes, memberRes, inviteRes, statsRes] = await Promise.all([
        apiClient.get(`/organization/co-ceos?workspaceId=${workspaceId}`),
        apiClient.get(`/organization/members?workspaceId=${workspaceId}`),
        apiClient.get(`/organization/invitations?workspaceId=${workspaceId}`).catch(() => ({ data: { success: false, data: [] } })),
        apiClient.get(`/organization/stats?workspaceId=${workspaceId}`),
      ]);

      if (coCeoRes.data.success) {
        // Filter: only show users who are actually CO-CEO (not invitations shown here)
        const activeCoCeos = (coCeoRes.data.coCeos || coCeoRes.data.data || []).filter(
          (c: any) => c.status === "ACTIVE" || c.status === "Activated"
        );
        setCoCeos(activeCoCeos);
      }
      if (memberRes.data.success) {
        // Members endpoint already excludes CEO (server-side fix applied)
        const activeMembers = (memberRes.data.data || []).filter(
          (m: any) => m.role === "MEMBER" || m.role === "member"
        );
        setMembers(activeMembers);
      }
      if (inviteRes.data.success) {
        setInvitations(inviteRes.data.data || inviteRes.data.invitations || []);
      }
      if (statsRes.data.success) {
        const d = statsRes.data.data;
        setStats({
          coCeoCount: d.totalCoCeos ?? 0,
          memberCount: d.totalMembers ?? 0,
          activeCount: (d.totalCoCeos ?? 0) + (d.totalMembers ?? 0),
          pendingInvitations: d.pendingInvitations ?? 0,
        });
      }
    } catch {
      setError("Unable to load organization people");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("MEMBER_ACTIVATED", fetchData);
    socket.on("INVITATION_ACCEPTED", fetchData);
    socket.on("organization.updated", fetchData);
    return () => {
      socket.off("MEMBER_ACTIVATED", fetchData);
      socket.off("INVITATION_ACCEPTED", fetchData);
      socket.off("organization.updated", fetchData);
    };
  }, [socket]);

  const filterBySearch = (items: any[]) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        (i.name || "").toLowerCase().includes(q) ||
        (i.email || "").toLowerCase().includes(q) ||
        (i.displayName || "").toLowerCase().includes(q)
    );
  };

  const filteredCoCeos = filterBySearch(coCeos);
  const filteredMembers = filterBySearch(members);
  const filteredInvitations = filterBySearch(invitations);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "co-ceos", label: "CO-CEOs", count: stats.coCeoCount },
    { id: "members", label: "Members", count: stats.memberCount },
    { id: "invitations", label: "Invitations", count: stats.pendingInvitations },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-16 max-w-[1100px] mx-auto w-full space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">ManMadhan · CEO</p>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-none">People</h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">
            Organization CO-CEOs, Members and Invitations. CEO is not listed here.
          </p>
        </div>
        <button
          onClick={() => {
            setInviteRole(activeTab === "co-ceos" ? "CO-CEO" : "MEMBER");
            setIsInviteOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold/90 text-[#111827] text-[12px] font-bold rounded-xl transition-colors self-start"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Invite {activeTab === "co-ceos" ? "CO-CEO" : "Member"}
        </button>
      </div>

      {/* Stats Strip */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-3.5 animate-pulse h-16" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: "CO-CEOs", value: stats.coCeoCount, color: "text-purple-500" },
            { label: "Members", value: stats.memberCount, color: "text-blue-500" },
            { label: "Active Total", value: stats.activeCount, color: "text-emerald-500" },
            { label: "Pending Invitations", value: stats.pendingInvitations, color: stats.pendingInvitations > 0 ? "text-amber-500" : "text-foreground" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-3.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{s.label}</p>
              <p className={`text-[22px] font-bold mt-1 leading-none ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              activeTab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              activeTab === t.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* CO-CEOs Tab */}
          {activeTab === "co-ceos" && (
            <>
              {filteredCoCeos.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center border border-border border-dashed rounded-2xl">
                  <UserCheck className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-[13px] font-semibold text-foreground">No CO-CEOs yet</p>
                  <p className="text-[12px] text-muted-foreground max-w-xs">
                    Invite co-chief executive officers to delegate project ownership and leadership.
                  </p>
                  <button
                    onClick={() => { setInviteRole("CO-CEO"); setIsInviteOpen(true); }}
                    className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-[12px] font-bold rounded-xl"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Invite CO-CEO
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCoCeos.map((c) => (
                    <div key={c.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-purple-500/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 font-bold text-[14px] flex items-center justify-center shrink-0">
                            {(c.name || c.email || "C").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-foreground truncate">{c.name || c.email}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20 shrink-0">CO-CEO</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: "Projects", value: c.projectsCount ?? 0 },
                          { label: "Tasks", value: c.tasksCount ?? 0 },
                          { label: "Members", value: c.membersCount ?? 0 },
                        ].map((s) => (
                          <div key={s.label} className="bg-background border border-border rounded-xl py-2">
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                            <p className="text-[15px] font-bold text-foreground mt-0.5">{s.value}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setSelectedCoCeoId(c.id)}
                        className="w-full py-2 rounded-xl border border-border bg-card hover:bg-muted text-[12px] font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors"
                      >
                        View Profile <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Members Tab */}
          {activeTab === "members" && (
            <>
              {filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center border border-border border-dashed rounded-2xl">
                  <Users className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-[13px] font-semibold text-foreground">No members yet</p>
                  <p className="text-[12px] text-muted-foreground max-w-xs">
                    Members appear here once invited and activated in the organization.
                  </p>
                  <button
                    onClick={() => { setInviteRole("MEMBER"); setIsInviteOpen(true); }}
                    className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-[12px] font-bold rounded-xl"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Invite Member
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMembers.map((m) => (
                    <div key={m.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-blue-500/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 font-bold text-[14px] flex items-center justify-center shrink-0">
                            {(m.name || m.email || "M").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-foreground truncate">{m.name || m.email}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">MEMBER</span>
                      </div>
                      <div className="px-3 py-2 bg-background border border-border rounded-xl text-[11px] text-muted-foreground">
                        Reports to: <span className="font-semibold text-foreground">
                          {m.assignedCoCeoName ? `${m.assignedCoCeoName} (CO-CEO)` : "Organization Leadership"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: "Projects", value: m.projectsCount ?? 0 },
                          { label: "Tasks", value: m.tasksCount ?? 0 },
                          { label: "Done", value: m.completedTasks ?? 0 },
                        ].map((s) => (
                          <div key={s.label} className="bg-background border border-border rounded-xl py-2">
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                            <p className="text-[15px] font-bold text-foreground mt-0.5">{s.value}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setSelectedMemberId(m.id)}
                        className="w-full py-2 rounded-xl border border-border bg-card hover:bg-muted text-[12px] font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors"
                      >
                        View Profile <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Invitations Tab */}
          {activeTab === "invitations" && (
            <>
              {filteredInvitations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center border border-border border-dashed rounded-2xl">
                  <Mail className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-[13px] font-semibold text-foreground">No invitations sent yet</p>
                  <p className="text-[12px] text-muted-foreground max-w-xs">
                    Invitations appear here once you send them from the invite flow.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredInvitations.map((inv: any) => {
                    const isActive = inv.status === "Pending" || inv.status === "Delivered";
                    const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
                    const isActivated = inv.status === "Activated" || inv.status === "Completed";
                    const statusColor = isActivated
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : isExpired
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      : isActive
                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      : "bg-muted text-muted-foreground border-border";
                    return (
                      <button
                        key={inv.id}
                        onClick={() => setSelectedInvitationId(inv.id)}
                        className="flex items-center justify-between px-4 py-3.5 bg-card border border-border hover:border-primary rounded-2xl transition-colors w-full text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-foreground truncate">{inv.email}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {inv.role} · {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${statusColor}`}>
                            {isExpired && !isActivated ? "EXPIRED" : inv.status}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <InvitePersonModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          onSuccess={fetchData}
        />
      )}
      {/* Detail Modals */}
      <CoCeoDetailModal
        isOpen={!!selectedCoCeoId}
        onClose={() => setSelectedCoCeoId(null)}
        personId={selectedCoCeoId}
      />
      <MemberDetailModal
        isOpen={!!selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
        personId={selectedMemberId}
      />
      <InvitationDetailModal
        isOpen={!!selectedInvitationId}
        onClose={() => {
          setSelectedInvitationId(null);
          fetchData(); // Refresh if cancelled/updated
        }}
        invitation={selectedInvitationId ? { id: selectedInvitationId } : null}
      />
    </div>
  );
}
