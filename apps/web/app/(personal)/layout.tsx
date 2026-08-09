import { Header } from "@/components/dashboard/header";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Sidebar as PersonalSidebar } from "@/components/personal/sidebar";

export default function PersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      <PersonalSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <MobileHeader />
        <main data-lenis-prevent className="flex-1 overflow-y-auto overscroll-none pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
