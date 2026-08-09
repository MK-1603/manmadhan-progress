"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "./auth/auth-context";

export function GetStartedButton() {
  const { open } = useAuth();

  return (
    <>
      {/* Desktop & Tablet: Ultra Premium Button */}
      <button
        type="button"
        onClick={open}
        aria-label="Get Started with ManMadhan Progress"
        className="relative hidden md:inline-flex items-center gap-2 h-10 px-5 rounded-[0.85rem] font-bold text-xs md:text-sm transition-all duration-300 active:scale-[0.97] group cursor-pointer overflow-hidden border border-slate-900/10 dark:border-white/10
          bg-gradient-to-b from-slate-800 to-slate-950 text-white shadow-[0_4px_14px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.15)] 
          dark:from-white dark:to-slate-100 dark:text-slate-900 dark:shadow-[0_4px_14px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.15),inset_0_-1px_1px_rgba(0,0,0,0.05)]"
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent transition-transform duration-700 ease-in-out skew-x-12" />
        
        <span className="relative z-10 tracking-tight font-extrabold drop-shadow-sm">Get Started</span>
        <ArrowUpRight className="relative z-10 w-4 h-4 stroke-[2.5] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-slate-300 dark:text-slate-500 group-hover:text-white dark:group-hover:text-slate-900 drop-shadow-sm" aria-hidden="true" />
      </button>

      {/* Mobile: Ultra Premium Minimalist Button */}
      <button
        type="button"
        onClick={open}
        aria-label="Get Started"
        className="relative md:hidden flex items-center justify-center min-w-[38px] min-h-[38px] w-10 h-10 rounded-[0.85rem] transition-all duration-300 active:scale-[0.97] group cursor-pointer overflow-hidden border border-slate-900/10 dark:border-white/10
          bg-gradient-to-b from-slate-800 to-slate-950 text-white shadow-[0_4px_14px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.15)]
          dark:from-white dark:to-slate-100 dark:text-slate-900 dark:shadow-[0_4px_14px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.15),inset_0_-1px_1px_rgba(0,0,0,0.05)]"
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent transition-transform duration-700 ease-in-out skew-x-12" />
        
        <ArrowUpRight className="relative z-10 w-4.5 h-4.5 stroke-[2.5] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 drop-shadow-sm" aria-hidden="true" />
      </button>
    </>
  );
}
