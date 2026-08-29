"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Zap, 
  FolderKanban, 
  CheckSquare, 
  ClipboardList, 
  Calendar, 
  Clock, 
  FileText,
  Folder,
  Sparkles,
  BookOpen,
  Bell,
  BarChart3,
  Users, 
  Trophy,
  Cpu, 
  Building2, 
  User as UserIcon, 
  Settings,
  ChevronDown, 
  ChevronRight,
  Check, 
  LogOut, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Moon, 
  Sun, 
  X 
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "../../hooks/use-media-query";
import { useTheme } from "next-themes";
import { useAuth } from "../auth/auth-context";

// --- Types ---
type NavItem = {
  name: string;
  href: string;
  icon: any;
  allowedRoles?: string[];
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
  allowedRoles: string[]; // ["CEO", "CO-CEO", "MEMBER", "PERSONAL"]
};

// --- Personal Workspace Navigation Structure ---
const PERSONAL_NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "OVERVIEW",
    allowedRoles: ["PERSONAL"],
    items: [
      { name: "Dashboard", href: "/personal/dashboard", icon: LayoutDashboard },
      { name: "Focus", href: "/personal/focus", icon: Zap },
    ]
  },
  {
    id: "work",
    label: "WORK",
    allowedRoles: ["PERSONAL"],
    items: [
      { name: "Projects", href: "/personal/projects", icon: FolderKanban },
      { name: "Tasks", href: "/personal/tasks", icon: CheckSquare },
      { name: "Learning", href: "/personal/learning", icon: ClipboardList },
      { name: "Calendar", href: "/personal/calendar", icon: Calendar },
      { name: "Timeline", href: "/personal/timeline", icon: Clock },
    ]
  },
  {
    id: "content",
    label: "CONTENT",
    allowedRoles: ["PERSONAL"],
    items: [
      { name: "Notes", href: "/personal/notes", icon: FileText },
      { name: "Documents", href: "/personal/documents", icon: Folder },
    ]
  },
  {
    id: "ai",
    label: "AI",
    allowedRoles: ["PERSONAL"],
    items: [
      { name: "AI Builder", href: "/personal/ai-builder", icon: Sparkles },
      { name: "Prompt Library", href: "/personal/prompt-library", icon: BookOpen },
    ]
  },
  {
    id: "system",
    label: "SYSTEM",
    allowedRoles: ["PERSONAL"],
    items: [
      { name: "Automation", href: "/personal/automation", icon: Cpu },
      { name: "Reminders", href: "/personal/reminders", icon: Bell },
      { name: "Reports", href: "/personal/reports", icon: BarChart3 },
    ]
  },
  {
    id: "account",
    label: "ACCOUNT",
    allowedRoles: ["PERSONAL"],
    items: [
      { name: "Personal Profile", href: "/personal/profile", icon: UserIcon },
      { name: "Personal Settings", href: "/personal/settings", icon: Settings },
    ]
  }
];

