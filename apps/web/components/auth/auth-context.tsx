"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import apiClient from "../../lib/api-client";
import { useRouter, usePathname } from "next/navigation";
import { TransitionScreen } from "../transition-screen";

// Singleton promise cache to deduplicate simultaneous /auth/me requests across components/renders
let sessionPromise: Promise<any> | null = null;

export type User = {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  avatar: string;
  role: string;
  workspaceId?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  batchNumber?: string;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isOpen: boolean;
  isDirty: boolean;
  setIsDirty: (val: boolean) => void;
  isTransitioning: boolean;
  setIsTransitioning: (val: boolean) => void;
  transitionMessage: string;
  setTransitionMessage: (val: string) => void;
  authState: string;
  setAuthState: (state: string) => void;
  authData: { step?: string, token?: string, role?: string, error?: string } | null;
  setAuthData: (data: { step?: string, token?: string, role?: string, error?: string } | null) => void;
  open: () => void;
  close: (discardState?: boolean) => void;
  verifyOtp: (tempToken: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  /** Re-fetches the current user from /auth/me and updates context state. */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("Processing...");
  const [authState, setAuthState] = useState("EMAIL_ENTRY");
  const hasInitialised = React.useRef(false);
  const isNavigatingRef = React.useRef(false);
  
  const [authData, setAuthData] = useState<{ step?: string, token?: string, role?: string, error?: string, expiresAt?: number } | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('authData');
      if (stored) {
        try { 
          const parsed = JSON.parse(stored); 
          if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            sessionStorage.removeItem('authData');
            return null;
          }
          // Transient request confirmation states must never survive page refresh
          if (parsed.step === "RESET_SENT" || parsed.step === "FORGOT_PASSWORD") {
            sessionStorage.removeItem('authData');
            return null;
          }
          return parsed; 
        } catch (e) {}
      }
    }
    return null;
  });

  // Persist authData to handle accidental refreshes for setup flows only, filtering transient reset request screens
  useEffect(() => {
    if (authData && authData.step !== "RESET_SENT" && authData.step !== "FORGOT_PASSWORD") {
      const dataToStore = {
        ...authData,
        expiresAt: authData.expiresAt || Date.now() + 5 * 60 * 1000 // 5 minutes from now
      };
      sessionStorage.setItem('authData', JSON.stringify(dataToStore));
    } else {
      sessionStorage.removeItem('authData');
    }
  }, [authData]);

  const router = useRouter();
  const pathname = usePathname();
  
  // Debounce ref to prevent double opening
  const isOpeningRef = React.useRef(false);

  const verifyOtp = React.useCallback(async (tempToken: string, otp: string) => {
    const res = await apiClient.post("/auth/verify-otp", { tempToken, otp });
    if (res.data.success) {
      setTransitionMessage("Authenticating...");
      setIsTransitioning(true);
      setUser(res.data.user);
      
      // Route to correct dashboard based on role
      const role = (res.data.user?.role || "CEO").toUpperCase();
      let dashPath = "/ceo/dashboard";
      if (role === "CO-CEO") dashPath = "/co-ceo/dashboard";
      else if (role === "MEMBER") dashPath = "/member/dashboard";

      // Store workspaceId if returned
      if (res.data.workspaceId) {
        localStorage.setItem("workspaceId", res.data.workspaceId);
      }
      
      setTimeout(() => {
        router.push(dashPath);
        setTimeout(() => setIsTransitioning(false), 500);
      }, 800);
    }
  }, [router]);

  const logout = React.useCallback(async () => {
    isNavigatingRef.current = true;
    setTransitionMessage("Signing out securely...");
    setIsTransitioning(true);
    
    setTimeout(async () => {
      try {
        await apiClient.post("/auth/logout");
      } catch (e) {}
      setUser(null);
      setAuthData(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem("workspaceId");
        sessionStorage.removeItem("authData");
      }
      router.push("/login");
      
      setTimeout(() => {
        setIsTransitioning(false);
        isNavigatingRef.current = false;
      }, 500);
    }, 400);
  }, [router]);

  const checkSession = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (!sessionPromise) {
        sessionPromise = apiClient.get("/auth/me");
      }
      const res = await sessionPromise;
      if ((res.data.authenticated || res.data.success) && res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
      hasInitialised.current = true;
      sessionPromise = null;
    }
  }, []);

  /** Silently re-fetches the current user from /auth/me without touching loading state. */
  const refreshUser = React.useCallback(async () => {
    try {
      const res = await apiClient.get("/auth/me");
      if ((res.data.authenticated || res.data.success) && res.data.user) {
        setUser(res.data.user);
      }
    } catch {
      // Silently ignore — if the session is gone the 401 interceptor handles it
    }
  }, []);

  // Guaranteed cleanup of stale transition overlays on mount and tab/app visibility changes
  useEffect(() => {
    const handleReturn = () => {
      setIsTransitioning(false);
    };

    window.addEventListener("pageshow", handleReturn);
    window.addEventListener("focus", handleReturn);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleReturn();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Timeout safety net: automatically clear transition overlay if redirect didn't leave within 2.5s
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 2500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pageshow", handleReturn);
      window.removeEventListener("focus", handleReturn);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const isProtected = 
    pathname?.startsWith("/ceo") || 
    pathname?.startsWith("/co-ceo") || 
    pathname?.startsWith("/member") || 
    pathname?.startsWith("/personal") ||
    pathname?.startsWith("/dashboard");

  const isAuthPage = pathname === "/" || pathname === "/login" || pathname === "/activate";

  useEffect(() => {
    if (!hasInitialised.current || isLoading || isNavigatingRef.current) return;

    if (!user && isProtected) {
      router.push("/login");
    } else if (user && isAuthPage) {
      const role = (user.role || "CEO").toUpperCase();
      const targetDash = role === "CEO" ? "/ceo/dashboard" : role === "CO-CEO" ? "/co-ceo/dashboard" : "/member/dashboard";
      router.push(targetDash);
    }
  }, [isLoading, user, isProtected, isAuthPage, router]);

  const open = React.useCallback(() => {
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    setOpenModal(true);
    setTimeout(() => { isOpeningRef.current = false; }, 500);
  }, []);

  const close = React.useCallback((discardState = false) => {
    setOpenModal(false);
    if (discardState) {
      setAuthData(null);
      setIsDirty(false);
      setAuthState("EMAIL_ENTRY");
    }
  }, []);

  const contextValue = React.useMemo(() => ({
    user,
    isLoading,
    isOpen: openModal,
    isDirty,
    setIsDirty,
    isTransitioning,
    setIsTransitioning,
    transitionMessage,
    setTransitionMessage,
    authState,
    setAuthState,
    authData,
    setAuthData,
    open,
    close,
    verifyOtp,
    logout,
    checkSession,
    refreshUser,
  }), [user, isLoading, openModal, isDirty, isTransitioning, transitionMessage, authState, setAuthState, authData, setAuthData, open, close, verifyOtp, logout, checkSession, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <TransitionScreen isVisible={isTransitioning} message={transitionMessage} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

