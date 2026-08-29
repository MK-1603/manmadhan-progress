"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  User as UserIcon, 
  Settings, 
  Building2, 
  LogOut, 
  Sun, 
  Moon, 
  Monitor, 
  Check, 
  ChevronDown,
  RefreshCw, 
  Download, 
  Info 
} from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsivePopover } from "../ui/responsive-popover";
import { useAuth } from "../auth/auth-context";
import apiClient from "@/lib/api-client";

export function ProfileDropdown({
  activePopover,
  setActivePopover,
}: {
  activePopover?: "none" | "search" | "notifications" | "profile" | "switcher";
  setActivePopover?: (val: "none" | "search" | "notifications" | "profile" | "switcher") => void;
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);

  const isOpen = activePopover !== undefined ? activePopover === "profile" : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (setActivePopover) {
      setActivePopover(open ? "profile" : "none");
    } else {
      setInternalIsOpen(open);
    }
    if (!open) {
      setIsWorkspaceSwitcherOpen(false);
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
  const realDisplayName = user?.displayName || user?.name || user?.email?.split("@")[0] || "User";
  const realBatchId = orgWorkspace?.batchNumber || user?.batchNumber || "MM1107";

  const handleSwitchWorkspace = (target: "personal" | "org") => {
    setIsWorkspaceSwitcherOpen(false);
    setIsOpen(false);
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

  const trigger = (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      aria-label="Open profile menu"
      title="User Profile"
      className="w-9 h-9 aspect-square rounded-full flex items-center justify-center bg-[#C9A52A]/15 dark:bg-[#C9A52A]/20 border border-[#C9A52A]/40 text-[#C9A52A] font-extrabold text-xs font-mono shrink-0 cursor-pointer focus:outline-none transition-all hover:scale-105"
      suppressHydrationWarning
    >
      {userInitials}
    </button>
  );

  return (
    <ResponsivePopover
      trigger={trigger}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      align="right"
      offsetY={20}
      desktopClassName="w-80 md:w-84 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden p-4 font-sans text-xs select-none z-[99999]"
      mobileClassName="fixed left-0 right-0 bottom-0 w-full z-[10001] bg-[#FFFFFF] dark:bg-[#0B0D10] text-[#121316] dark:text-[#F5F5F5] rounded-t-[32px] rounded-b-none border-t border-[#E4E4E8] dark:border-[#22252A] shadow-[0_-10px_40px_rgba(0,0,0,0.35)] flex flex-col max-h-[92vh] select-none font-sans overflow-hidden outline-none"
    >
      <div className="flex flex-col space-y-2 text-xs">
        
        {/* 1. COMPACT USER IDENTITY HEADER */}
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-border">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#C9A52A]/15 border border-[#C9A52A]/40 text-[#C9A52A] font-black text-xs font-mono shrink-0">
            {userInitials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-xs text-foreground truncate leading-tight">
              {realDisplayName}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground truncate leading-tight mt-0.5">
              {isPersonal ? "Personal Workspace" : `${userRole} · Organization`}
            </span>
          </div>
        </div>

        {/* 2. NON-REDUNDANT WORKSPACE SELECTOR */}
        <div className="space-y-1">
          <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-muted-foreground block px-1">
            WORKSPACE
          </span>

          {/* Current Workspace Trigger */}
          <button
            type="button"
            onClick={() => setIsWorkspaceSwitcherOpen(prev => !prev)}
            aria-expanded={isWorkspaceSwitcherOpen}
            className="w-full p-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/80 flex items-center justify-between transition-colors cursor-pointer text-left focus:outline-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#C9A52A]/15 border border-[#C9A52A]/30 text-[#C9A52A] flex items-center justify-center shrink-0">
                {isPersonal ? <UserIcon className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate">
                  {isPersonal ? "Personal Workspace" : "Organization Workspace"}
                </span>
                <span className="text-[10.5px] font-mono text-muted-foreground truncate mt-0.5">
                  {isPersonal ? "Private workspace" : `Batch ID: ${realBatchId}`}
                </span>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-150 ${isWorkspaceSwitcherOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Expandable Alternate Workspace Option (Only shows alternate workspace to avoid duplication) */}
          <AnimatePresence>
            {isWorkspaceSwitcherOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="space-y-1 overflow-hidden pt-1"
              >
                {isPersonal ? (
                  /* If currently in Personal, show option to switch to Organization Workspace */
                  <button
                    type="button"
                    onClick={() => handleSwitchWorkspace("org")}
                    className="w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-transparent"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Building2 className="w-4 h-4 shrink-0 text-[#C9A52A]" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate">Switch to Organization Workspace</span>
                        <span className="text-[10.5px] font-mono text-muted-foreground truncate mt-0.5">
                          Batch ID: {realBatchId}
                        </span>
                      </div>
                    </div>
                  </button>
                ) : (
                  /* If currently in Organization, show option to switch to Personal Workspace */
                  <button
                    type="button"
                    onClick={() => handleSwitchWorkspace("personal")}
                    className="w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-transparent"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserIcon className="w-4 h-4 shrink-0 text-[#C9A52A]" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate">Switch to Personal Workspace</span>
                        <span className="text-[10.5px] font-mono text-muted-foreground truncate mt-0.5">
                          Private workspace
                        </span>
                      </div>
                    </div>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-px bg-border my-0.5" />

        {/* 3. ACCOUNT SECTION */}
        <div className="flex flex-col space-y-0.5">
          <div className="px-1 text-[9.5px] font-mono font-bold tracking-wider text-muted-foreground uppercase pb-0.5">
            ACCOUNT
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              const targetProfile = isPersonal
                ? "/personal/profile"
                : userRole.includes("CO")
                ? "/co-ceo/profile"
                : userRole.includes("MEMBER")
                ? "/member/profile"
                : "/ceo/profile";
              router.push(targetProfile);
            }}
            className="flex items-center gap-2 px-2 h-[34px] rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left font-semibold text-xs"
          >
            <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>{isPersonal ? "Profile" : "Organization Profile"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              const targetSettings = isPersonal
                ? "/personal/settings"
                : userRole.includes("CO")
                ? "/co-ceo/settings"
                : userRole.includes("MEMBER")
                ? "/member/settings"
                : "/ceo/settings";
              router.push(targetSettings);
            }}
            className="flex items-center gap-2 px-2 h-[34px] rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left font-semibold text-xs"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>{isPersonal ? "Settings" : "Organization Settings"}</span>
          </button>
        </div>

        <div className="h-px bg-border my-0.5" />

        {/* 4. COMPACT APPEARANCE SEGMENTED CONTROL */}
        <div className="space-y-1">
          <div className="px-1 text-[9.5px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
            APPEARANCE
          </div>
          <div className="h-[32px] rounded-lg bg-muted/60 border border-border grid grid-cols-3 items-center p-0.5 gap-0.5 select-none">
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
                  className={`h-full rounded-md flex items-center justify-center gap-1 text-[10.5px] font-bold transition-all cursor-pointer focus:outline-none ${
                    isActive
                      ? "bg-card text-[#C9A52A] shadow-2xs font-extrabold border border-[#C9A52A]/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-3 h-3 ${isActive ? "text-[#C9A52A]" : "text-muted-foreground"}`} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-border my-0.5" />

        {/* 5. COMPACT MORE SECTION */}
        <div className="flex flex-col space-y-0.5">
          <div className="px-1 text-[9.5px] font-mono font-bold tracking-wider text-muted-foreground uppercase pb-0.5">
            MORE
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push("/updates");
            }}
            className="flex items-center gap-2 px-2 h-[30px] rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left font-medium text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#C9A52A] shrink-0" />
            <span>Updates</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push("/install");
            }}
            className="flex items-center gap-2 px-2 h-[30px] rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left font-medium text-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A52A] shrink-0" />
            <span>Install App</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push("/about");
            }}
            className="flex items-center gap-2 px-2 h-[30px] rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left font-medium text-xs"
          >
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>About</span>
          </button>
        </div>

        <div className="h-px bg-border my-0.5" />

        {/* 6. SIGN OUT */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            logout();
          }}
          className="flex items-center gap-2 px-2 h-[34px] rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer text-left font-extrabold text-xs"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          <span>Sign out</span>
        </button>
      </div>
    </ResponsivePopover>
  );
}

export default ProfileDropdown;
