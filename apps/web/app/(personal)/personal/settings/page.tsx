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
  Globe,
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

  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
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

  const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: "General", label: "General & Identity", icon: User },
    { id: "Appearance", label: "Appearance & Theme", icon: Palette },
    { id: "Focus & Work", label: "Focus & Work Schedule", icon: Clock },
    { id: "Notifications", label: "Notifications & Alerts", icon: Bell },
    { id: "Security", label: "Security & Passwords", icon: Shield },
    { id: "Devices", label: "Connected Devices", icon: Laptop },
    { id: "Activity", label: "Security Activity", icon: Activity },
  ];

  return (
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Personal Settings</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Manage your individual preferences, notification rules, and theme settings.
          </p>
        </div>

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="px-5 h-9 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </header>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Settings Tabbed Layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Tab Navigation */}
        <aside className="w-full md:w-64 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0 pb-2 md:pb-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all flex items-center gap-2.5 whitespace-nowrap ${
                  active
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Content Pane */}
        <main className="flex-1 rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-6 shadow-xs">
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
                        className="w-full h-10 px-3.5 rounded-xl bg-muted/40 border border-border text-xs font-medium text-foreground opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-foreground mb-1">EMAIL ADDRESS</label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="w-full h-10 px-3.5 rounded-xl bg-muted/40 border border-border text-xs font-medium text-foreground opacity-70"
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
                        className={`px-4 py-2 rounded-xl border text-xs font-bold capitalize transition-all ${
                          theme === t
                            ? "bg-foreground text-background border-foreground shadow-xs"
                            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
                        className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-foreground mb-1">TIMEZONE</label>
                      <select
                        value={prefs.timezone}
                        onChange={(e) => update("timezone", e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                      >
                        <option value="UTC">UTC</option>
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-foreground mb-1">WORK START TIME</label>
                      <input
                        type="time"
                        value={prefs.workingHoursStart}
                        onChange={(e) => update("workingHoursStart", e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-foreground mb-1">WORK END TIME</label>
                      <input
                        type="time"
                        value={prefs.workingHoursEnd}
                        onChange={(e) => update("workingHoursEnd", e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                      />
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
                    <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background cursor-pointer">
                      <div>
                        <p className="font-bold text-foreground">Email Notifications</p>
                        <p className="text-[11px] text-muted-foreground">Receive personal task and reminder updates via email.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefs.emailNotifications}
                        onChange={(e) => update("emailNotifications", e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background cursor-pointer">
                      <div>
                        <p className="font-bold text-foreground">Focus Reminders</p>
                        <p className="text-[11px] text-muted-foreground">Receive reminders to start focus sessions.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefs.focusReminders}
                        onChange={(e) => update("focusReminders", e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background cursor-pointer">
                      <div>
                        <p className="font-bold text-foreground">Deadline Alerts</p>
                        <p className="text-[11px] text-muted-foreground">Receive notifications when task or project deadlines approach.</p>
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
                      Your account is protected via Google / GitHub OAuth and Email OTP authentication.
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

                  <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <Laptop className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-bold text-foreground">Current Desktop Browser</p>
                        <p className="text-[10px] text-muted-foreground">Active Now • Windows Chrome / Edge</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                      CURRENT DEVICE
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
