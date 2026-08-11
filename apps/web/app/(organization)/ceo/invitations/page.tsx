"use client";

import { useState, useEffect } from "react";
import { UserPlus, Loader2, AlertCircle, Plus, Search, ChevronRight, Shield, CheckCircle2, RotateCcw, Ban } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import { InvitePersonModal } from "@/components/organization/invite-person-modal";
import { InvitationDetailDrawer } from "@/components/organization/invitation-detail-drawer";

const lifecycleBadgeClass = (state: string) => {
  switch (state) {
    case "ACTIVE": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "PROFILE_COMPLETED": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "PROFILE_INCOMPLETE": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "WORKSPACE_JOINED": return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    case "ACCEPTED": return "bg-teal-500/10 text-teal-500 border-teal-500/20";
    case "WAITING_ACCEPTANCE": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "PENDING": return "bg-sky-500/10 text-sky-500 border-sky-500/20";
    case "DRAFT": return "bg-muted text-muted-foreground border-border";
    default: return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  }
};

export default function CEOInvitationsPage() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalCount: 0,
    draftCount: 0,
    pendingCount: 0,
    waitingCount: 0,
    acceptedCount: 0,
    joinedCount: 0,
    profileIncompleteCount: 0,
    activeCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [actionLoading, setActionLoading] = useState(false);

  const { socket } = useSocket();

  const fetchInvitations = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/invitations?workspaceId=${workspaceId}`);
      if (res.data.success) {
        setInvitations(res.data.data || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch {
      setError("Unable to load invitations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const events = ["INVITATION_SENT", "INVITATION_UPDATED", "INVITATION_ACCEPTED", "INVITATION_DELETED"];
    events.forEach(e => socket.on(e, fetchInvitations));
    return () => events.forEach(e => socket.off(e));
  }, [socket]);

  const handleResend = async (id: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/invitations/${id}/resend`);
      fetchInvitations();
    } catch {
      setError("Failed to resend invitation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/invitations/${id}/revoke`);
      fetchInvitations();
      setSelectedInvitation(null);
    } catch {
      setError("Failed to revoke invitation");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = invitations.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch =
      (inv.email || "").toLowerCase().includes(q) ||
      (inv.name || "").toLowerCase().includes(q) ||
      (inv.assignedCoCeoName || "").toLowerCase().includes(q);

    const stateStr = inv.lifecycleState || inv.status;
    const matchStatus = statusFilter === "All" || stateStr === statusFilter;
    const matchRole = roleFilter === "All" || inv.role === roleFilter;

    return matchSearch && matchStatus && matchRole;
  });

  return (
    <div className="p-4 lg:p-6 max-w-[1280px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Invitations</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage organization invitations and onboarding lifecycle
          </p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" /> Invite Person
        </button>
      </div>

      {/* Clickable Executive Summary Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        {[
          { label: "Total", key: "All", value: summary.totalCount || invitations.length, color: "text-foreground" },
          { label: "Waiting", key: "WAITING_ACCEPTANCE", value: summary.waitingCount || 0, color: "text-purple-400" },
          { label: "Accepted", key: "ACCEPTED", value: summary.acceptedCount || 0, color: "text-teal-400" },
          { label: "Joined Workspace", key: "WORKSPACE_JOINED", value: summary.joinedCount || 0, color: "text-indigo-400" },
          { label: "Profile Incomplete", key: "PROFILE_INCOMPLETE", value: summary.profileIncompleteCount || 0, color: "text-amber-500" },
          { label: "Active Member", key: "ACTIVE", value: summary.activeCount || 0, color: "text-emerald-500" },
        ].map((s) => (
          <PremiumCard
            key={s.label}
            onClick={() => setStatusFilter(s.key)}
            className={`p-2.5 cursor-pointer transition-all ${
              statusFilter === s.key ? "border-primary bg-primary/5" : "hover:border-border"
            }`}
          >
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </PremiumCard>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invitations by email, name, or CO-CEO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-xl text-xs font-semibold text-foreground focus:border-primary outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="WAITING_ACCEPTANCE">Waiting</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="WORKSPACE_JOINED">Joined</option>
            <option value="PROFILE_INCOMPLETE">Incomplete Profile</option>
            <option value="ACTIVE">Active</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-xl text-xs font-semibold text-foreground focus:border-primary outline-none"
          >
            <option value="All">All Roles</option>
            <option value="MEMBER">Member</option>
            <option value="CO-CEO">CO-CEO</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Full-Width Invitation Card Rows */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 p-6 border border-border rounded-2xl bg-card space-y-3">
          <UserPlus className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-bold text-foreground">No invitations found</p>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            Invite a CO-CEO or Member to begin building your organization execution team.
          </p>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
          >
            <Plus className="w-4 h-4" /> Invite Person
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((inv) => {
            const stateStr = inv.lifecycleState || inv.status;

            return (
              <PremiumCard
                key={inv.id}
                onClick={() => setSelectedInvitation(inv)}
                className="p-3.5 hover:border-primary/40 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left Identity Context */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {inv.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {inv.name || inv.email}
                        </p>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {inv.role}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        <span>{inv.email}</span>
                        {inv.role === "MEMBER" && (
                          <span className="text-purple-400 font-semibold flex items-center gap-1">
                            <Shield className="w-3 h-3" /> CO-CEO: {inv.assignedCoCeoName || "CEO Direct"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Status & Date Context */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${lifecycleBadgeClass(stateStr)}`}>
                      {stateStr.replace(/_/g, " ")}
                    </span>

                    <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline-block">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "Recent"}
                    </span>

                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </PremiumCard>
            );
          })}
        </div>
      )}

      {/* Invite Person Dialog Modal */}
      <InvitePersonModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={fetchInvitations}
      />

      {/* Invitation Detail Slide-Over Drawer */}
      <InvitationDetailDrawer
        invitation={selectedInvitation}
        onClose={() => setSelectedInvitation(null)}
        onResend={handleResend}
        onRevoke={handleRevoke}
        actionLoading={actionLoading}
      />
    </div>
  );
}
