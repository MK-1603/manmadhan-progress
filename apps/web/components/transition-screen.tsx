"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

export function TransitionScreen({
  isVisible,
  message = "Connecting..."
}: {
  isVisible: boolean;
  message?: string;
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
            {/* ManMadhan M Logo */}
            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 flex items-center justify-center shadow-lg mb-1">
              <Image
                src="/ios/iTunesArtwork@1x.png"
                alt="ManMadhan Progress Logo"
                width={36}
                height={36}
                priority
                className="rounded"
              />
            </div>

            {/* Minimal Status Label */}
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[#F5F5F2] tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
              <span>{message}</span>
            </div>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
