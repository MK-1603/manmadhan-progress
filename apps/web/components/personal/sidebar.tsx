"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, CheckSquare, FolderKanban, Target, Map, Flag, Trophy, 
  Image as ImageIcon, Brain, FileText, BookOpen, Headphones, Newspaper,
  GraduationCap, Zap, LayoutTemplate, Focus, Calendar, Clock, LineChart, 
  Repeat, Folder, Sparkles, Bell, Settings, ShieldCheck,
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, 
  Building2, UserCircle, Check, Menu, X, LogOut, Moon,
  PenTool, Lightbulb, TrendingUp, History, Activity, Search, Archive, Link as LinkIcon, Terminal
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "../../hooks/use-media-query";
import { useTheme } from "next-themes";

import { ResponsivePopover } from "../ui/responsive-popover";
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
};

// --- Data ---
const NAVIGATION_DATA: NavGroup[] = [
  {
    id: "today",
    label: "Today",
    items: [
      { name: "Dashboard", href: "/personal/dashboard", icon: LayoutDashboard },
      { name: "Focus", href: "/personal/focus", icon: Focus },
      { name: "Calendar", href: "/personal/calendar", icon: Calendar }
    ]
  },
  {
    id: "execute",
    label: "Execute",
    items: [
      { name: "Tasks", href: "/personal/tasks", icon: CheckSquare },
      { name: "Projects", href: "/personal/projects", icon: FolderKanban },
      { name: "Goals", href: "/personal/goals", icon: Target },
      { name: "Habits", href: "/personal/habits", icon: Repeat }
    ]
  },
  {
    id: "knowledge",
    label: "Knowledge",
    items: [
      { name: "Notes", href: "/personal/notes", icon: FileText },
      { name: "Journal", href: "/personal/journal", icon: PenTool }
    ]
  },
  {
    id: "learn",
    label: "Learn",
    items: [
      { name: "Books", href: "/personal/books", icon: BookOpen },
      { name: "Learning", href: "/personal/learning", icon: GraduationCap },
      { name: "Podcasts", href: "/personal/podcasts", icon: Headphones }
    ]
  },
  {
    id: "storage",
    label: "Storage",
    items: [
      { name: "Files", href: "/personal/files", icon: Folder },
      { name: "Personal Vault", href: "/personal/vault", icon: ShieldCheck }
    ]
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      { name: "Productivity", href: "/personal/productivity", icon: TrendingUp },
      { name: "Personal Analytics", href: "/personal/analytics", icon: LineChart }
    ]
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      { name: "Personal Assistant", href: "/personal/assistant", icon: Sparkles }
    ]
  },
  {
    id: "system",
    label: "System",
    items: [
      { name: "Notifications", href: "/personal/notifications", icon: Bell },
      { name: "Integrations", href: "/personal/integrations", icon: LinkIcon },
      { name: "Settings", href: "/personal/settings", icon: Settings }
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
    "today": true,
    "execute": true,
    "knowledge": true,
    "learn": true,
    "storage": true,
    "insights": true,
    "intelligence": true,
    "system": true
  });

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
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm border border-border">
            <Image
              src="/ios/iTunesArtwork@1x.png"
              alt="Logo"
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex flex-col justify-center overflow-hidden whitespace-nowrap pt-0.5">
              <span className="text-[15px] font-bold text-foreground leading-none">Personal Space</span>
              <span className="text-[10px] font-medium text-muted-foreground mt-1">Focus & Growth</span>
            </div>
          )}
        </div>

      </div>
      
      {/* Navigation */}
      <div data-lenis-prevent="true" className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        {NAVIGATION_DATA.map((group) => {
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
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link key={item.name} href={item.href}>
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

      {/* Footer Area */}
      <div className="flex flex-col shrink-0 border-t border-border bg-card">
        {/* Settings & Switcher */}
        {(!isCollapsed || isMobile) ? (
          <div className="p-3 flex flex-col gap-2">
            <Link href="/personal/settings">
              <div className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-muted-foreground hover:bg-accent hover:text-foreground font-medium ${pathname === "/personal/settings" ? "bg-accent text-foreground font-semibold" : ""}`}>
                <Settings className="w-[18px] h-[18px] shrink-0" />
                <span className="text-[13px]">Settings</span>
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-3">
            <Link href="/personal/settings" title="Settings">
              <div className={`p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${pathname === "/personal/settings" ? "bg-accent text-foreground" : ""}`}>
                <Settings className="w-5 h-5" />
              </div>
            </Link>
          </div>
        )}

        {/* Profile / Actions */}
        <div className={`p-4 flex flex-col gap-4 bg-muted/10 hidden md:flex border-t border-border/50`}>
          
          <div className={`flex items-center ${isCollapsed && !isMobile ? "flex-col gap-4" : "justify-between"}`}>
            <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed && !isMobile ? "justify-center" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-cyan-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm border border-border cursor-pointer hover:border-cyan-500/50 transition-all">
                {user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : "PU"}
              </div>
              {(!isCollapsed || isMobile) && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-extrabold text-foreground truncate leading-tight cursor-pointer hover:text-cyan-400 transition-colors">
                    {user?.displayName || user?.name || (user?.email ? user.email.split("@")[0] : "Personal User")}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground truncate mt-0.5">
                    <span className="text-cyan-400 font-bold">Personal Account</span> • <span className="text-blue-500 font-medium">Execution OS</span>
                  </span>
                </div>
              )}
            </div>
            
            <div className={`flex items-center gap-1 shrink-0 ${isCollapsed && !isMobile ? "flex-col" : ""}`}>
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

      {/* Mobile Drawer */}
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
