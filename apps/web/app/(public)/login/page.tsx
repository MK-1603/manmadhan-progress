"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { open, setAuthData } = useAuth();

  useEffect(() => {
    const redirectParam = searchParams.get("redirect") || "";
    const errorParam = searchParams.get("error") || "";
    const tokenParam = searchParams.get("token") || "";
    const roleParam = searchParams.get("role") || "";
    const stepParam = searchParams.get("auth_step") || "EMAIL_ENTRY";

    setAuthData({ step: stepParam, token: tokenParam, role: roleParam, error: errorParam });

    // Build URL query params to trigger global AuthModal over the home page
    const params = new URLSearchParams();
    params.set("auth_step", stepParam);
    if (redirectParam) params.set("redirect", redirectParam);
    if (errorParam) params.set("error", errorParam);
    if (tokenParam) params.set("token", tokenParam);
    if (roleParam) params.set("role", roleParam);

    router.replace(`/?${params.toString()}`);
    open();
  }, [searchParams, router, setAuthData, open]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-foreground text-xs font-mono">
      Opening Secure Workspace Authentication...
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
