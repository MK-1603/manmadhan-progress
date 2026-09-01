"use client";

import { Header } from "@/components/dashboard/header";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { GlobalRefreshProvider, GlobalPullToRefreshContent } from "@/components/providers/global-refresh-provider";
import { usePWA } from "@/components/providers/pwa-provider";

import { MobileToastProvider } from "@/components/ui/mobile-toast";
import { PageTransition } from "@/components/ui/page-transition";

export default function PersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isStandalone } = usePWA();

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
              className="flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden pb-[calc(96px+env(safe-area-inset-bottom,0px))] md:pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <GlobalPullToRefreshContent>
                <PageTransition>{children}</PageTransition>
              </GlobalPullToRefreshContent>
            </main>
            <BottomNav workspace="personal" />
          </div>
        </div>
      </GlobalRefreshProvider>
    </MobileToastProvider>
  );
}
