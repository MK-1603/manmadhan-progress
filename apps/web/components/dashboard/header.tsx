"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Check, Building, User as UserIcon, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth/auth-context";
import { useSocket } from "@/components/providers/socket-provider";
import apiClient from "@/lib/api-client";
import { WorkspaceService } from "@/services/workspace-service";
import { ResponsivePopover } from "@/components/ui/responsive-popover";
import { WorkspaceSearch } from "./workspace-search";
import { NotificationDropdown } from "./notification-dropdown";
import { ProfileDropdown } from "./profile-dropdown";

export type ActiveWorkspace = {
  id: string;
  type: "personal" | "organization";
  name: string;
  organizationName?: string;
  role?: "CEO" | "CO_CEO" | "MEMBER";
};

function getPageTitle(pathname: string): string {
  if (pathname.match(/\/(ceo|co-ceo|member)\/dashboard/)) return "Home";
  if (pathname.match(/\/(ceo|co-ceo|member)\/focus/)) return "Focus";
  if (pathname.match(/\/(ceo|co-ceo|member)\/projects/)) return "Projects";
  if (pathname.match(/\/(ceo|co-ceo|member)\/tasks/)) return "Tasks";
  if (pathname.match(/\/(ceo|co-ceo|member)\/calendar/)) return "Calendar";
  if (pathname.match(/\/(ceo|co-ceo|member)\/timeline/)) return "Timeline";
  if (pathname.includes("/people")) return "People";
  if (pathname.includes("/co-ceos")) return "People";
  if (pathname.match(/\/(ceo|co-ceo|member)\/members/)) return "People";
  if (pathname.includes("/invitations")) return "People";
  if (pathname.match(/\/(ceo|co-ceo|member)\/graph/)) return "Organization Graph";
  if (pathname.match(/\/(ceo|co-ceo|member)\/leaderboard/)) return "Leaderboard";
  if (pathname.match(/\/(ceo|co-ceo|member)\/automation/)) return "Automation";
  if (pathname.match(/\/(ceo|co-ceo|member)\/organization/)) return "Organization";
  if (pathname.match(/\/(ceo|co-ceo|member)\/profile/)) return "Organization Profile";
  if (pathname.match(/\/(ceo|co-ceo|member)\/settings/)) return "Organization Settings";

  if (pathname.includes("/personal/dashboard")) return "Home";
  if (pathname.includes("/personal/focus")) return "Focus";
  if (pathname.includes("/personal/projects")) return "Projects";
  if (pathname.includes("/personal/tasks")) return "Tasks";
  if (pathname.includes("/personal/calendar")) return "Calendar";
  if (pathname.includes("/personal/timeline")) return "Timeline";
  if (pathname.includes("/personal/notes")) return "Notes";
  if (pathname.includes("/personal/documents")) return "Documents";
  if (pathname.includes("/personal/ai-builder")) return "AI Builder";
  if (pathname.includes("/personal/prompt-library")) return "Prompt Library";
  if (pathname.includes("/personal/automation")) return "Automation";
  if (pathname.includes("/personal/reminders")) return "Reminders";
  if (pathname.includes("/personal/reports")) return "Reports";
  if (pathname.includes("/personal/profile")) return "Profile";
  if (pathname.includes("/personal/settings")) return "Settings";

  const parts = pathname.split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1] || "Home";
  const title = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, " ");
  return title === "Dashboard" ? "Home" : title;
}

import { WorkspaceSwitcherModal } from "./workspace-switcher-modal";

