"use client";

import React, { useState } from "react";
import {
  Zap, Plus, Play, Pause, Trash2, CheckCircle2, Clock,
  ShieldCheck, RefreshCw, ArrowRight, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ────────────────────────────────────────────────────────── TYPES */
type TriggerType = 
  | "TASK_OVERDUE" 
  | "TASK_CREATED" 
  | "TASK_COMPLETED" 
  | "FOCUS_SESSION_ENDED" 
  | "SCHEDULED_CRON";

type ConditionType = 
  | "PRIORITY_HIGH_OR_CRITICAL" 
  | "CATEGORY_WORK" 
  | "NO_DUE_DATE" 
  | "STATUS_INCOMPLETE";

type ActionType = 
  | "CREATE_NOTIFICATION" 
  | "MOVE_TO_TODAY" 
  | "SCHEDULE_FOCUS" 
  | "AUTO_ARCHIVE_TASK" 
  | "GENERATE_SUBTASKS";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  condition: ConditionType;
  action: ActionType;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  lastRun?: string;
  executionCount: number;
  isPreset?: boolean;
}

interface ExecutionLog {
  id: string;
  ruleName: string;
  triggeredAt: string;
  triggerSource: string;
  targetItem: string;
  status: "SUCCESS" | "FAILED";
  details: string;
}

/* ────────────────────────────────────────────────────── PRESET RULES */
const INITIAL_RULES: AutomationRule[] = [
  {
    id: "rule-1",
    name: "Auto-Reschedule Overdue Tasks",
    description: "Automatically move high-priority overdue tasks to Today's execution plan.",
    trigger: "TASK_OVERDUE",
    condition: "PRIORITY_HIGH_OR_CRITICAL",
    action: "MOVE_TO_TODAY",
    status: "ACTIVE",
    lastRun: "10 minutes ago",
    executionCount: 24,
    isPreset: true,
  },
  {
    id: "rule-2",
    name: "Focus Session Auto-Log",
    description: "When a focus session finishes, create a completion notification and update task progress.",
    trigger: "FOCUS_SESSION_ENDED",
    condition: "STATUS_INCOMPLETE",
    action: "CREATE_NOTIFICATION",
    status: "ACTIVE",
    lastRun: "2 hours ago",
    executionCount: 18,
    isPreset: true,
  },
  {
    id: "rule-3",
    name: "Weekly Review Planning Task",
    description: "Every Monday morning at 9:00 AM, generate weekly planning subtasks.",
    trigger: "SCHEDULED_CRON",
    condition: "CATEGORY_WORK",
    action: "GENERATE_SUBTASKS",
    status: "ACTIVE",
    lastRun: "3 days ago",
    executionCount: 12,
    isPreset: true,
  },
  {
    id: "rule-4",
    name: "Auto-Archive Completed Work",
    description: "Move completed tasks to historical archives after 7 days of inactivity.",
    trigger: "TASK_COMPLETED",
    condition: "STATUS_INCOMPLETE",
    action: "AUTO_ARCHIVE_TASK",
    status: "PAUSED",
    lastRun: "5 days ago",
    executionCount: 45,
    isPreset: false,
  },
];

const INITIAL_LOGS: ExecutionLog[] = [
  {
    id: "log-101",
    ruleName: "Auto-Reschedule Overdue Tasks",
    triggeredAt: "Today, 08:45 AM",
    triggerSource: "System Cron Guard",
    targetItem: "Prepare V1 Architecture Deck",
    status: "SUCCESS",
    details: "Moved task to Today's Plan with High priority tag",
  },
  {
    id: "log-102",
    ruleName: "Focus Session Auto-Log",
    triggeredAt: "Today, 07:30 AM",
    triggerSource: "Focus Timer Event",
    targetItem: "Personal Productivity Audit",
    status: "SUCCESS",
    details: "Logged 45 mins focus time & dispatched push notification",
  },
  {
    id: "log-103",
    ruleName: "Weekly Review Planning Task",
    triggeredAt: "Aug 11, 09:00 AM",
    triggerSource: "Scheduled Cron Trigger",
    targetItem: "Weekly Execution Roadmap",
    status: "SUCCESS",
    details: "Generated 5 standard review subtasks",
  },
];

const STORAGE_KEY = "personal_automation_rules";

function loadRules(): AutomationRule[] {
  if (typeof window === "undefined") return INITIAL_RULES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_RULES;
  } catch {
    return INITIAL_RULES;
  }
}

function saveRules(rules: AutomationRule[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rules)); } catch {}
}

