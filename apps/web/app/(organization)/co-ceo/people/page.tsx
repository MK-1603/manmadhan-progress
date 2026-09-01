"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, UserPlus, Search, AlertCircle, Plus, RefreshCw, ChevronRight, Mail, CheckCircle2
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import { DesktopInviteModal } from "@/components/organization/desktop-invite-modal";
import { MobileInviteSheet } from "@/components/organization/mobile-invite-sheet";
import { MobilePersonDetailsSheet } from "@/components/organization/mobile-person-sheets";

function getInitials(name?: string, email?: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

export default function COCEOPeoplePage() {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<"MEMBERS" | "INVITATIONS">("MEMBERS");
  
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

  const fetchTeamData = useCallback(async () => {
    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (!workspaceId) {
        setLoading(false);
        return;
      }

      const [membersRes, invitesRes] = await Promise.all([
        apiClient.get(`/organization/members?workspaceId=${workspaceId}`).catch(() => null),
        apiClient.get(`/organization/invitations?workspaceId=${workspaceId}`).catch(() => null),
      ]);

      if (membersRes?.data?.success) {
        // Filter: CO-CEO sees only Members (execution team)
        const allMembers = membersRes.data.data || [];
        const cleanMembers = allMembers.filter((m: any) => (m.role || "").toUpperCase() === "MEMBER");
        setMembers(cleanMembers);
      }

      if (invitesRes?.data?.success) {
        const allInvites = invitesRes.data.data || [];
        const cleanInvites = allInvites.filter((i: any) => (i.role || "").toUpperCase() === "MEMBER");
        setInvitations(cleanInvites);
      }

      setError("");
    } catch (err: any) {
      setError("Unable to load team members.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchTeamData();
  };

  useRegisterRefresh(fetchTeamData);

  useEffect(() => {
    if (!socket) return;
    socket.on("member.created", fetchTeamData);
    socket.on("invitation.created", fetchTeamData);
    return () => {
      socket.off("member.created", fetchTeamData);
      socket.off("invitation.created", fetchTeamData);
    };
  }, [socket, fetchTeamData]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (m.name || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q);
      return matchSearch;
    });
  }, [members, search]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#F9FAFB] dark:bg-[#060806] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none p-4 sm:p-5 md:px-8 md:py-4 pb-20 md:pb-4 max-w-[1600px] mx-auto space-y-3.5 box-border">
      
      {/* 1. PAGE HEADER — Title -> Description -> Action Row (Refresh + Add Member) */}
      <div className="flex flex-col gap-3 pb-3 border-b border-[#E5E7EB] dark:border-[#272D36] shrink-0">
        <div className="space-y-1 min-w-0">
          <h1 className="text-[20px] sm:text-[24px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
            People
          </h1>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
            Manage your assigned team and monitor member progress.
          </p>
        </div>

        {/* Action Row: Refresh (Left, Compact Square) + Add Member (Right, Flexible) */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-[44px] h-[44px] rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] flex items-center justify-center cursor-pointer hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors shrink-0 shadow-xs"
            title="Refresh people data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : "text-[#667085] dark:text-[#8B95A5]"}`} />
          </button>

          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex-1 sm:flex-none h-[44px] px-4 rounded-[12px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[13px] font-extrabold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12.5px] font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchTeamData} className="font-semibold underline cursor-pointer shrink-0 ml-2">
            Retry
          </button>
        </div>
      )}

      {/* 2. TAB SELECTION & SEARCH */}
      <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[14px] p-2.5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("MEMBERS")}
              className={`px-3.5 py-1.5 text-[13px] font-bold rounded-[8px] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "MEMBERS"
                  ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] shadow-xs"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              My Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab("INVITATIONS")}
              className={`px-3.5 py-1.5 text-[13px] font-bold rounded-[8px] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "INVITATIONS"
                  ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] shadow-xs"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              Pending Invites ({invitations.length})
            </button>
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#8B95A5]" />
            <input
              type="text"
              placeholder="Search member by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[36px] pl-9 pr-3 rounded-lg bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none placeholder-[#9CA3AF] dark:placeholder-[#667085]"
            />
          </div>
        </div>
      </div>

      {/* 3. MEMBERS TABLE / LIST */}
      <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs min-h-[360px] flex flex-col justify-between">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[#F8F9FA] dark:bg-[#07090D] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : activeTab === "MEMBERS" ? (
          filteredMembers.length === 0 ? (
            <div className="p-10 text-center space-y-2 my-auto">
              <Users className="w-10 h-10 text-[#667085] dark:text-[#8B95A5] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[#17202A] dark:text-[#F2F4F7]">No members assigned</h3>
              <p className="text-xs text-[#667085] dark:text-[#8B95A5]">Invite members to join your execution team.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
              {filteredMembers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedPerson(m)}
                  className="p-4 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#B28D18]/15 dark:bg-[#C9A52A]/15 border border-[#B28D18]/30 text-[#B28D18] dark:text-[#C9A52A] font-bold text-xs flex items-center justify-center">
                      {getInitials(m.name, m.email)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#17202A] dark:text-[#F2F4F7]">{m.name || "Member"}</p>
                      <p className="text-xs text-[#667085] dark:text-[#8B95A5]">{m.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-semibold text-[#B28D18] dark:text-[#C9A52A]">
                      {m.tasksCount || 3} Active Tasks
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          invitations.length === 0 ? (
            <div className="p-10 text-center space-y-2 my-auto">
              <Mail className="w-10 h-10 text-[#667085] dark:text-[#8B95A5] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[#17202A] dark:text-[#F2F4F7]">No pending invitations</h3>
              <p className="text-xs text-[#667085] dark:text-[#8B95A5]">Sent member invitations will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
              {invitations.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#17202A] dark:text-[#F2F4F7]">{inv.email}</p>
                    <p className="text-xs text-[#667085] dark:text-[#8B95A5]">Role: Member</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Invite Modal / Sheet */}
      <div className="hidden sm:block">
        <DesktopInviteModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          onSuccess={fetchTeamData}
          coCeos={[]}
        />
      </div>
      <div className="sm:hidden">
        <MobileInviteSheet
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          onSuccess={fetchTeamData}
          coCeos={[]}
        />
      </div>

      {/* Member Inspection Bottom Sheet */}
      {selectedPerson && (
        <MobilePersonDetailsSheet
          isOpen={!!selectedPerson}
          onClose={() => setSelectedPerson(null)}
          item={selectedPerson}
        />
      )}
    </div>
  );
}
