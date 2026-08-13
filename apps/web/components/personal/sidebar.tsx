"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CheckSquare, FolderKanban, Focus, Calendar, Bell, History,
  PenTool, BookOpen, Headphones, GraduationCap,
  FileText, Archive, Sparkles, Brain,
  LinkIcon, LineChart, Settings, Zap,
  PanelLeftClose, PanelLeftOpen, ChevronDown,
  LogOut, Moon, Sun, User as UserIcon, Building, Check, X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "../../hooks/use-media-query";
import { useTheme } from "next-themes";
import { useAuth } from "../auth/auth-context";
import { ResponsivePopover } from "../ui/responsive-popover";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";

/* ─────────────────────────────────────────────────────────── types */
type NavItem  = { name: string; href: string; icon: React.ElementType };
type NavGroup = { id: string; label: string; items: NavItem[] };

/* ──────────────────────────────────────────────────────── nav data */
const NAVIGATION: NavGroup[] = [
  {
    id: "main",
    label: "MAIN",
    items: [
      { name: "Dashboard", href: "/personal/dashboard", icon: LayoutDashboard },
      { name: "Focus",     href: "/personal/focus",     icon: Focus },
    ],
  },
  {
    id: "work",
    label: "WORK",
    items: [
      { name: "Projects",  href: "/personal/projects",  icon: FolderKanban },
      { name: "Tasks",     href: "/personal/tasks",     icon: CheckSquare },
      { name: "Calendar",  href: "/personal/calendar",  icon: Calendar },
      { name: "Timeline",  href: "/personal/timeline",  icon: History },
    ],
  },
  {
    id: "life",
    label: "LIFE",
    items: [
      { name: "Journal",   href: "/personal/journal",   icon: PenTool },
      { name: "Books",     href: "/personal/books",     icon: BookOpen },
      { name: "Podcasts",  href: "/personal/podcasts",  icon: Headphones },
      { name: "Learning",  href: "/personal/learning",  icon: GraduationCap },
    ],
  },
  {
    id: "knowledge",
    label: "KNOWLEDGE",
    items: [
      { name: "Notes",     href: "/personal/notes",     icon: FileText },
      { name: "Documents", href: "/personal/documents", icon: Archive },
    ],
  },
  {
    id: "ai",
    label: "AI",
    items: [
      { name: "AI Builder",     href: "/personal/ai-builder",    icon: Brain },
      { name: "Prompt Library", href: "/personal/prompt-library", icon: Sparkles },
    ],
  },
  {
    id: "system",
    label: "SYSTEM",
    items: [
      { name: "Automation", href: "/personal/automation", icon: Zap },
      { name: "Reminders",  href: "/personal/reminders",  icon: Bell },
      { name: "Reports",    href: "/personal/reports",    icon: LineChart },
    ],
  },
  {
    id: "account",
    label: "ACCOUNT",
    items: [
      { name: "Profile",  href: "/personal/profile",  icon: UserIcon },
      { name: "Settings", href: "/personal/settings", icon: Settings },
    ],
  },
];

/* ─────────────────────────────── active-route helper (exact segment) */
function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

