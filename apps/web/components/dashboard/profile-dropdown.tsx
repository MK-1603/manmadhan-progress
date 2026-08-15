"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User as UserIcon, Settings, Building, LogOut, Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";
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
    if (!raw?.trim()) return "SK";
    const parts = raw.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  };

  const userInitials = getInitials(user);
  const userName = user?.displayName || user?.name || "Sai Krishnan S";
  const userEmail = user?.email || "saikrishnanmk1603@gmail.com";
  const cleanOrgName = orgWorkspace?.name && orgWorkspace.name !== "Personal Workspace" ? orgWorkspace.name : "MANMADHAN";

  const handleSwitchWorkspace = (target: "personal" | "org") => {
    setIsOpen(false);
    if (target === "personal") {
      window.location.href = "/personal/dashboard";
    } else {
      if (orgWorkspace?.id) {
        localStorage.setItem("workspaceId", orgWorkspace.id);
      }
      const targetDash =
        userRole === "CO-CEO"
          ? "/co-ceo/dashboard"
          : userRole === "MEMBER"
          ? "/member/dashboard"
          : "/ceo/dashboard";
      window.location.href = targetDash;
    }
  };

  const trigger = (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      aria-label="Open profile menu"
      title="User Profile"
      className="w-10 h-10 rounded-full flex items-center justify-center bg-[#B28D18]/15 dark:bg-[#D4B12F]/15 border border-[#B28D18]/25 dark:border-[#D4B12F]/25 text-[#B28D18] dark:text-[#D4B12F] font-bold text-xs font-mono shrink-0 cursor-pointer focus:outline-none transition-colors hover:brightness-105"
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
      offsetY={6}
      desktopClassName="w-[270px] rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] shadow-2xl overflow-hidden flex flex-col p-2.5 z-50 text-xs"
      mobileClassName="fixed inset-x-0 bottom-0 z-[10001] bg-[#FFFFFF] dark:bg-[#15181D] rounded-t-[24px] border-t border-[#E5E7EB] dark:border-[#24282E] shadow-2xl flex flex-col overflow-y-auto overscroll-contain max-h-[92vh] pb-[max(16px,env(safe-area-inset-bottom))] p-4 select-none"
    >
      <div className="flex flex-col space-y-3 text-xs">
        {/* 1. IDENTITY HEADER */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB] dark:border-[#24282E]">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#B28D18]/15 dark:bg-[#D4B12F]/15 border border-[#B28D18]/25 dark:border-[#D4B12F]/25 text-[#B28D18] dark:text-[#D4B12F] font-bold text-xs font-mono shrink-0">
            {userInitials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm text-[#17202A] dark:text-[#F2F3F5] truncate leading-tight">
              {userName}
            </span>
            <span className="text-xs text-[#667085] dark:text-[#8B94A3] truncate leading-tight mt-0.5">
              {isPersonal ? "Personal" : userRole}
            </span>
          </div>
        </div>

        {/* 2. WORKSPACE SWITCHER SECTION */}
        <div className="flex flex-col space-y-1 py-1">
          <div className="px-1 text-[10px] font-mono font-medium tracking-[0.1em] text-[#667085] dark:text-[#8B94A3] uppercase">
            WORKSPACE
          </div>
          <button
            type="button"
            onClick={() => handleSwitchWorkspace("personal")}
            className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
              isPersonal
                ? "bg-[#FFF8E7] dark:bg-[#1A1913] text-[#17202A] dark:text-[#F2F3F5]"
                : "hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] text-[#667085] dark:text-[#8B94A3]"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <UserIcon className={`w-4 h-4 shrink-0 ${isPersonal ? "text-[#B28D18] dark:text-[#D4B12F]" : ""}`} />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate leading-tight">Personal Workspace</span>
                <span className="text-[10.5px] text-[#667085] dark:text-[#8B94A3] leading-tight">Private workspace</span>
              </div>
            </div>
            {isPersonal && <Check className="w-4 h-4 text-[#B28D18] dark:text-[#D4B12F] shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() => handleSwitchWorkspace("org")}
            className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
              !isPersonal
                ? "bg-[#FFF8E7] dark:bg-[#1A1913] text-[#17202A] dark:text-[#F2F3F5]"
                : "hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] text-[#667085] dark:text-[#8B94A3]"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Building className={`w-4 h-4 shrink-0 ${!isPersonal ? "text-[#B28D18] dark:text-[#D4B12F]" : ""}`} />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate leading-tight uppercase">{cleanOrgName}</span>
                <span className="text-[10.5px] text-[#667085] dark:text-[#8B94A3] leading-tight">Organization Workspace</span>
              </div>
            </div>
            {!isPersonal && <Check className="w-4 h-4 text-[#B28D18] dark:text-[#D4B12F] shrink-0" />}
          </button>
        </div>

        <div className="h-px bg-[#E5E7EB] dark:bg-[#24282E]" />

        {/* 3. ACCOUNT LINKS */}
        <div className="flex flex-col space-y-1">
          <div className="px-1 text-[10px] font-mono font-medium tracking-[0.1em] text-[#667085] dark:text-[#8B94A3] uppercase">
            ACCOUNT
          </div>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              const targetProfile = isPersonal
                ? "/personal/profile"
                : userRole === "CO-CEO"
                ? "/co-ceo/profile"
                : userRole === "MEMBER"
                ? "/member/profile"
                : "/ceo/profile";
              router.push(targetProfile);
            }}
            className="flex items-center gap-2.5 px-2.5 h-[38px] rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] text-[#17202A] dark:text-[#F2F3F5] transition-colors cursor-pointer text-left font-medium text-xs"
          >
            <UserIcon className="w-4 h-4 text-[#667085] dark:text-[#8B94A3] shrink-0" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              const targetSettings = isPersonal
                ? "/personal/settings"
                : userRole === "CO-CEO"
                ? "/co-ceo/settings"
                : userRole === "MEMBER"
                ? "/member/settings"
                : "/ceo/settings";
              router.push(targetSettings);
            }}
            className="flex items-center gap-2.5 px-2.5 h-[38px] rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] text-[#17202A] dark:text-[#F2F3F5] transition-colors cursor-pointer text-left font-medium text-xs"
          >
            <Settings className="w-4 h-4 text-[#667085] dark:text-[#8B94A3] shrink-0" />
            <span>Settings</span>
          </button>

          {!isPersonal && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/ceo/organization");
              }}
              className="flex items-center gap-2.5 px-2.5 h-[38px] rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] text-[#17202A] dark:text-[#F2F3F5] transition-colors cursor-pointer text-left font-medium"
            >
              <Building className="w-4 h-4 text-[#667085] dark:text-[#8B94A3] shrink-0" />
              <span>Organization Settings</span>
            </button>
          )}
        </div>

        <div className="h-px bg-[#E5E7EB] dark:bg-[#24282E]" />

        {/* 4. APPEARANCE SEGMENTED CONTROL */}
        <div className="space-y-1.5">
          <div className="px-1 text-[10px] font-mono font-medium tracking-[0.1em] text-[#667085] dark:text-[#8B94A3] uppercase">
            APPEARANCE
          </div>
          <div className="h-[38px] rounded-xl bg-[#F3F4F6] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#24282E] grid grid-cols-3 items-center p-0.5 gap-0.5 select-none">
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
                  className={`h-full rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all cursor-pointer focus:outline-none ${
                    isActive
                      ? "bg-[#FFFFFF] dark:bg-[#1C2027] text-[#B28D18] dark:text-[#D4B12F] shadow-2xs font-semibold"
                      : "text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#B28D18] dark:text-[#D4B12F]" : "text-[#667085] dark:text-[#8B94A3]"}`} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-[#E5E7EB] dark:bg-[#24282E]" />

        {/* 5. SIGN OUT */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            logout();
          }}
          className="flex items-center gap-2.5 px-2.5 h-[40px] rounded-xl hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors cursor-pointer text-left font-semibold"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </ResponsivePopover>
  );
}
