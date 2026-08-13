"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Focus, FolderKanban, CheckSquare, Calendar, History,
  Users, UserPlus, UserCheck, Network, ClipboardCheck, Inbox,
  BarChart3, Trophy, ShieldCheck, FileText, Notebook, Settings, Bot,
  BookOpen, Bell, Zap, Activity,
  ChevronDown, PanelLeftClose, PanelLeftOpen,
  LogOut, Moon, Sun, Building, User as UserIcon, Check,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth/auth-context";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { ResponsivePopover } from "@/components/ui/responsive-popover";

/* ─────────────────────────────────────────────────────────── types */
type NavItem  = { name: string; href: string; icon: React.ElementType };
type NavGroup = { id: string; label: string; items: NavItem[]; roles: string[] };

/* ─────────────────────────────────────────────────────── nav config */

// CEO navigation — full governance workspace
const CEO_NAV: NavGroup[] = [
  {
    id: "main", label: "MAIN", roles: ["CEO"],
    items: [
      { name: "Dashboard",  href: "/ceo/dashboard",  icon: LayoutDashboard },
      { name: "Focus",      href: "/ceo/focus",      icon: Focus },
    ],
  },
  {
    id: "work", label: "WORK", roles: ["CEO"],
    items: [
      { name: "Projects",   href: "/ceo/projects",   icon: FolderKanban },
      { name: "Tasks",      href: "/ceo/tasks",      icon: ClipboardCheck },
      { name: "Calendar",   href: "/ceo/calendar",   icon: Calendar },
      { name: "Timeline",   href: "/ceo/timeline",   icon: History },
    ],
  },
  {
    id: "people", label: "PEOPLE", roles: ["CEO"],
    items: [
      { name: "CO-CEOs",      href: "/ceo/co-ceos",      icon: UserCheck },
      { name: "Members",      href: "/ceo/members",      icon: Users },
      { name: "Invitations",  href: "/ceo/invitations",  icon: UserPlus },
    ],
  },
  {
    id: "performance", label: "PERFORMANCE", roles: ["CEO"],
    items: [
      { name: "Organization Graph", href: "/ceo/graph",       icon: Network },
      { name: "Leaderboard",        href: "/ceo/leaderboard", icon: Trophy },
    ],
  },
  {
    id: "administration", label: "ADMINISTRATION", roles: ["CEO"],
    items: [
      { name: "Automation",   href: "/ceo/automation",   icon: Zap },
      { name: "Organization", href: "/ceo/organization", icon: Building },
      { name: "Settings",     href: "/ceo/settings",     icon: Settings },
    ],
  },
];

// CO-CEO navigation — execution + team management, no CEO governance
const COCEO_NAV: NavGroup[] = [
  {
    id: "main", label: "MAIN", roles: ["CO-CEO"],
    items: [
      { name: "Dashboard", href: "/co-ceo/dashboard", icon: LayoutDashboard },
      { name: "Focus",     href: "/co-ceo/focus",     icon: Focus },
    ],
  },
  {
    id: "work", label: "WORK", roles: ["CO-CEO"],
    items: [
      { name: "My Work",     href: "/co-ceo/my-work",     icon: CheckSquare },
      { name: "My Projects", href: "/co-ceo/projects",    icon: FolderKanban },
      { name: "Tasks",       href: "/co-ceo/tasks",       icon: ClipboardCheck },
      { name: "Automation",  href: "/co-ceo/automation",  icon: Zap },
      { name: "Calendar",    href: "/co-ceo/calendar",    icon: Calendar },
      { name: "Timeline",    href: "/co-ceo/timeline",    icon: History },
    ],
  },
  {
    id: "team", label: "TEAM", roles: ["CO-CEO"],
    items: [
      { name: "My Members", href: "/co-ceo/members",   icon: Users },
      { name: "Approvals",  href: "/co-ceo/approvals", icon: ClipboardCheck },
    ],
  },
  {
    id: "organization", label: "ORGANIZATION", roles: ["CO-CEO"],
    items: [
      { name: "Documents",          href: "/co-ceo/documents",          icon: FileText },
      { name: "Leaderboard",        href: "/co-ceo/leaderboard",        icon: Trophy },
      { name: "Organization Graph", href: "/co-ceo/organization-graph", icon: Network },
    ],
  },
  {
    id: "account", label: "ACCOUNT", roles: ["CO-CEO"],
    items: [
      { name: "Profile",  href: "/co-ceo/profile",  icon: UserIcon },
      { name: "Settings", href: "/co-ceo/settings", icon: Settings },
    ],
  },
];

