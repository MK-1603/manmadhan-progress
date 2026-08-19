"use client";

import React, { useState } from "react";
import {
  LayoutDashboard, Target, Users, FolderKanban, CheckSquare, GitBranch,
  Calendar, Clock, ShieldCheck, BarChart3, History, Network, FileText,
  Bookmark, Settings, ChevronDown, X
} from "lucide-react";

export interface OrgNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  badge?: number | string;
}

export interface OrgNavGroup {
  id: string;
  label: string;
  items: OrgNavItem[];
}

export const ORG_NAV_GROUPS: OrgNavGroup[] = [
  {
    id: "overview",
    label: "OVERVIEW",
    items: [
      { id: "overview", label: "Dashboard", icon: LayoutDashboard, description: "Executive command center & statistics" },
      { id: "focus", label: "Focus", icon: Target, description: "Organization priorities & urgent execution focus" },
    ],
  },
  {
    id: "execution",
    label: "EXECUTION",
    items: [
      { id: "projects", label: "Projects", icon: FolderKanban, description: "Individual & collaborative projects" },
      { id: "tasks", label: "Tasks", icon: CheckSquare, description: "Task responsibility & lifecycle management" },
      { id: "workflow", label: "Workflow", icon: GitBranch, description: "Task & approval lifecycle rules" },
      { id: "calendar", label: "Calendar", icon: Calendar, description: "Deadlines, milestones & operational calendar" },
      { id: "timeline", label: "Timeline", icon: History, description: "Real-time execution timeline" },
    ],
  },
  {
    id: "people",
    label: "PEOPLE",
    items: [
      { id: "people", label: "People", icon: Users, description: "CO-CEOs, members & organization directory" },
      { id: "graph", label: "Organization Graph", icon: Network, description: "Interactive reporting hierarchy" },
    ],
  },
  {
    id: "governance",
    label: "GOVERNANCE",
    items: [
      { id: "approvals", label: "Approvals", icon: ShieldCheck, description: "Pending request & review queue" },
      { id: "working-hours", label: "Working Hours", icon: Clock, description: "Operational schedule & policy" },
      { id: "performance", label: "Performance", icon: BarChart3, description: "Organization & team analytics" },
      { id: "audit", label: "Audit Log", icon: History, description: "Immutable organization audit stream" },
    ],
  },
  {
    id: "resources",
    label: "RESOURCES",
    items: [
      { id: "documents", label: "Documents", icon: FileText, description: "8-stage document lifecycle system" },
      { id: "templates", label: "Templates", icon: Bookmark, description: "Document & task template library" },
    ],
  },
  {
    id: "organization",
    label: "ORGANIZATION",
    items: [
      { id: "settings", label: "Settings", icon: Settings, description: "Organization configuration & preferences" },
    ],
  },
];

export const ORG_NAV_ITEMS: OrgNavItem[] = ORG_NAV_GROUPS.flatMap((group) => group.items);

export interface OrganizationNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function OrganizationNavigation({
  activeTab,
  onTabChange,
  className = "",
}: OrganizationNavigationProps) {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const activeItem = ORG_NAV_ITEMS.find((item) => item.id === activeTab) || ORG_NAV_ITEMS[0];

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Selector Bar (Shown under 768px) */}
      <div className="md:hidden w-full px-4 py-2.5 bg-[#090B0F]/60 border-b border-white/10">
        <button
          type="button"
          onClick={() => setIsMobileSheetOpen(true)}
          className="w-full h-10 px-3.5 bg-[#0F1218] border border-white/10 rounded-xl flex items-center justify-between text-xs font-semibold text-[#F4F7F5] shadow-xs active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-2.5 truncate">
            <activeItem.icon className="w-4 h-4 text-gold shrink-0" />
            <span className="truncate">{activeItem.label}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#9AA4B2] text-[11px] shrink-0">
            <span className="font-mono font-bold">Menu</span>
            <ChevronDown className="w-3.5 h-3.5 text-gold" />
          </div>
        </button>
      </div>

      {/* Desktop Navigation Rail List Grouped */}
      <div className="hidden md:flex flex-col w-full space-y-4 select-none">
        {ORG_NAV_GROUPS.map((group) => (
          <div key={group.id} className="space-y-0.5">
            <div className="px-3 text-[10px] font-mono font-bold text-[#667085] uppercase tracking-widest mb-1">
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive = item.id === activeTab;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`relative w-full h-[38px] flex items-center gap-2.5 px-3 rounded-lg text-xs transition-colors duration-150 cursor-pointer text-left ${
                    isActive
                      ? "bg-[#141820] text-[#F4F7F5] font-bold border border-white/10 shadow-xs"
                      : "text-[#9AA4B2] hover:text-[#F4F7F5] hover:bg-[#0F1218]/60 font-medium"
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gold" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-gold" : "text-[#667085]"}`} />
                  <span className="truncate leading-none">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#0B0E13] text-[#9AA4B2] border border-white/10">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile Bottom Sheet Drawer */}
      {isMobileSheetOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 md:hidden">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileSheetOpen(false)}
          />
          <div className="relative bg-[#0F1218] border-t border-white/10 rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 z-10 pb-[calc(16px+env(safe-area-inset-bottom))]">
            {/* Sheet Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#F4F7F5] uppercase tracking-wider">
                  Organization Navigation
                </span>
                <span className="text-[10px] text-[#667085] font-mono">
                  Select governance destination
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="p-1.5 rounded-lg bg-[#0B0E13] text-[#9AA4B2] hover:text-[#F4F7F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Items Grouped List */}
            <div className="overflow-y-auto p-3 space-y-4 max-h-[65vh]">
              {ORG_NAV_GROUPS.map((group) => (
                <div key={group.id} className="space-y-1">
                  <div className="px-3 text-[10px] font-mono font-bold text-[#667085] uppercase tracking-widest">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const isActive = item.id === activeTab;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onTabChange(item.id);
                          setIsMobileSheetOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs flex items-center gap-3 transition-colors ${
                          isActive
                            ? "bg-gold/15 text-gold font-bold border border-gold/40 shadow-xs"
                            : "text-[#F4F7F5] hover:bg-[#141820] border border-transparent"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-gold" : "text-[#667085]"}`} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold truncate leading-tight">{item.label}</span>
                          {item.description && (
                            <span className="text-[10.5px] text-[#9AA4B2] font-normal truncate mt-0.5">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
