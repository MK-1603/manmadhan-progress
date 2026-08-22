"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Users, UserPlus, Search, AlertCircle, Plus, MoreHorizontal, MoreVertical, Mail, CheckCircle2,
  RefreshCw, Trash2, Copy, Check, ChevronDown, ChevronUp, ShieldAlert, UserX, MessageSquare, Loader2, Send, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import { DesktopInviteModal } from "@/components/organization/desktop-invite-modal";
import { MobileInviteSheet } from "@/components/organization/mobile-invite-sheet";
import { MobilePersonActionSheet, MobilePersonDetailsSheet } from "@/components/organization/mobile-person-sheets";
import { ConfirmActionModal } from "@/components/organization/people-action-modals";
import { PersonDetailDrawer } from "@/components/organization/person-detail-drawer";
import { InvitationDetailModal } from "@/components/organization/invitation-detail-modal";
import { Invite3dObject } from "@/components/organization/invite-3d-object";

function ActionMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={ref} className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] hover:bg-[#F8F9FA] dark:hover:bg-[#111419] transition-colors cursor-pointer outline-none text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="absolute right-0 mt-1 w-48 rounded-xl bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] shadow-xl z-50 p-1 text-[12px] text-[#17202A] dark:text-[#F2F4F7] space-y-0.5"
        >
          {children}
        </div>
      )}
    </div>
  );
}

type TabType = "ALL" | "CO-CEO" | "MEMBER" | "INVITATIONS";

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

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function fmtFullDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return String(dateStr);
  }
}

