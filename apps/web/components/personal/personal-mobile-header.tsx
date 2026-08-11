"use client";

import { useState } from "react";
import { Menu, X, Home, Focus, Layers, CheckSquare, Calendar, BookOpen, Mic, PenTool, Database, Activity, Target } from "lucide-react";
import { NotificationDropdown } from "../dashboard/notification-dropdown";
import { ProfileDropdown } from "../dashboard/profile-dropdown";
import { WorkspaceSwitcher } from "../dashboard/workspace-switcher";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

function getPageTitle(pathname: string): string {
  if (pathname.includes("/dashboard")) return "Dashboard";
  if (pathname.includes("/projects")) return "Projects";
  if (pathname.includes("/tasks")) return "Tasks";
  if (pathname.includes("/calendar")) return "Calendar";
  if (pathname.includes("/reminders")) return "Reminders";
  if (pathname.includes("/focus")) return "Focus";
  if (pathname.includes("/notes")) return "Notes";
  if (pathname.includes("/books")) return "Books";
  if (pathname.includes("/podcasts")) return "Podcasts";
  if (pathname.includes("/vault")) return "Personal Vault";
  if (pathname.includes("/progress")) return "AI Progress";
  if (pathname.includes("/goals")) return "Goals";
  if (pathname.includes("/habits")) return "Habits";
  
  const parts = pathname.split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1] || "Workspace";
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, " ");
}

const NAV_LINKS = [
  { href: "/personal/dashboard", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
  { href: "/personal/focus", label: "Focus", icon: <Focus className="h-4 w-4" /> },
  { href: "/personal/projects", label: "Projects", icon: <Layers className="h-4 w-4" /> },
  { href: "/personal/tasks", label: "Tasks", icon: <CheckSquare className="h-4 w-4" /> },
  { href: "/personal/calendar", label: "Calendar", icon: <Calendar className="h-4 w-4" /> },
  { href: "/personal/goals", label: "Goals", icon: <Target className="h-4 w-4" /> },
  { href: "/personal/habits", label: "Habits", icon: <Activity className="h-4 w-4" /> },
  { href: "/personal/notes", label: "Notes", icon: <PenTool className="h-4 w-4" /> },
  { href: "/personal/books", label: "Books", icon: <BookOpen className="h-4 w-4" /> },
  { href: "/personal/podcasts", label: "Podcasts", icon: <Mic className="h-4 w-4" /> },
  { href: "/personal/vault", label: "Personal Vault", icon: <Database className="h-4 w-4" /> },
];

export function PersonalMobileHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="md:hidden flex items-center justify-between pt-[max(1.1rem,env(safe-area-inset-top))] pb-3 px-5 border-b border-border bg-card sticky top-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 -ml-1.5 rounded-md hover:bg-accent text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-[12px] font-extrabold text-foreground leading-none truncate">
              {title}
            </span>
            <WorkspaceSwitcher />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationDropdown />
          <ProfileDropdown />
        </div>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative w-[280px] bg-card h-full shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-left duration-200 border-r border-border">
            <div className="p-5 border-b border-border flex items-center justify-between pt-[max(1.1rem,env(safe-area-inset-top))]">
              <span className="font-bold text-sm tracking-widest text-gold uppercase">Execution OS</span>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 -mr-1.5 rounded-md hover:bg-accent text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      isActive 
                        ? "bg-gold/10 text-gold" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
