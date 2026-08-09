"use client";

import { useEffect, useState } from "react";
import { PremiumCard } from "@/components/ui/premium-card";
import { Building2, Users, ShieldAlert, Activity, Mail } from "lucide-react";
import apiClient from "@/lib/api-client";

export default function OrganizationDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We would typically get the workspaceId from a context or auth token
    // For now we'll rely on the backend getting it from the auth token or hardcode
    const fetchStats = async () => {
      try {
        const workspaceId = localStorage.getItem("workspaceId") || "default";
        const res = await apiClient.get(`/organization/stats?workspaceId=${workspaceId}`);
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load organization stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <Activity className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Organization Center</h1>
          <p className="text-muted-foreground mt-1">Manage your enterprise structure, members, and settings.</p>
        </div>
      </div>

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PremiumCard className="p-6 layer-2">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-muted-foreground">Total Members</h3>
            <div className="p-2 bg-layer-3 rounded-lg border border-border">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-4xl font-bold text-foreground mt-4">{stats?.totalMembers || 0}</p>
        </PremiumCard>

        <PremiumCard className="p-6 layer-2">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-muted-foreground">CO-CEOs</h3>
            <div className="p-2 bg-layer-3 rounded-lg border border-border">
              <ShieldAlert className="w-5 h-5 text-gold" />
            </div>
          </div>
          <p className="text-4xl font-bold text-foreground mt-4">{stats?.totalCoCeos || 0}</p>
        </PremiumCard>

        <PremiumCard className="p-6 layer-2">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-muted-foreground">Pending Invitations</h3>
            <div className="p-2 bg-layer-3 rounded-lg border border-border">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <p className="text-4xl font-bold text-foreground mt-4">{stats?.pendingInvitations || 0}</p>
        </PremiumCard>

        <PremiumCard className="p-6 layer-2">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-muted-foreground">Org Health</h3>
            <div className="p-2 bg-layer-3 rounded-lg border border-border">
              <Activity className="w-5 h-5 text-rose-400" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-4xl font-bold text-foreground">{stats?.organizationHealth || 100}%</p>
            <span className="text-xs text-green-400 font-medium">Optimal</span>
          </div>
        </PremiumCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PremiumCard className="p-6 h-full layer-2 min-h-[400px]">
            <h3 className="card-title mb-6">Recent Activity</h3>
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm border border-dashed border-border rounded-xl bg-layer-1">
              Audit log integration pending...
            </div>
          </PremiumCard>
        </div>
        <div>
          <PremiumCard className="p-6 h-full layer-2 min-h-[400px]">
            <h3 className="card-title mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full p-4 rounded-xl border border-border bg-layer-1 hover:bg-layer-3 hover:border-gold/50 transition-all text-left flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Invite New Member</span>
              </button>
              <button className="w-full p-4 rounded-xl border border-border bg-layer-1 hover:bg-layer-3 hover:border-gold/50 transition-all text-left flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Assign CO-CEO</span>
              </button>
              <button className="w-full p-4 rounded-xl border border-border bg-layer-1 hover:bg-layer-3 hover:border-gold/50 transition-all text-left flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Create Department</span>
              </button>
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
