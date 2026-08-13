"use client";

import React, { useState } from "react";
import {
  Building2,
  Shield,
  Users,
  Clock,
  Activity,
  Award,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";

interface OrgProfileViewProps {
  userRole: "CEO" | "CO-CEO" | "MEMBER";
  basePath: string;
}

type OrgProfileSection =
  | "info"
  | "code"
  | "role"
  | "membership"
  | "activity"
  | "rules";

export function OrgProfileView({ userRole, basePath }: OrgProfileViewProps) {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<OrgProfileSection | null>(null);

  const SECTIONS: {
    id: OrgProfileSection;
    title: string;
    description: string;
    icon: React.ElementType;
  }[] = [
    {
      id: "info",
      title: "Organization Information",
      description: "Organization name, description, and workspace metadata.",
      icon: Building2,
    },
    {
      id: "code",
      title: "Workspace & Batch Code",
      description: "Canonical workspace code (MK1603) and authorized batch context.",
      icon: Award,
    },
    {
      id: "role",
      title: "Current Role & Permissions",
      description: `Active role (${userRole}) and reporting relationship.`,
      icon: Shield,
    },
    {
      id: "membership",
      title: "Organization Membership",
      description: "Membership status, assigned CO-CEO, and workspace directory.",
      icon: Users,
    },
    {
      id: "activity",
      title: "Organization Activity",
      description: "Audit trail of organization events and milestone progress.",
      icon: Activity,
    },
    {
      id: "rules",
      title: "Working Rules & Policy",
      description: "Organization working hours, system off rules, and execution policies.",
      icon: Clock,
    },
  ];

  return (
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Organization Profile</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Manage organization identity, workspace code MK1603, and role assignments.
          </p>
        </div>
      </header>

      {/* Main Two-Column Desktop Layout / Mobile Index View */}
      {!activeSection ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Organization Identity Card */}
          <div className="lg:col-span-1 p-6 rounded-xl border border-border bg-card shadow-xs flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gold/20 text-gold font-black text-2xl flex items-center justify-center border-2 border-gold/40 shadow-xs">
              MM
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">ManMadhan Organization</h2>
              <p className="text-xs text-muted-foreground font-medium">Batch Context: MK1603</p>
            </div>

            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-gold/10 text-gold border border-gold/20">
                MK1603
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                ROLE: {userRole}
              </span>
            </div>

            <div className="w-full border-t border-border pt-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Authenticated Member</span>
                <span className="font-bold text-foreground text-[11px]">
                  {user?.displayName || user?.name || "User"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Email</span>
                <span className="font-medium text-muted-foreground text-[11px] truncate max-w-[140px]">
                  {user?.email || ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Status</span>
                <span className="text-emerald-500 font-bold text-[11px]">Verified Member</span>
              </div>
            </div>
          </div>

          {/* Right Section Cards / Mobile Full-Width Rows */}
          <div className="lg:col-span-2 space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className="w-full p-4 md:p-5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left flex items-center justify-between group shadow-xs cursor-pointer min-h-[48px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-gold/10 text-gold flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {sec.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-medium truncate hidden sm:block">
                        {sec.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 md:hidden" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Native Full-Screen Mobile Sub-Page / Desktop Detail View */
        <div className="fixed inset-0 z-50 md:relative md:inset-auto bg-background md:bg-transparent overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-md pb-4 border-b border-border flex items-center justify-between">
            <button
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-gold transition-colors min-h-[44px] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Organization Profile</span>
            </button>
          </header>

          <main className="max-w-xl mx-auto space-y-6 pt-2">
            {activeSection === "info" && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-foreground">Organization Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-foreground mb-1">ORGANIZATION NAME</label>
                    <input
                      type="text"
                      value="ManMadhan Organization"
                      disabled
                      className="w-full h-11 px-3.5 rounded-lg bg-muted/40 border border-border font-medium text-foreground opacity-80"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-foreground mb-1">DESCRIPTION</label>
                    <textarea
                      rows={3}
                      value="Production SaaS application workspace for ManMadhan Progress."
                      disabled
                      className="w-full p-3 rounded-lg bg-muted/40 border border-border font-medium text-foreground opacity-80"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "code" && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-foreground">Workspace & Batch Code</h3>
                <div className="p-4 rounded-xl bg-gold/10 border border-gold/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">CANONICAL WORKSPACE CODE</span>
                    <span className="px-3 py-1 rounded-lg bg-gold text-black font-black text-xs">
                      MK1603
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Verified server-side batch context. Used for database queries, Socket.IO rooms, and organization authorization.
                  </p>
                </div>
              </div>
            )}

            {activeSection === "role" && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-foreground">Current Role & Scope</h3>
                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">ACTIVE ROLE</span>
                    <span className="font-black text-primary uppercase text-xs">{userRole}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {userRole === "CEO" && "Full administrative control over organization members, settings, and permissions."}
                    {userRole === "CO-CEO" && "Management authority over assigned members and progress review."}
                    {userRole === "MEMBER" && "Execution authority for assigned tasks and workspace contributions."}
                  </p>
                </div>
              </div>
            )}

            {activeSection === "membership" && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-foreground">Organization Membership</h3>
                <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between min-h-[48px]">
                  <div>
                    <p className="font-bold text-foreground">{user?.displayName || user?.name || "Member"}</p>
                    <p className="text-[10px] text-muted-foreground">{user?.email || ""}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                    VERIFIED {userRole}
                  </span>
                </div>
              </div>
            )}

            {activeSection === "activity" && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-foreground">Organization Activity</h3>
                <div className="p-4 rounded-xl border border-border bg-card text-xs space-y-1">
                  <p className="font-bold text-foreground">Organization Session Active</p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Context: MK1603 • Authorized at {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {activeSection === "rules" && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-foreground">Working Rules & Policy</h3>
                <div className="p-4 rounded-xl border border-border bg-card text-xs space-y-2">
                  <p className="font-bold text-foreground">Standard Working Hours</p>
                  <p className="text-[11px] text-muted-foreground">09:00 AM – 06:00 PM (IST)</p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
