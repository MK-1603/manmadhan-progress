"use client";

import { motion } from "framer-motion";

export function GoogleButton({
  onClick,
  isMobile = false,
  disabled = false,
  subtext
}: {
  onClick?: () => void;
  isMobile?: boolean;
  disabled?: boolean;
  subtext?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick();
      }}
      whileTap={disabled ? {} : { scale: 0.99 }}
      className={`flex h-[54px] w-full items-center justify-center gap-3 rounded-[14px] border px-4 transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] ${
        disabled
          ? "border-border/60 dark:border-[#282E38] bg-muted/30 dark:bg-[#151920]/60 text-muted-foreground dark:text-[#9299A8] cursor-not-allowed opacity-80"
          : "border-border dark:border-[#2A303A] bg-card dark:bg-[#151920] hover:bg-accent dark:hover:bg-[#181C23] hover:border-border-hover dark:hover:border-[#3A4250] text-foreground dark:text-[#F5F5F2] cursor-pointer shadow-xs"
      }`}
      aria-label="Continue with Google authentication"
    >
      <img
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google Logo"
        aria-hidden="true"
        className={`w-5 h-5 shrink-0 object-contain ${disabled ? "opacity-60 grayscale-[40%]" : ""}`}
      />
      <div className="flex flex-col items-center justify-center leading-tight">
        <span className="text-sm font-semibold">Continue with Google</span>
        {subtext && (
          <span className="text-[10px] text-muted-foreground/80 dark:text-[#9299A8] font-normal mt-0.5">
            {subtext}
          </span>
        )}
      </div>
    </motion.button>
  );
}
