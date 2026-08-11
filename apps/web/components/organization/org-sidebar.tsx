"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Focus, FolderKanban, CheckSquare, Calendar, History,
  Users, UserPlus, UserCheck, BarChart3, Trophy, ClipboardCheck, Inbox,
  FileText, Notebook, Settings, ShieldCheck, BookOpen, Bot,
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen,
  LogOut, Moon, Sun, Activity, Bell, Zap, Network
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth/auth-context";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";

type NavItem = { name: string; href: string; icon: any; badge?: number };
type NavGroup = { id: string; label: string; items: NavItem[]; roles: string[] };

function buildNav(role: string, base: string): NavGroup[] {
  const all: NavGroup[] = [
    // ── CEO / CO-CEO: Dashboard + Focus in Main ───────────────────────────────
    {
      id: "main", label: "Main", roles: ["CEO", "CO-CEO"],
      items: [
        { name: "Dashboard", href: `${base}/dashboard`, icon: LayoutDashboard },
        { name: "Focus", href: `${base}/focus`, icon: Focus },
      ],
    },
    // ── MEMBER: Dashboard only in Main ────────────────────────────────────────
    {
      id: "member-main", label: "Main", roles: ["MEMBER"],
      items: [
        { name: "Dashboard", href: `${base}/dashboard`, icon: LayoutDashboard },
      ],
    },

    // ── CEO Work ──────────────────────────────────────────────────────────────
    {
      id: "work", label: "Work", roles: ["CEO"],
      items: [
        { name: "My Work", href: `${base}/my-work`, icon: CheckSquare },
        { name: "Projects", href: `${base}/projects`, icon: FolderKanban },
        { name: "Tasks", href: `${base}/tasks`, icon: CheckSquare },
        { name: "Calendar", href: `${base}/calendar`, icon: Calendar },
        { name: "Timeline", href: `${base}/timeline`, icon: History },
      ],
    },
    // ── CO-CEO Work ───────────────────────────────────────────────────────────
    {
      id: "coceo-work", label: "Work", roles: ["CO-CEO"],
      items: [
        { name: "My Work", href: `${base}/my-work`, icon: CheckSquare },
        { name: "Tasks", href: `${base}/tasks`, icon: ClipboardCheck },
        { name: "Projects", href: `${base}/projects`, icon: FolderKanban },
        { name: "Calendar", href: `${base}/calendar`, icon: Calendar },
      ],
    },
    // ── MEMBER Work ───────────────────────────────────────────────────────────
    {
      id: "member-work", label: "Work", roles: ["MEMBER"],
      items: [
        { name: "My Work", href: `${base}/my-work`, icon: CheckSquare },
        { name: "Focus", href: `${base}/focus`, icon: Focus },
        { name: "Projects", href: `${base}/projects`, icon: FolderKanban },
      ],
    },

    // ── CEO People ────────────────────────────────────────────────────────────
    {
      id: "people", label: "People", roles: ["CEO"],
      items: [
        { name: "CO-CEOs", href: `${base}/co-ceos`, icon: UserCheck },
        { name: "Members", href: `${base}/members`, icon: Users },
        { name: "Organization Graph", href: `${base}/graph`, icon: Network },
        { name: "Invitations", href: `${base}/invitations`, icon: UserPlus },
      ],
    },
    // ── CO-CEO Management ─────────────────────────────────────────────────────
    {
      id: "team", label: "Management", roles: ["CO-CEO"],
      items: [
        { name: "Members", href: `${base}/members`, icon: Users },
        { name: "Submissions", href: `${base}/submissions`, icon: ClipboardCheck },
      ],
    },

    // ── CEO + CO-CEO Performance ──────────────────────────────────────────────
    {
      id: "performance", label: "Performance", roles: ["CEO", "CO-CEO"],
      items: [
        { name: "Reports", href: `${base}/reports`, icon: BarChart3 },
        { name: "Leaderboard", href: `${base}/leaderboard`, icon: Trophy },
      ],
    },
    // ── MEMBER Progress (personal) ────────────────────────────────────────────
    {
      id: "member-progress", label: "Progress", roles: ["MEMBER"],
      items: [
        { name: "Progress", href: `${base}/progress`, icon: Activity },
        { name: "Reports", href: `${base}/reports`, icon: BarChart3 },
        { name: "Leaderboard", href: `${base}/leaderboard`, icon: Trophy },
      ],
    },

    // ── CEO Control ───────────────────────────────────────────────────────────
    {
      id: "control", label: "Control", roles: ["CEO"],
      items: [
        { name: "Approvals", href: `${base}/approvals`, icon: ClipboardCheck },
        { name: "Requests", href: `${base}/requests`, icon: Inbox },
        { name: "Audit Log", href: `${base}/audit`, icon: ShieldCheck },
      ],
    },
    // ── CO-CEO Requests ───────────────────────────────────────────────────────
    {
      id: "requests-coceo", label: "Requests", roles: ["CO-CEO"],
      items: [
        { name: "Requests", href: `${base}/requests`, icon: Inbox },
      ],
    },
    // ── MEMBER Requests ───────────────────────────────────────────────────────
    {
      id: "requests-member", label: "Requests", roles: ["MEMBER"],
      items: [
        { name: "Requests", href: `${base}/requests`, icon: Inbox },
      ],
    },

    // ── Communication ─────────────────────────────────────────────────────────
    {
      id: "comms", label: "Communication", roles: ["CEO", "CO-CEO", "MEMBER"],
      items: [
        { name: "Notifications", href: `${base}/notifications`, icon: Bell },
      ],
    },

    // ── Knowledge ─────────────────────────────────────────────────────────────
    {
      id: "knowledge", label: "Knowledge", roles: ["CEO", "CO-CEO", "MEMBER"],
      items: [
        { name: "Documents", href: `${base}/documents`, icon: FileText },
        { name: "Notes", href: `${base}/notes`, icon: Notebook },
      ],
    },

    // ── AI Tools ─────────────────────────────────────────────────────────────
    {
      id: "ai-tools", label: "AI Tools", roles: ["CEO", "CO-CEO"],
      items: [
        { name: "Prompt Library", href: `${base}/prompt-library`, icon: BookOpen },
        { name: "AI Builder", href: `${base}/ai-builder`, icon: Bot },
      ],
    },

    // ── System ────────────────────────────────────────────────────────────────
    {
      id: "system", label: "System", roles: ["CEO", "CO-CEO", "MEMBER"],
      items: [
        { name: "Settings", href: `${base}/settings`, icon: Settings },
      ],
    },

    // ── CO-CEO Automation ─────────────────────────────────────────────────────
    {
      id: "automation", label: "Automation", roles: ["CO-CEO"],
      items: [
        { name: "Automation", href: `${base}/automation`, icon: Zap },
      ],
    },
  ];

  return all.filter(g => g.roles.includes(role));
}