// MEMBER navigation — execution only, no governance, no team management
const MEMBER_NAV: NavGroup[] = [
  {
    id: "main", label: "MAIN", roles: ["MEMBER"],
    items: [
      { name: "Dashboard", href: "/member/dashboard", icon: LayoutDashboard },
      { name: "Focus",     href: "/member/focus",     icon: Focus },
    ],
  },
  {
    id: "work", label: "WORK", roles: ["MEMBER"],
    items: [
      { name: "My Work",     href: "/member/my-work",    icon: CheckSquare },
      { name: "My Projects", href: "/member/projects",   icon: FolderKanban },
      { name: "Tasks",       href: "/member/tasks",      icon: ClipboardCheck },
      { name: "Automation",  href: "/member/automation", icon: Zap },
      { name: "Calendar",    href: "/member/calendar",   icon: Calendar },
      { name: "Timeline",    href: "/member/timeline",   icon: History },
    ],
  },
  {
    id: "submissions", label: "SUBMISSIONS", roles: ["MEMBER"],
    items: [
      { name: "My Submissions", href: "/member/submissions", icon: ClipboardCheck },
    ],
  },
  {
    id: "knowledge", label: "KNOWLEDGE", roles: ["MEMBER"],
    items: [
      { name: "Documents", href: "/member/documents", icon: FileText },
    ],
  },
  {
    id: "progress", label: "PROGRESS", roles: ["MEMBER"],
    items: [
      { name: "My Progress", href: "/member/progress", icon: BarChart3 },
    ],
  },
  {
    id: "account", label: "ACCOUNT", roles: ["MEMBER"],
    items: [
      { name: "Notifications", href: "/member/notifications", icon: Bell },
      { name: "Profile",       href: "/member/profile",       icon: UserIcon },
      { name: "Settings",      href: "/member/settings",      icon: Settings },
    ],
  },
];

function buildNav(role: string, _base: string): NavGroup[] {
  if (role === "CEO")    return CEO_NAV;
  if (role === "CO-CEO") return COCEO_NAV;
  return MEMBER_NAV;
}


/* ─────────────────────────────────── active-route helper (exact segment) */
function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // Match nested routes: /ceo/projects/123 → active for /ceo/projects
  // but NOT /ceo/my-work matching /ceo/m
  return pathname.startsWith(href + "/");
}

