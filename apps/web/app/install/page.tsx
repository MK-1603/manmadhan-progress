"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Download, CheckCircle2, Share, PlusSquare, ArrowLeft, Smartphone, Monitor, ShieldCheck, Zap } from "lucide-react";
import { usePWA } from "@/components/providers/pwa-provider";

const APP_ICON_URL = "https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png";

export default function InstallPage() {
  const {
    isInstalled,
    installStatus,
    platform,
    deferredPrompt,
    triggerInstall,
    currentVersion,
    updateStatus,
  } = usePWA();

  const [installSuccess, setInstallSuccess] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      const ok = await triggerInstall();
      if (ok) setInstallSuccess(true);
    }
  };

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
              Install App
            </h1>
            <p className="text-xs text-muted-foreground">
              Get the full execution workspace on your device
            </p>
          </div>
        </div>
      </header>

      {/* Main Install Workspace (Two-Column Desktop / Single-Column Mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Hero & Install Trigger */}
        <div className="md:col-span-7 p-6 sm:p-8 rounded-3xl bg-card border border-border space-y-6 text-center md:text-left flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[#C9A52A]/30 shadow-lg mx-auto md:mx-0 relative bg-[#07090E] p-1">
              <img
                src={APP_ICON_URL}
                alt="ManMadhan Progress Logo"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                ManMadhan Progress
              </h2>
              <p className="text-sm text-muted-foreground">
                Your execution workspace, wherever you go.
              </p>
            </div>
          </div>

          {/* Installation Action States */}
          <div className="space-y-3 pt-4 border-t border-border">
            {isInstalled || installSuccess ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div className="text-left">
                    <h4 className="font-extrabold text-xs">✓ App Installed</h4>
                    <p className="text-[11px] opacity-90">ManMadhan Progress is already installed on this device.</p>
                  </div>
                </div>

                <Link
                  href="/"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs shadow-sm hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Open App
                </Link>
              </div>
            ) : deferredPrompt ? (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs shadow-sm hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App</span>
                </button>

                <Link
                  href="/"
                  className="block text-center text-xs font-bold text-muted-foreground hover:text-foreground py-1"
                >
                  Continue in browser
                </Link>
              </div>
            ) : platform === "ios" ? (
              /* iOS Safari Manual Instructions */
              <div className="p-4 rounded-2xl bg-card border border-[#C9A52A]/30 space-y-3 text-left">
                <h4 className="text-xs font-extrabold text-foreground flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#C9A52A]" />
                  <span>Install on iPhone / iPad</span>
                </h4>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal pl-4">
                  <li>Tap the <strong>Share</strong> button in Safari's toolbar <Share className="w-3.5 h-3.5 inline mx-0.5 text-[#C9A52A]" /></li>
                  <li>Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#C9A52A]" /></li>
                  <li>Tap <strong>Add</strong> in the top-right corner</li>
                </ol>
              </div>
            ) : platform === "android" ? (
              /* Android Chrome Manual Instructions */
              <div className="p-4 rounded-2xl bg-card border border-border space-y-3 text-left">
                <h4 className="text-xs font-extrabold text-foreground flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#C9A52A]" />
                  <span>Install on Android</span>
                </h4>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal pl-4">
                  <li>Open the browser menu (3 dots)</li>
                  <li>Select <strong>Install app</strong> or <strong>Add to Home screen</strong></li>
                  <li>Confirm installation</li>
                </ol>
              </div>
            ) : (
              /* Desktop Browser Manual Instructions */
              <div className="p-4 rounded-2xl bg-card border border-border space-y-2.5 text-left">
                <h4 className="text-xs font-extrabold text-foreground flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-[#C9A52A]" />
                  <span>Desktop Installation</span>
                </h4>
                <p className="text-xs text-muted-foreground">
                  Look for the install icon in your browser's address bar or menu to install ManMadhan Progress as a desktop application.
                </p>
                <Link
                  href="/"
                  className="inline-block text-xs font-bold text-[#C9A52A] hover:underline pt-1"
                >
                  Continue in browser →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Real Install Benefits & App Metadata */}
        <div className="md:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Why Install?
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-foreground">Fast App-like Experience</h4>
                  <p className="text-muted-foreground text-[11px]">Instant loading and smooth responsive interaction.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20 shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-foreground">Quick Access</h4>
                  <p className="text-muted-foreground text-[11px]">Launch directly from your home screen or desktop launcher.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20 shrink-0">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-foreground">Dedicated App Window</h4>
                  <p className="text-muted-foreground text-[11px]">Clean window experience without browser tabs or address bar.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-foreground">Automatic Updates</h4>
                  <p className="text-muted-foreground text-[11px]">Always run the latest production version seamlessly.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Version Footer */}
          <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between text-xs">
            <div>
              <span className="text-muted-foreground block text-[10.5px] uppercase font-extrabold">Current Version</span>
              <span className="font-bold font-mono text-foreground">v{currentVersion}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[10.5px] uppercase font-extrabold">Status</span>
              <span className="font-bold text-emerald-500">
                {isInstalled ? "Installed" : "Ready"}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
