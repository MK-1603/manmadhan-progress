"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AuthLoader3D } from "@/components/ui/auth-loader-3d";

export function TransitionScreen({
  isVisible,
  message = "Authenticating...",
  type = "AUTHENTICATING",
}: {
  isVisible: boolean;
  message?: string;
  type?: "AUTHENTICATING" | "LOGGING_OUT" | "SESSION_RESTORING";
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.section
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed inset-0 z-[10000] flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0D11]/95 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center gap-4 relative z-10 select-none text-center px-6"
          >
            <AuthLoader3D message={message} type={type} />
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