// --- Organization Workspace Navigation Structure ---
const ORGANIZATION_NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "OVERVIEW",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Focus", href: "/focus", icon: Zap, allowedRoles: ["CO-CEO", "MEMBER"] },
    ]
  },
  {
    id: "work",
    label: "WORK",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban },
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
      { name: "Learning", href: "/learning", icon: ClipboardList },
      { name: "Calendar", href: "/calendar", icon: Calendar },
      { name: "Timeline", href: "/timeline", icon: Clock },
    ]
  },
  {
    id: "people",
    label: "PEOPLE",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { name: "People", href: "/people", icon: Users },
    ]
  },
  {
    id: "performance",
    label: "PERFORMANCE",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    ]
  },
  {
    id: "administration",
    label: "ADMINISTRATION",
    allowedRoles: ["CEO", "CO-CEO"],
    items: [
      { name: "Automation", href: "/automation", icon: Cpu },
      { name: "Organization", href: "/organization", icon: Building2 },
    ]
  },
  {
    id: "account",
    label: "ACCOUNT",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { name: "Organization Profile", href: "/profile", icon: UserIcon },
      { name: "Organization Settings", href: "/settings", icon: Settings },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const isTablet = useMediaQuery("(max-width: 1024px) and (min-width: 769px)");
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { logout, user } = useAuth();
  const defaultRoleFromPath = pathname.startsWith("/co-ceo") ? "CO-CEO" : pathname.startsWith("/member") ? "MEMBER" : pathname.startsWith("/personal") ? "PERSONAL" : "CEO";
  const userRole = (user?.role || defaultRoleFromPath).toUpperCase();
  const isPersonal = pathname.startsWith("/personal");

  const userDisplayName = user?.displayName || user?.name || (user?.email ? user.email.split("@")[0] : "User");
  const userInitials = userDisplayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "MM";

  // Toggle independent section expansion/collapsing
  const toggleSection = (id: string) => {
    if (isCollapsed && !isMobile) {
      setIsCollapsed(false);
    }
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle events for mobile drawer & sidebar toggle
  useEffect(() => {
    const handleOpenSidebar = () => setIsMobileDrawerOpen(true);
    const handleToggleSidebar = () => setIsCollapsed(prev => !prev);
    window.addEventListener('open-sidebar', handleOpenSidebar);
    window.addEventListener('toggle-sidebar', handleToggleSidebar);
    return () => {
      window.removeEventListener('open-sidebar', handleOpenSidebar);
      window.removeEventListener('toggle-sidebar', handleToggleSidebar);
    };
  }, []);

  // Close workspace dropdown on outside click or Escape key
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

  // Prefetch target workspace route when dropdown opens
  useEffect(() => {
    if (isWorkspaceDropdownOpen) {
      if (!isPersonal) {
        router.prefetch("/personal/dashboard");
      } else {
        const targetDash =
          userRole.includes("CO")
            ? "/co-ceo/dashboard"
            : userRole.includes("MEMBER")
            ? "/member/dashboard"
            : "/ceo/dashboard";
        router.prefetch(targetDash);
      }
    }
  }, [isWorkspaceDropdownOpen, isPersonal, userRole, router]);

  // Handle Workspace Switch (EXACTLY TWO WORKSPACES ONLY)
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
      const targetDash =
        userRole.includes("CO")
          ? "/co-ceo/dashboard"
          : userRole.includes("MEMBER")
          ? "/member/dashboard"
          : "/ceo/dashboard";
      router.replace(targetDash);
    }
    setTimeout(() => setIsSwitching(false), 300);
  };

  const navigateToProfile = () => {
    const profileHref = isPersonal
      ? "/personal/profile"
      : userRole === "CO-CEO"
      ? "/co-ceo/profile"
      : userRole === "MEMBER"
      ? "/member/profile"
      : "/ceo/profile";
    router.push(profileHref);
  };

  const activeNavGroups = isPersonal ? PERSONAL_NAV_GROUPS : ORGANIZATION_NAV_GROUPS;

  // --- Sub-component: Sidebar Content ---
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden bg-[#FFFFFF] dark:bg-[#0B0D0F] text-[#121316] dark:text-[#F5F5F5] select-none font-sans text-xs border-r border-[#E4E4E8] dark:border-[#22252A]">
      
      {/* 1. INDEPENDENT BRAND HEADER */}
      <div className={`px-4 h-[76px] flex items-center gap-3 border-b border-[#E4E4E8] dark:border-[#22252A] shrink-0 ${isCollapsed && !isMobile ? "justify-center px-2" : ""}`}>
        <Image 
          src="/ios/iTunesArtwork@1x.png" 
          alt="ManMadhan Progress" 
          width={32} 
          height={32} 
          className="rounded-lg shadow-xs shrink-0 object-contain" 
        />
        {(!isCollapsed || isMobile) && (
          <div className="flex flex-col min-w-0 leading-none">
            <span className="text-[15px] font-black tracking-tight text-[#121316] dark:text-[#F5F5F5]">ManMadhan Progress</span>
            <span className="text-[10.5px] font-mono font-medium text-[#6C707A] dark:text-[#8E929B] tracking-wider mt-1">
              V1 · Execution OS
            </span>
          </div>
        )}
      </div>

      {/* 2. INDEPENDENT WORKSPACE SELECTOR CONTROL */}
      <div className="p-3 border-b border-[#E4E4E8] dark:border-[#22252A] shrink-0 relative" ref={dropdownRef}>
        {(!isCollapsed || isMobile) && (
          <span className="px-1 mb-1.5 block text-[10px] font-mono font-bold tracking-wider text-[#6C707A] dark:text-[#8E929B] uppercase">
            WORKSPACE
          </span>
        )}

        {(!isCollapsed || isMobile) ? (
          <button
            type="button"
            onClick={() => setIsWorkspaceDropdownOpen(prev => !prev)}
            aria-expanded={isWorkspaceDropdownOpen}
            aria-label="Switch workspace"
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#E4E4E8] dark:border-[#22252A] bg-[#F4F4F6] dark:bg-[#111419] hover:bg-[#EEEEF2] dark:hover:bg-[#151921] transition-all cursor-pointer text-left focus:outline-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#C9A52A]/15 border border-[#C9A52A]/30 text-[#C9A52A] flex items-center justify-center shrink-0">
                {isPersonal ? <UserIcon className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
              </div>
              <span className="font-extrabold text-[12.5px] text-[#121316] dark:text-[#F5F5F5] truncate">
                {isPersonal ? "Personal Workspace" : "Organization Workspace"}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#6C707A] dark:text-[#8E929B] shrink-0 transition-transform duration-150 ${isWorkspaceDropdownOpen ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsWorkspaceDropdownOpen(prev => !prev)}
            title={isPersonal ? "Personal Workspace" : "Organization Workspace"}
            aria-label="Switch workspace"
            className="w-full flex items-center justify-center p-2 rounded-xl border border-[#E4E4E8] dark:border-[#22252A] bg-[#F4F4F6] dark:bg-[#111419] hover:bg-[#EEEEF2] dark:hover:bg-[#151921] transition-all cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-[#C9A52A]/15 border border-[#C9A52A]/30 text-[#C9A52A] flex items-center justify-center shrink-0">
              {isPersonal ? <UserIcon className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
            </div>
          </button>
        )}

        {/* WORKSPACE SWITCHER DROPDOWN POPOVER (EXACTLY TWO WORKSPACES ONLY) */}
        <AnimatePresence>
          {isWorkspaceDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className={`absolute top-full left-3 right-3 mt-1.5 z-50 rounded-2xl border border-[#E4E4E8] dark:border-[#22252A] bg-[#FFFFFF] dark:bg-[#111419] shadow-2xl p-2 font-sans text-xs ${isCollapsed && !isMobile ? "w-[240px] left-2" : ""}`}
            >
              <div className="px-2 py-1 mb-1 text-[9.5px] font-mono font-bold uppercase tracking-wider text-[#6C707A] dark:text-[#8E929B]">
                SWITCH WORKSPACE
              </div>

              {/* Option 1: Personal Workspace */}
              <button
                type="button"
                onClick={() => handleSwitchWorkspace("personal")}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                  isPersonal
                    ? "bg-[#C9A52A]/10 text-[#121316] dark:text-[#F5F5F5] font-extrabold border border-[#C9A52A]/30"
                    : "hover:bg-[#F4F4F6] dark:hover:bg-[#151921] text-[#6C707A] dark:text-[#8E929B] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserIcon className={`w-4 h-4 shrink-0 ${isPersonal ? "text-[#C9A52A]" : "text-[#6C707A] dark:text-[#8E929B]"}`} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-extrabold truncate">Personal Workspace</span>
                    <span className="text-[10px] font-mono text-[#6C707A] dark:text-[#8E929B] truncate mt-0.5">My Workspace</span>
                  </div>
                </div>
                {isPersonal && <Check className="w-4 h-4 text-[#C9A52A] shrink-0" />}
              </button>

              {/* Option 2: Organization Workspace */}
              <button
                type="button"
                onClick={() => handleSwitchWorkspace("org")}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer mt-1 ${
                  !isPersonal
                    ? "bg-[#C9A52A]/10 text-[#121316] dark:text-[#F5F5F5] font-extrabold border border-[#C9A52A]/30"
                    : "hover:bg-[#F4F4F6] dark:hover:bg-[#151921] text-[#6C707A] dark:text-[#8E929B] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building2 className={`w-4 h-4 shrink-0 ${!isPersonal ? "text-[#C9A52A]" : "text-[#6C707A] dark:text-[#8E929B]"}`} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-extrabold truncate">Organization Workspace</span>
                    <span className="text-[10px] font-mono text-[#6C707A] dark:text-[#8E929B] truncate mt-0.5">ManMadhan Progress</span>
                  </div>
                </div>
                {!isPersonal && <Check className="w-4 h-4 text-[#C9A52A] shrink-0" />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. NAVIGATION RAIL (INTERNAL SCROLL AREA) */}
      <div 
        data-lenis-prevent="true" 
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/20"
      >
        {activeNavGroups
          .filter(g => g.allowedRoles.includes(isPersonal ? "PERSONAL" : userRole))
          .map((group) => {
            const isSectionCollapsed = Boolean(collapsedSections[group.id]);

            return (
              <div key={group.id} className="space-y-1">
                {/* Section Header with Independent Collapse Toggle */}
                {(!isCollapsed || isMobile) ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(group.id)}
                    className="w-full flex items-center justify-between px-2 py-1 text-left cursor-pointer group/sec hover:text-[#121316] dark:hover:text-[#F5F5F5] transition-colors"
                  >
                    <span className="text-[10px] font-mono font-bold tracking-wider text-[#6C707A] dark:text-[#8E929B]/70 uppercase group-hover/sec:text-[#121316] dark:group-hover/sec:text-[#F5F5F5]">
                      {group.label}
                    </span>
                    <ChevronDown 
                      className={`w-3.5 h-3.5 text-[#6C707A] dark:text-[#8E929B]/70 transition-transform duration-150 ${
                        isSectionCollapsed ? "-rotate-90" : ""
                      }`} 
                    />
                  </button>
                ) : (
                  <div className="w-4 h-[1px] bg-[#E4E4E8] dark:bg-[#22252A] mx-auto my-2" />
                )}

                {/* Section Items (Collapsible) */}
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
                        let finalHref = item.href;
                        if (!isPersonal) {
                          const baseRoute = userRole === "CO-CEO" ? "/co-ceo" : userRole === "MEMBER" ? "/member" : "/ceo";
                          if (item.href === "/organization" && (userRole === "CO-CEO" || userRole === "MEMBER")) {
                            finalHref = `${baseRoute}/org-profile`;
                          } else {
                            finalHref = `${baseRoute}${item.href}`;
                          }
                        }

                        const isActive = pathname === finalHref || (item.href !== "/dashboard" && item.href !== "/personal/dashboard" && pathname.startsWith(finalHref + "/"));

                        return (
                          <Link key={item.name} href={finalHref}>
                            <div
                              title={(isCollapsed && !isMobile) ? item.name : undefined}
                              className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-140 cursor-pointer ${
                                isActive 
                                  ? "bg-[#F5F2E8] dark:bg-[#171A21] text-[#121316] dark:text-[#F5F5F5] font-bold" 
                                  : "text-[#6C707A] dark:text-[#8E929B] hover:bg-[#F4F4F6] dark:hover:bg-[#151921] hover:text-[#121316] dark:hover:text-[#F5F5F5] font-medium"
                              } ${isCollapsed && !isMobile ? "justify-center px-0 h-10" : "h-10"}`}
                            >
                              {/* 2.5px Gold Vertical Active Indicator */}
                              {isActive && (
                                <span className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-xs bg-[#C9A52A]" />
                              )}

                              <item.icon 
                                className={`shrink-0 ${isCollapsed && !isMobile ? "w-4.5 h-4.5" : "w-4 h-4"} ${
                                  isActive ? "text-[#C9A52A] stroke-[2]" : "text-[#6C707A] dark:text-[#8E929B] stroke-[1.75]"
                                }`} 
                              />
                              
                              {(!isCollapsed || isMobile) && (
                                <span className="text-[13px] truncate flex-1">{item.name}</span>
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
      </div>

      {/* 4. PREMIUM PROFILE FOOTER & ACTION CONTROLS (FIXED AT BOTTOM) */}
      <div className="p-3 border-t border-[#E4E4E8] dark:border-[#22252A] shrink-0 bg-[#FFFFFF] dark:bg-[#0B0D0F] flex flex-col gap-2">
        {/* User Identity Dock Row (Navigates to Profile, NO CHEVRON) */}
        {(!isCollapsed || isMobile) ? (
          <div 
            onClick={navigateToProfile}
            className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-[#E4E4E8] dark:hover:border-[#22252A] hover:bg-[#F4F4F6] dark:hover:bg-[#151921] transition-colors cursor-pointer"
            title="View Profile"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#C9A52A]/15 border border-[#C9A52A]/30 text-[#C9A52A] font-extrabold text-xs shrink-0 font-mono">
                {userInitials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-extrabold text-[#121316] dark:text-[#F5F5F5] truncate leading-tight">
                  {userDisplayName}
                </span>
                <span className="text-[11px] font-semibold text-[#C9A52A] truncate leading-tight mt-0.5">
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
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#C9A52A]/15 border border-[#C9A52A]/30 text-[#C9A52A] font-extrabold text-xs shrink-0 font-mono">
              {userInitials}
            </div>
          </div>
        )}

        {/* Action Controls: Dedicated Logout Button & Secondary Controls */}
        <div className={`flex items-center pt-2 border-t border-[#E4E4E8] dark:border-[#22252A] ${isCollapsed && !isMobile ? "flex-col gap-2 justify-center" : "justify-between px-1"}`}>
          {(!isCollapsed || isMobile) ? (
            <>
              {/* Dedicated Logout Action (⇥ Logout) */}
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 text-[12px] font-bold text-[#6C707A] dark:text-[#8E929B] hover:text-rose-500 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-rose-500/10"
                title="Sign out of your account"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 text-[#6C707A] dark:text-[#8E929B] group-hover:text-rose-500" />
                <span>Logout</span>
              </button>

              <div className="flex items-center gap-1">
                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg text-[#6C707A] dark:text-[#8E929B] hover:bg-[#F4F4F6] dark:hover:bg-[#151921] hover:text-[#121316] dark:hover:text-[#F5F5F5] transition-colors cursor-pointer"
                  title={isDark ? "Switch to light theme" : "Switch to dark theme"}
                  aria-label="Toggle theme"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Collapse Sidebar Control */}
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="p-1.5 rounded-lg text-[#6C707A] dark:text-[#8E929B] hover:bg-[#F4F4F6] dark:hover:bg-[#151921] hover:text-[#121316] dark:hover:text-[#F5F5F5] transition-colors cursor-pointer hidden md:flex"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Collapsed Mode: Expand & Logout Buttons with Tooltips */}
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="p-2 rounded-lg text-[#6C707A] dark:text-[#8E929B] hover:bg-[#151921] hover:text-[#F5F5F5] transition-colors cursor-pointer hidden md:flex"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4.5 h-4.5" />
              </button>
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-lg text-[#6C707A] dark:text-[#8E929B] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop / Tablet Navigation Rail */}
      <motion.aside 
        animate={{ width: isCollapsed ? 72 : 268 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="hidden md:flex flex-col h-[100dvh] bg-[#FFFFFF] dark:bg-[#0B0D0F] sticky top-0 left-0 shrink-0 z-30"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileDrawerOpen && isMobile && (
          <div className="md:hidden fixed inset-0 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-[300px] bg-[#FFFFFF] dark:bg-[#0B0D0F] border-r border-[#E4E4E8] dark:border-[#22252A] shadow-2xl"
            >
              <button 
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-[#F4F4F6] dark:bg-[#151921] text-[#6C707A] dark:text-[#8E929B] hover:text-[#121316] dark:hover:text-[#F5F5F5] z-10"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
