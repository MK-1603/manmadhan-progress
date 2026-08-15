"use client";

import { Menu, X, Settings, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationDropdown } from "./notification-dropdown";
import { ProfileDropdown } from "./profile-dropdown";
import { useAuth } from "../auth/auth-context";
import {
  PERSONAL_MOBILE_NAV,
  ORGANIZATION_MOBILE_NAV,
  NavSection,
} from "@/config/mobile-nav.config";

type MobileHeaderProps = {
  activePopover?: "none" | "search" | "notifications" | "profile" | "switcher";
  setActivePopover?: (val: "none" | "search" | "notifications" | "profile" | "switcher") => void;
  workspaceType?: "personal" | "organization";
  pageTitle?: string;
  role?: "CEO" | "CO-CEO" | "MEMBER";
};

export function MobileHeader({
  activePopover,
  setActivePopover,
  workspaceType,
  pageTitle,
  role,
}: MobileHeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isPersonal = workspaceType
    ? workspaceType === "personal"
    : pathname?.startsWith("/personal");

  const userRole = (role || (user?.role || "CEO")).toUpperCase() as "CEO" | "CO-CEO" | "MEMBER";
  const userName = user?.displayName || user?.name || "Sai Krishnan S";
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

  const checkIsItemActive = (href: string) => {
    if (pathname === href) return true;
    if (href.endsWith("/dashboard") || href.endsWith("/focus")) return false;
    return pathname?.startsWith(href + "/");
  };

  const getPageTitle = () => {
    if (pageTitle) return pageTitle;
    if (!pathname) return "Dashboard";
    if (pathname.includes("/dashboard")) return "Dashboard";
    if (pathname.includes("/focus")) return "Focus";
    if (pathname.includes("/projects")) return "Projects";
    if (pathname.includes("/tasks")) return "Tasks";
    if (pathname.includes("/calendar")) return "Calendar";
    if (pathname.includes("/timeline")) return "Timeline";
    if (pathname.includes("/journal")) return "Journal";
    if (pathname.includes("/books")) return "Books";
    if (pathname.includes("/podcasts")) return "Podcasts";
    if (pathname.includes("/learning")) return "Learning";
    if (pathname.includes("/notes")) return "Notes";
    if (pathname.includes("/documents")) return "Documents";
    if (pathname.includes("/ai-builder")) return "AI Builder";
    if (pathname.includes("/prompt-library")) return "Prompt Library";
    if (pathname.includes("/automation")) return "Automation";
    if (pathname.includes("/reminders")) return "Reminders";
    if (pathname.includes("/reports")) return "Reports";
    if (pathname.includes("/co-ceos")) return "CO-CEOs";
    if (pathname.includes("/members")) return "Members";
    if (pathname.includes("/invitations")) return "Invitations";
    if (pathname.includes("/graph")) return "Organization Graph";
    if (pathname.includes("/leaderboard")) return "Leaderboard";
    if (pathname.includes("/organization")) return "Organization";
    if (pathname.includes("/profile")) return "Profile";
    if (pathname.includes("/settings")) return "Settings";
    return "Dashboard";
  };

  const title = getPageTitle();

  // Data-driven navigation schema selection based on workspace context & RBAC
  const navSections: NavSection[] = isPersonal
    ? PERSONAL_MOBILE_NAV
    : ORGANIZATION_MOBILE_NAV(userRole);

  // Prevent background page scrolling while drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  return (
    <>
      {/* Mobile Sticky Header Bar (h-[64px]) */}
      <header className="md:hidden flex items-center justify-between h-[64px] shrink-0 px-4 border-b border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#0B0D10] text-[#17202A] dark:text-[#F2F3F5] sticky top-0 z-40 select-none">
        
        {/* LEFT: Hamburger Menu Button */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label={isDrawerOpen ? "Close navigation" : "Open navigation"}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] hover:bg-[#F3F4F6] dark:hover:bg-[#151920] transition-colors cursor-pointer focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* CENTER: True Viewport Centered Page Title & Subtitle */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center pointer-events-none max-w-[50vw]">
          <h1 className="text-[18px] font-semibold text-[#17202A] dark:text-[#F2F3F5] tracking-[-0.01em] leading-[22px] truncate">
            {title}
          </h1>
          <span className="text-[12px] font-normal text-[#667085] dark:text-[#8B94A3] leading-[16px] truncate mt-[4px]">
            {isPersonal ? "Personal Workspace" : "ManMadhan"}
          </span>
        </div>

        {/* RIGHT: Notifications & Profile Buttons */}
        <div className="flex items-center gap-1.5">
          <NotificationDropdown
            activePopover={activePopover as any}
            setActivePopover={setActivePopover as any}
          />
          <ProfileDropdown
            activePopover={activePopover as any}
            setActivePopover={setActivePopover as any}
          />
        </div>
      </header>

      {/* 1. FULL NAVIGATION DRAWER (Left-Side Full-Height Drawer) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-[10000]">
            {/* Theme-Aware Backdrop Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/55 backdrop-blur-xs z-[10000]"
            />

            {/* Sliding Left Full-Height Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              drag="x"
              dragConstraints={{ right: 0 }}
              dragElastic={0.1}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.x < -80 || velocity.x < -400) {
                  setIsDrawerOpen(false);
                }
              }}
              className="fixed left-0 top-0 bottom-0 w-[85vw] max-w-[380px] h-[100dvh] bg-[#FFFFFF] dark:bg-[#111419] border-r border-[#E4E7EC] dark:border-[#292F38] shadow-2xl flex flex-col z-[10001] select-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
              {/* Drawer Compact Header with Official Logo Image */}
              <div className="h-[76px] border-b border-[#E4E7EC] dark:border-[#292F38] flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-xs border border-[#E4E7EC] dark:border-[#292F38] bg-black">
                    <Image
                      src="/ios/iTunesArtwork@1x.png"
                      alt="ManMadhan Progress Logo"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      priority
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[16px] font-semibold text-[#17202A] dark:text-[#F2F4F7] leading-tight">
                      ManMadhan Progress
                    </span>
                    <span className="text-[12px] font-medium text-[#667085] dark:text-[#8B94A3] leading-tight mt-0.5">
                      {isPersonal ? "Personal Workspace" : `${userRole} · ManMadhan`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close navigation"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Data-Driven Single-Column Compact Navigation List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {navSections.map((sec) => (
                  <div key={sec.section} className="space-y-1">
                    <span className="px-3 text-[11px] font-mono font-medium tracking-[0.08em] text-[#667085] dark:text-[#8B94A3] uppercase">
                      {sec.section}
                    </span>
                    <div className="space-y-0.5">
                      {sec.items.map((item) => {
                        const active = checkIsItemActive(item.href);
                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setIsDrawerOpen(false)}
                            className={`flex items-center gap-3 h-[46px] px-3.5 rounded-xl text-[14px] font-medium transition-colors ${
                              active
                                ? "bg-[#FFF8E7] dark:bg-[#1D1B13] border border-[#D4B12F]/40 text-[#D4B12F] font-semibold"
                                : "text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027]"
                            }`}
                          >
                            <item.icon className={`w-5 h-5 shrink-0 ${active ? "text-[#D4B12F]" : "text-[#667085] dark:text-[#8B94A3]"}`} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Fixed Bottom Account Area */}
              <div className="p-3 border-t border-[#E4E7EC] dark:border-[#292F38] bg-[#F8F9FB] dark:bg-[#15181D] shrink-0 space-y-2">
                <div className="flex items-center gap-3 px-2 py-1">
                  <div className="w-9 h-9 rounded-full bg-[#D4B12F]/15 text-[#D4B12F] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D4B12F]/30">
                    {userInitials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate">
                      {userName}
                    </span>
                    <span className="text-[12px] font-medium text-[#667085] dark:text-[#8B94A3] truncate">
                      {isPersonal ? "Personal Workspace" : `${userRole} · ManMadhan`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 gap-1.5">
                  <Link
                    href={isPersonal ? "/personal/settings" : getOrgHref("settings")}
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-[36px] rounded-lg bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#292F38] text-[12px] font-medium text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#667085] dark:text-[#8B94A3]" />
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      logout();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-[36px] rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[12px] font-semibold hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default MobileHeader;
