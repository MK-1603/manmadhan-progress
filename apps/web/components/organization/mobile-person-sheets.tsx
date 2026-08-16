"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ShieldAlert, UserX, Trash2, Copy, Check, MessageSquare, RotateCcw, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  type: "ACTIVE" | "SUSPENDED" | "PENDING";
  onViewDetails: () => void;
  onCopyLink?: () => void;
  onCopyWhatsApp?: () => void;
  onSuspend?: () => void;
  onRestore?: () => void;
  onRemove?: () => void;
  onCancelInvite?: () => void;
}

export function MobilePersonActionSheet({
  isOpen,
  onClose,
  item,
  type,
  onViewDetails,
  onCopyLink,
  onCopyWhatsApp,
  onSuspend,
  onRestore,
  onRemove,
  onCancelInvite,
}: MobileActionSheetProps) {
  const [mounted, setMounted] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !item || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:hidden">
      <div
        onClick={onClose}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[60]"
      />
      
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="relative z-[70] w-full bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E5E7EB] dark:border-[#272D36] rounded-t-[24px] p-5 space-y-4 text-[#17202A] dark:text-[#F2F4F7] select-none pb-[calc(20px+env(safe-area-inset-bottom))]"
      >
        <div className="w-10 h-1 rounded-full bg-[#E5E7EB] dark:bg-[#3F4754] mx-auto mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#272D36]">
          <div className="min-w-0">
            <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">
              {item.name || item.email || item.recipientEmail}
            </h3>
            <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
              {item.role || "Member"} · {item.status || type}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-[#667085] dark:text-[#8B95A5]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions List */}
        <div className="space-y-1 pt-1">
          <button
            onClick={() => { onClose(); onViewDetails(); }}
            className="w-full h-[46px] px-4 rounded-[12px] bg-[#07090D] border border-[#272D36] text-[13px] font-semibold text-[#F2F4F7] flex items-center justify-between"
          >
            <span>View details</span>
            <ChevronRight className="w-4 h-4 text-[#8B95A5]" />
          </button>

          {type === "PENDING" && (
            <>
              {onCopyLink && (
                <button
                  onClick={() => { onClose(); onCopyLink(); }}
                  className="w-full h-[46px] px-4 rounded-[12px] bg-[#07090D] border border-[#272D36] text-[13px] font-semibold text-[#F2F4F7] flex items-center justify-between"
                >
                  <span>Copy invite link</span>
                  <Copy className="w-4 h-4 text-[#8B95A5]" />
                </button>
              )}

              {onCopyWhatsApp && (
                <button
                  onClick={() => { onClose(); onCopyWhatsApp(); }}
                  className="w-full h-[46px] px-4 rounded-[12px] bg-[#07090D] border border-[#272D36] text-[13px] font-semibold text-[#F2F4F7] flex items-center justify-between"
                >
                  <span>Copy WhatsApp message</span>
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                </button>
              )}

              {onCancelInvite && (
                <button
                  onClick={() => { onClose(); onCancelInvite(); }}
                  className="w-full h-[46px] px-4 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-[13px] font-bold text-rose-400 flex items-center justify-between"
                >
                  <span>Cancel invitation</span>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {type === "ACTIVE" && onSuspend && (
            <button
              onClick={() => { onClose(); onSuspend(); }}
              className="w-full h-[46px] px-4 rounded-[12px] bg-amber-500/10 border border-amber-500/20 text-[13px] font-bold text-amber-400 flex items-center justify-between"
            >
              <span>Suspend access</span>
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}

          {type === "SUSPENDED" && onRestore && (
            <button
              onClick={() => { onClose(); onRestore(); }}
              className="w-full h-[46px] px-4 rounded-[12px] bg-emerald-500/10 border border-emerald-500/20 text-[13px] font-bold text-emerald-400 flex items-center justify-between"
            >
              <span>Restore access</span>
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {(type === "ACTIVE" || type === "SUSPENDED") && onRemove && (
            <button
              onClick={() => { onClose(); onRemove(); }}
              className="w-full h-[46px] px-4 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-[13px] font-bold text-rose-400 flex items-center justify-between"
            >
              <span>Remove from organization</span>
              <UserX className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

interface MobilePersonDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
}

export function MobilePersonDetailsSheet({ isOpen, onClose, item }: MobilePersonDetailsSheetProps) {
  const [mounted, setMounted] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !item || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:hidden">
      <div
        onClick={onClose}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[60]"
      />
      
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        data-scrollable="true"
        className="relative z-[70] w-full max-h-[85dvh] overflow-y-auto overscroll-contain touch-pan-y bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E5E7EB] dark:border-[#272D36] rounded-t-[24px] p-5 space-y-4 text-[#17202A] dark:text-[#F2F4F7] select-none pb-[calc(20px+env(safe-area-inset-bottom))]"
      >
        <div className="w-10 h-1 rounded-full bg-[#E5E7EB] dark:bg-[#3F4754] mx-auto mb-1" />

        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#272D36]">
          <div>
            <h3 className="text-[17px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{item.name || item.email}</h3>
            <p className="text-[12px] text-[#B28D18] dark:text-[#C9A52A] font-semibold">{item.role || "Member"} · {item.status || "ACTIVE"}</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#667085] dark:text-[#8B95A5]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-[13px]">
          <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-1">
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase">EMAIL</span>
            <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{item.email || "—"}</p>
          </div>

          <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-1">
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase">EMPLOYEE / BATCH ID</span>
            <p className="font-semibold text-[#B28D18] dark:text-[#C9A52A] font-mono">{item.batchId || "—"}</p>
          </div>

          <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-1">
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase">SUPERVISOR</span>
            <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{item.supervisor || "—"}</p>
          </div>

          <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase">PROGRESS</span>
              <span className="font-mono font-bold text-[#17202A] dark:text-[#F2F4F7]">{item.progress != null ? `${item.progress}%` : "—"}</span>
            </div>
            {item.progress != null && (
              <div className="h-2 w-full bg-[#E5E7EB] dark:bg-[#15191F] rounded-full overflow-hidden">
                <div className="h-full bg-[#B28D18] dark:bg-[#C9A52A] rounded-full" style={{ width: `${item.progress}%` }} />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
