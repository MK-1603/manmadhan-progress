"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

function Handler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { open, setAuthData } = useAuth();

  useEffect(() => {
    const step = searchParams.get("auth_step");
    const redirectParam = searchParams.get("redirect");
    
    if (step || redirectParam) {
      const token = searchParams.get("token") || "";
      const role = searchParams.get("role") || "";
      const errorMsg = searchParams.get("error") || "";
      
      setAuthData({ step: step || "EMAIL_ENTRY", token, role, error: errorMsg });
      
      // Clean up the URL so it looks nice, but preserve redirect if any.
      // Avoid infinite loop by only replacing if there's actually a step, token, or error to clear.
      if (step || token || errorMsg || role) {
        if (redirectParam) {
          router.replace(`/?redirect=${encodeURIComponent(redirectParam)}`, { scroll: false });
        } else {
          router.replace("/", { scroll: false });
        }
      }
      
      // Open the global AuthModal
      open();
    }
  }, [searchParams, open, setAuthData, router]);

  return null;
}

export function LoginUrlHandler() {
  return (
    <Suspense fallback={null}>
      <Handler />
    </Suspense>
  );
}
