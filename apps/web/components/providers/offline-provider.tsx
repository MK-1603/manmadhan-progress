"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

import { pwaRefreshEngine } from "@/lib/pwa-refresh-engine";

interface OfflineContextType {
  isOnline: boolean;
}

const OfflineContext = createContext<OfflineContextType>({ isOnline: true });

export function useOffline() {
  return useContext(OfflineContext);
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showRestoredBanner, setShowRestoredBanner] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestoredBanner(true);
      const timer = setTimeout(() => setShowRestoredBanner(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredBanner(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline }}>
      {children}

      {/* Non-Blocking Mobile PWA Offline Bottom Banner (Positioned directly ABOVE bottom navigation) */}
      {!isOnline && (
        <div 
          className="fixed left-0 right-0 z-[998] md:hidden bg-[#0D1015]/95 backdrop-blur-md border-t border-[#D4B12F]/40 text-[#F3FFF0] py-2 px-4 shadow-[0_-8px_24px_rgba(0,0,0,0.4)] flex items-center justify-between transition-all duration-300"
          style={{ bottom: "calc(60px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4B12F] animate-pulse shrink-0" />
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <WifiOff className="w-3.5 h-3.5 text-[#D4B12F] shrink-0" />
              <span className="font-semibold text-[#F3FFF0]">You're Offline</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => pwaRefreshEngine.syncStaleDomains()}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#15191D] hover:bg-[#1E242B] border border-[#292F38] text-[11px] font-semibold text-[#F3FFF0] transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-[#D4B12F]" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Brief Restored Online Banner */}
      {isOnline && showRestoredBanner && (
        <div 
          className="fixed left-0 right-0 z-[998] md:hidden bg-emerald-950/95 backdrop-blur-md border-t border-emerald-500/40 text-emerald-100 py-2 px-4 shadow-2xl flex items-center justify-center transition-all duration-300"
          style={{ bottom: "calc(60px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>Back Online — Connection Restored</span>
          </div>
        </div>
      )}
    </OfflineContext.Provider>
  );
}
