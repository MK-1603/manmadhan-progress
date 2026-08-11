"use client";

// Shared shell for simple org pages that reuse personal workspace components
// Documents, Notes, Integrations, Settings all follow the same pattern

import { FileText, Notebook, Link as LinkIcon, Settings, Bell, Loader2 } from "lucide-react";

interface OrgPageShellProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export function OrgPageShell({ title, subtitle, icon, children }: OrgPageShellProps) {
  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          {icon} {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
