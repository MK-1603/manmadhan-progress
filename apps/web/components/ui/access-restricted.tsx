"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export function AccessRestricted({
  title = "Access Restricted",
  description = "You don't have permission to access this organization area.",
  dashboardHref = "/member/dashboard",
}: {
  title?: string;
  description?: string;
  dashboardHref?: string;
}) {
  return (
    <div className="w-full h-full flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F9FAFB] dark:bg-[#060806] text-[#17202A] dark:text-[#F2F4F7] select-none min-h-[60vh]">
      <div className="max-w-md mx-auto space-y-4 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-[#17202A] dark:text-[#F2F4F7]">
            {title}
          </h2>
          <p className="text-sm text-[#667085] dark:text-[#8B95A5] leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        </div>
        <Link
          href={dashboardHref}
          className="h-[44px] px-5 rounded-[12px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:opacity-95 active:scale-95 transition-all mt-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}

export default AccessRestricted;
