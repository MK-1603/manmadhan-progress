"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth, getDashboardPathForRole, syncTokenCookie } from "@/components/auth/auth-context";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { open, close, setAuthData, checkSession, authStatus, isLoading } = useAuth();

  useEffect(() => {
    const redirectParam = searchParams.get("redirect") || "";
    const errorParam = searchParams.get("error") || "";
    const tokenParam = searchParams.get("token") || "";
    const roleParam = searchParams.get("role") || "";
    const emailParam = searchParams.get("email") || "";
    const stepParam = searchParams.get("auth_step") || "EMAIL_ENTRY";

    if (tokenParam && stepParam === "OAUTH_SUCCESS") {
      close();
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", tokenParam);
        localStorage.setItem("token", tokenParam);
        syncTokenCookie(tokenParam);
      }
      checkSession();
      const targetDash = getDashboardPathForRole(roleParam);
      router.replace(targetDash);
      return;
    }

    setAuthData({ step: stepParam, token: tokenParam, role: roleParam, error: errorParam, email: emailParam });

    // Build URL query params to trigger global AuthModal over the home page
    const params = new URLSearchParams();
    params.set("auth_step", stepParam);
    if (redirectParam) params.set("redirect", redirectParam);
    if (errorParam) params.set("error", errorParam);
    if (tokenParam) params.set("token", tokenParam);
    if (roleParam) params.set("role", roleParam);
    if (emailParam) params.set("email", emailParam);

    router.replace(`/?${params.toString()}`);
    open();
  }, [searchParams, router, setAuthData, open, close, checkSession]);

  return (
    <div className="min-h-screen bg-[#060806] flex flex-col items-center justify-center text-center p-6 space-y-4 select-none">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[#F3FFF0] tracking-tight">ManMadhan Progress</h1>
        <p className="text-xs font-mono text-[#DDB52F] uppercase tracking-widest">Secure Workspace Authentication</p>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <span className="w-2 h-2 rounded-full bg-[#DDB52F] animate-pulse" />
        <p className="text-xs text-[#9AA2AF] font-mono" suppressHydrationWarning>
          {isLoading || authStatus === "initializing" ? "Checking secure session..." : "Opening authentication sheet..."}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060806] flex flex-col items-center justify-center text-center p-6 space-y-4 select-none">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#F3FFF0] tracking-tight">ManMadhan Progress</h1>
            <p className="text-xs font-mono text-[#DDB52F] uppercase tracking-widest">Secure Workspace Authentication</p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <span className="w-2 h-2 rounded-full bg-[#DDB52F] animate-pulse" />
            <p className="text-xs text-[#9AA2AF] font-mono">Initializing secure authentication...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
