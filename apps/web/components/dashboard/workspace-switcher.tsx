"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Building, User as UserIcon, Check, Plus } from "lucide-react";
import { useAuth } from "../auth/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { ResponsivePopover } from "../ui/responsive-popover";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";

export function WorkspaceSwitcher() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (isLoading || !user) return;
    const fetchWorkspaces = async () => {
      try {
        const res = await apiClient.get("/workspaces");
        if (res.data.success) {
          setWorkspaces(res.data.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch workspaces:", e);
      }
    };
    fetchWorkspaces();
  }, [user, isLoading]);

  useEffect(() => {
    if (!socket) return;
    const handleOrganizationUpdated = (updated: any) => setWorkspaces((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
    socket.on("organization.updated", handleOrganizationUpdated);
    return () => { socket.off("organization.updated", handleOrganizationUpdated); };
  }, [socket]);

  const isPersonal = pathname.startsWith("/personal");
  const activeWorkspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
  const userRole = (user?.role || "CEO").toUpperCase();

  const getActiveWorkspaceName = () => {
    if (isPersonal) return "Personal Workspace";
    const current = workspaces.find(w => w.id === activeWorkspaceId);
    return current ? current.name : "Organization Workspace";
  };

  const getActiveWorkspaceSubtitle = () => {
    if (isPersonal) return "Private workspace";
    return "Organization workspace";
  };

  const handleSwitch = (type: "personal" | "org", wsId?: string) => {
    setIsOpen(false);
    if (type === "personal") {
      window.location.href = "/personal/dashboard";
    } else if (wsId) {
      localStorage.setItem("workspaceId", wsId);
      let targetPath = "/ceo/dashboard";
      if (userRole === "CO-CEO") targetPath = "/co-ceo/dashboard";
      else if (userRole === "MEMBER") targetPath = "/member/dashboard";
      window.location.href = targetPath;
    }
  };

  const triggerContent = (
    <button 
      onClick={() => setIsOpen(!isOpen)}
      className="flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground hover:text-foreground transition-colors mt-1 focus:outline-none select-none"
    >
      <span className="truncate max-w-[140px]">
        {getActiveWorkspaceName()}
      </span>
      <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isOpen ? "rotate-180 text-gold" : "text-muted-foreground"}`} />
    </button>
  );

  return (
    <ResponsivePopover
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      align="left"
      desktopClassName="w-[280px] rounded-2xl border border-border/50 dark:border-[rgba(255,255,255,0.08)] bg-card dark:bg-[#141416] shadow-2xl overflow-hidden flex flex-col p-2 space-y-1 z-50"
      trigger={triggerContent}
    >
      {/* Mobile Drawer Content */}
      <div className="flex flex-col gap-2 p-1 max-w-full">
        <div className="px-2.5 pt-1.5 flex flex-col">
          <span className="text-sm font-extrabold text-foreground">Workspace</span>
          <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">Choose where you want to work</span>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-border/60 dark:bg-[rgba(255,255,255,0.06)] my-0.5" />

        {/* List Option A: Personal Workspace */}
        {/* 2-Column Grid */}
        <div className="grid grid-cols-2 gap-2 w-full px-2.5">
          {/* Option A: Personal Workspace */}
          <button
            onClick={() => handleSwitch("personal")}
            className={`h-[70px] p-2.5 rounded-xl border flex flex-col text-left justify-between transition-all focus:outline-none ${
              isPersonal 
                ? "bg-gold/5 dark:bg-[rgba(216,165,43,0.08)] border-gold/40 dark:border-[rgba(216,165,43,0.25)] text-foreground" 
                : "border-border/60 dark:border-[rgba(255,255,255,0.07)] bg-muted/10 dark:bg-[rgba(255,255,255,0.035)] text-muted-foreground hover:bg-accent/40 dark:hover:bg-[rgba(255,255,255,0.055)]"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <UserIcon className={`w-[18px] h-[18px] ${isPersonal ? "text-gold" : "text-muted-foreground dark:text-[#8B8B94]"}`} />
              {isPersonal && <Check className="w-[18px] h-[18px] text-gold shrink-0" />}
            </div>
            <div className="flex flex-col min-w-0 mt-1">
              <span className={`text-[13.5px] truncate leading-tight ${isPersonal ? "font-semibold text-foreground dark:text-[#F5F5F4]" : "font-semibold text-muted-foreground dark:text-[#D4D4D8]"}`}>Personal</span>
              <span className={`text-[11.5px] truncate leading-none mt-0.5 ${isPersonal ? "text-muted-foreground dark:text-[#A1A1AA] font-normal" : "text-muted-foreground/80 dark:text-[#85858F] font-normal"}`}>Private</span>
            </div>
          </button>

          {/* Option B: Organization Workspaces */}
          {workspaces.filter(ws => !ws.name.toLowerCase().includes("personal")).map(ws => {
            const isActive = !isPersonal && activeWorkspaceId === ws.id;
            return (
              <button
                key={ws.id}
                onClick={() => handleSwitch("org", ws.id)}
                className={`h-[70px] p-2.5 rounded-xl border flex flex-col text-left justify-between transition-all focus:outline-none ${
                  isActive 
                    ? "bg-gold/5 dark:bg-[rgba(216,165,43,0.08)] border-gold/40 dark:border-[rgba(216,165,43,0.25)] text-foreground" 
                    : "border-border/60 dark:border-[rgba(255,255,255,0.07)] bg-muted/10 dark:bg-[rgba(255,255,255,0.035)] text-muted-foreground hover:bg-accent/40 dark:hover:bg-[rgba(255,255,255,0.055)]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Building className={`w-[18px] h-[18px] ${isActive ? "text-gold" : "text-muted-foreground dark:text-[#8B8B94]"}`} />
                  {isActive && <Check className="w-[18px] h-[18px] text-gold shrink-0" />}
                </div>
                <div className="flex flex-col min-w-0 mt-1">
                  <span className={`text-[13.5px] truncate leading-tight ${isActive ? "font-semibold text-foreground dark:text-[#F5F5F4]" : "font-semibold text-muted-foreground dark:text-[#D4D4D8]"}`}>{ws.name.split(" ")[0]}</span>
                  <span className={`text-[11.5px] truncate leading-none mt-0.5 ${isActive ? "text-muted-foreground dark:text-[#A1A1AA] font-normal" : "text-muted-foreground/80 dark:text-[#85858F] font-normal"}`}>Organization</span>
                </div>
              </button>
            );
          })}
        </div>



        {/* Option D: Cancel Button (Mobile sheet fallback) */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden w-full h-10 mt-1 rounded-xl flex items-center justify-center bg-muted/65 hover:bg-muted text-xs font-bold text-muted-foreground transition-colors focus:outline-none"
        >
          Cancel
        </button>
      </div>
    </ResponsivePopover>
  );
}
