"use client";

import { useState } from "react";
import {
  User, Shield, ChevronRight, Bell,
  Palette, Sliders, LogOut, Loader2, AlertCircle, Laptop
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import Link from "next/link";

interface ProfileHomeViewProps {
  basePath: string; // e.g., "/ceo", "/personal", "/co-ceo", "/member"
}

export function ProfileHomeView({ basePath }: ProfileHomeViewProps) {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const isPersonal = basePath.startsWith("/personal");

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError("");
    try {
      if (logout) await logout();
    } catch (err) {
      setSignOutError("Sign out failed. Please try again.");
      setSigningOut(false);
    }
  };

  const initials = (user?.displayName || user?.name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const userName = user?.displayName || user?.name || user?.email?.split("@")[0] || "User";
  const userRole = user?.role || "CEO";
  const roleDisplay = isPersonal
    ? "Personal Workspace"
    : `${userRole} · ManMadhan`;

  const accountItems = [
    {
      id: "profile-info",
      label: "Profile Information",
      desc: "Name, display name, and profile photo",
      icon: User,
      href: `${basePath}/profile/edit`,
    },
    {
      id: "preferences",
      label: "Preferences",
      desc: "Language, timezone, date & time format",
      icon: Sliders,
      href: `${basePath}/settings?tab=preferences`,
    },
    {
      id: "appearance",
      label: "Appearance",
      desc: "Theme: System, Light, or Dark",
      icon: Palette,
      href: `${basePath}/settings?tab=appearance`,
    },
    {
      id: "notifications",
      label: "Notifications",
      desc: "Task, approval, and deadline alerts",
      icon: Bell,
      href: `${basePath}/settings?tab=notifications`,
    },
  ];

  const securityItems = [
    {
      id: "security",
      label: "Security & Password",
      desc: "Password and account protection",
      icon: Shield,
      href: `${basePath}/settings?tab=security`,
    },
    {
      id: "devices",
      label: "Connected Devices",
      desc: "Manage active device sessions",
      icon: Laptop,
      href: `${basePath}/settings?tab=security-devices`,
    },
    {
      id: "activity",
      label: "Security Activity",
      desc: "Login history and security events",
      icon: Bell,
      href: `${basePath}/settings?tab=security-activity`,
    },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden p-4 space-y-5 text-[#17202A] dark:text-[#F2F4F7] select-none font-sans">
      
      {/* 9. RESTRAINED COMPACT PROFILE HERO */}
      <div className="flex flex-col items-center text-center py-4 bg-[#FFFFFF] dark:bg-[#15191F] rounded-[12px] border border-[#E4E7EC] dark:border-[#272D36] p-4 relative">
        <Link
          href={`${basePath}/profile/edit`}
          className="absolute top-3.5 right-4 text-[14px] font-semibold text-[#C9A52A] dark:text-[#D4B12F] hover:underline transition-colors"
        >
          Edit
        </Link>
        <div className="w-[80px] h-[80px] rounded-full bg-[#D4B12F]/15 dark:bg-[#D4B12F]/20 border border-[#D4B12F]/30 flex items-center justify-center overflow-hidden shrink-0 mt-1">
          {user?.avatar ? (
            <img src={user.avatar} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[22px] font-bold text-[#C9A52A] dark:text-[#D4B12F]">{initials}</span>
          )}
        </div>
        <h2 className="text-[18px] font-semibold text-[#17202A] dark:text-[#F2F4F7] mt-2.5 leading-tight">
          {userName}
        </h2>
        <span className="text-[13px] font-medium text-[#C9A52A] dark:text-[#D4B12F] mt-0.5">
          {roleDisplay}
        </span>
        <span className="text-[12px] font-normal text-[#667085] dark:text-[#8B95A5] mt-0.5">
          {user?.email || ""}
        </span>
      </div>

      {signOutError && (
        <div className="p-3 rounded-[12px] bg-[#D92D20]/10 dark:bg-[#F04444]/10 border border-[#D92D20]/20 dark:border-[#F04444]/20 text-[#D92D20] dark:text-[#F04444] text-[12px] font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {signOutError}
        </div>
      )}

      {/* 6. GROUPED ACCOUNT SETTINGS SECTION */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#667085] dark:text-[#8B95A5] px-1">
          ACCOUNT
        </h3>
        <div className="rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60 overflow-hidden">
          {accountItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="min-h-[58px] px-3.5 flex items-center justify-between hover:bg-[#F5F6F8] dark:hover:bg-[#181D24] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F] shrink-0 stroke-[1.8]" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#17202A] dark:text-[#F2F4F7] truncate leading-tight">
                      {item.label}
                    </p>
                    <p className="text-[12px] font-normal text-[#667085] dark:text-[#8B95A5] truncate leading-tight mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-[18px] h-[18px] text-[#667085] dark:text-[#8B95A5] shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* 6. GROUPED SECURITY SETTINGS SECTION */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#667085] dark:text-[#8B95A5] px-1">
          SECURITY
        </h3>
        <div className="rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60 overflow-hidden">
          {securityItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="min-h-[58px] px-3.5 flex items-center justify-between hover:bg-[#F5F6F8] dark:hover:bg-[#181D24] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-5 h-5 text-[#667085] dark:text-[#8B95A5] shrink-0 stroke-[1.8]" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#17202A] dark:text-[#F2F4F7] truncate leading-tight">
                      {item.label}
                    </p>
                    <p className="text-[12px] font-normal text-[#667085] dark:text-[#8B95A5] truncate leading-tight mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-[18px] h-[18px] text-[#667085] dark:text-[#8B95A5] shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* 11. COMPACT SIGN OUT ROW */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#667085] dark:text-[#8B95A5] px-1">
          ACCOUNT ACTIONS
        </h3>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full min-h-[58px] px-3.5 rounded-[12px] bg-[#D92D20]/5 dark:bg-[#F04444]/10 border border-[#D92D20]/20 dark:border-[#F04444]/20 flex items-center gap-3 hover:bg-[#D92D20]/10 dark:hover:bg-[#F04444]/20 transition-colors cursor-pointer disabled:opacity-50 text-left"
        >
          {signingOut ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#D92D20] dark:text-[#F04444] shrink-0" />
          ) : (
            <LogOut className="w-5 h-5 text-[#D92D20] dark:text-[#F04444] shrink-0 stroke-[1.8]" />
          )}
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[#D92D20] dark:text-[#F04444]">
              {signingOut ? "Signing Out..." : "Sign Out"}
            </p>
            <p className="text-[12px] font-normal text-[#667085] dark:text-[#8B95A5]">
              Sign out of your account on this device
            </p>
          </div>
        </button>
      </div>

    </div>
  );
}

export default ProfileHomeView;
