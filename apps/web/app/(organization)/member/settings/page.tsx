"use client";

import { useState, useEffect } from "react";
import {
  Settings, Loader2, AlertCircle, Save, User,
  Bell, Moon, Sun, Lock, Shield, Clock, Eye, EyeOff
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useAuth } from "@/components/auth/auth-context";
import { useTheme } from "next-themes";

export default function MemberSettingsPage() {
  const { user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState("");
  const [error, setError]       = useState("");

  /* Profile */
  const [displayName, setDisplayName] = useState("");
  const [organization, setOrganization] = useState<any>(null);

  /* Password */
  const [oldPw, setOldPw]     = useState("");
  const [newPw, setNewPw]     = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError]   = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  /* Notification prefs */
  const [notifAssigned,   setNotifAssigned]   = useState(true);
  const [notifDeadline,   setNotifDeadline]   = useState(true);
  const [notifReview,     setNotifReview]     = useState(true);
  const [notifApproval,   setNotifApproval]   = useState(true);
  const [notifSystem,     setNotifSystem]     = useState(true);

  useEffect(() => {
    setMounted(true);
    if (user) setDisplayName(user.displayName || user.name || "");
    apiClient.get("/organization/profile").then(r => {
      if (r.data.success) setOrganization(r.data.data);
    }).catch(() => {});
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      await apiClient.patch("/auth/profile", { displayName }).catch(() => {});
      setSuccess("Profile saved");
      setTimeout(() => setSuccess(""), 3000);
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!oldPw || !newPw) { setPwError("Both fields required"); return; }
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    setPwSaving(true); setPwError(""); setPwSuccess("");
    try {
      await apiClient.post("/auth/password/change", { oldPassword: oldPw, newPassword: newPw });
      setPwSuccess("Password changed successfully");
      setOldPw(""); setNewPw("");
      setTimeout(() => setPwSuccess(""), 4000);
    } catch (e: any) { setPwError(e.response?.data?.error || "Failed to change password"); }
    finally { setPwSaving(false); }
  };

  const Toggle = ({ value, onChange, label, description }: { value: boolean; onChange: (v: boolean) => void; label: string; description: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="pr-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button onClick={() => onChange(!value)} className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${value ? "bg-emerald-500" : "bg-muted"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-[780px] mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">MEMBER</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-500" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Account preferences and personal settings</p>
      </div>

      {error   && <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-sm"><Save className="w-4 h-4 shrink-0" />{success}</div>}

      {/* Profile */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
              {(displayName || user?.name || "M").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{displayName || user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">MEMBER</span>
                {organization && <span className="text-[10px] text-muted-foreground">{organization.name}</span>}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Email</label>
            <div className="px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground">{user?.email}</div>
            <p className="text-xs text-muted-foreground mt-1">Contact your CO-CEO or CEO to change your email.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Organisation</label>
            <div className="px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground">{organization?.name || "—"}</div>
          </div>
          <button
            onClick={handleSaveProfile} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
          </button>
        </div>
      </PremiumCard>

      {/* Security */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Security</h2>
        </div>
        {pwError   && <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs mb-4"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{pwError}</div>}
        {pwSuccess && <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-xs mb-4"><Save className="w-3.5 h-3.5 shrink-0" />{pwSuccess}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Current Password</label>
            <div className="relative">
              <input type={showOld ? "text" : "password"} value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="Current password" className="w-full px-3 py-2.5 pr-10 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">New Password</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Minimum 8 characters" className="w-full px-3 py-2.5 pr-10 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={handleChangePassword} disabled={pwSaving || !oldPw || !newPw}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Change Password
          </button>
        </div>
      </PremiumCard>

      {/* Appearance */}
      {mounted && (
        <PremiumCard>
          <div className="flex items-center gap-2 mb-5">
            {resolvedTheme === "dark" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
            <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
          </div>
          <div className="flex gap-3">
            {(["light","dark","system"] as const).map(t => (
              <button key={t} onClick={() => setTheme(t)}
                className={`flex-1 py-3 rounded-xl border text-sm font-semibold capitalize transition-colors ${
                  resolvedTheme === t || (t === "system" && !["light","dark"].includes(resolvedTheme || ""))
                    ? "border-emerald-500 bg-emerald-500/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}>
                {t === "light" ? "☀️ " : t === "dark" ? "🌙 " : "💻 "}{t}
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
        <Toggle value={notifAssigned}  onChange={setNotifAssigned}  label="Task Assigned"          description="Notify when a new task is assigned to you" />
        <Toggle value={notifDeadline}  onChange={setNotifDeadline}  label="Deadline Reminders"     description="Notify when deadlines are approaching or missed" />
        <Toggle value={notifReview}    onChange={setNotifReview}    label="Submission Updates"     description="Notify when your submission is reviewed or returned" />
        <Toggle value={notifApproval}  onChange={setNotifApproval}  label="Approvals"              description="Notify when your work is approved or score changes" />
        <Toggle value={notifSystem}    onChange={setNotifSystem}    label="System Notifications"   description="System-off, restart, and organisation-wide alerts" />
      </PremiumCard>

      {/* Working hours info */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Working Hours</h2>
        </div>
        <div className="p-4 bg-muted/30 rounded-xl border border-border">
          <p className="text-sm font-medium text-foreground mb-1">Organisation Working Hours</p>
          <p className="text-xs text-muted-foreground">
            Focus sessions are available from <strong>04:00 – 23:00</strong> daily.
            The system is offline from <strong>23:00 – 04:00</strong>. Working hours are set by the CEO.
          </p>
        </div>
      </PremiumCard>

      {/* Permissions info */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Your Permissions</h2>
        </div>
        <div className="space-y-2 text-xs">
          {[
            { label: "View and work on assigned tasks",           allowed: true },
            { label: "Submit work for review",                    allowed: true },
            { label: "Request deadline extensions",               allowed: true },
            { label: "Request leave",                             allowed: true },
            { label: "View personal progress and reports",        allowed: true },
            { label: "View organisation leaderboard",             allowed: true },
            { label: "Assign tasks to others",                    allowed: false },
            { label: "Manage members or roles",                   allowed: false },
            { label: "Access organisation administration",        allowed: false },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2.5">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${item.allowed ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
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