export function Header() {
  const pathname = usePathname();
  const { user, isLoading, authStatus } = useAuth();
  const { socket } = useSocket();

  const [mounted, setMounted] = useState(false);
  const [orgWorkspace, setOrgWorkspace] = useState<any>(null);
  const [isSwitcherModalOpen, setIsSwitcherModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isPersonalRoute = pathname?.startsWith("/personal");
  const userRole = (user?.role || "CEO").toUpperCase() as "CEO" | "CO_CEO" | "MEMBER";
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    if (isLoading || authStatus !== "authenticated" || !user) return;
    let isMounted = true;
    WorkspaceService.getWorkspaces()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          // STRICT FILTER: Find the Organization (non-personal) workspace
          const org = data.find(
            (w: any) => w.type !== "personal" && w.name !== "Personal Workspace"
          );
          if (org) {
            setOrgWorkspace(org);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user, isLoading, authStatus]);

  useEffect(() => {
    if (!socket) return;
    const handleOrgUpdated = (updated: any) => {
      if (updated && updated.type !== "personal" && updated.name !== "Personal Workspace") {
        setOrgWorkspace((prev: any) => (prev ? { ...prev, ...updated } : updated));
      }
    };
    socket.on("organization.updated", handleOrgUpdated);
    return () => {
      socket.off("organization.updated", handleOrgUpdated);
    };
  }, [socket]);

  const realBatchId = orgWorkspace?.batchNumber || user?.batchNumber;
  const realOrgName = orgWorkspace?.name && orgWorkspace.name !== "Personal Workspace" ? orgWorkspace.name : undefined;
  const personalDisplayName = user?.displayName || user?.name || (user?.email ? user.email.split("@")[0] : "");

  // Canonical ActiveWorkspace state object
  const activeWorkspace: ActiveWorkspace = isPersonalRoute
    ? {
        id: "personal",
        type: "personal",
        name: "Personal Workspace",
      }
    : {
        id: orgWorkspace?.id || "org",
        type: "organization",
        name: "Organization Workspace",
        organizationName: realOrgName,
        role: userRole,
      };

  // Popover state management for mutual exclusion
  const [activePopover, setActivePopover] = useState<"none" | "switcher" | "search" | "notifications" | "profile">("none");

  const isSwitcherOpen = activePopover === "switcher";
  const setIsSwitcherOpen = (open: boolean) => {
    setActivePopover(open ? "switcher" : "none");
  };

  const router = useRouter();
  const isPersonal = isPersonalRoute;
  const effectiveLogoUrl = orgWorkspace?.logoUrl || (typeof window !== "undefined" ? localStorage.getItem("orgLogo") : null) || "/ios/iTunesArtwork@1x.png";

  const handleSwitchWorkspace = (target: "personal" | "org") => {
    setIsSwitcherOpen(false);
    if ((target === "personal" && isPersonal) || (target === "org" && !isPersonal)) {
      return;
    }
    if (target === "personal") {
      localStorage.setItem("activeWorkspaceType", "personal");
      router.replace("/personal/dashboard");
    } else {
      localStorage.setItem("activeWorkspaceType", "organization");
      if (orgWorkspace?.id) {
        localStorage.setItem("workspaceId", orgWorkspace.id);
      }
      const targetDash =
        userRole.includes("CO")
          ? "/co-ceo/dashboard"
          : userRole.includes("MEMBER")
          ? "/member/dashboard"
          : "/ceo/dashboard";
      router.replace(targetDash);
    }
  };

  return (
    <header className="hidden md:flex items-center justify-between h-[68px] w-full shrink-0 px-6 border-b border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#0B0D10] text-[#17202A] dark:text-[#F2F3F5] z-30 gap-4 select-none">
      {/* 1. LEFT SIDE — STACKED PAGE TITLE & WORKSPACE SELECTOR SUBTITLE (IMAGE 2 DESIGN) */}
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <h1 className="text-[17px] font-bold text-[#17202A] dark:text-[#F2F3F5] tracking-tight leading-snug truncate">
          {pageTitle}
        </h1>

        {/* Global Workspace Selector Trigger Button */}
        <button
          type="button"
          onClick={() => setIsSwitcherModalOpen(true)}
          aria-label="Switch workspace"
          className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus:outline-none -mt-0.5 group w-fit"
        >
          <span className="truncate flex items-center gap-1.5" suppressHydrationWarning>
            {mounted && !isPersonal ? (
              <img
                src={effectiveLogoUrl}
                alt="Organization Logo"
                className="w-4 h-4 rounded object-contain shrink-0"
              />
            ) : (
              <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <span suppressHydrationWarning className="font-semibold">
              {isPersonal ? "Personal Workspace" : (realOrgName || "Organization Workspace")}
            </span>
          </span>

          <ChevronDown
            className="w-3.5 h-3.5 text-muted-foreground group-hover:text-current transition-transform duration-180"
          />
        </button>

        {/* Workspace Switcher Modal */}
        <WorkspaceSwitcherModal
          isOpen={isSwitcherModalOpen}
          onClose={() => setIsSwitcherModalOpen(false)}
        />
      </div>

      {/* 2. RIGHT SIDE — HEADER ACTIONS (Clean: Notifications + Profile) */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        {/* Notifications Button & Popover */}
        <NotificationDropdown
          activePopover={activePopover as any}
          setActivePopover={setActivePopover as any}
        />

        {/* Profile Avatar & Popover */}
        <ProfileDropdown
          activePopover={activePopover as any}
          setActivePopover={setActivePopover as any}
        />
      </div>
    </header>
  );
}

function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-10 h-10 rounded-full" />;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle light and dark theme"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="w-10 h-10 rounded-full flex items-center justify-center border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#0B0D10] text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] transition-colors cursor-pointer focus:outline-none"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-[#D4B12F]" />
      ) : (
        <Moon className="w-4 h-4 text-[#667085]" />
      )}
    </button>
  );
}

export default Header;
