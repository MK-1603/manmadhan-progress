"use client";

import React from "react";
import { Trash2, AlertTriangle, X, Loader2 } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  count?: number;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationModal({
  isOpen,
  title,
  description,
  count = 1,
  isSubmitting = false,
  onClose,
  onConfirm,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const displayTitle = title || (count > 1 ? `Delete ${count} Projects?` : "Delete Project?");
  const displayDescription =
    description ||
    (count > 1
      ? `Are you sure you want to permanently delete the ${count} selected projects? This action cannot be undone.`
      : "Are you sure you want to permanently delete this project? This action cannot be undone.");

  return (
    <div className="fixed inset-0 w-screen h-screen z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-x-hidden">
      <div className="w-full sm:max-w-md bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-t-[20px] sm:rounded-[16px] shadow-2xl overflow-hidden font-sans p-6 space-y-5">
        
        {/* Icon & Header */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-snug">
              {displayTitle}
            </h3>
            <p className="text-[13px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
              {displayDescription}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-[#667085] hover:bg-[#E4E7EC] dark:hover:bg-[#272D36] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-[40px] px-4 rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] text-[13px] font-semibold transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="h-[40px] px-5 rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Delete {count > 1 ? "Projects" : "Project"}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
