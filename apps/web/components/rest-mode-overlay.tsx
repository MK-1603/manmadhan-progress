"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth/auth-context";
import { Moon, ShieldAlert, ArrowRight, Clock, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

export function RestModeOverlay() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = !!user;
  const [isRestMode, setIsRestMode] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);

  // Personal Workspace is NEVER affected by Rest Mode
  const isPersonalWorkspace = pathname?.startsWith("/personal");

  useEffect(() => {
    // Check if previously bypassed in this session
    const bypassed = sessionStorage.getItem("rest_mode_bypassed");
    if (bypassed === "true") {
      setIsBypassed(true);
    }

    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      // Rest Mode is active if time is BEFORE 04:00 or AFTER/EQUAL 23:00
      const restActive = hour < 4 || hour >= 23;
      setIsRestMode(restActive);
    };

    checkTime();
    // Check every minute
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Personal Workspace is NEVER locked by Rest Mode — only org workspace is
  if (isLoading || !isAuthenticated || !isRestMode || isBypassed || isPersonalWorkspace) return null;

  const isCEO = user?.role === "CEO";

  const handleOverride = () => {
    if (isCEO) {
      sessionStorage.setItem("rest_mode_bypassed", "true");
      setIsBypassed(true);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
        className="fixed inset-0 z-[9999] bg-background/80 flex flex-col items-center justify-center p-6"
      >
        <div className="absolute top-0 w-full h-[50vh] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative max-w-lg w-full bg-card border border-border rounded-3xl p-8 sm:p-12 text-center shadow-2xl overflow-hidden"
        >
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Moon className="h-10 w-10 text-primary" strokeWidth={1.5} />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3">
              Rest Mode Active
            </h2>
            
            <div className="bg-muted/50 rounded-xl p-4 w-full mb-6 flex items-center justify-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Work Execution Policy: <span className="text-foreground">04:00 AM – 11:00 PM</span>
              </p>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-8">
              Outside of designated execution hours, the workspace is locked to promote genuine rest and prevent burnout. Plan better tomorrow. Focus deeper tomorrow.
            </p>

            {isCEO ? (
              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={handleOverride}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Override Policy (CEO)
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => router.push("/personal/dashboard")}
                  className="w-full border border-border bg-card text-foreground hover:bg-muted h-12 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Go to Personal Workspace
                </button>
                <p className="text-xs text-muted-foreground">
                  Your actions outside of execution hours may be audited.
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-3">
                <div className="bg-destructive/10 text-destructive rounded-xl p-4 w-full flex items-start gap-3 text-left">
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Organization Work Restricted</p>
                    <p className="text-xs mt-1 opacity-90">Organization execution is paused between 11:00 PM and 4:00 AM. Please return during standard hours.</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/personal/dashboard")}
                  className="w-full border border-border bg-card text-foreground hover:bg-muted h-12 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Go to Personal Workspace
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
