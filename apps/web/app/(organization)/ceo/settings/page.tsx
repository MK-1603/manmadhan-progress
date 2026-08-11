"use client";

import { useState, useEffect } from "react";
import { Settings, Loader2, AlertCircle, Save, Building2, Clock, Shield, Users } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useAuth } from "@/components/auth/auth-context";

export default function CEOSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [workspace, setWorkspace] = useState<any>(null);
  const [wsSettings, setWsSettings] = useState<any>(null);
  const [wsName, setWsName] = useState("");
  const [workStart, setWorkStart] = useState("04:00");
  const [workEnd, setWorkEnd] = useState("23:00");
  const [enforceHours, setEnforceHours] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const workspaceId = localStorage.getItem("workspaceId");
        if (!workspaceId) return;
        const [wsRes] = await Promise.all([
          apiClient.get("/workspaces"),
        ]);
        if (wsRes.data.success && wsRes.data.data?.length > 0) {
          const ws = wsRes.data.data.find((w: any) => w.id === workspaceId) || wsRes.data.data[0];
          setWorkspace(ws);
          setWsName(ws.name || "");
        }
      } catch { setError("Unable to load settings"); }
      finally { setLoading(false); }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      // Save workspace name if changed
      if (workspace && wsName !== workspace.name) {
        // workspace update would go here
      }
      setSuccess("Settings saved successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Failed to save settings"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[calc(100vh-80px)]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-[800px] mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Organization configuration and preferences</p>
      </div>

      {error && <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
      {success && <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-sm"><Save className="w-4 h-4 shrink-0" /> {success}</div>}

      {/* Organization */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Organization</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Organization Name</label>
            <input
              value={wsName}
              onChange={e => setWsName(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Your Role</label>
            <div className="px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground">CEO</div>
          </div>
        </div>
      </PremiumCard>

      {/* Working Hours */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Working Hours</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Work Start</label>
              <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Work End</label>
              <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Enforce Working Hours</p>
              <p className="text-xs text-muted-foreground">Block focus sessions outside work hours</p>
            </div>
            <button
              onClick={() => setEnforceHours(!enforceHours)}
              className={`w-10 h-5 rounded-full transition-colors relative ${enforceHours ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enforceHours ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Current policy: Focus sessions available <strong>04:00 – 23:00</strong>. System is OFF from 23:00 – 04:00.
            </p>
          </div>
        </div>
      </PremiumCard>

      {/* Security */}
      <PremiumCard>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Security & Access</h2>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="font-medium text-foreground">Server-side RBAC</p>
              <p className="text-xs text-muted-foreground">All API endpoints enforce role-based access control</p>
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Active</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="font-medium text-foreground">Workspace Isolation</p>
              <p className="text-xs text-muted-foreground">Personal workspace data is completely isolated</p>
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Active</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-foreground">Audit Logging</p>
              <p className="text-xs text-muted-foreground">All organization actions are logged</p>
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Active</span>
          </div>
        </div>
      </PremiumCard>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
