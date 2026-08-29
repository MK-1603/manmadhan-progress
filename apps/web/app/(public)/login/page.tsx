"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth, getDashboardPathForRole, syncTokenCookie } from "@/components/auth/auth-context";

import { SafeNavigation } from "@/lib/safe-navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { open, close, setAuthData, checkSession, authStatus, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading || authStatus === "initializing") return;

    if (authStatus === "authenticated" && user) {
      close(true);
      const redirectParam = searchParams.get("redirect");
      const targetPath = (redirectParam && redirectParam.startsWith("/")) ? redirectParam : getDashboardPathForRole(user.role);
      SafeNavigation.replace(router, targetPath);
      return;
    }

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
      SafeNavigation.replace(router, targetDash);
      return;
    }

    setAuthData({ step: stepParam, token: tokenParam, role: roleParam, error: errorParam, email: emailParam });
    open();
  }, [searchParams, router, setAuthData, open, close, checkSession, authStatus, isLoading, user]);

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