export default function PersonalAutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>(() => loadRules());
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "PAUSED" | "LOGS">("ACTIVE");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // New Rule Form State (WHEN -> IF -> DO)
  const [newRuleName, setNewRuleName] = useState("");
  const [newTrigger, setNewTrigger] = useState<TriggerType>("TASK_OVERDUE");
  const [newCondition, setNewCondition] = useState<ConditionType>("PRIORITY_HIGH_OR_CRITICAL");
  const [newAction, setNewAction] = useState<ActionType>("MOVE_TO_TODAY");

  const toggleRuleStatus = (id: string) => {
    setRules((prev) => {
      const next = prev.map((r) => {
        if (r.id === id) {
          const nextStatus: "ACTIVE" | "PAUSED" = r.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
          return { ...r, status: nextStatus };
        }
        return r;
      });
      saveRules(next);
      return next;
    });
  };

  const deleteRule = (id: string) => {
    setRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRules(next);
      return next;
    });
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const newRule: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName.trim(),
      description: `Automates ${newAction.replace(/_/g, " ").toLowerCase()} when ${newTrigger.replace(/_/g, " ").toLowerCase()}.`,
      trigger: newTrigger,
      condition: newCondition,
      action: newAction,
      status: "ACTIVE",
      lastRun: "Never",
      executionCount: 0,
    };

    setRules((prev) => {
      const next = [newRule, ...prev];
      saveRules(next);
      return next;
    });
    setNewRuleName("");
    setIsBuilderOpen(false);
  };

  const testTriggerRule = (rule: AutomationRule) => {
    const newLog: ExecutionLog = {
      id: `log-${Date.now()}`,
      ruleName: rule.name,
      triggeredAt: new Date().toLocaleString(),
      triggerSource: "Manual Test Run",
      targetItem: "Simulated — no backend engine yet",
      status: "SUCCESS",
      details: "UI simulation only. Backend execution engine is not yet active.",
    };
    setLogs((prev) => [newLog, ...prev]);
    setRules((prev) => {
      const next = prev.map((r) =>
        r.id === rule.id ? { ...r, executionCount: r.executionCount + 1, lastRun: "Just now" } : r
      );
      saveRules(next);
      return next;
    });
  };

  const activeRules = rules.filter((r) => r.status === "ACTIVE");
  const pausedRules = rules.filter((r) => r.status === "PAUSED");

  return (
    <div className="flex flex-col h-full bg-background w-full overflow-y-auto pb-24 md:pb-10">
      <div className="p-6 md:p-8 xl:p-10 max-w-7xl mx-auto w-full space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-gold" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Personal Automation Engine</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Automate repetitive productivity workflows using simple WHEN ➔ IF ➔ DO rules with built-in safety controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold hover:bg-gold-hover text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Rule</span>
            </button>
          </div>
        </div>

        {/* METRICS HEADER CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-card border border-border flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Rules</span>
              <Zap className="w-4 h-4 text-gold" />
            </div>
            <span className="text-2xl font-black font-mono text-foreground">{activeRules.length}</span>
            <span className="text-xs text-muted-foreground">Rules configured</span>
          </div>

          <div className="p-5 rounded-xl bg-card border border-border flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Paused Rules</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-2xl font-black font-mono text-foreground">{pausedRules.length}</span>
            <span className="text-xs text-muted-foreground">Temporarily disabled</span>
          </div>

          <div className="p-5 rounded-xl bg-card border border-border flex flex-col gap-2 shadow-sm col-span-full sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Engine Status</span>
              <ShieldCheck className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-sm font-bold text-amber-500">UI Prototype</span>
            <span className="text-xs text-muted-foreground">Rules are saved locally. Backend execution engine coming soon.</span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ACTIVE"
                  ? "bg-accent text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              Active ({activeRules.length})
            </button>

            <button
              onClick={() => setActiveTab("PAUSED")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "PAUSED"
                  ? "bg-accent text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              Paused ({pausedRules.length})
            </button>

            <button
              onClick={() => setActiveTab("LOGS")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "LOGS"
                  ? "bg-accent text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              Execution Logs ({logs.length})
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Loop Guard Active</span>
          </div>
        </div>

        {/* TAB 1: ACTIVE / PAUSED RULES LIST */}
        {(activeTab === "ACTIVE" || activeTab === "PAUSED") && (
          <div className="space-y-4">
            {((activeTab === "ACTIVE" ? activeRules : pausedRules).length === 0) ? (
              <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card flex flex-col items-center justify-center gap-2">
                <Zap className="w-8 h-8 text-muted-foreground/40 mb-1" />
                <h3 className="text-sm font-bold text-foreground">No {activeTab.toLowerCase()} automations found</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Create custom WHEN ➔ IF ➔ DO rules to automate your daily planning and execution.
                </p>
                <button
                  onClick={() => setIsBuilderOpen(true)}
                  className="mt-3 px-4 py-2 rounded-lg bg-gold text-slate-950 font-bold text-xs"
                >
                  Create Rule
                </button>
              </div>
            ) : (
              (activeTab === "ACTIVE" ? activeRules : pausedRules).map((rule) => (
                <div
                  key={rule.id}
                  className="p-5 rounded-xl bg-card border border-border hover:border-border/80 transition-all shadow-sm flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{rule.name}</span>
                          {rule.isPreset && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30">
                              System Preset
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5">{rule.description}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => testTriggerRule(rule)}
                        className="px-3 py-1.5 rounded-lg bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-colors"
                      >
                        Run Test
                      </button>

                      <button
                        onClick={() => toggleRuleStatus(rule.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          rule.status === "ACTIVE"
                            ? "bg-amber-500/10 text-gold hover:bg-amber-500/20"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                        title={rule.status === "ACTIVE" ? "Pause Automation" : "Activate Automation"}
                      >
                        {rule.status === "ACTIVE" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      {!rule.isPreset && (
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete Automation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* RULE WORKFLOW BADGES (WHEN -> IF -> DO) */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50 text-xs">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-foreground border border-border">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">WHEN</span>
                      <span className="font-semibold">{rule.trigger.replace(/_/g, " ")}</span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50" />

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-foreground border border-border">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">IF</span>
                      <span className="font-semibold">{rule.condition.replace(/_/g, " ")}</span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50" />

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gold/10 text-gold border border-gold/30">
                      <span className="text-[10px] font-bold uppercase text-gold">DO</span>
                      <span className="font-semibold">{rule.action.replace(/_/g, " ")}</span>
                    </div>

                    <div className="ml-auto text-[11px] text-muted-foreground">
                      Ran <span className="font-bold text-foreground">{rule.executionCount} times</span> • Last: {rule.lastRun}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: EXECUTION AUDIT LOGS */}
        {activeTab === "LOGS" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Automation Test Log</span>
              <span className="text-[11px] font-medium text-muted-foreground">Manual test runs only — no backend engine active</span>
            </div>

            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <RefreshCw className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold text-foreground mb-1">No test runs yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Click "Run Test" on any rule to simulate an execution and see it logged here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="p-3.5 pl-4">Rule Name</th>
                      <th className="p-3.5">Trigger Source</th>
                      <th className="p-3.5">Target Item</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 pr-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 pl-4 font-semibold text-foreground">{log.ruleName}</td>
                        <td className="p-3.5 text-muted-foreground">{log.triggerSource}</td>
                        <td className="p-3.5 font-medium text-foreground truncate max-w-[200px]">{log.targetItem}</td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            SIMULATED
                          </span>
                        </td>
                        <td className="p-3.5 pr-4 text-muted-foreground">{log.triggeredAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* WHEN ➔ IF ➔ DO AUTOMATION BUILDER MODAL */}
      <AnimatePresence>
        {isBuilderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBuilderOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-gold" />
                  <h2 className="text-base font-bold text-foreground">Create Automation Rule</h2>
                </div>
                <button
                  onClick={() => setIsBuilderOpen(false)}
                  className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRule} className="space-y-4">
                {/* Rule Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Rule Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Auto-Move Overdue Tasks to Today"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>

                {/* WHEN TRIGGER */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider text-gold">WHEN (Trigger Event)</label>
                  <select
                    value={newTrigger}
                    onChange={(e) => setNewTrigger(e.target.value as TriggerType)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    <option value="TASK_OVERDUE">A Task becomes Overdue</option>
                    <option value="TASK_CREATED">A new Task is Created</option>
                    <option value="TASK_COMPLETED">A Task is Completed</option>
                    <option value="FOCUS_SESSION_ENDED">Focus Session Ends</option>
                    <option value="SCHEDULED_CRON">Scheduled Cron (Every Morning 9 AM)</option>
                  </select>
                </div>

                {/* IF CONDITION */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">IF (Filter Condition)</label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as ConditionType)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    <option value="PRIORITY_HIGH_OR_CRITICAL">Priority is High or Critical</option>
                    <option value="CATEGORY_WORK">Category is Work</option>
                    <option value="NO_DUE_DATE">No Due Date is Specified</option>
                    <option value="STATUS_INCOMPLETE">Status is Incomplete</option>
                  </select>
                </div>

                {/* DO ACTION */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider text-gold">DO (Action Execution)</label>
                  <select
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value as ActionType)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    <option value="MOVE_TO_TODAY">Move Task to Today's Plan</option>
                    <option value="CREATE_NOTIFICATION">Dispath Push Notification</option>
                    <option value="SCHEDULE_FOCUS">Auto-Schedule Focus Session</option>
                    <option value="GENERATE_SUBTASKS">Generate Default Subtasks</option>
                    <option value="AUTO_ARCHIVE_TASK">Auto-Archive Task</option>
                  </select>
                </div>

                {/* SAFETY NOTICE */}
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Loop Guard automatically prevents duplicate execution and recursive triggers.</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBuilderOpen(false)}
                    className="px-4 py-2.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-gold hover:bg-gold-hover text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Save & Activate Rule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
