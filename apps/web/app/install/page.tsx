"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Download, CheckCircle2, Share, PlusSquare, ArrowLeft, Smartphone, Monitor, ShieldCheck, Zap, AlertTriangle, ExternalLink, RefreshCw, Copy, Check } from "lucide-react";
import { usePWA, PlatformType, DeviceType } from "@/components/providers/pwa-provider";

const APP_ICON_URL = "https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png";

type ViewTarget = "iphone" | "ipad" | "android" | "desktop";

export default function InstallPage() {
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

  // Manual platform override state (defaults to auto-detected device/platform)
  const [activeTarget, setActiveTarget] = useState<ViewTarget>("desktop");
  const [installOutcome, setInstallOutcome] = useState<"none" | "accepted" | "dismissed" | "error">("none");
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (detectedDevice === "iphone") setActiveTarget("iphone");
    else if (detectedDevice === "ipad") setActiveTarget("ipad");
    else if (detectedPlatform === "android") setActiveTarget("android");
    else setActiveTarget("desktop");
  }, [detectedDevice, detectedPlatform]);

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
    <div className="min-h-screen w-full bg-[#0B0E12] text-foreground font-sans p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      
      {/* ── Top Header Bar ────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Install App
            </h1>
            <p className="text-xs text-muted-foreground">
              Dedicated installation experience for your device
            </p>
          </div>
        </div>
      </header>

      {/* ── App Icon Hero Section ──────────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border space-y-4 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-5">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-[#C9A52A]/30 shadow-lg shrink-0 bg-[#07090E] p-1">
            <img
              src={APP_ICON_URL}
              alt="ManMadhan Progress Icon"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Install ManMadhan Progress
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
              Your execution workspace, available like an app on your device.
            </p>
          </div>
        </div>

        {/* Subtle Manual Platform Switcher */}
        <div className="flex items-center bg-background border border-border rounded-xl p-1 text-xs font-bold shrink-0">
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
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
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

      {/* ── Main Installed / Platform Instructions Workspace ───────────────────── */}
      {isInstalled ? (
        /* Standalone Mode: Already Installed UI */
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-emerald-500/30 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-foreground">✓ App Installed</h3>
            <p className="text-xs text-muted-foreground">
              ManMadhan Progress is installed on this device.
            </p>
          </div>

          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs shadow-sm hover:brightness-105 inline-flex items-center gap-2 cursor-pointer"
          >
            Open App
          </Link>
        </div>
      ) : activeTarget === "iphone" || activeTarget === "ipad" ? (
        /* ── iOS Installation Experience (iPhone & iPad) ───────────────────────── */
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <div className="space-y-1 border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Smartphone className="w-4.5 h-4.5 text-[#C9A52A]" />
                <span>Install on {activeTarget === "ipad" ? "iPad" : "iPhone"}</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Add ManMadhan Progress to your Home Screen from Safari for an app-like experience.
              </p>
            </div>

            {/* Non-Safari Warning on iOS */}
            {detectedPlatform === "ios" && !isSafari && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs space-y-2">
                <div className="flex items-center gap-2 font-extrabold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Recommended browser: Safari</span>
                </div>
                <p className="text-[11.5px] opacity-90">
                  iOS requires Safari to add web apps to your Home Screen. Please open this page in Safari.
                </p>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-[#0B0D10] font-extrabold text-[11px] inline-flex items-center gap-1.5 cursor-pointer hover:brightness-105"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? "URL Copied!" : "Copy Page URL for Safari"}</span>
                </button>
              </div>
            )}

            {/* iOS Vertical Stepper */}
            <div className="space-y-3 pt-2">
              {/* Step 01 */}
              <div className="p-4 rounded-2xl bg-background border border-border flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-[#C9A52A]/10 border border-[#C9A52A]/20 text-[#C9A52A] font-extrabold text-xs flex items-center justify-center shrink-0">
                  01
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-extrabold text-foreground text-xs flex items-center gap-1.5">
                    <span>Open Share</span>
                    <Share className="w-3.5 h-3.5 text-[#C9A52A]" />
                  </h4>
                  <p className="text-[11.5px] text-muted-foreground">
                    Tap the Share button in Safari's toolbar at the bottom or top of your screen.
                  </p>
                </div>
              </div>

              {/* Step 02 */}
              <div className="p-4 rounded-2xl bg-background border border-border flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-[#C9A52A]/10 border border-[#C9A52A]/20 text-[#C9A52A] font-extrabold text-xs flex items-center justify-center shrink-0">
                  02
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-extrabold text-foreground text-xs flex items-center gap-1.5">
                    <span>Add to Home Screen</span>
                    <PlusSquare className="w-3.5 h-3.5 text-[#C9A52A]" />
                  </h4>
                  <p className="text-[11.5px] text-muted-foreground">
                    Scroll down the options list and select <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
              </div>

              {/* Step 03 */}
              <div className="p-4 rounded-2xl bg-background border border-border flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-[#C9A52A]/10 border border-[#C9A52A]/20 text-[#C9A52A] font-extrabold text-xs flex items-center justify-center shrink-0">
                  03
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-extrabold text-foreground text-xs">
                    Confirm & Add
                  </h4>
                  <p className="text-[11.5px] text-muted-foreground">
                    Tap <strong>"Add"</strong> in the top-right corner to complete installation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTarget === "android" ? (
        /* ── Android Installation Experience ───────────────────────────────────── */
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <div className="space-y-1 border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Smartphone className="w-4.5 h-4.5 text-[#C9A52A]" />
                <span>Install on Android</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Install ManMadhan Progress directly from your browser for quick access.
              </p>
            </div>

            {/* Native Install Available State */}
            {deferredPrompt ? (
              <div className="space-y-3 py-2">
                <div className="p-4 rounded-2xl bg-[#C9A52A]/10 border border-[#C9A52A]/20 text-foreground space-y-1">
                  <h4 className="font-extrabold text-xs text-[#C9A52A]">Ready to install</h4>
                  <p className="text-[11.5px] text-muted-foreground">
                    Tap below to launch the native Android app installation prompt.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs shadow-sm hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App</span>
                </button>

                {installOutcome === "dismissed" && (
                  <p className="text-xs text-amber-500 font-semibold text-center pt-1">
                    Installation was cancelled. You can try again anytime.
                  </p>
                )}
              </div>
            ) : (
              /* Fallback Instructions if beforeinstallprompt is unavailable */
              <div className="space-y-3 pt-1">
                <div className="p-4 rounded-2xl bg-background border border-border space-y-2 text-xs">
                  <h4 className="font-extrabold text-foreground">Install from browser menu</h4>
                  <ol className="space-y-1.5 text-muted-foreground list-decimal pl-4">
                    <li>Open Chrome/Browser menu (3 dots in top right)</li>
                    <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                    <li>Confirm installation in the dialog</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Desktop Installation Experience (Chrome / Edge) ──────────────────── */
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <div className="space-y-1 border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Monitor className="w-4.5 h-4.5 text-[#C9A52A]" />
                <span>Install on Desktop</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Use ManMadhan Progress in its own dedicated application window.
              </p>
            </div>

            {deferredPrompt ? (
              <div className="space-y-3 py-2">
                <div className="p-4 rounded-2xl bg-[#C9A52A]/10 border border-[#C9A52A]/20 text-foreground space-y-1">
                  <h4 className="font-extrabold text-xs text-[#C9A52A]">Desktop PWA Ready</h4>
                  <p className="text-[11.5px] text-muted-foreground">
                    Click below to install ManMadhan Progress on your desktop launcher.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs shadow-sm hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-background border border-border space-y-2 text-xs">
                <h4 className="font-extrabold text-foreground">Browser App Prompt</h4>
                <p className="text-muted-foreground">
                  Look for the install icon <Download className="w-3.5 h-3.5 inline text-[#C9A52A]" /> in your browser address bar (Chrome/Edge), or continue running in the browser.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3 Concise Installation Benefits ──────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-card border border-border space-y-3">
        <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
          Install Benefits
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
            <h4 className="font-extrabold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#C9A52A]" />
              <span>Quick Home Access</span>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Launch instantly from your home screen or desktop dock.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
            <h4 className="font-extrabold text-foreground flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-[#C9A52A]" />
              <span>App-like Window</span>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Dedicated window without browser address bar clutter.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
            <h4 className="font-extrabold text-foreground flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-[#C9A52A]" />
              <span>Automatic Updates</span>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Seamless background updates on new production deployments.
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer Navigation ──────────────────────────────────────────────────── */}
      <footer className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="font-mono text-muted-foreground font-semibold">
          Version v{currentVersion} · Production
        </span>

        <div className="flex items-center gap-4 text-muted-foreground font-bold">
          <Link href="/updates" className="hover:text-foreground transition-colors">
            Updates & Notes
          </Link>
          <span>·</span>
          <Link href="/about" className="hover:text-foreground transition-colors">
            About App
          </Link>
          <span>·</span>
          <Link href="/" className="hover:text-foreground transition-colors">
            Continue in Browser
          </Link>
        </div>
      </footer>

    </div>
  );
}
