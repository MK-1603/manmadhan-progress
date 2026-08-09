"use client";

import { useEffect, useState } from "react";
import { Settings, User, Bell, Shield, Lock, Activity, Save } from "lucide-react";
import apiClient from "@/lib/api-client";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<any>({
    theme: "system",
    density: "comfortable",
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    defaultFocusDuration: 50,
    dailyReadingTarget: 20,
    notificationsEnabled: true,
    vaultTimeoutMinutes: 15,
    assistantEnabled: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get(`/personal/settings`);
      if (res.data.data?.preferences) {
        setPreferences(res.data.data.preferences);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put(`/personal/settings`, { preferences });
      // Show success toast in real app
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const updatePref = (key: string, value: any) => {
    setPreferences((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans flex flex-col">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              <Settings className="w-4 h-4" /> Control Center
            </div>
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <button 
            onClick={handleSave} 
            disabled={loading || saving}
            className="px-5 py-2.5 bg-foreground text-background font-bold text-sm rounded-xl hover:bg-foreground/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-10 w-full flex-1">
        
        {loading ? (
          <div className="flex justify-center py-20"><Settings className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-12">
            
            {/* Preferences */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><User className="w-5 h-5 text-primary" /> Profile & Appearance</h2>
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Theme</label>
                    <select value={preferences.theme} onChange={e => updatePref("theme", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary">
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Interface Density</label>
                    <select value={preferences.density} onChange={e => updatePref("density", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary">
                      <option value="compact">Compact</option>
                      <option value="comfortable">Comfortable</option>
                      <option value="spacious">Spacious</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Productivity */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><Activity className="w-5 h-5 text-primary" /> Productivity & Habits</h2>
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Working Hours Start</label>
                    <input type="time" value={preferences.workingHoursStart} onChange={e => updatePref("workingHoursStart", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Working Hours End</label>
                    <input type="time" value={preferences.workingHoursEnd} onChange={e => updatePref("workingHoursEnd", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Default Focus Duration (mins)</label>
                    <input type="number" value={preferences.defaultFocusDuration} onChange={e => updatePref("defaultFocusDuration", parseInt(e.target.value))} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Daily Reading Target (pages)</label>
                    <input type="number" value={preferences.dailyReadingTarget} onChange={e => updatePref("dailyReadingTarget", parseInt(e.target.value))} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              </div>
            </section>

            {/* Security & Vault */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><Shield className="w-5 h-5 text-primary" /> Privacy & Vault</h2>
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground" /> Vault Session Timeout (mins)</label>
                    <input type="number" value={preferences.vaultTimeoutMinutes} onChange={e => updatePref("vaultTimeoutMinutes", parseInt(e.target.value))} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary" />
                    <p className="text-xs text-muted-foreground mt-2">Vault locks automatically after this duration.</p>
                  </div>
                </div>
              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}
