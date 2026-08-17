"use client";

import { Header } from "@/components/dashboard/header";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { OrgSidebar } from "@/components/organization/org-sidebar";
import { useAuth } from "@/components/auth/auth-context";
import { usePathname } from "next/navigation";
import { GlobalRefreshProvider, GlobalPullToRefreshContent } from "@/components/providers/global-refresh-provider";

function getRole(pathname: string, userRole?: string): "CEO" | "CO-CEO" | "MEMBER" {
  if (pathname.startsWith("/co-ceo")) return "CO-CEO";
  if (pathname.startsWith("/member")) return "MEMBER";
  if (pathname.startsWith("/ceo")) return "CEO";
  const r = (userRole || "").toUpperCase();
  if (r === "CO-CEO") return "CO-CEO";
  if (r === "MEMBER") return "MEMBER";
  return "CEO";
}

function getBase(role: "CEO" | "CO-CEO" | "MEMBER"): string {
  if (role === "CO-CEO") return "/co-ceo";
  if (role === "MEMBER") return "/member";
  return "/ceo";
}

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = getRole(pathname, user?.role);
  const base = getBase(role);

  const isFixedViewportPage =
    pathname?.includes("/graph") ||
    pathname?.includes("/leaderboard") ||
    pathname?.includes("/tasks");

  return (
    <GlobalRefreshProvider>
      <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
        <OrgSidebar role={role} base={base} />
        <div className="flex-1 flex flex-col min-w-0 h-full w-full overflow-hidden">
          <Header />
          <MobileHeader />
          <main
            data-lenis-prevent
            className={`flex-1 min-h-0 w-full max-w-full flex flex-col overflow-x-hidden ${
              isFixedViewportPage
                ? "overflow-hidden pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0"
                : "overflow-y-auto pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0"
            } [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
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
