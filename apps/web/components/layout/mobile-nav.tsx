"use client";

/**
 * @deprecated Legacy mobile navigation component.
 * Use `@/components/dashboard/bottom-nav` as the single authoritative mobile bottom navigation implementation.
 */
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Plus,
  History,
  Trophy,
  MoreHorizontal,
  FolderKanban,
  CheckSquare,
  Calendar,
  PenTool,
  BookOpen,
  Headphones,
  User,
  Settings,
  Users,
  Building,
  LogOut,
  X,
} from "lucide-react";
import { FocusIcon } from "@/components/ui/focus-icon";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/auth-context";

interface MobileNavProps {
  workspaceType: "PERSONAL" | "ORGANIZATION";
  basePath?: string; // e.g., "/ceo", "/co-ceo", "/member"
  onCreateClick?: () => void;
}

export function MobileNav({
  workspaceType,
  basePath = "/personal",
  onCreateClick,
}: MobileNavProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isPersonal = workspaceType === "PERSONAL";

  // Primary bottom navbar items (5 items max)
  const navItems = isPersonal
    ? [
        { label: "Home", href: "/personal/dashboard", icon: Home },
        { label: "Focus", href: "/personal/focus", icon: FocusIcon },
        { label: "Create", href: "#create", icon: Plus, isAction: true },
        { label: "Timeline", href: "/personal/timeline", icon: History },
        { label: "More", href: "#more", icon: MoreHorizontal, isMore: true },
      ]
    : [
        { label: "Home", href: `${basePath}/dashboard`, icon: Home },
        { label: "Focus", href: `${basePath}/focus`, icon: FocusIcon },
        { label: "Create", href: "#create", icon: Plus, isAction: true },
        { label: "Progress", href: `${basePath}/leaderboard`, icon: Trophy },
        { label: "More", href: "#more", icon: MoreHorizontal, isMore: true },
      ];

  // More Bottom Sheet links
  const moreLinks = isPersonal
    ? [
        { label: "Projects", href: "/personal/projects", icon: FolderKanban },
        { label: "Tasks", href: "/personal/tasks", icon: CheckSquare },
        { label: "Calendar", href: "/personal/calendar", icon: Calendar },
        { label: "Journal", href: "/personal/journal", icon: PenTool },
        { label: "Books", href: "/personal/books", icon: BookOpen },
        { label: "Podcasts", href: "/personal/podcasts", icon: Headphones },
        { label: "Profile", href: "/personal/profile", icon: User },
        { label: "Settings", href: "/personal/settings", icon: Settings },
      ]
    : [
        { label: "Projects", href: `${basePath}/projects`, icon: FolderKanban },
        { label: "Tasks", href: `${basePath}/tasks`, icon: CheckSquare },
        { label: "Calendar", href: `${basePath}/calendar`, icon: Calendar },
        { label: "Timeline", href: `${basePath}/timeline`, icon: History },
        { label: "Members", href: `${basePath}/members`, icon: Users },
        { label: "Assignments", href: `${basePath}/my-work`, icon: CheckSquare },
        { label: "Organization Profile", href: `${basePath}/profile`, icon: Building },
        { label: "Organization Settings", href: `${basePath}/settings`, icon: Settings },
      ];

  const isActive = (href: string) => {
    if (href.startsWith("#")) return false;
    if (pathname === href) return true;
    if (href.endsWith("/dashboard")) return pathname === basePath || pathname === href;
    return pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Fixed Mobile Bottom Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (item.isAction) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={onCreateClick}
                className="w-11 h-11 rounded-full bg-gold text-slate-950 flex items-center justify-center font-bold shadow-md active:scale-95 transition-transform cursor-pointer"
                aria-label="Create New"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            );
          }

          if (item.isMore) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setIsMoreOpen(true)}
                className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[44px] rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
                  isMoreOpen ? "text-gold font-extrabold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MoreHorizontal className="w-5 h-5 mb-0.5" />
                <span>More</span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[44px] rounded-xl text-[10px] font-bold transition-colors ${
                active
                  ? "text-gold font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Native-feeling More Bottom Sheet */}
      <AnimatePresence>
        {isMoreOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="absolute inset-0 bg-black/60"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-h-[85vh] bg-card border-t border-border rounded-t-3xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col space-y-4 shadow-2xl overflow-y-auto"
            >
              {/* Drag Handle */}
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30 mx-auto shrink-0" />

              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {isPersonal ? "Personal Workspace" : "Organization Workspace"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {user?.displayName || user?.name || "User"}
                  </p>
                </div>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="p-2 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid of Navigation Links */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {moreLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMoreOpen(false)}
                      className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-colors ${
                        active
                          ? "bg-gold/15 border-gold text-gold font-bold"
                          : "border-border bg-background hover:bg-muted text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Sign Out Action */}
              <button
                type="button"
                onClick={async () => {
                  setIsMoreOpen(false);
                  if (logout) await logout();
                }}
                className="w-full h-11 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-bold text-xs flex items-center justify-center gap-2 mt-2 hover:bg-destructive/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
