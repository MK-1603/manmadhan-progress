"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, CheckSquare, Calendar, History,
  Users, UserPlus, UserCheck, Network, Trophy, Zap, Building, User as UserIcon,
  Settings, FileText, Archive, Brain, Sparkles, Bell, BarChart3,
  ShieldCheck, ClipboardCheck, ChevronDown, PanelLeftClose, PanelLeftOpen,
  LogOut, BookOpen
} from "lucide-react";
import { FocusIcon, Focus } from "@/components/ui/focus-icon";
import { useAuth } from "@/components/auth/auth-context";

/* ─────────────────────────────────────────────────────────── types */
export type NavItem = {
  name: string;
  href: string;
  icon: any;
  badge?: number | string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/* ─────────────────────────────────────────────────── navigation configs */

// 1. Organization — CEO Navigation (Strict Canonical Order)
const ORG_CEO_NAV: NavGroup[] = [
  {
    id: "overview",
    label: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/ceo/dashboard", icon: LayoutDashboard },
      { name: "Focus", href: "/ceo/focus", icon: FocusIcon },
    ],
  },
  {
    id: "work",
    label: "WORK",
    items: [
      { name: "Projects", href: "/ceo/projects", icon: FolderKanban },
      { name: "Tasks", href: "/ceo/tasks", icon: CheckSquare },
      { name: "Learning", href: "/ceo/learning", icon: BookOpen },
      { name: "Calendar", href: "/ceo/calendar", icon: Calendar },
      { name: "Timeline", href: "/ceo/timeline", icon: History },
    ],
  },
  {
    id: "people",
    label: "PEOPLE",
    items: [
      { name: "People", href: "/ceo/people", icon: Users },
    ],
  },
  {
    id: "performance",
    label: "PERFORMANCE",
    items: [
      { name: "Organization Graph", href: "/ceo/graph", icon: Network },
      { name: "Leaderboard", href: "/ceo/leaderboard", icon: Trophy },
      { name: "Performance", href: "/ceo/performance", icon: BarChart3 },
    ],
  },
  {
    id: "administration",
    label: "ADMINISTRATION",
    items: [
      { name: "Automation", href: "/ceo/automation", icon: Zap },
      { name: "Organization", href: "/ceo/organization", icon: Building },
      { name: "Organization Profile", href: "/ceo/profile", icon: UserIcon },
      { name: "Organization Settings", href: "/ceo/settings", icon: Settings },
    ],
  },
];

// 2. Organization — CO-CEO Navigation
const ORG_COCEO_NAV: NavGroup[] = [
  {
    id: "overview",
    label: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/co-ceo/dashboard", icon: LayoutDashboard },
      { name: "Focus", href: "/co-ceo/focus", icon: FocusIcon },
    ],
  },
  {
    id: "work",
    label: "WORK",
    items: [
      { name: "My Work", href: "/co-ceo/my-work", icon: CheckSquare },
      { name: "Projects", href: "/co-ceo/projects", icon: FolderKanban },
      { name: "Tasks", href: "/co-ceo/tasks", icon: ClipboardCheck },
      { name: "Calendar", href: "/co-ceo/calendar", icon: Calendar },
      { name: "Timeline", href: "/co-ceo/timeline", icon: History },
    ],
  },
  {
    id: "team",
    label: "TEAM",
    items: [
      { name: "My Members", href: "/co-ceo/members", icon: Users },
      { name: "Approvals", href: "/co-ceo/approvals", icon: ShieldCheck },
    ],
  },
  {
    id: "performance",
    label: "PERFORMANCE",
    items: [
      { name: "Organization Graph", href: "/co-ceo/organization-graph", icon: Network },
      { name: "Leaderboard", href: "/co-ceo/leaderboard", icon: Trophy },
      { name: "Performance", href: "/co-ceo/performance", icon: BarChart3 },
    ],
  },
];

// 3. Organization — MEMBER Navigation
const ORG_MEMBER_NAV: NavGroup[] = [
  {
    id: "overview",
    label: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/member/dashboard", icon: LayoutDashboard },
      { name: "Focus", href: "/member/focus", icon: FocusIcon },
    ],
  },
  {
    id: "work",
    label: "WORK",
    items: [
      { name: "My Work", href: "/member/my-work", icon: CheckSquare },
      { name: "Projects", href: "/member/projects", icon: FolderKanban },
      { name: "Tasks", href: "/member/tasks", icon: ClipboardCheck },
      { name: "Calendar", href: "/member/calendar", icon: Calendar },
      { name: "Timeline", href: "/member/timeline", icon: History },
    ],
  },
];

