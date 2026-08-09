"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  Clock3,
  FileText,
  Flag,
  FolderKanban,
  Target,
  Users,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ModuleDetail {
  title: string;
  description: string;
  icon: LucideIcon;
  category: string;
  capabilities: string[];
  metric: string;
}

const moduleDetailsMap: Record<string, ModuleDetail> = {
  Tasks: {
    title: "Task Management",
    description: "Prioritize actions, track sub-tasks, and execute your day with zero friction.",
    icon: CheckSquare,
    category: "CORE EXECUTION",
    capabilities: [
      "Kanban & List views with sub-task breakdowns",
      "Instant priority sorting & tags",
      "Sub-50ms local state persistence"
    ],
    metric: "3 active tasks pending • 85% velocity"
  },
  Projects: {
    title: "Project Milestones",
    description: "Connect high-level objectives directly to weekly deliverables and owner milestones.",
    icon: FolderKanban,
    category: "ROADMAP",
    capabilities: [
      "Milestone tracking & ownership mapping",
      "Dependencies & phase planning",
      "Unified project timeline view"
    ],
    metric: "4 active projects on schedule"
  },
  Calendar: {
    title: "Focus Calendar",
    description: "Protect dedicated time blocks for high-impact work without notification interruptions.",
    icon: CalendarDays,
    category: "TIME DEFENSE",
    capabilities: [
      "Time-blocking for deep focus sessions",
      "Google & Apple Calendar sync",
      "Quiet hours & quiet workspace modes"
    ],
    metric: "4.5h focus time scheduled today"
  },
  Goals: {
    title: "Goal Tracking",
    description: "Keep strategic outcomes in sight and measure weekly momentum towards OKRs.",
    icon: Target,
    category: "STRATEGY",
    capabilities: [
      "Quarterly & annual OKR mapping",
      "Progress rings & automatic velocity metric",
      "Alignment across personal & team goals"
    ],
    metric: "12/15 quarterly key results achieved"
  },
  Analytics: {
    title: "Execution Analytics",
    description: "Understand your output trends, energy patterns, and weekly focus consistency.",
    icon: BarChart3,
    category: "METRICS",
    capabilities: [
      "Empirical focus time distribution",
      "Completion velocity trendlines",
      "Exportable summary reports"
    ],
    metric: "28.4 hrs focused this week (+14%)"
  },
  Notes: {
    title: "Context Notes",
    description: "Capture meeting decisions, technical specs, and ideas directly linked to tasks.",
    icon: FileText,
    category: "KNOWLEDGE",
    capabilities: [
      "Markdown & bi-directional link support",
      "Instant context attachment to tasks & projects",
      "100% encrypted local storage"
    ],
    metric: "42 notes organized across 6 projects"
  },
  Reports: {
    title: "Progress Reports",
    description: "Generate clean executive summaries and weekly digest logs for stakeholders.",
    icon: Activity,
    category: "REPORTING",
    capabilities: [
      "Automated weekly accomplishment logs",
      "Clean PDF & markdown export options",
      "One-click sharing with team members"
    ],
    metric: "Last weekly log sent yesterday"
  },
  Team: {
    title: "Team Sync",
    description: "Make collaboration transparent without constant status meetings or notification noise.",
    icon: Users,
    category: "COLLABORATION",
    capabilities: [
      "Real-time task assignment & status sync",
      "Asynchronous progress check-ins",
      "Role-based access control & permissions"
    ],
    metric: "8 team members active on workspace"
  }
};

const modules: [string, string, LucideIcon][] = [
  ["Tasks", "Move the next action forward.", CheckSquare],
  ["Projects", "Align milestones and ownership.", FolderKanban],
  ["Calendar", "Protect time for important work.", CalendarDays],
  ["Goals", "Keep outcomes in view.", Target],
  ["Analytics", "Understand your pace.", BarChart3],
  ["Notes", "Capture decisions in context.", FileText],
  ["Reports", "Share progress clearly.", Activity],
  ["Team", "Make collaboration visible.", Users],
];

