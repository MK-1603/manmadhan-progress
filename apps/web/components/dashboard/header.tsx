"use client";

import React, { useState, useEffect, useRef } from "react";
import { NotificationDropdown } from "./notification-dropdown";
import { ProfileDropdown } from "./profile-dropdown";
import { WorkspaceSearch } from "./workspace-search";
import { ThemeToggle } from "./theme-toggle";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useAuth } from "../auth/auth-context";
import { useSocket } from "@/components/providers/socket-provider";

function getPageTitle(pathname: string): { title: string; subtitle: string } {
  // Organization routes
  if (pathname.match(/\/(ceo|co-ceo|member)\/dashboard/)) return { title: "Dashboard", subtitle: "Overview & Analytics" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/focus/)) return { title: "Focus", subtitle: "Deep Work Sessions" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/projects\/[^/]+\/edit/)) return { title: "Edit Project", subtitle: "Update Project Details" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/projects\/[^/]+/)) return { title: "Project Details", subtitle: "Execution Center" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/projects/)) return { title: "Projects", subtitle: "Organization Projects" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/tasks\/[^/]+/)) return { title: "Task Details", subtitle: "Task Execution" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/tasks/)) return { title: "Tasks", subtitle: "Assigned Work Items" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/calendar/)) return { title: "Calendar", subtitle: "Organization Schedule" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/timeline/)) return { title: "Timeline", subtitle: "Activity History" };
  if (pathname.includes("/co-ceos")) return { title: "CO-CEOs", subtitle: "Leadership Team" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/members/)) return { title: "Members", subtitle: "Team Roster" };
  if (pathname.includes("/invitations")) return { title: "Invitations", subtitle: "Manage Invitations" };
  if (pathname.match(/\/co-ceo\/my-work/)) return { title: "My Work", subtitle: "Tasks Assigned to You" };
  if (pathname.match(/\/co-ceo\/submissions/)) return { title: "Submissions", subtitle: "Review Member Work" };
  if (pathname.match(/\/co-ceo\/automation/)) return { title: "Automation", subtitle: "Workflow Rules & Events" };
  if (pathname.match(/\/member\/my-work/)) return { title: "My Work", subtitle: "Your Assigned Tasks" };
  if (pathname.match(/\/member\/progress/)) return { title: "My Progress", subtitle: "Personal Execution Summary" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/reports/)) return { title: "Reports", subtitle: "Performance Metrics" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/leaderboard/)) return { title: "Leaderboard", subtitle: "Team Rankings" };
  if (pathname.includes("/approvals")) return { title: "Approvals", subtitle: "Review & Sign-offs" };
  if (pathname.includes("/requests")) return { title: "Requests", subtitle: "Pending Requests" };
  if (pathname.includes("/audit")) return { title: "Audit Log", subtitle: "Organization Activity History" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/documents/)) return { title: "Documents", subtitle: "Organization Files" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/notes/)) return { title: "Notes", subtitle: "Organization Notes" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/integrations/)) return { title: "Integrations", subtitle: "Connected Services" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/settings/)) return { title: "Settings", subtitle: "Organization Configuration" };
  if (pathname.match(/\/(ceo|co-ceo|member)\/notifications/)) return { title: "Notifications", subtitle: "Real-time Updates" };
  // Personal routes
  if (pathname.includes("/personal/dashboard")) return { title: "Dashboard", subtitle: "Personal Overview" };
  if (pathname.includes("/personal/focus")) return { title: "Focus", subtitle: "Deep Work Sessions" };
  if (pathname.includes("/personal/projects")) return { title: "Projects", subtitle: "Personal Projects" };
  if (pathname.includes("/personal/tasks")) return { title: "Tasks", subtitle: "Personal Tasks" };
  if (pathname.includes("/personal/calendar")) return { title: "Calendar", subtitle: "Personal Schedule" };
  if (pathname.includes("/personal/timeline")) return { title: "Timeline", subtitle: "Activity History" };
  if (pathname.includes("/personal/notes")) return { title: "Notes", subtitle: "Personal Notes" };
  if (pathname.includes("/personal/documents")) return { title: "Documents", subtitle: "Personal Files" };
  if (pathname.includes("/personal/reports")) return { title: "Reports", subtitle: "Personal Analytics" };
  if (pathname.includes("/personal/settings")) return { title: "Settings", subtitle: "Personal Preferences" };
  if (pathname.includes("/personal/notifications")) return { title: "Notifications", subtitle: "Your Notifications" };
  // Fallback
  const parts = pathname.split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1] || "Dashboard";
  const formattedTitle = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, " ");
  return { title: formattedTitle, subtitle: "Workspace View" };
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { title } = getPageTitle(pathname);
  const { user, isLoading } = useAuth();
  const { socket } = useSocket();

  const isPersonal = pathname?.startsWith("/personal");
  const userRole = (user?.role || "CEO").toUpperCase();

  const [orgWorkspace, setOrgWorkspace] = useState<any>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    const fetchOrg = async () => {
      try {
        const res = await apiClient.get("/workspaces");
        if (res.data.success && res.data.data.length > 0) {
          setOrgWorkspace(res.data.data[0]);
        }
      } catch (e) {
        console.error("Failed to fetch workspaces:", e);
      }
    };
    fetchOrg();
  }, [user, isLoading]);

  useEffect(() => {
    if (!socket) return;
    const handleOrganizationUpdated = (updated: any) => setOrgWorkspace((current: any) => current ? { ...current, ...updated } : updated);
    socket.on("organization.updated", handleOrganizationUpdated);
    return () => { socket.off("organization.updated", handleOrganizationUpdated); };
  }, [socket]);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setIsSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSwitch = (mode: "personal" | "org") => {
    setIsSwitcherOpen(false);
    if (mode === "personal") {
      window.location.href = "/personal/dashboard";
    } else {
      // Derive target path from actual user role, not just pathname
      const role = (user?.role || "CEO").toUpperCase();
      let targetPath = "/ceo/dashboard";
      if (role === "CO-CEO") targetPath = "/co-ceo/dashboard";
      else if (role === "MEMBER") targetPath = "/member/dashboard";
      
      if (orgWorkspace) {
        localStorage.setItem("workspaceId", orgWorkspace.id);
      }
      window.location.href = targetPath;
    }
  };

  const currentWorkspaceName = isPersonal 
    ? "Personal Workspace" 
    : (orgWorkspace ? orgWorkspace.name : "Organization Workspace");

  return (
    <header className="hidden md:flex items-center justify-between h-16 w-full shrink-0 px-6 lg:px-8 border-b border-border bg-background z-40 gap-4">
      {/* LEFT: Dynamic Page Title with Workspace Switcher */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex flex-col justify-center min-w-0 relative" ref={switcherRef}>
          <h1 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight leading-none truncate">
            {title}
          </h1>
          <button 
            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors mt-1.5 focus:outline-none select-none"
          >
            <span className="truncate max-w-[120px] sm:max-w-[180px]">
              {currentWorkspaceName}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isSwitcherOpen ? "rotate-180 text-gold" : "text-muted-foreground"}`} />
          </button>

          <AnimatePresence>
            {isSwitcherOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-2xl p-1.5 z-50 flex flex-col gap-1"
              >
                <div className="px-2 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  Switch Workspace
                </div>

                <button
                  onClick={() => handleSwitch("personal")}
                  className={`flex items-center justify-between px-2.5 py-2 w-full text-left rounded-lg text-xs font-semibold transition-colors focus:outline-none ${
                    isPersonal 
                      ? "bg-accent text-foreground" 
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <span className="truncate flex-1 text-[11.5px]">Personal Workspace</span>
                  {isPersonal && <Check className="w-3.5 h-3.5 text-gold shrink-0 ml-2" />}
                </button>

                <button
                  onClick={() => handleSwitch("org")}
                  className={`flex items-center justify-between px-2.5 py-2 w-full text-left rounded-lg text-xs font-semibold transition-colors focus:outline-none ${
                    !isPersonal 
                      ? "bg-accent text-foreground" 
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <span className="truncate flex-1 text-[11.5px]">
                    {orgWorkspace ? orgWorkspace.name : "Organization Workspace"}
                  </span>
                  {!isPersonal && <Check className="w-3.5 h-3.5 text-gold shrink-0 ml-2" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CENTER: Global Search */}
      <WorkspaceSearch />

      {/* RIGHT: Notifications & Profile Dropdowns */}
      <div className="flex items-center justify-end gap-3 flex-1">
        <ThemeToggle />
        <NotificationDropdown />
        <ProfileDropdown />
      </div>
    </header>
  );
}
