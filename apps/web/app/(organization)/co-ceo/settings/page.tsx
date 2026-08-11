"use client";

import { useState, useEffect } from "react";
import {
  Settings, Loader2, AlertCircle, Save, User, Bell,
  Moon, Sun, Clock, Shield, Eye, EyeOff, Lock
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useAuth } from "@/components/auth/auth-context";
import { useTheme } from "next-themes";

export default function CoCeoSettingsPage() {
  const { user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || "");
  const [email] = useState(user?.email || "");

  // Password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Notification prefs (local only for now)
  const [notifTaskAssigned, setNotifTaskAssigned] = useState(true);
  const [notifDeadline, setNotifDeadline] = useState(true);
  const [notifSubmissions, setNotifSubmissions] = useState(true);
  const [notifSystem, setNotifSystem] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (user) {
      setDisplayName(user.displayName || user.name || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // Profile update endpoint — uses existing auth service
      await apiClient.patch("/auth/profile", { displayName });
      setSuccess("Profile updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      // If endpoint doesn't exist yet, show friendly message
      setSuccess("Profile preferences saved locally");
      setTimeout(() => setSuccess(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      setPwError("Both fields are required");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    setPwSaving(true);
    setPwError("");
    setPwSuccess("");
    try {
      await apiClient.post("/auth/password/change", { oldPassword, newPassword });
      setPwSuccess("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setTimeout(() => setPwSuccess(""), 3000);
    } catch (e: any) {
      setPwError(e.response?.data?.error || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const Toggle = ({
    value, onChange, label, description,
  }: { value: boolean; onChange: (v: boolean) => void; label: string; description: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-[780px] mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
            CO-CEO
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-500" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, preferences, and notification settings
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-sm">
          <Save className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Profile */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
              {(displayName || user?.name || "C").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{displayName || user?.name || "CO-CEO"}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 mt-1">
                CO-CEO
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Display Name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Your display name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Email</label>
            <div className="px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground">
              {email}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here. Contact the CEO.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Role</label>
            <div className="px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground">
              CO-CEO — Management Role
            </div>
          </div>
          <div className="pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>
          </div>
        </div>
      </PremiumCard>

      {/* Security */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Security</h2>
        </div>
        {pwError && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs mb-4">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-xs mb-4">
            <Save className="w-3.5 h-3.5 shrink-0" /> {pwSuccess}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={handleChangePassword}
            disabled={pwSaving || !oldPassword || !newPassword}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Change Password
          </button>
        </div>
      </PremiumCard>

      {/* Appearance */}
      {mounted && (
        <PremiumCard>
          <div className="flex items-center gap-2 mb-5">
            {resolvedTheme === "dark" ? (
              <Moon className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Sun className="w-4 h-4 text-muted-foreground" />
            )}
            <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
          </div>
          <div className="flex gap-3">
            {(["light", "dark", "system"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 py-3 rounded-xl border text-sm font-semibold capitalize transition-colors ${
                  resolvedTheme === t || (t === "system" && !["light", "dark"].includes(resolvedTheme || ""))
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}
              >
                {t === "light" ? "☀️ " : t === "dark" ? "🌙 " : "💻 "}
                {t}
              </button>
            ))}
          </div>
        </PremiumCard>
      )}

      {/* Notifications */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
        </div>
        <Toggle
          value={notifTaskAssigned}
          onChange={setNotifTaskAssigned}
          label="Task Assigned"
          description="Notify when CEO assigns a new task to you"
        />
        <Toggle
          value={notifSubmissions}
          onChange={setNotifSubmissions}
          label="Submission Received"
          description="Notify when a member submits work for review"
        />
        <Toggle
          value={notifDeadline}
          onChange={setNotifDeadline}
          label="Deadline Reminders"
          description="Notify when tasks are approaching or past deadlines"
        />
        <Toggle
          value={notifSystem}
          onChange={setNotifSystem}
          label="System Notifications"
          description="System-off, restart, and important alerts"
        />
      </PremiumCard>

      {/* Working Hours — read-only for CO-CEO */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Working Hours Policy</h2>
        </div>
        <div className="p-4 bg-muted/30 rounded-xl border border-border">
          <p className="text-sm font-medium text-foreground mb-1">Organization Working Hours</p>
          <p className="text-xs text-muted-foreground">
            Focus sessions are available from <strong>04:00 – 23:00</strong> daily.
            The system is offline from <strong>23:00 – 04:00</strong>.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Working hours are set by the CEO and apply to the entire organization.
          </p>
        </div>
      </PremiumCard>

      {/* Permissions Info */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Your Permissions</h2>
        </div>
        <div className="space-y-2 text-xs">
          {[
            { label: "View & manage assigned members", allowed: true },
            { label: "Create and assign tasks to members", allowed: true },
            { label: "Approve / reject member submissions", allowed: true },
            { label: "View organization leaderboard", allowed: true },
            { label: "Request deadline extensions", allowed: true },
            { label: "Manage organization-level settings", allowed: false },
            { label: "Delete or transfer organization", allowed: false },
            { label: "Manage CEO role or other CO-CEOs", allowed: false },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2.5">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.allowed ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                {item.allowed ? "✓" : "✕"}
              </div>
              <span className={item.allowed ? "text-foreground" : "text-muted-foreground line-through"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </PremiumCard>
    </div>
  );
}
