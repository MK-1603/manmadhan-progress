"use client";

import React from "react";
import { Header } from "@/components/dashboard/header";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { OrgSidebar } from "@/components/organization/org-sidebar";
import { useAuth } from "@/components/auth/auth-context";
import { usePathname } from "next/navigation";
import { GlobalRefreshProvider, GlobalPullToRefreshContent } from "@/components/providers/global-refresh-provider";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const rawRole = (user?.role || "CEO").toUpperCase();
  const role: "CEO" | "CO-CEO" | "MEMBER" =
    rawRole.includes("CO") ? "CO-CEO" : rawRole.includes("MEMBER") ? "MEMBER" : "CEO";
  
  const base = role === "CO-CEO" ? "/co-ceo" : role === "MEMBER" ? "/member" : "/ceo";

  return (
    <GlobalRefreshProvider>
      <div className="flex h-[100dvh] w-full bg-background overflow-hidden font-sans">
        <OrgSidebar role={role} base={base} />
        <div className="flex-1 flex flex-col min-w-0 h-full w-full overflow-hidden">
          <Header />
          <MobileHeader />
          <main
            data-lenis-prevent
            className="flex-1 min-h-0 w-full max-w-full flex flex-col overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <GlobalPullToRefreshContent>
              {children}
            </GlobalPullToRefreshContent>
          </main>
          <BottomNav workspace="organization" role={role} />
        </div>
      </div>
    </GlobalRefreshProvider>
  );
}
