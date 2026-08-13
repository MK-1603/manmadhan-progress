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
  LogOut,
  AlertCircle,
  Globe,
  Clock,
  Lock,
  Smartphone,
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
  const { user, refreshUser, logout } = useAuth();
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
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
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
          className="px-4 h-9 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit Profile
        </Link>
      </header>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Two-Column Layout OR Section Detail View */}
      {!activeSection ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Identity Card */}
          <div className="lg:col-span-1 p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col items-center text-center space-y-4">
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

          {/* Right Section Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => openSection(sec.id)}
                  className="p-5 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all text-left space-y-2 group shadow-xs hover:border-foreground/30 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted group-hover:bg-foreground group-hover:text-background text-foreground flex items-center justify-center transition-colors">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-gold transition-colors">
                    {sec.title}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    {sec.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Inside Section Detail View */
        <div className="rounded-2xl border border-border bg-card p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <button
              onClick={closeSection}
              className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Personal Profile
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 h-8 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          </div>

          {/* Render Active Section Form */}
          {activeSection === "info" && (
            <div className="space-y-4 max-w-lg text-xs">
              <h3 className="text-sm font-bold text-foreground">Profile Information</h3>
              <div>
                <label className="block font-bold text-foreground mb-1">FULL DISPLAY NAME</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border font-medium text-foreground focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full h-10 px-3.5 rounded-xl bg-muted/40 border border-border font-medium text-foreground opacity-70"
                />
              </div>
            </div>
          )}

          {activeSection === "preferences" && (
            <div className="space-y-4 max-w-lg text-xs">
              <h3 className="text-sm font-bold text-foreground">Personal Preferences</h3>
              <div>
                <label className="block font-bold text-foreground mb-1">TIMEZONE</label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border font-medium text-foreground focus:outline-none focus:border-gold"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-3 max-w-lg text-xs">
              <h3 className="text-sm font-bold text-foreground">Personal Notifications</h3>
              <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background cursor-pointer">
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

          {activeSection === "appearance" && (
            <div className="space-y-4 max-w-lg text-xs">
              <h3 className="text-sm font-bold text-foreground">Appearance & Theme</h3>
              <div className="flex gap-2">
                {["light", "dark", "system"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-4 py-2 rounded-xl border font-bold capitalize transition-all ${
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

          {activeSection === "devices" && (
            <div className="space-y-4 max-w-lg text-xs">
              <h3 className="text-sm font-bold text-foreground">Connected Devices</h3>
              <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Laptop className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-bold text-foreground">Desktop Browser</p>
                    <p className="text-[10px] text-muted-foreground">Active Now • Windows</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                  CURRENT
                </span>
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div className="space-y-4 max-w-lg text-xs">
              <h3 className="text-sm font-bold text-foreground">Security & Activity</h3>
              <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                <p className="font-bold text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-500" /> OAuth & OTP Protected
                </p>
                <p className="text-[11px] text-muted-foreground">Your account is secured via standard OAuth session cookies.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
