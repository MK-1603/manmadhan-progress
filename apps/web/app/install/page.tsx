"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, CheckCircle2, Share, PlusSquare, ArrowLeft, Smartphone, Monitor, ShieldCheck, Zap, AlertTriangle, Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import { usePWA, PlatformType, DeviceType } from "@/components/providers/pwa-provider";
import { useAuth } from "@/components/auth/auth-context";
import { AppShell } from "@/components/layout/app-shell";

const APP_ICON_URL = "https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png";

type ViewTarget = "iphone" | "ipad" | "android" | "desktop";

export default function InstallPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    isInstalled,
    installStatus,
    platform: detectedPlatform,
    device: detectedDevice,
    browser: detectedBrowser,
    isSafari,
    deferredPrompt,
    triggerInstall,
    currentVersion,
  } = usePWA();

  const [activeTarget, setActiveTarget] = useState<ViewTarget>("desktop");
  const [installOutcome, setInstallOutcome] = useState<"none" | "accepted" | "dismissed" | "error">("none");
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (detectedDevice === "iphone") setActiveTarget("iphone");
    else if (detectedDevice === "ipad") setActiveTarget("ipad");
    else if (detectedPlatform === "android") setActiveTarget("android");
    else setActiveTarget("desktop");
  }, [detectedDevice, detectedPlatform]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      const r = (user?.role || "").toUpperCase();
      const fallback = r.includes("CO") ? "/co-ceo/projects" : r.includes("MEMBER") ? "/member/projects" : "/ceo/projects";
      router.push(fallback);
    }
  };

  const handleInstallClick = async () => {
    setInstallOutcome("none");
    const res = await triggerInstall();
    if (res.outcome === "accepted") {
      setInstallOutcome("accepted");
    } else if (res.outcome === "dismissed") {
      setInstallOutcome("dismissed");
    } else {
      setInstallOutcome("error");
    }
  };

  const handleCopyUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

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
                Install App
              </h1>
              <p className="text-xs text-muted-foreground">
                Get ManMadhan Progress on your device for a faster, app-like experience.
              </p>
            </div>
          </div>
        </div>

        {/* ── Two-Column Desktop / One-Column Mobile Layout ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: App Identity & Status */}
          <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#C9A52A]/30 p-1 bg-[#07090E] shrink-0 shadow-md">
                  <img src={APP_ICON_URL} alt="ManMadhan Progress Logo" className="w-full h-full object-cover rounded-xl" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                    ManMadhan Progress
                  </h2>
                  <p className="text-xs text-[#C9A52A] font-extrabold font-mono">
                    Execution OS
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Install the application for quick access from your Home Screen or desktop dock.
              </p>

              <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-semibold">Detected device</span>
                <span className="font-extrabold text-[#C9A52A] capitalize">
                  {detectedDevice}
                </span>
              </div>
            </div>

            {/* Platform Switcher Pills */}
            <div className="pt-3 border-t border-border">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-2">
                Platform Instructions
              </span>
              <div className="grid grid-cols-4 gap-1 bg-background border border-border p-1 rounded-xl text-[11px] font-bold">
                {[
                  { id: "iphone", label: "iPhone" },
                  { id: "ipad", label: "iPad" },
                  { id: "android", label: "Android" },
                  { id: "desktop", label: "Desktop" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTarget(t.id as ViewTarget)}
                    className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                      activeTarget === t.id
                        ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Platform Installation Steps & Actions */}
          <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-card border border-border space-y-4">
            
            {isInstalled ? (
              /* Already Installed State */
              <div className="p-6 text-center space-y-3 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-foreground">✓ App Installed</h3>
                  <p className="text-xs text-muted-foreground">
                    ManMadhan Progress is already available on this device.
                  </p>
                </div>
                <Link
                  href="/"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs shadow-xs hover:brightness-105 inline-flex items-center gap-2 cursor-pointer"
                >
                  Open App
                </Link>
              </div>
            ) : activeTarget === "iphone" || activeTarget === "ipad" ? (
              /* iOS Safari Stepper */
              <div className="space-y-4">
                <div className="border-b border-border pb-3">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#C9A52A]" />
                    <span>Install on {activeTarget === "ipad" ? "iPad" : "iPhone"}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add ManMadhan Progress to your Home Screen using Safari.
                  </p>
                </div>

                {detectedPlatform === "ios" && !isSafari && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-extrabold">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Recommended browser: Safari</span>
                    </div>
                    <p className="text-[11px] opacity-90">
                      Open this page in Safari to install ManMadhan Progress.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-[#0B0D10] font-extrabold text-[11px] inline-flex items-center gap-1.5 cursor-pointer hover:brightness-105"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? "URL Copied!" : "Copy URL for Safari"}</span>
                    </button>
                  </div>
                )}

                {/* 3-Step Stepper */}
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-background border border-border flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#C9A52A]/10 border border-[#C9A52A]/20 text-[#C9A52A] font-extrabold text-xs flex items-center justify-center shrink-0">
                      01
                    </div>
                    <div>
                      <h4 className="font-extrabold text-foreground text-xs flex items-center gap-1.5">
                        <span>Open Share</span>
                        <Share className="w-3.5 h-3.5 text-[#C9A52A]" />
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Tap Safari's Share button in the toolbar.</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-background border border-border flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#C9A52A]/10 border border-[#C9A52A]/20 text-[#C9A52A] font-extrabold text-xs flex items-center justify-center shrink-0">
                      02
                    </div>
                    <div>
                      <h4 className="font-extrabold text-foreground text-xs flex items-center gap-1.5">
                        <span>Add to Home Screen</span>
                        <PlusSquare className="w-3.5 h-3.5 text-[#C9A52A]" />
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Select "Add to Home Screen" from the menu options.</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-background border border-border flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#C9A52A]/10 border border-[#C9A52A]/20 text-[#C9A52A] font-extrabold text-xs flex items-center justify-center shrink-0">
                      03
                    </div>
                    <div>
                      <h4 className="font-extrabold text-foreground text-xs">Confirm</h4>
                      <p className="text-[11px] text-muted-foreground">Tap "Add" in the top-right corner to finish.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTarget === "android" ? (
              /* Android Experience */
              <div className="space-y-4">
                <div className="border-b border-border pb-3">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#C9A52A]" />
                    <span>Install on Android</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Install ManMadhan Progress directly from your browser.
                  </p>
                </div>

                {deferredPrompt ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#C9A52A]/10 border border-[#C9A52A]/20 space-y-1">
                      <h4 className="font-extrabold text-xs text-[#C9A52A]">Native prompt available</h4>
                      <p className="text-[11px] text-muted-foreground">Tap below to trigger the browser install prompt.</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs shadow-xs hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install App</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-background border border-border space-y-2 text-xs">
                    <h4 className="font-extrabold text-foreground">Install from browser menu</h4>
                    <ol className="space-y-1 text-muted-foreground list-decimal pl-4">
                      <li>Open browser menu (3 dots)</li>
                      <li>Select "Install app" or "Add to Home screen"</li>
                      <li>Confirm installation</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              /* Desktop Experience */
              <div className="space-y-4">
                <div className="border-b border-border pb-3">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#C9A52A]" />
                    <span>Install on Desktop</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use ManMadhan Progress in its own application window.
                  </p>
                </div>

                {deferredPrompt ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#C9A52A]/10 border border-[#C9A52A]/20 space-y-1">
                      <h4 className="font-extrabold text-xs text-[#C9A52A]">Desktop PWA Ready</h4>
                      <p className="text-[11px] text-muted-foreground">Click below to launch desktop installation prompt.</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs shadow-xs hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer inline-flex"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install App</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-background border border-border space-y-1.5 text-xs">
                    <h4 className="font-extrabold text-foreground">Desktop Browser Mode</h4>
                    <p className="text-muted-foreground">
                      Look for the install icon in your browser address bar (Chrome/Edge), or continue running in browser mode.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3 Concise Benefits */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-3">
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
            Install Benefits
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-1">
              <h4 className="font-extrabold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#C9A52A]" />
                <span>Quick Home Access</span>
              </h4>
              <p className="text-[11px] text-muted-foreground">Launch directly from your home screen or dock.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-background border border-border space-y-1">
              <h4 className="font-extrabold text-foreground flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-[#C9A52A]" />
                <span>App-like Window</span>
              </h4>
              <p className="text-[11px] text-muted-foreground">Dedicated window experience without browser URL bars.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-background border border-border space-y-1">
              <h4 className="font-extrabold text-foreground flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#C9A52A]" />
                <span>Automatic Updates</span>
              </h4>
              <p className="text-[11px] text-muted-foreground">Always run the latest production deployment.</p>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
