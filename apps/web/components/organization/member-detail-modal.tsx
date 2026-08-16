"use client";

import { useState, useEffect } from "react";
import {
  Briefcase, CheckSquare, Users, AlertCircle, Loader2, Trophy, Clock, ChevronRight, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { GlobalSheet } from "@/components/ui/global-sheet";

type Tab = "profile" | "projects" | "tasks" | "performance";

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string | null;
}

export function MemberDetailModal({ isOpen, onClose, personId }: MemberDetailModalProps) {
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const fetchPerson = async () => {
    if (!personId) return;
    setLoading(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.get(
        `/organization/people/${personId}/summary?workspaceId=${workspaceId}`
      );
      if (res.data.success) {
        setPerson(res.data.data);
      } else {
        setError(res.data.error || "Failed to load profile");
      }
    } catch {
      setError("Unable to load member profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && personId) {
      setActiveTab("profile");
      fetchPerson();
    } else {
      setPerson(null);
      setError("");
    }
  }, [isOpen, personId]);

  if (!isOpen) return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error || !person) {
      return (
        <div className="p-6">
          <div className="flex items-center gap-2 p-4 bg-card border border-border rounded-xl text-[13px] text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error || "Member profile not found."}
          </div>
        </div>
      );
    }

    const tabs: { id: Tab; label: string }[] = [
      { id: "profile", label: "Profile" },
      { id: "projects", label: "Projects" },
      { id: "tasks", label: "Tasks" },
      { id: "performance", label: "Performance" },
    ];

    return (
      <div className="p-5 sm:p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border-2 border-blue-500/30 text-blue-500 font-bold text-xl flex items-center justify-center shrink-0">
                {person.name ? person.name.charAt(0).toUpperCase() : "M"}
              </div>
              <div>
                <h1 className="text-[16px] sm:text-[18px] font-bold text-foreground leading-tight truncate max-w-[200px] sm:max-w-xs">
                  {person.name}
                </h1>
                <p className="text-[12px] text-muted-foreground mt-0.5 truncate max-w-[200px] sm:max-w-xs">{person.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    MEMBER
                  </span>
                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                      person.status === "ACTIVE" || person.status === "Activated"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {person.status || "ACTIVE"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-border">
            {[
              { label: "Projects", value: person.projectsCount ?? 0, color: "text-amber-500" },
              { label: "Tasks", value: person.tasksCount ?? 0, color: "text-blue-500" },
              { label: "Completed", value: person.completedTasks ?? 0, color: "text-emerald-500" },
              { label: "Overdue", value: person.overdueTasks ?? 0, color: person.overdueTasks > 0 ? "text-rose-500" : "text-emerald-500" },
            ].map((stat) => (
              <div key={stat.label} className="bg-background border border-border rounded-xl p-3 text-center">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className={`text-[18px] font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <h2 className="text-[13px] font-bold text-foreground">Organization Role</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="px-4 py-3 bg-background border border-border rounded-xl">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Role</p>
                    <p className="text-[13px] font-semibold text-foreground mt-1">MEMBER</p>
                  </div>
                  <div className="px-4 py-3 bg-background border border-border rounded-xl">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Status</p>
                    <p className="text-[13px] font-semibold text-foreground mt-1">{person.status || "ACTIVE"}</p>
                  </div>
                  <div className="px-4 py-3 bg-background border border-border rounded-xl">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Reports To</p>
                    <p className="text-[13px] font-semibold text-foreground mt-1 truncate">
                      {person.assignedCoCeoName
                        ? `${person.assignedCoCeoName} (CO-CEO)`
                        : "Organization Leadership"}
                    </p>
                  </div>
                  <div className="px-4 py-3 bg-background border border-border rounded-xl">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Email</p>
                    <p className="text-[13px] font-semibold text-foreground mt-1 truncate">{person.email}</p>
                  </div>
                </div>
              </div>

              {/* Current Work */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="text-[13px] font-bold text-foreground mb-3">Current Work</h2>
                {person.currentWork ? (
                  <div className="px-4 py-3 bg-background border border-border rounded-xl space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Active Task</p>
                    <p className="text-[13px] font-semibold text-foreground">{person.currentWork.title}</p>
                    {person.currentWork.projectName && (
                      <p className="text-[11px] text-amber-500 font-medium">{person.currentWork.projectName}</p>
                    )}
                    <span className="inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 mt-1">
                      {person.currentWork.status}
                    </span>
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground">No active task currently assigned.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "projects" && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-bold text-foreground">Assigned Projects</h2>
                <span className="text-[11px] text-muted-foreground">{person.projectsCount ?? 0} total</span>
              </div>
              {(person.projectsCount ?? 0) === 0 ? (
                <div className="text-center py-10 text-[12px] text-muted-foreground">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  No projects assigned yet.
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3 bg-background border border-border rounded-xl">
                  <span className="text-[12px] font-semibold text-foreground">
                    {person.projectsCount} project(s) assigned
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-bold text-foreground">Tasks</h2>
                <span className="text-[11px] text-muted-foreground">{person.tasksCount ?? 0} total</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "In Progress", value: Math.max(0, (person.tasksCount ?? 0) - (person.completedTasks ?? 0) - (person.overdueTasks ?? 0)), color: "text-blue-500" },
                  { label: "Completed", value: person.completedTasks ?? 0, color: "text-emerald-500" },
                  { label: "Overdue", value: person.overdueTasks ?? 0, color: "text-rose-500" },
                ].map((s) => (
                  <div key={s.label} className="bg-background border border-border rounded-xl p-3 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight sm:tracking-widest truncate">{s.label}</p>
                    <p className={`text-[18px] font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "performance" && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h2 className="text-[13px] font-bold text-foreground">Performance Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Total Tasks", value: person.tasksCount ?? 0 },
                  { label: "Completed", value: person.completedTasks ?? 0 },
                  { label: "Overdue", value: person.overdueTasks ?? 0 },
                  {
                    label: "Completion Rate",
                    value: person.tasksCount > 0
                      ? `${Math.round(((person.completedTasks ?? 0) / person.tasksCount) * 100)}%`
                      : "—"
                  },
                  { label: "Active Projects", value: person.projectsCount ?? 0 },
                  { label: "Reports To", value: person.assignedCoCeoName || "—" },
                ].map((s) => (
                  <div key={s.label} className="bg-background border border-border rounded-xl p-3 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight sm:tracking-widest truncate">{s.label}</p>
                    <p className="text-[14px] font-bold text-foreground mt-0.5 truncate">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <GlobalSheet
      open={isOpen}
      onClose={onClose}
      showHandle={true}
      showClose={true}
      desktopMode="modal"
      desktopMaxWidth="max-w-[600px]"
    >
      {renderContent()}
    </GlobalSheet>
  );
}
