"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Check,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  User as UserIcon,
  Building2,
  Settings
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "../../hooks/use-media-query";
import { useTheme } from "next-themes";
import { useAuth } from "../auth/auth-context";
import {
  PERSONAL_NAV_GROUPS,
  ORGANIZATION_NAV_GROUPS,
  getOrgItemHref,
  RoleType
} from "@/config/navigation.config";

export function Sidebar() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const isTablet = useMediaQuery("(max-width: 1024px) and (min-width: 769px)");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { logout, user } = useAuth();
  const defaultRoleFromPath: RoleType = pathname.startsWith("/co-ceo")
    ? "CO-CEO"
    : pathname.startsWith("/member")
    ? "MEMBER"
    : "CEO";
  const userRole = (user?.role || defaultRoleFromPath).toUpperCase() as RoleType;
  const isPersonal = pathname.startsWith("/personal");

  const userDisplayName = user?.displayName || user?.name || (user?.email ? user.email.split("@")[0] : "User");
  const userInitials = userDisplayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "MM";

  // Dynamic role title label
  const roleDisplayLabel = isPersonal
    ? "Personal Workspace"
    : `${userRole} · Organization`;

  const toggleSection = (id: string) => {
    if (isCollapsed && !isMobile) {
      setIsCollapsed(false);
    }
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const handleToggleSidebar = () => setIsCollapsed((prev) => !prev);
    window.addEventListener("toggle-sidebar", handleToggleSidebar);
    return () => {
      window.removeEventListener("toggle-sidebar", handleToggleSidebar);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsWorkspaceDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsWorkspaceDropdownOpen(false);
      }
    };

    if (isWorkspaceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isWorkspaceDropdownOpen]);

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  useEffect(() => {
    if (isTablet) setIsCollapsed(true);
    else if (!isMobile) setIsCollapsed(false);
  }, [isTablet, isMobile]);

  useEffect(() => {
    if (isWorkspaceDropdownOpen) {
      if (!isPersonal) {
        router.prefetch("/personal/dashboard");
      } else {
        const targetDash = getOrgItemHref(userRole, "/dashboard");
        router.prefetch(targetDash);
      }
    }
  }, [isWorkspaceDropdownOpen, isPersonal, userRole, router]);

  const [isSwitching, setIsSwitching] = useState(false);
  const handleSwitchWorkspace = (target: "personal" | "org") => {
    setIsWorkspaceDropdownOpen(false);
    if (isSwitching) return;
    if ((target === "personal" && isPersonal) || (target === "org" && !isPersonal)) {
      return;
    }
    setIsSwitching(true);
    if (target === "personal") {
      localStorage.setItem("activeWorkspaceType", "personal");
      router.replace("/personal/dashboard");
    } else {
      localStorage.setItem("activeWorkspaceType", "organization");
      const targetDash = getOrgItemHref(userRole, "/dashboard");
      router.replace(targetDash);
    }
    setTimeout(() => setIsSwitching(false), 300);
  };

  const navigateToProfile = () => {
    const profileHref = isPersonal
      ? "/personal/profile"
      : getOrgItemHref(userRole, "/profile");
    router.push(profileHref);
  };

  const settingsHref = isPersonal
    ? "/personal/settings"
    : getOrgItemHref(userRole, "/settings");

  const activeNavGroups = isPersonal ? PERSONAL_NAV_GROUPS : ORGANIZATION_NAV_GROUPS;

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 280 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="hidden md:flex flex-col h-[100dvh] bg-[#F7F7F5] dark:bg-[#0B0D10] sticky top-0 left-0 shrink-0 z-30 select-none font-sans text-xs border-r border-[#D9DDE3] dark:border-[#22252A]"
    >
      {/* 1. BRAND HEADER WITH OFFICIAL LOGO ASSET */}
      <div className={`px-3.5 h-[62px] flex items-center gap-2.5 border-b border-[#D9DDE3] dark:border-[#22252A] shrink-0 ${isCollapsed && !isMobile ? "justify-center px-2" : ""}`}>
        <Image
          src="/ios/iTunesArtwork@1x.png"
          alt="ManMadhan Progress"
          width={32}
          height={32}
          className="rounded-lg shadow-xs shrink-0 object-contain"
        />
        {(!isCollapsed || isMobile) && (
          <div className="flex flex-col min-w-0 leading-none">
            <span className="text-[14px] font-extrabold tracking-tight text-[#25282D] dark:text-[#F5F5F5] truncate">
              ManMadhan Progress
            </span>
            <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8E929B] truncate mt-0.5">
              {isPersonal ? "Personal Workspace" : "Organization Workspace"}
            </span>
          </div>
        )}
      </div>

      {/* 2. WORKSPACE SELECTOR CONTROL */}
      <div className="px-3 py-2 border-b border-[#D9DDE3] dark:border-[#22252A] shrink-0 relative" ref={dropdownRef}>
        {(!isCollapsed || isMobile) && (
          <span className="px-1 mb-1 block text-[9.5px] font-mono font-bold tracking-wider text-[#667085] dark:text-[#8E929B] uppercase">
            CURRENT WORKSPACE
          </span>
        )}

        {(!isCollapsed || isMobile) ? (
          <button
            type="button"
            onClick={() => setIsWorkspaceDropdownOpen((prev) => !prev)}
            aria-expanded={isWorkspaceDropdownOpen}
            aria-label="Switch workspace"
            className="w-full flex items-center justify-between h-[38px] px-2.5 rounded-xl border border-[#D9DDE3] dark:border-[#22252A] bg-[#FFFFFF] dark:bg-[#111419] hover:bg-[#F4F4F6] dark:hover:bg-[#151921] transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#C89B18]"
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
        ) : (
          <button
            type="button"
            onClick={() => setIsWorkspaceDropdownOpen((prev) => !prev)}
            title={isPersonal ? "Personal Workspace" : "Organization Workspace"}
            aria-label="Switch workspace"
            className="w-full flex items-center justify-center p-1.5 rounded-xl border border-[#D9DDE3] dark:border-[#22252A] bg-[#FFFFFF] dark:bg-[#111419] hover:bg-[#F4F4F6] dark:hover:bg-[#151921] transition-all cursor-pointer"
          >
            <div className="w-5 h-5 rounded-md bg-[#C89B18]/15 border border-[#C89B18]/30 text-[#C89B18] flex items-center justify-center shrink-0">
              {isPersonal ? <UserIcon className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
            </div>
          </button>
        )}

        {/* WORKSPACE SWITCHER DROPDOWN POPOVER */}
        <AnimatePresence>
          {isWorkspaceDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className={`absolute top-full left-3 right-3 mt-1.5 z-50 rounded-2xl border border-[#D9DDE3] dark:border-[#22252A] bg-[#FFFFFF] dark:bg-[#111419] shadow-2xl p-2 font-sans text-xs ${isCollapsed && !isMobile ? "w-[240px] left-2" : ""}`}
            >
              <div className="px-2 py-1 mb-1 text-[9.5px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8E929B]">
                SWITCH WORKSPACE
              </div>

              {/* Option 1: Personal Workspace */}
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

              {/* Option 2: Organization Workspace */}
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

      {/* 3. SCROLLABLE NAVIGATION RAIL */}
      <nav
        aria-label="Sidebar Navigation"
        data-lenis-prevent="true"
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/20"
      >
        {activeNavGroups
          .filter((g) => g.allowedRoles.includes(isPersonal ? "PERSONAL" : userRole))
          .map((group) => {
            const isSectionCollapsed = Boolean(collapsedSections[group.id]);

            return (
              <div key={group.id} className="space-y-1">
                {/* Section Header */}
                {(!isCollapsed || isMobile) ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(group.id)}
                    aria-expanded={!isSectionCollapsed}
                    className="w-full flex items-center justify-between px-2 py-0.5 text-left cursor-pointer group/sec hover:text-[#25282D] dark:hover:text-[#F5F5F5] transition-colors"
                  >
                    <span className="text-[9.5px] font-mono font-bold tracking-wider text-[#667085] dark:text-[#8E929B]/70 uppercase group-hover/sec:text-[#25282D] dark:group-hover/sec:text-[#F5F5F5]">
                      {group.label}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 text-[#667085] dark:text-[#8E929B]/70 transition-transform duration-150 ${
                        isSectionCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                  </button>
                ) : (
                  <div className="w-4 h-[1px] bg-[#D9DDE3] dark:bg-[#22252A] mx-auto my-2" />
                )}

                {/* Section Items */}
                <AnimatePresence initial={false}>
                  {!isSectionCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {group.items
                        .filter((item) => !item.allowedRoles || item.allowedRoles.includes(userRole))
                        .map((item) => {
                          const finalHref = isPersonal
                            ? item.href
                            : getOrgItemHref(userRole, item.href);

                          const isActive =
                            pathname === finalHref ||
                            (item.href !== "/dashboard" &&
                              item.href !== "/personal/dashboard" &&
                              (pathname.startsWith(finalHref + "/") ||
                               (item.id === "prompt-library" && pathname.includes("/prompts")) ||
                               (item.id === "people" && (pathname.includes("/co-ceos") || pathname.includes("/members") || pathname.includes("/invitations")))));

                          return (
                            <Link key={item.id} href={finalHref}>
                              <div
                                title={isCollapsed && !isMobile ? item.name : undefined}
                                className={`relative flex items-center gap-2.5 px-3 rounded-xl transition-all duration-140 cursor-pointer ${
                                  isActive
                                    ? "bg-[#C89B18]/10 dark:bg-[#C89B18]/15 border border-[#C89B18]/30 text-[#25282D] dark:text-[#F5F5F5] font-bold"
                                    : "text-[#667085] dark:text-[#8E929B] hover:bg-black/[0.035] dark:hover:bg-white/[0.05] hover:text-[#25282D] dark:hover:text-[#F5F5F5] font-medium border border-transparent"
                                } ${isCollapsed && !isMobile ? "justify-center px-0 h-[39px]" : "h-[39px]"}`}
                              >
                                {/* Active Indicator Bar */}
                                {isActive && (
                                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-xs bg-[#C89B18]" />
                                )}

                                <item.icon
                                  className={`shrink-0 ${isCollapsed && !isMobile ? "w-4.5 h-4.5" : "w-[17px] h-[17px]"} ${
                                    isActive
                                      ? "text-[#C89B18] stroke-[2.2]"
                                      : "text-[#667085] dark:text-[#8E929B] stroke-[1.75]"
                                  }`}
                                />

                                {(!isCollapsed || isMobile) && (
                                  <span className="text-[12.5px] truncate flex-1">{item.name}</span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
      </nav>

      {/* 4. ANCHORED ACCOUNT FOOTER & CONTROLS */}
      <div className="p-3 border-t border-[#D9DDE3] dark:border-[#22252A] shrink-0 bg-[#FFFFFF] dark:bg-[#0B0D0F] flex flex-col gap-2">
        {/* User Identity Dock Row */}
        {(!isCollapsed || isMobile) ? (
          <div
            onClick={navigateToProfile}
            className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-[#D9DDE3] dark:hover:border-[#22252A] hover:bg-black/[0.035] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
            title="View Profile"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#C89B18]/15 border border-[#C89B18]/30 text-[#C89B18] font-extrabold text-xs shrink-0 font-mono">
                {userInitials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-extrabold text-[#25282D] dark:text-[#F5F5F5] truncate leading-tight">
                  {userDisplayName}
                </span>
                <span className="text-[11px] font-semibold text-[#C89B18] truncate leading-tight mt-0.5">
                  {isPersonal ? "Personal" : userRole}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={navigateToProfile}
            className="flex items-center justify-center p-1 rounded-xl cursor-pointer"
            title={`View Profile (${userDisplayName})`}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#C89B18]/15 border border-[#C89B18]/30 text-[#C89B18] font-extrabold text-xs shrink-0 font-mono">
              {userInitials}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className={`flex items-center pt-2 border-t border-[#D9DDE3] dark:border-[#22252A] ${isCollapsed && !isMobile ? "flex-col gap-2 justify-center" : "justify-between px-1"}`}>
          {(!isCollapsed || isMobile) ? (
            <>
              <div className="flex items-center gap-1">
                <Link
                  href={settingsHref}
                  className="p-1.5 rounded-lg text-[#667085] dark:text-[#8E929B] hover:bg-black/[0.035] dark:hover:bg-white/[0.05] hover:text-[#25282D] dark:hover:text-[#F5F5F5] transition-colors"
                  title="Organization Settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>

                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg text-[#667085] dark:text-[#8E929B] hover:bg-black/[0.035] dark:hover:bg-white/[0.05] hover:text-[#25282D] dark:hover:text-[#F5F5F5] transition-colors cursor-pointer"
                  title={isDark ? "Switch to light theme" : "Switch to dark theme"}
                  aria-label="Toggle theme"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>

              {/* Dedicated Sign Out Action */}
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 text-[12px] font-bold text-[#D92D45] dark:text-rose-400 bg-[#D92D45]/10 border border-[#D92D45]/20 hover:bg-[#D92D45]/20 transition-colors cursor-pointer py-1 px-2.5 rounded-lg"
                title="Sign out of your account"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="p-2 rounded-lg text-[#667085] dark:text-[#8E929B] hover:bg-black/[0.035] dark:hover:bg-white/[0.05] hover:text-[#25282D] dark:hover:text-[#F5F5F5] transition-colors cursor-pointer hidden md:flex"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4.5 h-4.5" />
              </button>
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-lg text-[#D92D45] dark:text-rose-400 bg-[#D92D45]/10 border border-[#D92D45]/20 hover:bg-[#D92D45]/20 transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
