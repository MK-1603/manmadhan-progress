"use client";

import { Menu } from "lucide-react";
import { NotificationDropdown } from "./notification-dropdown";
import { ProfileDropdown } from "./profile-dropdown";
import { WorkspaceSwitcher } from "./workspace-switcher";

import { usePathname } from "next/navigation";

function getPageTitle(pathname: string): { title: string; subtitle: string } {
  if (pathname.includes("/organization/members")) {
    return { title: "Organization Members", subtitle: "Team Roster & Assigned Leaders" };
  }
  if (pathname.includes("/organization/invitations")) {
    return { title: "Organization Invitations", subtitle: "Manage Invites & Master Table" };
  }
  if (pathname.includes("/dashboard")) {
    return { title: "Dashboard", subtitle: "Overview & Analytics" };
  }
  if (pathname.includes("/projects")) {
    return { title: "Projects", subtitle: "Workspace Execution Projects" };
  }
  if (pathname.includes("/tasks")) {
    return { title: "Tasks", subtitle: "Assigned Execution Items" };
  }
  if (pathname.includes("/progress")) {
    return { title: "Progress Updates", subtitle: "Velocity & Deliverables" };
  }
  if (pathname.includes("/inbox")) {
    return { title: "Inbox", subtitle: "Messages & Notifications" };
  }
  if (pathname.includes("/teams")) {
    return { title: "Teams & Departments", subtitle: "People Management" };
  }
  if (pathname.includes("/attendance")) {
    return { title: "Attendance", subtitle: "Time & Check-ins" };
  }
  if (pathname.includes("/leave")) {
    return { title: "Leave Management", subtitle: "Balances & Requests" };
  }
  if (pathname.includes("/approvals")) {
    return { title: "Approvals", subtitle: "Review & Sign-offs" };
  }
  if (pathname.includes("/analytics")) {
    return { title: "Analytics", subtitle: "Performance Metrics" };
  }
  if (pathname.includes("/reports")) {
    return { title: "Reports", subtitle: "Generated Executive Reports" };
  }
  if (pathname.includes("/chat")) {
    return { title: "Real-time Chat", subtitle: "Team Messaging" };
  }

  // Fallback title formatting
  const parts = pathname.split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1] || "Dashboard";
  const formattedTitle = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, " ");
  return { title: formattedTitle, subtitle: "Workspace View" };
}

export function MobileHeader() {
  const pathname = usePathname();
  const { title } = getPageTitle(pathname);

  return (
    <header className="md:hidden flex items-center justify-between pt-[max(1.1rem,env(safe-area-inset-top))] pb-3 px-5 border-b border-border bg-card sticky top-0 z-40">
      
      {/* LEFT: Menu & Workspace */}
      <div className="flex items-center gap-3 min-w-0">
        <button 
          onClick={() => window.dispatchEvent(new Event('open-sidebar'))}
          className="p-1.5 -ml-1.5 rounded-lg text-foreground hover:bg-accent transition-colors shrink-0 focus:outline-none"
        >
          <Menu className="w-5.5 h-5.5 stroke-[2]" />
        </button>
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
