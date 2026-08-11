"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, GitBranch, Calendar, Mail, Bell, ExternalLink, CheckCircle2, XCircle, RefreshCw, Link as LinkIcon } from "lucide-react";

interface Integration {
  id: string;
  provider: string;
  integrationType: string;
  accountName: string;
  status: string;
  lastSyncAt: string | null;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/personal/integrations");
      if (res.data.success) setIntegrations(res.data.data || []);
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

  const getIntegrationByProvider = (provider: string) =>
    integrations.find(i => i.provider === provider);

  const INTEGRATION_CARDS = [
    {
      provider: "GitHub",
      icon: <GitBranch className="w-6 h-6" />,
      title: "GitHub",
      description: "Connect your GitHub account to link repositories to projects and track PR evidence for tasks.",
      color: "text-gray-700 dark:text-gray-300",
      bg: "bg-gray-50 dark:bg-gray-900/20",
      border: "border-gray-200 dark:border-gray-700",
      docsUrl: "https://github.com",
    },
    {
      provider: "GoogleCalendar",
      icon: <Calendar className="w-6 h-6 text-blue-500" />,
      title: "Google Calendar",
      description: "Sync your personal workspace deadlines, milestones and focus sessions with Google Calendar.",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/10",
      border: "border-blue-100 dark:border-blue-800",
      docsUrl: null,
    },
  ];

  if (loading) return (
    <div className="w-full h-[100dvh] flex items-center justify-center">
      <LoaderCircle className="w-6 h-6 animate-spin text-[#D99A00]" />
    </div>
  );

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[900px] mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">Integrations</h1>
        <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Connect external services to your personal workspace. Only real connection states are shown.</p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchIntegrations} className="underline font-medium">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {INTEGRATION_CARDS.map(card => {
          const connected = getIntegrationByProvider(card.provider);
          return (
            <div key={card.provider} className={`border rounded-2xl p-5 ${card.border} bg-white dark:bg-[#111111]`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg}`}>
                  <span className={card.color}>{card.icon}</span>
                </div>
                {connected ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#A1A1AA] bg-[#F4F4F5] dark:bg-[#1D1D1D] px-2.5 py-1 rounded-full">
                    <XCircle className="w-3.5 h-3.5" /> Not connected
                  </span>
                )}
              </div>

              <h3 className="font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">{card.title}</h3>
              <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] mb-4">{card.description}</p>

              {connected && (
                <div className="mb-4 p-3 bg-[#F4F4F5] dark:bg-[#1D1D1D] rounded-xl text-xs text-[#52525B] dark:text-[#A1A1AA] space-y-1">
                  {connected.accountName && <div>Account: <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{connected.accountName}</span></div>}
                  {connected.lastSyncAt && <div>Last sync: <span className="font-semibold">{new Date(connected.lastSyncAt).toLocaleString()}</span></div>}
                </div>
              )}

              <div className="flex items-center gap-2">
                {connected ? (
                  <>
                    <button onClick={fetchIntegrations} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-sm text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" /> Sync
                    </button>
                  </>
                ) : (
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-semibold hover:opacity-90 transition-opacity">
                    <LinkIcon className="w-3.5 h-3.5" /> Connect
                  </button>
                )}
                {card.docsUrl && (
                  <a href={card.docsUrl} target="_blank" rel="noreferrer" className="p-2 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-[#A1A1AA] hover:text-[#52525B] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* System Info */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-5">
        <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#D99A00]" /> Notification Channels
        </h2>
        <div className="space-y-3">
          {[
            { icon: <Bell className="w-4 h-4" />, label: "In-App Notifications", status: "Active", color: "text-green-500" },
            { icon: <Mail className="w-4 h-4" />, label: "Email Notifications", status: "Configured via Settings", color: "text-blue-500" },
            { icon: <Bell className="w-4 h-4" />, label: "Web Push", status: "Requires browser permission", color: "text-amber-500" },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between p-3 bg-[#F4F4F5] dark:bg-[#1D1D1D] rounded-xl">
              <div className="flex items-center gap-2 text-sm text-[#171717] dark:text-[#F5F5F5]">
                <span className="text-[#A1A1AA]">{row.icon}</span>
                {row.label}
              </div>
              <span className={`text-xs font-medium ${row.color}`}>{row.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