export default function CEOPeoplePage() {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  
  // Data states
  const [members, setMembers] = useState<any[]>([]);
  const [coCeos, setCoCeos] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Desktop Inline Expanded Row State (Only ONE invitation or person row expanded at a time)
  const [expandedInviteId, setExpandedInviteId] = useState<string | null>(null);
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Invite Modals / Sheets
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Embedded Left Form State (Desktop)
  const [leftFormEmail, setLeftFormEmail] = useState("");
  const [leftFormBatchId, setLeftFormBatchId] = useState("");
  const [leftFormRole, setLeftFormRole] = useState<"CO-CEO" | "MEMBER">("MEMBER");
  const [leftFormManagerId, setLeftFormManagerId] = useState("");
  const [leftFormSubmitting, setLeftFormSubmitting] = useState(false);
  const [leftFormError, setLeftFormError] = useState("");
  const [leftFormSuccess, setLeftFormSuccess] = useState("");

  // Confirmation Modals State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "SUSPEND" | "RESTORE" | "REMOVE" | "CANCEL_INVITE";
    targetItem: any;
  }>({
    isOpen: false,
    type: "SUSPEND",
    targetItem: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Selected Person Drawer & Mobile Invitation Detail Modal States
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<any | null>(null);

  // Mobile Sheet States
  const [mobileActionState, setMobileActionState] = useState<{
    isOpen: boolean;
    item: any;
    type: "ACTIVE" | "SUSPENDED" | "PENDING";
  }>({
    isOpen: false,
    item: null,
    type: "ACTIVE",
  });

  // Role switching handler for embedded left form
  const handleLeftRoleSwitch = (newRole: "CO-CEO" | "MEMBER") => {
    setLeftFormRole(newRole);
    setLeftFormError("");
    if (newRole === "CO-CEO") {
      setLeftFormManagerId("");
    }
  };

  // Fetch organization people data & invitations
  const fetchData = useCallback(async () => {
    try {
      let workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
        const wsRes = await apiClient.get("/workspaces/current").catch(() => null);
        if (wsRes?.data?.data?.id) {
          workspaceId = String(wsRes.data.data.id);
          localStorage.setItem("workspaceId", workspaceId);
        } else {
          const allWsRes = await apiClient.get("/workspaces").catch(() => null);
          const firstWs = allWsRes?.data?.data?.[0]?.id || allWsRes?.data?.[0]?.id;
          if (firstWs) {
            workspaceId = String(firstWs);
            localStorage.setItem("workspaceId", workspaceId);
          }
        }
      }

      if (!workspaceId) {
        setLoading(false);
        return;
      }
      
      const wsParam = `?workspaceId=${workspaceId}`;

      const [membersRes, coCeosRes, invRes] = await Promise.all([
        apiClient.get(`/organization/members${wsParam}`).catch(() => null),
        apiClient.get(`/organization/co-ceos${wsParam}`).catch(() => null),
        apiClient.get(`/invitations${wsParam}`).catch(() => null),
      ]);

      if (membersRes?.data?.success) setMembers(membersRes.data.data || []);
      if (coCeosRes?.data?.success) setCoCeos(coCeosRes.data.data || []);
      if (invRes?.data?.success) {
        const serverInvs: any[] = invRes.data.data || [];
        // Merge: keep any optimistic entries (temp IDs) not yet confirmed by server
        setInvitations((prev) => {
          const serverIds = new Set(serverInvs.map((i: any) => i.id));
          const serverEmails = new Set(serverInvs.map((i: any) => (i.email || "").toLowerCase()));
          // Preserve optimistic entries that aren't in the server response yet
          const optimisticOnly = prev.filter(
            (p) => !serverIds.has(p.id) && !serverEmails.has((p.email || "").toLowerCase())
          );
          return [...serverInvs, ...optimisticOnly];
        });
      }

      setError("");
    } catch {
      setError("Unable to load team members.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchData();
  };

  useRegisterRefresh(fetchData);

  useEffect(() => {
    if (!socket) return;
    socket.on("member.invited", fetchData);
    socket.on("member.removed", fetchData);
    socket.on("member.updated", fetchData);
    socket.on("invitation.updated", fetchData);
    socket.on("INVITATION_SENT", fetchData);
    socket.on("INVITATION_SEND_FAILED", fetchData);
    return () => {
      socket.off("member.invited", fetchData);
      socket.off("member.removed", fetchData);
      socket.off("member.updated", fetchData);
      socket.off("invitation.updated", fetchData);
      socket.off("INVITATION_SENT", fetchData);
      socket.off("INVITATION_SEND_FAILED", fetchData);
    };
  }, [socket, fetchData]);

  // Handle Immediate Invitation Creation Success
  const handleSuccessInvitation = (newInv?: any) => {
    if (newInv && (newInv.id || newInv.email)) {
      const normalizedInv = {
        ...newInv,
        id: newInv.id || `inv_${Date.now()}`,
        status: newInv.status || "Sent",
      };

      // Optimistic UI update — add or merge into the list immediately
      setInvitations((prev) => {
        const exists = prev.some(
          (inv) =>
            inv.id === normalizedInv.id ||
            (inv.email &&
              normalizedInv.email &&
              inv.email.toLowerCase() === normalizedInv.email.toLowerCase())
        );
        if (exists) {
          return prev.map((inv) =>
            inv.id === normalizedInv.id ||
            (inv.email &&
              normalizedInv.email &&
              inv.email.toLowerCase() === normalizedInv.email.toLowerCase())
              ? { ...inv, ...normalizedInv }
              : inv
          );
        }
        return [normalizedInv, ...prev];
      });
      setActiveTab("INVITATIONS");
      setExpandedInviteId(normalizedInv.id);

      // Delay the server refresh so the DB write has fully committed before
      // we replace the optimistic entry. Without this delay the fetchData()
      // can return a snapshot that doesn't yet contain the new invite,
      // making it disappear from the UI immediately after creation.
      setTimeout(() => {
        fetchData();
      }, 1500);
    } else {
      // No new invite data — just refresh normally
      fetchData();
    }
  };

  // Handle Copy Link
  const handleCopyLink = (inv: any) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/invite/${inv.token || inv.id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Handle WhatsApp Share
  const handleWhatsAppShare = (inv: any) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/invite/${inv.token || inv.id}`;
    const roleText = (inv.role || "").toUpperCase().includes("CO") ? "CO-CEO" : "Member";

    const msg = `Hello,\n\nYou've been invited to join ManMadhan Progress.\n\nOrganization: ManMadhan\nRole: ${roleText}\n\nPlease use the invitation link below to join:\n${inviteUrl}\n\nWe're looking forward to having you on the team.\n\n— ManMadhan Progress`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Handle Resend Invitation API
  const handleResendInvitation = async (inv: any) => {
    setResendingId(inv.id);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/invitations/${inv.id}/resend`, { workspaceId });
      if (res.data?.success) {
        await fetchData();
      } else {
        alert(res.data?.error || "Failed to resend invitation.");
      }
    } catch {
      alert("Unable to resend invitation. Please try again.");
    } finally {
      setResendingId(null);
    }
  };

  // Combined Active People List
  const allPeopleList = useMemo(() => {
    const map = new Map<string, any>();

    coCeos.forEach((c) => {
      const id = c.id || c.userId || c.email;
      map.set(id, {
        id,
        name: c.displayName || c.name || c.user?.name || "CO-CEO",
        email: c.email || c.user?.email || "—",
        batchId: c.batchId || c.employeeId || "—",
        role: "CO-CEO",
        status: c.status || "ACTIVE",
        supervisor: "CEO / Organization Head",
        progress: c.progress || c.taskProgress || 92,
        lastActive: c.lastActive || c.updatedAt || c.createdAt,
        createdAt: c.createdAt,
        raw: c,
      });
    });

    members.forEach((m) => {
      const id = m.id || m.userId || m.email;
      if (!map.has(id)) {
        const isCoCeo = (m.role || "").toUpperCase().includes("CO");
        map.set(id, {
          id,
          name: m.displayName || m.name || m.user?.name || "Member",
          email: m.email || m.user?.email || "—",
          batchId: m.batchId || m.employeeId || "—",
          role: isCoCeo ? "CO-CEO" : "MEMBER",
          status: m.status || "ACTIVE",
          supervisor: m.managerName || m.supervisor || (isCoCeo ? "CEO / Organization Head" : "Direct under CEO"),
          progress: m.progress || m.taskProgress || 84,
          lastActive: m.lastActive || m.updatedAt || m.createdAt,
          createdAt: m.createdAt,
          raw: m,
        });
      }
    });

    return Array.from(map.values());
  }, [coCeos, members]);

  // Filter Active People
  const filteredPeople = useMemo(() => {
    return allPeopleList.filter((p) => {
      const s = search.toLowerCase();
      const matchSearch =
        (p.name || "").toLowerCase().includes(s) ||
        (p.email || "").toLowerCase().includes(s) ||
        (p.batchId || "").toLowerCase().includes(s) ||
        (p.id || "").toLowerCase().includes(s);

      const matchTab =
        activeTab === "ALL"
          ? true
          : activeTab === "CO-CEO"
          ? (p.role || "").toUpperCase().includes("CO")
          : activeTab === "MEMBER"
          ? (p.role || "").toUpperCase() === "MEMBER"
          : false;

      const matchRoleFilter =
        roleFilter === "All" ||
        (roleFilter === "CO-CEO" && (p.role || "").toUpperCase().includes("CO")) ||
        (roleFilter === "Member" && (p.role || "").toUpperCase() === "MEMBER");

      const matchStatusFilter =
        statusFilter === "All" ||
        (p.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchTab && matchRoleFilter && matchStatusFilter;
    });
  }, [allPeopleList, search, activeTab, roleFilter, statusFilter]);

  // Filter Invitations
  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      const s = search.toLowerCase();
      const email = inv.email || inv.recipientEmail || "";
      const matchSearch =
        email.toLowerCase().includes(s) ||
        (inv.batchNumber || inv.employeeId || inv.batchId || "").toLowerCase().includes(s) ||
        (inv.role || "").toLowerCase().includes(s);

      const invRoleClean = (inv.role || "").toUpperCase().replace(/[-_]/g, "");
      const filterRoleClean = roleFilter.toUpperCase().replace(/[-_]/g, "");
      const matchRoleFilter =
        roleFilter === "All" ||
        invRoleClean === filterRoleClean ||
        (roleFilter === "CO-CEO" && invRoleClean.includes("CO")) ||
        (roleFilter === "Member" && invRoleClean === "MEMBER");

      const invStatus = (inv.status || "").toLowerCase();
      const matchStatusFilter =
        statusFilter === "All" ||
        (statusFilter === "Pending" &&
          (invStatus === "pending" ||
            invStatus === "sent" ||
            invStatus === "sending" ||
            invStatus === "delivered" ||
            invStatus === "opened" ||
            invStatus === "viewed" ||
            invStatus === "resent" ||
            invStatus === "email failed")) ||
        invStatus === statusFilter.toLowerCase();

      return matchSearch && matchRoleFilter && matchStatusFilter;
    });
  }, [invitations, search, roleFilter, statusFilter]);

  // Handle Embedded Quick Invite Form Submit (Desktop Left Panel)
  const handleLeftFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leftFormEmail.trim()) {
      setLeftFormError("Recipient email address is required.");
      return;
    }

    if (leftFormRole === "MEMBER" && coCeos.length > 0 && !leftFormManagerId) {
      setLeftFormError("Select a CO-CEO supervisor for this member.");
      return;
    }

    setLeftFormSubmitting(true);
    setLeftFormError("");
    setLeftFormSuccess("");

    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post("/invitations/send", {
        workspaceId,
        email: leftFormEmail.trim(),
        role: leftFormRole,
        batchNumber: leftFormBatchId.trim() || undefined,
        managerId: leftFormRole === "MEMBER" && leftFormManagerId ? leftFormManagerId : undefined,
      });

      if (res.data?.success) {
        setLeftFormSuccess("✓ Invitation sent");
        setLeftFormEmail("");
        setLeftFormBatchId("");
        setLeftFormManagerId("");
        const newInv = res.data.data;
        handleSuccessInvitation(newInv);
        setTimeout(() => setLeftFormSuccess(""), 2500);
      } else {
        setLeftFormError(res.data?.error || "Unable to send invitation. Please try again.");
      }
    } catch (err: any) {
      setLeftFormError(err.response?.data?.error || "Unable to send invitation. Please try again.");
    } finally {
      setLeftFormSubmitting(false);
    }
  };

  const [actionError, setActionError] = useState<string | null>(null);

  // Confirmation Modal Actions
  const handleExecuteAction = async () => {
    if (!confirmModal.targetItem) return;
    setActionLoading(true);
    setActionError(null);
    const { type, targetItem } = confirmModal;
    const workspaceId = localStorage.getItem("workspaceId");

    try {
      if (type === "SUSPEND") {
        await apiClient.post(`/organization/members/${targetItem.id}/suspend`, { workspaceId });
      } else if (type === "RESTORE") {
        await apiClient.post(`/organization/members/${targetItem.id}/restore`, { workspaceId });
      } else if (type === "REMOVE") {
        await apiClient.delete(`/organization/members/${targetItem.id}?workspaceId=${workspaceId}`);
        setMembers((prev) => prev.filter((m) => m.id !== targetItem.id && m.userId !== targetItem.id));
        setCoCeos((prev) => prev.filter((c) => c.id !== targetItem.id && c.userId !== targetItem.id));
        setInvitations((prev) => prev.filter((i) => i.id !== targetItem.id));
      } else if (type === "CANCEL_INVITE") {
        await apiClient.delete(`/invitations/${targetItem.id}?workspaceId=${workspaceId}`);
        setInvitations((prev) => prev.filter((i) => i.id !== targetItem.id));
        setMembers((prev) => prev.filter((m) => m.id !== targetItem.id));
        setCoCeos((prev) => prev.filter((c) => c.id !== targetItem.id));
      }
      await fetchData();
      setConfirmModal({ isOpen: false, type: "SUSPEND", targetItem: null });
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to complete this action. Please try again.";
      setActionError(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-y-auto sm:overflow-hidden bg-[#F9FAFB] dark:bg-[#060806] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none p-4 sm:p-5 md:px-8 md:py-4 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-4 max-w-[1600px] mx-auto space-y-3.5 box-border [scrollbar-width:none]">
      
      {/* 1. COMPACT PAGE HEADER — Invite Button & Refresh Button in the SAME LINE (44px Height) */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#E5E7EB] dark:border-[#272D36] shrink-0">
        <div className="space-y-0.5 min-w-0">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none truncate">
            People
          </h1>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] truncate">
            Manage your organization team.
          </p>
        </div>

        {/* Top-Right Header Actions (Vertically Aligned 44px Buttons) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="md:hidden h-[44px] px-3.5 rounded-[12px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[13px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Invite</span>
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-[44px] sm:w-auto h-[44px] px-0 sm:px-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[12.5px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors shrink-0 shadow-xs"
            title="Refresh people data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : "text-[#667085] dark:text-[#8B95A5]"}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12px] font-medium flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchData} className="font-semibold underline cursor-pointer shrink-0 ml-2">
            Retry
          </button>
        </div>
      )}

      {/* 2. MAIN PEOPLE WORKSPACE */}
      <div className="flex-1 min-h-0 w-full flex flex-col md:flex-row gap-4 overflow-hidden">
        
        {/* DESKTOP LEFT COLUMN: EMBEDDED QUICK INVITATION FORM PANEL */}
        <div className="hidden md:flex flex-col justify-between w-[320px] lg:w-[340px] h-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[18px] p-4 shrink-0 shadow-xs overflow-hidden">
          
          {/* Top Form Area */}
          <div className="space-y-3">
            <div className="space-y-1 pb-2 border-b border-[#E5E7EB] dark:border-[#272D36]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />
                <h2 className="font-bold text-[15px] text-[#17202A] dark:text-[#F2F4F7]">Invite people</h2>
              </div>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] leading-snug">
                Add a CO-CEO or Member to your organization.
              </p>
            </div>

            {leftFormSuccess && (
              <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11.5px] font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{leftFormSuccess}</span>
              </div>
            )}

            {leftFormError && (
              <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11.5px] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{leftFormError}</span>
              </div>
            )}

            <form onSubmit={handleLeftFormSubmit} className="space-y-2.5 text-[12px]">
              {/* Email */}
              <div className="space-y-1">
                <label className="font-bold text-[#17202A] dark:text-[#F2F4F7] block text-[11.5px]">
                  Email address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={leftFormEmail}
                  onChange={(e) => {
                    setLeftFormEmail(e.target.value);
                    if (leftFormError) setLeftFormError("");
                  }}
                  className="w-full h-[40px] px-3 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A]"
                />
              </div>

              {/* Batch ID */}
              <div className="space-y-1">
                <label className="font-bold text-[#17202A] dark:text-[#F2F4F7] block text-[11.5px]">
                  Employee / Batch ID <span className="text-[#667085] dark:text-[#8B95A5] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MM1107"
                  maxLength={6}
                  value={leftFormBatchId}
                  onChange={(e) => {
                    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    const letters = raw.replace(/[^A-Z]/g, "").slice(0, 2);
                    const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
                    setLeftFormBatchId(letters + digits);
                  }}
                  className="w-full h-[40px] px-3 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A] font-mono tracking-widest uppercase"
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="font-bold text-[#17202A] dark:text-[#F2F4F7] block text-[11.5px]">Organization role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLeftRoleSwitch("MEMBER")}
                    className={`h-[38px] rounded-[10px] font-bold text-[11.5px] border transition-colors cursor-pointer ${
                      leftFormRole === "MEMBER"
                        ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] border-transparent shadow-xs"
                        : "bg-[#F8F9FA] dark:bg-[#07090D] text-[#667085] dark:text-[#8B95A5] border-[#E5E7EB] dark:border-[#272D36]"
                    }`}
                  >
                    Member
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLeftRoleSwitch("CO-CEO")}
                    className={`h-[38px] rounded-[10px] font-bold text-[11.5px] border transition-colors cursor-pointer ${
                      leftFormRole === "CO-CEO"
                        ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] border-transparent shadow-xs"
                        : "bg-[#F8F9FA] dark:bg-[#07090D] text-[#667085] dark:text-[#8B95A5] border-[#E5E7EB] dark:border-[#272D36]"
                    }`}
                  >
                    CO-CEO
                  </button>
                </div>
              </div>

              {/* Assigned Supervisor Selector (If MEMBER) */}
              {leftFormRole === "MEMBER" ? (
                <div className="space-y-1">
                  <label className="font-bold text-[#17202A] dark:text-[#F2F4F7] block text-[11.5px]">
                    Assigned CO-CEO <span className="text-rose-500">*</span>
                  </label>
                  {coCeos.length > 0 ? (
                    <select
                      value={leftFormManagerId}
                      onChange={(e) => {
                        setLeftFormManagerId(e.target.value);
                        if (leftFormError) setLeftFormError("");
                      }}
                      className="w-full h-[40px] px-2.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[#17202A] dark:text-[#F2F4F7] font-semibold outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A] cursor-pointer"
                    >
                      <option value="">Select CO-CEO supervisor...</option>
                      {coCeos.map((c) => (
                        <option key={c.id || c.userId} value={c.id || c.userId}>
                          {c.displayName || c.name || c.user?.name || c.email} (CO-CEO)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11.5px] font-bold leading-relaxed">
                      Add a CO-CEO before inviting a Member.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] space-y-0.5">
                  <span className="text-[#667085] dark:text-[#8B95A5] font-semibold block text-[10.5px]">Reports to</span>
                  <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">CEO / Organization Head</span>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  leftFormSubmitting ||
                  Boolean(leftFormSuccess) ||
                  (leftFormRole === "MEMBER" && (coCeos.length === 0 || !leftFormManagerId))
                }
                className="w-full h-[42px] rounded-[10px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] font-extrabold text-[12.5px] flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2.5px_0_0_#8c6e11] dark:shadow-[0_2.5px_0_0_#a3841e] hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_#8c6e11] dark:hover:shadow-[0_4px_0_0_#a3841e] active:translate-y-0.5 active:shadow-[0_0.5px_0_0_#8c6e11] dark:active:shadow-[0_0.5px_0_0_#a3841e] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0 mt-1"
              >
                {leftFormSubmitting ? (
                  <>
                    <span>Sending...</span>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  </>
                ) : leftFormSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white dark:text-[#0B0D10] shrink-0" />
                    <span>✓ Invitation sent</span>
                  </>
                ) : (
                  <>
                    <span>Send invitation</span>
                    <Send className="w-3.5 h-3.5 shrink-0" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Portion: 3D Invitation Visual */}
          <div className="pt-3">
            <Invite3dObject />
          </div>
        </div>

        {/* RIGHT COLUMN: PEOPLE DIRECTORY WORKSPACE */}
        <div className="flex-1 min-h-0 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[18px] overflow-hidden flex flex-col justify-between shadow-xs">
          
          {/* Filter Toolbar */}
          <div className="p-3.5 sm:p-4 border-b border-[#E5E7EB] dark:border-[#272D36] space-y-3 shrink-0 bg-[#F8F9FA]/50 dark:bg-[#07090D]/50">
            
            {/* Mobile View Tab Selector (44px High-Contrast Dropdown Select with Gold Active Border) */}
            <div className="sm:hidden w-full">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as TabType)}
                className="w-full h-[44px] px-3.5 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#B28D18] dark:border-[#C9A52A] rounded-[12px] text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] outline-none focus:ring-1 focus:ring-[#B28D18] shadow-xs cursor-pointer"
              >
                <option value="ALL">All People ({allPeopleList.length})</option>
                <option value="INVITATIONS">Invitations ({invitations.length})</option>
                <option value="CO-CEO">CO-CEOs ({allPeopleList.filter((p) => (p.role || "").toUpperCase().includes("CO")).length})</option>
                <option value="MEMBER">Members ({allPeopleList.filter((p) => (p.role || "").toUpperCase() === "MEMBER").length})</option>
              </select>
            </div>

            {/* Desktop Horizontal Tabs Row */}
            <div className="hidden sm:flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-3 py-1.5 text-[12px] font-bold rounded-[8px] transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "ALL"
                    ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] shadow-xs"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                All People ({allPeopleList.length})
              </button>

              <button
                onClick={() => setActiveTab("INVITATIONS")}
                className={`px-3 py-1.5 text-[12px] font-bold rounded-[8px] transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "INVITATIONS"
                    ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] shadow-xs"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                Invitations ({invitations.length})
              </button>

              <button
                onClick={() => setActiveTab("CO-CEO")}
                className={`px-3 py-1.5 text-[12px] font-bold rounded-[8px] transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "CO-CEO"
                    ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] shadow-xs"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                CO-CEOs ({allPeopleList.filter((p) => (p.role || "").toUpperCase().includes("CO")).length})
              </button>

              <button
                onClick={() => setActiveTab("MEMBER")}
                className={`px-3 py-1.5 text-[12px] font-bold rounded-[8px] transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "MEMBER"
                    ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] shadow-xs"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                Members ({allPeopleList.filter((p) => (p.role || "").toUpperCase() === "MEMBER").length})
              </button>
            </div>

            {/* Search & Filter Controls (44px Heights) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#8B95A5]" />
                <input
                  type="text"
                  placeholder="Search people by name, email, batch ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3.5 h-[44px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[12px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 w-full sm:flex sm:w-auto shrink-0">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full sm:w-auto h-[44px] px-3 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[12px] text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A] cursor-pointer"
                >
                  <option value="All">Role: All</option>
                  <option value="CO-CEO">CO-CEO</option>
                  <option value="Member">Member</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto h-[44px] px-3 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[12px] text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A] cursor-pointer"
                >
                  <option value="All">Status: All</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Directory Content Area */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            
            {/* VIEW A: INVITATIONS TAB */}
            {activeTab === "INVITATIONS" ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {loading ? (
                  <div className="p-4 space-y-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-[#F8F9FA] dark:bg-[#07090D] rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredInvitations.length === 0 ? (
                  /* Compact Mobile Empty State (Reduced Height) */
                  <div className="p-5 sm:p-8 text-center flex flex-col items-center justify-center space-y-2.5 my-3 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[18px] mx-3 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 flex items-center justify-center text-[#B28D18] dark:text-[#C9A52A] mx-auto">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 max-w-xs mx-auto">
                      <h3 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                        {search || roleFilter !== "All" || statusFilter !== "All" ? "No matching invitations" : "No pending invitations"}
                      </h3>
                      <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                        {search || roleFilter !== "All" || statusFilter !== "All"
                          ? "Try adjusting your search query or filters."
                          : "Invite a CO-CEO or Member to begin building your organization."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop Enterprise Sticky Table Header & Inline Expanded Rows */}
                    <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">
                      <div className="bg-[#F8F9FA] dark:bg-[#111419] border-b border-[#E5E7EB] dark:border-[#272D36] text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em] grid grid-cols-12 px-5 py-2.5 shrink-0 sticky top-0 z-10">
                        <div className="col-span-3">PERSON</div>
                        <div className="col-span-2">EMPLOYEE ID</div>
                        <div className="col-span-2">ROLE</div>
                        <div className="col-span-2">ASSIGNED CO-CEO</div>
                        <div className="col-span-1">STATUS</div>
                        <div className="col-span-2 text-right">ACTIONS</div>
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-[#272D36] [scrollbar-width:thin]">
                        {filteredInvitations.map((inv) => {
                          const isCo = (inv.role || "").toUpperCase().includes("CO");
                          const coCeoText = isCo
                            ? "—"
                            : inv.assignedCoCeoName
                            ? `${inv.assignedCoCeoName} (CO-CEO)`
                            : inv.assignedCoCeoEmail || inv.managerId || "Direct under CEO";

                          const isExpanded = expandedInviteId === inv.id;

                          return (
                            <div key={inv.id} className="flex flex-col">
                              {/* Main Primary Row */}
                              <div
                                onClick={() => setExpandedInviteId(isExpanded ? null : inv.id)}
                                className={`grid grid-cols-12 px-5 py-3 items-center text-[12.5px] transition-colors cursor-pointer ${
                                  isExpanded
                                    ? "bg-[#B28D18]/5 dark:bg-[#C9A52A]/5"
                                    : "hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60"
                                }`}
                              >
                                {/* Person */}
                                <div className="col-span-3 font-medium text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-2.5 min-w-0 pr-2">
                                  <div className="w-7 h-7 rounded-full bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-center text-[10px] font-bold text-[#B28D18] dark:text-[#C9A52A] shrink-0">
                                    {getInitials(inv.email)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">{inv.email}</p>
                                    <p className="text-[10.5px] text-[#667085] dark:text-[#8B95A5] truncate">{fmtDate(inv.createdAt)}</p>
                                  </div>
                                </div>

                                {/* Employee ID */}
                                <div className="col-span-2 font-mono text-[12px] text-[#17202A] dark:text-[#F2F4F7] font-semibold truncate">
                                  {inv.batchNumber || inv.employeeId || inv.batchId || "—"}
                                </div>

                                {/* Role */}
                                <div className="col-span-2">
                                  <span className={`px-2.5 py-0.5 rounded-full border text-[10.5px] font-semibold ${
                                    isCo
                                      ? "bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A] border-[#B28D18]/20 dark:border-[#C9A52A]/20"
                                      : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                                  }`}>
                                    {inv.role || "Member"}
                                  </span>
                                </div>

                                {/* Assigned CO-CEO */}
                                <div className="col-span-2 text-[12px] text-[#667085] dark:text-[#8B95A5] truncate">
                                  {coCeoText}
                                </div>

                                {/* Status */}
                                <div className="col-span-1">
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                                    <span>●</span>
                                    <span>{inv.status || "Pending"}</span>
                                  </span>
                                </div>

                                {/* Desktop Inline Actions Buttons */}
                                <div className="col-span-2 text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setExpandedInviteId(isExpanded ? null : inv.id)}
                                    className="px-2.5 py-1 rounded-[7px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#B28D18] dark:text-[#C9A52A] hover:border-[#B28D18] cursor-pointer transition-colors"
                                  >
                                    {isExpanded ? "Collapse" : "View"}
                                  </button>

                                  <button
                                    onClick={() => setConfirmModal({ isOpen: true, type: "CANCEL_INVITE", targetItem: inv })}
                                    className="px-2.5 py-1 rounded-[7px] bg-rose-500/10 border border-rose-500/20 text-[11.5px] font-bold text-rose-500 hover:bg-rose-500/20 cursor-pointer transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>

                              {/* Desktop Inline Expanded Detail Section */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="bg-[#F8F9FA]/90 dark:bg-[#0B0D10]/90 border-t border-b border-[#E5E7EB] dark:border-[#272D36] px-6 py-4 space-y-3 text-[12px] cursor-default"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E7EB]/60 dark:border-[#272D36]/60">
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
                                        INVITATION DETAILS
                                      </span>
                                      <span className="text-[11px] font-mono text-[#667085] dark:text-[#8B95A5]">
                                        ID: {inv.id}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 pt-1">
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Email Address</span>
                                        <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] truncate block">{inv.email}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Employee / Batch ID</span>
                                        <span className="font-mono font-bold text-[#17202A] dark:text-[#F2F4F7] block">{inv.batchNumber || inv.employeeId || inv.batchId || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Organization Role</span>
                                        <span className="font-bold text-[#B28D18] dark:text-[#C9A52A] block uppercase">{inv.role || "Member"}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Assigned CO-CEO</span>
                                        <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7] block">{coCeoText}</span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 pt-1">
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Status</span>
                                        <span className="font-bold text-amber-600 dark:text-amber-400 block">● {inv.status || "Pending"}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Invited Date</span>
                                        <span className="font-mono text-[#17202A] dark:text-[#F2F4F7] block">{fmtFullDate(inv.createdAt)}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Expires Date</span>
                                        <span className="font-mono text-[#667085] dark:text-[#8B95A5] block">{fmtFullDate(inv.expiresAt)}</span>
                                      </div>
                                    </div>

                                    {/* Desktop Inline Action Bar */}
                                    <div className="flex items-center gap-2.5 pt-2.5 border-t border-[#E5E7EB]/60 dark:border-[#272D36]/60">
                                      <button
                                        onClick={() => handleCopyLink(inv)}
                                        className="h-[36px] px-3.5 rounded-[9px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] flex items-center gap-1.5 cursor-pointer transition-colors"
                                      >
                                        {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedId === inv.id ? "✓ Copied" : "Copy invite link"}</span>
                                      </button>

                                      <button
                                        onClick={() => handleWhatsAppShare(inv)}
                                        className="h-[36px] px-3.5 rounded-[9px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[11.5px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span>WhatsApp</span>
                                      </button>

                                      <button
                                        onClick={() => handleResendInvitation(inv)}
                                        disabled={resendingId === inv.id}
                                        className="h-[36px] px-3.5 rounded-[9px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[11.5px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                                      >
                                        {resendingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                        <span>{resendingId === inv.id ? "Resending..." : "Resend invitation"}</span>
                                      </button>

                                      <button
                                        onClick={() => setConfirmModal({ isOpen: true, type: "CANCEL_INVITE", targetItem: inv })}
                                        className="h-[36px] px-3.5 rounded-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11.5px] font-bold hover:bg-rose-500/20 cursor-pointer transition-colors"
                                      >
                                        Cancel invitation
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mobile Compact Cards List for Invitations (18px Rounded Radius) */}
                    <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-3 [scrollbar-width:none]">
                      {filteredInvitations.map((inv) => {
                        const isCo = (inv.role || "").toUpperCase().includes("CO");
                        return (
                          <div
                            key={inv.id}
                            onClick={() => setSelectedInvitation(inv)}
                            className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[18px] p-4 space-y-3 cursor-pointer active:scale-[0.99] transition-transform shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">{inv.email}</span>
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold shrink-0">
                                ● {inv.status || "Pending"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                              <span>ID: {inv.batchNumber || inv.employeeId || "—"} · {inv.role || "Member"}</span>
                              <span className="font-mono">{fmtDate(inv.createdAt)}</span>
                            </div>

                            <div className="flex items-center justify-between text-[11.5px] pt-2 border-t border-[#E5E7EB]/70 dark:border-[#1E242C]">
                              <span className="text-[#667085] dark:text-[#8B95A5]">
                                CO-CEO: <span className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{isCo ? "—" : inv.assignedCoCeoName || inv.managerId || "Direct under CEO"}</span>
                              </span>
                              <span className="text-[12.5px] text-[#B28D18] dark:text-[#C9A52A] font-bold hover:underline">
                                Tap for details →
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* VIEW B: PEOPLE TAB */
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {loading ? (
                  <div className="p-4 space-y-2.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 bg-[#F8F9FA] dark:bg-[#07090D] rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredPeople.length === 0 ? (
                  /* Compact Mobile Empty State (Reduced Height) */
                  <div className="p-5 sm:p-8 text-center flex flex-col items-center justify-center space-y-2.5 my-3 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[18px] mx-3 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 flex items-center justify-center text-[#B28D18] dark:text-[#C9A52A] mx-auto">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 max-w-xs mx-auto">
                      <h3 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                        {search || roleFilter !== "All" || statusFilter !== "All" ? "No matching people" : "No people yet"}
                      </h3>
                      <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                        {search || roleFilter !== "All" || statusFilter !== "All"
                          ? "Try adjusting your search query or filters."
                          : "Invite your first CO-CEO or Member to begin building your organization."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop Sticky Table Header */}
                    <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">
                      <div className="bg-[#F8F9FA] dark:bg-[#111419] border-b border-[#E5E7EB] dark:border-[#272D36] text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em] grid grid-cols-12 px-5 py-2.5 shrink-0 sticky top-0 z-10">
                        <div className="col-span-4">PERSON</div>
                        <div className="col-span-2">ROLE</div>
                        <div className="col-span-2">STATUS</div>
                        <div className="col-span-3">SUPERVISOR</div>
                        <div className="col-span-1 text-right">ACTIONS</div>
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-[#272D36] [scrollbar-width:thin]">
                        {filteredPeople.map((person) => {
                          const isExpanded = expandedPersonId === person.id;
                          const isPendingInvite = (person.status || "").toUpperCase().includes("PENDING") || (person.status || "").toUpperCase() === "SENT";

                          return (
                            <div key={person.id} className="flex flex-col">
                              {/* Primary Row */}
                              <div
                                onClick={() => setExpandedPersonId(isExpanded ? null : person.id)}
                                className={`grid grid-cols-12 px-5 py-3 items-center text-[12.5px] transition-colors cursor-pointer ${
                                  isExpanded
                                    ? "bg-[#B28D18]/5 dark:bg-[#C9A52A]/5"
                                    : "hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60"
                                }`}
                              >
                                <div className="col-span-4 font-medium text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-2.5 min-w-0 pr-2">
                                  <div className="w-8 h-8 rounded-full bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-center text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] shrink-0">
                                    {getInitials(person.name, person.email)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">{person.name}</p>
                                    <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] truncate">{person.email}</p>
                                  </div>
                                </div>

                                <div className="col-span-2">
                                  <span className={`px-2.5 py-0.5 rounded-full border text-[10.5px] font-semibold ${
                                    (person.role || "").toUpperCase().includes("CO")
                                      ? "bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A] border-[#B28D18]/20 dark:border-[#C9A52A]/20"
                                      : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                                  }`}>
                                    {person.role}
                                  </span>
                                </div>

                                <div className="col-span-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    isPendingInvite
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                      : person.status === "ACTIVE"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                  }`}>
                                    {isPendingInvite ? "PENDING INVITATION" : person.status}
                                  </span>
                                </div>

                                <div className="col-span-3 text-[12px] text-[#667085] dark:text-[#8B95A5] truncate">
                                  {person.supervisor}
                                </div>

                                <div className="col-span-1 text-right flex justify-end" onClick={(e) => e.stopPropagation()}>
                                  <ActionMenu>
                                    <button
                                      onClick={() => setExpandedPersonId(isExpanded ? null : person.id)}
                                      className="w-full px-3 py-1.5 text-left font-medium hover:bg-[#F8F9FA] dark:hover:bg-[#07090D] rounded-md transition-colors"
                                    >
                                      {isExpanded ? "Collapse details" : "View details"}
                                    </button>

                                    {isPendingInvite ? (
                                      <>
                                        <button
                                          onClick={() => handleCopyLink(person)}
                                          className="w-full px-3 py-1.5 text-left font-medium hover:bg-[#F8F9FA] dark:hover:bg-[#07090D] rounded-md transition-colors"
                                        >
                                          Copy invite link
                                        </button>
                                        <button
                                          onClick={() => handleWhatsAppShare(person)}
                                          className="w-full px-3 py-1.5 text-left font-medium hover:bg-[#F8F9FA] dark:hover:bg-[#07090D] rounded-md transition-colors"
                                        >
                                          WhatsApp invite
                                        </button>
                                        <button
                                          onClick={() => handleResendInvitation(person)}
                                          className="w-full px-3 py-1.5 text-left font-medium hover:bg-[#F8F9FA] dark:hover:bg-[#07090D] rounded-md transition-colors"
                                        >
                                          Resend invitation
                                        </button>
                                        <button
                                          onClick={() => setConfirmModal({ isOpen: true, type: "CANCEL_INVITE", targetItem: person })}
                                          className="w-full px-3 py-1.5 text-left font-medium text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                                        >
                                          Cancel invitation
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => setConfirmModal({ isOpen: true, type: person.status === "ACTIVE" ? "SUSPEND" : "RESTORE", targetItem: person })}
                                          className="w-full px-3 py-1.5 text-left font-medium hover:bg-[#F8F9FA] dark:hover:bg-[#07090D] rounded-md transition-colors"
                                        >
                                          {person.status === "ACTIVE" ? "Suspend access" : "Restore access"}
                                        </button>
                                        <button
                                          onClick={() => setConfirmModal({ isOpen: true, type: "REMOVE", targetItem: person })}
                                          className="w-full px-3 py-1.5 text-left font-medium text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                                        >
                                          Remove person
                                        </button>
                                      </>
                                    )}
                                  </ActionMenu>
                                </div>
                              </div>

                              {/* Desktop Inline Expanded Detail Section */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="bg-[#F8F9FA]/90 dark:bg-[#0B0D10]/90 border-t border-b border-[#E5E7EB] dark:border-[#272D36] px-6 py-4 space-y-3 text-[12px] cursor-default"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E7EB]/60 dark:border-[#272D36]/60">
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
                                        {isPendingInvite ? "INVITATION DETAILS" : "MEMBER DETAILS"}
                                      </span>
                                      <span className="text-[11px] font-mono text-[#667085] dark:text-[#8B95A5]">
                                        {person.batchId ? `ID: ${person.batchId}` : ""}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 pt-1">
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Name</span>
                                        <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] truncate block">{person.name}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Email Address</span>
                                        <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] truncate block">{person.email}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Organization Role</span>
                                        <span className="font-bold text-[#B28D18] dark:text-[#C9A52A] block uppercase">{person.role}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Supervisor</span>
                                        <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7] block">{person.supervisor}</span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 pt-1">
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Status</span>
                                        <span className={`font-bold block ${isPendingInvite ? "text-amber-600 dark:text-amber-400" : person.status === "ACTIVE" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                          ● {isPendingInvite ? "PENDING INVITATION" : person.status}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Active Projects</span>
                                        <span className="font-mono text-[#17202A] dark:text-[#F2F4F7] block">{person.projectsCount ?? 0}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Assigned Tasks</span>
                                        <span className="font-mono text-[#17202A] dark:text-[#F2F4F7] block">{person.tasksCount ?? 0}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] block font-medium">Completed Tasks</span>
                                        <span className="font-mono text-[#17202A] dark:text-[#F2F4F7] block">{person.completedTasksCount ?? 0}</span>
                                      </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="flex items-center gap-2.5 pt-2.5 border-t border-[#E5E7EB]/60 dark:border-[#272D36]/60">
                                      {isPendingInvite ? (
                                        <>
                                          <button
                                            onClick={() => handleCopyLink(person)}
                                            className="h-[36px] px-3.5 rounded-[9px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] flex items-center gap-1.5 cursor-pointer transition-colors"
                                          >
                                            {copiedId === person.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            <span>{copiedId === person.id ? "✓ Copied" : "Copy invite link"}</span>
                                          </button>

                                          <button
                                            onClick={() => handleWhatsAppShare(person)}
                                            className="h-[36px] px-3.5 rounded-[9px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[11.5px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            <span>WhatsApp</span>
                                          </button>

                                          <button
                                            onClick={() => handleResendInvitation(person)}
                                            disabled={resendingId === person.id}
                                            className="h-[36px] px-3.5 rounded-[9px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[11.5px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                                          >
                                            {resendingId === person.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                            <span>{resendingId === person.id ? "Resending..." : "Resend invitation"}</span>
                                          </button>

                                          <button
                                            onClick={() => setConfirmModal({ isOpen: true, type: "CANCEL_INVITE", targetItem: person })}
                                            className="h-[36px] px-3.5 rounded-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11.5px] font-bold hover:bg-rose-500/20 cursor-pointer transition-colors"
                                          >
                                            Cancel invitation
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => setConfirmModal({ isOpen: true, type: person.status === "ACTIVE" ? "SUSPEND" : "RESTORE", targetItem: person })}
                                            className="h-[36px] px-3.5 rounded-[9px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] cursor-pointer transition-colors"
                                          >
                                            {person.status === "ACTIVE" ? "Suspend access" : "Restore access"}
                                          </button>

                                          <button
                                            onClick={() => setConfirmModal({ isOpen: true, type: "REMOVE", targetItem: person })}
                                            className="h-[36px] px-3.5 rounded-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11.5px] font-bold hover:bg-rose-500/20 cursor-pointer transition-colors"
                                          >
                                            Remove person
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mobile Compact Cards List (18px Rounded Radius) */}
                    <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-3 [scrollbar-width:none]">
                      {filteredPeople.map((person) => (
                        <div
                          key={person.id}
                          onClick={() => setSelectedPerson(person)}
                          className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[18px] p-4 space-y-3 cursor-pointer active:scale-[0.99] transition-transform shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#F8F9FA] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-center text-[10.5px] font-bold text-[#B28D18] dark:text-[#C9A52A] shrink-0">
                                {getInitials(person.name, person.email)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">{person.name}</p>
                                <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] truncate">{person.email}</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-semibold border shrink-0 ${
                              person.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            }`}>
                              {person.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11.5px] pt-2 border-t border-[#E5E7EB]/70 dark:border-[#1E242C]">
                            <span className="text-[#667085] dark:text-[#8B95A5]">Role: <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{person.role}</span></span>
                            <span className="text-[12.5px] text-[#B28D18] dark:text-[#C9A52A] font-bold hover:underline">Tap for details →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REACT PORTAL PERSON DETAILS DRAWER / SHEET */}
      {selectedPerson && (
        <PersonDetailDrawer
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}

      {/* INVITATION DETAIL MODAL / SHEET (MOBILE ONLY) */}
      {selectedInvitation && (
        <InvitationDetailModal
          isOpen={Boolean(selectedInvitation)}
          invitation={selectedInvitation}
          onClose={() => setSelectedInvitation(null)}
          onRefresh={fetchData}
        />
      )}

      {/* INVITE PERSON SHEET (MOBILE ONLY) */}
      <MobileInviteSheet
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={handleSuccessInvitation}
        coCeos={coCeos}
      />

      {/* CONFIRMATION ACTION MODAL */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        loading={actionLoading}
        title={
          confirmModal.type === "SUSPEND"
            ? "Suspend Member Access"
            : confirmModal.type === "RESTORE"
            ? "Restore Member Access"
            : confirmModal.type === "REMOVE"
            ? "Remove Person"
            : "Cancel invitation"
        }
        message={
          confirmModal.type === "SUSPEND"
            ? `Are you sure you want to suspend access for ${confirmModal.targetItem?.name || "this person"}? They will not be able to log in.`
            : confirmModal.type === "RESTORE"
            ? `Restore access for ${confirmModal.targetItem?.name || "this person"}? They will be able to log in and submit tasks again.`
            : confirmModal.type === "REMOVE"
            ? `Are you sure you want to permanently remove ${confirmModal.targetItem?.name || "this person"} from the organization?`
            : `Are you sure you want to cancel this invitation?\n\n${confirmModal.targetItem?.email || ""}\n\nThis invitation link will no longer be usable after cancellation.`
        }
        confirmLabel={
          confirmModal.type === "SUSPEND"
            ? "Suspend Access"
            : confirmModal.type === "RESTORE"
            ? "Restore Access"
            : confirmModal.type === "REMOVE"
            ? "Remove Person"
            : "Cancel invitation"
        }
        error={actionError}
        variant={confirmModal.type === "RESTORE" ? "primary" : confirmModal.type === "SUSPEND" ? "warning" : "danger"}
        onClose={() => {
          setActionError(null);
          setConfirmModal({ isOpen: false, type: "SUSPEND", targetItem: null });
        }}
        onConfirm={handleExecuteAction}
      />

      {/* MOBILE SHEETS */}
      <MobilePersonActionSheet
        isOpen={mobileActionState.isOpen}
        onClose={() => setMobileActionState({ isOpen: false, item: null, type: "ACTIVE" })}
        item={mobileActionState.item}
        type={mobileActionState.type}
        onViewDetails={() => {
          setSelectedPerson(mobileActionState.item);
          setMobileActionState({ isOpen: false, item: null, type: "ACTIVE" });
        }}
        onSuspend={() => setConfirmModal({ isOpen: true, type: "SUSPEND", targetItem: mobileActionState.item })}
        onRestore={() => setConfirmModal({ isOpen: true, type: "RESTORE", targetItem: mobileActionState.item })}
        onRemove={() => setConfirmModal({ isOpen: true, type: "REMOVE", targetItem: mobileActionState.item })}
      />
    </div>
  );
}