/* ─────────────────────────────────── WorkspaceSwitcher (sidebar variant) */
function SidebarWorkspaceSwitcher({
  isCollapsed,
  isMobile,
}: {
  isCollapsed: boolean;
  isMobile: boolean;
}) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (isLoading || !user) return;
    apiClient.get("/workspaces").then(res => {
      if (res.data.success) setWorkspaces(res.data.data || []);
    }).catch(() => undefined);
  }, [user, isLoading]);

  useEffect(() => {
    if (!socket) return;
    const handler = (updated: any) =>
      setWorkspaces(ws => ws.map(w => w.id === updated.id ? { ...w, ...updated } : w));
    socket.on("organization.updated", handler);
    return () => { socket.off("organization.updated", handler); };
  }, [socket]);

  const isPersonal = pathname.startsWith("/personal");
  const activeWorkspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
  const userRole = (user?.role || "CEO").toUpperCase();

  const handleSwitch = (type: "personal" | "org", wsId?: string) => {
    setIsOpen(false);
    if (type === "personal") {
      window.location.href = "/personal/dashboard";
    } else if (wsId) {
      localStorage.setItem("workspaceId", wsId);
      let target = "/ceo/dashboard";
      if (userRole === "CO-CEO") target = "/co-ceo/dashboard";
      else if (userRole === "MEMBER") target = "/member/dashboard";
      window.location.href = target;
    }
  };

  const orgWorkspaces = workspaces.filter(w => !w.name.toLowerCase().includes("personal"));

  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    const loadLogo = () => {
      if (typeof window !== "undefined") {
        const storedLogo = localStorage.getItem("orgLogo");
        if (storedLogo) setCustomLogo(storedLogo);
      }
    };
    loadLogo();
    window.addEventListener("orgLogoUpdated", loadLogo);
    return () => window.removeEventListener("orgLogoUpdated", loadLogo);
  }, []);

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const trigger = (
    <button
      onClick={() => setIsOpen(o => !o)}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      title={isCollapsed && !isMobile ? (isPersonal ? "Personal Workspace" : "Organization Workspace") : undefined}
      className={`
        w-full flex items-center gap-2.5 rounded-xl transition-colors duration-150
        hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        ${isCollapsed && !isMobile ? "justify-center p-2" : "px-3 py-2.5"}
        ${isOpen ? "bg-accent" : ""}
      `}
    >
      <div className="relative shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
        {(customLogo || activeWs?.logoUrl) ? (
          <img
            src={customLogo || activeWs?.logoUrl}
            alt="ManMadhan Logo"
            className="w-full h-full object-cover"
          />
        ) : (
          <Image
            src="/ios/iTunesArtwork@1x.png"
            alt="ManMadhan Progress"
            fill
            sizes="32px"
            className="object-cover"
            priority
          />
        )}
      </div>
      {(!isCollapsed || isMobile) && (
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[14px] font-semibold text-foreground leading-tight truncate">
            ManMadhan Progress
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
            Organization Workspace
          </p>
        </div>
      )}
      {(!isCollapsed || isMobile) && (
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      )}
    </button>
  );

  return (
    <ResponsivePopover
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      align="left"
      desktopClassName="w-[280px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col p-2 gap-1 z-50"
      trigger={trigger}
    >
      <div className="flex flex-col gap-1.5 p-1">
        <div className="px-2 pt-1 pb-1">
          <p className="text-[10px] font-bold text-gold uppercase tracking-wider">
            Organization Communities & Hubs
          </p>
        </div>

        {/* ManMadhan Hub - 1 (Admin Only) */}
        <button
          role="option"
          aria-selected={!isPersonal}
          onClick={() => handleSwitch("org", activeWorkspaceId || "hub-1")}
          className="w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left bg-gold/10 border border-gold/30 hover:bg-gold/15 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-gold/20 text-gold flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
            H1
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[12px] font-bold text-foreground truncate">ManMadhan Hub - 1</p>
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30 shrink-0">
                Admin Only
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
              Executive Strategy & Governance
            </p>
          </div>
        </button>

        {/* ManMadhan Hub - 2 (Admin + Member) */}
        <button
          role="option"
          aria-selected={false}
          onClick={() => handleSwitch("org", activeWorkspaceId || "hub-2")}
          className="w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-muted text-foreground flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
            H2
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[12px] font-bold text-foreground truncate">ManMadhan Hub - 2</p>
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border shrink-0">
                Admin + Member
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
              Tasks, Projects & Team Execution
            </p>
          </div>
        </button>

        <div className="my-0.5 border-t border-border/60" />

        {/* Personal Workspace */}
        <button
          role="option"
          aria-selected={isPersonal}
          onClick={() => handleSwitch("personal")}
          className={`
            w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors duration-150
            ${isPersonal ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
          `}
        >
          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center border border-border shrink-0">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-foreground truncate leading-tight">Personal Workspace</p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight">Private space</p>
          </div>
          {isPersonal && <Check className="w-3.5 h-3.5 text-gold shrink-0" />}
        </button>

        {/* Fallback when no org workspaces returned yet */}
        {orgWorkspaces.length === 0 && !isPersonal && (
          <button
            role="option"
            aria-selected={true}
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left bg-accent text-foreground"
          >
            <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
              <Building className="w-3.5 h-3.5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">Organization</p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">Current workspace</p>
            </div>
            <Check className="w-4 h-4 text-gold shrink-0" />
          </button>
        )}

        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden w-full mt-1 h-10 rounded-xl bg-muted/60 hover:bg-muted text-[12px] font-semibold text-muted-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </ResponsivePopover>
  );
}

