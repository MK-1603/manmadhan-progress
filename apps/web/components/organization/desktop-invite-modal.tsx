"use client";

import React, { useState, useEffect } from "react";
import { X, Send, Loader2, AlertCircle, CheckCircle2, Shield, User, ChevronRight, Check, Copy, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";

interface DesktopInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInv?: any) => void;
  coCeos: any[];
}

type DispatchState = "READY" | "DISPATCHING" | "DISPATCHED" | "FAILED";

export function DesktopInviteModal({ isOpen, onClose, onSuccess, coCeos }: DesktopInviteModalProps) {
  const [batchId, setBatchId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"CO-CEO" | "MEMBER">("MEMBER");
  const [managerId, setManagerId] = useState("");

  const [dispatchState, setDispatchState] = useState<DispatchState>("READY");
  const [errorMsg, setErrorMsg] = useState("");
  const [createdInv, setCreatedInv] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDispatchState("READY");
      setErrorMsg("");
      setCreatedInv(null);
      setManagerId("");
    }
  }, [isOpen]);

  const handleRoleChange = (newRole: "CO-CEO" | "MEMBER") => {
    setRole(newRole);
    setErrorMsg("");
    if (newRole === "CO-CEO") {
      setManagerId("");
    }
  };

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Email address is required.");
      return;
    }

    if (role === "MEMBER" && coCeos.length > 0 && !managerId) {
      setErrorMsg("Select a CO-CEO supervisor for this member.");
      return;
    }

    setErrorMsg("");
    setDispatchState("DISPATCHING");

    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(
        "/invitations/send",
        {
          email: email.trim(),
          name: batchId.trim() || undefined,
          role,
          managerId: role === "MEMBER" && managerId ? managerId : undefined,
          workspaceId,
        },
        { timeout: 12000 }
      );

      if (res.data?.success) {
        setDispatchState("DISPATCHED");
        const inv = res.data.data || res.data.invitation;
        setCreatedInv(inv);

        setTimeout(() => {
          setEmail("");
          setBatchId("");
          setManagerId("");
          setDispatchState("READY");
          onSuccess(inv);
          onClose();
        }, 2000);
      } else {
        setDispatchState("FAILED");
        setErrorMsg(res.data?.error || "Invitation couldn't be dispatched.");
      }
    } catch (err: any) {
      setDispatchState("FAILED");
      setErrorMsg(err.response?.data?.error || err.message || "Invitation couldn't be dispatched.");
    }
  };

  const handleCopyLink = (id?: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/invite/${createdInv?.token || id || ""}`;
    navigator.clipboard.writeText(link);
    setCopiedId("link");
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCopyWhatsApp = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/invite/${createdInv?.token || ""}`;
    const msg = `You're invited to join ManMadhan Progress.\n\nOrganization:\nManMadhan\n\nRole:\n${role}\n\nUse this secure invitation link:\n${link}`;
    navigator.clipboard.writeText(msg);
    setCopiedId("wa");
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 hidden md:flex items-center justify-center">
      {/* Subtle Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => dispatchState !== "DISPATCHING" && onClose()}
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] cursor-pointer"
      />

      {/* Centered Desktop Modal Window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-[540px] max-h-[85dvh] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[20px] shadow-2xl overflow-hidden flex flex-col text-[#17202A] dark:text-[#F2F4F7] select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[#E5E7EB] dark:border-[#272D36] shrink-0">
          <div>
            <h2 className="text-[18px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight">
              Invite person
            </h2>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5]">
              Send an organization invitation and assign their execution role.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={dispatchState === "DISPATCHING"}
            className="p-1.5 rounded-lg text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F8F9FA] dark:hover:bg-[#07090D] transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSend} className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg("");
                  setDispatchState("READY");
                }}
                className="font-bold underline text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
              EMAIL ADDRESS <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              disabled={dispatchState !== "READY" && dispatchState !== "FAILED"}
              placeholder="person@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMsg) setErrorMsg("");
              }}
              className="w-full h-[42px] px-3.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[11px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A] transition-colors disabled:opacity-50"
            />
          </div>

          {/* Employee ID */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
              EMPLOYEE / BATCH ID <span className="text-[#667085] dark:text-[#8B95A5] font-normal">(OPTIONAL)</span>
            </label>
            <input
              type="text"
              disabled={dispatchState !== "READY" && dispatchState !== "FAILED"}
              placeholder="e.g. MK1603"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full h-[42px] px-3.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[11px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A] transition-colors disabled:opacity-50"
            />
          </div>

          {/* Organization Role Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
              ORGANIZATION ROLE
            </label>
            <select
              disabled={dispatchState !== "READY" && dispatchState !== "FAILED"}
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as any)}
              className="w-full h-[42px] px-3.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[11px] text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A] cursor-pointer"
            >
              <option value="MEMBER">Member (Execution & Development)</option>
              <option value="CO-CEO">CO-CEO (Leadership & Delegation)</option>
            </select>
          </div>

          {/* Assigned CO-CEO Supervisor (If MEMBER) */}
          {role === "MEMBER" ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
                ASSIGNED CO-CEO SUPERVISOR <span className="text-rose-500">*</span>
              </label>
              {coCeos.length > 0 ? (
                <select
                  disabled={dispatchState !== "READY" && dispatchState !== "FAILED"}
                  value={managerId}
                  onChange={(e) => {
                    setManagerId(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  className="w-full h-[42px] px-3.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[11px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A] cursor-pointer"
                >
                  <option value="">Select CO-CEO supervisor...</option>
                  {coCeos.map((c) => (
                    <option key={c.id || c.userId} value={c.id || c.userId}>
                      {c.displayName || c.name || c.user?.name || c.email} (CO-CEO)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3.5 rounded-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[12.5px] font-bold leading-relaxed">
                  Add a CO-CEO before inviting a Member.
                </div>
              )}
            </div>
          ) : (
            /* Read-Only CEO Reporting Box for CO-CEO */
            <div className="p-3 rounded-[11px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[12px] space-y-0.5">
              <span className="text-[#667085] dark:text-[#8B95A5] font-semibold block text-[11px]">Reports to</span>
              <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">CEO / Organization Head</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* In-Modal Dispatch Animation Visual */}
          {dispatchState === "DISPATCHING" && (
            <div className="p-4 rounded-[14px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#B28D18]/30 dark:border-[#C9A52A]/30 text-center space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] font-bold flex items-center justify-center mx-auto shadow-md">
                <Shield className="w-4 h-4 fill-current" />
              </div>
              <p className="text-[12px] font-bold text-[#B28D18] dark:text-[#C9A52A] animate-pulse">
                Dispatching invitation to server...
              </p>
            </div>
          )}

          {dispatchState === "DISPATCHED" && (
            <div className="p-4 rounded-[14px] bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[13.5px]">
                <CheckCircle2 className="w-5 h-5" />
                <span>Invitation dispatched</span>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyLink()}
                  className="px-3 py-1.5 rounded-[8px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedId === "link" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === "link" ? "Copied" : "Copy invite link"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="px-3 py-1.5 rounded-[8px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedId === "wa" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />}
                  <span>{copiedId === "wa" ? "Copied WhatsApp" : "Copy WhatsApp"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB] dark:border-[#272D36]">
            <button
              type="button"
              disabled={dispatchState === "DISPATCHING"}
              onClick={onClose}
              className="h-[38px] px-4 rounded-[10px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[12px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={dispatchState === "DISPATCHING" || dispatchState === "DISPATCHED"}
              className="h-[40px] px-5 rounded-[10px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[12.5px] font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2.5px_0_0_#8c6e11] dark:shadow-[0_2.5px_0_0_#a3841e] hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_#8c6e11] dark:hover:shadow-[0_4px_0_0_#a3841e] active:translate-y-0.5 active:shadow-[0_0.5px_0_0_#8c6e11] dark:active:shadow-[0_0.5px_0_0_#a3841e] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0"
            >
              {dispatchState === "DISPATCHING" ? (
                <>
                  <span>Sending...</span>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                </>
              ) : dispatchState === "DISPATCHED" ? (
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
          </div>
        </form>
      </motion.div>
    </div>
  );
}
