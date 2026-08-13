"use client";

import { Header } from "@/components/dashboard/header";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { OrgSidebar } from "@/components/organization/org-sidebar";
import { useAuth } from "@/components/auth/auth-context";
import { usePathname } from "next/navigation";

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

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      <OrgSidebar role={role} base={base} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <MobileHeader />
        <main data-lenis-prevent className="flex-1 overflow-y-auto overscroll-none pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <BottomNav workspace="organization" role={role} />
      </div>
    </div>
  );
}