const steps: [string, string, LucideIcon][] = [
  ["Plan", "Shape the work that matters.", Flag],
  ["Execute", "Protect the next move.", CheckSquare],
  ["Track", "See progress as it happens.", Activity],
  ["Review", "Understand what changed.", BarChart3],
  ["Improve", "Carry the learning forward.", Target]
];

const features = [
  "Task management",
  "Focus sessions",
  "Project planning",
  "Goal tracking",
  "Analytics",
  "Reports",
  "Team collaboration"
];

export function ExploreBottomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sheetHeight, setSheetHeight] = useState<"65%" | "92%">("65%");
  const [selectedModuleKey, setSelectedModuleKey] = useState<string | null>(null);

  const dragControls = useDragControls();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedModuleKey) {
          setSelectedModuleKey(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, selectedModuleKey]);

  useEffect(() => {
    if (open) return;
    setSheetHeight("65%");
    setSelectedModuleKey(null);
    window.setTimeout(() => previousFocus.current?.focus(), 0);
  }, [open]);

  // Dragging handler evaluating offset and velocity
  const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 600) {
      onClose();
    } else if (info.offset.y < -40 || info.velocity.y < -300) {
      setSheetHeight("92%");
    } else if (info.offset.y > 40 && info.offset.y <= 100) {
      setSheetHeight("65%");
    }
  };

  const activeModuleDetail = selectedModuleKey ? moduleDetailsMap[selectedModuleKey] : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
          className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-[5px]"
          role="presentation"
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="explore-sheet-title"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            initial={{ y: "100%" }}
            animate={{
              y: 0,
              height: sheetHeight === "92%" ? "calc(100% - env(safe-area-inset-top))" : "65%"
            }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            onMouseDown={(event) => event.stopPropagation()}
            className="absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-env(safe-area-inset-top))] flex-col overflow-hidden rounded-t-[32px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0f17] text-slate-900 dark:text-white shadow-[0_-24px_80px_rgba(0,0,0,0.1)] dark:shadow-[0_-24px_80px_rgba(0,0,0,0.85)] md:bottom-6 md:left-1/2 md:inset-x-auto md:w-[min(640px,calc(100%-2rem))] md:-translate-x-1/2 md:rounded-[32px]"
          >
            {/* MANUAL RESIZABLE DRAG HANDLE & SHEET HEADER */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="shrink-0 cursor-grab active:cursor-grabbing border-b border-slate-200 dark:border-white/[0.08] px-5 pb-3.5 pt-3 select-none touch-none"
            >
              {/* Drag Handle Indicator */}
              <div
                onClick={() => setSheetHeight(sheetHeight === "65%" ? "92%" : "65%")}
                className="group mx-auto flex items-center justify-center py-1 cursor-pointer w-full"
              >
                <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/30 group-hover:bg-[#C89B3C] group-hover:w-16 transition-all" />
              </div>

              <div className="mt-2 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#C89B3C]">
                      EXPLORE WORKSPACE
                    </p>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 font-mono">
                      {sheetHeight === "92%" ? "Full View" : "Drag up to expand ↑"}
                    </span>
                  </div>
                  <h2 id="explore-sheet-title" className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {activeModuleDetail ? activeModuleDetail.title : "Workspace Capabilities"}
                  </h2>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close explore workspace"
                  className="rounded-full border border-slate-200 dark:border-white/10 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-[#C89B3C] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* SCROLLABLE SHEET CONTENT */}
            <div
              onWheel={(e) => e.stopPropagation()}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10"
            >
              <AnimatePresence mode="wait">
                {activeModuleDetail ? (
                  /* MODULE DETAIL PANEL INSIDE SHEET */
                  <motion.div
                    key={activeModuleDetail.title}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Back Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedModuleKey(null)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-[#C89B3C] hover:underline cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to All Modules</span>
                    </button>

                    {/* Header Card */}
                    <div className="rounded-2xl border border-amber-500/25 bg-amber-50 dark:bg-amber-500/[0.06] p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#C89B3C]">
                          <activeModuleDetail.icon className="w-6 h-6 stroke-[2]" />
                        </div>
                        <span className="text-[10px] font-mono font-bold tracking-widest text-[#C89B3C] uppercase">
                          {activeModuleDetail.category}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeModuleDetail.title}</h3>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                        {activeModuleDetail.description}
                      </p>
                    </div>

                    {/* Capabilities */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Key Capabilities</h4>
                      <div className="space-y-2.5">
                        {activeModuleDetail.capabilities.map((cap) => (
                          <div key={cap} className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03]">
                            <Check className="w-4 h-4 text-amber-600 dark:text-[#C89B3C] shrink-0 mt-0.5" />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{cap}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live Metric */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Current Status:</span>
                      <span className="text-xs font-mono font-bold text-[#C89B3C]">{activeModuleDetail.metric}</span>
                    </div>

                    {/* Action CTA */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.location.href = "/welcome";
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#C89B3C] hover:bg-[#DDB85A] text-black font-extrabold text-xs transition-colors cursor-pointer"
                    >
                      <span>Open {activeModuleDetail.title}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                ) : (
                  /* ALL MODULES & OVERVIEW MAIN VIEW */
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-7"
                  >
                    <section>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Welcome to your execution system</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                        ManMadhan Progress helps individuals and teams transform plans into completed outcomes with a calmer, more connected way to work.
                      </p>
                    </section>

                    {/* Core Modules Grid with In-Sheet Details Trigger */}
                    <section>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Core modules</h3>
                        <span className="text-[10px] text-slate-500 font-mono">Tap any module for details</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        {modules.map(([title, description, Icon], index) => (
                          <motion.button
                            key={title}
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => setSelectedModuleKey(title)}
                            className="group rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.035] p-3 text-left hover:border-amber-500/50 dark:hover:border-amber-500/30 transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <div>
                              <Icon className="h-5 w-5 text-[#C89B3C]" strokeWidth={2} />
                              <span className="mt-3 block text-xs font-bold text-slate-900 dark:text-white">{title}</span>
                              <span className="mt-1 block text-[10px] leading-4 text-slate-500 dark:text-slate-400 font-medium">{description}</span>
                            </div>
                            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/[0.05]">
                              <span className="text-[9.5px] font-mono text-amber-500/80 font-semibold">View details</span>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-[#C89B3C] group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">How it works</h3>
                      <div className="mt-4">
                        {steps.map(([title, description, Icon], index) => (
                          <motion.div
                            key={title}
                            initial={{ opacity: 0, x: -8 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative flex gap-3 pb-5 last:pb-0"
                          >
                            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/30 dark:border-[#C89B3C]/35 bg-amber-50 dark:bg-[#18140c] text-amber-600 dark:text-[#C89B3C]">
                              <Icon className="h-4 w-4" />
                            </div>
                            {index < steps.length - 1 && (
                              <div className="absolute left-4 top-8 h-[calc(100%-1.25rem)] w-px bg-amber-500/25 dark:bg-[#C89B3C]/25" />
                            )}
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{index + 1}. {title}</p>
                              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">{description}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Key features</h3>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                        {features.map((feature) => (
                          <p key={feature} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            <Check className="h-3.5 w-3.5 text-[#C89B3C]" />
                            {feature}
                          </p>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-amber-500/30 dark:border-[#C89B3C]/30 bg-amber-50 dark:bg-[#C89B3C]/[0.08] p-4">
                      <p className="text-xs leading-5 text-slate-700 dark:text-slate-200 font-medium">
                        Your next step is ready. Continue into your workspace when you are ready to make progress.
                      </p>
                      <a
                        href="/welcome"
                        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#C89B3C] hover:bg-[#DDB85A] px-4 py-3 text-xs font-bold text-black transition-colors cursor-pointer"
                      >
                        Open Workspace <ArrowRight className="h-4 w-4" />
                      </a>
                    </section>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
