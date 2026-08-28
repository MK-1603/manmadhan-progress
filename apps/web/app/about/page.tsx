"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Shield, ExternalLink, Sparkles, Download, RefreshCw, FileText } from "lucide-react";
import { CURRENT_APP_VERSION } from "@/lib/version-config";

const APP_ICON_URL = "https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png";

export default function AboutPage() {
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
              About
            </h1>
            <p className="text-xs text-muted-foreground">
              ManMadhan Progress · Product & Release Information
            </p>
          </div>
        </div>
      </header>

      {/* Main Product Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#C9A52A]/30 p-1 bg-[#07090E] shrink-0">
            <img src={APP_ICON_URL} alt="ManMadhan Progress Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              ManMadhan Progress
            </h2>
            <p className="text-xs text-[#C9A52A] font-extrabold font-mono">
              V1 · Execution OS
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          ManMadhan Progress is a high-performance organizational execution workspace designed for team leads, project managers, and engineers. It combines project planning, task management, milestone tracking, GitHub evidence verification, and real-time execution analytics into a unified, installable SaaS experience.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-border">
          <div>
            <span className="text-muted-foreground text-[10.5px] uppercase font-extrabold block">Version</span>
            <span className="font-bold font-mono text-foreground">v{CURRENT_APP_VERSION}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-[10.5px] uppercase font-extrabold block">Environment</span>
            <span className="font-bold text-emerald-500">Production</span>
          </div>
          <div>
            <span className="text-muted-foreground text-[10.5px] uppercase font-extrabold block">Architecture</span>
            <span className="font-bold text-foreground">PWA Standalone</span>
          </div>
          <div>
            <span className="text-muted-foreground text-[10.5px] uppercase font-extrabold block">Release Date</span>
            <span className="font-bold text-foreground">Aug 28, 2026</span>
          </div>
        </div>
      </div>

      {/* Actions & Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
        <Link
          href="/updates"
          className="p-4 rounded-2xl bg-card border border-border hover:border-[#C9A52A]/40 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-foreground group-hover:text-[#C9A52A] transition-colors">Updates & Release Notes</h4>
              <p className="text-[11px] font-normal text-muted-foreground">Check version status and release history</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
        </Link>

        <Link
          href="/install"
          className="p-4 rounded-2xl bg-card border border-border hover:border-[#C9A52A]/40 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-foreground group-hover:text-[#C9A52A] transition-colors">Install App</h4>
              <p className="text-[11px] font-normal text-muted-foreground">Get the full PWA experience on your device</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
        </Link>
      </div>

      {/* Terms, Privacy, Support Section */}
      <div className="p-5 rounded-2xl bg-card border border-border space-y-3 text-xs">
        <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
          Legal & Support
        </h3>

        <div className="flex flex-wrap gap-4 text-muted-foreground font-semibold">
          <span className="hover:text-foreground cursor-pointer">Privacy Policy</span>
          <span>·</span>
          <span className="hover:text-foreground cursor-pointer">Terms of Service</span>
          <span>·</span>
          <span className="hover:text-foreground cursor-pointer">Security & Encryption</span>
          <span>·</span>
          <span className="hover:text-foreground cursor-pointer">Support</span>
        </div>

        <p className="text-[11px] text-muted-foreground/60 pt-2 border-t border-border">
          © 2026 ManMadhan Progress. All rights reserved. Registered trademark of Enterprise Execution Systems.
        </p>
      </div>

    </div>
  );
}
