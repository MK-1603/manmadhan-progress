"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import {
  Save,
  Check,
  User,
  Bell,
  Clock,
  Palette,
  Shield,
  Laptop,
  Activity,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useTheme } from "next-themes";

type SettingsTab =
  | "General"
  | "Appearance"
  | "Focus & Work"
  | "Notifications"
  | "Security"
  | "Devices"
  | "Activity";

export default function PersonalSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab | null>("General");
  const [mobileSubPageOpen, setMobileSubPageOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState({
    dailyFocusGoalMinutes: 360,
    timezone: "UTC",
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
    emailNotifications: true,
    pushNotifications: true,
    focusReminders: true,
    deadlineAlerts: true,
    language: "en",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/personal/settings");
      if (res.data?.success && res.data.data?.preferences) {
        setPrefs((prev) => ({ ...prev, ...res.data.data.preferences }));
      }
    } catch {
      // Default preferences
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiClient.patch("/personal/settings", { preferences: prefs });
      if (res.data?.success) {
        setSaved(true);
        if (refreshUser) await refreshUser();
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, val: any) =>
    setPrefs((prev) => ({ ...prev, [key]: val }));

  const TABS: { id: SettingsTab; label: string; description: string; icon: React.ElementType }[] = [
    { id: "General", label: "General & Identity", description: "Display name and email details.", icon: User },
    { id: "Appearance", label: "Appearance & Theme", description: "Light, dark, and system color mode.", icon: Palette },
    { id: "Focus & Work", label: "Focus & Work Schedule", description: "Daily targets and work hours.", icon: Clock },
    { id: "Notifications", label: "Notifications & Alerts", description: "Task and reminder alert channels.", icon: Bell },
    { id: "Security", label: "Security & Passwords", description: "Authentication method & protection.", icon: Shield },
    { id: "Devices", label: "Connected Devices", description: "Active session management.", icon: Laptop },
    { id: "Activity", label: "Security Activity", description: "Login audit log timeline.", icon: Activity },
  ];

  const handleMobileTabSelect = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    setMobileSubPageOpen(true);
  };

  return (
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Personal Settings</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Configure your personal workspace preferences and notification rules.
          </p>
        </div>

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="px-5 h-9 rounded-lg bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </header>

      {error && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Settings Desktop Layout / Mobile Index View */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Tab Navigation (Desktop) / Mobile Full-Width Row Index */}
        <aside className="w-full md:w-64 space-y-2 md:space-y-1 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileSubPageOpen(true);
                }}
                className={`w-full p-3.5 md:px-3.5 md:py-2.5 rounded-xl md:rounded-lg text-xs font-bold text-left transition-colors flex items-center justify-between group cursor-pointer min-h-[48px] ${
                  active
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-card border border-border md:bg-transparent md:border-none text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{tab.label}</p>
                    <p className="text-[10px] opacity-75 truncate md:hidden">{tab.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 md:hidden text-muted-foreground" />
              </button>
            );
          })}
        </aside>

        {/* Right Content Pane (Desktop) / Dedicated Mobile Full-Screen Sub-Page */}
        <main
          className={`flex-1 rounded-xl border border-border bg-card p-5 sm:p-6 space-y-6 shadow-xs ${
            mobileSubPageOpen
              ? "fixed inset-0 z-50 bg-background p-4 overflow-y-auto md:relative md:inset-auto md:bg-card md:p-6"
              : "hidden md:block"
          }`}
        >
          {/* Mobile Back Header */}
          {mobileSubPageOpen && (
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-md pb-4 border-b border-border flex items-center justify-between md:hidden">
              <button
                onClick={() => setMobileSubPageOpen(false)}
                className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-gold transition-colors min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Settings</span>
              </button>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-4 h-9 rounded-lg bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Saving..." : saved ? "Saved!" : "Save"}
              </button>
            </header>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground font-medium">
              Loading settings...
            </div>
          ) : (
            <>
              {/* General Tab */}
              {activeTab === "General" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">General & Identity</h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      Your personal display name and email address.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-foreground mb-1">FULL DISPLAY NAME</label>
                      <input
                        type="text"
                        value={user?.displayName || user?.name || ""}
                        disabled
                        className="w-full h-11 px-3.5 rounded-lg bg-muted/40 border border-border text-xs font-medium text-foreground opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-foreground mb-1">EMAIL ADDRESS</label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="w-full h-11 px-3.5 rounded-lg bg-muted/40 border border-border text-xs font-medium text-foreground opacity-70"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === "Appearance" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Appearance & Theme</h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      Customize the theme mode across all personal workspace pages.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {["light", "dark", "system"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`flex-1 h-11 rounded-lg border text-xs font-bold capitalize transition-colors cursor-pointer ${
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

              {/* Focus & Work Tab */}
              {activeTab === "Focus & Work" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Focus & Work Schedule</h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      Configure your daily focus targets and preferred working hours.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-foreground mb-1">DAILY FOCUS TARGET (MINUTES)</label>
                      <input
                        type="number"
                        min={30}
                        max={720}
                        step={30}
                        value={prefs.dailyFocusGoalMinutes}
                        onChange={(e) => update("dailyFocusGoalMinutes", parseInt(e.target.value) || 360)}
                        className="w-full h-11 px-3.5 rounded-lg bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-foreground mb-1">TIMEZONE</label>
                      <select
                        value={prefs.timezone}
                        onChange={(e) => update("timezone", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-lg bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
                      >
                        <option value="UTC">UTC</option>
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "Notifications" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Notifications & Alerts</h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      Control personal notification preferences and alert channels.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-background cursor-pointer min-h-[48px]">
                      <div>
                        <p className="font-bold text-foreground">Email Notifications</p>
                        <p className="text-[11px] text-muted-foreground">Receive personal task updates via email.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefs.emailNotifications}
                        onChange={(e) => update("emailNotifications", e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-background cursor-pointer min-h-[48px]">
                      <div>
                        <p className="font-bold text-foreground">Deadline Alerts</p>
                        <p className="text-[11px] text-muted-foreground">Receive notifications when deadlines approach.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefs.deadlineAlerts}
                        onChange={(e) => update("deadlineAlerts", e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "Security" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Security & Password</h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      Personal authentication method and password management.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <Lock className="w-4 h-4 text-emerald-500" />
                      OAuth Authentication Active
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Your account is protected via OAuth session cookie authentication.
                    </p>
                  </div>
                </div>
              )}

              {/* Devices Tab */}
              {activeTab === "Devices" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Connected Devices</h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      Active sessions on your personal devices.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between text-xs min-h-[48px]">
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

              {/* Activity Tab */}
              {activeTab === "Activity" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Security Activity</h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      Recent security events and authentication attempts.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-background text-xs space-y-1">
                    <p className="font-bold text-foreground">Login Verified</p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Authenticated via Session Cookie • Today at {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
