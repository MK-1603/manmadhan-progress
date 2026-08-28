"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CURRENT_APP_VERSION, APP_RELEASE_DATA, ReleaseInfo } from "@/lib/version-config";

export type InstallStatus = "NOT_INSTALLED" | "INSTALL_PROMPT_AVAILABLE" | "INSTALLED" | "UPDATE_AVAILABLE" | "UNSUPPORTED";
export type UpdateStatus = "UP_TO_DATE" | "UPDATE_AVAILABLE" | "DOWNLOADING" | "READY" | "UPDATING" | "ERROR" | "OFFLINE";
export type PlatformType = "ios" | "android" | "desktop" | "other";

interface PWAContextType {
  isInstalled: boolean;
  installStatus: InstallStatus;
  updateStatus: UpdateStatus;
  currentVersion: string;
  latestVersion: string;
  releaseDate: string;
  releaseData: ReleaseInfo[];
  platform: PlatformType;
  deferredPrompt: any;
  triggerInstall: () => Promise<boolean>;
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
  const [latestVersion, setLatestVersion] = useState(CURRENT_APP_VERSION);
  const [releaseDate] = useState(APP_RELEASE_DATA[0]?.releaseDate || "Aug 28, 2026");
  const [platform, setPlatform] = useState<PlatformType>("other");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // 1. Detect Platform & Display Mode (Standalone PWA)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Platform detection
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);
    if (isIOS) setPlatform("ios");
    else if (isAndroid) setPlatform("android");
    else setPlatform("desktop");

    // Standalone display mode check
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

    // Register SW
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        setSwRegistration(registration);

        // Check if there is already a waiting SW (ready to update)
        if (registration.waiting) {
          setUpdateStatus("READY");
          setInstallStatus("UPDATE_AVAILABLE");
        }

        // Listen for new service worker installation
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          setUpdateStatus("DOWNLOADING");

          installingWorker.onstatechange = () => {
            if (installingWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // New update ready!
                setUpdateStatus("READY");
                setInstallStatus("UPDATE_AVAILABLE");
              } else {
                // Initial SW caching complete
                setUpdateStatus("UP_TO_DATE");
              }
            }
          };
        };
      })
      .catch((err) => {
        console.warn("Service worker registration failed:", err);
      });

    // Listen for controllerchange (activated SW update)
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        // Reload page safely preserving tokens and session state
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  // 4. Trigger Real Browser PWA Install Prompt
  const triggerInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setInstallStatus("INSTALLED");
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn("PWA install prompt error:", err);
    }
    return false;
  };

  // 5. Check for Service Worker & Application Version Updates
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

  // 6. Apply Ready Update (Skip Waiting & Safe Reload)
  const updateNow = useCallback(async () => {
    if (typeof window === "undefined") return;

    // Check if user is in middle of active GitHub OAuth flow or active form
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
