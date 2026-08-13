"use client";

import { motion } from "framer-motion";

export function GoogleButton({ onClick, isMobile = false, disabled = false }: { onClick?: () => void, isMobile?: boolean, disabled?: boolean }) {
  const hClass = isMobile ? "h-[52px] rounded-[14px]" : "h-14 rounded-2xl";
  
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        if (onClick && !disabled) onClick();
      }}
      whileTap={disabled ? {} : { scale: isMobile ? 0.98 : 0.99 }}
      className={`flex ${hClass} w-full items-center justify-center gap-3 border border-border bg-transparent hover:bg-muted/30 text-[15px] font-semibold text-foreground transition-all focus:outline-none focus:ring-0 outline-none ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
    >
      <img
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google Logo"
        aria-hidden="true"
        className="h-5 w-5"
      />
      <span>Google</span>
    </motion.button>
  );
}
