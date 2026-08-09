"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  CircleDot,
  Clock3,
  Compass,
  FileText,
  Flag,
  FolderKanban,
  Gauge,
  Layers3,
  Lightbulb,
  LockKeyhole,
  MoreHorizontal,
  Network,
  Play,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow as WorkflowIcon,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "./auth/auth-context";

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 30, scale: 0.96 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >{children}</motion.div>
  );
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-800 dark:text-[#E5B94E]">{eyebrow}</p>
      <h2 className="text-3xl font-extrabold tracking-[-0.035em] text-slate-900 dark:text-white sm:text-5xl leading-[1.12]">{title}</h2>
      <p className="mt-4 text-base font-medium leading-7 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

function GlassCard({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div style={style} className={"rounded-2xl border border-slate-200/90 dark:border-white/[0.09] bg-white/90 dark:bg-white/[0.035] shadow-md dark:shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl " + className}>{children}</div>;
}

export interface WalkthroughModule {
  id: string;
  kind: "dashboard" | "tasks" | "projects" | "calendar" | "goals" | "analytics" | "notes" | "reports" | "files" | "team";
  title: string;
  eyebrow: string;
  tagline: string;
  icon: LucideIcon;
  color: string;
  overview: string;
  purpose: string;
  keyFeatures: string[];
  workflow: string[];
  benefits: string[];
  relatedModules: string[];
  quickTip: string;
}

export const walkthroughModules: WalkthroughModule[] = [
  {
    id: "dashboard",
    kind: "dashboard",
    title: "Dashboard OS",
    eyebrow: "01 / Command Center",
    tagline: "See the whole execution system at a single glance.",
    icon: BarChart3,
    color: "text-amber-600 dark:text-[#DDB85A]",
    overview: "The Dashboard is the central command center of ManMadhan Progress. It provides a real-time synthesized view of active tasks, project velocity, focus hours, upcoming deadlines, and team signals in one calm, coherent workspace.",
    purpose: "Quickly understand what requires attention today, track overall team execution momentum, monitor focus metrics, and eliminate friction from context switching.",
    keyFeatures: [
      "Daily Execution Overview & Momentum Index",
      "Active Priority Task Queue",
      "Integrated Focus Session Ring",
      "Live Velocity & Target Completion Rates",
      "Smart Notifications & Blocker Alerts",
      "Quick Navigation & Command Palette (Cmd + K)",
    ],
    workflow: [
      "Open Dashboard",
      "Review today's high-level overview",
      "Identify top 3 urgent priorities",
      "Launch Focus Session",
      "Complete active tasks & log progress",
      "Review end-of-day analytics",
    ],
    benefits: [
      "360-degree visibility across all projects",
      "Sub-second decision making with live data",
      "Zero-distraction workspace environment",
      "Consistent daily focus and momentum",
    ],
    relatedModules: ["Tasks", "Calendar", "Analytics", "Goals"],
    quickTip: "Press Cmd + K anywhere on the dashboard to trigger instant quick actions or search any project.",
  },
  {
    id: "tasks",
    kind: "tasks",
    title: "Task Management",
    eyebrow: "02 / Action Engine",
    tagline: "Turn ambitious objectives into clear, sequential actions.",
    icon: CheckSquare,
    color: "text-amber-600 dark:text-amber-400",
    overview: "The Task Engine structures daily work into prioritized, manageable steps. Track completion statuses, sub-task progress, assignees, and milestone triggers with total clarity.",
    purpose: "Eliminate decision fatigue by presenting clear next actions with built-in context, dependencies, and real-time velocity tracking.",
    keyFeatures: [
      "Smart Priority Queues & Status Kanban",
      "Sub-task Progress Rings & Milestones",
      "Dependency Graphing & Blocker Flags",
      "Automated Milestone Trigger Rules",
      "Tag, Project & Assignee Filtering",
      "Time Estimate vs Actual Time Tracking",
    ],
    workflow: [
      "Capture task item",
      "Assign priority level & team member",
      "Deconstruct into sub-task steps",
      "Enter active execution mode",
      "Log focus hours & mark complete",
      "Trigger automated status update",
    ],
    benefits: [
      "Consistent follow-through on key deliverables",
      "Transparent task ownership & accountability",
      "Reduced backlog clutter & decision strain",
      "Automated downstream notifications",
    ],
    relatedModules: ["Projects", "Calendar", "Notes", "Analytics"],
    quickTip: "Drag & drop tasks directly into calendar blocks for seamless time-blocking.",
  },
  {
    id: "projects",
    kind: "projects",
    title: "Project Orchestration",
    eyebrow: "03 / Multi-Project Roadmap",
    tagline: "Align people, milestones, and deliverables seamlessly.",
    icon: FolderKanban,
    color: "text-blue-600 dark:text-blue-400",
    overview: "Project Orchestration gives complex multi-stage initiatives a clear structural container to ensure milestones, deliverables, and team leads move forward together.",
    purpose: "Provide structured governance for concurrent projects, preventing deadline slippage and keeping cross-functional teams aligned.",
    keyFeatures: [
      "Interactive Milestone Roadmap",
      "Real-time Project Health Scoring",
      "Resource Allocation & Capacity Matrix",
      "Kanban, List & Timeline Views",
      "Predictive Blocker & Risk Signals",
      "Handoff Verification Checklists",
    ],
    workflow: [
      "Define project brief & objectives",
      "Set key milestone target dates",
      "Assign team leads & contributors",
      "Execute sprint iterations",
      "Monitor project health & risk scores",
      "Deliver final project release",
    ],
    benefits: [
      "70% reduction in unnecessary status meetings",
      "Early detection of critical path blockers",
      "Unified timeline history for all assets",
      "Predictable release schedules",
    ],
    relatedModules: ["Tasks", "Reports", "Files", "Team"],
    quickTip: "Filter projects by risk indicator to resolve blockers before sprint reviews.",
  },
  {
    id: "calendar",
    kind: "calendar",
    title: "Execution Calendar",
    eyebrow: "04 / Time Protection",
    tagline: "Protect focus time and make capacity visible before overcommitting.",
    icon: CalendarDays,
    color: "text-emerald-600 dark:text-emerald-400",
    overview: "Execution Calendar transforms your schedule from a reactive list of meetings into a proactive time-blocking environment engineered for deep work.",
    purpose: "Protect high-value focus blocks, prevent meeting collisions, and align actual daily capacity with strategic priorities.",
    keyFeatures: [
      "Protected Deep Work Focus Blocks",
      "Bi-directional External Calendar Sync",
      "Deadline & Milestone Overlays",
      "Capacity Heatmap & Over-commitment Alerts",
      "Smart Buffer Allocation Rules",
      "1-Click Task Time-blocking",
    ],
    workflow: [
      "Sync Google / Outlook calendar",
      "Lock in weekly focus time blocks",
      "Drag high-priority tasks into open blocks",
      "Execute undisturbed focus sessions",
      "Review weekly focus distribution",
    ],
    benefits: [
      "Guaranteed protected focus time every week",
      "Eliminated scheduling collisions & noise",
      "Realistic workload distribution",
      "Significantly reduced burnout risk",
    ],
    relatedModules: ["Tasks", "Goals", "Analytics", "Dashboard"],
    quickTip: "Color-code focus blocks to instantly visualize your deep work vs meeting ratio.",
  },
  {
    id: "goals",
    kind: "goals",
    title: "Goal Alignment (OKRs)",
    eyebrow: "05 / Outcome Strategy",
    tagline: "Connect daily task execution directly to high-level strategic aims.",
    icon: Target,
    color: "text-purple-600 dark:text-violet-400",
    overview: "Goal Alignment creates a line of sight between every single completed task and top-level strategic OKRs, ensuring team efforts compound meaningfully.",
    purpose: "Maintain strategic alignment so individual contributors understand the why behind their daily work.",
    keyFeatures: [
      "Multi-tier OKR & Strategic Goal Trees",
      "Live Progress Signal Rings",
      "Milestone Target & Review Dates",
      "Automated Task-to-Goal Progress Rollups",
      "Owner Attribution & Key Results",
      "Quarterly Retrospective Templates",
    ],
    workflow: [
      "Establish quarterly business OKRs",
      "Link active project milestones to goals",
      "Track automatic task completion rollups",
      "Conduct weekly goal alignment check-ins",
      "Celebrate milestone achievements",
    ],
    benefits: [
      "Crystal-clear strategic direction for everyone",
      "Higher motivation via visible progress indicators",
      "Data-driven quarterly retrospectives",
      "Elimination of misaligned work effort",
    ],
    relatedModules: ["Projects", "Analytics", "Dashboard", "Reports"],
    quickTip: "Ensure every active goal has at least 2 linked projects for consistent progress.",
  },
  {
    id: "analytics",
    kind: "analytics",
    title: "Realtime Analytics",
    eyebrow: "06 / Empirical Visibility",
    tagline: "Read the velocity patterns behind your team's execution rhythm.",
    icon: BarChart3,
    color: "text-cyan-600 dark:text-cyan-400",
    overview: "Realtime Analytics delivers deep visibility into team velocity, focus hours, completion rates, and workflow bottlenecks with elegant visual charts.",
    purpose: "Uncover empirical productivity insights to continuously optimize sprint planning and workload distribution.",
    keyFeatures: [
      "Weekly & Monthly Velocity Trendlines",
      "Focus Hours vs Distraction Analytics",
      "Task Completion Distribution Charts",
      "Cycle Time & Lead Time Metrics",
      "Workload Balance & Burnup Maps",
      "Exportable Performance Summaries",
    ],
    workflow: [
      "Collect background execution metrics",
      "Inspect velocity & completion trends",
      "Identify workflow bottlenecks & delays",
      "Adjust team capacity & estimations",
      "Track compounding productivity gains",
    ],
    benefits: [
      "Objective data for sprint retrospectives",
      "Fair and balanced workload distribution",
      "Accurate future completion estimates",
      "Measurable productivity improvements",
    ],
    relatedModules: ["Reports", "Dashboard", "Calendar", "Goals"],
    quickTip: "Inspect velocity trends on Fridays to accurately plan next week's sprint load.",
  },
  {
    id: "notes",
    kind: "notes",
    title: "Contextual Knowledge",
    eyebrow: "07 / Embedded Decisions",
    tagline: "Keep decisions, context, and documentation directly linked to work.",
    icon: FileText,
    color: "text-rose-600 dark:text-rose-400",
    overview: "Contextual Notes capture meeting decisions, technical specifications, and working knowledge right alongside tasks and projects.",
    purpose: "Prevent information loss and fragmentation across third-party tools by keeping documentation embedded in active work contexts.",
    keyFeatures: [
      "Markdown & Rich Text Editor",
      "Inline Task & Project Mentions (@)",
      "Real-time Collaborative Co-editing",
      "Structured Meeting Note Templates",
      "Instant Full-Text Search Index",
      "Version Control & Revision History",
    ],
    workflow: [
      "Open contextual meeting note",
      "Record decisions & key discussion points",
      "Convert highlight lines into tasks with 1-click",
      "Tag project leads & share access",
    ],
    benefits: [
      "Zero context switching between docs and tasks",
      "Searchable centralized team memory",
      "Instant translation of notes into action",
      "Clear audit trail of key technical decisions",
    ],
    relatedModules: ["Files", "Tasks", "Projects", "Dashboard"],
    quickTip: "Type @ inside any note to link a live task or team member instantly.",
  },
  {
    id: "reports",
    kind: "reports",
    title: "Executive Reports",
    eyebrow: "08 / Status Signal",
    tagline: "Share progress updates without the status meeting spectacle.",
    icon: Gauge,
    color: "text-amber-600 dark:text-amber-300",
    overview: "Executive Reports summarize progress, health scores, and milestone achievements into clean, executive-ready presentations.",
    purpose: "Keep leadership and stakeholders informed with high-signal updates, eliminating unnecessary sync meetings.",
    keyFeatures: [
      "Automated Weekly Summary Generator",
      "Stakeholder Highlight & Blocker Callouts",
      "PDF Export & Secure Web Share Links",
      "Custom Commentary & Context Blocks",
      "Historical Report Archives",
      "Project Health Breakdown Visuals",
    ],
    workflow: [
      "Select reporting timeframe & projects",
      "Generate automated progress highlights",
      "Add custom qualitative commentary",
      "Share secure web link with leadership",
    ],
    benefits: [
      "90% faster report creation time",
      "High-density executive clarity",
      "Drastically fewer status sync meetings",
      "Clear historical record of project progress",
    ],
    relatedModules: ["Analytics", "Projects", "Goals", "Team"],
    quickTip: "Schedule automated Monday morning reports to deliver recurring updates.",
  },
  {
    id: "files",
    kind: "files",
    title: "Resource Vault",
    eyebrow: "09 / Asset Management",
    tagline: "Keep designs, specs, and documents attached to the right work.",
    icon: Layers3,
    color: "text-slate-700 dark:text-slate-300",
    overview: "Resource Vault centralizes design assets, technical specs, and project files, making them easily discoverable and attached to relevant tasks.",
    purpose: "Eliminate searching for lost cloud links by organizing deliverables directly inside their project containers.",
    keyFeatures: [
      "Project-level Resource Vaults",
      "File Version Control & History",
      "Inline Image & Document Previews",
      "Granular Access & Permission Controls",
      "Tag-based Smart Search",
      "Cloud Storage Integration (Drive / Dropbox)",
    ],
    workflow: [
      "Upload asset or attach cloud link",
      "Link file to target task or project",
      "Collaborate on version updates",
      "Archive final approved deliverable",
    ],
    benefits: [
      "Sub-5 second file discovery time",
      "No confusion over outdated asset versions",
      "Secure role-based file access",
      "Clutter-free project environment",
    ],
    relatedModules: ["Notes", "Projects", "Tasks", "Dashboard"],
    quickTip: "Tag assets with Final to make client-approved files instantly searchable.",
  },
  {
    id: "team",
    kind: "team",
    title: "Team Collaboration",
    eyebrow: "10 / Collective Velocity",
    tagline: "Manage ownership, member capacity, and real-time presence.",
    icon: Users,
    color: "text-indigo-600 dark:text-indigo-400",
    overview: "Team Collaboration builds transparent visibility into member presence, workload capacity, active status, and cross-functional task handoffs.",
    purpose: "Enable smooth team coordination and fair workload distribution without micromanagement.",
    keyFeatures: [
      "Real-time Member Presence Indicators",
      "Active Workload & Capacity Gauges",
      "Skill & Role Directory Tagging",
      "Direct Task Discussion Threads",
      "Sprint Capacity Allocator",
      "Team Velocity Recognition Badges",
    ],
    workflow: [
      "Review member workload balance",
      "Assign upcoming sprint tasks",
      "Check real-time online availability",
      "Coordinate smooth task handoffs",
      "Review sprint completion velocity",
    ],
    benefits: [
      "Fair and balanced work distribution",
      "Transparent team availability",
      "Faster handoff and review cycles",
      "Stronger remote team cohesion",
    ],
    relatedModules: ["Projects", "Tasks", "Calendar", "Reports"],
    quickTip: "Check member workload gauges before assigning urgent tasks to prevent burnout.",
  },
];

const ecosystemItems = [
  { label: "Projects", Icon: FolderKanban, detail: "Organize the work that matters", moduleId: "projects" },
  { label: "Tasks", Icon: CheckSquare, detail: "Move the next action forward", moduleId: "tasks" },
  { label: "Goals", Icon: Target, detail: "Keep outcomes in view", moduleId: "goals" },
  { label: "Calendar", Icon: CalendarDays, detail: "Protect time to execute", moduleId: "calendar" },
  { label: "Analytics", Icon: BarChart3, detail: "Understand the pace of progress", moduleId: "analytics" },
  { label: "Notes", Icon: FileText, detail: "Capture decisions in context", moduleId: "notes" },
  { label: "Reports", Icon: Activity, detail: "Turn activity into insight", moduleId: "reports" },
  { label: "Files", Icon: Layers3, detail: "Keep every resource close", moduleId: "files" },
] as const;

export function ExecutionEcosystem() {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const centerScale = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.95, 1.02, 1, 0.95]);
  const centerRotate = useTransform(scrollYProgress, [0, 0.5, 1], [-4, 0, 4]);
  const gridY = useTransform(scrollYProgress, [0, 0.5, 1], [20, 0, -20]);

  const activeModule = walkthroughModules.find((m) => m.id === selectedModuleId);

  const handleNavigate = useCallback((direction: "prev" | "next") => {
    if (!selectedModuleId) return;
    const idx = walkthroughModules.findIndex((m) => m.id === selectedModuleId);
    if (direction === "prev") {
      const nextIdx = (idx - 1 + walkthroughModules.length) % walkthroughModules.length;
      setSelectedModuleId(walkthroughModules[nextIdx].id);
    } else {
      const nextIdx = (idx + 1) % walkthroughModules.length;
      setSelectedModuleId(walkthroughModules[nextIdx].id);
    }
  }, [selectedModuleId]);

  // Connection definitions: [x1%, y1%, moduleId]
  const connections: [string, string, string][] = [
    ["16.6%", "16.6%", "projects"],
    ["50%", "16.6%", "tasks"],
    ["83.3%", "16.6%", "goals"],
    ["16.6%", "50%", "calendar"],
    ["83.3%", "50%", "analytics"],
    ["16.6%", "83.3%", "notes"],
    ["50%", "83.3%", "reports"],
    ["83.3%", "83.3%", "files"],
  ];

  return (
    <section ref={sectionRef} id="ecosystem" className="relative overflow-hidden border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#07090E] py-28 transition-colors duration-200">
      <SectionTitle eyebrow="One connected system" title="Everything aligned around execution." description="ManMadhan Progress brings the pieces of productive work into one calm, coherent workspace. Click any card to explore." />

      <motion.div style={{ y: gridY }} className="site-container relative mt-20">
        {/* Clean Vector SVG Connections */}
        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block z-0 overflow-visible">
          {connections.map(([x1, y1, modId]) => {
            const isHovered = hoveredModuleId === modId || hoveredModuleId === "dashboard";
            return (
              <g key={modId}>
                {/* Crisp Vector Connection Beam */}
                <line
                  x1={x1}
                  y1={y1}
                  x2="50%"
                  y2="50%"
                  stroke={isHovered ? "#C89B3C" : "#CBD5E1"}
                  strokeWidth={isHovered ? "2" : "1.5"}
                  strokeOpacity={isHovered ? "1" : "0.5"}
                  strokeDasharray="4 4"
                  className="transition-all duration-300 dark:stroke-slate-700 dark:data-[hover=true]:stroke-[#DDB85A]"
                  data-hover={isHovered}
                />

                {/* Subtle Pulse Point */}
                <circle r={isHovered ? "3.5" : "2"} fill={isHovered ? "#C89B3C" : "#94A3B8"}>
                  <animateMotion
                    path={`M ${x1.replace('%','')} ${y1.replace('%','')} L 50 50` /* fallback path string */}
                    dur={isHovered ? "2s" : "4s"}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}
        </svg>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 z-10 relative">
          {/* Row 1: Projects, Tasks, Goals */}
          {ecosystemItems.slice(0, 3).map(({ label, Icon, detail, moduleId }, index) => {
            const isHovered = hoveredModuleId === moduleId;
            return (
              <Reveal key={label} delay={index * 0.04}>
                <motion.div
                  onMouseEnter={() => setHoveredModuleId(moduleId)}
                  onMouseLeave={() => setHoveredModuleId(null)}
                  onClick={() => setSelectedModuleId(moduleId)}
                  whileHover={{ y: -4 }}
                  className={`group relative flex min-h-[148px] flex-col justify-between rounded-[1.25rem] border p-5 transition-all duration-300 cursor-pointer backdrop-blur-xl overflow-hidden ${
                    isHovered
                      ? "z-30 border-[#C89B3C]/40 bg-white dark:bg-[#11131A] shadow-[0_12px_40px_rgba(200,155,60,0.15)] dark:shadow-[0_12px_40px_rgba(200,155,60,0.1)] -translate-y-1.5 scale-[1.02]"
                      : "z-10 border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-[#0b0e14]/50 shadow-sm"
                  }`}
                >
                  {/* Subtle glossy top inner border */}
                  <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-b from-white/60 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" />
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-[#DDB85A] transition-colors">
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400 font-normal">{detail}</p>
                  </div>
                </motion.div>
              </Reveal>
            );
          })}

          {/* Row 2: Calendar, Central Core Engine, Analytics */}
          {ecosystemItems.slice(3, 4).map(({ label, Icon, detail, moduleId }) => {
            const isHovered = hoveredModuleId === moduleId;
            return (
              <Reveal key={label} delay={0.12}>
                <motion.div
                  onMouseEnter={() => setHoveredModuleId(moduleId)}
                  onMouseLeave={() => setHoveredModuleId(null)}
                  onClick={() => setSelectedModuleId(moduleId)}
                  whileHover={{ y: -4 }}
                  className={`group relative flex min-h-[148px] flex-col justify-between rounded-[1.25rem] border p-5 transition-all duration-300 cursor-pointer backdrop-blur-xl overflow-hidden ${
                    isHovered
                      ? "z-30 border-[#C89B3C]/40 bg-white dark:bg-[#11131A] shadow-[0_12px_40px_rgba(200,155,60,0.15)] dark:shadow-[0_12px_40px_rgba(200,155,60,0.1)] -translate-y-1.5 scale-[1.02]"
                      : "z-10 border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-[#0b0e14]/50 shadow-sm"
                  }`}
                >
                  {/* Subtle glossy top inner border */}
                  <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-b from-white/60 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" />
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-[#DDB85A] transition-colors">
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400 font-normal">{detail}</p>
                  </div>
                </motion.div>
              </Reveal>
            );
          })}

          {/* PREMIUM 3D CENTRAL CORE ENGINE CARD */}
          <div className="flex items-center justify-center py-2 lg:py-0 relative group">
            {/* Ambient background glow */}
            <div className="absolute inset-0 bg-[#C89B3C]/20 blur-[60px] rounded-full scale-90 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <motion.div
              style={{ scale: centerScale, rotate: centerRotate }}
              onMouseEnter={() => setHoveredModuleId("dashboard")}
              onMouseLeave={() => setHoveredModuleId(null)}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedModuleId("dashboard")}
              className="relative z-30 flex h-[158px] w-full max-w-[300px] flex-col items-center justify-center rounded-[1.25rem] border border-[#C89B3C]/30 bg-white/80 dark:bg-[#0B0E14]/80 p-5 text-center shadow-[0_16px_40px_rgba(200,155,60,0.15),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_16px_40px_rgba(200,155,60,0.1),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-2xl transition-all duration-300 hover:border-[#C89B3C]/60 hover:shadow-[0_20px_50px_rgba(200,155,60,0.25),inset_0_1px_1px_rgba(255,255,255,0.8)] cursor-pointer overflow-hidden"
            >
              {/* Glossy overlay sweep */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#C89B3C]/20 to-amber-500/5 border border-[#C89B3C]/30 text-amber-700 dark:text-[#DDB85A] shadow-inner transition-transform group-hover:scale-110 duration-300">
                  <Network className="h-6 w-6 stroke-[1.8]" />
                </div>
                <span className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-[#DDB85A] transition-colors duration-300">ManMadhan Progress</span>
                <span className="mt-1 text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-[#C89B3C] opacity-90">Core Engine</span>
              </div>
            </motion.div>
          </div>

          {ecosystemItems.slice(4, 5).map(({ label, Icon, detail, moduleId }) => {
            const isHovered = hoveredModuleId === moduleId;
            return (
              <Reveal key={label} delay={0.16}>
                <motion.div
                  onMouseEnter={() => setHoveredModuleId(moduleId)}
                  onMouseLeave={() => setHoveredModuleId(null)}
                  onClick={() => setSelectedModuleId(moduleId)}
                  whileHover={{ y: -4 }}
                  className={`group relative flex min-h-[148px] flex-col justify-between rounded-[1.25rem] border p-5 transition-all duration-300 cursor-pointer backdrop-blur-xl overflow-hidden ${
                    isHovered
                      ? "z-30 border-[#C89B3C]/40 bg-white dark:bg-[#11131A] shadow-[0_12px_40px_rgba(200,155,60,0.15)] dark:shadow-[0_12px_40px_rgba(200,155,60,0.1)] -translate-y-1.5 scale-[1.02]"
                      : "z-10 border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-[#0b0e14]/50 shadow-sm"
                  }`}
                >
                  {/* Subtle glossy top inner border */}
                  <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-b from-white/60 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" />
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-[#DDB85A] transition-colors">
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400 font-normal">{detail}</p>
                  </div>
                </motion.div>
              </Reveal>
            );
          })}

          {/* Row 3: Notes, Reports, Files */}
          {ecosystemItems.slice(5, 8).map(({ label, Icon, detail, moduleId }, index) => {
            const isHovered = hoveredModuleId === moduleId;
            return (
              <Reveal key={label} delay={0.2 + index * 0.04}>
                <motion.div
                  onMouseEnter={() => setHoveredModuleId(moduleId)}
                  onMouseLeave={() => setHoveredModuleId(null)}
                  onClick={() => setSelectedModuleId(moduleId)}
                  whileHover={{ y: -4 }}
                  className={`group relative flex min-h-[148px] flex-col justify-between rounded-[1.25rem] border p-5 transition-all duration-300 cursor-pointer backdrop-blur-xl overflow-hidden ${
                    isHovered
                      ? "z-30 border-[#C89B3C]/40 bg-white dark:bg-[#11131A] shadow-[0_12px_40px_rgba(200,155,60,0.15)] dark:shadow-[0_12px_40px_rgba(200,155,60,0.1)] -translate-y-1.5 scale-[1.02]"
                      : "z-10 border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-[#0b0e14]/50 shadow-sm"
                  }`}
                >
                  {/* Subtle glossy top inner border */}
                  <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-b from-white/60 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" />
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-[#DDB85A] transition-colors">
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400 font-normal">{detail}</p>
                  </div>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {activeModule && (
          <WalkthroughModal
            activeModule={activeModule}
            onClose={() => setSelectedModuleId(null)}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function AppPreview({ kind }: { kind: "dashboard" | "tasks" | "calendar" | "analytics" }) {
  const titles = { dashboard: "Today at a glance", tasks: "My active tasks", calendar: "August 2026", analytics: "Execution analytics" };
  return (
    <GlassCard className="overflow-hidden p-3 sm:p-5 border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0e111a]/95 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.07] pb-3">
        <div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-400/80" /><i className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /></div>
        <div className="ml-3 flex-1 rounded-md bg-slate-100 dark:bg-white/[0.05] px-3 py-1 text-[10px] text-slate-500 font-mono">app.manmadhan.progress/{kind}</div>
        <MoreHorizontal className="h-4 w-4 text-slate-400" />
      </div>
      <div className="grid grid-cols-[108px_1fr] gap-4 pt-4 sm:grid-cols-[140px_1fr]">
        <aside className="space-y-2.5 border-r border-slate-200 dark:border-white/[0.06] pr-3">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-bold text-slate-900 dark:text-white"><div className="h-4 w-4 rounded bg-[#C89B3C]" /> Progress</div>
          {["Overview", "My tasks", "Projects", "Calendar", "Insights"].map((item, i) => (
            <div key={item} className={"flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] font-medium " + (i === 0 ? "bg-amber-500/10 text-amber-700 dark:text-[#DDB85A]" : "text-slate-500 dark:text-slate-400")}>
              <CircleDot className="h-3 w-3" />{item}
            </div>
          ))}
        </aside>
        <div className="min-w-0">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] text-slate-500">Wednesday, August 5</p><h3 className="mt-0.5 text-sm sm:text-base font-bold text-slate-900 dark:text-white">{titles[kind]}</h3></div>
            <button className="rounded-md bg-[#C89B3C] hover:bg-[#DDB85A] px-2.5 py-1 text-[9px] font-bold text-black">{kind === "calendar" ? "Add event" : "New task"}</button>
          </div>
          {kind === "dashboard" && <div className="mt-4 grid grid-cols-3 gap-2">{[["Tasks done", "18 / 24"], ["Focus time", "5.4h"], ["Momentum", "+18%"]].map(([a,b]) => <div key={a} className="rounded-lg border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.025] p-2"><p className="text-[9px] text-slate-500">{a}</p><p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{b}</p><div className="mt-1.5 h-1 rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full w-3/4 rounded-full bg-[#C89B3C]" /></div></div>)}</div>}
          {kind === "tasks" && <div className="mt-4 space-y-2">{["Finalize launch narrative", "Review workspace permissions", "Prepare Friday progress report", "Clean up project backlog"].map((task, i) => <div key={task} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/[0.07] p-2 bg-slate-50/50 dark:bg-transparent"><span className={"h-3.5 w-3.5 rounded-full border flex items-center justify-center " + (i === 0 ? "border-[#C89B3C] bg-[#C89B3C]" : "border-slate-400 dark:border-slate-600")}>{i === 0 && <Check className="h-2.5 w-2.5 text-black" />}</span><span className="flex-1 text-[10px] text-slate-800 dark:text-slate-300 font-medium truncate">{task}</span><span className="text-[9px] text-slate-400">{i + 1}d</span></div>)}</div>}
          {kind === "calendar" && <div className="mt-4 grid grid-cols-7 gap-1 text-center">{Array.from({ length: 28 }, (_, i) => <div key={i} className={"rounded py-1.5 text-[9px] font-semibold " + ([4, 9, 17, 22].includes(i) ? "bg-amber-500/20 text-amber-700 dark:text-[#DDB85A] border border-amber-500/30" : "bg-slate-50 dark:bg-white/[0.025] text-slate-500")}>{i + 1}</div>)}</div>}
          {kind === "analytics" && <div className="mt-4 rounded-lg border border-slate-200 dark:border-white/[0.07] p-2.5 bg-slate-50/50 dark:bg-transparent"><div className="flex h-24 items-end gap-1.5">{[38, 54, 44, 70, 62, 84, 76, 94, 82, 100].map((height, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-amber-600 to-[#DDB85A]" style={{ height: height + "%" }} />)}</div><div className="mt-2 flex justify-between text-[9px] text-slate-500"><span>Jul 27</span><span>Aug 5</span></div></div>}
        </div>
      </div>
    </GlassCard>
  );
}

function WalkthroughModal({
  activeModule,
  onClose,
  onNavigate,
}: {
  activeModule: WalkthroughModule;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
}) {
  const Icon = activeModule.icon;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus scroll container on mount so mouse wheel & arrow keys work instantly
    scrollRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate("prev");
      if (e.key === "ArrowRight") onNavigate("next");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNavigate, activeModule]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 dark:bg-black/90 p-3 sm:p-6 backdrop-blur-2xl overflow-hidden"
      onClick={onClose}
    >
      {/* 3D Glassmorphism Card Entrance */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotateX: 8, y: 35 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, rotateX: -6, y: 25 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-6xl h-[88vh] max-h-[88vh] rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E15] text-slate-900 dark:text-white shadow-2xl overflow-hidden"
      >

        {/* Fixed Top Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/95 dark:bg-[#080A10]/90 z-20 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className={"p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 shadow-sm " + activeModule.color}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-[#DDB85A]">{activeModule.eyebrow}</span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{activeModule.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs text-slate-500 font-mono">Use ← → keys to navigate</span>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Close walkthrough"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body - Single Dedicated Mouse Wheel & Trackpad Scroll Surface */}
        <div
          ref={scrollRef}
          tabIndex={0}
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 overflow-y-auto p-6 sm:p-8 overscroll-contain focus:outline-none scrollbar-thin scrollbar-thumb-amber-500/40"
          style={{ touchAction: "pan-y" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Device Frame Showcase */}
            <div className="lg:col-span-5 lg:sticky lg:top-0 h-fit self-start p-6 rounded-2xl bg-slate-100/80 dark:bg-[#07090F] border border-slate-200 dark:border-white/[0.06] flex flex-col justify-center items-center relative overflow-hidden shadow-xl">
              

              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="w-full max-w-sm relative z-10"
              >
                <GlassCard className="p-4 border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#0e111a]/95 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-2.5 mb-3">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">app.manmadhan.progress/{activeModule.id}</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#C89B3C]/50" />
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Active View</span>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{activeModule.title}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-[#DDB85A] text-[9.5px] font-semibold">
                        Enterprise OS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] space-y-1">
                        <span className="text-[9px] text-slate-500 block">Execution Status</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">94.8% Optimal</span>
                        <div className="h-1 rounded-full bg-slate-200 dark:bg-white/10 mt-1">
                          <div className="h-full w-4/5 rounded-full bg-emerald-500" />
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] space-y-1">
                        <span className="text-[9px] text-slate-500 block">Weekly Velocity</span>
                        <span className="text-xs font-bold text-amber-700 dark:text-[#DDB85A]">+18.4% Sprint</span>
                        <div className="h-1 rounded-full bg-slate-200 dark:bg-white/10 mt-1">
                          <div className="h-full w-3/4 rounded-full bg-[#C89B3C]" />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.025] border border-slate-200 dark:border-white/[0.06] space-y-1.5">
                      <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block">Module Key Features</span>
                      {activeModule.keyFeatures.slice(0, 3).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-700 dark:text-slate-300 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C89B3C] shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              <div className="mt-3 text-center">
                <p className="text-xs italic text-slate-600 dark:text-slate-400 max-w-xs font-normal">"{activeModule.tagline}"</p>
              </div>
            </div>

            {/* Right Column: Detailed Walkthrough Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Overview</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-200 font-medium">{activeModule.overview}</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 dark:border-amber-500/15 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold">
                  <Target className="w-4 h-4" />
                  <span>Purpose & Core Goal</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{activeModule.purpose}</p>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 dark:text-[#DDB85A]" />
                  Key Features
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeModule.keyFeatures.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.025] border border-slate-200 dark:border-white/[0.06] text-xs text-slate-700 dark:text-slate-300 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C89B3C] shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <WorkflowIcon className="w-4 h-4 text-amber-600 dark:text-[#DDB85A]" />
                  Execution Workflow
                </h3>
                <div className="space-y-1.5">
                  {activeModule.workflow.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-[#DDB85A] text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-300">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Key Benefits
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeModule.benefits.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Related: </span>
                  <span>{activeModule.relatedModules.join(" · ")}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px]">
                  💡 <span className="font-semibold">Tip: </span>{activeModule.quickTip}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Navigation Bar */}
        <div className="flex shrink-0 items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/95 dark:bg-[#080A10]/90 z-20 backdrop-blur-xl">
          <button
            onClick={() => onNavigate("prev")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              {activeModule.eyebrow.split(" / ")[0]} / 10
            </span>
            <span className="text-xs text-amber-700 dark:text-[#DDB85A] font-bold">· {activeModule.title}</span>
          </div>

          <button
            onClick={() => onNavigate("next")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C89B3C] hover:bg-[#DDB85A] text-xs font-bold text-black transition-colors cursor-pointer"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const experiences = [
  { kind: "dashboard" as const, eyebrow: "01 / Dashboard OS", title: "See the whole system at a glance.", description: "A focused home for the work in motion, the time protected, and the progress earned." },
  { kind: "tasks" as const, eyebrow: "02 / Action Engine", title: "Make the next action obvious.", description: "Turn a long list into a clear sequence of meaningful work, with ownership and momentum built in." },
  { kind: "calendar" as const, eyebrow: "03 / Time Protection", title: "Give important work a place.", description: "Plan around real capacity and keep your commitments visible without filling the day with noise." },
  { kind: "analytics" as const, eyebrow: "04 / Empirical Visibility", title: "Learn from how you execute.", description: "See completion trends, focus patterns, and the signals that help your next week run better." },
];

export function ProductExperience() {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const activeModule = walkthroughModules.find((m) => m.id === selectedModuleId);

  const handleNavigate = useCallback((direction: "prev" | "next") => {
    if (!selectedModuleId) return;
    const idx = walkthroughModules.findIndex((m) => m.id === selectedModuleId);
    if (direction === "prev") {
      const nextIdx = (idx - 1 + walkthroughModules.length) % walkthroughModules.length;
      setSelectedModuleId(walkthroughModules[nextIdx].id);
    } else {
      const nextIdx = (idx + 1) % walkthroughModules.length;
      setSelectedModuleId(walkthroughModules[nextIdx].id);
    }
  }, [selectedModuleId]);

  return (
    <section id="experience" className="border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/70 dark:bg-[#07090E] py-28 transition-colors duration-200">
      <SectionTitle
        eyebrow="The Product Experience"
        title="A workspace engineered for meaningful progress."
        description="Every view is designed to reduce the distance between intention and completion."
      />

      <div className="site-container mt-20 space-y-24 sm:space-y-32">
        {experiences.map(({ kind, eyebrow, title, description }, index) => {
          const isEven = index % 2 === 0;
          const moduleInfo = walkthroughModules.find((m) => m.id === kind);

          return (
            <div
              key={kind}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center"
            >
              {/* LEFT / RIGHT ALTERNATING APP SHOWCASE CARD */}
              <motion.div
                initial={{ opacity: 0, x: isEven ? -40 : 40, scale: 0.95 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setSelectedModuleId(kind)}
                className={`lg:col-span-7 cursor-pointer group relative rounded-3xl overflow-hidden shadow-2xl transition-all border-2 border-slate-200/80 dark:border-white/10 hover:border-[#C89B3C] dark:hover:border-[#C89B3C] bg-white dark:bg-[#0E1118] ${
                  isEven ? "lg:order-1" : "lg:order-2"
                }`}
              >
                {/* Gold Top Accent Line */}
                <div className="h-1 w-full bg-gradient-to-r from-[#C89B3C] via-amber-400 to-[#C89B3C]" />
                <AppPreview kind={kind} />
              </motion.div>

              {/* LEFT / RIGHT ALTERNATING STRUCTURED CONTENT */}
              <motion.div
                initial={{ opacity: 0, x: isEven ? 40 : -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                className={`lg:col-span-5 space-y-5 ${
                  isEven ? "lg:order-2" : "lg:order-1"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-700 dark:text-[#DDB85A]">
                    {eyebrow}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">0{index + 1}</span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  {title}
                </h3>

                <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                  {description}
                </p>

                {moduleInfo && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {moduleInfo.keyFeatures.slice(0, 3).map((feat, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs"
                      >
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-3">
                  <button
                    onClick={() => setSelectedModuleId(kind)}
                    className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[#C89B3C] hover:bg-[#DDB85A] text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/15 cursor-pointer group"
                  >
                    <span>Explore Walkthrough</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {activeModule && (
          <WalkthroughModal
            activeModule={activeModule}
            onClose={() => setSelectedModuleId(null)}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

const modulesData: [string, string, LucideIcon, string, string, string[]][] = [
  ["Tasks", "Keep daily work moving with clarity.", CheckSquare, "text-[#C89B3C] dark:text-[#DDB85A]", "tasks", ["Priority Queues", "Milestone Triggers"]],
  ["Projects", "Align people, milestones, and outcomes.", FolderKanban, "text-blue-600 dark:text-blue-400", "projects", ["Interactive Roadmap", "Health Scoring"]],
  ["Calendar", "Protect the time your priorities need.", CalendarDays, "text-emerald-600 dark:text-emerald-400", "calendar", ["Protected Focus Blocks", "Calendar Sync"]],
  ["Goals", "Connect today’s work to the bigger aim.", Target, "text-purple-600 dark:text-violet-400", "goals", ["Multi-tier OKRs", "Progress Rollups"]],
  ["Analytics", "Read the patterns behind progress.", BarChart3, "text-cyan-600 dark:text-cyan-400", "analytics", ["Velocity Trendlines", "Cycle Metrics"]],
  ["Notes", "Capture context where decisions happen.", FileText, "text-rose-600 dark:text-rose-400", "notes", ["Contextual Docs", "Inline Mentions"]],
  ["Reports", "Share progress without status theatre.", Gauge, "text-amber-600 dark:text-amber-400", "reports", ["Automated Summaries", "PDF & Link Share"]],
  ["Files", "Keep resources organized and close.", Layers3, "text-slate-700 dark:text-slate-300", "files", ["Project Asset Vault", "Version Control"]],
];

export function CoreModules() {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const activeModule = walkthroughModules.find((m) => m.id === selectedModuleId);

  const handleNavigate = useCallback((direction: "prev" | "next") => {
    if (!selectedModuleId) return;
    const idx = walkthroughModules.findIndex((m) => m.id === selectedModuleId);
    if (direction === "prev") {
      const nextIdx = (idx - 1 + walkthroughModules.length) % walkthroughModules.length;
      setSelectedModuleId(walkthroughModules[nextIdx].id);
    } else {
      const nextIdx = (idx + 1) % walkthroughModules.length;
      setSelectedModuleId(walkthroughModules[nextIdx].id);
    }
  }, [selectedModuleId]);

  return (
    <section id="modules" className="border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#07090E] py-24 transition-colors duration-200">
      <SectionTitle
        eyebrow="Core modules"
        title="The essentials, thoughtfully connected."
        description="Purpose-built modules give every part of your operating rhythm a clear home."
      />

      {/* 4 CARDS PER ROW GRID LAYOUT */}
      <div className="site-container mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modulesData.map(([title, body, Icon, iconColor, moduleId, features], i) => (
          <Reveal key={title} delay={i * 0.03}>
            <motion.div
              onClick={() => setSelectedModuleId(moduleId)}
              whileHover={{ y: -3 }}
              className="group h-full w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0B0E14] p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200">
                    <Icon className={"h-5 w-5 " + iconColor} strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-400">0{i + 1}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1.5">
                  {title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-normal mb-4">
                  {body}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.07] text-[10.5px] font-semibold text-slate-700 dark:text-slate-300"
                    >
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                <span>Explore Walkthrough</span>
                <ChevronRight className="h-4 w-4 text-amber-700 dark:text-[#DDB85A] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>

      <AnimatePresence>
        {activeModule && (
          <WalkthroughModal
            activeModule={activeModule}
            onClose={() => setSelectedModuleId(null)}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

const steps = [
  { label: "Idea", Icon: Flag, text: "Capture what could matter", input: "Unfiltered thoughts, feature requests, notes", output: "Structured proposal backlog", why: "Prevents good ideas from getting lost in chat threads." },
  { label: "Planning", Icon: Settings2, text: "Shape it into a path", input: "Backlog proposals & target OKRs", output: "Scoped sprints & milestone timelines", why: "Ensures work is broken down before execution starts." },
  { label: "Execution", Icon: Play, text: "Protect the next move", input: "Sprint task queue & deep work blocks", output: "Completed task deliverables", why: "Protects high-value focus time from status meeting noise." },
  { label: "Tracking", Icon: Activity, text: "See what is changing", input: "Live activity & blocker alerts", output: "Realtime velocity signals", why: "Detects path blockers before deadline collisions happen." },
  { label: "Completion", Icon: Check, text: "Close the loop", input: "Finished deliverables & peer reviews", output: "Verified production releases", why: "Guarantees quality & verification before shipping." },
  { label: "Insights", Icon: TrendingUp, text: "Carry the learning forward", input: "Sprint velocity & focus metrics", output: "Actionable retrospective retro data", why: "Compound productivity gains week over week." },
] as const;

export function Workflow() {
  const [activeStep, setActiveStep] = useState<typeof steps[number] | null>(null);
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);

  return (
    <section id="workflow" className="border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a0c11] py-28 transition-colors duration-200">
      <SectionTitle eyebrow="Productivity workflow" title="From first thought to finished outcome." description="A simple rhythm for turning intention into progress you can see. Click any stage to explore." />
      
      <div className="site-container relative mt-20 grid grid-cols-2 gap-y-10 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {/* 3D Animated Vector Connection Path Across All 6 Workflow Nodes */}
        <svg className="pointer-events-none absolute inset-x-0 top-8 hidden h-6 w-full lg:block z-0 overflow-visible">
          <defs>
            <linearGradient id="workflowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C89B3C" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#C89B3C" stopOpacity="0.2" />
            </linearGradient>
            <filter id="wfGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Base Track Line */}
          <line
            x1="8%"
            y1="50%"
            x2="92%"
            y2="50%"
            stroke="url(#workflowGrad)"
            strokeWidth="2.5"
            strokeDasharray="6 6"
          />

          {/* Animated Flowing Pulse Particles (1 -> 6) */}
          {[0, 1, 2, 3, 4].map((segIdx) => {
            const isHovered = hoveredStepIndex === segIdx || hoveredStepIndex === segIdx + 1;
            const x1 = 8.33 + segIdx * 16.66;
            const x2 = 8.33 + (segIdx + 1) * 16.66;

            return (
              <g key={segIdx}>
                <line
                  x1={`${x1}%`}
                  y1="50%"
                  x2={`${x2}%`}
                  y2="50%"
                  stroke={isHovered ? "#F59E0B" : "#C89B3C"}
                  strokeWidth={isHovered ? "3.5" : "2"}
                  strokeOpacity={isHovered ? "1" : "0.5"}
                  filter={isHovered ? "url(#wfGlow)" : undefined}
                  className="transition-all duration-300"
                />
                <circle r={isHovered ? "4" : "2.5"} fill={isHovered ? "#FFF" : "#F59E0B"} filter="url(#wfGlow)">
                  <animateMotion
                    path={`M ${x1 * 10} 12 L ${x2 * 10} 12` /* smooth SVG trajectory */}
                    dur={isHovered ? "1.5s" : "3s"}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}
        </svg>

        {steps.map((step, i) => {
          const Icon = step.Icon;
          const isHovered = hoveredStepIndex === i;

          return (
            <Reveal key={step.label} delay={i * .06} className="relative z-10">
              <div
                onMouseEnter={() => setHoveredStepIndex(i)}
                onMouseLeave={() => setHoveredStepIndex(null)}
                onClick={() => setActiveStep(step)}
                className="flex flex-col items-center text-center group cursor-pointer"
              >
                <motion.div
                  whileHover={{ y: -6, scale: 1.12 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-300 backdrop-blur-xl ${
                    isHovered
                      ? "border-[#F59E0B] bg-amber-500/25 dark:bg-[#251f12] text-amber-900 dark:text-white shadow-[0_10px_30px_rgba(245,158,11,0.4)] scale-110"
                      : "border-[#C89B3C]/50 bg-amber-500/10 dark:bg-[#17140e] text-amber-700 dark:text-[#DDB85A] shadow-md"
                  }`}
                >
                  <Icon className="h-6 w-6 stroke-[1.8]" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#C89B3C] text-[10px] font-bold text-black shadow-sm">
                    {i + 1}
                  </span>
                </motion.div>
                <h3 className="mt-5 text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{step.label}</h3>
                <p className="mt-2 max-w-[130px] text-xs leading-5 text-slate-600 dark:text-slate-400 font-medium">{step.text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>

      <AnimatePresence>
        {activeStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveStep(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-black/85 p-4 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl rounded-3xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0C0E15] p-6 text-slate-900 dark:text-white shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#DDB85A]">
                    <activeStep.Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-[#DDB85A]">Workflow Stage</span>
                    <h3 className="text-lg font-bold">{activeStep.label}</h3>
                  </div>
                </div>

                <button
                  onClick={() => setActiveStep(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{activeStep.text}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] space-y-1">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-[#DDB85A] uppercase tracking-wider">Input Requirements</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{activeStep.input}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Deliverable Output</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{activeStep.output}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-800 dark:text-slate-200">
                <span className="font-bold text-amber-700 dark:text-[#DDB85A]">Why this exists: </span>{activeStep.why}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

const automation = [
  ["Smart scheduling", "Find the right window for important work.", CalendarDays, "Automates calendar conflict resolution and blocks 2-hour deep work focus windows based on team capacity."],
  ["Priority detection", "Surface the work that unlocks the most progress.", Target, "Scans sprint dependencies and highlights critical path items before milestone deadlines."],
  ["Deadline prediction", "Spot pressure early enough to respond well.", Clock3, "Uses velocity algorithms to predict completion timelines and alert leads to potential delays."],
  ["Execution insights", "Understand the habits behind your best weeks.", BarChart3, "Synthesizes focus hours vs meeting overhead into clear productivity trendlines."],
  ["Workflow automation", "Remove repeatable steps from the path.", WorkflowIcon, "Triggers automatic task status updates when github PRs are merged or reviews complete."],
  ["Weekly reports", "Start each review with the signal, not the scramble.", FileText, "Generates automated weekly progress reports for leadership and stakeholders."],
  ["Focus analytics", "Measure protected attention over busywork.", Gauge, "Tracks undisturbed focus time blocks and reduces context switching friction."],
] as const;

export function Automation() {
  const [activeAuto, setActiveAuto] = useState<any>(null);

  // Group 7 automation features into 3 distinct Zig-Zag showcase sections
  const autoGroups = [
    {
      title: "Capacity & Priority Engine",
      eyebrow: "01 / AUTOMATED SCHEDULING",
      items: [automation[0], automation[1]], // Smart scheduling, Priority detection
      details: "Automates calendar conflict resolution and blocks 2-hour deep work focus windows based on team capacity. Scans sprint dependencies and highlights critical path items before milestone deadlines.",
    },
    {
      title: "Predictive Velocity & Habits",
      eyebrow: "02 / VELOCITY ANALYTICS",
      items: [automation[2], automation[3]], // Deadline prediction, Execution insights
      details: "Uses velocity algorithms to predict completion timelines and alert leads to potential delays. Synthesizes focus hours vs meeting overhead into clear productivity trendlines.",
    },
    {
      title: "Workflow Automation & Shield",
      eyebrow: "03 / SILENT INTEGRATION",
      items: [automation[4], automation[5], automation[6]], // Workflow auto, Weekly reports, Focus analytics
      details: "Triggers automatic task status updates when github PRs are merged. Generates automated weekly progress reports for leadership while protecting undisturbed attention.",
    },
  ];

  return (
    <section id="automation" className="border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#07090E] py-28 transition-colors duration-200">
      <SectionTitle
        eyebrow="Quiet intelligence"
        title="More signal. Less ceremony."
        description="Helpful automation works in the background, keeping your attention on decisions and outcomes. Click any intelligence card to explore."
      />

      {/* ZIG-ZAG ALTERNATING SCROLL SHOWCASE */}
      <div className="site-container mt-20 space-y-24">
        {autoGroups.map((group, index) => {
          const isEven = index % 2 === 0;

          return (
            <div
              key={group.title}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center"
            >
              {/* LEFT / RIGHT ALTERNATING CARDS GRID */}
              <motion.div
                initial={{ opacity: 0, x: isEven ? -40 : 40, scale: 0.96 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className={`lg:col-span-7 grid gap-4 sm:grid-cols-${group.items.length > 2 ? "3" : "2"} ${
                  isEven ? "lg:order-1" : "lg:order-2"
                }`}
              >
                {group.items.map(([itemTitle, itemBody, Icon, detail], i) => (
                  <motion.div
                    key={itemTitle}
                    whileHover={{ y: -4 }}
                    onClick={() => setActiveAuto([itemTitle, itemBody, Icon, detail])}
                    className="group cursor-pointer rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0B0E14] p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-amber-700 dark:text-[#DDB85A]">
                          <Icon className="h-5 w-5 stroke-[1.8]" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-1">{itemTitle}</h4>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">{itemBody}</p>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] text-[11px] font-bold text-amber-700 dark:text-[#DDB85A]">
                      Explore Intelligence →
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* LEFT / RIGHT ALTERNATING TEXT CONTENT */}
              <motion.div
                initial={{ opacity: 0, x: isEven ? 40 : -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                className={`lg:col-span-5 space-y-4 ${
                  isEven ? "lg:order-2" : "lg:order-1"
                }`}
              >
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-700 dark:text-[#DDB85A]">
                  {group.eyebrow}
                </span>

                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  {group.title}
                </h3>

                <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                  {group.details}
                </p>

                <div className="pt-2 flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <LockKeyhole className="h-4 w-4 text-amber-700 dark:text-[#DDB85A]" />
                  <span>Your workspace stays private and yours.</span>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {activeAuto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveAuto(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-black/85 p-4 backdrop-blur-2xl overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0C0E15] p-6 text-slate-900 dark:text-white shadow-2xl space-y-4"
            >
              {(() => {
                const AutoIcon = activeAuto[2];
                return (
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#DDB85A]">
                        <AutoIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-[#DDB85A]">Quiet Intelligence</span>
                        <h3 className="text-lg font-bold">{activeAuto[0]}</h3>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveAuto(null)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                );
              })()}

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{activeAuto[1]}</p>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                <span className="font-bold text-amber-700 dark:text-[#DDB85A] block">How it operates:</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{activeAuto[3]}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function Comparison() {
  const principles = [
    {
      category: "CONSOLIDATION",
      title: "Everything in one place.",
      desc: "Your tasks, notes, calendar, and goals belong together in a single context. Stop jumping between four different apps just to figure out what to do next.",
      icon: Layers3,
      stat: "Zero context switching",
    },
    {
      category: "ATTENTION",
      title: "Protect your focus time.",
      desc: "Integrated focus session rings and calm workspace defaults mean you spend your energy executing, not managing notification noise.",
      icon: Clock3,
      stat: "Quiet by default",
    },
    {
      category: "PRIVACY",
      title: "Fast, offline, and yours.",
      desc: "Sub-50ms instant response. Your workspace data stays stored locally on your device, encrypted and private by default.",
      icon: LockKeyhole,
      stat: "100% Local & encrypted",
    },
  ];

  return (
    <section id="why" className="border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#07090E] py-28 transition-colors duration-200">
      <SectionTitle
        eyebrow="Built For Real Work"
        title="A calmer way to move important work."
        description="Leave fragmented tools and status chasing behind. Keep the things that make execution feel human."
      />

      <div className="site-container mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {principles.map((item, i) => {
          const Icon = item.icon;

          return (
            <Reveal key={item.title} delay={i * 0.05}>
              <motion.div
                whileHover={{ y: -3 }}
                className="group h-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0C10] p-7 sm:p-8 shadow-xs hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white transition-colors group-hover:border-amber-500/30">
                      <Icon className="h-5 w-5 stroke-[1.8]" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-amber-800 dark:text-[#E5B94E]">
                      {item.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-5 border-t border-slate-100 dark:border-white/[0.06] mt-6 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Standard:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{item.stat}</span>
                </div>
              </motion.div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function CTA() {
  const { open: openAuth } = useAuth();
  return (
    <section
      className="relative overflow-hidden border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#07090E] py-28 transition-colors duration-200"
    >
      {/* Clean Subtle Grid Overlay (Zero Glow, Zero Yellow Shading) */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:3rem_3rem]" />

      <div className="site-container relative z-10 text-center">
        <div className="mx-auto max-w-[640px] space-y-4">
          <Reveal>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800 dark:text-[#DDB85A]">
              BUILD YOUR EXECUTION RHYTHM
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="text-4xl font-extrabold tracking-[-0.035em] text-slate-900 dark:text-white sm:text-6xl leading-[1.1]">
              Ready to Execute Better?
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mx-auto text-base font-medium leading-7 text-slate-600 dark:text-slate-400 max-w-[640px]">
              Transform ideas into completed outcomes with one unified execution workspace.
            </p>
          </Reveal>
        </div>

        {/* Action Buttons */}
        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            {/* Primary Button */}
            <motion.a
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="#auth"
              onClick={(event) => { event.preventDefault(); openAuth(); }}
              className="w-full sm:w-auto min-w-[200px] group inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-sm tracking-tight transition-all shadow-xl cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </motion.a>

            {/* Secondary Button */}
            <motion.a
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="/welcome"
              className="w-full sm:w-auto min-w-[200px] group inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl border border-slate-300 dark:border-white/20 bg-white/90 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold text-sm tracking-tight transition-all shadow-xs cursor-pointer backdrop-blur-xl"
            >
              <span>Explore Workspace</span>
              <Compass className="w-4 h-4 text-amber-700 dark:text-[#DDB85A] group-hover:rotate-45 transition-transform" />
            </motion.a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);

  const handleLink = (title: string, href: string) => {
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (href.startsWith("/")) {
      window.location.href = href;
    } else {
      setModalContent({
        title,
        body: `This is the production ${title} view of ManMadhan Progress Operating System.`,
      });
    }
  };

  return (
    <Reveal>
      <footer className="border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#07090E] py-14 transition-colors duration-200 relative">
        <div className="site-container">
          <div className="space-y-10">
            {/* Top Brand Identity Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-200 dark:border-white/[0.08] pb-8">
              <div className="flex items-center gap-3">
                <Image src="/ios/iTunesArtwork@1x.png" alt="ManMadhan Progress" width={36} height={36} className="rounded-xl shadow-xs" />
                <div>
                  <span className="block text-base font-bold text-slate-900 dark:text-white">ManMadhan Progress</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Plan Better • Focus Deeper • Achieve Greater</span>
                </div>
              </div>

            </div>

            {/* Thirukkural Vidamuyarchi Quotes Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Kural 619 */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-slate-50/90 dark:bg-[#0B0E14] p-6 shadow-xs hover:border-slate-300 dark:hover:border-white/25 transition-all space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-extrabold tracking-widest text-amber-800 dark:text-amber-400 uppercase block mb-2.5">
                    திருக்குறள் 619
                  </span>
                  <p className="text-base font-extrabold text-slate-900 dark:text-white leading-relaxed tracking-wide">
                    "தெய்வத்தான் ஆகா தெனினும் முயற்சிதன் மெய்வருத்தக் கூலி தரும்."
                  </p>
                </div>
                <div className="pt-3.5 border-t border-slate-200 dark:border-white/10">
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                    "Even when destiny says it is impossible, relentless personal effort will yield the rewarding fruits of labor."
                  </p>
                </div>
              </div>

              {/* Kural 611 */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-slate-50/90 dark:bg-[#0B0E14] p-6 shadow-xs hover:border-slate-300 dark:hover:border-white/25 transition-all space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-extrabold tracking-widest text-amber-800 dark:text-amber-400 uppercase block mb-2.5">
                    திருக்குறள் 611
                  </span>
                  <p className="text-base font-extrabold text-slate-900 dark:text-white leading-relaxed tracking-wide">
                    "அருமை உடைத்தென்றா வமைவுஅன்மை வேண்டும் பெருமை முயற்சி தரும்."
                  </p>
                </div>
                <div className="pt-3.5 border-t border-slate-200 dark:border-white/10">
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                    "Do not hesitate thinking a task is too difficult; persistent effort alone unlocks true greatness."
                  </p>
                </div>
              </div>

              {/* Kural 612 */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-slate-50/90 dark:bg-[#0B0E14] p-6 shadow-xs hover:border-slate-300 dark:hover:border-white/25 transition-all space-y-3 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                <div>
                  <span className="text-xs font-mono font-extrabold tracking-widest text-amber-800 dark:text-amber-400 uppercase block mb-2.5">
                    திருக்குறள் 612
                  </span>
                  <p className="text-base font-extrabold text-slate-900 dark:text-white leading-relaxed tracking-wide">
                    "முயற்சி திருவினை ஆக்கும் முயற்றின்மை இன்மை புகுத்தி விடும்."
                  </p>
                </div>
                <div className="pt-3.5 border-t border-slate-200 dark:border-white/10">
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                    "Unwavering effort creates prosperity and mastery; inaction only invites deficiency and stagnation."
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <AnimatePresence>
          {modalContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalContent(null)}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-black/85 p-4 backdrop-blur-2xl"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0C0E15] p-6 text-slate-900 dark:text-white shadow-2xl space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <h3 className="text-lg font-bold">{modalContent.title}</h3>
                  <button
                    onClick={() => setModalContent(null)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{modalContent.body}</p>
                <div className="pt-3">
                  <button
                    onClick={() => window.location.href = "/welcome"}
                    className="w-full py-2.5 rounded-xl bg-[#C89B3C] text-black font-bold text-xs hover:bg-[#DDB85A] transition-colors"
                  >
                    Open Full Workspace →
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </Reveal>
  );
}

export function RemainingLandingSections() {
  return (
    <>
      <ExecutionEcosystem />
      <ProductExperience />
      <CoreModules />
      <Workflow />
      <Automation />
      <Comparison />
      <CTA />
      <LandingFooter />
    </>
  );
}
