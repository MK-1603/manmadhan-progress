"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

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

      {/* Non-Blocking Offline Bottom Banner */}
      {!isOnline && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#111318] border-t border-amber-500/30 text-white py-2.5 px-4 shadow-2xl flex items-center justify-between transition-all duration-300"
          style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <div className="flex items-center gap-1.5 text-xs">
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-zinc-200">You're Offline</span>
              <span className="text-zinc-400 hidden sm:inline">— Some features may be unavailable.</span>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[11px] font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Brief Restored Online Banner */}
      {isOnline && showRestoredBanner && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-[9999] bg-emerald-950/90 border-t border-emerald-500/40 text-emerald-100 py-2.5 px-4 shadow-2xl flex items-center justify-center transition-all duration-300"
          style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}
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
