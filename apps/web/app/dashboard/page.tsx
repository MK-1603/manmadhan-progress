"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { getDashboardPathForRole } from "@/components/auth/auth-context";

export default function GenericDashboardRedirectPage() {
  const router = useRouter();
  const { user, isLoading, authStatus } = useAuth();

  useEffect(() => {
    if (isLoading || authStatus === "initializing") return;

    if (authStatus === "authenticated" && user) {
      const targetPath = getDashboardPathForRole(user.role);
      router.replace(targetPath);
    } else if (authStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [user, isLoading, authStatus, router]);

  return (
    <div className="min-h-screen bg-[#060806] flex flex-col items-center justify-center text-center p-6 space-y-4 select-none">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[#F3FFF0] tracking-tight">ManMadhan Progress</h1>
        <p className="text-xs font-mono text-[#DDB52F] uppercase tracking-widest">Routing Workspace</p>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <span className="w-2 h-2 rounded-full bg-[#DDB52F] animate-pulse" />
        <p className="text-xs text-[#9AA2AF] font-mono">Redirecting to your workspace dashboard...</p>
      </div>
    </div>
  );
}
