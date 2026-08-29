"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function GoogleButton({
  onClick,
  isMobile = false,
  disabled = false,
  isLoading = false,
  subtext
}: {
  onClick?: () => void;
  isMobile?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  subtext?: string;
}) {
  const isInteractive = !disabled && !isLoading;

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        if (isInteractive && onClick) onClick();
      }}
      whileTap={isInteractive ? { scale: 0.99 } : {}}
      disabled={!isInteractive}
      className={`flex h-[54px] w-full items-center justify-center gap-3 rounded-[14px] border px-4 transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] ${
        !isInteractive
          ? "border-border/60 dark:border-[#252B35] bg-muted/30 dark:bg-[#161B26]/60 text-muted-foreground dark:text-[#626A75] cursor-not-allowed opacity-80"
          : "border-border dark:border-[#252B35] bg-card dark:bg-[#161B26] hover:bg-accent dark:hover:bg-[#1C222F] hover:border-border-hover dark:hover:border-[#343B46] text-foreground dark:text-[#F3FFF0] cursor-pointer shadow-xs active:scale-[0.99]"
      }`}
      aria-label={isLoading ? "Authenticating with Google" : "Continue with Google authentication"}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 shrink-0 animate-spin text-[#D4AF37]" />
      ) : (
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google Logo"
          aria-hidden="true"
          className={`w-5 h-5 shrink-0 object-contain ${disabled ? "opacity-60 grayscale-[40%]" : ""}`}
        />
      )}
      <div className="flex flex-col items-center justify-center leading-tight">
        <span className="text-sm font-semibold">
          {isLoading ? "Authenticating..." : "Continue with Google"}
        </span>
        {subtext && !isLoading && (
          <span className="text-[10px] text-muted-foreground/80 dark:text-[#8E949E] font-normal mt-0.5">
            {subtext}
          </span>
        )}
      </div>
    </motion.button>
  );
}
