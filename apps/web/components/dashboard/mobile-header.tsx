"use client";

import { Menu } from "lucide-react";
import { NotificationDropdown } from "./notification-dropdown";
import { ProfileDropdown } from "./profile-dropdown";
import { WorkspaceSwitcher } from "./workspace-switcher";

import { usePathname } from "next/navigation";

function getPageTitle(pathname: string): { title: string; subtitle: string } {
  if (pathname.match(/\/(ceo|co-ceo|member)\/dashboard/)) return { title: "Dashboard", subtitle: "Overview" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/focus/)) return { title: "Focus", subtitle: "Deep Work" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/projects\/[^/]+/)) return { title: "Project", subtitle: "Details" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/projects/)) return { title: "Projects", subtitle: "All Projects" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/tasks\/[^/]+/)) return { title: "Task", subtitle: "Details" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/tasks/)) return { title: "Tasks", subtitle: "Work Items" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/calendar/)) return { title: "Calendar", subtitle: "Schedule" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/timeline/)) return { title: "Timeline", subtitle: "History" };
  if (pathname.includes("/co-ceos")) return { title: "CO-CEOs", subtitle: "Leadership" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/members/)) return { title: "Members", subtitle: "Team" };
  if (pathname.includes("/invitations")) return { title: "Invitations", subtitle: "Invite" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/reports/)) return { title: "Reports", subtitle: "Analytics" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/leaderboard/)) return { title: "Leaderboard", subtitle: "Rankings" };
  if (pathname.includes("/approvals")) return { title: "Approvals", subtitle: "Review" };
  if (pathname.includes("/requests")) return { title: "Requests", subtitle: "Pending" };
  if (pathname.includes("/audit")) return { title: "Audit Log", subtitle: "History" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/documents/)) return { title: "Documents", subtitle: "Files" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/notes/)) return { title: "Notes", subtitle: "Notes" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/integrations/)) return { title: "Integrations", subtitle: "Services" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/settings/)) return { title: "Settings", subtitle: "Configuration" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/notifications/)) return { title: "Notifications", subtitle: "Updates" };
  if (pathname.includes("/personal/dashboard")) return { title: "Dashboard", subtitle: "Personal" };
  if (pathname.includes("/personal/focus")) return { title: "Focus", subtitle: "Deep Work" };
  if (pathname.includes("/personal/projects")) return { title: "Projects", subtitle: "Personal" };
  if (pathname.includes("/personal/tasks")) return { title: "Tasks", subtitle: "Personal" };
  if (pathname.includes("/personal/calendar")) return { title: "Calendar", subtitle: "Schedule" };
  if (pathname.includes("/personal/settings")) return { title: "Settings", subtitle: "Preferences" };
  // Fallback
  const parts = pathname.split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1] || "Dashboard";
  return { title: lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, " "), subtitle: "Workspace" };
}

export function MobileHeader() {
  const pathname = usePathname();
  const { title } = getPageTitle(pathname);

  return (
    <header className="md:hidden flex items-center justify-between pt-[max(1.1rem,env(safe-area-inset-top))] pb-3 px-5 border-b border-border bg-card sticky top-0 z-40">
      
      {/* LEFT: Workspace Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-[12px] font-extrabold text-foreground leading-none truncate">
            {title}
          </span>
          <WorkspaceSwitcher />
        </div>
      </div>

      {/* Notifications & Profile */}
      <div className="flex items-center gap-3">
        <NotificationDropdown />
        <ProfileDropdown />
      </div>
    </header>
  );
}