// 4. Personal Workspace Navigation (STRICTLY NO ORGANIZATION ROLES/PEOPLE)
const PERSONAL_NAV: NavGroup[] = [
  {
    id: "overview",
    label: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/personal/dashboard", icon: LayoutDashboard },
      { name: "Focus", href: "/personal/focus", icon: FocusIcon },
    ],
  },
  {
    id: "work",
    label: "WORK",
    items: [
      { name: "Projects", href: "/personal/projects", icon: FolderKanban },
      { name: "Tasks", href: "/personal/tasks", icon: CheckSquare },
      { name: "Calendar", href: "/personal/calendar", icon: Calendar },
      { name: "Timeline", href: "/personal/timeline", icon: History },
    ],
  },
  {
    id: "content",
    label: "CONTENT",
    items: [
      { name: "Notes", href: "/personal/notes", icon: FileText },
      { name: "Documents", href: "/personal/documents", icon: Archive },
    ],
  },
  {
    id: "ai",
    label: "AI",
    items: [
      { name: "AI Builder", href: "/personal/ai-builder", icon: Brain },
      { name: "Prompt Library", href: "/personal/prompt-library", icon: Sparkles },
    ],
  },
  {
    id: "system",
    label: "SYSTEM",
    items: [
      { name: "Automation", href: "/personal/automation", icon: Zap },
      { name: "Reminders", href: "/personal/reminders", icon: Bell },
      { name: "Reports", href: "/personal/reports", icon: BarChart3 },
    ],
  },
  {
    id: "account",
    label: "ACCOUNT",
    items: [
      { name: "Profile", href: "/personal/profile", icon: UserIcon },
      { name: "Settings", href: "/personal/settings", icon: Settings },
    ],
  },
];

/* ─────────────────────────────────────────────────────────── helpers */
function isItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (
    href === "/ceo/dashboard" ||
    href === "/co-ceo/dashboard" ||
    href === "/member/dashboard" ||
    href === "/personal/dashboard"
  ) {
    return false;
  }
  return pathname.startsWith(href + "/");
}

