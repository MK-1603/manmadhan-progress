"use client";

import {
  LayoutDashboard, Focus, Plus, MoreHorizontal, X, LogOut
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../auth/auth-context";
import { SinglePromptModal } from "../personal/single-prompt-modal";
import { MORE_SHEET_SHORTCUTS } from "@/config/mobile-nav.config";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

import { useSetRefreshDisabled } from "@/components/providers/global-refresh-provider";

type BottomNavProps = {
  workspace: "personal" | "organization";
  role?: "CEO" | "CO-CEO" | "MEMBER";
};

export function BottomNav({ workspace, role }: BottomNavProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [aiCaptureOpen, setAiCaptureOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  useBodyScrollLock(moreSheetOpen || aiCaptureOpen);
  useSetRefreshDisabled(moreSheetOpen || aiCaptureOpen);

  const isPersonal = workspace === "personal";
  const userRole = (role || (user?.role || "CEO")).toUpperCase() as "CEO" | "CO-CEO" | "MEMBER";
  const userName = user?.displayName || user?.name || user?.email?.split("@")[0] || "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const getOrgHref = (page: string) => {
    if (userRole === "CO-CEO") return `/co-ceo/${page}`;
    if (userRole === "MEMBER") return `/member/${page}`;
    return `/ceo/${page}`;
  };

  const isDashboardActive = isPersonal 
    ? pathname === "/personal/dashboard" 
    : pathname.includes("/dashboard");

  const isFocusActive = isPersonal 
    ? pathname === "/personal/focus" 
    : pathname.includes("/focus");

  const isProfileActive = pathname.includes("/profile");

  const profileHref = isPersonal ? "/personal/profile" : getOrgHref("profile");

  // Secondary shortcuts model for More Sheet (6–8 primary shortcuts only)
  const moreShortcuts = MORE_SHEET_SHORTCUTS(isPersonal ? "personal" : "organization", userRole);

  return (
    <>
      {/* FINAL ICON-ONLY IOS-STYLE BOTTOM NAVIGATION SURFACE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-[max(10px,env(safe-area-inset-bottom))] px-3 pointer-events-none select-none">
        <div className="flex items-center justify-between max-w-md mx-auto relative pointer-events-auto">
          
          {/* Main Continuous Navigation Surface (Icon-Only: Dashboard | Focus | Profile | More) */}
          <nav className="flex-1 flex items-center justify-around h-[58px] rounded-[28px] bg-[#FFFFFF]/92 dark:bg-[#14171C]/92 backdrop-blur-md border border-[#14191E]/[0.08] dark:border-white/[0.10] shadow-lg px-2 mr-2.5">
            
            {/* 1. Dashboard Icon */}
            <Link
              href={isPersonal ? "/personal/dashboard" : getOrgHref("dashboard")}
              aria-label="Dashboard"
              className="flex-1 flex items-center justify-center h-full cursor-pointer transition-transform active:scale-95"
            >
              <LayoutDashboard
                className={`w-5.5 h-5.5 transition-colors ${
                  isDashboardActive
                    ? "text-[#D4B12F]"
                    : "text-[#667085] dark:text-[#8B94A3]"
                }`}
              />
            </Link>

            {/* 2. Focus Icon */}
            <Link
              href={isPersonal ? "/personal/focus" : getOrgHref("focus")}
              aria-label="Focus"
              className="flex-1 flex items-center justify-center h-full cursor-pointer transition-transform active:scale-95"
            >
              <Focus
                className={`w-5.5 h-5.5 transition-colors ${
                  isFocusActive
                    ? "text-[#D4B12F]"
                    : "text-[#667085] dark:text-[#8B94A3]"
                }`}
              />
            </Link>

            {/* 3. Bottom Profile SK Avatar — REAL NAVIGATION DESTINATION (Navigates directly to Profile Page) */}
            <Link
              href={profileHref}
              aria-label="Profile Page"
              className="flex-1 flex items-center justify-center h-full cursor-pointer transition-transform active:scale-95"
            >
              <div
                className={`w-[36px] h-[36px] rounded-full flex items-center justify-center font-bold text-xs font-mono shrink-0 transition-all ${
                  isProfileActive
                    ? "bg-[#D4B12F]/25 border-2 border-[#D4B12F] text-[#D4B12F] shadow-xs"
                    : "bg-[#D4B12F]/15 dark:bg-[#D4B12F]/15 border border-[#D4B12F]/25 text-[#B28D18] dark:text-[#D4B12F]"
                }`}
                suppressHydrationWarning
              >
                {userInitials}
              </div>
            </Link>

            {/* 4. More Icon (3 Dots) */}
            <button
              type="button"
              onClick={() => setMoreSheetOpen(true)}
              aria-label="More Shortcuts"
              className="flex-1 flex items-center justify-center h-full cursor-pointer transition-transform active:scale-95"
            >
              <MoreHorizontal
                className={`w-5.5 h-5.5 transition-colors ${
                  moreSheetOpen
                    ? "text-[#D4B12F]"
                    : "text-[#667085] dark:text-[#8B94A3]"
                }`}
              />
            </button>

          </nav>

          {/* Special Floating Action (+) Positioned at the Right Side */}
          <button
            type="button"
            onClick={() => setAiCaptureOpen(true)}
            aria-label="Quick Action"
            className="w-[52px] h-[52px] rounded-full bg-[#D4B12F] text-[#111111] flex items-center justify-center transition-transform active:scale-95 shadow-md border border-[#D4B12F]/40 shrink-0 cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>

        </div>
      </div>

      {/* 4. QUICK ACTION SHEET */}
      <SinglePromptModal
        isOpen={aiCaptureOpen}
        onClose={() => setAiCaptureOpen(false)}
        isPersonal={isPersonal}
      />

      {/* 2. MORE SHEET (Compact Secondary Shortcuts Sheet 45–60vh) */}
      <AnimatePresence>
        {moreSheetOpen && (
          <div className="fixed inset-0 z-[10000] md:hidden">
            {/* Backdrop Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreSheetOpen(false)}
              className="fixed inset-0 bg-black/60 z-[10000]"
            />

            {/* Compact Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 500) {
                  setMoreSheetOpen(false);
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-[10001] bg-[#FFFFFF] dark:bg-[#15181D] rounded-t-[22px] border-t border-[#E4E7EC] dark:border-[#292F38] shadow-2xl flex flex-col max-h-[58vh] pb-[max(16px,env(safe-area-inset-bottom))] p-4 select-none"
            >
              {/* Drag Handle (36px x 4px) */}
              <div className="w-full flex justify-center pt-1 pb-3 shrink-0">
                <div className="w-9 h-1 rounded-full bg-[#E4E7EC] dark:bg-[#292F38]" />
              </div>

              {/* Sheet Header */}
              <div className="pb-3 mb-2 border-b border-[#E4E7EC] dark:border-[#292F38] shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    Shortcuts
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMoreSheetOpen(false)}
                    aria-label="Close"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[12px] font-medium text-[#667085] dark:text-[#8B94A3] mt-0.5 block">
                  Quick Access Shortcuts
                </span>
              </div>

              {/* Compact Shortcuts List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="grid grid-cols-2 gap-2">
                  {moreShortcuts.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMoreSheetOpen(false)}
                      className="flex items-center gap-2.5 h-[46px] px-3 rounded-xl border border-[#E4E7EC] dark:border-[#292F38] bg-[#F8F9FA] dark:bg-[#181C22] text-xs font-medium text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] transition-colors"
                    >
                      <item.icon className="w-4.5 h-4.5 text-[#D4B12F] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
