"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AnimatedBackground } from "./animated-background";
import { AnimatedLogo } from "./animated-logo";
import { ExecutionLoader } from "./execution-loader";
import { useSplashScreen } from "../hooks/use-splash-screen";

function Arc({ className, duration, delay }: { className: string; duration: number; delay: number }) {
  return <motion.div animate={{ rotate: 360 }} transition={{ duration, delay, repeat: Infinity, ease: "linear" }} className={`absolute rounded-full border border-transparent border-l-amber-600/40 dark:border-l-[#DDB85A]/35 border-t-[#C89B3C]/30 dark:border-t-[#C89B3C]/20 ${className}`} />;
}

export function SplashScreen() {
  const visible = useSplashScreen();
  return <AnimatePresence>
    {visible && <motion.section role="status" aria-live="polite" aria-label="Preparing ManMadhan Progress" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .45, ease: "easeInOut" }} className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-white dark:bg-[#09090B] transition-colors duration-300">
      <AnimatedBackground />
      <motion.div initial={{ opacity: 0, scale: 1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.035 }} transition={{ duration: .45 }} className="relative z-10 flex -translate-y-2 flex-col items-center text-center">
        <div className="relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64 lg:h-72 lg:w-72"><Arc duration={18} delay={0} className="inset-0" /><Arc duration={25} delay={-.8} className="inset-4 rotate-45 opacity-70" /><Arc duration={32} delay={-1.6} className="inset-8 -rotate-12 opacity-50" /><div className="absolute inset-[22%] rounded-full bg-[#C89B3C]/[0.08] dark:bg-[#C89B3C]/[0.055] blur-2xl" /><AnimatedLogo /></div>
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, delay: .5 }} className="mt-3 text-xl font-bold tracking-[-0.02em] text-slate-900 dark:text-white">ManMadhan <span className="text-amber-700 dark:text-[#DDB85A]">Progress</span></motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4, delay: .7 }} className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Execution Operating System</motion.p>
        <ExecutionLoader />
      </motion.div>
    </motion.section>}
  </AnimatePresence>;
}
