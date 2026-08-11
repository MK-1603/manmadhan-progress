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
          return parsed; 
        } catch (e) {}
      }
    }
    return null;
  });

  // Persist authData to handle accidental refreshes, with a 5-minute expiration
  useEffect(() => {
    if (authData) {
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
    setTransitionMessage("Signing out securely...");
    setIsTransitioning(true);
    
    // Give animation time to play before we kill the state
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
      router.push("/");
      
      // Remove overlay after nav
      setTimeout(() => setIsTransitioning(false), 500);
    }, 800);
  }, [router]);

  const checkSession = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (!sessionPromise) {
        sessionPromise = apiClient.get("/auth/me");
      }
      const res = await sessionPromise;
      if (res.data.authenticated) {
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

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const isProtected = 
    pathname?.startsWith("/ceo") || 
    pathname?.startsWith("/co-ceo") || 
    pathname?.startsWith("/member") || 
    pathname?.startsWith("/personal") ||
    pathname?.startsWith("/dashboard");

  useEffect(() => {
    // Only redirect if:
    // 1. We've completed at least one session check (not during initial hydration)
    // 2. We're not currently navigating away (which would temporarily set user=null on next mount)
    // 3. The user is genuinely not authenticated
    if (hasInitialised.current && !isLoading && !user && isProtected && !isNavigatingRef.current) {
      router.push("/login?error=Unauthorized");
    }
  }, [isLoading, user, isProtected, router]);

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
  }), [user, isLoading, openModal, isDirty, isTransitioning, transitionMessage, authState, setAuthState, authData, setAuthData, open, close, verifyOtp, logout, checkSession]);

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

