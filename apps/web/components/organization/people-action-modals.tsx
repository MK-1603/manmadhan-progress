"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, UserX, Loader2, X } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  error?: string | null;
  title: string;
  message: string;
  confirmLabel: string;
  variant?: "danger" | "warning" | "primary";
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  error = null,
  title,
  message,
  confirmLabel,
  variant = "danger",
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // Split message into main text and secondary details if newline exists
  const messageLines = message.split("\n\n").filter(Boolean);
  const primaryMsg = messageLines[0] || message;
  const secondaryMsg = messageLines.slice(1).join("\n\n");

  const isCancelInvite = title.toLowerCase().includes("cancel");
  const isDeleteAction = title.toLowerCase().includes("delete") || confirmLabel.toLowerCase().includes("delete");

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      
      {/* Mobile Backdrop Overlay Click */}
      <div className="absolute inset-0" onClick={() => !loading && onClose()} />

      {/* Modal / Bottom Sheet Body */}
      <div className="relative w-full sm:max-w-[480px] bg-[#FFFFFF] dark:bg-[#15191F] border-t sm:border border-[#E5E7EB] dark:border-[#272D36] rounded-t-[22px] sm:rounded-[20px] shadow-2xl z-10 overflow-hidden flex flex-col p-5 sm:p-6 space-y-4 max-h-[90vh] sm:max-h-auto">
        
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-[#E5E7EB] dark:bg-[#272D36] mx-auto shrink-0 mb-1" />

        {/* Top Header Row with Icon, Title, and Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${
                variant === "danger"
                  ? "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
                  : variant === "warning"
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 text-[#B28D18] dark:text-[#C9A52A]"
              }`}
            >
              {variant === "danger" ? <UserX className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <h3 className="text-[17px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight">
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F8F9FA] dark:hover:bg-[#07090D] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Confirmation Message */}
        <div className="space-y-2 text-[13px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
          <p className="text-[#17202A] dark:text-[#F2F4F7] font-medium">{primaryMsg}</p>
          {secondaryMsg && (
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] bg-[#F8F9FA] dark:bg-[#07090D] p-3 rounded-xl border border-[#E5E7EB] dark:border-[#272D36]">
              {secondaryMsg}
            </p>
          )}
        </div>

        {/* Inline Failure Error Banner */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[12.5px] text-rose-600 dark:text-rose-400 font-medium animate-fade-in">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-[#E5E7EB] dark:border-[#272D36]">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-full sm:w-auto h-[42px] px-4 rounded-[11px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[13px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors cursor-pointer disabled:opacity-40"
          >
            {isCancelInvite ? "Keep invitation" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`w-full sm:w-auto h-[42px] px-4 rounded-[11px] text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 shadow-xs ${
              variant === "danger"
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : variant === "warning"
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10]"
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            <span>
              {loading
                ? isDeleteAction
                  ? "Deleting..."
                  : "Processing..."
                : error
                ? "Try again"
                : confirmLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
