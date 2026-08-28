"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Download, CheckCircle2, AlertCircle, ArrowLeft, Sparkles, ShieldCheck, Zap, Bug, ChevronDown, ChevronUp } from "lucide-react";
import { usePWA } from "@/components/providers/pwa-provider";
import { useAuth } from "@/components/auth/auth-context";
import { AppShell } from "@/components/layout/app-shell";

export default function UpdatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    currentVersion,
    latestVersion,
    releaseDate,
    releaseData,
    updateStatus,
    checkForUpdates,
    updateNow,
    isCheckingUpdate,
    updateError,
  } = usePWA();

  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({
    [currentVersion]: true, // Latest version expanded by default
  });

  const toggleExpand = (ver: string) => {
    setExpandedVersions((prev) => ({ ...prev, [ver]: !prev[ver] }));
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      const r = (user?.role || "").toUpperCase();
      const fallback = r.includes("CO") ? "/co-ceo/projects" : r.includes("MEMBER") ? "/member/projects" : "/ceo/projects";
      router.push(fallback);
    }
  };

  const getStatusBadge = () => {
    switch (updateStatus) {
      case "UP_TO_DATE":
        return {
          label: "✓ Up to date",
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
          desc: "You're running the latest version.",
        };
      case "UPDATE_AVAILABLE":
      case "READY":
        return {
          label: "New version available",
          bg: "bg-amber-500/15 border-amber-500/30 text-amber-400 font-bold",
          desc: "A newer version is ready to apply.",
        };
      case "DOWNLOADING":
        return {
          label: "Downloading update...",
          bg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
          desc: "Fetching latest production assets...",
        };
      case "UPDATING":
        return {
          label: "Applying update...",
          bg: "bg-purple-500/10 border-purple-500/20 text-purple-400",
          desc: "Activating Service Worker...",
        };
      case "OFFLINE":
        return {
          label: "Offline",
          bg: "bg-slate-500/10 border-slate-500/20 text-slate-400",
          desc: "You're offline. We'll check again when connected.",
        };
      case "ERROR":
        return {
          label: "Update check failed",
          bg: "bg-rose-500/10 border-rose-500/20 text-rose-500",
          desc: updateError || "Unable to check for updates.",
        };
      default:
        return {
          label: "✓ Up to date",
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
          desc: "You're running the latest version.",
        };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <AppShell>
      <div className="p-4 sm:p-6 md:p-8 max-w-[1100px] mx-auto w-full space-y-5 text-xs">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                Updates
              </h1>
              <p className="text-xs text-muted-foreground">
                Application updates, release notes, and system status.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => checkForUpdates()}
            disabled={isCheckingUpdate || updateStatus === "UPDATING"}
            className="px-3.5 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? "animate-spin text-[#C9A52A]" : ""}`} />
            <span>{isCheckingUpdate ? "Checking..." : "Check for updates"}</span>
          </button>
        </div>

        {/* Compact Version Status Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
              Current version
            </span>
            <div className="text-base font-extrabold font-mono text-[#C9A52A]">
              v{currentVersion}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
              Latest version
            </span>
            <div className="text-base font-extrabold font-mono text-foreground">
              v{latestVersion}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
              Status
            </span>
            <div>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${statusInfo.bg}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Current Application Status Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-foreground">ManMadhan Progress</h2>
              <span className="px-2 py-0.5 rounded-md bg-[#C9A52A]/10 text-[#C9A52A] text-[10px] font-extrabold border border-[#C9A52A]/20">
                Production
              </span>
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              v{currentVersion} · Updated {releaseDate}
            </p>
            <p className="text-[11.5px] text-muted-foreground font-medium">{statusInfo.desc}</p>
          </div>

          {(updateStatus === "READY" || updateStatus === "UPDATE_AVAILABLE") && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => updateNow()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Update now</span>
              </button>
            </div>
          )}
        </div>

        {/* What's New Release Notes */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C9A52A]" />
            <span>What's New</span>
          </h2>

          <div className="space-y-3">
            {releaseData.map((rel) => {
              const isExpanded = !!expandedVersions[rel.version];

              return (
                <div key={rel.version} className="rounded-2xl bg-card border border-border overflow-hidden">
                  <div
                    onClick={() => toggleExpand(rel.version)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-[#C9A52A] font-mono">v{rel.version}</span>
                      <span className="text-xs text-muted-foreground">· {rel.releaseDate}</span>
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                        {rel.environment}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-border/60 space-y-3">
                      <p className="text-xs text-foreground font-medium">{rel.summary}</p>

                      {rel.highlights?.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#C9A52A]" />
                            <span>Improvements</span>
                          </span>
                          <ul className="space-y-1 text-xs text-muted-foreground pl-4 list-disc">
                            {rel.highlights.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rel.bugFixes?.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                            <Bug className="w-3.5 h-3.5 text-amber-500" />
                            <span>Bug fixes</span>
                          </span>
                          <ul className="space-y-1 text-xs text-muted-foreground pl-4 list-disc">
                            {rel.bugFixes.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rel.performanceImprovements?.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-blue-400" />
                            <span>Performance</span>
                          </span>
                          <ul className="space-y-1 text-xs text-muted-foreground pl-4 list-disc">
                            {rel.performanceImprovements.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
