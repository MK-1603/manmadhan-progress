"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User,
  Sliders,
  Bell,
  Palette,
  Laptop,
  Shield,
  ArrowLeft,
  Edit2,
  Check,
  Save,
  ChevronRight,
  AlertCircle,
  Clock,
  Lock,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useTheme } from "next-themes";
import apiClient from "@/lib/api-client";
import Link from "next/link";

type ProfileSection =
  | "info"
  | "preferences"
  | "notifications"
  | "appearance"
  | "devices"
  | "security";

export default function PersonalProfilePage() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();

  const sectionParam = searchParams.get("section") as ProfileSection | null;
  const [activeSection, setActiveSection] = useState<ProfileSection | null>(sectionParam);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    displayName: user?.displayName || user?.name || "",
    email: user?.email || "",
    timezone: user?.timezone || "UTC",
    language: "en",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    taskAlerts: true,
    deadlineAlerts: true,
    reminderAlerts: true,
    focusAlerts: true,
    automationAlerts: true,
  });

  useEffect(() => {
    setActiveSection(sectionParam);
  }, [sectionParam]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        displayName: user.displayName || user.name || "",
        email: user.email || "",
        timezone: user.timezone || "UTC",
      }));
    }
  }, [user]);

  const openSection = (sec: ProfileSection) => {
    setActiveSection(sec);
    router.push(`/personal/profile?section=${sec}`);
  };

  const closeSection = () => {
    setActiveSection(null);
    router.push(`/personal/profile`);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiClient.patch("/personal/profile", {
        displayName: formData.displayName,
        timezone: formData.timezone,
      });
      if (res.data?.success) {
        setSaved(true);
        if (refreshUser) await refreshUser();
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.displayName || user?.name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const SECTIONS: {
    id: ProfileSection;
    title: string;
    description: string;
    icon: React.ElementType;
  }[] = [
    {
      id: "info",
      title: "Profile Information",
      description: "Full display name, profile photo, and personal account details.",
      icon: User,
    },
    {
      id: "preferences",
      title: "Personal Preferences",
      description: "Language, timezone, date format, and time format.",
      icon: Sliders,
    },
    {
      id: "notifications",
      title: "Personal Notifications",
      description: "Task, deadline, focus, and automation alerts.",
      icon: Bell,
    },
    {
      id: "appearance",
      title: "Appearance & Theme",
      description: "Light mode, dark mode, or system color preferences.",
      icon: Palette,
    },
    {
      id: "devices",
      title: "Connected Devices",
      description: "Active device sessions and desktop browser authorization.",
      icon: Laptop,
    },
    {
      id: "security",
      title: "Security & Activity",
      description: "Password security and recent login activity log.",
      icon: Shield,
    },
  ];

  return (
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Personal Profile</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Manage your personal identity, localization preferences, and account security.
          </p>
        </div>

        <Link
          href="/personal/profile/edit"
          className="px-4 h-9 rounded-lg bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit Profile
        </Link>
      </header>

      {error && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Two-Column Desktop / Mobile Index View */}
      {!activeSection ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Identity Card */}
          <div className="lg:col-span-1 p-6 rounded-xl border border-border bg-card shadow-xs flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gold/20 text-gold font-black text-2xl flex items-center justify-center border-2 border-gold/40 shadow-xs">
              {initials}
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                {user?.displayName || user?.name || "User"}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">{user?.email || ""}</p>
            </div>

            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              Personal Account
            </span>

            <div className="w-full border-t border-border pt-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Account ID</span>
                <span className="font-mono text-foreground font-semibold text-[11px]">
                  {user?.id ? `${user.id.substring(0, 8)}...` : "active"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Status</span>
                <span className="text-emerald-500 font-bold text-[11px]">Active</span>
              </div>
            </div>
          </div>

          {/* Right Section Rows / Desktop Grid */}
          <div className="lg:col-span-2 space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => openSection(sec.id)}
                  className="w-full p-4 md:p-5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left flex items-center justify-between group shadow-xs cursor-pointer min-h-[48px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {sec.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-medium truncate hidden sm:block">
                        {sec.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Native Full-Screen Mobile / Desktop Sub-Page Navigation */
        <div className="fixed inset-0 z-50 md:relative md:inset-auto bg-background md:bg-transparent overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Mobile Full-Screen Header */}
          <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-md pb-4 border-b border-border flex items-center justify-between">
            <button
              onClick={closeSection}
              className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-gold transition-colors cursor-pointer min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Profile</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 h-9 rounded-lg bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          </header>

          <main className="max-w-xl mx-auto space-y-6 pt-2">
            {/* Profile Information Section */}
            {activeSection === "info" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Profile Information</h3>
                  <p className="text-xs text-muted-foreground">Update your full display name and identity.</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-foreground mb-1">FULL DISPLAY NAME</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-lg bg-background border border-border font-medium text-foreground focus:outline-none focus:border-foreground/30"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-foreground mb-1">EMAIL ADDRESS</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full h-11 px-3.5 rounded-lg bg-muted/40 border border-border font-medium text-foreground opacity-70"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Section */}
            {activeSection === "preferences" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Personal Preferences</h3>
                  <p className="text-xs text-muted-foreground">Configure localization and timezone defaults.</p>
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">TIMEZONE</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-lg bg-background border border-border font-medium text-foreground focus:outline-none focus:border-foreground/30"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Personal Notifications</h3>
                  <p className="text-xs text-muted-foreground">Manage personal task and deadline alert preferences.</p>
                </div>
                <label className="flex items-center justify-between p-4 rounded-xl border border-border bg-card cursor-pointer min-h-[48px]">
                  <span className="font-bold text-foreground">Task Deadline Alerts</span>
                  <input
                    type="checkbox"
                    checked={formData.deadlineAlerts}
                    onChange={(e) => setFormData({ ...formData, deadlineAlerts: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                  />
                </label>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === "appearance" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Appearance & Theme</h3>
                  <p className="text-xs text-muted-foreground">Select light, dark, or system color mode.</p>
                </div>
                <div className="flex gap-2">
                  {["light", "dark", "system"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`flex-1 h-11 rounded-lg border font-bold capitalize transition-colors cursor-pointer ${
                        theme === t
                          ? "bg-foreground text-background border-foreground shadow-xs"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Connected Devices Section */}
            {activeSection === "devices" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Connected Devices</h3>
                  <p className="text-xs text-muted-foreground">Active desktop and mobile browser sessions.</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between min-h-[48px]">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-bold text-foreground">Current Desktop Browser</p>
                      <p className="text-[10px] text-muted-foreground">Active Now • Windows</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                    CURRENT
                  </span>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === "security" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Security & Activity</h3>
                  <p className="text-xs text-muted-foreground">Recent authentication logs and account protection.</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                  <p className="font-bold text-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-500" /> OAuth Session Protected
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Your account session is secured via HTTP-only cookie authentication.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
