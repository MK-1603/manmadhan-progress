"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Mail, AlertCircle, Loader2, Check, X, Copy, CheckCircle2, RefreshCw, Trash2, ChevronDown, ChevronUp, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

function formatDate(ts: string | null | undefined) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-US", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(ts);
  }
}

interface InvitationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitation: any | null;
  onRefresh?: () => void;
}

export function InvitationDetailModal({ isOpen, onClose, invitation, onRefresh }: InvitationDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  useBodyScrollLock(isOpen);

  const [inv, setInv] = useState<any>(invitation);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // Collapsible Accordion Sections
  const [showDetails, setShowDetails] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showActions, setShowActions] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setInv(invitation);
      setError("");
      setActionMsg("");
      setToastMsg("");
      setShowDetails(true);
      setShowTimeline(false);
      setShowActions(true);
    }
  }, [isOpen, invitation]);

  if (!isOpen || !inv || !mounted) return null;

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/invite/${inv.token || inv.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setToastMsg("Invitation link copied");
    setTimeout(() => {
      setCopied(false);
      setToastMsg("");
    }, 1800);
  };

  const handleWhatsAppShare = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/invite/${inv.token || inv.id}`;
    const roleText = (inv.role || "").toUpperCase().includes("CO") ? "CO-CEO" : "Member";

    const msg = `Hello,\n\nYou've been invited to join ManMadhan Progress.\n\nOrganization: ManMadhan\nRole: ${roleText}\n\nPlease use the invitation link below to join:\n${inviteUrl}\n\nWe're looking forward to having you on the team.\n\n— ManMadhan Progress`;

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, "_blank");
  };

  const handleResend = async () => {
    setActionLoading(true);
    setActionMsg("");
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/invitations/${inv.id}/resend`, { workspaceId });
      if (res.data?.success) {
        setActionMsg("Invitation email resent successfully!");
        if (onRefresh) onRefresh();
      } else {
        setError(res.data?.error || "Failed to resend invitation.");
      }
    } catch {
      setError("Unable to resend invitation. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    setActionMsg("");
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.delete(`/invitations/${inv.id}?workspaceId=${workspaceId}`);
      setActionMsg("Invitation cancelled successfully.");
      setTimeout(() => {
        if (onRefresh) onRefresh();
        onClose();
      }, 1000);
    } catch {
      setError("Unable to cancel invitation. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const isCoCeo = (inv.role || "").toUpperCase().includes("CO");
  const roleText = isCoCeo ? "CO-CEO" : "MEMBER";
  const assignedCoCeoText = isCoCeo
    ? "Not applicable"
    : inv.assignedCoCeoName
    ? `${inv.assignedCoCeoName} (CO-CEO)`
    : inv.assignedCoCeoEmail || inv.managerId || "Not assigned";

  const statusLabel = inv.status || "Pending";

  const contentJSX = (
    <div className="space-y-3.5 text-[#17202A] dark:text-[#F2F4F7] text-[13px] select-none">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB] dark:border-[#272D36]">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B28D18] dark:bg-[#C9A52A]" />
            <h3 className="font-bold text-[15px] text-[#17202A] dark:text-[#F2F4F7] truncate">
              {inv.email}
            </h3>
          </div>
          <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
            {roleText} · <span className="text-amber-600 dark:text-amber-400 font-semibold">● {statusLabel}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F8F9FA] dark:hover:bg-[#07090D]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {toastMsg && (
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[12px] font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[12px] font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* SECTION 1: INVITATION DETAILS (COLLAPSIBLE) */}
      <div className="border border-[#E5E7EB] dark:border-[#272D36] rounded-[14px] overflow-hidden bg-[#FFFFFF] dark:bg-[#07090D]">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-3.5 py-2.5 bg-[#F8F9FA] dark:bg-[#111419] flex items-center justify-between font-bold text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F0F2F5] dark:hover:bg-[#181D24] transition-colors"
        >
          <span>▾ Invitation</span>
          {showDetails ? <ChevronUp className="w-4 h-4 text-[#667085] dark:text-[#8B95A5]" /> : <ChevronDown className="w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />}
        </button>

        <AnimatePresence initial={false}>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="divide-y divide-[#E5E7EB] dark:divide-[#1E242C] px-3.5"
            >
              <div className="py-2.5 flex justify-between items-center text-[12px]">
                <span className="text-[#667085] dark:text-[#8B95A5]">Email</span>
                <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate max-w-[200px]">{inv.email}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-[12px]">
                <span className="text-[#667085] dark:text-[#8B95A5]">Employee / Batch ID</span>
                <span className="font-mono font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  {inv.batchNumber || inv.employeeId || inv.batchId || "—"}
                </span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-[12px]">
                <span className="text-[#667085] dark:text-[#8B95A5]">Organization Role</span>
                <span className="font-bold text-[#B28D18] dark:text-[#C9A52A]">{roleText}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-[12px]">
                <span className="text-[#667085] dark:text-[#8B95A5]">Assigned CO-CEO</span>
                <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{assignedCoCeoText}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 2: TIMELINE (COLLAPSIBLE) */}
      <div className="border border-[#E5E7EB] dark:border-[#272D36] rounded-[14px] overflow-hidden bg-[#FFFFFF] dark:bg-[#07090D]">
        <button
          type="button"
          onClick={() => setShowTimeline(!showTimeline)}
          className="w-full px-3.5 py-2.5 bg-[#F8F9FA] dark:bg-[#111419] flex items-center justify-between font-bold text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F0F2F5] dark:hover:bg-[#181D24] transition-colors"
        >
          <span>▾ Timeline</span>
          {showTimeline ? <ChevronUp className="w-4 h-4 text-[#667085] dark:text-[#8B95A5]" /> : <ChevronDown className="w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />}
        </button>

        <AnimatePresence initial={false}>
          {showTimeline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="divide-y divide-[#E5E7EB] dark:divide-[#1E242C] px-3.5"
            >
              <div className="py-2.5 flex justify-between items-center text-[12px]">
                <span className="text-[#667085] dark:text-[#8B95A5]">Invitation Sent</span>
                <span className="font-mono text-[#17202A] dark:text-[#F2F4F7]">{formatDate(inv.createdAt)}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-[12px]">
                <span className="text-[#667085] dark:text-[#8B95A5]">Expires Date</span>
                <span className="font-mono text-[#667085] dark:text-[#8B95A5]">{formatDate(inv.expiresAt)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 3: ACTIONS (COLLAPSIBLE) */}
      <div className="border border-[#E5E7EB] dark:border-[#272D36] rounded-[14px] overflow-hidden bg-[#FFFFFF] dark:bg-[#07090D] p-3 space-y-2">
        <button
          type="button"
          onClick={() => setShowActions(!showActions)}
          className="w-full pb-1 flex items-center justify-between font-bold text-[12.5px] text-[#17202A] dark:text-[#F2F4F7]"
        >
          <span>▾ Actions</span>
          {showActions ? <ChevronUp className="w-4 h-4 text-[#667085] dark:text-[#8B95A5]" /> : <ChevronDown className="w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />}
        </button>

        {showActions && (
          <div className="space-y-2 pt-1">
            {/* Primary Actions Grid: Resend + WhatsApp */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleResend}
                disabled={actionLoading}
                className="h-[38px] rounded-[10px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[12px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Resend</span>
              </button>

              <button
                onClick={handleWhatsAppShare}
                className="h-[38px] rounded-[10px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[12px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>

            {/* Secondary Action: Copy Invite Link */}
            <button
              onClick={handleCopyLink}
              className="w-full h-[38px] rounded-[10px] bg-[#F8F9FA] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center justify-center gap-1.5 cursor-pointer hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "✓ Copied" : "Copy invite link"}</span>
            </button>

            {/* Destructive Subtle Action: Cancel Invitation */}
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="w-full py-1.5 text-center text-[12px] font-semibold text-rose-500 hover:underline cursor-pointer disabled:opacity-40 pt-1"
            >
              Cancel invitation
            </button>
          </div>
        )}
      </div>

    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      
      {/* DESKTOP CENTERED DIALOG (`hidden md:flex`) */}
      <div className="hidden md:flex fixed inset-0 items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] cursor-pointer"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.15 }}
          className="relative z-10 w-full max-w-md bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[20px] shadow-2xl p-5 overflow-y-auto max-h-[85vh] [scrollbar-width:thin]"
        >
          {contentJSX}
        </motion.div>
      </div>

      {/* MOBILE iOS-STYLE BOTTOM SHEET (`md:hidden`) */}
      <div className="flex md:hidden fixed inset-0 items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          onTouchMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] cursor-pointer"
        />

        {/* Bottom Sheet Card */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="relative z-10 w-full max-h-[85dvh] bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E5E7EB] dark:border-[#272D36] rounded-t-[24px] shadow-2xl p-5 flex flex-col overflow-y-auto pb-[calc(20px+env(safe-area-inset-bottom))]"
        >
          {/* Drag Handle */}
          <div className="w-10 h-1 rounded-full bg-[#E5E7EB] dark:bg-[#3F4754] mx-auto mb-3 shrink-0" />
          {contentJSX}
        </motion.div>
      </div>

    </div>,
    document.body
  );
}
