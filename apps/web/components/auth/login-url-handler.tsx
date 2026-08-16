"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "./auth-context";

function Handler() {
  const searchParams = useSearchParams();
  const { open, setAuthData } = useAuth();
  const searchParamsString = searchParams ? searchParams.toString() : "";

  useEffect(() => {
    const step = searchParams.get("auth_step");
    const redirectParam = searchParams.get("redirect");
    const errorMsg = searchParams.get("error");
    const emailParam = searchParams.get("email");

    if (step || redirectParam || errorMsg || emailParam) {
      const token = searchParams.get("token") || "";
      const role = searchParams.get("role") || "";
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
  }, [searchParamsString, open, setAuthData]);

  return null;
}

export function LoginUrlHandler() {
  return (
    <Suspense fallback={null}>
      <Handler />
    </Suspense>
  );
}
