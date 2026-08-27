"use client";

import React, { createContext, useState, useEffect, type ReactNode } from "react";
import apiClient, { setIsExplicitLoggingOut } from "../../lib/api-client";
import { useRouter, usePathname } from "next/navigation";
import { TransitionScreen } from "../transition-screen";
import { resetGlobalSheetState } from "@/components/ui/global-sheet";
import type { User, AuthContextValue } from "./auth-types";

export type { User, AuthContextValue } from "./auth-types";
export { useAuth } from "./use-auth";

export function getDashboardPathForRole(role?: string): string {
  const r = (role || "").toUpperCase().trim();
  if (r === "CEO") return "/ceo/dashboard";
  if (r === "CO-CEO") return "/co-ceo/dashboard";
  return "/member/dashboard";
}

export function syncTokenCookie(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    const isHttps = window.location.protocol === "https:";
    document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isHttps ? "; Secure" : ""}`;
  } else {
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
  }
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("Processing...");
  const [authState, setAuthState] = useState("EMAIL_ENTRY");
  const [authStatus, setAuthStatus] = useState<"initializing" | "authenticated" | "unauthenticated">("initializing");

  const hasInitialised = React.useRef(false);
  const isNavigatingRef = React.useRef(false);
  const sessionPromiseRef = React.useRef<Promise<any> | null>(null);

  const [authData, setAuthData] = useState<{ step?: string; token?: string; role?: string; error?: string; expiresAt?: number } | null>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("authData");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            sessionStorage.removeItem("authData");
            return null;
          }
          // Transient request confirmation states must never survive page refresh
          if (parsed.step === "RESET_SENT" || parsed.step === "FORGOT_PASSWORD") {
            sessionStorage.removeItem("authData");
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
        expiresAt: authData.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };
      sessionStorage.setItem("authData", JSON.stringify(dataToStore));
    } else {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("authData");
      }
    }
  }, [authData]);

  const router = useRouter();
  const pathname = usePathname();

  // Debounce ref to prevent double opening
  const isOpeningRef = React.useRef(false);

  const open = React.useCallback(() => {
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    setOpenModal(true);
    setTimeout(() => {
      isOpeningRef.current = false;
    }, 500);
  }, []);

  const close = React.useCallback((discardState = false) => {
    setOpenModal(false);
    if (discardState) {
      setAuthData(null);
      setIsDirty(false);
      setAuthState("EMAIL_ENTRY");
    }
  }, []);

  const verifyOtp = React.useCallback(
    async (tempToken: string, otp: string) => {
      const res = await apiClient.post("/auth/verify-otp", { tempToken, otp });
      if (res.data.success) {
        close(true);
        const token = res.data.token || res.data.accessToken;
        if (token && typeof window !== "undefined") {
          localStorage.setItem("auth_token", token);
          localStorage.setItem("token", token);
          syncTokenCookie(token);
        }
        if (res.data.refreshToken && typeof window !== "undefined") {
          localStorage.setItem("refresh_token", res.data.refreshToken);
          localStorage.setItem("refreshToken", res.data.refreshToken);
        }

        if (res.data.workspaceId && typeof window !== "undefined") {
          localStorage.setItem("workspaceId", res.data.workspaceId);
        }

        sessionPromiseRef.current = null;
        setUser(res.data.user);
        setAuthStatus("authenticated");
        setAuthData(null);

        const dashPath = getDashboardPathForRole(res.data.user?.role);
        router.replace(dashPath);
      }
    },
    [router, close],
  );

  const logout = React.useCallback(async () => {
    setIsExplicitLoggingOut(true);
    close(true);
    resetGlobalSheetState();

    apiClient.post("/auth/logout").catch(() => {});

    setUser(null);
    setAuthData(null);
    setAuthStatus("unauthenticated");

    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("workspaceId");
      sessionStorage.removeItem("authData");
      syncTokenCookie(null);
    }

    router.replace("/");

    setTimeout(() => {
      setIsExplicitLoggingOut(false);
    }, 300);
  }, [router, close]);

  const checkSession = React.useCallback(async () => {
    setIsLoading(true);
    setAuthStatus("initializing");
    try {
      if (!sessionPromiseRef.current) {
        sessionPromiseRef.current = apiClient.get("/auth/me", { timeout: 4000 }).catch((err) => {
          if (err?.response?.status === 401) {
            return { data: { authenticated: false, user: null } };
          }
          return { data: { authenticated: false, user: null } };
        });
      }

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: { authenticated: false, user: null } }), 4000)
      );

      const res: any = await Promise.race([sessionPromiseRef.current, timeoutPromise]);

      if (res?.data?.authenticated && res?.data?.user) {
        setUser(res.data.user);
        setAuthStatus("authenticated");
        setAuthData(null);
        setOpenModal(false);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("authData");
          if (res.data.workspaceId) {
            localStorage.setItem("workspaceId", res.data.workspaceId);
          }
          const token =
            localStorage.getItem("auth_token") ||
            localStorage.getItem("token") ||
            localStorage.getItem("jwt");
          if (token) {
            syncTokenCookie(token);
          }
        }
      } else {
        setUser(null);
        setAuthStatus("unauthenticated");
      }
    } catch {
      setUser(null);
      setAuthStatus("unauthenticated");
    } finally {
      setIsLoading(false);
      hasInitialised.current = true;
      sessionPromiseRef.current = null;
    }
  }, []);

  /** Silently re-fetches the current user from /auth/me without touching loading state. */
  const refreshUser = React.useCallback(async () => {
    try {
      const res = await apiClient.get("/auth/me");
      if ((res.data.authenticated || res.data.success) && res.data.user) {
        setUser(res.data.user);
        setAuthStatus("authenticated");
        if (res.data.workspaceId && typeof window !== "undefined") {
          localStorage.setItem("workspaceId", res.data.workspaceId);
        }
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

  // Background session refresh heartbeat every 10 minutes to prevent token expiration
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const heartbeat = setInterval(() => {
      refreshUser();
    }, 10 * 60 * 1000);
    return () => clearInterval(heartbeat);
  }, [authStatus, refreshUser]);

  // Multi-tab storage synchronization: sync login / logout across open tabs
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_token" || e.key === "token") {
        if (!e.newValue) {
          setUser(null);
          setAuthStatus("unauthenticated");
        } else if (e.newValue !== e.oldValue) {
          refreshUser();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refreshUser]);

  const isProtected =
    pathname?.startsWith("/ceo") ||
    pathname?.startsWith("/co-ceo") ||
    pathname?.startsWith("/member") ||
    pathname?.startsWith("/personal") ||
    pathname?.startsWith("/dashboard");

  const isAuthPage = pathname === "/" || pathname === "/login" || pathname === "/activate";

  useEffect(() => {
    if (!hasInitialised.current || isLoading || authStatus === "initializing" || isNavigatingRef.current) return;

    if (authStatus === "unauthenticated" && isProtected) {
      isNavigatingRef.current = true;
      router.push("/login");
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    } else if (authStatus === "authenticated" && user) {
      if (isAuthPage) {
        isNavigatingRef.current = true;
        const targetDash = getDashboardPathForRole(user.role);
        router.push(targetDash);
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 500);
      } else if (pathname) {
        const role = (user.role || "").toUpperCase().trim();
        if (pathname.startsWith("/ceo") && role !== "CEO") {
          isNavigatingRef.current = true;
          router.replace(getDashboardPathForRole(role));
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 500);
        } else if (pathname.startsWith("/co-ceo") && role !== "CO-CEO") {
          isNavigatingRef.current = true;
          router.replace(getDashboardPathForRole(role));
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 500);
        } else if (pathname.startsWith("/member") && role !== "MEMBER" && role !== "USER") {
          isNavigatingRef.current = true;
          router.replace(getDashboardPathForRole(role));
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 500);
        }
      }
    }
  }, [isLoading, authStatus, user, isProtected, isAuthPage, pathname, router]);



  const contextValue = React.useMemo(
    () => ({
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
      authStatus,
      open,
      close,
      verifyOtp,
      logout,
      checkSession,
      refreshUser,
    }),
    [
      user,
      isLoading,
      openModal,
      isDirty,
      isTransitioning,
      transitionMessage,
      authState,
      setAuthState,
      authData,
      setAuthData,
      authStatus,
      open,
      close,
      verifyOtp,
      logout,
      checkSession,
      refreshUser,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <TransitionScreen isVisible={isTransitioning} message={transitionMessage} />
    </AuthContext.Provider>
  );
}
