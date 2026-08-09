"use client";

import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;

      // Only show when user scrolls down past 120px
      if (currentScroll > 120) {
        setVisible(true);
      } else {
        setVisible(false);
      }

      // Calculate scroll progress percentage (0 - 100)
      if (totalHeight > 0) {
        const pct = Math.min(100, Math.max(0, (currentScroll / totalHeight) * 100));
        setScrollProgress(pct);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // SVG Progress Circle calculation
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out ${
        visible
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
          : "opacity-0 scale-90 translate-y-4 pointer-events-none"
      }`}
    >
      <button
        onClick={scrollToTop}
        type="button"
        aria-label="Scroll back to top of page"
        className="relative flex items-center justify-center w-12 h-12 rounded-full backdrop-blur-md transition-all duration-300 ease-out active:scale-90 focus-ring-brand group cursor-pointer border shadow-2xl
          bg-white/90 text-slate-900 border-slate-200/80 hover:border-amber-500/40 shadow-slate-900/10
          dark:bg-[#0D111A]/90 dark:text-white dark:border-white/15 dark:hover:border-amber-400/40 dark:shadow-black/60"
      >
        {/* SVG Progress Ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 48 48"
        >
          <circle
            cx="24"
            cy="24"
            r={radius}
            className="stroke-slate-200/50 dark:stroke-white/10"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            className="stroke-[#C89B3C] dark:stroke-[#D4AF37] transition-all duration-150 ease-out"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Arrow Icon */}
        <ArrowUp
          className="w-4 h-4 stroke-[2.5] text-[#C89B3C] dark:text-[#D4AF37] transition-transform duration-300 ease-out group-hover:-translate-y-1"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
