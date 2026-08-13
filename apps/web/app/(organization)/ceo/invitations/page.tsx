"use client";

import { useState, useEffect } from "react";
import { UserPlus, Loader2, AlertCircle, Plus, Search, ChevronRight, Shield } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { InvitePersonModal } from "@/components/organization/invite-person-modal";
import { InvitationDetailDrawer } from "@/components/organization/invitation-detail-drawer";

const lifecycleBadgeClass = (state: string) => {
  const s = state?.toUpperCase() ?? "";
  if (s === "ACTIVE")           return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (s === "PROFILE_COMPLETED" || s === "WORKSPACE_JOINED")
                                 return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  if (s === "ACCEPTED")          return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (s === "WAITING_ACCEPTANCE" || s === "PENDING")
                                 return "bg-muted text-muted-foreground border-border";
  if (s === "PROFILE_INCOMPLETE") return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  return "bg-muted text-muted-foreground border-border";
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
    const events = [
      "INVITATION_SENT",
      "INVITATION_SEND_FAILED",
      "INVITATION_UPDATED",
      "INVITATION_ACCEPTED",
      "INVITATION_DELETED",
    ];
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
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1280px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">ManMadhan · CEO</p>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none">Invitations</h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">
            Manage organization invitations and onboarding lifecycle.
          </p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-hover text-[#111827] text-[12px] font-bold rounded-xl transition-colors self-start"
        >
          <Plus className="w-3.5 h-3.5" /> Invite Person
        </button>
      </div>

      {/* Clickable Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        {[
          { label: "Total",            key: "All",               value: summary.totalCount || invitations.length },
          { label: "Waiting",          key: "WAITING_ACCEPTANCE", value: summary.waitingCount || 0 },
          { label: "Accepted",         key: "ACCEPTED",           value: summary.acceptedCount || 0 },
          { label: "Joined",           key: "WORKSPACE_JOINED",   value: summary.joinedCount || 0 },
          { label: "Profile Incomplete",key: "PROFILE_INCOMPLETE", value: summary.profileIncompleteCount || 0 },
          { label: "Active",           key: "ACTIVE",             value: summary.activeCount || 0 },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStatusFilter(s.key)}
            className={`bg-card border rounded-2xl p-3.5 text-left transition-colors ${
              statusFilter === s.key ? "border-gold" : "border-border hover:border-border/80"
            }`}
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{s.label}</p>
            <p className="text-[22px] font-bold text-foreground mt-1 leading-none">{s.value}</p>
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by email, name, or CO-CEO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-[12px] font-semibold text-foreground focus:outline-none focus:border-gold"
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
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-[12px] font-semibold text-foreground focus:outline-none focus:border-gold"
          >
            <option value="All">All Roles</option>
            <option value="MEMBER">Member</option>
            <option value="CO-CEO">CO-CEO</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* Invitation Rows */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center border border-border border-dashed rounded-2xl">
          <UserPlus className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-[13px] font-semibold text-foreground">No invitations found</p>
          <p className="text-[12px] text-muted-foreground max-w-sm">
            Invite a CO-CEO or Member to begin building your organization execution team.
          </p>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-hover text-[#111827] text-[12px] font-bold rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Invite Person
          </button>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden bg-card divide-y divide-border">
          {filtered.map((inv) => {
            const stateStr = inv.lifecycleState || inv.status;
            return (
              <button
                key={inv.id}
                type="button"
                onClick={() => setSelectedInvitation(inv)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors group"
              >
                {/* identity */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-muted border border-border text-foreground font-bold text-[12px] flex items-center justify-center shrink-0">
                    {(inv.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {inv.name || inv.email}
                      </p>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border shrink-0">
                        {inv.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                      <span>{inv.email}</span>
                      {inv.role === "MEMBER" && inv.assignedCoCeoName && (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" /> {inv.assignedCoCeoName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* status + date */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg border ${lifecycleBadgeClass(stateStr)}`}>
                    {stateStr.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-muted-foreground hidden sm:block">
                    {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </button>
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
