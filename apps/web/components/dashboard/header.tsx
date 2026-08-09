"use client";

import React, { useState, useEffect, useRef } from "react";
import { NotificationDropdown } from "./notification-dropdown";
import { ProfileDropdown } from "./profile-dropdown";
import { WorkspaceSearch } from "./workspace-search";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useAuth } from "../auth/auth-context";

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

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { title } = getPageTitle(pathname);
  const { user } = useAuth();

  const isPersonal = pathname?.startsWith("/personal");
  const userRole = (user?.role || "CEO").toUpperCase();

  const [orgWorkspace, setOrgWorkspace] = useState<any>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await apiClient.get("/workspaces");
        if (res.data.success && res.data.data.length > 0) {
          setOrgWorkspace(res.data.data[0]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchOrg();
  }, []);

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
      let targetPath = "/ceo/dashboard";
      if (userRole === "CO-CEO") targetPath = "/co-ceo/dashboard";
      else if (userRole === "MEMBER") targetPath = "/member/dashboard";
      
      if (orgWorkspace) {
        localStorage.setItem("workspaceId", orgWorkspace.id);
      }
      window.location.href = targetPath;
    }
  };

  const currentWorkspaceName = isPersonal 
    ? "Personal Workspace" 
    : (orgWorkspace ? orgWorkspace.name : "ManMadhan Workspace");

  return (
    <header className="hidden md:flex items-center justify-between h-16 px-6 lg:px-8 border-b border-border bg-background sticky top-0 z-40 gap-4">
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
                    {orgWorkspace ? orgWorkspace.name : "ManMadhan Workspace"}
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
        <NotificationDropdown />
        <ProfileDropdown />
      </div>
    </header>
  );
}
