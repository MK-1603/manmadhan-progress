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
  Check,
  Save,
  AlertCircle,
  FileText,
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
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Organization Profile</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Manage organization identity, workspace code MK1603, and role assignments.
          </p>
        </div>
      </header>

      {/* Main Two-Column Layout OR Section Detail View */}
      {!activeSection ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Organization Identity Card */}
          <div className="lg:col-span-1 p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col items-center text-center space-y-4">
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

          {/* Right Section Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className="p-5 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all text-left space-y-2 group shadow-xs hover:border-foreground/30 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-gold/10 text-gold flex items-center justify-center transition-colors">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-gold transition-colors">
                    {sec.title}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    {sec.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Inside Section Detail View */
        <div className="rounded-2xl border border-border bg-card p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <button
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Organization Profile
            </button>
          </div>

          {/* Render Active Section Form */}
          {activeSection === "info" && (
            <div className="space-y-4 max-w-lg text-xs">
              <h3 className="text-sm font-bold text-foreground">Organization Information</h3>
              <div>
                <label className="block font-bold text-foreground mb-1">ORGANIZATION NAME</label>
                <input
                  type="text"
                  value="ManMadhan Organization"
                  disabled
                  className="w-full h-10 px-3.5 rounded-xl bg-muted/40 border border-border font-medium text-foreground opacity-80"
                />
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">DESCRIPTION</label>
                <textarea
                  rows={3}
                  value="Production SaaS application workspace for ManMadhan Progress."
                  disabled
                  className="w-full p-3 rounded-xl bg-muted/40 border border-border font-medium text-foreground opacity-80"
                />
              </div>
            </div>
          )}

          {activeSection === "code" && (
            <div className="space-y-4 max-w-lg text-xs">
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
            <div className="space-y-4 max-w-lg text-xs">
              <h3 className="text-sm font-bold text-foreground">Current Role & Scope</h3>
              <div className="p-4 rounded-xl border border-border bg-background space-y-2">
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
            <div className="space-y-4 max-w-lg text-xs">
              <h3 className="text-sm font-bold text-foreground">Organization Membership</h3>
              <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
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
            <div className="space-y-4 max-w-lg text-xs">
              <h3 className="text-sm font-bold text-foreground">Organization Activity</h3>
              <div className="p-3.5 rounded-xl border border-border bg-background text-xs space-y-1">
                <p className="font-bold text-foreground">Organization Session Active</p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Context: MK1603 • Authorized at {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}

          {activeSection === "rules" && (
            <div className="space-y-4 max-w-lg text-xs">
              <h3 className="text-sm font-bold text-foreground">Working Rules & Policy</h3>
              <div className="p-3.5 rounded-xl border border-border bg-background text-xs space-y-2">
                <p className="font-bold text-foreground">Standard Working Hours</p>
                <p className="text-[11px] text-muted-foreground">09:00 AM – 06:00 PM (IST)</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
