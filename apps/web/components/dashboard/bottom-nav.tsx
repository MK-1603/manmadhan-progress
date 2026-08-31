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

type BottomNavProps = {
  workspace: "personal" | "organization";
  role?: "CEO" | "CO-CEO" | "MEMBER";
};

export function BottomNav({ workspace, role }: BottomNavProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { triggerRefresh } = useGlobalRefresh();

  const [aiCaptureOpen, setAiCaptureOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  useBodyScrollLock(moreSheetOpen || aiCaptureOpen);
  useSetRefreshDisabled(moreSheetOpen || aiCaptureOpen);

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
      const scrollY = typeof window !== "undefined" ? (window.scrollY || document.documentElement.scrollTop || 0) : 0;
      if (scrollY > 15) {
        window.scrollTo({ top: 0, behavior: "smooth" });
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

      {/* MORE SHORTCUTS BOTTOM SHEET */}
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

export default BottomNav;
