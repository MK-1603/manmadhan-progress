"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Shield, ChevronRight, Settings, Bell,
  Palette, Sliders, LogOut, Camera, Loader2, AlertCircle
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { PremiumCard } from "@/components/ui/premium-card";
import Link from "next/link";

interface ProfileHomeViewProps {
  basePath: string; // e.g., "/ceo"
}

export function ProfileHomeView({ basePath }: ProfileHomeViewProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

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
      id: "notifications",
      label: "Notifications",
      desc: "Task, approval, and deadline alerts",
      icon: Bell,
      href: `${basePath}/settings?tab=notifications`,
    },
    {
      id: "appearance",
      label: "Appearance",
      desc: "Theme: System, Light, or Dark",
      icon: Palette,
      href: `${basePath}/settings?tab=appearance`,
    },
  ];

  const securityItems = [
    {
      id: "security",
      label: "Security & Password",
      desc: "Password change and account protection",
      icon: Shield,
      href: `${basePath}/settings?tab=security`,
    },
    {
      id: "devices",
      label: "Connected Devices",
      desc: "Manage your active device sessions",
      icon: Settings,
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
    <div className="w-full h-[calc(100dvh-65px)] flex flex-col overflow-hidden bg-background">
      {/* Fixed Header */}
      <div className="shrink-0 sticky top-0 z-20 px-4 py-3.5 border-b border-border/40 bg-background flex items-center justify-between">
        <h1 className="text-lg font-black text-foreground tracking-tight">Profile</h1>
        <Link
          href={`${basePath}/profile/edit`}
          className="text-xs font-bold text-gold hover:text-[#F0BC2B] transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">

        {/* Desktop: Two Column Layout */}
        <div className="hidden md:flex gap-0 h-full">
          {/* Desktop Sidebar Nav */}
          <nav className="w-60 shrink-0 border-r border-border/50 bg-card/40 p-4 space-y-6 overflow-y-auto">
            {/* Profile Card Compact */}
            <div className="flex flex-col items-center text-center gap-3 py-4 border-b border-border/40">
              <div className="w-16 h-16 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-gold">{initials}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-black text-foreground">{user?.displayName || user?.name || "User"}</p>
                <p className="text-[11px] font-bold text-gold">{user?.role || "CEO"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[180px]">{user?.email}</p>
              </div>
              <Link
                href={`${basePath}/profile/edit`}
                className="w-full py-2 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" /> Edit Profile
              </Link>
            </div>

            {/* Desktop Nav Groups */}
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-black text-muted-foreground/70 tracking-widest uppercase px-3">ACCOUNT</h3>
              {accountItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent transition-all"
                  >
                    <Icon className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[10px] font-black text-muted-foreground/70 tracking-widest uppercase px-3">SECURITY</h3>
              {securityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent transition-all"
                  >
                    <Icon className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Sign Out */}
            <div className="pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-transparent transition-all cursor-pointer disabled:opacity-50"
              >
                {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                Sign Out
              </button>
            </div>
          </nav>

          {/* Desktop Main: Show Profile Overview */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <DesktopProfileContent
              user={user}
              initials={initials}
              basePath={basePath}
              accountItems={accountItems}
              securityItems={securityItems}
            />
          </main>
        </div>

        {/* Mobile: Full-Screen Index */}
        <div className="md:hidden">
          {/* Profile Hero Card */}
          <div className="mx-4 mt-4 mb-5 p-5 rounded-2xl bg-card border border-border/80">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-gold">{initials}</span>
                )}
              </div>
              <div>
                <p className="text-base font-black text-foreground">{user?.displayName || user?.name || "User"}</p>
                <p className="text-xs font-bold text-gold mt-0.5">{user?.role || "CEO"}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{user?.email}</p>
              </div>
              <Link
                href={`${basePath}/profile/edit`}
                className="w-full py-2.5 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" /> Edit Profile
              </Link>
            </div>
          </div>

          {signOutError && (
            <div className="mx-4 mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {signOutError}
            </div>
          )}

          {/* ACCOUNT Section */}
          <div className="px-4 space-y-2 mb-5">
            <h2 className="text-[10px] font-black text-gold uppercase tracking-widest px-1 mb-2">ACCOUNT</h2>
            {accountItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/80 active:border-gold transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gold/10 text-gold flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>

          {/* SECURITY Section */}
          <div className="px-4 space-y-2 mb-5">
            <h2 className="text-[10px] font-black text-gold uppercase tracking-widest px-1 mb-2">SECURITY</h2>
            {securityItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/80 active:border-gold transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>

          {/* ACCOUNT ACTIONS */}
          <div className="px-4 space-y-2 mb-6">
            <h2 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest px-1 mb-2">ACCOUNT ACTIONS</h2>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 active:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              ) : (
                <LogOut className="w-4 h-4 text-rose-500" />
              )}
              <div className="text-left">
                <p className="text-xs font-bold text-rose-500">{signingOut ? "Signing Out..." : "Sign Out"}</p>
                <p className="text-[10px] text-muted-foreground">Sign out of your account on this device</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Desktop Profile Overview Content
function DesktopProfileContent({ user, initials, basePath, accountItems, securityItems }: any) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 text-gold" /> Personal Profile
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Manage your personal account identity and security.</p>
      </div>

      {/* Profile Identity Card */}
      <PremiumCard className="p-6 bg-card border-border/80 rounded-xl">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center overflow-hidden shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-gold">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-black text-foreground">{user?.displayName || user?.name || "User"}</p>
            <p className="text-sm font-bold text-gold mt-0.5">{user?.role || "CEO"}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </p>
          </div>
          <Link
            href={`${basePath}/profile/edit`}
            className="px-4 py-2 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" /> Edit Profile
          </Link>
        </div>
      </PremiumCard>

      {/* Account Settings Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        {[...accountItems, ...securityItems].map((item: any) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/80 hover:border-gold/40 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{item.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
