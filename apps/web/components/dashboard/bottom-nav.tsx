"use client";

import {
  LayoutDashboard, FolderKanban, Plus, User, Menu, X, Home,
  TrendingUp, Users, UserCheck, Calendar as Cal, Trophy, FileText, BarChart,
  CheckSquare, Bell, Megaphone, UserPlus, Activity, ClipboardList, Settings,
  Target, Map, Notebook, BookOpen, Headphones, GraduationCap, Zap, CheckCircle, Files as FilesIcon,
  Building2, UserCircle, ShieldCheck, MonitorSmartphone, Palette, HelpCircle, LogOut, Check,
  PenSquare, UserPlus2, Focus, Search, Archive, Link as LinkIcon, Terminal, Lightbulb, Clock, Sparkles, History, Moon, Sun
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";

import { useAuth } from "../auth/auth-context";
import { SinglePromptModal } from "../personal/single-prompt-modal";

type BottomNavProps = {
  workspace: "personal" | "organization";
  role?: "CEO" | "CO-CEO" | "MEMBER";
};

export function BottomNav({ workspace, role }: BottomNavProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [aiCaptureOpen, setAiCaptureOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  // Workspace is supplied by the route layout. Do not infer it from a URL:
  // that allowed personal and organization navigation to drift together.
  const isPersonal = workspace === "personal";
  const isCoCeo = role === "CO-CEO";
  const isMember = role === "MEMBER";

  const userRole = isCoCeo ? "CO-CEO" : isMember ? "MEMBER" : role || ((user?.role || "CEO").toUpperCase() as "CEO" | "CO-CEO" | "MEMBER");

  const getHref = (page: string) => {
    if (isPersonal) return `/personal/${page}`;
    if (userRole === "CO-CEO") return `/co-ceo/${page}`;
    if (userRole === "MEMBER") return `/member/${page}`;
    return `/ceo/${page}`;
  };

  const navItemsLeft = isPersonal ? [
    { name: "Dashboard", href: "/personal/dashboard", icon: LayoutDashboard },
    { name: "Focus",     href: "/personal/focus",     icon: Focus },
    { name: "Tasks",     href: "/personal/tasks",     icon: CheckSquare },
  ] : userRole === "MEMBER" ? [
    { name: "Dashboard", href: "/member/dashboard", icon: LayoutDashboard },
    { name: "Work",      href: "/member/my-work",   icon: CheckSquare },
    { name: "Focus",     href: "/member/focus",     icon: Focus },
  ] : userRole === "CO-CEO" ? [
    { name: "Dashboard", href: "/co-ceo/dashboard", icon: LayoutDashboard },
    { name: "Work",      href: "/co-ceo/my-work",   icon: CheckSquare },
    { name: "Tasks",     href: "/co-ceo/tasks",     icon: ClipboardList },
  ] : [
    { name: "Dashboard", href: "/ceo/dashboard",    icon: LayoutDashboard },
    { name: "Projects",  href: "/ceo/projects",     icon: FolderKanban },
    { name: "Tasks",     href: "/ceo/tasks",        icon: ClipboardList },
  ];

  const navItemsRight = isPersonal ? [
    { name: "Calendar",  href: "/personal/calendar", icon: Cal },
    { name: "Profile",   href: "/personal/profile",  icon: User },
  ] : userRole === "MEMBER" ? [
    { name: "Calendar",  href: "/member/calendar",   icon: Cal },
    { name: "Progress",  href: "/member/progress",   icon: Activity },
  ] : userRole === "CO-CEO" ? [
    { name: "Calendar",  href: "/co-ceo/calendar",   icon: Cal },
    { name: "Members",   href: "/co-ceo/members",    icon: Users },
  ] : [
    { name: "Calendar",  href: "/ceo/calendar",     icon: Cal },
    { name: "Members",   href: "/ceo/members",      icon: Users },
  ];

  // More Sheet Navigation Links — strictly role-aware & workspace-isolated
  const orgLinksByCeo = [
    { label: "Projects", icon: FolderKanban, href: getHref("projects") },
    { label: "CO-CEOs", icon: UserCheck, href: getHref("co-ceos") },
    { label: "Members", icon: Users, href: getHref("members") },
    { label: "Invitations", icon: UserPlus, href: getHref("invitations") },
    { label: "Reports", icon: BarChart, href: getHref("reports") },
    { label: "Leaderboard", icon: Trophy, href: getHref("leaderboard") },
    { label: "Approvals", icon: ClipboardList, href: getHref("approvals") },
    { label: "Requests", icon: Bell, href: getHref("requests") },
    { label: "Audit Log", icon: ShieldCheck, href: getHref("audit") },
    { label: "Timeline", icon: History, href: getHref("timeline") },
    { label: "Documents", icon: Archive, href: getHref("documents") },
    { label: "Notes", icon: FileText, href: getHref("notes") },
    { label: "Integrations", icon: LinkIcon, href: getHref("integrations") },
    { label: "Settings", icon: Settings, href: getHref("settings") },
  ];

  const orgLinksByCoCeo = [
    { label: "My Work", icon: CheckSquare, href: getHref("my-work") },
    { label: "Members", icon: Users, href: getHref("members") },
    { label: "Submissions", icon: ClipboardList, href: getHref("submissions") },
    { label: "Projects", icon: FolderKanban, href: getHref("projects") },
    { label: "Reports", icon: BarChart, href: getHref("reports") },
    { label: "Leaderboard", icon: Trophy, href: getHref("leaderboard") },
    { label: "Requests", icon: Bell, href: getHref("requests") },
    { label: "Notifications", icon: Bell, href: getHref("notifications") },
    { label: "Documents", icon: Archive, href: getHref("documents") },
    { label: "Notes", icon: FileText, href: getHref("notes") },
    { label: "Settings", icon: Settings, href: getHref("settings") },
  ];

  const orgLinksByMember = [
    { label: "Focus",        icon: Focus,        href: getHref("focus") },
    { label: "Progress",     icon: Activity,     href: getHref("progress") },
    { label: "Projects",     icon: FolderKanban, href: getHref("projects") },
    { label: "Reports",      icon: BarChart,     href: getHref("reports") },
    { label: "Leaderboard",  icon: Trophy,       href: getHref("leaderboard") },
    { label: "Requests",     icon: Bell,         href: getHref("requests") },
    { label: "Notifications",icon: Bell,         href: getHref("notifications") },
    { label: "Documents",    icon: Archive,      href: getHref("documents") },
    { label: "Notes",        icon: FileText,     href: getHref("notes") },
    { label: "Settings",     icon: Settings,     href: getHref("settings") },
  ];

  const orgLinks = userRole === "CO-CEO" ? orgLinksByCoCeo : userRole === "MEMBER" ? orgLinksByMember : orgLinksByCeo;

  const personalLinks = [
    { label: "Automation", href: "/personal/automation", icon: Zap },
    { label: "Projects", href: "/personal/projects", icon: FolderKanban },
    { label: "Tasks", href: "/personal/tasks", icon: CheckSquare },
    { label: "Calendar", href: "/personal/calendar", icon: Cal },
    { label: "Reminders", href: "/personal/reminders", icon: Bell },
    { label: "Timeline", href: "/personal/timeline", icon: History },
    { label: "Journal", href: "/personal/journal", icon: PenSquare },
    { label: "Books", href: "/personal/books", icon: BookOpen },
    { label: "Podcasts", href: "/personal/podcasts", icon: Headphones },
    { label: "Learning", href: "/personal/learning", icon: GraduationCap },
    { label: "Notes", href: "/personal/notes", icon: FileText },
    { label: "Documents", href: "/personal/documents", icon: Archive },
    { label: "Reports", href: "/personal/reports", icon: BarChart },
    { label: "Integrations", href: "/personal/integrations", icon: LinkIcon },
    { label: "Settings", href: "/personal/settings", icon: Settings },
  ];

  const currentLinks = isPersonal ? personalLinks : orgLinks;

  const notificationPath = isPersonal ? "/personal/notifications" : getHref("notifications");
  const settingsPath = isPersonal ? "/personal/settings" : getHref("settings");

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)] shadow-lg">
        <div className="flex items-center justify-between h-[60px] px-2 max-w-md mx-auto">
          {navItemsLeft.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.name} href={item.href} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 min-w-[40px]">
                <item.icon className={`w-5 h-5 ${isActive ? "text-gold stroke-[2.5]" : "text-muted-foreground stroke-2"}`} />
                <span className={`text-[10px] font-semibold tracking-tight ${isActive ? "text-gold" : "text-muted-foreground"}`}>{item.name}</span>
              </Link>
            );
          })}

          {/* Plus Button - Contextual Quick Action */}
          <div className="flex-1 flex justify-center -mt-4">
            <button
              onClick={() => setAiCaptureOpen(true)}
              aria-label="Quick Action"
              className="w-[48px] h-[48px] rounded-full bg-gold hover:bg-gold-hover shadow-lg shadow-gold/25 flex items-center justify-center transition-transform active:scale-95 border border-gold/40"
            >
              <Plus className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </button>
          </div>

          {navItemsRight.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.name} href={item.href} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 min-w-[40px]">
                <item.icon className={`w-5 h-5 ${isActive ? "text-gold stroke-[2.5]" : "text-muted-foreground stroke-2"}`} />
                <span className={`text-[10px] font-semibold tracking-tight ${isActive ? "text-gold" : "text-muted-foreground"}`}>{item.name}</span>
              </Link>
            );
          })}

          {/* More Button */}
          <button 
            onClick={() => setMoreSheetOpen(true)} 
            aria-label="Open More Menu"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 min-w-[40px]"
          >
            <Menu className={`w-5 h-5 ${moreSheetOpen ? "text-gold stroke-[2.5]" : "text-muted-foreground stroke-2"}`} />
            <span className={`text-[10px] font-semibold tracking-tight ${moreSheetOpen ? "text-gold" : "text-muted-foreground"}`}>More</span>
          </button>
        </div>
      </nav>

      {/* Quick Capture / Action Bottom Sheet */}
      <SinglePromptModal 
        isOpen={aiCaptureOpen} 
        onClose={() => setAiCaptureOpen(false)} 
        isPersonal={isPersonal} 
      />

      {/* More Bottom Sheet - Workspace Hub */}
      <AnimatePresence>
        {moreSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreSheetOpen(false)}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 500) {
                  setMoreSheetOpen(false);
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-[51] bg-card border-t border-border rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:hidden flex flex-col max-h-[85vh]"
            >
              {/* Handle */}
              <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25" />
              </div>
              
              <div className="p-5 pt-2 overflow-y-auto pb-8 flex flex-col h-full max-h-full">
                {/* BRANDING & WORKSPACE SUMMARY */}
                <div className="flex flex-col mb-5 border-b border-border/50 pb-5 shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
                        <span className="text-xs font-black text-background">MP</span>
                      </div>
                      <span className="text-sm font-extrabold text-foreground tracking-tight">ManMadhan Progress</span>
                    </div>
                    <button
                      onClick={() => setMoreSheetOpen(false)}
                      className="p-1.5 rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold font-extrabold text-sm shadow-sm relative">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-bold text-foreground truncate">{user?.name || user?.email || "User"}</span>
                      <span className="text-xs font-semibold text-gold truncate">
                        {isPersonal ? "Personal Workspace" : `${userRole} • Organization Workspace`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* NAVIGATION GRID */}
                <div className="mb-6 shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                    {isPersonal ? "Personal Hub" : `${userRole} Modules`}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {currentLinks.map((item) => {
                      const href = (item as any).href || getHref(item.label.toLowerCase().replace(" ", "-"));
                      return (
                        <Link
                          key={item.label}
                          href={href}
                          onClick={() => setMoreSheetOpen(false)}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 hover:bg-muted/80 transition-colors active:scale-[0.98] border border-border/50"
                        >
                          <item.icon className="w-4 h-4 text-gold shrink-0" />
                          <span className="text-xs font-semibold text-foreground truncate">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* ACCOUNT & PREFERENCES */}
                <div className="mt-auto pt-5 border-t border-border/50 shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Account & System</span>
                  <div className="flex flex-col gap-1">
                    <Link href={notificationPath} onClick={() => setMoreSheetOpen(false)} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Bell className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Notifications</span>
                      </div>
                    </Link>

                    <Link href={settingsPath} onClick={() => setMoreSheetOpen(false)} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Settings</span>
                      </div>
                    </Link>

                    <button
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {theme === "dark" ? <Sun className="w-4 h-4 text-gold" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-sm font-medium text-foreground">Appearance</span>
                      </div>
                      <span className="text-xs font-semibold text-gold capitalize">{theme || "dark"}</span>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      setMoreSheetOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-3 p-3 mt-3 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors w-full text-left font-medium text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