/* ───────────────────────────────────────────────── main component */
export function AppSidebar({
  forcedRole,
  forcedWorkspace,
}: {
  forcedRole?: "CEO" | "CO-CEO" | "MEMBER";
  forcedWorkspace?: "organization" | "personal";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  // 1. Workspace context determination
  const isPersonal = forcedWorkspace
    ? forcedWorkspace === "personal"
    : pathname.startsWith("/personal");

  const effectiveRole = useMemo(() => {
    if (forcedRole) return forcedRole;
    if (pathname.startsWith("/co-ceo")) return "CO-CEO";
    if (pathname.startsWith("/member")) return "MEMBER";
    if (pathname.startsWith("/ceo")) return "CEO";
    const userRole = (user?.role || "").toUpperCase();
    if (userRole === "CO-CEO") return "CO-CEO";
    if (userRole === "MEMBER") return "MEMBER";
    return "CEO";
  }, [forcedRole, pathname, user?.role]);

  // 2. Navigation groups
  const navGroups = useMemo<NavGroup[]>(() => {
    if (isPersonal) return PERSONAL_NAV;
    if (effectiveRole === "CO-CEO") return ORG_COCEO_NAV;
    if (effectiveRole === "MEMBER") return ORG_MEMBER_NAV;
    return ORG_CEO_NAV;
  }, [isPersonal, effectiveRole]);

  // 3. Collapsible sections state management (SSR-safe deterministic initial state)
  const [mounted, setMounted] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("sidebar_sections_state");
        if (stored) {
          setCollapsedSections(JSON.parse(stored));
        }
      } catch { }
    }
  }, []);

  // Automatically expand the section that contains the active route after mount
  useEffect(() => {
    if (!mounted) return;
    for (const group of navGroups) {
      const containsActive = group.items.some((item) => isItemActive(pathname, item.href));
      if (containsActive && collapsedSections[group.id]) {
        setCollapsedSections((prev) => {
          const next = { ...prev, [group.id]: false };
          try {
            localStorage.setItem("sidebar_sections_state", JSON.stringify(next));
          } catch { }
          return next;
        });
        break;
      }
    }
  }, [pathname, navGroups, collapsedSections, mounted]);

  const toggleSection = (groupId: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem("sidebar_sections_state", JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  // 4. Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  // 5. Scroll state tracking for subtle top/bottom scroll indicators (No visible scrollbar)
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScrollState = useCallback(() => {
    const el = navContainerRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const el = navContainerRef.current;
    if (!el) return;

    checkScrollState();
    el.addEventListener("scroll", checkScrollState, { passive: true });
    window.addEventListener("resize", checkScrollState);

    return () => {
      el.removeEventListener("scroll", checkScrollState);
      window.removeEventListener("resize", checkScrollState);
    };
  }, [checkScrollState, navGroups, collapsedSections]);

  // Scroll to top on initial load
  useEffect(() => {
    if (navContainerRef.current) {
      navContainerRef.current.scrollTop = 0;
    }
  }, []);

  return (
    <aside
      aria-label="Application Sidebar"
      className={`
        hidden md:flex flex-col h-[100vh] h-[100dvh] shrink-0 select-none
        bg-[#FFFFFF] dark:bg-[#0B0D10] text-[#17202A] dark:text-[#F2F3F5]
        border-r border-[#E5E7EB] dark:border-[#24282E]
        transition-[width] duration-200 ease-in-out z-40 overflow-hidden relative
        ${isCollapsed ? "w-[72px]" : "w-[272px]"}
      `}
    >
      {/* ───────────────────────────────────────────────────────
          PRODUCT BRAND HEADER (h-[64px], fixed)
          (Official ManMadhan Progress Logo Asset)
      ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 h-[64px] border-b border-[#E5E7EB] dark:border-[#24282E] flex items-center px-3.5 bg-[#FFFFFF] dark:bg-[#0B0D10]">
        {isCollapsed ? (
          <div
            title="ManMadhan Progress · V1 · Execution OS"
            className="w-full flex items-center justify-center cursor-pointer"
          >
            <img
              src="/ios/iTunesArtwork@1x.png"
              alt="ManMadhan Progress Logo"
              className="w-8 h-8 rounded-lg object-cover shadow-2xs"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/ios/iTunesArtwork@1x.png"
              alt="ManMadhan Progress Logo"
              className="w-8 h-8 rounded-lg object-cover shrink-0 shadow-2xs"
            />
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[14px] font-semibold text-[#17202A] dark:text-[#F2F3F5] truncate leading-tight tracking-tight">
                ManMadhan Progress
              </span>
              <span className="text-[10.5px] font-mono text-[#667085] dark:text-[#8B94A3] truncate leading-tight mt-0.5">
                V1 · Execution OS
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────
          INDEPENDENTLY SCROLLABLE NAVIGATION CONTAINER
          (Begins IMMEDIATELY after product header, NO workspace switcher)
      ───────────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Subtle Top Scroll Edge Indicator */}
        {canScrollUp && (
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#FFFFFF] dark:from-[#0B0D10] to-transparent z-10 pointer-events-none transition-opacity duration-200" />
        )}

        {/* Scrollable Container (Visual scrollbar hidden) */}
        <div
          ref={navContainerRef}
          className="flex-1 overflow-y-auto min-h-0 py-3 px-3 space-y-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {navGroups.map((group) => {
            const isSectionCollapsed = collapsedSections[group.id] === true;

            return (
              <div key={group.id} className="space-y-1">
                {/* Section Header (Clickable Button) */}
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(group.id)}
                    aria-expanded={!isSectionCollapsed}
                    aria-controls={`section-${group.id}`}
                    className="w-full h-[32px] px-2 flex items-center justify-between text-[10.5px] font-mono uppercase tracking-[0.1em] font-medium text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] transition-colors rounded-md select-none group cursor-pointer"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#667085] dark:text-[#8B94A3] group-hover:text-current transition-transform duration-180 ${!isSectionCollapsed ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                ) : (
                  <div className="w-full h-px bg-[#E5E7EB] dark:bg-[#24282E] my-2" />
                )}

                {/* Items List (Collapsible) */}
                <div
                  id={`section-${group.id}`}
                  className={`space-y-1 transition-all duration-180 overflow-hidden ${!isCollapsed && isSectionCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[500px] opacity-100"
                    }`}
                >
                  {group.items.map((item) => {
                    const active = isItemActive(pathname, item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={isCollapsed ? item.name : undefined}
                        className={`
                          group relative flex items-center h-[40px] rounded-lg text-[13.5px] font-medium transition-all duration-150
                          ${isCollapsed ? "justify-center px-0" : "px-3 gap-3"}
                          ${active
                            ? "bg-[#FFF8E7] dark:bg-[#191812] text-[#17202A] dark:text-[#F2F3F5] font-semibold"
                            : "text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] hover:bg-[#F3F4F6] dark:hover:bg-[#151920]"
                          }
                        `}
                      >
                        {/* 2px Gold Left Active Indicator */}
                        {active && (
                          <div className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-r-full bg-[#B28D18] dark:bg-[#D4B12F]" />
                        )}

                        {/* Icon */}
                        <Icon
                          className={`w-[17px] h-[17px] shrink-0 transition-colors ${active
                              ? "text-[#B28D18] dark:text-[#D4B12F]"
                              : "text-[#667085] dark:text-[#8B94A3] group-hover:text-current"
                            }`}
                        />

                        {/* Item Label */}
                        {!isCollapsed && <span className="truncate">{item.name}</span>}

                        {/* Optional Badge */}
                        {!isCollapsed && item.badge && (
                          <span className="ml-auto text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#151920] text-[#667085] dark:text-[#8B94A3]">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtle Bottom Scroll Edge Indicator */}
        {canScrollDown && (
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#FFFFFF] dark:from-[#0B0D10] to-transparent z-10 pointer-events-none transition-opacity duration-200" />
        )}
      </div>

      {/* ───────────────────────────────────────────────────────
          FIXED USER / FOOTER (h-[96px], fixed at bottom)
          (Contains Static User Identity + Logout LEFT, Collapse RIGHT)
      ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 h-[96px] border-t border-[#E5E7EB] dark:border-[#24282E] p-3 space-y-2.5 bg-[#FFFFFF] dark:bg-[#0B0D10] relative">
        {/* Static User Identity Block (NOT CLICKABLE, NO CHEVRON, NO MENU) */}
        <div
          className={`flex items-center gap-2.5 ${isCollapsed ? "justify-center" : "px-1"
            }`}
        >
          <div
            title={isCollapsed ? `${user?.displayName || user?.name || "Sai Krishnan S"} (${isPersonal ? "Personal" : effectiveRole})` : undefined}
            className="w-8 h-8 rounded-full bg-[#B28D18]/15 dark:bg-[#D4B12F]/15 border border-[#B28D18]/20 dark:border-[#D4B12F]/20 flex items-center justify-center shrink-0 text-[#B28D18] dark:text-[#D4B12F] font-bold text-xs font-mono"
          >
            {(user?.displayName || user?.name || user?.email || "S").charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[13px] font-semibold text-[#17202A] dark:text-[#F2F3F5] truncate leading-tight">
                {user?.displayName || user?.name || "Sai Krishnan S"}
              </span>
              <span className="text-[11px] text-[#667085] dark:text-[#8B94A3] truncate leading-tight mt-0.5">
                {isPersonal ? "Personal" : effectiveRole}
              </span>
            </div>
          )}
        </div>

        {/* Footer Action Row: Logout on LEFT, Collapse on RIGHT */}
        <div
          className={`flex items-center ${isCollapsed ? "justify-center flex-col gap-2" : "justify-between px-0.5"
            } h-[36px]`}
        >
          {/* Left Side: Logout Button */}
          <button
            type="button"
            onClick={() => logout()}
            aria-label="Log out"
            title={isCollapsed ? "Log out" : undefined}
            className={`
              h-[36px] rounded-lg flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors
              text-[#667085] dark:text-[#8B94A3] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10
              ${isCollapsed ? "justify-center w-8" : "px-2"}
            `}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>

          {/* Right Side: Collapse Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : undefined}
            className={`
              h-[36px] rounded-lg flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors
              text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] hover:bg-[#F3F4F6] dark:hover:bg-[#151920]
              ${isCollapsed ? "justify-center w-8" : "px-2"}
            `}
          >
            {!isCollapsed && <span>Collapse</span>}
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 shrink-0" />
            ) : (
              <PanelLeftClose className="w-4 h-4 shrink-0" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
