"use client";

import React, { useEffect, useState, useCallback } from "react";
import { GitBranch, Chrome, Link as LinkIcon, CheckCircle2, XCircle, ShieldCheck, Lock, LoaderCircle, RefreshCw } from "lucide-react";
import apiClient from "@/lib/api-client";

export default function MemberIntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await apiClient.get("/personal/integrations");
      if (res.data?.success) setIntegrations(res.data.data || []);
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const github = integrations.find(i => i.provider === "GitHub" || i.provider === "github");
  const google = integrations.find(i => i.provider === "Google" || i.provider === "GoogleCalendar");

  return (
    <div className="p-6 md:p-8 xl:p-10 max-w-4xl mx-auto w-full space-y-6 pb-20">
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-gold" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Integrations</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Organization integrations managed by executive leadership. Members have read-only visibility.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground flex items-center gap-3">
        <Lock className="w-4 h-4 text-gold shrink-0" />
        <span>Organization integrations are configured by CEO &amp; CO-CEO administrators only. Your personal integrations are in your Personal Workspace.</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoaderCircle className="w-5 h-5 animate-spin text-gold" />
        </div>
      ) : (
        <div className="space-y-4">
          {[
            {
              key: "github",
              icon: <GitBranch className="w-5 h-5" />,
              title: "Organization GitHub",
              description: "Repository connections for project milestones, tasks and PR evidence.",
              bg: "bg-slate-900 border-slate-700",
              iconColor: "text-white",
              data: github,
            },
            {
              key: "google",
              icon: <Chrome className="w-5 h-5" />,
              title: "Google Workspace",
              description: "Calendar sync and Drive metadata for organization events.",
              bg: "bg-blue-500/10 border-blue-500/20",
              iconColor: "text-blue-500",
              data: google,
            },
          ].map(item => (
            <div key={item.key} className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.bg} ${item.iconColor}`}>
                  {item.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                    {item.data ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Connected
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  {item.data?.accountName && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Account: <span className="font-mono font-semibold text-foreground">{item.data.accountName}</span>
                    </p>
                  )}
                </div>
              </div>
              {item.data ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
