"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  GitBranch, Chrome, Slack, Link as LinkIcon,
  CheckCircle2, XCircle, RefreshCw, ShieldCheck,
  ExternalLink, LoaderCircle, AlertCircle, Lock,
} from "lucide-react";
import apiClient from "@/lib/api-client";

const INTEGRATION_DEFS = [
  {
    provider: "GitHub",
    icon: <GitBranch className="w-5 h-5" />,
    title: "GitHub",
    description: "Connect your organization GitHub account to link repositories to projects and track PR evidence for tasks.",
    bg: "bg-slate-900 border-slate-700",
    iconColor: "text-white",
    docsUrl: "https://github.com",
  },
  {
    provider: "GoogleCalendar",
    icon: <Chrome className="w-5 h-5" />,
    title: "Google Calendar",
    description: "Sync organization project deadlines, milestones and focus sessions with Google Calendar.",
    bg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-500",
    docsUrl: null,
  },
];

export default function CEOIntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/personal/integrations");
      if (res.data?.success) setIntegrations(res.data.data || []);
      else setIntegrations([]);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setIntegrations([]);
      } else {
        setError("Failed to load integrations.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const getByProvider = (provider: string) =>
    integrations.find(i => i.provider === provider);

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[900px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            ManMadhan · CEO
          </p>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-gold" /> Integrations
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">
            Connect external services to the organization workspace.
          </p>
        </div>
        <button
          onClick={fetchIntegrations}
          className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors shrink-0"
          aria-label="Refresh integrations"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
          <button onClick={fetchIntegrations} className="ml-auto font-semibold text-foreground hover:text-gold transition-colors">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoaderCircle className="w-5 h-5 animate-spin text-gold" />
        </div>
      ) : (
        <>
          {/* Integration Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {INTEGRATION_DEFS.map(def => {
              const connected = getByProvider(def.provider);
              return (
                <div
                  key={def.provider}
                  className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${def.bg} ${def.iconColor}`}>
                      {def.icon}
                    </div>
                    {connected ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                        <XCircle className="w-3 h-3" /> Not connected
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">{def.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{def.description}</p>
                  </div>

                  {connected && (
                    <div className="p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground space-y-1 border border-border">
                      {connected.accountName && (
                        <div>Account: <span className="font-semibold text-foreground font-mono">{connected.accountName}</span></div>
                      )}
                      {connected.lastSyncAt && (
                        <div>Last sync: <span className="font-semibold text-foreground">{new Date(connected.lastSyncAt).toLocaleString()}</span></div>
                      )}
                      {connected.status && (
                        <div className="flex items-center gap-1 text-emerald-500 font-semibold">
                          <ShieldCheck className="w-3 h-3" /> {connected.status}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-auto">
                    {connected ? (
                      <button
                        onClick={fetchIntegrations}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Sync Now
                      </button>
                    ) : (
                      <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold/90 text-[#111827] text-xs font-bold transition-colors">
                        <LinkIcon className="w-3 h-3" /> Connect
                      </button>
                    )}
                    {def.docsUrl && (
                      <a
                        href={def.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notification channels info */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-[11px] font-bold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-gold" /> Notification Channels
            </h2>
            <div className="space-y-2">
              {[
                { label: "In-App Notifications", status: "Active",                   color: "text-emerald-500" },
                { label: "Email Notifications",  status: "Configured via Settings",  color: "text-blue-500" },
                { label: "Web Push",             status: "Requires browser permission", color: "text-amber-500" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-3 py-2.5 bg-muted/30 rounded-xl border border-border text-xs">
                  <span className="text-foreground">{row.label}</span>
                  <span className={`font-semibold ${row.color}`}>{row.status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
