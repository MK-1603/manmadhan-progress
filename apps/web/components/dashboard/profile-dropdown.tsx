"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User as UserIcon, Settings, Building, LogOut, Sun, Moon, Monitor, Check, RefreshCw, Download, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { ResponsivePopover } from "../ui/responsive-popover";
import { useAuth } from "../auth/auth-context";
import apiClient from "@/lib/api-client";
import { WorkspaceSwitcherModal } from "./workspace-switcher-modal";

export function ProfileDropdown({
  activePopover,
  setActivePopover,
}: {
  activePopover?: "none" | "search" | "notifications" | "profile" | "switcher";
  setActivePopover?: (val: "none" | "search" | "notifications" | "profile" | "switcher") => void;
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isSwitcherModalOpen, setIsSwitcherModalOpen] = useState(false);

  const isOpen = activePopover !== undefined ? activePopover === "profile" : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (setActivePopover) {
      setActivePopover(open ? "profile" : "none");
    } else {
      setInternalIsOpen(open);
    }
  };

  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [orgWorkspace, setOrgWorkspace] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    apiClient
      .get("/workspaces")
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.data)) {
          const org = res.data.data.find(
            (w: any) => w.type !== "personal" && w.name !== "Personal Workspace"
          );
          if (org) setOrgWorkspace(org);
        }
      })
      .catch(() => {});
  }, []);

  const isPersonal = pathname?.startsWith("/personal");
  const userRole = (user?.role || "CEO").toUpperCase();

  const getInitials = (u: any) => {
    const raw = u?.displayName || u?.name || (u?.email ? u.email.split("@")[0] : "");
    if (!raw?.trim()) return "MM";
    const parts = raw.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  };

  const userInitials = getInitials(user);
  const userDisplayId = user?.batchNumber || user?.displayName || user?.name || "MM1107";
  const cleanOrgName = orgWorkspace?.name && orgWorkspace.name !== "Personal Workspace" ? orgWorkspace.name : "ManMadhan";

  const handleSwitchWorkspace = (target: "personal" | "org") => {
    setIsOpen(false);
    if (target === "personal") {
      localStorage.setItem("activeWorkspaceType", "personal");
      router.push("/personal/dashboard");
    } else {
      localStorage.setItem("activeWorkspaceType", "organization");
      if (orgWorkspace?.id) {
        localStorage.setItem("workspaceId", orgWorkspace.id);
      }
      const targetDash =
        userRole === "CO_CEO"
          ? "/co-ceo/dashboard"
          : userRole === "MEMBER"
          ? "/member/dashboard"
          : "/ceo/dashboard";
      router.push(targetDash);
    }
  };

  const trigger = (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      aria-label="Open profile menu"
      title="User Profile"
      className="w-9 h-9 rounded-full flex items-center justify-center bg-[#C9A52A]/15 dark:bg-[#C9A52A]/20 border border-[#C9A52A]/30 text-[#C9A52A] font-extrabold text-xs font-mono shrink-0 cursor-pointer focus:outline-none transition-all hover:scale-105"
      suppressHydrationWarning
    >
      {userInitials}
    </button>
  );

  return (
    <>
      <ResponsivePopover
        trigger={trigger}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        align="right"
        offsetY={6}
        desktopClassName="w-[280px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col p-3 z-50 text-xs font-sans"
        mobileClassName="fixed inset-x-0 bottom-0 z-[10001] bg-card rounded-t-3xl border-t border-border shadow-2xl flex flex-col overflow-y-auto overscroll-contain max-h-[90vh] pb-[max(20px,env(safe-area-inset-bottom))] p-4 select-none font-sans"
      >
        {/* Mobile Bottom Sheet Drag Handle */}
        <div className="md:hidden w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3 shrink-0" />

        <div className="flex flex-col space-y-3 text-xs">
          
          {/* 1. USER IDENTITY HEADER */}
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#C9A52A]/15 border border-[#C9A52A]/30 text-[#C9A52A] font-extrabold text-xs font-mono shrink-0">
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-xs text-foreground truncate leading-tight">
                {userDisplayId}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground truncate leading-tight mt-0.5">
                {isPersonal ? "Personal" : userRole}
              </span>
            </div>
          </div>

          {/* 2. WORKSPACE SECTION */}
          <div className="flex flex-col space-y-1">
            <div className="px-1 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
              WORKSPACE
            </div>

            <button
              type="button"
              onClick={() => handleSwitchWorkspace("org")}
              className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                !isPersonal
                  ? "bg-[#C9A52A]/10 text-foreground font-semibold border border-[#C9A52A]/30"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Building className={`w-4 h-4 shrink-0 ${!isPersonal ? "text-[#C9A52A]" : "text-muted-foreground"}`} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate uppercase">{cleanOrgName}</span>
                  <span className="text-[10.5px] text-muted-foreground truncate">Organization Workspace</span>
                </div>
              </div>
              {!isPersonal && <Check className="w-4 h-4 text-[#C9A52A] shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleSwitchWorkspace("personal")}
              className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                isPersonal
                  ? "bg-[#C9A52A]/10 text-foreground font-semibold border border-[#C9A52A]/30"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserIcon className={`w-4 h-4 shrink-0 ${isPersonal ? "text-[#C9A52A]" : "text-muted-foreground"}`} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">Personal Workspace</span>
                  <span className="text-[10.5px] text-muted-foreground truncate">Private workspace</span>
                </div>
              </div>
              {isPersonal && <Check className="w-4 h-4 text-[#C9A52A] shrink-0" />}
            </button>
          </div>

          <div className="h-px bg-border" />

          {/* 3. ACCOUNT SECTION */}
          <div className="flex flex-col space-y-0.5">
            <div className="px-1 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase pb-1">
              ACCOUNT
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                const targetProfile = isPersonal
                  ? "/personal/profile"
                  : userRole === "CO_CEO"
                  ? "/co-ceo/profile"
                  : userRole === "MEMBER"
                  ? "/member/profile"
                  : "/ceo/profile";
                router.push(targetProfile);
              }}
              className="flex items-center gap-2.5 px-2.5 h-[36px] rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left font-medium text-xs"
            >
              <UserIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>Profile</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                const targetSettings = isPersonal
                  ? "/personal/settings"
                  : userRole === "CO_CEO"
                  ? "/co-ceo/settings"
                  : userRole === "MEMBER"
                  ? "/member/settings"
                  : "/ceo/settings";
                router.push(targetSettings);
              }}
              className="flex items-center gap-2.5 px-2.5 h-[36px] rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left font-medium text-xs"
            >
              <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>Settings</span>
            </button>
          </div>

          <div className="h-px bg-border" />

          {/* 4. APP SECTION */}
          <div className="flex flex-col space-y-0.5">
            <div className="px-1 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase pb-1">
              APP
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/updates");
              }}
              className="flex items-center gap-2.5 px-2.5 h-[36px] rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left font-medium text-xs"
            >
              <RefreshCw className="w-4 h-4 text-[#C9A52A] shrink-0" />
              <span>Updates</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/install");
              }}
              className="flex items-center gap-2.5 px-2.5 h-[36px] rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left font-medium text-xs"
            >
              <Download className="w-4 h-4 text-[#C9A52A] shrink-0" />
              <span>Install App</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/about");
              }}
              className="flex items-center gap-2.5 px-2.5 h-[36px] rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left font-medium text-xs"
            >
              <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>About</span>
            </button>
          </div>

          <div className="h-px bg-border" />

          {/* 5. PREFERENCES / APPEARANCE */}
          <div className="space-y-1.5">
            <div className="px-1 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
              APPEARANCE
            </div>
            <div className="h-[36px] rounded-xl bg-muted/60 border border-border grid grid-cols-3 items-center p-0.5 gap-0.5 select-none">
              {[
                { value: "light", label: "Light", Icon: Sun },
                { value: "dark", label: "Dark", Icon: Moon },
                { value: "system", label: "System", Icon: Monitor },
              ].map(({ value, label, Icon }) => {
                const isActive = mounted && theme === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={`h-full rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer focus:outline-none ${
                      isActive
                        ? "bg-card text-[#C9A52A] shadow-2xs font-extrabold border border border-[#C9A52A]/30"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#C9A52A]" : "text-muted-foreground"}`} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* 6. SIGN OUT */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="flex items-center gap-2.5 px-2.5 h-[38px] rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer text-left font-extrabold text-xs"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
            <span>Sign out</span>
          </button>
        </div>
      </ResponsivePopover>

      {/* Standalone Workspace Switcher Modal */}
      <WorkspaceSwitcherModal
        isOpen={isSwitcherModalOpen}
        onClose={() => setIsSwitcherModalOpen(false)}
      />
    </>
  );
}
