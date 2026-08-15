"use client";

import { motion } from "framer-motion";
import { Github } from "lucide-react";

export function GithubButton({ onClick, isMobile = false, disabled = false }: { onClick?: () => void, isMobile?: boolean, disabled?: boolean }) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        if (onClick && !disabled) onClick();
      }}
      whileTap={disabled ? {} : { scale: 0.99 }}
      className={`flex h-[54px] w-full items-center justify-center gap-3 rounded-[14px] border border-border dark:border-[#2A303A] bg-card dark:bg-[#151920] hover:bg-accent dark:hover:bg-[#181C23] hover:border-border-hover dark:hover:border-[#3A4250] text-sm font-semibold text-foreground dark:text-[#F5F5F2] transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] ${
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer shadow-xs'
      }`}
      aria-label="Continue with GitHub authentication"
    >
      <Github className="w-5 h-5 shrink-0 text-foreground dark:text-[#F5F5F2]" />
      <span>GitHub</span>
    </motion.button>
  );
}
