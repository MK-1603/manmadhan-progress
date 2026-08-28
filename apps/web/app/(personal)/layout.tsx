import { Header } from "@/components/dashboard/header";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { GlobalRefreshProvider, GlobalPullToRefreshContent } from "@/components/providers/global-refresh-provider";

export default function PersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GlobalRefreshProvider>
      <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full w-full overflow-hidden">
          <Header />
          <MobileHeader />
          <main data-lenis-prevent className="flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden pb-[calc(70px+env(safe-area-inset-bottom))] md:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <GlobalPullToRefreshContent>
              {children}
            </GlobalPullToRefreshContent>
          </main>
          <BottomNav workspace="personal" />
        </div>
      </div>
    </GlobalRefreshProvider>
  );
}
