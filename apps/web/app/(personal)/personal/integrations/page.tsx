"use client";

import { useEffect, useState } from "react";
import { Link2, Github, Calendar as CalendarIcon, Cloud, Rss, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api-client";

type Integration = {
  id: string;
  provider: string;
  status: string;
  lastSyncAt: string;
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  
  const providers = [
    { id: "GoogleCalendar", name: "Google Calendar", icon: CalendarIcon, color: "text-blue-500", bg: "bg-blue-500/10", desc: "Sync events and schedules." },
    { id: "GitHub", name: "GitHub", icon: Github, color: "text-foreground", bg: "bg-foreground/10", desc: "Track issues and PRs." },
    { id: "Cloudinary", name: "Cloudinary", icon: Cloud, color: "text-cyan-500", bg: "bg-cyan-500/10", desc: "File and media storage." },
    { id: "RSS", name: "RSS Feeds", icon: Rss, color: "text-orange-500", bg: "bg-orange-500/10", desc: "Podcasts and blogs." },
  ];

  const fetchIntegrations = async () => {
    try {
      const res = await apiClient.get(`/personal/integrations`);
      setIntegrations(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const connect = async (provider: string) => {
    try {
      if (provider === "RSS") {
        const feedUrl = window.prompt("Enter RSS Feed URL:");
        if (!feedUrl) return;
        await apiClient.post(`/personal/integrations/${provider}/connect`, { feedUrl });
        fetchIntegrations();
        return;
      }
      
      const res = await apiClient.post(`/personal/integrations/${provider}/connect`, {});
      if (res.data?.data?.authUrl) {
        window.location.href = res.data.data.authUrl;
      } else {
        fetchIntegrations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const disconnect = async (id: string) => {
    try {
      await apiClient.delete(`/personal/integrations/${id}`);
      fetchIntegrations();
    } catch (e) {
      console.error(e);
    }
  };

  const sync = async (id: string) => {
    setSyncingId(id);
    try {
      await apiClient.post(`/personal/integrations/${id}/sync`);
      await fetchIntegrations();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans flex flex-col">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
            <Link2 className="w-4 h-4" /> Connections
          </div>
          <h1 className="text-3xl font-bold">Integrations</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-10 w-full flex-1 space-y-6">
        
        {loading ? (
          <div className="flex justify-center p-10"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {providers.map(provider => {
              const connected = integrations.find(i => i.provider === provider.id);
              
              return (
                <div key={provider.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${provider.bg}`}>
                        <provider.icon className={`w-6 h-6 ${provider.color}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{provider.name}</h3>
                        {connected ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mt-0.5">
                            Not connected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-6 flex-1">{provider.desc}</p>
                  
                  {connected ? (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Last sync:</span>
                        <span className="font-medium">{new Date(connected.lastSyncAt).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => sync(connected.id)} 
                          disabled={syncingId === connected.id}
                          className="flex-1 py-2 bg-accent hover:bg-accent/80 text-foreground font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncingId === connected.id ? 'animate-spin' : ''}`} /> Sync Now
                        </button>
                        <button 
                          onClick={() => disconnect(connected.id)} 
                          className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold text-sm rounded-xl transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-border mt-auto">
                      <button 
                        onClick={() => connect(provider.id)} 
                        className="w-full py-2.5 bg-foreground text-background font-bold text-sm rounded-xl hover:bg-foreground/90 transition-colors"
                      >
                        Connect
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
