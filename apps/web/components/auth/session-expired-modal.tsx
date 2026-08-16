"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LogOut, RefreshCw, X } from "lucide-react";
import Image from "next/image";

export function SessionExpiredModal({ open, onLogin, onClose }: { open: boolean; onLogin: () => void; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-border bg-background text-foreground shadow-2xl dark:shadow-[0_32px_100px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <RefreshCw className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground mb-2">Session Expired</h2>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                For your security, your session has expired due to inactivity. Please sign in again to continue working in your workspace.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onLogin}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold text-black text-xs font-extrabold shadow-[0_0_20px_rgba(200,155,60,0.3)] transition-all cursor-pointer"
                >
                  Return to Login
                </motion.button>
                <button
                  onClick={onClose}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted text-muted-foreground text-xs font-bold hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="bg-background p-4 border-t border-border flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground">
              <LogOut className="w-3 h-3" />
              <span>Secure Session Terminated</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
