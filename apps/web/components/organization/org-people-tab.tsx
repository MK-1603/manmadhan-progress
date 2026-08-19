"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, UserPlus, Mail, Shield, ChevronRight, Search, RefreshCw, CheckCircle2,
  Clock, AlertCircle, XCircle, RotateCcw, ExternalLink
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";
import { InvitePersonModal } from "@/components/organization/invite-person-modal";

interface OrgPeopleTabProps {
  userRole: string;
  basePath?: string;
}

type PeopleSubView = "directory" | "invitations";

export function OrgPeopleTab({ userRole, basePath = "" }: OrgPeopleTabProps) {
  const [activeSubView, setActiveSubView] = useState<PeopleSubView>("directory");
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState("");

  const isLeadership = userRole === "CEO" || userRole === "CO-CEO";

  const loadPeopleData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.allSettled([
        apiClient.get("/users"),
        apiClient.get("/invitations"),
      ]);

      if (membersRes.status === "fulfilled" && membersRes.value.data?.success) {
        setMembers(membersRes.value.data.data || []);
      }
      if (invitesRes.status === "fulfilled" && invitesRes.value.data?.success) {
        setInvitations(invitesRes.value.data.data || []);
      }
    } catch (e) {
      console.error("Failed to load people data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeopleData();
  }, [loadPeopleData]);

  const handleResendInvite = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      const res = await apiClient.post(`/invitations/${invitationId}/resend`);
      if (res.data?.success) {
        setActionSuccess("Invitation resent successfully ✓");
        setTimeout(() => setActionSuccess(""), 4000);
      }
    } catch (e) {
      console.error("Failed to resend invitation:", e);
    } finally {
      setResendingId(null);
    }
  };

  const filteredMembers = members.filter((m) =>
    (m.name || m.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-5xl w-full mx-auto pb-12 font-sans">
      {/* Header & Sub-View Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#F4F7F5] tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" /> People & Directory
          </h2>
          <p className="text-xs text-[#9AA4B2] font-medium mt-0.5">
            Manage organization members and pending invitations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLeadership && (
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="h-9 px-3.5 rounded-lg bg-gold hover:bg-gold/90 text-black text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Person</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadPeopleData}
            disabled={loading}
            className="p-2 rounded-lg bg-[#0F1218] border border-white/10 text-[#9AA4B2] hover:text-[#F4F7F5] transition-colors cursor-pointer"
            title="Refresh directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-gold" : ""}`} />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {actionSuccess}
        </div>
      )}

      {/* Internal Sub-View Navigation Bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0F1218] border border-white/10 w-fit">
        <button
          type="button"
          onClick={() => setActiveSubView("directory")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubView === "directory"
              ? "bg-[#141820] text-[#F4F7F5] border border-white/10 shadow-xs"
              : "text-[#9AA4B2] hover:text-[#F4F7F5]"
          }`}
        >
          Directory ({members.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView("invitations")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubView === "invitations"
              ? "bg-[#141820] text-[#F4F7F5] border border-white/10 shadow-xs"
              : "text-[#9AA4B2] hover:text-[#F4F7F5]"
          }`}
        >
          <span>Invitations</span>
          {invitations.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-mono font-bold bg-gold/20 text-gold border border-gold/30">
              {invitations.length}
            </span>
          )}
        </button>
      </div>

      {/* 1. DIRECTORY SUB-VIEW */}
      {activeSubView === "directory" && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#667085] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members by name or email..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0B0E13] border border-white/10 text-xs text-[#F4F7F5] placeholder:text-[#667085] focus:outline-none focus:border-gold"
            />
          </div>

          <PremiumCard className="p-0 bg-[#0F1218] border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-[#0B0E13] text-[10px] font-mono text-[#667085] uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-bold">Member</th>
                    <th className="py-2.5 px-4 font-bold">Role</th>
                    <th className="py-2.5 px-4 font-bold">Reporting Line</th>
                    <th className="py-2.5 px-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-[#F4F7F5]">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-[#141820]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gold/15 text-gold font-bold text-xs flex items-center justify-center border border-gold/30 shrink-0">
                              {member.name ? member.name.charAt(0).toUpperCase() : "M"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[#F4F7F5] truncate">{member.name || "Organization Member"}</p>
                              <p className="text-[10.5px] text-[#9AA4B2] font-mono truncate">{member.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              member.role === "CEO" || member.role === "SYSTEM_OWNER"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : member.role === "CO-CEO" || member.role === "ADMIN"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}
                          >
                            {member.role || "MEMBER"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-[11px] text-[#9AA4B2] font-mono">
                          {member.role === "CEO"
                            ? "— (Organization Head)"
                            : member.role === "CO-CEO"
                            ? "Reports to CEO"
                            : "Reports to CO-CEO"}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-[#9AA4B2] font-medium">
                        No members found in directory.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PremiumCard>
        </div>
      )}



      {/* 3. INVITATIONS SUB-VIEW */}
      {activeSubView === "invitations" && (
        <PremiumCard className="p-4 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
          <div className="border-b border-white/10 pb-2.5 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gold" /> Pending & Historical Invitations
              </h3>
              <p className="text-[11px] text-[#9AA4B2] font-medium mt-0.5">
                Track pending organization invitation dispatches and status.
              </p>
            </div>

            {isLeadership && (
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="h-8 px-3 rounded-lg bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Member</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {invitations.length > 0 ? (
              invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0B0E13] border border-white/10 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F4F7F5] truncate">{inv.email}</span>
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-gold/10 text-gold border border-gold/20">
                        {inv.role || "CO-CEO"}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[#9AA4B2] font-mono">
                      Sent: {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "Recent"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Pending Review
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResendInvite(inv.id)}
                      disabled={resendingId === inv.id}
                      className="p-1.5 rounded-lg bg-[#141820] border border-white/10 text-[#9AA4B2] hover:text-[#F4F7F5] transition-colors cursor-pointer"
                      title="Resend email"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${resendingId === inv.id ? "animate-spin text-gold" : ""}`} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#9AA4B2] font-medium">
                No active pending invitations. Click <span className="font-bold text-[#F4F7F5]">Invite Person</span> above to invite team members.
              </div>
            )}
          </div>
        </PremiumCard>
      )}

      {/* Invite Person Modal */}
      {showInviteModal && (
        <InvitePersonModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            loadPeopleData();
          }}
        />
      )}
    </div>
  );
}
