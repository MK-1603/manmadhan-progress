"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CURRENT_APP_VERSION, APP_RELEASE_DATA, ReleaseInfo } from "@/lib/version-config";

export type InstallStatus = "NOT_INSTALLED" | "INSTALL_PROMPT_AVAILABLE" | "INSTALLED" | "UPDATE_AVAILABLE" | "DISMISSED" | "UNSUPPORTED";
export type UpdateStatus = "UP_TO_DATE" | "UPDATE_AVAILABLE" | "DOWNLOADING" | "READY" | "UPDATING" | "ERROR" | "OFFLINE";
export type PlatformType = "ios" | "android" | "desktop" | "other";
export type DeviceType = "iphone" | "ipad" | "android-phone" | "android-tablet" | "desktop";
export type BrowserType = "safari" | "chrome" | "edge" | "firefox" | "other";

interface PWAContextType {
  isInstalled: boolean;
  installStatus: InstallStatus;
  updateStatus: UpdateStatus;
  currentVersion: string;
  latestVersion: string;
  releaseDate: string;
  releaseData: ReleaseInfo[];
  platform: PlatformType;
  device: DeviceType;
  browser: BrowserType;
  isSafari: boolean;
  deferredPrompt: any;
  triggerInstall: () => Promise<{ success: boolean; outcome: "accepted" | "dismissed" | "error" }>;
  checkForUpdates: () => Promise<void>;
  updateNow: () => Promise<void>;
  isCheckingUpdate: boolean;
  updateError: string | null;
}

const PWAContext = createContext<PWAContextType | null>(null);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [installStatus, setInstallStatus] = useState<InstallStatus>("NOT_INSTALLED");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("UP_TO_DATE");
  const [currentVersion] = useState(CURRENT_APP_VERSION);
  const [latestVersion] = useState(CURRENT_APP_VERSION);
  const [releaseDate] = useState(APP_RELEASE_DATA[0]?.releaseDate || "Aug 28, 2026");
  
  const [platform, setPlatform] = useState<PlatformType>("desktop");
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [browser, setBrowser] = useState<BrowserType>("other");
  const [isSafari, setIsSafari] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // 1. Precise Feature-Based Platform, Device & Browser Detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent || "";
    const platformStr = navigator.platform || "";
    const maxTouchPoints = navigator.maxTouchPoints || 0;

    // Detect iOS (iPhone vs iPad vs iPad OS with TouchPoints)
    const isIPhone = /iPhone|iPod/.test(ua);
    const isIPad = /iPad/.test(ua) || (platformStr === "MacIntel" && maxTouchPoints > 1);
    const isIOSDevice = isIPhone || isIPad;

    // Detect Android (Phone vs Tablet)
    const isAndroidDevice = /Android/.test(ua);
    const isAndroidTablet = isAndroidDevice && !/Mobile/.test(ua);
    const isAndroidPhone = isAndroidDevice && /Mobile/.test(ua);

    // Browser Detection
    const isCriOS = /CriOS/.test(ua);
    const isFxiOS = /FxiOS/.test(ua);
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(ua) && !isCriOS && !isFxiOS;
    const isChromeBrowser = /Chrome|Chromium/.test(ua) && !/Edg/.test(ua) && !isCriOS;
    const isEdgeBrowser = /Edg/.test(ua);
    const isFirefoxBrowser = /Firefox/.test(ua);

    setIsSafari(isSafariBrowser);

    if (isSafariBrowser) setBrowser("safari");
    else if (isChromeBrowser) setBrowser("chrome");
    else if (isEdgeBrowser) setBrowser("edge");
    else if (isFirefoxBrowser) setBrowser("firefox");
    else setBrowser("other");

    if (isIOSDevice) {
      setPlatform("ios");
      setDevice(isIPad ? "ipad" : "iphone");
    } else if (isAndroidDevice) {
      setPlatform("android");
      setDevice(isAndroidTablet ? "android-tablet" : "android-phone");
    } else {
      setPlatform("desktop");
      setDevice("desktop");
    }

    // Standalone Display Mode Detection
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandaloneMode) {
      setIsInstalled(true);
      setInstallStatus("INSTALLED");
    }
  }, []);

  // 2. Listen for beforeinstallprompt & appinstalled events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isInstalled) {
        setInstallStatus("INSTALL_PROMPT_AVAILABLE");
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallStatus("INSTALLED");
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isInstalled]);

  // 3. Register & Monitor Production Service Worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        setSwRegistration(registration);

        if (registration.waiting) {
          setUpdateStatus("READY");
          setInstallStatus("UPDATE_AVAILABLE");
        }

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          setUpdateStatus("DOWNLOADING");

          installingWorker.onstatechange = () => {
            if (installingWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                setUpdateStatus("READY");
                setInstallStatus("UPDATE_AVAILABLE");
              } else {
                setUpdateStatus("UP_TO_DATE");
              }
            }
          };
        };
      })
      .catch((err) => {
        console.warn("Service worker registration error:", err);
      });

    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  // 4. Trigger Real Browser PWA Install Prompt
  const triggerInstall = async (): Promise<{ success: boolean; outcome: "accepted" | "dismissed" | "error" }> => {
    if (!deferredPrompt) {
      return { success: false, outcome: "error" };
    }
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setInstallStatus("INSTALLED");
        setDeferredPrompt(null);
        return { success: true, outcome: "accepted" };
      } else {
        setInstallStatus("DISMISSED");
        return { success: false, outcome: "dismissed" };
      }
    } catch (err) {
      console.warn("PWA install prompt error:", err);
    }
    return { success: false, outcome: "error" };
  };

  // 5. Check for Updates
  const checkForUpdates = useCallback(async () => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    setUpdateError(null);

    if (typeof window !== "undefined" && !navigator.onLine) {
      setUpdateStatus("OFFLINE");
      setIsCheckingUpdate(false);
      return;
    }

    try {
      if (swRegistration) {
        setUpdateStatus("DOWNLOADING");
        await swRegistration.update();
        if (swRegistration.waiting) {
          setUpdateStatus("READY");
          setInstallStatus("UPDATE_AVAILABLE");
        } else {
          setUpdateStatus("UP_TO_DATE");
        }
      } else {
        setUpdateStatus("UP_TO_DATE");
      }
    } catch (err: any) {
      setUpdateError(err?.message || "Failed to check for updates");
      setUpdateStatus("ERROR");
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [swRegistration, isCheckingUpdate]);

  // 6. Apply Ready Update
  const updateNow = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (window.location.pathname.includes("/github") || window.location.search.includes("code=")) {
      console.warn("Deferred PWA update during active OAuth flow.");
      return;
    }

    setUpdateStatus("UPDATING");

    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }, [swRegistration]);

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        installStatus,
        updateStatus,
        currentVersion,
        latestVersion,
        releaseDate,
        releaseData: APP_RELEASE_DATA,
        platform,
        device,
        browser,
        isSafari,
        deferredPrompt,
        triggerInstall,
        checkForUpdates,
        updateNow,
        isCheckingUpdate,
        updateError,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWA must be used within a PWAProvider");
  }
  return context;
}
