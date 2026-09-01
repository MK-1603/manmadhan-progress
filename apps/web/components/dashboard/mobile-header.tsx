"use client";

import { Menu, X, Settings, LogOut, ChevronRight, ChevronDown, Check, User as UserIcon, Building2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationDropdown } from "./notification-dropdown";
import { ProfileDropdown } from "./profile-dropdown";
import { useAuth } from "../auth/auth-context";
import {
  ORGANIZATION_NAV_GROUPS,
  PERSONAL_NAV_GROUPS,
  getOrgItemHref,
  RoleType
} from "@/config/navigation.config";

import { useSetRefreshDisabled } from "@/components/providers/global-refresh-provider";

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
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const navRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useSetRefreshDisabled(isDrawerOpen);

  const isPersonal = workspaceType
    ? workspaceType === "personal"
    : pathname?.startsWith("/personal");

  const defaultRoleFromPath: RoleType = pathname?.startsWith("/co-ceo")
    ? "CO-CEO"
    : pathname?.startsWith("/member")
    ? "MEMBER"
    : "CEO";

  const userRole = (role || (user?.role || defaultRoleFromPath)).toUpperCase() as RoleType;
  const userName = user?.displayName || user?.name || user?.email?.split("@")[0] || "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "MM";

  const getPageTitle = () => {
    if (pageTitle) return pageTitle === "Dashboard" ? "Home" : pageTitle;
    if (!pathname) return "Home";
    if (pathname.includes("/dashboard")) return "Home";
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
    if (pathname.includes("/people")) return "People";
    if (pathname.includes("/approvals")) return "Approvals";
    if (pathname.includes("/graph")) return "Organization Graph";
    if (pathname.includes("/leaderboard")) return "Leaderboard";
    if (pathname.includes("/organization")) return "Organization";
    if (pathname.includes("/profile")) return "Profile";
    if (pathname.includes("/settings")) return "Settings";
    return "Home";
  };

  const title = getPageTitle();
  const navGroups = isPersonal ? PERSONAL_NAV_GROUPS : ORGANIZATION_NAV_GROUPS;

  // Reset nav scroll to top (0) and close workspace dropdown whenever drawer opens
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
      setIsWorkspaceDropdownOpen(false);
      if (navRef.current) {
        navRef.current.scrollTop = 0;
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  // Support Escape key to close side drawer or workspace switcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isWorkspaceDropdownOpen) {
          setIsWorkspaceDropdownOpen(false);
        } else if (isDrawerOpen) {
          setIsDrawerOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, isWorkspaceDropdownOpen]);

  // Handle Workspace Switch in Mobile Drawer
  const handleSwitchWorkspace = (target: "personal" | "org") => {
    setIsWorkspaceDropdownOpen(false);
    setIsDrawerOpen(false);
    if ((target === "personal" && isPersonal) || (target === "org" && !isPersonal)) {
      return;
    }
    if (target === "personal") {
      localStorage.setItem("activeWorkspaceType", "personal");
      router.replace("/personal/dashboard");
    } else {
      localStorage.setItem("activeWorkspaceType", "organization");
      const targetDash = getOrgItemHref(userRole, "/dashboard");
      router.replace(targetDash);
    }
  };

  const settingsHref = isPersonal
    ? "/personal/settings"
    : getOrgItemHref(userRole, "/settings");

  return (
    <>
      {/* Mobile Header Bar (h-[64px] shrink-0 fixed at shell top) */}
      <header className="md:hidden flex items-center justify-between h-[64px] shrink-0 px-4 border-b border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#0B0D10] text-[#17202A] dark:text-[#F2F3F5] z-40 select-none relative w-full">
        
        {/* LEFT: Menu Button */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label={isDrawerOpen ? "Close navigation" : "Open navigation"}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] hover:bg-[#F3F4F6] dark:hover:bg-[#151920] transition-colors cursor-pointer outline-none focus:outline-none"
        >
          <Menu className="w-5.5 h-5.5" />
        </button>

        {/* CENTER: Viewport Centered Title */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center max-w-[48vw]">
          <h1 className="text-[16px] font-bold text-foreground tracking-tight leading-[22px] truncate pointer-events-none" suppressHydrationWarning>
            {title}
          </h1>
        </div>

        {/* RIGHT: Header Actions */}
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

      {/* ── SIDE-OPENING PREMIUM DRAWER (LEFT TO RIGHT SLIDE) ── */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[9999] md:hidden select-none">
            {/* Dimmed Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-10"
            />

            {/* Left-Side Opening Drawer Panel (translateX -100% to 0) */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.25 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.4, right: 0 }}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.x < -60 || velocity.x < -300) {
                  setIsDrawerOpen(false);
                }
              }}
              className="fixed top-0 left-0 bottom-0 w-[calc(100vw-44px)] sm:w-[380px] max-w-[380px] h-[100dvh] bg-[#F7F7F5] dark:bg-[#0B0D10] text-[#25282D] dark:text-[#F5F5F5] border-r border-[#D9DDE3] dark:border-[#22252A] shadow-2xl z-20 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overflow-hidden font-sans text-xs"
            >
              {/* 1. COMPACT SLEEK DRAWER HEADER (60px Height) */}
              <div className="flex items-center justify-between h-[60px] px-4 border-b border-[#D9DDE3] dark:border-[#22252A] shrink-0 bg-[#FFFFFF] dark:bg-[#0B0D10]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Image
                    src="/ios/iTunesArtwork@1x.png"
                    alt="ManMadhan Progress"
                    width={32}
                    height={32}
                    className="rounded-lg shadow-xs shrink-0 object-contain"
                  />
                  <div className="flex flex-col min-w-0 leading-none">
                    <span className="text-[14px] font-extrabold tracking-tight text-[#25282D] dark:text-[#F5F5F5] truncate">
                      ManMadhan Progress
                    </span>
                    <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8E929B] truncate mt-0.5">
                      {isPersonal ? "Personal Workspace" : "Organization Workspace"}
                    </span>
                  </div>
                </div>

                {/* 36x36px Touch Target Compact Close Button */}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close navigation drawer"
                  className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center bg-black/[0.04] dark:bg-[#151921] hover:bg-black/[0.07] dark:hover:bg-[#1C2027] text-[#667085] dark:text-[#8E929B] hover:text-[#25282D] dark:hover:text-[#F5F5F5] transition-colors cursor-pointer outline-none focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 2. COMPACT CURRENT WORKSPACE SWITCHER SECTION */}
              <div className="px-3 py-2 border-b border-[#D9DDE3] dark:border-[#22252A] shrink-0 relative" ref={dropdownRef}>
                <span className="px-1 mb-1 block text-[9.5px] font-mono font-bold tracking-wider text-[#667085] dark:text-[#8E929B] uppercase">
                  CURRENT WORKSPACE
                </span>

                <button
                  type="button"
                  onClick={() => setIsWorkspaceDropdownOpen((prev) => !prev)}
                  aria-expanded={isWorkspaceDropdownOpen}
                  aria-label="Switch workspace"
                  className="w-full flex items-center justify-between h-[38px] px-2.5 rounded-xl border border-[#D9DDE3] dark:border-[#22252A] bg-[#FFFFFF] dark:bg-[#111419] hover:bg-[#F4F4F6] dark:hover:bg-[#151921] transition-all cursor-pointer text-left focus:outline-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-[#C89B18]/15 border border-[#C89B18]/30 text-[#C89B18] flex items-center justify-center shrink-0">
                      {isPersonal ? <UserIcon className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                    </div>
                    <span className="font-bold text-[11.5px] text-[#25282D] dark:text-[#F5F5F5] truncate">
                      {isPersonal ? "Personal Workspace" : "Organization Workspace"}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#667085] dark:text-[#8E929B] shrink-0 transition-transform duration-150 ${isWorkspaceDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Workspace Switcher Popover */}
                <AnimatePresence>
                  {isWorkspaceDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute top-full left-3 right-3 mt-1.5 z-50 rounded-2xl border border-[#D9DDE3] dark:border-[#22252A] bg-[#FFFFFF] dark:bg-[#111419] shadow-2xl p-2 font-sans text-xs"
                    >
                      <div className="px-2 py-1 mb-1 text-[9.5px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8E929B]">
                        SWITCH WORKSPACE
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSwitchWorkspace("personal")}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isPersonal
                            ? "bg-[#C89B18]/10 text-[#25282D] dark:text-[#F5F5F5] font-extrabold border border-[#C89B18]/30"
                            : "hover:bg-[#F4F4F6] dark:hover:bg-[#151921] text-[#667085] dark:text-[#8E929B] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserIcon className={`w-4 h-4 shrink-0 ${isPersonal ? "text-[#C89B18]" : "text-[#667085] dark:text-[#8E929B]"}`} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-extrabold truncate">Personal Workspace</span>
                            <span className="text-[10px] font-mono text-[#667085] dark:text-[#8E929B] truncate mt-0.5">My Workspace</span>
                          </div>
                        </div>
                        {isPersonal && <Check className="w-4 h-4 text-[#C89B18] shrink-0" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchWorkspace("org")}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer mt-1 ${
                          !isPersonal
                            ? "bg-[#C89B18]/10 text-[#25282D] dark:text-[#F5F5F5] font-extrabold border border-[#C89B18]/30"
                            : "hover:bg-[#F4F4F6] dark:hover:bg-[#151921] text-[#667085] dark:text-[#8E929B] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Building2 className={`w-4 h-4 shrink-0 ${!isPersonal ? "text-[#C89B18]" : "text-[#667085] dark:text-[#8E929B]"}`} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-extrabold truncate">Organization Workspace</span>
                            <span className="text-[10px] font-mono text-[#667085] dark:text-[#8E929B] truncate mt-0.5">ManMadhan Progress</span>
                          </div>
                        </div>
                        {!isPersonal && <Check className="w-4 h-4 text-[#C89B18] shrink-0" />}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. SLEEK COMPACT NAVIGATION AREA */}
              <nav
                ref={navRef}
                aria-label="Mobile Navigation Drawer"
                className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-3 scrollbar-none pb-4"
              >
                {navGroups
                  .filter((group) => group.allowedRoles.includes(isPersonal ? "PERSONAL" : userRole))
                  .map((group) => {
                    const filteredItems = group.items.filter(
                      (item) => !item.allowedRoles || item.allowedRoles.includes(userRole)
                    );

                    if (filteredItems.length === 0) return null;

                    return (
                      <div key={group.id} className="space-y-0.5">
                        <span className="px-2 text-[9.5px] font-mono font-bold tracking-wider text-[#667085] dark:text-[#8E929B]/70 uppercase">
                          {group.label}
                        </span>

                        <div className="space-y-0.5 mt-0.5">
                          {filteredItems.map((item) => {
                            const finalHref = isPersonal
                              ? item.href
                              : getOrgItemHref(userRole, item.href);

                            const isActive =
                              pathname === finalHref ||
                              (item.href !== "/dashboard" &&
                                item.href !== "/personal/dashboard" &&
                                pathname.startsWith(finalHref + "/"));

                            return (
                              <Link
                                key={item.id}
                                href={finalHref}
                                onClick={() => setIsDrawerOpen(false)}
                                className={`flex items-center justify-between h-[38px] px-2.5 rounded-xl text-[12px] transition-all ${
                                  isActive
                                    ? "bg-[#C89B18]/10 dark:bg-[#C89B18]/15 border border-[#C89B18]/30 text-[#25282D] dark:text-[#F5F5F5] font-bold"
                                    : "text-[#667085] dark:text-[#8E929B] hover:bg-black/[0.035] dark:hover:bg-white/[0.05] hover:text-[#25282D] dark:hover:text-[#F5F5F5] font-medium border border-transparent"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <item.icon
                                    className={`w-4 h-4 shrink-0 ${
                                      isActive ? "text-[#C89B18] stroke-[2.2]" : "text-[#667085] dark:text-[#8E929B] stroke-[1.75]"
                                    }`}
                                  />
                                  <span className="truncate">{item.name}</span>
                                </div>
                                <ChevronRight
                                  className={`w-3 h-3 shrink-0 ${
                                    isActive ? "text-[#C89B18]" : "text-[#667085]/50 dark:text-[#8E929B]/40"
                                  }`}
                                />
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </nav>

              {/* 4. FIXED ANCHORED ACCOUNT FOOTER */}
              <div className="p-3 border-t border-[#D9DDE3] dark:border-[#22252A] bg-[#FFFFFF] dark:bg-[#0D0F13] shrink-0 space-y-2 pb-[max(14px,env(safe-area-inset-bottom))] z-20">
                {(() => {
                  const orgBatchId = user?.batchNumber || "";
                  const displayBatchOrName = orgBatchId || "Organization Workspace";
                  const displayTitle = isPersonal ? userName : displayBatchOrName;
                  const displaySubtitle = isPersonal ? "Personal" : `${userRole} · Organization`;
                  const orgInitials = orgBatchId ? orgBatchId.slice(0, 2).toUpperCase() : userInitials;
                  const displayInitials = isPersonal ? userInitials : orgInitials;

                  return (
                    <div className="flex items-center gap-2.5 px-1">
                      <div className="w-9 h-9 rounded-full bg-[#C89B18]/15 border border-[#C89B18]/30 text-[#C89B18] flex items-center justify-center font-extrabold text-xs shrink-0 font-mono">
                        {displayInitials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-extrabold text-[#25282D] dark:text-[#F5F5F5] truncate leading-tight">
                          {displayTitle}
                        </span>
                        <span className="text-[11px] font-semibold text-[#C89B18] truncate leading-tight mt-0.5">
                          {displaySubtitle}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-2 pt-0.5">
                  <Link
                    href={settingsHref}
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-[38px] rounded-xl bg-[#F7F7F5] dark:bg-[#151921] border border-[#D9DDE3] dark:border-[#22252A] text-[12px] font-bold text-[#25282D] dark:text-[#F5F5F5] hover:bg-black/[0.04] dark:hover:bg-[#1C2027] transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#667085] dark:text-[#8E929B]" />
                    <span>Settings</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      logout();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-[38px] rounded-xl bg-[#D92D45]/10 border border-[#D92D45]/20 text-[#D92D45] dark:text-rose-400 text-[12px] font-bold hover:bg-[#D92D45]/20 transition-colors cursor-pointer"
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