/* ─────────────────────────── WorkspaceSwitcher (personal sidebar variant) */
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

  const trigger = (
    <button
      onClick={() => setIsOpen(o => !o)}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      title={isCollapsed && !isMobile ? "Personal Workspace" : undefined}
      className={`
        w-full flex items-center gap-2.5 rounded-xl transition-colors duration-150
        hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        ${isCollapsed && !isMobile ? "justify-center p-2" : "px-3 py-2.5"}
        ${isOpen ? "bg-accent" : ""}
      `}
    >
      <div className="relative shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
        <Image
          src="/ios/iTunesArtwork@1x.png"
          alt="ManMadhan Progress"
          fill
          sizes="32px"
          className="object-cover"
          priority
        />
      </div>
      {(!isCollapsed || isMobile) && (
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[14px] font-semibold text-foreground leading-tight truncate">
            ManMadhan Progress
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
            Personal Workspace
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
      desktopClassName="w-[268px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col p-2 gap-1 z-50"
      trigger={trigger}
    >
      <div className="flex flex-col gap-1 p-1">
        <div className="px-2 pt-1 pb-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Switch Workspace
          </p>
        </div>

        {/* Personal — currently active */}
        <button
          role="option"
          aria-selected={isPersonal}
          onClick={() => handleSwitch("personal")}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-150
            ${isPersonal ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
          `}
        >
          <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate leading-tight">Personal</p>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">Private workspace</p>
          </div>
          {isPersonal && <Check className="w-4 h-4 text-gold shrink-0" />}
        </button>

        {/* Org workspaces */}
        {orgWorkspaces.map(ws => {
          const isActive = !isPersonal && activeWorkspaceId === ws.id;
          return (
            <button
              key={ws.id}
              role="option"
              aria-selected={isActive}
              onClick={() => handleSwitch("org", ws.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-150
                ${isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
              `}
            >
              <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                <Building className="w-3.5 h-3.5 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{ws.name}</p>
                <p className="text-[11px] text-muted-foreground truncate leading-tight">Organization</p>
              </div>
              {isActive && <Check className="w-4 h-4 text-gold shrink-0" />}
            </button>
          );
        })}

        {/* Fallback when no org workspaces loaded */}
        {orgWorkspaces.length === 0 && (
          <button
            role="option"
            aria-selected={false}
            onClick={() => handleSwitch("org", activeWorkspaceId || "")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
          >
            <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
              <Building className="w-3.5 h-3.5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">Organization</p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">Switch workspace</p>
            </div>
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

/* ──────────────────────────────────────────────── main sidebar component */
export function Sidebar() {
  const pathname = usePathname();
  const isTablet  = useMediaQuery("(max-width: 1024px) and (min-width: 769px)");
  const isMobile  = useMediaQuery("(max-width: 768px)");

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const { logout, user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  /* expanded state — all groups open by default */
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    NAVIGATION.reduce((acc, g) => ({ ...acc, [g.id]: true }), {} as Record<string, boolean>)
  );

  const toggleSection = useCallback((id: string) => {
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  }, []);

  /* window events for external triggers (mobile-header open button) */
  useEffect(() => {
    const onOpen   = () => setIsMobileDrawerOpen(true);
    const onToggle = () => setIsCollapsed(p => !p);
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

  /* user display */
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "P";
  const displayName = user?.displayName || user?.name || "Personal User";

  /* tooltip helper */
  const tt = (label: string) => (isCollapsed && !isMobile ? label : undefined);

  /* ──────────────────────────────────── desktop sidebar content */
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-border">
        <SidebarWorkspaceSwitcher isCollapsed={isCollapsed} isMobile={isMobile} />
      </div>

      {/* ── Scrollable Nav ── */}
      <nav
        aria-label="Personal workspace navigation"
        className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3"
        style={{ scrollbarWidth: "none" }}
      >
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>

        {NAVIGATION.map((group) => {
          const isExpanded = expanded[group.id] ?? true;

          return (
            <div key={group.id} className="mb-5 last:mb-0">
              {/* section label */}
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => {
                  if (isCollapsed && !isMobile) setIsCollapsed(false);
                  else toggleSection(group.id);
                }}
                title={tt(group.label)}
                className={`
                  w-full flex items-center mb-1.5 px-2 py-0.5 rounded-md
                  transition-colors duration-150 hover:bg-accent/50
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${isCollapsed && !isMobile ? "justify-center" : "justify-between"}
                `}
              >
                {(!isCollapsed || isMobile) ? (
                  <span className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest select-none">
                    {group.label}
                  </span>
                ) : (
                  <div className="w-5 h-px bg-border mx-auto" />
                )}
                {(!isCollapsed || isMobile) && (
                  <ChevronDown
                    className={`w-3 h-3 text-muted-foreground/40 transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                  />
                )}
              </button>

              {/* items */}
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
                            if (isMobile) setIsMobileDrawerOpen(false);
                            const m = document.querySelector("main");
                            if (m) m.scrollTop = 0;
                          }}
                          aria-current={active ? "page" : undefined}
                          title={tt(item.name)}
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
                            <span className="text-[13.5px] leading-none truncate">{item.name}</span>
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

        {/* personal status strip — only when expanded */}
        {(!isCollapsed || isMobile) && (
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">
                Personal
              </span>
              <LineChart className="w-3.5 h-3.5 text-gold" />
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gold" style={{ width: "72%" }} />
            </div>
          </div>
        )}

        {/* profile + controls */}
        <div className="hidden md:block p-4">
          <div className={`flex items-center ${isCollapsed && !isMobile ? "flex-col gap-3" : "gap-3"}`}>

            {/* avatar */}
            <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold text-xs font-bold shrink-0 select-none">
              {user?.avatar ? (
                <img src={user.avatar} alt={displayName} className="w-full h-full object-cover rounded-full" />
              ) : initials}
            </div>

            {/* name + role */}
            {(!isCollapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-foreground leading-none truncate">{displayName}</p>
                <p className="text-[11px] font-medium leading-none mt-1 text-gold">Personal</p>
              </div>
            )}

            {/* actions */}
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

  /* ─────────────────────────── mobile drawer content (full-screen friendly) */
  const MobileDrawerContent = () => {
    const mobileItems: NavItem[] = [
      { name: "Dashboard",      href: "/personal/dashboard",      icon: LayoutDashboard },
      { name: "Focus",          href: "/personal/focus",          icon: Focus },
      { name: "Projects",       href: "/personal/projects",       icon: FolderKanban },
      { name: "Tasks",          href: "/personal/tasks",          icon: CheckSquare },
      { name: "Calendar",       href: "/personal/calendar",       icon: Calendar },
      { name: "Reminders",      href: "/personal/reminders",      icon: Bell },
      { name: "Timeline",       href: "/personal/timeline",       icon: History },
      { name: "Journal",        href: "/personal/journal",        icon: PenTool },
      { name: "Books",          href: "/personal/books",          icon: BookOpen },
      { name: "Podcasts",       href: "/personal/podcasts",       icon: Headphones },
      { name: "Learning",       href: "/personal/learning",       icon: GraduationCap },
      { name: "Notes",          href: "/personal/notes",          icon: FileText },
      { name: "Documents",      href: "/personal/documents",      icon: Archive },
      { name: "Prompt Library", href: "/personal/prompt-library", icon: Sparkles },
      { name: "AI Builder",     href: "/personal/ai-builder",     icon: Brain },
      { name: "Integrations",   href: "/personal/integrations",   icon: LinkIcon },
      { name: "Reports",        href: "/personal/reports",        icon: LineChart },
      { name: "Settings",       href: "/personal/settings",       icon: Settings },
    ];

    return (
      <div className="flex flex-col h-[100dvh] overflow-hidden bg-card text-foreground">

        {/* top bar */}
        <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
              <Image src="/ios/iTunesArtwork@1x.png" alt="ManMadhan Progress" fill sizes="28px" className="object-cover" />
            </div>
            <span className="text-[14px] font-semibold text-foreground leading-none">ManMadhan Progress</span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-label="Close navigation"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* workspace identity */}
        <div className="px-4 py-3 shrink-0">
          <p className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">
            Personal Workspace
          </p>
        </div>

        {/* nav grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: "none" }}>
          <div className="grid grid-cols-2 gap-1.5">
            {mobileItems.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`
                    flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${active
                      ? "bg-accent text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground font-medium"}
                  `}
                >
                  <item.icon
                    className={`w-[17px] h-[17px] shrink-0 stroke-2 ${active ? "text-gold" : ""}`}
                  />
                  <span className="text-[13px] truncate leading-none">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* bottom account strip */}
        <div className="shrink-0 border-t border-border px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={displayName} className="w-full h-full object-cover rounded-full" />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate leading-none">{displayName}</p>
            <p className="text-[11px] text-cyan-400 font-medium leading-none mt-1">Personal</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
          >
            <LogOut className="w-[15px] h-[15px]" />
          </button>
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────── render desktop + mobile */
  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 76 : 268 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="hidden md:flex flex-col h-[100dvh] border-r border-border bg-card sticky top-0 left-0 shrink-0 z-30"
        aria-label="Personal workspace sidebar"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileDrawerOpen && isMobile && (
          <div className="md:hidden fixed inset-0 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileDrawerOpen(false)}
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
                if (offset.x < -80 || velocity.x < -400) setIsMobileDrawerOpen(false);
              }}
              className="absolute top-0 left-0 bottom-0 w-[82vw] max-w-[300px] bg-card border-r border-border shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <MobileDrawerContent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