/* ─────────────────────────────────────────────── main component props */
export interface OrgSidebarProps {
  role: "CEO" | "CO-CEO" | "MEMBER";
  base: string;
}

export function OrgSidebar({ role, base }: OrgSidebarProps) {
  const pathname = usePathname();
  const isTablet  = useMediaQuery("(max-width: 1024px) and (min-width: 769px)");
  const isMobile  = useMediaQuery("(max-width: 768px)");

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { logout, user } = useAuth();
  const { socket } = useSocket();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [organization, setOrganization] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;
    apiClient.get("/organization/profile").then(res => {
      if (!cancelled && res.data.success) setOrganization(res.data.data);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (updated: any) => setOrganization(updated);
    socket.on("organization.updated", handler);
    return () => { socket.off("organization.updated", handler); };
  }, [socket]);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  const navGroups = useMemo(() => buildNav(role, base), [role, base]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    navGroups.reduce((acc, g) => ({ ...acc, [g.id]: true }), {} as Record<string, boolean>)
  );

  const toggleSection = useCallback((id: string) => {
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  }, []);

  /* window event listeners for external triggers */
  useEffect(() => {
    const onOpen    = () => setIsMobileOpen(true);
    const onToggle  = () => setIsCollapsed(p => !p);
    window.addEventListener("open-sidebar",   onOpen);
    window.addEventListener("toggle-sidebar", onToggle);
    return () => {
      window.removeEventListener("open-sidebar",   onOpen);
      window.removeEventListener("toggle-sidebar", onToggle);
    };
  }, []);

  /* auto-collapse on tablet */
  useEffect(() => {
    if (isTablet) setIsCollapsed(true);
    else if (!isMobile) setIsCollapsed(false);
  }, [isTablet, isMobile]);

  /* ── role accent colors */
  const roleAccent = "text-gold";

  const roleAvatarBg =
    role === "CEO" ? "bg-amber-600" :
    role === "CO-CEO" ? "bg-amber-700" : "bg-emerald-600";

  /* ── initials */
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const displayName = user?.displayName || user?.name || "User";

  /* ── tooltip title helper for collapsed items */
  const tooltipTitle = (label: string) =>
    isCollapsed && !isMobile ? label : undefined;

  /* ───────────────────────────────────────── sidebar content render */
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-border">
        <SidebarWorkspaceSwitcher isCollapsed={isCollapsed} isMobile={isMobile} />
      </div>

      {/* ── Scrollable Nav ── */}
      <nav
        aria-label="Organization navigation"
        className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3"
        style={{ scrollbarWidth: "none" }}
      >
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>

        {navGroups.map((group) => {
          const isExpanded = expanded[group.id] ?? true;

          return (
            <div key={group.id} className="mb-5 last:mb-0">
              {/* section header */}
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => {
                  if (isCollapsed && !isMobile) {
                    setIsCollapsed(false);
                  } else {
                    toggleSection(group.id);
                  }
                }}
                title={tooltipTitle(group.label)}
                className={`
                  w-full flex items-center mb-1.5 px-2 py-0.5 rounded-md
                  transition-colors duration-150 group
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  hover:bg-accent/50
                  ${isCollapsed && !isMobile ? "justify-center" : "justify-between"}
                `}
              >
                {(!isCollapsed || isMobile) ? (
                  <span className="text-[10.5px] font-semibold text-foreground/80 dark:text-muted-foreground/60 uppercase tracking-widest select-none">
                    {group.label}
                  </span>
                ) : (
                  <div className="w-5 h-px bg-border mx-auto" />
                )}
                {(!isCollapsed || isMobile) && (
                  <ChevronDown
                    className={`
                      w-3 h-3 text-muted-foreground/40 transition-transform duration-200
                      ${isExpanded ? "rotate-0" : "-rotate-90"}
                    `}
                  />
                )}
              </button>

              {/* nav items */}
              <AnimatePresence initial={false}>
                {(isExpanded || (isCollapsed && !isMobile)) && (
                  <motion.div
                    key="items"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="overflow-hidden flex flex-col gap-0.5"
                  >
                    {group.items.map((item) => {
                      const active = isNavItemActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            if (isMobile) setIsMobileOpen(false);
                            const m = document.querySelector("main");
                            if (m) m.scrollTop = 0;
                          }}
                          aria-current={active ? "page" : undefined}
                          title={tooltipTitle(item.name)}
                          className={`
                            flex items-center gap-3 rounded-xl transition-colors duration-150
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                            ${isCollapsed && !isMobile
                              ? "justify-center px-0 py-2.5 mx-auto w-10 h-10"
                              : "px-3 py-2.5"}
                            ${active
                              ? "bg-[#FFF8E7] dark:bg-[#E3AA18]/10 text-[#111827] dark:text-[#F5F5F5] font-semibold border-l-2 border-[#D9A514] dark:border-[#E3AA18]"
                              : "text-[#4B5563] dark:text-[#858585] hover:bg-[#F3F4F6] dark:hover:bg-[#151515] hover:text-[#111827] dark:hover:text-[#D6D6D6] font-medium"}
                          `}
                        >
                          <item.icon
                            className={`
                              shrink-0 w-[18px] h-[18px] stroke-2
                              ${active ? "text-[#D9A514] dark:text-[#E3AA18]" : "text-[#6B7280] dark:text-[#858585]"}
                            `}
                          />
                          {(!isCollapsed || isMobile) && (
                            <span className="text-[13.5px] leading-none truncate">
                              {item.name}
                            </span>
                          )}
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

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-border bg-card">

        {/* organization status bar — only when expanded */}
        {(!isCollapsed || isMobile) && (
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">
                {role === "CEO" ? "Organization" : role === "CO-CEO" ? "Department" : "My Progress"}
              </span>
              <Activity className={`w-3.5 h-3.5 ${roleAccent}`} />
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: "80%" }}
              />
            </div>
          </div>
        )}

        {/* profile + controls */}
        <div className="hidden md:block p-4">
          <div className={`flex items-center ${isCollapsed && !isMobile ? "flex-col gap-3" : "gap-3"}`}>

            {/* avatar */}
            <div className={`w-8 h-8 rounded-full ${roleAvatarBg} flex items-center justify-center text-white text-xs font-bold shrink-0 select-none`}>
              {user?.avatar ? (
                <img src={user.avatar} alt={displayName} className="w-full h-full object-cover rounded-full" />
              ) : initials}
            </div>

            {/* name + role */}
            {(!isCollapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-foreground leading-none truncate">{displayName}</p>
                <p className={`text-[11px] font-medium leading-none mt-1 ${roleAccent}`}>{role}</p>
              </div>
            )}

            {/* action buttons */}
            <div className={`flex items-center gap-1 ${isCollapsed && !isMobile ? "flex-col" : "ml-auto"}`}>
              {(!isCollapsed || isMobile) && (
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isDark ? <Sun className="w-[15px] h-[15px]" /> : <Moon className="w-[15px] h-[15px]" />}
                </button>
              )}
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="w-[15px] h-[15px]" />
              </button>
            </div>
          </div>

          {/* collapse toggle */}
          <div className={`mt-3 flex ${isCollapsed && !isMobile ? "justify-center" : "justify-end"}`}>
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                aria-label="Collapse sidebar"
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 px-2 py-1 rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
                Collapse
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /* ─────────────────────────────────────── render desktop + mobile */
  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 76 : 268 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="hidden md:flex flex-col h-[100dvh] border-r border-border bg-card sticky top-0 left-0 shrink-0 z-30"
        aria-label="Organization workspace sidebar"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && isMobile && (
          <div className="md:hidden fixed inset-0 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              drag="x"
              dragConstraints={{ right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, { offset, velocity }) => {
                if (offset.x < -80 || velocity.x < -400) setIsMobileOpen(false);
              }}
              className="absolute top-0 left-0 bottom-0 w-[82vw] max-w-[300px] bg-card border-r border-border shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <SidebarContent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
