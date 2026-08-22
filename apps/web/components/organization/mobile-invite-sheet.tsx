"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, Send, Loader2, AlertCircle, CheckCircle2, Shield, User, ChevronRight,
  Check, Search, Copy, MessageSquare, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

interface MobileInviteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInv?: any) => void;
  coCeos: any[];
}

type Step = "FORM" | "ROLE_SELECT" | "SUPERVISOR_SELECT" | "DISCARD_CONFIRM";
type DispatchState = "READY" | "DISPATCHING" | "DISPATCHED" | "FAILED";

export function MobileInviteSheet({ isOpen, onClose, onSuccess, coCeos }: MobileInviteSheetProps) {
  const [mounted, setMounted] = useState(false);
  useBodyScrollLock(isOpen);
  const [step, setStep] = useState<Step>("FORM");
  const [batchId, setBatchId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"CO-CEO" | "MEMBER">("MEMBER");
  const [managerId, setManagerId] = useState("");

  const [dispatchState, setDispatchState] = useState<DispatchState>("READY");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createdInv, setCreatedInv] = useState<any>(null);
  const [supervisorSearch, setSupervisorSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep("FORM");
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

  const hasUnsavedData = email.trim().length > 0 || batchId.trim().length > 0;

  const handleBackdropClick = () => {
    if (dispatchState === "DISPATCHING") return;
    if (hasUnsavedData && dispatchState === "READY") {
      setStep("DISCARD_CONFIRM");
    } else {
      onClose();
    }
  };

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
          batchNumber: batchId.trim() || undefined,
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
        }, 2200);
      } else {
        setDispatchState("FAILED");
        setErrorMsg(res.data?.error || "Invitation couldn't be dispatched.");
      }
    } catch (err: any) {
      setDispatchState("FAILED");
      setErrorMsg(err.response?.data?.error || err.message || "Invitation couldn't be dispatched.");
    }
  };

  const selectedManager = coCeos.find((c) => (c.id || c.userId) === managerId);

  const filteredCoCeos = coCeos.filter((c) => {
    const s = supervisorSearch.toLowerCase();
    const name = c.displayName || c.name || c.user?.name || "";
    const mail = c.email || c.user?.email || "";
    return name.toLowerCase().includes(s) || mail.toLowerCase().includes(s);
  });

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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:hidden">
      
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] cursor-pointer z-[60]"
      />

      {/* Bottom Sheet Card */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="relative z-[70] w-full max-h-[92dvh] bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E5E7EB] dark:border-[#272D36] rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden text-[#17202A] dark:text-[#F2F4F7] select-none pb-[calc(16px+env(safe-area-inset-bottom))]"
      >
        {/* Drag Handle */}
        <div className="w-full py-2.5 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-[#E5E7EB] dark:bg-[#3F4754]" />
        </div>

        {/* Dynamic Sheet Content */}
        <AnimatePresence mode="wait">
          
          {/* DISCARD CONFIRM STEP */}
          {step === "DISCARD_CONFIRM" && (
            <motion.div
              key="discard"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="p-6 space-y-4 text-center"
            >
              <h3 className="text-[17px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Discard invitation?</h3>
              <p className="text-[13px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                You have unsaved changes in this invitation form. Are you sure you want to discard?
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setStep("FORM")}
                  className="h-[42px] rounded-[11px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7]"
                >
                  Keep editing
                </button>
                <button
                  onClick={onClose}
                  className="h-[42px] rounded-[11px] bg-rose-600 text-white text-[13px] font-bold"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          )}

          {/* ROLE SELECT SHEET STEP */}
          {step === "ROLE_SELECT" && (
            <motion.div
              key="role"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              className="p-5 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#272D36]">
                <button onClick={() => setStep("FORM")} className="p-1 rounded-lg text-[#667085] dark:text-[#8B95A5]">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Select role</h3>
                <div className="w-5" />
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  onClick={() => {
                    handleRoleChange("MEMBER");
                    setStep("FORM");
                  }}
                  className={`w-full p-4 rounded-[14px] border text-left transition-all flex items-center justify-between ${
                    role === "MEMBER"
                      ? "bg-[#B28D18]/10 dark:bg-[#C9A52A]/15 border-[#B28D18] dark:border-[#C9A52A] text-[#17202A] dark:text-[#F2F4F7]"
                      : "bg-[#F8F9FA] dark:bg-[#07090D] border-[#E5E7EB] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5]"
                  }`}
                >
                  <div>
                    <p className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Member</p>
                    <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] mt-0.5">Execution & Development</p>
                  </div>
                  {role === "MEMBER" && <Check className="w-5 h-5 text-[#B28D18] dark:text-[#C9A52A]" />}
                </button>

                <button
                  onClick={() => {
                    handleRoleChange("CO-CEO");
                    setStep("FORM");
                  }}
                  className={`w-full p-4 rounded-[14px] border text-left transition-all flex items-center justify-between ${
                    role === "CO-CEO"
                      ? "bg-[#B28D18]/10 dark:bg-[#C9A52A]/15 border-[#B28D18] dark:border-[#C9A52A] text-[#17202A] dark:text-[#F2F4F7]"
                      : "bg-[#F8F9FA] dark:bg-[#07090D] border-[#E5E7EB] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5]"
                  }`}
                >
                  <div>
                    <p className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">CO-CEO</p>
                    <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] mt-0.5">Leadership & Delegation</p>
                  </div>
                  {role === "CO-CEO" && <Check className="w-5 h-5 text-[#B28D18] dark:text-[#C9A52A]" />}
                </button>
              </div>
            </motion.div>
          )}

          {/* SUPERVISOR SELECT SHEET STEP */}
          {step === "SUPERVISOR_SELECT" && (
            <motion.div
              key="supervisor"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              className="p-5 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#272D36]">
                <button onClick={() => setStep("FORM")} className="p-1 rounded-lg text-[#667085] dark:text-[#8B95A5]">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Select CO-CEO Supervisor</h3>
                <div className="w-5" />
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#8B95A5]" />
                <input
                  type="text"
                  placeholder="Search CO-CEOs..."
                  value={supervisorSearch}
                  onChange={(e) => setSupervisorSearch(e.target.value)}
                  className="w-full pl-10 pr-3.5 h-[40px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[11px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A]"
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pt-1">
                {filteredCoCeos.length > 0 ? (
                  filteredCoCeos.map((c) => {
                    const cid = c.id || c.userId;
                    const isSelected = managerId === cid;
                    return (
                      <button
                        key={cid}
                        onClick={() => {
                          setManagerId(cid);
                          setErrorMsg("");
                          setStep("FORM");
                        }}
                        className={`w-full p-3.5 rounded-[12px] border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-[#B28D18]/10 dark:bg-[#C9A52A]/15 border-[#B28D18] dark:border-[#C9A52A] text-[#17202A] dark:text-[#F2F4F7]"
                            : "bg-[#F8F9FA] dark:bg-[#07090D] border-[#E5E7EB] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5]"
                        }`}
                      >
                        <div>
                          <p className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                            {c.displayName || c.name || c.user?.name || c.email}
                          </p>
                          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5]">CO-CEO</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-center py-6 text-[12.5px] text-[#667085] dark:text-[#8B95A5]">No matching CO-CEOs found.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* PRIMARY FORM STEP */}
          {step === "FORM" && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5 flex-1 flex flex-col justify-between overflow-y-auto space-y-4"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#272D36]">
                <div>
                  <h2 className="text-[18px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Invite person</h2>
                  <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">Send an organization invitation</p>
                </div>
                <button onClick={handleBackdropClick} className="p-1.5 rounded-lg text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Inputs */}
              <form onSubmit={handleSend} className="space-y-3.5">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Email Address */}
                <div className="space-y-1">
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
                    className="w-full h-[42px] px-3.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[11px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A]"
                  />
                </div>

                {/* Employee ID */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
                    EMPLOYEE / BATCH ID <span className="text-[#667085] dark:text-[#8B95A5] font-normal">(OPTIONAL)</span>
                  </label>
                  <input
                    type="text"
                    disabled={dispatchState !== "READY" && dispatchState !== "FAILED"}
                    placeholder="e.g. MM1107"
                    maxLength={6}
                    value={batchId}
                    onChange={(e) => {
                      const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                      const letters = raw.replace(/[^A-Z]/g, "").slice(0, 2);
                      const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
                      setBatchId(letters + digits);
                    }}
                    className="w-full h-[42px] px-3.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[11px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A] font-mono tracking-widest uppercase"
                  />
                </div>

                {/* Role Button Trigger */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
                    ORGANIZATION ROLE
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep("ROLE_SELECT")}
                    className="w-full h-[42px] px-3.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[11px] text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7] flex items-center justify-between"
                  >
                    <span>{role === "MEMBER" ? "Member (Execution & Development)" : "CO-CEO (Leadership & Delegation)"}</span>
                    <ChevronRight className="w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />
                  </button>
                </div>

                {/* Supervisor Trigger (If MEMBER) */}
                {role === "MEMBER" ? (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
                      ASSIGNED CO-CEO SUPERVISOR <span className="text-rose-500">*</span>
                    </label>
                    {coCeos.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setStep("SUPERVISOR_SELECT")}
                        className="w-full h-[42px] px-3.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[11px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] flex items-center justify-between"
                      >
                        <span className="truncate">
                          {selectedManager
                            ? `${selectedManager.displayName || selectedManager.name || selectedManager.email} (CO-CEO)`
                            : "Select CO-CEO supervisor..."}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#667085] dark:text-[#8B95A5] shrink-0" />
                      </button>
                    ) : (
                      <div className="p-3.5 rounded-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[12.5px] font-bold leading-relaxed">
                        Add a CO-CEO before inviting a Member.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-[11px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[12px] space-y-0.5">
                    <span className="text-[#667085] dark:text-[#8B95A5] font-semibold block text-[11px]">Reports to</span>
                    <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">CEO / Organization Head</span>
                  </div>
                )}

                {/* Dispatch Animation */}
                {dispatchState === "DISPATCHING" && (
                  <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#B28D18]/30 dark:border-[#C9A52A]/30 text-center space-y-1.5">
                    <Loader2 className="w-5 h-5 animate-spin text-[#B28D18] dark:text-[#C9A52A] mx-auto" />
                    <p className="text-[12px] font-bold text-[#B28D18] dark:text-[#C9A52A]">Dispatching invitation...</p>
                  </div>
                )}

                {dispatchState === "DISPATCHED" && (
                  <div className="p-3.5 rounded-[12px] bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[13px]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Invitation dispatched</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={dispatchState === "DISPATCHING" || dispatchState === "DISPATCHED"}
                  className="w-full h-[42px] rounded-[11px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[13px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2.5px_0_0_#8c6e11] dark:shadow-[0_2.5px_0_0_#a3841e] hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_#8c6e11] dark:hover:shadow-[0_4px_0_0_#a3841e] active:translate-y-0.5 active:shadow-[0_0.5px_0_0_#8c6e11] dark:active:shadow-[0_0.5px_0_0_#a3841e] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0 mt-2"
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
                      <Send className="w-4 h-4 shrink-0" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
}
