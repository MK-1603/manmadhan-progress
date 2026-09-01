"use client";

import { Header } from "@/components/dashboard/header";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { useAuth } from "@/components/auth/auth-context";
import { usePathname } from "next/navigation";
import { GlobalRefreshProvider, GlobalPullToRefreshContent } from "@/components/providers/global-refresh-provider";

import { usePWA } from "@/components/providers/pwa-provider";

import { MobileToastProvider } from "@/components/ui/mobile-toast";
import { PageTransition } from "@/components/ui/page-transition";

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
  const { isStandalone } = usePWA();
  const pathname = usePathname();
  const { user } = useAuth();
  const role = getRole(pathname, user?.role);
  const base = getBase(role);

  const isCreationWorkflow =
    pathname?.includes("/projects/create") || pathname?.includes("/projects/new");

  const isFixedViewportPage =
    ((pathname?.includes("/graph") ||
     pathname?.includes("/leaderboard") ||
     pathname?.includes("/tasks") ||
     pathname === "/ceo/projects" ||
     pathname === "/co-ceo/projects" ||
     pathname === "/member/projects") &&
    !pathname?.includes("/create")) || isCreationWorkflow;

  const pbClass = isFixedViewportPage
    ? "overflow-hidden pb-0 md:pb-0"
    : isStandalone
    ? "overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom,0px))] md:pb-6"
    : "overflow-y-auto pb-4 md:pb-6";

  return (
    <MobileToastProvider>
      <GlobalRefreshProvider>
        <div className="flex h-screen h-[100dvh] w-full bg-background overflow-hidden font-sans">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 h-full w-full overflow-hidden">
            <Header />
            <MobileHeader />
            <main
              data-lenis-prevent
              className={`flex-1 min-h-0 w-full max-w-full flex flex-col overflow-x-hidden ${pbClass} [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
            >
              <GlobalPullToRefreshContent>
                <PageTransition>{children}</PageTransition>
              </GlobalPullToRefreshContent>
            </main>
            {!isCreationWorkflow && <BottomNav workspace="organization" role={role} />}
          </div>
        </div>
      </GlobalRefreshProvider>
    </MobileToastProvider>
  );
}
