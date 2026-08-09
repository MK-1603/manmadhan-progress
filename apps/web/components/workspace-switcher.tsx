"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Building2, User, ChevronDown, Check } from "lucide-react";
import { ResponsivePopover } from "./ui/responsive-popover";

interface WorkspaceSwitcherProps {
  isCollapsed: boolean;
  isMobile: boolean;
}

export function WorkspaceSwitcher({ isCollapsed, isMobile }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isPersonal = pathname.startsWith("/personal");
  const [isOpen, setIsOpen] = useState(false);

  const handleWorkspaceSwitch = (mode: "org" | "personal") => {
    setIsOpen(false);
    if (mode === "org") {
      router.push("/ceo/dashboard");
    } else {
      router.push("/personal/dashboard");
    }
  };

  const triggerContent = (
    <button 
      onClick={() => setIsOpen(!isOpen)}
      className={`flex items-center justify-between w-full p-2.5 mt-3 rounded-2xl border border-border/70 bg-card hover:bg-accent/70 transition-all shadow-sm ${
        isOpen ? "bg-accent border-border ring-1 ring-gold/30" : ""
      } ${isCollapsed && !isMobile ? "justify-center px-2" : ""}`}
      title={isCollapsed && !isMobile ? (isPersonal ? "Personal Workspace" : "Organization Workspace") : undefined}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`flex items-center justify-center shrink-0 w-7 h-7 rounded-xl ${
          isPersonal ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-gold/15 text-gold border border-gold/30"
        }`}>
          {!isPersonal ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
        </div>
        {(!isCollapsed || isMobile) && (
          <div className="flex flex-col text-left overflow-hidden whitespace-nowrap justify-center min-w-0">
            <span className="text-xs font-bold text-foreground truncate leading-none">
              {!isPersonal ? "Organization" : "Personal"}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground truncate leading-tight mt-1">
              {!isPersonal ? "Enterprise OS" : "Personal Mode"}
            </span>
          </div>
        )}
      </div>
      {(!isCollapsed || isMobile) && (
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      )}
    </button>
  );

  return (
    <ResponsivePopover
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      desktopClassName="w-[230px] rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden flex flex-col p-2 space-y-1"
      trigger={triggerContent}
    >
      <div className="flex flex-col gap-1">
        <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">
          Workspace Mode
        </div>

        <button
          onClick={() => handleWorkspaceSwitch("org")}
          className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            !isPersonal 
              ? "bg-accent/80 text-foreground border border-border/60 shadow-xs" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left truncate">
              <span className="text-xs font-bold text-foreground">Organization</span>
              <span className="text-[10px] text-muted-foreground">Enterprise OS</span>
            </div>
          </div>
          {!isPersonal && <Check className="w-4 h-4 text-gold shrink-0" />}
        </button>

        <button
          onClick={() => handleWorkspaceSwitch("personal")}
          className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isPersonal 
              ? "bg-accent/80 text-foreground border border-border/60 shadow-xs" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left truncate">
              <span className="text-xs font-bold text-foreground">Personal</span>
              <span className="text-[10px] text-cyan-400 font-medium">Personal Mode</span>
            </div>
          </div>
          {isPersonal && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
        </button>
      </div>
    </ResponsivePopover>
  );
}
