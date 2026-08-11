"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap, CheckCircle2, AlertCircle, Clock, Play, Pause,
  ArrowRight, RefreshCw, Activity, Bell, ClipboardCheck,
  Users, Target, TrendingUp
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import { motion } from "framer-motion";

// Automation rules are defined as static configuration (triggered by backend events)
const AUTOMATION_RULES = [
  {
    id: "task-assigned-notify",
    name: "Task Assignment Notification",
    description: "When CEO assigns a task to this CO-CEO → notification sent + task appears in My Work",
    trigger: "CEO assigns task",
    action: "Notify CO-CEO + update My Work",
    status: "active",
    category: "Task",
    icon: Target,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "member-assignment-notify",
    name: "Member Task Assignment",
    description: "When CO-CEO creates and assigns a task → member notified + task enters Assigned state",
    trigger: "CO-CEO creates task for member",
    action: "Notify member + set status: Assigned",
    status: "active",
    category: "Task",
    icon: Users,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "submission-review",
    name: "Submission Review Alert",
    description: "When a member submits work → CO-CEO immediately notified for review",
    trigger: "Member sets status to Review",
    action: "Notify CO-CEO + add to Submissions queue",
    status: "active",
    category: "Submission",
    icon: ClipboardCheck,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "approval-complete",
    name: "Approval Score Calculation",
    description: "When CO-CEO approves a submission → task completed, score calculated, member notified, leaderboard updated",
    trigger: "CO-CEO approves submission",
    action: "Complete task + calculate score + notify member + update leaderboard",
    status: "active",
    category: "Submission",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "rejection-workflow",
    name: "Rejection Return Workflow",
    description: "When CO-CEO rejects a submission → reason recorded, member notified, task returned to In Progress",
    trigger: "CO-CEO rejects submission",
    action: "Record reason + notify member + return task to In Progress",
    status: "active",
    category: "Submission",
    icon: AlertCircle,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    id: "deadline-reminder",
    name: "Deadline Reminders",
    description: "Automatically notify when tasks are approaching their deadline or become overdue",
    trigger: "Deadline within 24h / deadline passed",
    action: "Notify assignee + CO-CEO + mark overdue in dashboard",
    status: "active",
    category: "Deadline",
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "overdue-automation",
    name: "Overdue Task Escalation",
    description: "When a task passes its deadline without submission → dashboard updated, reports flagged",
    trigger: "Deadline passed without submission",
    action: "Mark overdue + update dashboard + flag in reports",
    status: "active",
    category: "Deadline",
    icon: AlertCircle,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    id: "extension-workflow",
    name: "Deadline Extension Workflow",
    description: "Member requests extension → CO-CEO notified to approve or reject → new deadline applied",
    trigger: "Member requests deadline extension",
    action: "Notify CO-CEO → approve/reject → apply new deadline",
    status: "active",
    category: "Deadline",
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "system-off",
    name: "System Off (11:00 PM)",
    description: "At 11:00 PM daily — active focus sessions paused, timers stopped, system enters offline state",
    trigger: "Daily at 23:00",
    action: "Pause all active sessions + stop timers + show system-off state",
    status: "active",
    category: "System",
    icon: Pause,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  {
    id: "system-restart",
    name: "System Restart (4:00 AM)",
    description: "At 4:00 AM daily — system goes online, work resumes, carry-forward tasks updated",
    trigger: "Daily at 04:00",
    action: "System online + carry-forward overdue tasks + work allowed",
    status: "active",
    category: "System",
    icon: Play,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "score-leaderboard",
    name: "Score & Leaderboard Update",
    description: "When a task is approved — points awarded based on timeliness, leaderboard updated in real-time",
    trigger: "Task approved",
    action: "Award 10 pts (on-time) or 5 pts (late) + update leaderboard",
    status: "active",
    category: "Performance",
    icon: TrendingUp,
    color: "text-gold",
    bgColor: "bg-gold/10",
  },
  {
    id: "working-hours",
    name: "Working Hours Enforcement",
    description: "Focus sessions blocked outside 04:00–23:00. System enforces this server-side.",
    trigger: "Focus start/resume attempt",
    action: "Block if outside 04:00–23:00 window",
    status: "active",
    category: "System",
    icon: Activity,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

const CATEGORIES = ["All", "Task", "Submission", "Deadline", "Performance", "System"];
const categoryColor = (c: string) => {
  const m: Record<string, string> = {
    "Task": "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "Submission": "text-purple-500 bg-purple-500/10 border-purple-500/20",
    "Deadline": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Performance": "text-gold bg-gold/10 border-gold/20",
    "System": "text-muted-foreground bg-muted border-border",
  };
  return m[c] || "text-muted-foreground bg-muted border-border";
};

export default function CoCeoAutomationPage() {
  const [category, setCategory] = useState("All");
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleEvent = (event: any) => {
      setRecentEvents(prev => [
        { id: Date.now(), ...event, timestamp: new Date().toISOString() },
        ...prev.slice(0, 19),
      ]);
    };
    socket.on("task.updated", (d: any) => handleEvent({ type: "task.updated", detail: `Task updated: ${d.title || d.id}` }));
    socket.on("approval.updated", (d: any) => handleEvent({ type: "approval.updated", detail: `Submission ${d.status}: ${d.id}` }));
    socket.on("notification.created", (d: any) => handleEvent({ type: "notification.created", detail: `Notification: ${d.title}` }));
    socket.on("leaderboard.updated", () => handleEvent({ type: "leaderboard.updated", detail: "Leaderboard recalculated" }));
    socket.on("focus.started", (d: any) => handleEvent({ type: "focus.started", detail: `Focus started for task ${d.taskId}` }));
    socket.on("focus.stopped", (d: any) => handleEvent({ type: "focus.stopped", detail: `Focus stopped, duration: ${Math.round((d.durationSeconds || 0) / 60)}m` }));
    return () => {
      socket.off("task.updated");
      socket.off("approval.updated");
      socket.off("notification.created");
      socket.off("leaderboard.updated");
      socket.off("focus.started");
      socket.off("focus.stopped");
    };
  }, [socket]);

  const filtered = AUTOMATION_RULES.filter(r =>
    category === "All" || r.category === category
  );

  const stats = {
    active: AUTOMATION_RULES.filter(r => r.status === "active").length,
    total: AUTOMATION_RULES.length,
    recentRuns: recentEvents.length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
            CO-CEO
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Zap className="w-6 h-6 text-purple-500" /> Automation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Active workflow automations — all are enforced by the backend in real-time
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Rules", value: stats.active, color: "text-emerald-500", icon: CheckCircle2 },
          { label: "Total Rules", value: stats.total, color: "text-foreground", icon: Zap },
          { label: "Events (Session)", value: stats.recentRuns, color: "text-purple-500", icon: Activity },
        ].map(s => (
          <PremiumCard key={s.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </PremiumCard>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              category === c
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Rules list */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.map((rule, i) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <PremiumCard>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${rule.bgColor}`}>
                    <rule.icon className={`w-4 h-4 ${rule.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${categoryColor(rule.category)}`}>
                        {rule.category}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                        ● Active
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground px-2 py-1 bg-muted/50 rounded border border-border">
                        {rule.trigger}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground px-2 py-1 bg-muted/50 rounded border border-border">
                        {rule.action}
                      </span>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </motion.div>
          ))}
        </div>

        {/* Live event feed */}
        <div>
          <PremiumCard className="p-0 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Live Events
              </h3>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
              {recentEvents.length === 0 ? (
                <div className="p-8 text-center">
                  <Activity className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Waiting for events...</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    Events appear here in real-time as the system processes automations
                  </p>
                </div>
              ) : (
                recentEvents.map((e: any) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-4 py-3 hover:bg-accent/20 transition-colors"
                  >
                    <p className="text-xs font-medium text-foreground">{e.detail}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-muted-foreground/60 font-medium">{e.type}</span>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
