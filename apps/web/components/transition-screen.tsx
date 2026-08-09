"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AnimatedBackground } from "./animated-background";
import { AnimatedLogo } from "./animated-logo";

function Arc({ className, duration, delay }: { className: string; duration: number; delay: number }) {
  return (
    <motion.div 
      animate={{ rotate: 360 }} 
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }} 
      className={`absolute rounded-full border border-transparent border-l-amber-600/40 dark:border-l-[#DDB85A]/35 border-t-[#C89B3C]/30 dark:border-t-[#C89B3C]/20 ${className}`} 
    />
  );
}

export function TransitionScreen({ isVisible, message = "Authenticating..." }: { isVisible: boolean, message?: string }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.section 
          role="status" 
          aria-live="polite" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.3, ease: "easeInOut" }} 
          className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-white/95 dark:bg-[#09090B]/95 backdrop-blur-md transition-colors duration-300"
        >
          <AnimatedBackground />
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }} 
            transition={{ duration: 0.3 }} 
            className="flex flex-col items-center justify-center gap-5 relative z-10"
          >
            <div className="relative flex h-32 w-32 items-center justify-center">
              <Arc duration={18} delay={0} className="inset-0" />
              <Arc duration={25} delay={-0.8} className="inset-3 rotate-45 opacity-70" />
              <div className="absolute inset-[22%] rounded-full bg-[#C89B3C]/[0.08] dark:bg-[#C89B3C]/[0.055] blur-xl" />
              <AnimatedLogo />
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              className="px-5 py-2 rounded-full bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white border border-zinc-700/50 text-xs font-bold tracking-widest uppercase shadow-xl flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span>{message}</span>
            </motion.div>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
