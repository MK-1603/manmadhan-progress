"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  User as UserIcon, Shield, Settings, Building2,
  LogOut, Check, Sun, Moon, Monitor
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { ResponsivePopover } from "../ui/responsive-popover";
import { useAuth } from "../auth/auth-context";
import apiClient from "@/lib/api-client";

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const fetch = async () => {
      try {
        const res = await apiClient.get("/workspaces");
        if (res.data.success) setWorkspaces(res.data.data || []);
      } catch (e) { console.error(e); }
    };
    fetch();
  }, []);

  const isPersonal = pathname?.startsWith("/personal");
  const activeWorkspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
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
  const userName = user?.displayName || user?.name || (user?.email ? user.email.split("@")[0] : "Sai Krishnan S");

  const getActiveWorkspaceName = () => {
    if (isPersonal) return "Personal Workspace";
    const current = workspaces.find(w => w.id === activeWorkspaceId);
    return current ? current.name : "ManMadhan Workspace";
  };

  const handleWorkspaceSwitch = (type: "personal" | "org", wsId?: string) => {
    setIsOpen(false);
    if (type === "personal") {
      window.location.href = "/personal/dashboard";
    } else if (wsId) {
      localStorage.setItem("workspaceId", wsId);
      let path = "/ceo/dashboard";
      if (userRole === "CO-CEO") path = "/co-ceo/dashboard";
      else if (userRole === "MEMBER") path = "/member/dashboard";
      window.location.href = path;
    }
  };

  const handleMenuClick = (action: "profile" | "security" | "settings") => {
    setIsOpen(false);
    let base = "/personal/settings";
    if (!isPersonal) {
      if (userRole === "CO-CEO") base = "/co-ceo/settings";
      else if (userRole === "MEMBER") base = "/member/settings";
      else base = "/ceo/settings";
    }
    router.push(action === "security" ? `${base}#security` : base);
  };

  const trigger = (
    <motion.button
      onClick={() => setIsOpen(!isOpen)}
      whileHover={{ y: -1, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.12 }}
      className="relative w-9 h-9 rounded-full flex items-center justify-center text-[#0B0B0C] font-bold text-xs shrink-0 cursor-pointer focus:outline-none bg-gold select-none"
      title="User Profile"
    >
      {userInitials}
    </motion.button>
  );

  /* ─────────────────────────────────────────────────
     DESKTOP: 328px compact / MOBILE: full-width sheet
  ───────────────────────────────────────────────── */
  return (
    <ResponsivePopover
      trigger={trigger}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      align="right"
      offsetY={6}
      desktopClassName="w-[296px] rounded-[12px] border dark:border-[rgba(255,255,255,0.07)] bg-card dark:bg-[#141416] shadow-[0_10px_24px_rgba(0,0,0,0.32)] overflow-hidden flex flex-col"
      mobileClassName="fixed inset-x-0 bottom-0 z-[10001] bg-card dark:bg-[#141416] rounded-t-3xl border-t dark:border-[rgba(255,255,255,0.07)] shadow-2xl flex flex-col overflow-y-auto overscroll-contain max-h-[85vh] pb-[env(safe-area-inset-bottom)]"
    >
      {/* ── DESKTOP inner wrapper (compact 12px padding) ── */}
      <div className="hidden md:flex flex-col gap-0 p-[10px] select-none">

        {/* 1. IDENTITY */}
        <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b dark:border-[rgba(255,255,255,0.06)]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#0B0B0C] font-extrabold text-[10px] shrink-0 bg-gold">
            {userInitials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold text-foreground dark:text-[#F5F5F4] truncate leading-snug">{userName}</span>
            <span className="text-[11px] text-muted-foreground dark:text-[#A1A1AA] truncate leading-tight font-normal">{getActiveWorkspaceName()}</span>
          </div>
        </div>

        {/* 2. ACCOUNT ROWS */}
        <div className="flex flex-col gap-px mb-2.5">
          {[
            { label: "Profile", icon: UserIcon, action: "profile" as const },
            { label: "Security", icon: Shield, action: "security" as const },
            { label: "Account Settings", icon: Settings, action: "settings" as const },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={action}
              onClick={() => handleMenuClick(action)}
              className="w-full h-[32px] px-1.5 rounded-md flex items-center gap-2 text-left hover:bg-accent/50 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors focus:outline-none group cursor-pointer"
            >
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                <Icon className="w-[15px] h-[15px] text-muted-foreground dark:text-[#8B8B94] group-hover:text-foreground transition-colors stroke-[1.7]" />
              </div>
              <span className="text-[12.5px] font-medium text-foreground dark:text-[#E4E4E7]">{label}</span>
            </button>
          ))}
        </div>



        {/* 4. APPEARANCE */}
        {mounted && (
          <div className="mb-2">
            <div className="text-[9px] font-semibold tracking-[0.06em] uppercase text-muted-foreground dark:text-[#85858F] mb-1 px-0.5">Appearance</div>
            <div className="h-[30px] rounded-[7px] dark:bg-[rgba(255,255,255,0.025)] bg-muted/40 dark:border dark:border-[rgba(255,255,255,0.06)] border border-border/60 grid grid-cols-3 items-center p-0.5 gap-0.5">
              {[
                { value: "light", label: "Light", Icon: Sun },
                { value: "dark", label: "Dark", Icon: Moon },
                { value: "system", label: "System", Icon: Monitor },
              ].map(({ value, label, Icon }) => {
                const isActive = theme === value;
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`h-full rounded-[5px] flex items-center justify-center gap-1 text-[10px] font-medium transition-all focus:outline-none ${
                      isActive
                        ? value === "dark"
                          ? "dark:bg-[rgba(216,165,43,0.09)] text-gold dark:text-[#D8A52B] bg-card"
                          : "bg-card text-gold shadow-xs"
                        : "text-muted-foreground dark:text-[#A1A1AA] hover:text-foreground dark:hover:text-[#F5F5F4]"
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${isActive ? "text-gold dark:text-[#D8A52B]" : "text-muted-foreground dark:text-[#8B8B94]"}`} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. SIGN OUT */}
        <div className="pt-1.5 mt-1.5 border-t dark:border-[rgba(255,255,255,0.06)] border-border/60">
          <button
            onClick={() => { setIsOpen(false); logout(); }}
            className="w-full h-[32px] px-1.5 rounded-md flex items-center gap-2 text-left hover:bg-rose-500/10 dark:hover:bg-[rgba(239,107,107,0.07)] transition-colors focus:outline-none cursor-pointer"
          >
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              <LogOut className="w-[15px] h-[15px] text-[#EF6B6B] stroke-[1.7]" />
            </div>
            <span className="text-[12.5px] font-medium text-[#EF6B6B]">Sign out</span>
          </button>
        </div>
      </div>

      {/* ── MOBILE inner wrapper (touch-friendly 16px padding) ── */}
      <div className="flex md:hidden flex-col gap-0 px-4 pt-3 pb-2 select-none">

        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-border/60 dark:bg-[rgba(255,255,255,0.12)] mx-auto mb-3" />

        {/* 1. IDENTITY */}
        <div className="flex items-center gap-3 pb-4 mb-4 border-b dark:border-[rgba(255,255,255,0.06)]">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-[#0B0B0C] font-extrabold text-[12px] shrink-0 bg-gold">
            {userInitials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[16px] font-semibold text-foreground dark:text-[#F5F5F4] truncate leading-snug">{userName}</span>
            <span className="text-[13px] text-muted-foreground dark:text-[#A1A1AA] truncate leading-tight font-normal">{getActiveWorkspaceName()}</span>
          </div>
        </div>

        {/* 2. ACCOUNT ROWS */}
        <div className="flex flex-col gap-px mb-4">
          {[
            { label: "Profile", icon: UserIcon, action: "profile" as const },
            { label: "Security", icon: Shield, action: "security" as const },
            { label: "Account Settings", icon: Settings, action: "settings" as const },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={action}
              onClick={() => handleMenuClick(action)}
              className="w-full h-12 px-2 rounded-xl flex items-center gap-3 text-left hover:bg-accent/50 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors focus:outline-none group cursor-pointer"
            >
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-muted-foreground dark:text-[#8B8B94] group-hover:text-foreground transition-colors stroke-[1.7]" />
              </div>
              <span className="text-[15px] font-medium text-foreground dark:text-[#E4E4E7]">{label}</span>
            </button>
          ))}
        </div>



        {/* 4. APPEARANCE */}
        {mounted && (
          <div className="mb-4">
            <div className="text-[11px] font-semibold tracking-[0.05em] uppercase text-muted-foreground dark:text-[#85858F] mb-2 px-1">Appearance</div>
            <div className="h-11 rounded-xl dark:bg-[rgba(255,255,255,0.025)] bg-muted/40 dark:border dark:border-[rgba(255,255,255,0.06)] border border-border/60 grid grid-cols-3 items-center p-0.5 gap-0.5">
              {[
                { value: "light", label: "Light", Icon: Sun },
                { value: "dark", label: "Dark", Icon: Moon },
                { value: "system", label: "System", Icon: Monitor },
              ].map(({ value, label, Icon }) => {
                const isActive = theme === value;
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`h-full rounded-lg flex items-center justify-center gap-1.5 text-[12px] font-medium transition-all focus:outline-none ${
                      isActive
                        ? value === "dark"
                          ? "dark:bg-[rgba(216,165,43,0.09)] text-gold dark:text-[#D8A52B] bg-card"
                          : "bg-card text-gold shadow-xs"
                        : "text-muted-foreground dark:text-[#A1A1AA] hover:text-foreground dark:hover:text-[#F5F5F4]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-gold dark:text-[#D8A52B]" : "text-muted-foreground dark:text-[#8B8B94]"}`} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. SIGN OUT */}
        <div className="pt-3 border-t dark:border-[rgba(255,255,255,0.06)] border-border/60 mb-2">
          <button
            onClick={() => { setIsOpen(false); logout(); }}
            className="w-full h-12 px-2 rounded-xl flex items-center gap-3 text-left hover:bg-rose-500/10 dark:hover:bg-[rgba(239,107,107,0.07)] transition-colors focus:outline-none cursor-pointer"
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-[#EF6B6B] stroke-[1.7]" />
            </div>
            <span className="text-[15px] font-medium text-[#EF6B6B]">Sign out</span>
          </button>
        </div>
      </div>
    </ResponsivePopover>
  );
}
