"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, FolderKanban, CheckSquare, Activity, Calendar, 
  Users, ShieldAlert, UserPlus, Fingerprint, CalendarOff,
  BarChart3, LineChart, PieChart, CheckCircle2,
  Bell, Megaphone, Send, ShieldCheck, MessageSquare, Shield, Smartphone, HardDrive, Inbox, Zap, Clock,
  ClipboardList, Search, Settings, Link as LinkIcon, Lock, 
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, 
  Building2, UserCircle, Check,
  Menu, X, LogOut, Moon
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "../../hooks/use-media-query";
import { useTheme } from "next-themes";

import { useAuth } from "../auth/auth-context";

// --- Types ---
type NavItem = {
  name: string;
  href: string;
  icon: any;
  badge?: number;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
  allowedRoles: string[]; // ["CEO", "CO-CEO", "MEMBER"]
};

// --- Data ---
const NAVIGATION_DATA: NavGroup[] = [
  {
    id: "command",
    label: "Command",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }
    ]
  },
  {
    id: "work",
    label: "Work",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban },
      { name: "Work", href: "/tasks", icon: CheckSquare },
      { name: "Calendar", href: "/calendar", icon: Calendar },
      { name: "Reviews", href: "/reviews", icon: CheckCircle2 }
    ]
  },
  {
    id: "organization",
    label: "Organization",
    allowedRoles: ["CEO", "CO-CEO"],
    items: [
      { name: "Members", href: "/members", icon: Users },
      { name: "Departments", href: "/departments", icon: Building2 },
      { name: "Assignments", href: "/assignments", icon: UserPlus },
      { name: "Organization", href: "/organization", icon: ShieldAlert }
    ]
  },
  {
    id: "performance",
    label: "Performance",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { name: "Progress", href: "/progress", icon: Activity },
      { name: "Analytics", href: "/analytics", icon: LineChart },
      { name: "Reports", href: "/reports", icon: PieChart },
      { name: "Leaderboard", href: "/leaderboard", icon: BarChart3 }
    ]
  },
  {
    id: "communication",
    label: "Communication",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { name: "Notifications", href: "/notifications", icon: Bell },
      { name: "Activity", href: "/activity", icon: Zap }
    ]
  },
  {
    id: "automation",
    label: "Automation & Intelligence",
    allowedRoles: ["CEO", "CO-CEO"],
    items: [
      { name: "AI Intelligence", href: "/ai", icon: Zap },
      { name: "Automations", href: "/automations", icon: Settings },
      { name: "Integrations", href: "/integrations", icon: LinkIcon }
    ]
  },
  {
    id: "administration",
    label: "Administration",
    allowedRoles: ["CEO"],
    items: [
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Audit Log", href: "/audit", icon: ClipboardList }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isTablet = useMediaQuery("(max-width: 1024px) and (min-width: 769px)");
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const { logout, user } = useAuth();
  const defaultRoleFromPath = pathname?.startsWith("/co-ceo") ? "CO-CEO" : pathname?.startsWith("/member") ? "MEMBER" : pathname?.startsWith("/personal") ? "PERSONAL" : "CEO";
  const userRole = (user?.role || defaultRoleFromPath).toUpperCase();

  // Listen for the custom event from mobile-header.tsx to open the sidebar
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
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "command": true,
    "work": true,
    "organization": true,
    "performance": true,
    "communication": true,
    "automation": true,
    "administration": true
  });

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const isPersonal = pathname.startsWith("/personal");

  useEffect(() => {
    if (isTablet) setIsCollapsed(true);
    else if (!isMobile) setIsCollapsed(false);
  }, [isTablet, isMobile]);

  const toggleGroup = (id: string) => {
    if (isCollapsed && !isMobile) {
      setIsCollapsed(false); // Auto expand sidebar if clicking a collapsed group
    }
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Components ---

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* Header */}
      <div className={`px-4 pt-5 pb-4 flex flex-col border-b border-border transition-all shrink-0`}>
        <div className={`flex items-center gap-3 min-w-0 ${isCollapsed && !isMobile ? "justify-center" : ""}`}>
          <Image src="/ios/iTunesArtwork@1x.png" alt="ManMadhan Progress" width={32} height={32} className="rounded-lg shadow-sm shrink-0" />
          {(!isCollapsed || isMobile) && (
            <div className="flex flex-col justify-center overflow-hidden whitespace-nowrap pt-0.5">
              <span className="text-[15px] font-bold text-foreground leading-none">ManMadhan Progress</span>
              <span className="text-[10px] font-medium text-muted-foreground mt-1">Execution OS</span>
            </div>
          )}
        </div>

      </div>
      
      {/* Navigation */}
      <div data-lenis-prevent="true" className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        {NAVIGATION_DATA.filter(g => g.allowedRoles.includes(userRole)).map((group) => {
            const isExpanded = expandedGroups[group.id];
            
            return (
              <div key={group.id} className="mb-4 last:mb-0">
                {/* Group Header */}
                <button 
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-2 mb-1 group-btn ${isCollapsed && !isMobile ? "justify-center" : ""}`}
                >
                  {(!isCollapsed || isMobile) ? (
                    <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest group-hover:text-foreground/80 transition-colors">
                      {group.label}
                    </span>
                  ) : (
                    <div className="w-4 h-[1px] bg-border/50 my-2" />
                  )}
                  {(!isCollapsed || isMobile) && (
                    isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                  )}
                </button>

                {/* Group Items */}
                <AnimatePresence initial={false}>
                  {(isExpanded || (isCollapsed && !isMobile)) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex flex-col gap-0.5 overflow-hidden"
                    >
                      {group.items.map((item) => {
                        const baseRoute = userRole === "CO-CEO" ? "/co-ceo" : userRole === "MEMBER" ? "/member" : "/ceo";
                        const finalHref = `${baseRoute}${item.href}`;
                        const isActive = pathname === finalHref || pathname.startsWith(finalHref + "/");
                        return (
                          <Link key={item.name} href={finalHref}>
                              <div
                                title={(isCollapsed && !isMobile) ? item.name : undefined}
                                className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors duration-200 cursor-pointer ${
                                  isActive 
                                    ? "bg-accent text-foreground font-semibold" 
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground font-medium"
                                } ${isCollapsed && !isMobile ? "justify-center px-0" : ""}`}
                              >
                              
                              <item.icon className={`shrink-0 ${isCollapsed && !isMobile ? "w-5 h-5" : "w-[18px] h-[18px]"} ${isActive ? "stroke-2 text-gold" : "stroke-2"}`} />
                              
                              {(!isCollapsed || isMobile) && (
                                <div className="flex items-center justify-between flex-1 min-w-0">
                                  <span className="text-[13px] truncate">{item.name}</span>
                                  {item.badge && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground text-[8px] font-bold ml-2">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
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

      {/* Footer Area (Role Status Panel + Profile) */}
      <div className="flex flex-col shrink-0 border-t border-border bg-card">
        {/* Role Status Panel */}
        {(!isCollapsed || isMobile) && (
          <div className="p-4 border-b border-border/50">
            <div className="flex flex-col mb-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-foreground">
                  {userRole === "CEO" ? "Organization Health" : userRole === "CO-CEO" ? "Department Execution" : "Personal Goal Progress"}
                </span>
                <span className="text-[11px] font-bold text-foreground">
                  {userRole === "CEO" ? "82%" : userRole === "CO-CEO" ? "88%" : "95%"}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-2.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${userRole === "CEO" ? "bg-gold" : userRole === "CO-CEO" ? "bg-purple-500" : "bg-emerald-500"}`} 
                  style={{ width: userRole === "CEO" ? "82%" : userRole === "CO-CEO" ? "88%" : "95%" }} 
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  {userRole === "CEO" ? "🔥 91% Productivity" : userRole === "CO-CEO" ? "⚡ 12 Active Tasks" : "✅ 8 Tasks Completed"}
                </span>
                <span className="text-muted-foreground font-medium">
                  {userRole === "CEO" ? "245 Tasks" : userRole === "CO-CEO" ? "Department AI" : "Execution OS"}
                </span>
              </div>
            </div>
          </div>
        )}

        {isCollapsed && !isMobile && (
          <div className="p-3 border-b border-border/50 flex justify-center" title="Execution OS">
            <Activity className="w-4 h-4 text-gold" />
          </div>
        )}

        {/* Profile / Actions */}
        <div className="p-4 border-t border-border hidden md:flex flex-col gap-2 shrink-0 bg-muted/10">
          <div className={`flex items-center ${isCollapsed && !isMobile ? "flex-col gap-4" : "justify-between"}`}>
            <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed && !isMobile ? "justify-center" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm border border-border cursor-pointer hover:border-gold/50 transition-all ${userRole === "CEO" ? "bg-amber-600" : userRole === "CO-CEO" ? "bg-purple-600" : "bg-emerald-600"}`}>
                {user?.name ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : "SK"}
              </div>
              {(!isCollapsed || isMobile) && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-extrabold text-foreground truncate leading-tight cursor-pointer hover:text-gold transition-colors">
                    {user?.displayName || user?.name || (user?.email ? user.email.split("@")[0] : "User")}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground truncate mt-0.5">
                    <span className={userRole === "CEO" ? "text-gold font-bold" : userRole === "CO-CEO" ? "text-purple-400 font-bold" : userRole === "PERSONAL" ? "text-cyan-400 font-bold" : "text-emerald-400 font-bold"}>
                      {userRole === "CO-CEO" ? "CO-CEO" : userRole === "CEO" ? "CEO" : userRole === "PERSONAL" ? "Personal" : userRole === "MEMBER" ? "Member" : userRole}
                    </span> • <span className="text-blue-500 font-medium">Execution OS</span>
                  </span>
                </div>
              )}
            </div>

            <div className={`flex items-center gap-1 shrink-0 ${isCollapsed && !isMobile ? "flex-col" : ""}`}>
              {(!isCollapsed || isMobile) && (
                <button 
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0" 
                  title={isDark ? "Switch to light theme" : "Switch to dark theme"}
                >
                  <Moon className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={logout}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors shrink-0 cursor-pointer" 
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dedicated Collapse Button at absolute bottom */}
          {(!isCollapsed || isMobile) && (
            <div className="flex justify-end hidden md:flex">
              <button 
                onClick={() => setIsCollapsed(true)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-accent"
              >
                <PanelLeftClose className="w-4 h-4" />
                Collapse
              </button>
            </div>
          )}
          {isCollapsed && !isMobile && (
            <div className="flex justify-center hidden md:flex">
              <button 
                onClick={() => setIsCollapsed(false)}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors hover:bg-accent"
                title="Expand"
              >
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
      {/* Desktop / Tablet Sidebar */}
      <motion.aside 
        animate={{ width: isCollapsed ? 80 : 260 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="hidden md:flex flex-col h-[100dvh] border-r border-border bg-card sticky top-0 left-0 shrink-0 z-30"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Drawer (Uses ResponsivePopover mechanics internally or standard framer motion) */}
      <AnimatePresence>
        {isMobileDrawerOpen && isMobile && (
          <div className="md:hidden fixed inset-0 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              drag="x"
              dragConstraints={{ right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.x < -100 || velocity.x < -500) {
                  setIsMobileDrawerOpen(false);
                }
              }}
              className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-[320px] bg-card border-r border-border shadow-2xl overflow-y-auto"
            >
              <button 
                onClick={() => setIsMobileDrawerOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-muted/50 text-foreground z-10"
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
