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
    id: "home",
    label: "Home",
    items: [
      { name: "Dashboard", href: "/personal/dashboard", icon: LayoutDashboard },
      { name: "Focus", href: "/personal/focus", icon: Focus }
    ]
  },
  {
    id: "work",
    label: "Work",
    items: [
      { name: "Projects", href: "/personal/projects", icon: FolderKanban },
      { name: "Tasks", href: "/personal/tasks", icon: CheckSquare },
      { name: "Calendar", href: "/personal/calendar", icon: Calendar },
      { name: "Timeline", href: "/personal/timeline", icon: History }
    ]
  },
  {
    id: "life",
    label: "Life",
    items: [
      { name: "Journal", href: "/personal/journal", icon: PenTool },
      { name: "Books", href: "/personal/books", icon: BookOpen },
      { name: "Podcasts", href: "/personal/podcasts", icon: Headphones },
      { name: "Learning", href: "/personal/learning", icon: GraduationCap }
    ]
  },
  {
    id: "knowledge",
    label: "Knowledge",
    items: [
      { name: "Notes", href: "/personal/notes", icon: FileText },
      { name: "Documents", href: "/personal/documents", icon: Archive },
      { name: "Prompt Library", href: "/personal/prompt-library", icon: Sparkles }
    ]
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      { name: "AI Builder", href: "/personal/ai-builder", icon: Brain },
      { name: "Prompt Library", href: "/personal/prompt-library", icon: BookOpen }
    ]
  },
  {
    id: "system",
    label: "System",
    items: [
      { name: "Integrations", href: "/personal/integrations", icon: LinkIcon },
      { name: "Reports", href: "/personal/reports", icon: LineChart },
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
    "home": true,
    "work": true,
    "life": true,
    "knowledge": true,
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

  const MobileSidebarContent = () => {
    const mobileItems = [
      { name: "Dashboard", href: "/personal/dashboard", icon: LayoutDashboard },
      { name: "Focus", href: "/personal/focus", icon: Focus },
      { name: "Projects", href: "/personal/projects", icon: FolderKanban },
      { name: "Tasks", href: "/personal/tasks", icon: CheckSquare },
      { name: "Calendar", href: "/personal/calendar", icon: Calendar },
      { name: "Timeline", href: "/personal/timeline", icon: History },
      { name: "Journal", href: "/personal/journal", icon: PenTool },
      { name: "Books", href: "/personal/books", icon: BookOpen },
      { name: "Podcasts", href: "/personal/podcasts", icon: Headphones },
      { name: "Learning", href: "/personal/learning", icon: GraduationCap },
      { name: "Notes", href: "/personal/notes", icon: FileText },
      { name: "Files", href: "/personal/documents", icon: Archive },
      { name: "AI Builder", href: "/personal/ai-builder", icon: Brain },
      { name: "Prompt Library", href: "/personal/prompt-library", icon: BookOpen },
      { name: "Integrations", href: "/personal/integrations", icon: LinkIcon },
      { name: "Settings", href: "/personal/settings", icon: Settings }
    ];

    return (
      <div className="flex flex-col h-[100dvh] overflow-hidden bg-card text-foreground">
        {/* Top Brand & Close */}
        <div className="flex items-center justify-between px-4 h-14 shrink-0">
          <div className="font-bold text-[14px] sm:text-[15px] tracking-wide text-foreground">ManMadhan Progress</div>
          <button 
            onClick={() => setIsMobileDrawerOpen(false)}
            className="w-11 h-11 flex items-center justify-center -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Identity */}
        <div className="flex items-center gap-3 px-4 py-2 sm:py-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center font-bold shadow-sm border border-border">
            M
          </div>
          <div className="flex flex-col flex-1 min-w-0 justify-center">
            <span className="text-[14px] font-bold truncate text-foreground leading-tight mb-0.5">MM1107</span>
            <span className="text-[12px] text-muted-foreground truncate leading-tight">Personal Workspace</span>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shrink-0" />
        </div>

        <div className="h-px bg-border/50 shrink-0 mx-4 my-2 sm:my-3" />

        {/* Navigation Section */}
        <div className="px-4 py-1 sm:py-2 shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest px-1">
            Navigation
          </span>
        </div>

        {/* Navigation Grid (Auto-flowing 2 columns) */}
        <div className="px-4 flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 sm:gap-y-1.5 h-full content-start">
            {mobileItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.name} href={item.href} onClick={() => setIsMobileDrawerOpen(false)}>
                  <div className={`flex items-center gap-2.5 px-3 py-2 sm:py-2.5 rounded-[12px] transition-colors duration-200 ${
                    isActive 
                      ? "bg-[#D99A00]/10 dark:bg-[#F5B800]/10 text-foreground font-semibold" 
                      : "text-muted-foreground font-medium hover:bg-accent/50"
                  }`}>
                    <item.icon className={`w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] shrink-0 ${isActive ? "text-[#D99A00] dark:text-[#F5B800] stroke-[2.5]" : "stroke-2"}`} />
                    <span className="text-[13px] sm:text-[14px] truncate pt-px">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-border/50 shrink-0 mx-4 my-2 sm:my-3" />

        {/* Account Section */}
        <div className="px-4 py-1 shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest px-1">
            Account
          </span>
        </div>
        
        <div className="px-4 pb-2 sm:pb-3 shrink-0 flex flex-col gap-0.5 sm:gap-1">
          <Link href="/personal/notifications" onClick={() => setIsMobileDrawerOpen(false)}>
            <div className="flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-[12px] text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors font-medium cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Bell className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] shrink-0 stroke-2" />
                <span className="text-[13px] sm:text-[14px] pt-px">Notifications</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0" />
            </div>
          </Link>
          <div className="flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-[12px] text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors font-medium cursor-pointer" onClick={() => setIsMobileDrawerOpen(false)}>
            <div className="flex items-center gap-2.5">
              <UserCircle className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] shrink-0 stroke-2" />
              <span className="text-[13px] sm:text-[14px] pt-px">Profile</span>
            </div>
          </div>
        </div>

        {/* Bottom Branding */}
        <div className="pb-4 sm:pb-6 pt-2 shrink-0 text-center flex justify-center">
          <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
            ManMadhan
          </span>
        </div>
      </div>
    );
  };

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
        {/* Settings removed from here, now in SYSTEM group */}

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
              className="absolute top-0 left-0 bottom-0 w-[calc(100vw-32px)] max-w-[390px] bg-card shadow-2xl overflow-hidden"
            >
              <MobileSidebarContent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
