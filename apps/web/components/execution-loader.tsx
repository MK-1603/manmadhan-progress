"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const messages = ["Initializing", "Loading Modules", "Preparing Workspace", "Almost Ready"];

export function ExecutionLoader() {
  const [message, setMessage] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setMessage((current) => Math.min(current + 1, messages.length - 1)), 560); return () => window.clearInterval(timer); }, []);
  return <div className="mt-9 flex flex-col items-center"><div className="relative h-0.5 w-[220px] overflow-visible rounded-full bg-slate-300 dark:bg-white/10"><motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2.35, ease: "linear" }} className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-amber-600 via-[#C89B3C] to-[#DDB85A]" /><motion.span initial={{ left: 0, opacity: 0 }} animate={{ left: "100%", opacity: [0, 1, 1, 0] }} transition={{ duration: 2.35, ease: "linear" }} className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#DDB85A] shadow-[0_0_10px_2px_rgba(200,155,60,.55)]" /></div><div className="mt-4 h-4 text-center text-[11px] font-medium tracking-wide text-slate-600 dark:text-slate-400"><AnimatePresence mode="wait"><motion.span key={message} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .2 }}>{messages[message]}...</motion.span></AnimatePresence></div></div>;
}