interface OrgSidebarProps {
  role: "CEO" | "CO-CEO" | "MEMBER";
  base: string; // e.g. "/ceo"
}

export function OrgSidebar({ role, base }: OrgSidebarProps) {
  const pathname = usePathname();
  const isTablet = useMediaQuery("(max-width: 1024px) and (min-width: 769px)");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const { socket } = useSocket();
  const [organization, setOrganization] = useState<any>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    let cancelled = false;
    apiClient.get("/organization/profile").then((res) => {
      if (!cancelled && res.data.success) setOrganization(res.data.data);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!socket) return;
    const handleOrganizationUpdated = (updated: any) => setOrganization(updated);
    socket.on("organization.updated", handleOrganizationUpdated);
    return () => { socket.off("organization.updated", handleOrganizationUpdated); };
  }, [socket]);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const navGroups = buildNav(role, base);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    navGroups.reduce((acc, g) => ({ ...acc, [g.id]: true }), {})
  );

  useEffect(() => {
    const handleOpen = () => setIsMobileOpen(true);
    const handleToggle = () => setIsCollapsed(p => !p);
    window.addEventListener("open-sidebar", handleOpen);
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => { window.removeEventListener("open-sidebar", handleOpen); window.removeEventListener("toggle-sidebar", handleToggle); };
  }, []);

  useEffect(() => {
    if (isTablet) setIsCollapsed(true);
    else if (!isMobile) setIsCollapsed(false);
  }, [isTablet, isMobile]);

  const roleColor = role === "CEO" ? "text-gold" : role === "CO-CEO" ? "text-purple-400" : "text-emerald-400";
  const roleBg = role === "CEO" ? "bg-amber-600" : role === "CO-CEO" ? "bg-purple-600" : "bg-emerald-600";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-border shrink-0">
        <div className={`flex items-center gap-3 ${isCollapsed && !isMobile ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-border bg-muted flex items-center justify-center text-xs font-bold text-foreground">
            {organization?.logoUrl ? <img src={organization.logoUrl} alt="Organization logo" className="w-full h-full object-cover" /> : (organization?.shortName || organization?.name?.slice(0, 1) || "O")}
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="overflow-hidden">
              <p className="text-[15px] font-bold text-foreground leading-none truncate">{organization?.name || "Organization"}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">Organization Workspace</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        {navGroups.map((group) => {
          const isExpanded = expanded[group.id];
          return (
            <div key={group.id} className="mb-4 last:mb-0">
              <button
                onClick={() => {
                  if (isCollapsed && !isMobile) setIsCollapsed(false);
                  setExpanded(p => ({ ...p, [group.id]: !p[group.id] }));
                }}
                className={`w-full flex items-center justify-between px-2 mb-1 ${isCollapsed && !isMobile ? "justify-center" : ""}`}
              >
                {(!isCollapsed || isMobile) ? (
                  <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{group.label}</span>
                ) : (
                  <div className="w-4 h-[1px] bg-border/50 my-2" />
                )}
                {(!isCollapsed || isMobile) && (
                  isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {(isExpanded || (isCollapsed && !isMobile)) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 overflow-hidden"
                  >
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link key={item.name} href={item.href} onClick={() => isMobile && setIsMobileOpen(false)}>
                          <div
                            title={isCollapsed && !isMobile ? item.name : undefined}
                            className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors duration-150 cursor-pointer ${isActive ? "bg-accent text-foreground font-semibold" : "text-muted-foreground hover:bg-accent hover:text-foreground font-medium"} ${isCollapsed && !isMobile ? "justify-center px-0" : ""}`}
                          >
                            <item.icon className={`shrink-0 ${isCollapsed && !isMobile ? "w-5 h-5" : "w-[18px] h-[18px]"} ${isActive ? `stroke-2 ${roleColor}` : "stroke-2"}`} />
                            {(!isCollapsed || isMobile) && (
                              <span className="text-[13px] truncate">{item.name}</span>
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

      {/* Footer */}
      <div className="shrink-0 border-t border-border bg-card">
        {/* Status bar */}
        {(!isCollapsed || isMobile) && (
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">
                {role === "CEO" ? "Organization" : role === "CO-CEO" ? "Department" : "My Progress"}
              </span>
              <Activity className={`w-3.5 h-3.5 ${roleColor}`} />
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${role === "CEO" ? "bg-gold" : role === "CO-CEO" ? "bg-purple-500" : "bg-emerald-500"} w-4/5`} />
            </div>
          </div>
        )}

        <div className="p-4 hidden md:flex flex-col gap-2">
          <div className={`flex items-center ${isCollapsed && !isMobile ? "flex-col gap-3" : "justify-between"}`}>
            <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed && !isMobile ? "justify-center" : ""}`}>
              <div className={`w-8 h-8 rounded-full ${roleBg} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                {user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
              </div>
              {(!isCollapsed || isMobile) && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-foreground truncate">{user?.displayName || user?.name || "User"}</span>
                  <span className={`text-[10px] font-bold ${roleColor}`}>{role}</span>
                </div>
              )}
            </div>
            <div className={`flex items-center gap-1 ${isCollapsed && !isMobile ? "flex-col" : ""}`}>
              {(!isCollapsed || isMobile) && (
                <button onClick={() => setTheme(isDark ? "light" : "dark")} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Toggle theme">
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
              <button onClick={logout} className="p-1.5 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors" title="Log out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isCollapsed && !isMobile && (
            <div className="flex justify-end">
              <button onClick={() => setIsCollapsed(true)} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-accent">
                <PanelLeftClose className="w-4 h-4" /> Collapse
              </button>
            </div>
          )}
          {isCollapsed && !isMobile && (
            <div className="flex justify-center">
              <button onClick={() => setIsCollapsed(false)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Expand">
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <motion.aside
        animate={{ width: isCollapsed ? 80 : 260 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="hidden md:flex flex-col h-[100dvh] border-r border-border bg-card sticky top-0 left-0 shrink-0 z-30"
      >
        <SidebarContent />
      </motion.aside>

      <AnimatePresence>
        {isMobileOpen && isMobile && (
          <div className="md:hidden fixed inset-0 z-[100]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileOpen(false)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              drag="x" dragConstraints={{ right: 0 }} dragElastic={0.2}
              onDragEnd={(_, { offset, velocity }) => { if (offset.x < -100 || velocity.x < -500) setIsMobileOpen(false); }}
              className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-[320px] bg-card border-r border-border shadow-2xl overflow-hidden"
            >
              <SidebarContent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
