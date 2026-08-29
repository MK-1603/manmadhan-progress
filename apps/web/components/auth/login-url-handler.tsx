"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth, getDashboardPathForRole, syncTokenCookie } from "./auth-context";

import { SafeNavigation } from "@/lib/safe-navigation";

function Handler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { open, close, setAuthData, checkSession, authStatus, user } = useAuth();
  const searchParamsString = searchParams ? searchParams.toString() : "";

  useEffect(() => {
    const step = searchParams.get("auth_step");
    const redirectParam = searchParams.get("redirect");
    const errorMsg = searchParams.get("error");
    const emailParam = searchParams.get("email");
    const token = searchParams.get("token") || "";
    const role = searchParams.get("role") || "";

    if (authStatus === "authenticated" && user) {
      if (step || redirectParam || errorMsg || emailParam || token) {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("auth_step");
          url.searchParams.delete("token");
          url.searchParams.delete("role");
          url.searchParams.delete("error");
          url.searchParams.delete("email");
          url.searchParams.delete("redirect");
          window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
        }
        if (redirectParam && redirectParam.startsWith("/")) {
          SafeNavigation.replace(router, redirectParam);
        }
      }
      return;
    }

    if (token && step === "OAUTH_SUCCESS") {
      close(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("token", token);
        syncTokenCookie(token);
        const url = new URL(window.location.href);
        url.searchParams.delete("auth_step");
        url.searchParams.delete("token");
        url.searchParams.delete("role");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
      const targetDash = (redirectParam && redirectParam.startsWith("/")) ? redirectParam : getDashboardPathForRole(role);
      SafeNavigation.replace(router, targetDash);
      return;
    }

    if (step || redirectParam || errorMsg || emailParam) {
      const email = emailParam || "";

      setAuthData({ step: step || "EMAIL_ENTRY", token, role, error: errorMsg || "", email, redirect: redirectParam || "" });

      // Clean up the URL query parameters safely without dispatching uninitialized App Router actions
      if (typeof window !== "undefined" && (step || token || errorMsg || role || email)) {
        const url = new URL(window.location.href);
        url.searchParams.delete("auth_step");
        url.searchParams.delete("token");
        url.searchParams.delete("role");
        url.searchParams.delete("error");
        url.searchParams.delete("email");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }

      // Open the global AuthModal
      open();
    }
  }, [searchParamsString, open, setAuthData, checkSession, router, authStatus, user, close]);

  return null;
}

export function LoginUrlHandler() {
  return (
    <Suspense fallback={null}>
      <Handler />
    </Suspense>
  );
}
