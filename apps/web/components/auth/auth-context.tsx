"use client";

import React, { createContext, useState, useEffect, type ReactNode } from "react";
import apiClient, { setIsExplicitLoggingOut, hasAuthCredentials, getValidAccessToken, hasRefreshToken, clearAuthStorage } from "../../lib/api-client";
import { useRouter, usePathname } from "next/navigation";
import { TransitionScreen } from "../transition-screen";
import { resetGlobalSheetState } from "@/components/ui/global-sheet";
import { WorkspaceService } from "@/services/workspace-service";
import { NotificationService } from "@/services/notification-service";
import { FocusService } from "@/services/focus-service";
import { SafeNavigation } from "@/lib/safe-navigation";
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
  if (typeof document === "undefined") return;
  if (token) {
    const isHttps = window.location.protocol === "https:";
    document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isHttps ? "; Secure" : ""}`;
    document.cookie = `has_session=true; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax${isHttps ? "; Secure" : ""}`;
  } else {
    document.cookie = "auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    document.cookie = "refresh_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    document.cookie = "has_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
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
  const authVersionRef = React.useRef(0);

  const [authData, setAuthData] = useState<{ step?: string; token?: string; role?: string; error?: string; email?: string; redirect?: string; expiresAt?: number } | null>(() => {
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
        } catch (e) {
          sessionStorage.removeItem("authData");
        }
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

  const open = React.useCallback((step?: string) => {
    if (step) {
      setAuthState(step);
    }
    setOpenModal(true);
  }, []);

  const close = React.useCallback((discardState = false) => {
    setOpenModal(false);
    if (discardState) {
      setAuthData(null);
      setAuthState("EMAIL_ENTRY");
      setIsDirty(false);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("authData");
      }
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
    [router, close]
  );

  const setSessionUser = React.useCallback(
    (userData: User, token?: string, refreshToken?: string, workspaceId?: string) => {
      if (typeof window !== "undefined") {
        if (token) {
          localStorage.setItem("auth_token", token);
          localStorage.setItem("token", token);
          syncTokenCookie(token);
        }
        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
          localStorage.setItem("refreshToken", refreshToken);
        }
        if (workspaceId) {
          localStorage.setItem("workspaceId", workspaceId);
        }
      }
      sessionPromiseRef.current = null;
      setUser(userData);
      setAuthStatus("authenticated");
      setAuthData(null);
      setIsLoading(false);
    },
    [],
  );

  const [transitionType, setTransitionType] = useState<"AUTHENTICATING" | "LOGGING_OUT" | "SESSION_RESTORING">("AUTHENTICATING");

  const logout = React.useCallback(async () => {
    authVersionRef.current += 1;
    setIsExplicitLoggingOut(true);
    setTransitionMessage("Signing out...");
    setTransitionType("LOGGING_OUT");
    setIsTransitioning(true);
    close(true);
    resetGlobalSheetState();

    // 0.0s: Dispatch immediate server logout request
    const logoutPromise = apiClient.post("/auth/logout").catch(() => {});

    // 2.4s: Visual completion state
    const completionTimer = setTimeout(() => {
      setTransitionMessage("Signed out");
    }, 2400);

    // 3.0s: Finish visual transition and navigate to login
    setTimeout(async () => {
      clearTimeout(completionTimer);
      await logoutPromise;

      WorkspaceService.clearCache();
      NotificationService.clearCache();
      FocusService.clearCache();

      setUser(null);
      setAuthData(null);
      setAuthStatus("unauthenticated");

      if (typeof window !== "undefined") {
        clearAuthStorage();
        localStorage.removeItem("workspaceId");
        sessionStorage.removeItem("authData");
      }

      router.replace("/");
      setIsTransitioning(false);
      setIsExplicitLoggingOut(false);
    }, 3000);
  }, [router, close]);

  const checkSession = React.useCallback(async () => {
    const currentAuthVersion = authVersionRef.current;
    setIsLoading(true);
    setAuthStatus("initializing");
    try {
      if (!sessionPromiseRef.current) {
        sessionPromiseRef.current = (async () => {
          try {
            // Step 1: Direct session verification
            const meRes = await apiClient.get("/auth/me", { timeout: 10000 });
            if (meRes?.data?.authenticated && meRes?.data?.user) {
              return { success: true, user: meRes.data.user, workspaceId: meRes.data.workspaceId };
            }
          } catch (err: any) {
            const status = err?.response?.status;
            const code = err?.response?.data?.code;

            // If network / 5xx error, mark as temporary network issue
            if (!err?.response || status >= 500 || err?.code === "ERR_NETWORK" || err?.code === "ECONNREFUSED") {
              return { isNetworkError: true, message: err?.message };
            }

            // Step 2: Access token expired or unauthenticated — attempt silent session refresh
            if (status === 401 || code === "ACCESS_TOKEN_EXPIRED" || code === "UNAUTHORIZED") {
              try {
                const refreshRes = await apiClient.post("/auth/refresh", {}, { withCredentials: true });
                if (refreshRes?.data?.accessToken || refreshRes?.data?.success) {
                  // Retry /auth/me with fresh credential
                  const retryMeRes = await apiClient.get("/auth/me", { timeout: 10000 });
                  if (retryMeRes?.data?.authenticated && retryMeRes?.data?.user) {
                    return { success: true, user: retryMeRes.data.user, workspaceId: retryMeRes.data.workspaceId };
                  }
                }
              } catch (refreshErr: any) {
                const refreshStatus = refreshErr?.response?.status;
                const refreshCode = refreshErr?.response?.data?.code;

                if (!refreshErr?.response || refreshStatus >= 500 || refreshErr?.code === "ERR_NETWORK") {
                  return { isNetworkError: true, message: refreshErr?.message };
                }

                if (refreshStatus === 401 || refreshStatus === 403 || refreshCode === "REFRESH_SESSION_EXPIRED" || refreshCode === "ACCOUNT_SUSPENDED") {
                  return { isPermanentInvalid: true, code: refreshCode };
                }
              }
            }

            if (status === 403 && (code === "ACCOUNT_SUSPENDED" || code === "ACCOUNT_DELETED")) {
              return { isPermanentInvalid: true, code };
            }
          }
          return { isPermanentInvalid: true };
        })();
      }

      const result: any = await sessionPromiseRef.current;

      // Discard stale async response if logout occurred during in-flight request
      if (currentAuthVersion !== authVersionRef.current) return;

      if (result?.success && result?.user) {
        setUser(result.user);
        setAuthStatus("authenticated");
        setAuthData(null);
        setOpenModal(false);
        if (typeof window !== "undefined") {
          const isHttps = window.location.protocol === "https:";
          document.cookie = `has_session=true; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax${isHttps ? "; Secure" : ""}`;
          sessionStorage.removeItem("authData");
          if (result.workspaceId) {
            localStorage.setItem("workspaceId", result.workspaceId);
          }
        }
      } else if (result?.isNetworkError) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AUTH DIAGNOSTIC] Network/server error during checkSession. Preserving existing session state.");
        }
        // If we already had a user or local credentials, preserve authenticated state
        setUser((prevUser) => {
          if (prevUser) {
            setAuthStatus("authenticated");
            return prevUser;
          }
          const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
          if (storedToken) {
            setAuthStatus("authenticated");
          } else {
            setAuthStatus("unauthenticated");
          }
          return prevUser;
        });
      } else {
        // Confirmed permanent session invalidation
        if (process.env.NODE_ENV === "development") {
          console.warn("[AUTH DIAGNOSTIC] Permanent session invalidation confirmed. Setting unauthenticated state.");
        }
        clearAuthStorage();
        setUser(null);
        setAuthStatus("unauthenticated");
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[AUTH DIAGNOSTIC] Unexpected error in checkSession:", err?.message);
      }
    } finally {
      setIsLoading(false);
      hasInitialised.current = true;
      sessionPromiseRef.current = null;
    }
  }, []);

  /** Silently re-fetches the current user from /auth/me without touching loading state. */
  const refreshUser = React.useCallback(async () => {
    const currentVersion = authVersionRef.current;
    try {
      const res = await apiClient.get("/auth/me");
      if (currentVersion !== authVersionRef.current) return;
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
    if (!hasInitialised.current || isLoading || authStatus === "initializing") return;

    if (authStatus === "unauthenticated" && isProtected) {
      SafeNavigation.push(router, "/login");
    } else if (authStatus === "authenticated" && user) {
      if (isAuthPage) {
        const targetDash = getDashboardPathForRole(user.role);
        SafeNavigation.push(router, targetDash);
      } else if (pathname) {
        const role = (user.role || "").toUpperCase().trim();
        if (pathname.startsWith("/ceo") && role !== "CEO") {
          SafeNavigation.replace(router, getDashboardPathForRole(role));
        } else if (pathname.startsWith("/co-ceo") && role !== "CO-CEO") {
          SafeNavigation.replace(router, getDashboardPathForRole(role));
        } else if (pathname.startsWith("/member") && role !== "MEMBER" && role !== "USER") {
          SafeNavigation.replace(router, getDashboardPathForRole(role));
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
      setSessionUser,
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
      setSessionUser,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <TransitionScreen isVisible={isTransitioning} message={transitionMessage} type={transitionType} />
    </AuthContext.Provider>
  );
}
