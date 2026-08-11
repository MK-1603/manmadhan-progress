"use client";

import {
  LayoutDashboard, FolderKanban, Plus, User, Menu, X, Home,
  TrendingUp, Users, UserCheck, Calendar as Cal, Trophy, FileText, BarChart,
  CheckSquare, Bell, Megaphone, UserPlus, Activity, ClipboardList, Settings,
  Target, Map, Notebook, BookOpen, Headphones, GraduationCap, Zap, CheckCircle, Files as FilesIcon,
  Building2, UserCircle, ShieldCheck, MonitorSmartphone, Palette, HelpCircle, LogOut, Check,
  PenSquare, UserPlus2, Focus, Search, Archive, Link as LinkIcon, Terminal, Lightbulb, Clock, Sparkles, History, Moon
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../auth/auth-context";
import { SinglePromptModal } from "../personal/single-prompt-modal";

export function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [aiCaptureOpen, setAiCaptureOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  // Derive role from pathname first (most reliable), then fall back to user.role
  const isPersonal = pathname.startsWith("/personal");
  const isCoCeo = pathname.startsWith("/co-ceo");
  const isMember = pathname.startsWith("/member");

  const userRole = isCoCeo ? "CO-CEO" : isMember ? "MEMBER" : ((user?.role || "CEO").toUpperCase());

  const getHref = (page: string) => {
    if (isPersonal) return `/personal/${page}`;
    if (userRole === "CO-CEO") return `/co-ceo/${page}`;
    if (userRole === "MEMBER") return `/member/${page}`;
    return `/ceo/${page}`;
  };

  const navItemsLeft = isPersonal ? [
    { name: "Home", href: "/personal/dashboard", icon: LayoutDashboard },
    { name: "Focus", href: "/personal/focus", icon: Focus },
  ] : userRole === "MEMBER" ? [
    { name: "Dashboard", href: getHref("dashboard"), icon: LayoutDashboard },
    { name: "My Work", href: getHref("my-work"), icon: CheckSquare },
  ] : [
    { name: "Dashboard", href: getHref("dashboard"), icon: LayoutDashboard },
    { name: "Tasks", href: getHref("tasks"), icon: CheckSquare },
  ];

  const navItemsRight = isPersonal ? [
    { name: "Calendar", href: "/personal/calendar", icon: Cal },
  ] : [
    { name: "Calendar", href: getHref("calendar"), icon: Cal },
  ];

  // More Sheet Navigation Links — role-aware
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
    { label: "Projects", href: "/personal/projects", icon: FolderKanban },
    { label: "Tasks", href: "/personal/tasks", icon: CheckSquare },
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

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-[64px] px-1">
          {navItemsLeft.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.name} href={item.href} className="flex-1 flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px]">
                <item.icon className={`w-5 h-5 ${isActive ? "text-gold stroke-[2.5]" : "text-muted-foreground stroke-2"}`} />
                <span className={`text-[10px] font-medium ${isActive ? "text-gold" : "text-muted-foreground"}`}>{item.name}</span>
              </Link>
            );
          })}

          {/* Plus Button - AI Capture */}
          <div className="flex-1 flex justify-center -mt-5">
            <button
              onClick={() => setAiCaptureOpen(true)}
              className="w-[52px] h-[52px] rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 flex items-center justify-center transition-transform active:scale-95"
            >
              <Plus className="w-6 h-6 text-primary-foreground stroke-[2.5]" />
            </button>
          </div>

          {navItemsRight.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.name} href={item.href} className="flex-1 flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px]">
                <item.icon className={`w-5 h-5 ${isActive ? "text-gold stroke-[2.5]" : "text-muted-foreground stroke-2"}`} />
                <span className={`text-[10px] font-medium ${isActive ? "text-gold" : "text-muted-foreground"}`}>{item.name}</span>
              </Link>
            );
          })}

          {/* Profile Button (Only for Organization) */}
          {!isPersonal && (
            <Link 
              href={getHref("settings")}
              className="flex-1 flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] group"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 transition-all group-active:scale-95 ${userRole === "CO-CEO" ? "bg-purple-600 ring-purple-500/30 group-hover:ring-purple-500/60" : userRole === "MEMBER" ? "bg-emerald-600 ring-emerald-500/30 group-hover:ring-emerald-500/60" : "bg-amber-600 ring-gold/30 group-hover:ring-gold/60"}`}>
                {user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : "U"}
              </div>
              <span className={`text-[10px] font-medium ${pathname.includes("settings") ? "text-gold" : "text-muted-foreground"}`}>Profile</span>
            </Link>
          )}

          {/* More Button */}
          <button 
            onClick={() => setMoreSheetOpen(true)} 
            className="flex-1 flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px]"
          >
            <Menu className={`w-5 h-5 ${moreSheetOpen ? "text-gold stroke-[2.5]" : "text-muted-foreground stroke-2"}`} />
            <span className={`text-[10px] font-medium ${moreSheetOpen ? "text-gold" : "text-muted-foreground"}`}>More</span>
          </button>
        </div>
      </nav>

      {/* AI Capture Bottom Sheet */}
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
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 500) {
                  setMoreSheetOpen(false);
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-[51] bg-card border-t border-border rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:hidden flex flex-col max-h-[90vh]"
            >
              {/* Handle */}
              <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
              </div>
              
              <div className="p-5 pt-2 overflow-y-auto pb-8 flex flex-col h-full max-h-full">
                {/* BRANDING & PROFILE */}
                <div className="flex flex-col mb-6 border-b border-border/50 pb-6 shrink-0">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
                        <span className="text-xs font-black text-background">MP</span>
                      </div>
                      <span className="text-sm font-black text-foreground tracking-tight">ManMadhan Progress</span>
                    </div>
                    <button onClick={() => setMoreSheetOpen(false)} className="p-1.5 rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gold to-amber-600 flex items-center justify-center text-slate-950 font-bold text-sm shadow-sm relative">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-bold text-foreground truncate">{user?.name || "User"}</span>
                      <span className="text-xs font-semibold text-muted-foreground truncate">{isPersonal ? "Personal Workspace" : "Organization Workspace"}</span>
                    </div>
                  </div>
                </div>

                {/* MODULES GRID */}
                <div className="mb-6 shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Navigation</span>
                  <div className="grid grid-cols-2 gap-2">
                    {currentLinks.map((item) => {
                      const href = (item as any).href || getHref(item.label.toLowerCase().replace(" ", "-"));
                      return (
                        <Link
                          key={item.label}
                          href={href}
                          onClick={() => setMoreSheetOpen(false)}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors active:scale-[0.98]"
                        >
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* ACCOUNT & SETTINGS */}
                <div className="mt-auto pt-6 border-t border-border/50 shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Account</span>
                  <div className="flex flex-col gap-1">
                    <Link href="/personal/notifications" onClick={() => setMoreSheetOpen(false)} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Bell className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Notifications</span>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                    </Link>
                    <Link href="/personal/settings" onClick={() => setMoreSheetOpen(false)} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Settings</span>
                      </div>
                    </Link>
                    <button onClick={() => {}} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <Moon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Appearance</span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">Dark</span>
                    </button>
                  </div>
                  
                  <button className="flex items-center gap-3 p-3 mt-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors w-full text-left">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Log out</span>
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
