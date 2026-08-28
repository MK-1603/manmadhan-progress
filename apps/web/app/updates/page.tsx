"use client";

import React from "react";
import Link from "next/link";
import { RefreshCw, Download, CheckCircle2, AlertCircle, ArrowLeft, Sparkles, ShieldCheck, Zap, Bug } from "lucide-react";
import { usePWA } from "@/components/providers/pwa-provider";

export default function UpdatesPage() {
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

  const getStatusBadge = () => {
    switch (updateStatus) {
      case "UP_TO_DATE":
        return {
          label: "Up to date",
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
          desc: "You're running the latest version.",
        };
      case "UPDATE_AVAILABLE":
      case "READY":
        return {
          label: "New update available",
          bg: "bg-amber-500/15 border-amber-500/30 text-amber-400 font-bold",
          desc: "A newer version is ready to apply.",
        };
      case "DOWNLOADING":
        return {
          label: "Downloading update...",
          bg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
          desc: "Fetching latest production assets.",
        };
      case "UPDATING":
        return {
          label: "Applying update...",
          bg: "bg-purple-500/10 border-purple-500/20 text-purple-400",
          desc: "Activating new Service Worker shell...",
        };
      case "OFFLINE":
        return {
          label: "Offline",
          bg: "bg-slate-500/10 border-slate-500/20 text-slate-400",
          desc: "You're offline. We'll check again when connected.",
        };
      case "ERROR":
        return {
          label: "Error checking updates",
          bg: "bg-rose-500/10 border-rose-500/20 text-rose-500",
          desc: updateError || "Unable to check for updates.",
        };
      default:
        return {
          label: "Up to date",
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
          desc: "You're running the latest version.",
        };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <div className="min-h-screen w-full bg-[#0B0E12] text-foreground font-sans p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Updates
            </h1>
            <p className="text-xs text-muted-foreground">
              Application release information & PWA update status
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => checkForUpdates()}
          disabled={isCheckingUpdate || updateStatus === "UPDATING"}
          className="px-3.5 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? "animate-spin text-[#C9A52A]" : ""}`} />
          <span>{isCheckingUpdate ? "Checking..." : "Check for updates"}</span>
        </button>
      </header>

      {/* Version Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            Current Version
          </span>
          <div className="text-lg font-extrabold font-mono text-[#C9A52A]">
            v{currentVersion}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            Latest Version
          </span>
          <div className="text-lg font-extrabold font-mono text-foreground">
            v{latestVersion}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
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

      {/* Main Version Banner & Primary Action */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-foreground">ManMadhan Progress</h2>
              <span className="px-2 py-0.5 rounded-md bg-[#C9A52A]/10 text-[#C9A52A] text-[10px] font-extrabold border border-[#C9A52A]/20">
                Production
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Version {currentVersion} · Updated {releaseDate}
            </p>
            <p className="text-xs text-muted-foreground/80">{statusInfo.desc}</p>
          </div>

          {(updateStatus === "READY" || updateStatus === "UPDATE_AVAILABLE") && (
            <button
              type="button"
              onClick={() => updateNow()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs shadow-sm hover:brightness-105 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Update now</span>
            </button>
          )}
        </div>
      </div>

      {/* What's New Release Notes Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#C9A52A]" />
          <span>What's New</span>
        </h2>

        <div className="space-y-4">
          {releaseData.map((rel) => (
            <div key={rel.version} className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-[#C9A52A] font-mono">v{rel.version}</span>
                  <span className="text-xs text-muted-foreground">· {rel.releaseDate}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                  {rel.environment}
                </span>
              </div>

              <p className="text-xs text-foreground font-medium">{rel.summary}</p>

              {rel.highlights?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C9A52A]" />
                    <span>Feature Improvements</span>
                  </span>
                  <ul className="space-y-1 text-xs text-muted-foreground pl-4 list-disc">
                    {rel.highlights.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {rel.bugFixes?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                    <Bug className="w-3.5 h-3.5 text-amber-500" />
                    <span>Bug Fixes</span>
                  </span>
                  <ul className="space-y-1 text-xs text-muted-foreground pl-4 list-disc">
                    {rel.bugFixes.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {rel.performanceImprovements?.length > 0 && (
                <div className="space-y-1.5 pt-1">
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
          ))}
        </div>
      </div>

    </div>
  );
}
