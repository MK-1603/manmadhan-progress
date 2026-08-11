"use client";

import { Link as LinkIcon, Github, Chrome, Slack, Trello, CheckCircle2, XCircle } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

const integrations = [
  { name: "Google Workspace", description: "Sync calendar, Drive, and Meet", icon: Chrome, status: "available", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { name: "GitHub", description: "Link repositories to projects and tasks", icon: Github, status: "available", color: "text-foreground bg-muted border-border" },
  { name: "Slack", description: "Receive notifications in Slack channels", icon: Slack, status: "coming_soon", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { name: "Trello", description: "Import boards as projects", icon: Trello, status: "coming_soon", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
];

export default function CEOIntegrationsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-[1000px] mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <LinkIcon className="w-6 h-6 text-primary" /> Integrations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Connect your organization with external tools</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {integrations.map(integration => (
          <PremiumCard key={integration.name} className="hover:border-border/80 transition-colors">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${integration.color}`}>
                <integration.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
                  {integration.status === "coming_soon" ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">Soon</span>
                  ) : (
                    <button className="text-xs font-semibold text-primary hover:underline">Connect</button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{integration.description}</p>
              </div>
            </div>
          </PremiumCard>
        ))}
      </div>

      <div className="p-4 bg-muted/30 border border-border rounded-xl">
        <p className="text-xs text-muted-foreground">
          More integrations are being developed. All integrations follow our security policy — no data is shared without explicit permission.
        </p>
      </div>
    </div>
  );
}
