"use client";

import {
  LayoutDashboard, FolderKanban, Plus, User, Menu, X, Home,
  TrendingUp, Users, UserCheck, Calendar as Cal, Trophy, FileText, BarChart,
  CheckSquare, Bell, Megaphone, UserPlus, Activity, ClipboardList, Settings,
  Target, Map, Notebook, BookOpen, Headphones, GraduationCap, Zap, CheckCircle, Files as FilesIcon,
  Building2, UserCircle, ShieldCheck, MonitorSmartphone, Palette, HelpCircle, LogOut, Check,
  PenSquare, UserPlus2, Focus, Search, Archive, Link as LinkIcon, Terminal, Lightbulb, Clock, Sparkles
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../auth/auth-context";

export function BottomNav() {
  const { user } = useAuth();
  const userRole = (user?.role || "CEO").toUpperCase();
  const pathname = usePathname();
  const router = useRouter();
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const isPersonal = pathname.startsWith("/personal");

  const getHref = (page: string) => {
    if (isPersonal) return `/personal/${page}`;
    if (userRole === "CO-CEO") return `/co-ceo/${page}`;
    if (userRole === "MEMBER") return `/member/${page}`;
    return `/ceo/${page}`;
  };

  const navItems = isPersonal ? [
    { name: "Dashboard", href: getHref("dashboard"), icon: LayoutDashboard },
    { name: "Focus", href: getHref("focus"), icon: Focus }, 
  ] : [
    { name: "Dashboard", href: getHref("dashboard"), icon: LayoutDashboard },
    { name: "Projects", href: getHref("projects"), icon: FolderKanban },
  ];

  // More Sheet Navigation Links
  const orgLinks = [
    { label: "Progress", icon: TrendingUp },
    { label: "Members", icon: Users },
    { label: "CO-CEO", icon: UserCheck },
    { label: "Calendar", icon: Cal },
    { label: "Leaderboard", icon: Trophy },
    { label: "Reports", icon: FileText },
    { label: "Analytics", icon: BarChart },
    { label: "Approvals", icon: CheckSquare },
    { label: "Notifications", icon: Bell },
    { label: "Invitations", icon: UserPlus },
    { label: "Activity Logs", icon: Activity },
    { label: "Audit Logs", icon: ClipboardList },
    { label: "Settings", icon: Settings },
  ];

  const personalLinks = [
    { label: "Tasks", href: "/personal/tasks", icon: CheckSquare },
    { label: "Projects", href: "/personal/projects", icon: FolderKanban },
    { label: "Calendar", href: "/personal/calendar", icon: Cal },
    { label: "Notes", href: "/personal/notes", icon: FileText },
    { label: "Journal", href: "/personal/journal", icon: PenSquare },
    { label: "Ideas", href: "/personal/ideas", icon: Lightbulb },
    { label: "Goals", href: "/personal/goals", icon: Target },
    { label: "Progress", href: "/personal/progress", icon: TrendingUp },
    { label: "Books", href: "/personal/books", icon: BookOpen },
    { label: "Podcasts", href: "/personal/podcasts", icon: Headphones },
    { label: "Library", href: "/personal/library", icon: FilesIcon },
    { label: "Reminders", href: "/personal/reminders", icon: Clock },
    { label: "Habits", href: "/personal/habits", icon: CheckCircle },
    { label: "Time Tracking", href: "/personal/time-tracking", icon: Clock },
    { label: "Analytics", href: "/personal/analytics", icon: BarChart },
    { label: "Activity", href: "/personal/activity", icon: Activity },
    { label: "Search", href: "/personal/search", icon: Search },
    { label: "Notifications", href: "/personal/notifications", icon: Bell },
    { label: "Archive", href: "/personal/archive", icon: Archive },
    { label: "AI Assistant", href: "/personal/ai", icon: Sparkles },
    { label: "Automation", href: "/personal/automation", icon: Zap },
    { label: "Integrations", href: "/personal/integrations", icon: LinkIcon },
    { label: "Command Center", href: "/personal/command-center", icon: Terminal },
    { label: "Settings", href: "/personal/settings", icon: Settings },
  ];

  const currentLinks = isPersonal ? personalLinks : orgLinks;

  const orgQuickActions = [
    { label: "Create Project", icon: FolderKanban },
    { label: "Assign Task", icon: CheckSquare },
    { label: "Invite Member", icon: UserPlus2 },
    { label: "Announcement", icon: Megaphone },
  ];

  const personalQuickActions = [
    { label: "Add Task", icon: CheckSquare },
    { label: "Add Note", icon: FileText },
    { label: "Add Goal", icon: Target },
    { label: "Journal Entry", icon: PenSquare },
  ];

  const currentQuickActions = isPersonal ? personalQuickActions : orgQuickActions;




  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-[64px] px-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.name} href={item.href} className="flex-1 flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px]">
                <item.icon className={`w-5 h-5 ${isActive ? "text-gold stroke-[2.5]" : "text-muted-foreground stroke-2"}`} />
                <span className={`text-[10px] font-medium ${isActive ? "text-gold" : "text-muted-foreground"}`}>{item.name}</span>
              </Link>
            );
          })}

          {/* Plus Button */}
          <div className="flex-1 flex justify-center -mt-5">
            <button
              onClick={() => setQuickActionOpen(true)}
              className="w-[52px] h-[52px] rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 flex items-center justify-center transition-transform active:scale-95"
            >
              <Plus className="w-6 h-6 text-primary-foreground stroke-[2.5]" />
            </button>
          </div>

          {/* Profile Button */}
          <Link 
            href={isPersonal ? "/personal/profile" : getHref("settings")}
            className="flex-1 flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] group"
          >
            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr from-gold to-amber-600 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm ring-2 transition-all group-active:scale-95 ${pathname.includes("settings") ? "ring-gold" : "ring-transparent group-hover:ring-gold/50"}`}>
              C
            </div>
            <span className={`text-[10px] font-medium ${pathname.includes("settings") ? "text-gold" : "text-muted-foreground"}`}>Profile</span>
          </Link>

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

      {/* Quick Action Bottom Sheet */}
      <AnimatePresence>
        {quickActionOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickActionOpen(false)}
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
                  setQuickActionOpen(false);
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-[51] bg-card border-t border-border rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:hidden flex flex-col max-h-[85vh]"
            >
              <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="p-5 pt-2 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-foreground">Quick Actions</h3>
                  <button onClick={() => setQuickActionOpen(false)} className="p-1.5 rounded-full bg-muted text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {currentQuickActions.map((action) => (
                    <button key={action.label} className="p-4 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:bg-muted flex flex-col items-start gap-3 transition-all active:scale-95">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <action.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-bold text-foreground text-left leading-tight">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              
              <div className="p-5 pt-2 overflow-y-auto pb-8">
                {/* Title */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                    {isPersonal ? "Personal" : "Organization"} Workspace
                  </h3>
                  <button onClick={() => setMoreSheetOpen(false)} className="p-1.5 rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Quick Actions (Horizontal Scroll) */}
                <div className="mb-6">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    Quick Actions
                  </div>
                  <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scrollbar-none">
                    {currentQuickActions.map((action) => (
                      <button 
                        key={action.label}
                        className="flex-shrink-0 snap-start flex flex-col items-center justify-center gap-2 p-3 w-[100px] rounded-2xl bg-muted/30 border border-border shadow-sm hover:shadow-md hover:bg-muted/50 transition-all active:scale-95"
                      >
                        <div className="w-10 h-10 rounded-full bg-card shadow-sm border border-border flex items-center justify-center">
                          <action.icon className="w-4 h-4 text-foreground" />
                        </div>
                        <span className="text-[10px] font-semibold text-foreground text-center leading-tight">
                          {action.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="mb-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    Modules
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {currentLinks.map((item) => {
                      const href = (item as any).href || getHref(item.label.toLowerCase().replace(" ", "-").replace("activity-logs", "activity").replace("audit-logs", "audit"));
                      return (
                        <Link
                          key={item.label}
                          href={href}
                          onClick={() => setMoreSheetOpen(false)}
                          className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:bg-muted/30 transition-all active:scale-[0.98]"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <item.icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="text-xs font-bold text-foreground text-left leading-tight">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
