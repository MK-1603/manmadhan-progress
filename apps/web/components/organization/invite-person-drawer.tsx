"use client";

import React, { useState, useEffect } from "react";
import { X, Send, Loader2, AlertCircle, CheckCircle2, Shield, User, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { GlobalSheet } from "@/components/ui/global-sheet";

interface InvitePersonDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInv?: any) => void;
}

type DispatchState = "READY" | "DISPATCHING" | "DISPATCHED" | "FAILED";

export function InvitePersonDrawer({ isOpen, onClose, onSuccess }: InvitePersonDrawerProps) {
  const [batchId, setBatchId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"CO-CEO" | "MEMBER">("MEMBER");
  const [managerId, setManagerId] = useState("");

  const [coCeos, setCoCeos] = useState<any[]>([]);
  const [dispatchState, setDispatchState] = useState<DispatchState>("READY");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch available CO-CEOs when drawer opens
  useEffect(() => {
    if (isOpen) {
      setDispatchState("READY");
      setErrorMsg("");
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (workspaceId) {
        apiClient
          .get(`/organization/co-ceos?workspaceId=${workspaceId}`)
          .then((res) => {
            if (res.data.success) {
              const list = res.data.coCeos || res.data.data || [];
              setCoCeos(list);
              if (list.length > 0 && !managerId) {
                setManagerId(list[0].id || list[0].userId || "");
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Server-First Dispatch Handler
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Email address is required.");
      return;
    }
    setErrorMsg("");
    setDispatchState("DISPATCHING");

    try {
      const workspaceId = localStorage.getItem("workspaceId");
      
      // Perform actual backend send
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

      if (res.data.success) {
        setDispatchState("DISPATCHED");
        const createdInv = res.data.data || res.data.invitation;
        
        // Auto transition after 1.6s
        setTimeout(() => {
          setEmail("");
          setBatchId("");
          setDispatchState("READY");
          onSuccess(createdInv);
          onClose();
        }, 1600);
      } else {
        setDispatchState("FAILED");
        setErrorMsg(res.data.error || "Invitation couldn't be dispatched.");
      }
    } catch (err: any) {
      setDispatchState("FAILED");
      setErrorMsg(err.response?.data?.error || err.message || "Invitation couldn't be dispatched.");
    }
  };

  return (
    <GlobalSheet open={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full bg-[#15191F] text-[#F2F4F7] p-5 sm:p-6 select-none overflow-y-auto space-y-5">
        
        {/* Drawer Header */}
        <div className="space-y-1.5 pb-4 border-b border-[#272D36]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#C9A52A]">
              ORGANIZATION DISPATCH
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#8B95A5] hover:text-[#F2F4F7] hover:bg-[#1E242C] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-[20px] font-bold text-[#F2F4F7] tracking-tight leading-tight">
            Invite person
          </h2>
          <p className="text-[12.5px] text-[#8B95A5]">
            Send an organization invitation and assign their execution role.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            
            {/* Error Message Alert */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[12px] font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchState("READY")}
                  className="text-[11px] font-bold underline shrink-0 ml-2"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Batch / Employee ID */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#8B95A5]">
                BATCH / EMPLOYEE ID (OPTIONAL)
              </label>
              <input
                type="text"
                disabled={dispatchState !== "READY" && dispatchState !== "FAILED"}
                placeholder="e.g. MM1107"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full h-[42px] px-3.5 bg-[#07090D] border border-[#272D36] rounded-[11px] text-[13px] text-[#F2F4F7] placeholder-[#667085] outline-none focus:border-[#C9A52A] transition-colors disabled:opacity-50"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#8B95A5]">
                EMAIL ADDRESS <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                disabled={dispatchState !== "READY" && dispatchState !== "FAILED"}
                placeholder="arun@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[42px] px-3.5 bg-[#07090D] border border-[#272D36] rounded-[11px] text-[13px] text-[#F2F4F7] placeholder-[#667085] outline-none focus:border-[#C9A52A] transition-colors disabled:opacity-50"
              />
            </div>

            {/* Role Selector */}
            <div className="space-y-2 pt-1">
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#8B95A5]">
                ORGANIZATION ROLE
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={dispatchState !== "READY" && dispatchState !== "FAILED"}
                  onClick={() => setRole("MEMBER")}
                  className={`p-3.5 rounded-[14px] border text-left transition-all cursor-pointer ${
                    role === "MEMBER"
                      ? "bg-[#C9A52A]/15 border-[#C9A52A] text-[#F2F4F7] shadow-xs"
                      : "bg-[#07090D] border-[#272D36] text-[#8B95A5] hover:border-[#3F4754]"
                  }`}
                >
                  <p className="text-[13px] font-bold text-[#F2F4F7]">MEMBER</p>
                  <p className="text-[11px] text-[#8B95A5] mt-0.5 leading-snug">
                    Execution & Development
                  </p>
                </button>

                <button
                  type="button"
                  disabled={dispatchState !== "READY" && dispatchState !== "FAILED"}
                  onClick={() => setRole("CO-CEO")}
                  className={`p-3.5 rounded-[14px] border text-left transition-all cursor-pointer ${
                    role === "CO-CEO"
                      ? "bg-[#C9A52A]/15 border-[#C9A52A] text-[#F2F4F7] shadow-xs"
                      : "bg-[#07090D] border-[#272D36] text-[#8B95A5] hover:border-[#3F4754]"
                  }`}
                >
                  <p className="text-[13px] font-bold text-[#F2F4F7]">CO-CEO</p>
                  <p className="text-[11px] text-[#8B95A5] mt-0.5 leading-snug">
                    Leadership & Delegation
                  </p>
                </button>
              </div>
            </div>

            {/* Assigned CO-CEO Selector */}
            {role === "MEMBER" && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#8B95A5]">
                  ASSIGNED CO-CEO
                </label>
                {coCeos.length > 0 ? (
                  <select
                    disabled={dispatchState !== "READY" && dispatchState !== "FAILED"}
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full h-[42px] px-3.5 bg-[#07090D] border border-[#272D36] rounded-[11px] text-[13px] text-[#F2F4F7] outline-none focus:border-[#C9A52A] cursor-pointer"
                  >
                    {coCeos.map((c) => (
                      <option key={c.id || c.userId} value={c.id || c.userId}>
                        {c.displayName || c.name || c.user?.name || c.email} (CO-CEO)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-[12px] bg-[#07090D] border border-[#272D36] text-[#8B95A5] text-[12px] leading-relaxed flex items-start gap-2.5">
                    <User className="w-4 h-4 text-[#C9A52A] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#F2F4F7] text-[12px]">No active CO-CEO available.</p>
                      <p className="text-[11.5px] text-[#8B95A5]">This member will report directly to the CEO.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3D Dispatch Animation Visual Container */}
          <div className="pt-4 border-t border-[#272D36] space-y-3">
            
            {/* DISPATCH VISUAL SEQUENCE */}
            <AnimatePresence mode="wait">
              {dispatchState === "DISPATCHING" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 rounded-[14px] bg-[#07090D] border border-[#C9A52A]/30 flex flex-col items-center justify-center space-y-3 relative overflow-hidden"
                >
                  {/* Subtle Trajectory Line & Card Lift */}
                  <div className="relative w-full h-[52px] flex items-center justify-between px-6">
                    {/* Origin Button Circle */}
                    <div className="w-7 h-7 rounded-full bg-[#C9A52A]/20 border border-[#C9A52A] flex items-center justify-center text-[#C9A52A]">
                      <Send className="w-3.5 h-3.5" />
                    </div>

                    {/* Trajectory Motion Line */}
                    <div className="flex-1 h-[2px] mx-3 relative bg-[#272D36] overflow-hidden rounded-full">
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                        className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#C9A52A] to-transparent"
                      />
                    </div>

                    {/* Traveling Card Document */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.6 }}
                      animate={{ scale: [0.8, 1.05, 1], opacity: 1 }}
                      transition={{ duration: 0.6 }}
                      className="w-8 h-8 rounded-lg bg-[#C9A52A] text-[#0B0D10] font-bold flex items-center justify-center shadow-lg shadow-[#C9A52A]/20"
                    >
                      <Shield className="w-4 h-4 fill-current" />
                    </motion.div>
                  </div>

                  <p className="text-[12px] font-semibold text-[#C9A52A] animate-pulse">
                    Dispatching organization invitation...
                  </p>
                </motion.div>
              )}

              {dispatchState === "DISPATCHED" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-[14px] bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-2.5 text-emerald-400"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-[13px] font-bold">Invitation dispatched</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={dispatchState !== "READY" && dispatchState !== "FAILED"}
              className="w-full h-[46px] rounded-[12px] bg-[#C9A52A] text-[#0B0D10] text-[13.5px] font-bold shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {dispatchState === "DISPATCHING" ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0B0D10]" />
                  <span>Dispatching...</span>
                </div>
              ) : dispatchState === "DISPATCHED" ? (
                <span>✓ Dispatched</span>
              ) : (
                <>
                  <span>Send invitation</span>
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </GlobalSheet>
  );
}
