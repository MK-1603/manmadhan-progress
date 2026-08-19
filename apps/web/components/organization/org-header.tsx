"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";

export interface OrganizationHeaderProps {
  category?: string;
  title?: string;
  description?: string;
  status?: "live" | "updating" | "offline";
  onRefresh?: () => void;
  isRefreshing?: boolean;
  actions?: React.ReactNode;
}

export function OrganizationHeader({
  category,
  title = "Overview",
  description = "Executive statistics & recent activity",
  status = "live",
  onRefresh,
  isRefreshing = false,
  actions,
}: OrganizationHeaderProps) {
  const { isConnected } = useSocket();
  const isLive = status === "live" && isConnected;
  const categoryText = (category || title).toUpperCase();

  return (
    <div className="w-full pb-3 border-b border-border/40 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        {/* Left Side: Category Label, Title & Subline */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-mono font-bold text-gold/80 uppercase tracking-widest mb-1">
            {categoryText}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate font-medium">
              {description}
            </p>
          )}
        </div>

        {/* Right Side: Operational Badge, Refresh & Contextual Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          {/* Operational Status Indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
              isLive
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span>{isLive ? "ACTIVE / OPERATIONAL" : "UPDATING"}</span>
          </div>

          {/* Refresh Action */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-card border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-gold" : ""}`} />
            </button>
          )}

          {/* Page Specific Actions Slot */}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
