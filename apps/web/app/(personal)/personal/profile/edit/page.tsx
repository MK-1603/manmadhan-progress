"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import apiClient from "@/lib/api-client";
import {
  User,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe,
  Clock,
  Camera,
  Shield,
} from "lucide-react";

const TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function PersonalProfileEditPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || "");
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [language, setLanguage] = useState(user?.language || "en");
  const [dateFormat, setDateFormat] = useState(user?.dateFormat || "MM/DD/YYYY");
  const [timeFormat, setTimeFormat] = useState(user?.timeFormat || "12h");
  const [avatar, setAvatar] = useState(user?.avatar || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setDisplayName(user.displayName || user.name || "");
      setTimezone(user.timezone || "UTC");
      setLanguage(user.language || "en");
      setDateFormat(user.dateFormat || "MM/DD/YYYY");
      setTimeFormat(user.timeFormat || "12h");
      setAvatar(user.avatar || "");
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiClient.put("/auth/me", {
        name: name.trim(),
        displayName: displayName.trim(),
        timezone,
        language,
        dateFormat,
        timeFormat,
        avatar,
      });

      if (res.data?.success) {
        setSuccess("Profile updated successfully!");
        if (refreshUser) await refreshUser();
        setTimeout(() => router.push("/personal/profile"), 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/personal/profile")}
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Edit Profile</h1>
            <p className="text-xs text-muted-foreground font-medium">
              Update your personal identity, display name, and localization settings.
            </p>
          </div>
        </div>
      </header>

      {/* Banners */}
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <section className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Personal Details
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">FULL NAME *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">DISPLAY NAME</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              />
            </div>
          </div>
        </section>

        {/* Localization & Timezone */}
        <section className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Localization & Timezone
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">TIMEZONE</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">LANGUAGE</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              >
                <option value="en">English (US)</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">DATE FORMAT</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">TIME FORMAT</label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              >
                <option value="12h">12-hour (09:00 AM)</option>
                <option value="24h">24-hour (21:00)</option>
              </select>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/personal/profile")}
            className="px-4 h-10 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-5 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving Changes..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
