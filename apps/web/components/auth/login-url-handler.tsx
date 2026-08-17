"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth, getDashboardPathForRole, syncTokenCookie } from "./auth-context";

function Handler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { open, setAuthData, checkSession } = useAuth();
  const searchParamsString = searchParams ? searchParams.toString() : "";

  useEffect(() => {
    const step = searchParams.get("auth_step");
    const redirectParam = searchParams.get("redirect");
    const errorMsg = searchParams.get("error");
    const emailParam = searchParams.get("email");
    const token = searchParams.get("token") || "";
    const role = searchParams.get("role") || "";

    if (token && step === "OAUTH_SUCCESS") {
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
      checkSession();
      const targetDash = getDashboardPathForRole(role);
      router.push(targetDash);
      return;
    }

    if (step || redirectParam || errorMsg || emailParam) {
      const email = emailParam || "";

      setAuthData({ step: step || "EMAIL_ENTRY", token, role, error: errorMsg || "", email });

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
  }, [searchParamsString, open, setAuthData, checkSession, router]);

  return null;
}

export function LoginUrlHandler() {
  return (
    <Suspense fallback={null}>
      <Handler />
    </Suspense>
  );
}
