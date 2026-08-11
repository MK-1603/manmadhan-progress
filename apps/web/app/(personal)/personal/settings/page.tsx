"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, Save, Check, User, Bell, Clock, Palette, Shield } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiClient.get("/personal/settings");
      if (res.data.success && res.data.data?.preferences) {
        setPrefs(prev => ({ ...prev, ...res.data.data.preferences }));
      }
    } catch {
      // No settings yet — use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await apiClient.patch("/personal/settings", { preferences: prefs });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const update = (key: string, val: any) => setPrefs(prev => ({ ...prev, [key]: val }));

  if (loading) return (
    <div className="w-full h-[100dvh] flex items-center justify-center">
      <LoaderCircle className="w-6 h-6 animate-spin text-[#D99A00]" />
    </div>
  );

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[800px] mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">Settings</h1>
        <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Configure your personal workspace preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <Section icon={<User className="w-4 h-4" />} title="Profile">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" value={user?.displayName || user?.name || ""} disabled />
            <Field label="Email" value={user?.email || ""} disabled />
          </div>
          <p className="text-xs text-[#A1A1AA] mt-2">Profile details are managed from your account.</p>
        </Section>

        {/* Appearance */}
        <Section icon={<Palette className="w-4 h-4" />} title="Appearance">
          <div>
            <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-2">Theme</label>
            <div className="flex gap-2">
              {["light", "dark", "system"].map(t => (
                <button key={t} onClick={() => setTheme(t)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium capitalize transition-colors ${theme === t ? "bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] border-[#171717] dark:border-[#F5F5F5]" : "border-[#E5E7EB] dark:border-[#242424] text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Focus */}
        <Section icon={<Clock className="w-4 h-4" />} title="Focus & Work">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-2">Daily Focus Goal (minutes)</label>
              <input type="number" min={30} max={720} step={30} value={prefs.dailyFocusGoalMinutes}
                onChange={e => update("dailyFocusGoalMinutes", parseInt(e.target.value) || 360)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:border-[#D99A00]/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-2">Timezone</label>
              <select value={prefs.timezone} onChange={e => update("timezone", e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none">
                {["UTC", "Asia/Kolkata", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney"].map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-2">Work Start</label>
              <input type="time" value={prefs.workingHoursStart} onChange={e => update("workingHoursStart", e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-2">Work End</label>
              <input type="time" value={prefs.workingHoursEnd} onChange={e => update("workingHoursEnd", e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none" />
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={<Bell className="w-4 h-4" />} title="Notifications">
          <div className="space-y-3">
            {[
              { key: "emailNotifications", label: "Email notifications" },
              { key: "pushNotifications", label: "Push notifications" },
              { key: "focusReminders", label: "Focus session reminders" },
              { key: "deadlineAlerts", label: "Deadline approaching alerts" },
            ].map(({ key, label }) => (
              <Toggle key={key} label={label} value={(prefs as any)[key]} onChange={v => update(key, v)} />
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={saveSettings} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-green-400" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-5">
      <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] flex items-center gap-2 mb-4 uppercase tracking-wider">
        <span className="text-[#D99A00]">{icon}</span>{title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, value, disabled }: { label: string; value: string; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1.5">{label}</label>
      <input type="text" value={value} disabled={disabled} readOnly={disabled}
        className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none disabled:opacity-60" />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#171717] dark:text-[#F5F5F5]">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-[#16A34A]" : "bg-[#E5E7EB] dark:bg-[#242424]"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
