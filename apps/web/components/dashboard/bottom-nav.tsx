"use client";

import {
  Home, Focus, Folder, Plus, MoreHorizontal, X
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../auth/auth-context";
import { SinglePromptModal } from "../personal/single-prompt-modal";
import { MORE_SHEET_SHORTCUTS } from "@/config/mobile-nav.config";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

import { useSetRefreshDisabled, useGlobalRefresh } from "@/components/providers/global-refresh-provider";
import { usePWA } from "@/components/providers/pwa-provider";
import { GlobalSheet } from "@/components/ui/global-sheet";

type BottomNavProps = {
  workspace: "personal" | "organization";
  role?: "CEO" | "CO-CEO" | "MEMBER";
};

export function BottomNav({ workspace, role }: BottomNavProps) {
  const { isStandalone } = usePWA();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { triggerRefresh } = useGlobalRefresh();

  const [aiCaptureOpen, setAiCaptureOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  useBodyScrollLock(moreSheetOpen || aiCaptureOpen);
  useSetRefreshDisabled(moreSheetOpen || aiCaptureOpen);

  // If not running in installed PWA mode, do not render bottom navbar in normal mobile browser
  if (!isStandalone) {
    return null;
  }

  const isPersonal = workspace === "personal";
  const userRole = (role || (user?.role || "CEO")).toUpperCase() as "CEO" | "CO-CEO" | "MEMBER";

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

  const isProjectsActive = pathname.includes("/projects");

  const handleTabClick = (e: React.MouseEvent, targetHref: string, isActive: boolean) => {
    e.preventDefault();
    if (isActive) {
      const mainEl = typeof document !== "undefined" ? document.querySelector("main") : null;
      const scrollTop = mainEl ? mainEl.scrollTop : (typeof window !== "undefined" ? window.scrollY : 0);
      if (scrollTop > 15) {
        if (mainEl) {
          mainEl.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        triggerRefresh?.();
      }
    } else {
      router.push(targetHref);
    }
  };

  // Secondary shortcuts model for More Sheet
  const moreShortcuts = MORE_SHEET_SHORTCUTS(isPersonal ? "personal" : "organization", userRole);

  const homeHref = isPersonal ? "/personal/dashboard" : getOrgHref("dashboard");
  const focusHref = isPersonal ? "/personal/focus" : getOrgHref("focus");

  return (
    <>
      {/* PREMIUM iOS 26-INSPIRED LIQUID GLASS BOTTOM NAVIGATION SURFACE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-[max(8px,env(safe-area-inset-bottom))] mb-1 px-3.5 pointer-events-none select-none">
        <div className="flex items-center justify-between max-w-md mx-auto relative pointer-events-auto">
          
          {/* Main Continuous Navigation Translucent White Pill (Home | Projects/Focus | More) */}
          <nav className="flex-1 flex items-center justify-around h-[60px] rounded-[30px] bg-[rgba(255,255,255,0.78)] dark:bg-[#0D0F13]/85 backdrop-blur-md border border-[#D9DDE3] dark:border-white/[0.12] shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)] px-3 mr-2.5">
            
            {/* 1. Home Tab (iOS house icon + "Home" label) */}
            <a
              href={homeHref}
              onClick={(e) => handleTabClick(e, homeHref, isDashboardActive)}
              aria-label="Home"
              className="flex-1 flex flex-col items-center justify-center h-full cursor-pointer transition-transform active:scale-95 py-1"
            >
              <Home
                className={`w-5 h-5 transition-colors ${
                  isDashboardActive
                    ? "text-[#C89B18] dark:text-[#D4B12F] fill-[#C89B18]/15 dark:fill-[#D4B12F]/20 stroke-[2.2]"
                    : "text-[#4B5563] dark:text-[#8E929B] stroke-[1.75]"
                }`}
              />
              <span
                className={`text-[11px] font-semibold tracking-tight leading-none mt-1 transition-colors ${
                  isDashboardActive
                    ? "text-[#C89B18] dark:text-[#D4B12F]"
                    : "text-[#374151] dark:text-[#8E929B]"
                }`}
              >
                Home
              </span>
            </a>

            {/* 2. Projects / Focus Tab (Folder for CEO, Focus for CO-CEO / MEMBER / Personal) */}
            {userRole === "CEO" && !isPersonal ? (
              <a
                href="/ceo/projects"
                onClick={(e) => handleTabClick(e, "/ceo/projects", isProjectsActive)}
                aria-label="Projects"
                className="flex-1 flex flex-col items-center justify-center h-full cursor-pointer transition-transform active:scale-95 py-1"
              >
                <Folder
                  className={`w-5 h-5 transition-colors ${
                    isProjectsActive
                      ? "text-[#C89B18] dark:text-[#D4B12F] fill-[#C89B18]/15 dark:fill-[#D4B12F]/20 stroke-[2.2]"
                      : "text-[#4B5563] dark:text-[#8E929B] stroke-[1.75]"
                  }`}
                />
                <span
                  className={`text-[11px] font-semibold tracking-tight leading-none mt-1 transition-colors ${
                    isProjectsActive
                      ? "text-[#C89B18] dark:text-[#D4B12F]"
                      : "text-[#374151] dark:text-[#8E929B]"
                  }`}
                >
                  Projects
                </span>
              </a>
            ) : (
              <a
                href={focusHref}
                onClick={(e) => handleTabClick(e, focusHref, isFocusActive)}
                aria-label="Focus"
                className="flex-1 flex flex-col items-center justify-center h-full cursor-pointer transition-transform active:scale-95 py-1"
              >
                <Focus
                  className={`w-5 h-5 transition-colors ${
                    isFocusActive
                      ? "text-[#C89B18] dark:text-[#D4B12F] stroke-[2.2]"
                      : "text-[#4B5563] dark:text-[#8E929B] stroke-[1.75]"
                  }`}
                />
                <span
                  className={`text-[11px] font-semibold tracking-tight leading-none mt-1 transition-colors ${
                    isFocusActive
                      ? "text-[#C89B18] dark:text-[#D4B12F]"
                      : "text-[#374151] dark:text-[#8E929B]"
                  }`}
                >
                  Focus
                </span>
              </a>
            )}

            {/* 3. More Tab (iOS Ellipsis icon + "More" label) */}
            <button
              type="button"
              onClick={() => setMoreSheetOpen(true)}
              aria-label="More Shortcuts"
              className="flex-1 flex flex-col items-center justify-center h-full cursor-pointer transition-transform active:scale-95 py-1"
            >
              <MoreHorizontal
                className={`w-5 h-5 transition-colors ${
                  moreSheetOpen
                    ? "text-[#C89B18] dark:text-[#D4B12F] stroke-[2.2]"
                    : "text-[#4B5563] dark:text-[#8E929B] stroke-[1.75]"
                }`}
              />
              <span
                className={`text-[11px] font-semibold tracking-tight leading-none mt-1 transition-colors ${
                  moreSheetOpen
                    ? "text-[#C89B18] dark:text-[#D4B12F]"
                    : "text-[#374151] dark:text-[#8E929B]"
                }`}
              >
                More
              </span>
            </button>

          </nav>

          {/* Premium ManMadhan Gold Floating Action (+) Button */}
          <motion.button
            type="button"
            onClick={() => setAiCaptureOpen(true)}
            aria-label="Quick Action"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative w-[52px] h-[52px] rounded-full bg-[#C89B18] dark:bg-[#D4B12F] text-white dark:text-[#0B0D10] flex items-center justify-center shadow-[0_4px_14px_rgba(200,155,24,0.3)] dark:shadow-[0_8px_20px_rgba(212,177,47,0.3)] border border-[#C89B18]/30 dark:border-[#D4B12F]/40 shrink-0 cursor-pointer overflow-hidden group"
          >
            {/* Centered Clean White (+) Plus Icon */}
            <Plus className="w-6 h-6 stroke-[2.5] text-white dark:text-[#0B0D10] group-active:scale-90 transition-transform duration-150" />
          </motion.button>

        </div>
      </div>

      {/* QUICK ACTION SHEET */}
      <SinglePromptModal
        isOpen={aiCaptureOpen}
        onClose={() => setAiCaptureOpen(false)}
        isPersonal={isPersonal}
      />

      {/* MORE SHORTCUTS BOTTOM SHEET (PORTAL VIA GLOBAL SHEET) */}
      <GlobalSheet
        open={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="Shortcuts"
        subtitle="Quick Access Shortcuts"
        desktopMode="sheet"
      >
        <div className="grid grid-cols-2 gap-2 text-xs py-1">
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
      </GlobalSheet>
    </>
  );
}

export default BottomNav;
