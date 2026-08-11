"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Mail, Calendar, Folder, CheckSquare, Clock, Users, AlertTriangle, CheckCircle2, ShieldCheck, Briefcase
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

interface PersonDetailDrawerProps {
  person: any | null;
  onClose: () => void;
}

export function PersonDetailDrawer({ person, onClose }: PersonDetailDrawerProps) {
  if (!person) return null;

  const isCoCeo = person.role === "CO-CEO";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-lg bg-card border-l border-border h-full shadow-2xl flex flex-col p-6 space-y-5 overflow-y-auto"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold text-sm flex items-center justify-center">
                {person.name ? person.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">{person.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {person.role || "Team Member"}
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                    person.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  }`}>
                    {person.status}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Reporting Line / Supervisor Context */}
          <div className="p-3 bg-background border border-border rounded-xl flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Reporting Line:</span>
            <span className="font-bold text-foreground">
              {isCoCeo ? "Reports directly to CEO" : person.assignedCoCeoName ? `Reports to: ${person.assignedCoCeoName} (CO-CEO)` : "Assigned to Organization Leadership"}
            </span>
          </div>

          {/* Summary Metric Strip */}
          <div className="grid grid-cols-3 gap-2.5">
            <PremiumCard className="p-3">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block">Projects</span>
              <span className="text-base font-bold text-amber-500">{person.projectsCount || 0}</span>
            </PremiumCard>
            <PremiumCard className="p-3">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block">Tasks</span>
              <span className="text-base font-bold text-blue-500">{person.tasksCount || 0}</span>
            </PremiumCard>
            <PremiumCard className="p-3">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                {isCoCeo ? "Team Members" : "Completed"}
              </span>
              <span className="text-base font-bold text-emerald-500">
                {isCoCeo ? person.membersCount || 0 : person.completedTasks || 0}
              </span>
            </PremiumCard>
          </div>

          {/* Current Active Work */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Current Active Work
            </label>
            {person.currentWork ? (
              <PremiumCard className="p-3.5 space-y-2 border-primary/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {person.currentWork.projectName}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {person.currentWork.deadline ? `Due: ${new Date(person.currentWork.deadline).toLocaleDateString()}` : "Active"}
                  </span>
                </div>
                <p className="text-xs font-bold text-foreground">{person.currentWork.title}</p>
              </PremiumCard>
            ) : (
              <div className="p-3 bg-background border border-border rounded-xl text-xs text-muted-foreground">
                No active task currently assigned.
              </div>
            )}
          </div>

          {/* Workload & Operational Stats */}
          <div className="space-y-2 text-xs">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
              Operational Performance & Workload
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-background border border-border rounded-xl flex items-center justify-between">
                <span className="text-muted-foreground">Focus Hours:</span>
                <span className="font-bold text-foreground">{person.focusHours || "0h"}</span>
              </div>
              <div className="p-3 bg-background border border-border rounded-xl flex items-center justify-between">
                <span className="text-muted-foreground">Overdue Tasks:</span>
                <span className={`font-bold ${person.overdueTasks > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                  {person.overdueTasks || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2 text-xs border-t border-border pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5" /> <span className="text-foreground font-medium">{person.email}</span>
            </div>
            {person.joinedAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" /> <span>Joined {new Date(person.joinedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Drawer Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
            >
              Close Profile
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
