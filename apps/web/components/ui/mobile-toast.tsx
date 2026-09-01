"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type?: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const MobileToastContext = createContext<ToastContextType | null>(null);

export function useMobileToast() {
  const ctx = useContext(MobileToastContext);
  if (!ctx) {
    throw new Error("useMobileToast must be used within MobileToastProvider");
  }
  return ctx;
}

export function MobileToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return (
    <MobileToastContext.Provider value={{ showToast }}>
      {children}

      {/* TOP PORTAL TOAST OVERLAY (SAFE AREA AWARE) */}
      <div className="fixed top-4 left-0 right-0 z-[10050] pointer-events-none flex flex-col items-center gap-2 px-4 pt-[env(safe-area-inset-top,0px)]">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#11161D]/90 dark:bg-[#181D25]/95 backdrop-blur-md border border-[#29313B] shadow-[0_8px_30px_rgba(0,0,0,0.35)] text-xs font-semibold text-white select-none max-w-sm"
            >
              {t.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {t.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {t.type === "info" && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
              <span className="truncate">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </MobileToastContext.Provider>
  );
}
