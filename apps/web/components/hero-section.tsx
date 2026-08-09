"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValue, useTransform, useSpring, useScroll } from "framer-motion";
import { useAuth } from "./auth/auth-context";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Calendar as CalendarIcon,
  Target,
  FileText,
  BarChart3,
  Users,
  Settings,
  Search,
  Bell,
  Plus,
  Play,
  ShieldCheck,
  Crown,
  Zap,
  LockKeyhole,
  ChevronDown,
  ArrowUpRight,
  CircleCheck,
  CircleDot,
  Layers,
  Activity,
  TrendingUp,
  Timer,
  MessageSquare,
  GitBranch,
  Flame,
  BadgeCheck,
  Inbox,
  Compass,
} from "lucide-react";

const weekBars = [
  { day: "M", h: 55, active: false },
  { day: "T", h: 80, active: false },
  { day: "W", h: 40, active: false },
  { day: "T", h: 92, active: false },
  { day: "F", h: 72, active: true },
  { day: "S", h: 35, active: false },
  { day: "S", h: 60, active: false },
];

const miniTasks = [
  { label: "Design System v3", done: true, p: "Alpha" },
  { label: "Auth Module", done: false, p: "Nova" },
  { label: "API Integration", done: false, p: "Alpha" },
  { label: "UI Testing", done: true, p: "Phoenix" },
];

const goalRings = [
  { label: "Sprint", pct: 78, color: "#C89B3C", r: 22 },
  { label: "Monthly", pct: 54, color: "#6366f1", r: 15 },
  { label: "Quarterly", pct: 31, color: "#10b981", r: 9 },
];

const teamAvatars = [
  { name: "Alex M", color: "from-amber-500 to-amber-600" },
  { name: "Sarah K", color: "from-indigo-500 to-indigo-600" },
  { name: "David L", color: "from-emerald-500 to-emerald-600" },
  { name: "Elena R", color: "from-rose-500 to-rose-600" },
];

const aiLines = [
  "Prioritize TSK-102 — 3 blockers detected",
  "Focus window: 14:00–16:30 today",
  "Sprint velocity ↑ 18% this week",
];

function ProgressRing({ pct, r, color, stroke = 3, bg = "rgba(255,255,255,0.08)" }: { pct: number; r: number; color: string; stroke?: number; bg?: string }) {
  const size = (r + stroke + 2) * 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

function Sparkline({ data, color = "#C89B3C" }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 80; const h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min + 1)) * h;
    return `${x},${y}`;
  });
  const fillPts = `0,${h} ${pts.join(" ")} ${w},${h}`;
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="skg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#skg)" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlassCard({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] dark:bg-[#0C0F18]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.24)] hover:shadow-[0_8px_32px_rgba(200,155,60,0.15)] hover:border-[#C89B3C]/30 active:scale-[0.98] active:shadow-[0_4px_16px_rgba(200,155,60,0.2)] transition-all duration-300 cursor-pointer ${className}`} style={style}>
      {children}
    </div>
  );
}

import { X, Sparkles } from "lucide-react";

export function HeroSection() {
  const { open: openAuth } = useAuth();
  const [aiIndex, setAiIndex] = useState(0);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDemoOpen(false);
    };
    if (isDemoOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDemoOpen]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const hubScrollY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const hubScale = useTransform(scrollYProgress, [0, 1], [1, 0.93]);
  const floatYTopLeft = useTransform(scrollYProgress, [0, 1], [0, -55]);
  const floatYTopRight = useTransform(scrollYProgress, [0, 1], [0, 75]);
  const floatYMidLeft = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const floatYMidRight = useTransform(scrollYProgress, [0, 1], [0, 65]);
  const floatYBottomLeft = useTransform(scrollYProgress, [0, 1], [0, 45]);
  const floatYBottomRight = useTransform(scrollYProgress, [0, 1], [0, -50]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 80, damping: 22 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 22 });
  const rotateY = useTransform(springX, [-0.5, 0.5], [6, -6]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [-4, 4]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  useEffect(() => {
    const t = setInterval(() => setAiIndex((i) => (i + 1) % aiLines.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full bg-white dark:bg-[#07090E] transition-colors duration-200">
      <section
        ref={sectionRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full min-h-[calc(100vh-64px)] bg-white dark:bg-[#07090E] text-slate-900 dark:text-white pt-12 sm:pt-16 pb-12 overflow-hidden font-sans border-b border-slate-200/60 dark:border-white/[0.05] flex flex-col justify-between transition-colors duration-200"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-50/80 to-white dark:from-amber-500/10 dark:via-[#07090E]/90 dark:to-[#07090E] pointer-events-none transition-colors duration-200" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-[#C89B3C]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-[30%] right-[10%] w-[500px] h-[500px] bg-[#C89B3C]/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 relative z-10 my-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

            <div className="lg:col-span-5 flex flex-col text-left max-w-[820px]">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}
                className="group relative inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.04] backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.02)] self-start mb-8 overflow-hidden border border-slate-200/60 dark:border-white/10 hover:border-[#C89B3C]/30 transition-colors duration-300">
                <span className="relative w-1.5 h-1.5 rounded-full bg-[#C89B3C] animate-pulse" />
                <span className="relative text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-400">Execution Operating System</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }} className="flex flex-col gap-3 sm:gap-4 mb-8" style={{ fontFamily: "'Lucida Bright', 'Lucida Calligraphy', Lucida, 'Lucida Grande', 'Lucida Sans', sans-serif" }}>
                <h1 className="font-medium text-[#0F172A] dark:text-slate-100"
                  style={{ fontSize: "clamp(32px, 3.8vw, 72px)", lineHeight: 0.95, letterSpacing: "-0.02em" }}>
                  Plan Better.
                </h1>
                <h1 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF8A00] to-[#F5C242]"
                  style={{ fontSize: "clamp(32px, 3.8vw, 72px)", lineHeight: 0.95, letterSpacing: "-0.02em" }}>
                  Execute Smarter.
                </h1>
                <h1 className="font-medium text-[#0F172A] dark:text-slate-100"
                  style={{ fontSize: "clamp(32px, 3.8vw, 72px)", lineHeight: 0.95, letterSpacing: "-0.02em" }}>
                  Progress Every Day.
                </h1>
              </motion.div>

              <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
                className="font-normal text-[#475569] dark:text-slate-400 mb-10 text-[14px] sm:text-[15px] lg:text-[17px] leading-[1.6]"
                style={{ maxWidth: "580px" }}>
                ManMadhan Progress helps individuals and teams organize projects, manage tasks, collaborate efficiently, and achieve goals through a beautifully designed execution workspace.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 }} className="flex flex-wrap items-center gap-4 mb-10">
                <button
                  type="button"
                  onClick={openAuth}
                  className="inline-flex items-center justify-center gap-2.5 px-8 h-[60px] rounded-[18px] bg-[#0A0A0A] hover:bg-[#1A1A1A] dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#0A0A0A] font-medium text-[15px] tracking-tight transition-all duration-200 ease-out shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-[1px] active:scale-[0.98] group cursor-pointer border border-black dark:border-white/20"
                >
                  <span>Get Started Free</span>
                  <ArrowUpRight className="w-4 h-4 stroke-[2.2] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsDemoOpen(true)}
                  className="inline-flex items-center justify-center gap-2.5 px-8 h-[60px] rounded-[18px] bg-slate-50/80 hover:bg-slate-100/90 text-slate-900 border border-slate-200/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-white dark:border-white/10 font-medium text-[15px] tracking-tight transition-all duration-200 ease-out shadow-sm hover:shadow-md hover:-translate-y-[1px] active:scale-[0.98] cursor-pointer backdrop-blur-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Watch Demo</span>
                </button>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut", delay: 0.4 }} className="pt-6 border-t border-slate-200/60 dark:border-white/[0.08]">
                <div className="inline-flex flex-wrap items-center gap-4 sm:gap-6 px-5 py-2.5 rounded-[12px] bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.08] backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200"><Crown className="w-4 h-4 text-[#C89B3C] stroke-[2.2]" /><span>Enterprise Security</span></div>
                  <span className="w-[1px] h-3 bg-slate-200 dark:bg-white/10" />
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200"><Zap className="w-4 h-4 text-[#C89B3C] stroke-[2.2]" /><span>Sub-50ms Sync</span></div>
                  <span className="w-[1px] h-3 bg-slate-200 dark:bg-white/10" />
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200"><LockKeyhole className="w-4 h-4 text-[#C89B3C] stroke-[2.2]" /><span>End-to-End Encrypted</span></div>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-7 relative flex items-center justify-center min-h-[560px] select-none">
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 h-10 bg-gradient-to-r from-transparent via-[#C89B3C]/35 to-transparent blur-2xl rounded-full pointer-events-none" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/2 h-5 bg-[#C89B3C]/20 blur-xl rounded-full pointer-events-none" />



              <svg className="absolute inset-0 w-full h-full pointer-events-none z-[2]" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="cgl1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#C89B3C" stopOpacity="0" />
                    <stop offset="50%" stopColor="#C89B3C" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#C89B3C" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="cgl2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#C89B3C" stopOpacity="0" />
                    <stop offset="50%" stopColor="#C89B3C" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#C89B3C" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="8%" y1="26%" x2="30%" y2="38%" stroke="url(#cgl1)" strokeWidth="0.8" strokeDasharray="3 4" />
                <line x1="92%" y1="30%" x2="70%" y2="42%" stroke="url(#cgl1)" strokeWidth="0.8" strokeDasharray="3 4" />
                <line x1="10%" y1="70%" x2="30%" y2="62%" stroke="url(#cgl2)" strokeWidth="0.8" strokeDasharray="3 4" />
                <line x1="90%" y1="68%" x2="70%" y2="58%" stroke="url(#cgl2)" strokeWidth="0.8" strokeDasharray="3 4" />
                <circle cx="8%" cy="26%" r="2.5" fill="#C89B3C" opacity="0.4" />
                <circle cx="92%" cy="30%" r="2.5" fill="#C89B3C" opacity="0.4" />
                <circle cx="10%" cy="70%" r="2.5" fill="#C89B3C" opacity="0.4" />
                <circle cx="90%" cy="68%" r="2.5" fill="#C89B3C" opacity="0.4" />
              </svg>

              <motion.div style={{ rotateY, rotateX, y: hubScrollY, scale: hubScale, transformPerspective: 1400 }} className="relative z-[10] w-full max-w-[490px] mx-auto">
                <div className="rounded-[24px] border border-slate-200/60 dark:border-white/[0.08] bg-white/95 dark:bg-[#0B0E17]/95 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.5)] backdrop-blur-3xl overflow-hidden">

                  <div className="px-4 py-2.5 border-b border-slate-200/60 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.025] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      <span className="ml-3 text-[10px] font-semibold text-slate-500 dark:text-slate-500 hidden sm:inline-block tracking-wide">ManMadhan OS · Enterprise Workspace</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 hidden md:inline">Aug 04, 2026</span>
                    </div>
                  </div>

                  <div className="flex h-[380px] sm:h-[420px] overflow-hidden text-[11px]">
                    <aside className="w-44 border-r border-slate-200/60 dark:border-white/[0.07] bg-slate-50/70 dark:bg-[#080A12]/70 p-3 flex-col justify-between shrink-0 hidden sm:flex">
                      <div className="space-y-3.5">
                        <div className="flex items-center gap-2 px-1">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-sm">
                            <Flame className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-bold text-[11px] text-slate-900 dark:text-white tracking-tight">ManMadhan OS</span>
                        </div>
                        <nav className="space-y-0.5">
                          {[
                            { icon: LayoutDashboard, label: "Dashboard", active: true },
                            { icon: CheckSquare, label: "Tasks", badge: "12" },
                            { icon: FolderKanban, label: "Projects" },
                            { icon: CalendarIcon, label: "Calendar" },
                            { icon: Target, label: "Goals" },
                            { icon: BarChart3, label: "Analytics" },
                            { icon: FileText, label: "Notes" },
                            { icon: Users, label: "Team" },
                            { icon: Inbox, label: "Inbox", badge: "3" },
                          ].map(({ icon: Icon, label, active, badge }) => (
                            <div key={label} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-default ${active ? "bg-[#C89B3C]/12 text-[#C89B3C] border border-[#C89B3C]/20" : "text-slate-500 dark:text-slate-400"
                              }`}>
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className={`text-[10.5px] ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
                              {badge && <span className="ml-auto px-1 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[9px] font-semibold text-slate-600 dark:text-slate-300">{badge}</span>}
                            </div>
                          ))}
                        </nav>
                      </div>
                      <div className="border-t border-slate-200/60 dark:border-white/[0.07] pt-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[9px] font-bold text-black">AM</div>
                          <div><div className="text-[10px] font-semibold text-slate-900 dark:text-white">Alex M.</div><div className="text-[9px] text-slate-400">Admin</div></div>
                        </div>
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </aside>

                    <main className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-slate-50/30 dark:bg-transparent" style={{ scrollbarWidth: "none" }}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200/80 dark:border-white/10 text-slate-400 dark:text-slate-500">
                          <Search className="w-3 h-3 shrink-0" />
                          <span className="text-[10px]">Search tasks, projects…</span>
                          <span className="ml-auto text-[9px] font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">⌘K</span>
                        </div>
                        <button className="p-1.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 relative">
                          <Bell className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#C89B3C] text-black text-[10px] font-bold shadow-sm">
                          <Plus className="w-3 h-3" />New
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Tasks Done", val: "18/24", delta: "+12%", c: "#C89B3C", pct: 75 },
                          { label: "Focus hrs", val: "5.4h", delta: "+0.8h", c: "#10b981", pct: 88 },
                          { label: "Score", val: "94/100", delta: "Top 5%", c: "#6366f1", pct: 94 },
                        ].map((m) => (
                          <div key={m.label} className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.08] space-y-1.5 shadow-sm dark:shadow-none">
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 block">{m.label}</span>
                            <div className="flex items-baseline justify-between">
                              <span className="text-sm font-extrabold text-slate-900 dark:text-white">{m.val}</span>
                              <span className="text-[9px] font-bold" style={{ color: m.c }}>{m.delta}</span>
                            </div>
                            <div className="h-1 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.c }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-black/30 overflow-hidden shadow-sm dark:shadow-none">
                        <div className="px-3 py-2 border-b border-slate-200/60 dark:border-white/[0.06] flex items-center gap-2 bg-slate-50/50 dark:bg-white/[0.02]">
                          <CheckSquare className="w-3 h-3 text-[#C89B3C]" />
                          <span className="text-[10px] font-bold text-slate-900 dark:text-white">Active Tasks</span>
                          <span className="ml-auto text-[9px] text-[#C89B3C] font-semibold">View all</span>
                        </div>
                        {miniTasks.map((t) => (
                          <div key={t.label} className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-100 dark:border-white/[0.04] last:border-0">
                            {t.done
                              ? <CircleCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                              : <CircleDot className="w-3 h-3 text-[#C89B3C] shrink-0" />
                            }
                            <span className={`flex-1 text-[10px] truncate ${t.done ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200 font-medium"}`}>{t.label}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">{t.p}</span>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-black/30 p-3 shadow-sm dark:shadow-none">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <BarChart3 className="w-3 h-3 text-[#C89B3C]" />
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white">Weekly Velocity</span>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-500">+18.4%</span>
                        </div>
                        <div className="flex items-end gap-1.5 h-16">
                          {weekBars.map((b, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full rounded-t-sm" style={{
                                height: `${b.h}%`,
                                background: b.active ? "linear-gradient(to top, #C89B3C, #F6D97A)" : "linear-gradient(to top, rgba(200,155,60,0.25), rgba(200,155,60,0.12))",
                                boxShadow: b.active ? "0 0 8px rgba(200,155,60,0.5)" : "none",
                              }} />
                              <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500">{b.day}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </main>
                  </div>
                </div>
              </motion.div>

              <motion.div style={{ y: floatYTopLeft }} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.5 }}
                className="absolute top-[4%] left-[-2%] z-20 hidden lg:block">
                <GlassCard className="p-3.5 space-y-2.5 w-36">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Timer className="w-3.5 h-3.5 text-[#C89B3C]" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Focus Timer</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <ProgressRing pct={68} r={20} color="#C89B3C" stroke={3} />
                      <span className="absolute text-[9px] font-mono font-bold text-slate-900 dark:text-white">68%</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-sm font-extrabold text-[#C89B3C] dark:text-white font-mono">24:18</div>
                      <div className="text-[9px] text-emerald-500 font-semibold">Deep Work</div>
                      <div className="text-[9px] text-slate-400">of 36:00</div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div style={{ y: floatYTopRight }} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.6 }}
                className="absolute top-[4%] right-[-2%] z-20 hidden lg:block">
                <GlassCard className="p-3.5 w-40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#C89B3C]" />
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Score</span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-500">+4.2%</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">94</span>
                    <span className="text-sm font-semibold text-slate-400 mb-0.5">/100</span>
                    <div className="ml-auto"><Sparkline data={[72, 78, 74, 83, 88, 91, 94]} color="#C89B3C" /></div>
                  </div>
                  <div className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg bg-amber-500/8 border border-amber-500/15 text-center">Top 5% Globally</div>
                </GlassCard>
              </motion.div>

              <motion.div style={{ y: floatYMidLeft }} initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.7 }}
                className="absolute top-[38%] left-[-4%] z-20 hidden xl:block">
                <GlassCard className="p-3.5 w-32 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[#C89B3C]" />
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200">Goals</span>
                  </div>
                  <div className="relative flex items-center justify-center" style={{ height: 56 }}>
                    {goalRings.map((g, i) => (
                      <div key={g.label} className="absolute" style={{ top: i * 5, left: i * 4 }}>
                        <ProgressRing pct={g.pct} r={g.r} color={g.color} stroke={2.5} />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {goalRings.map((g) => (
                      <div key={g.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">{g.label}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200">{g.pct}%</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div style={{ y: floatYMidRight }} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.8 }}
                className="absolute top-[38%] right-[-4%] z-20 hidden xl:block">
                <GlassCard className="p-3.5 w-40 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200">AI Insight</span>
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  </div>
                  <motion.div key={aiIndex} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="text-[10px] text-slate-700 dark:text-slate-300 leading-relaxed min-h-[40px]">
                    {aiLines[aiIndex]}
                  </motion.div>
                  <div className="flex items-center gap-1.5 text-[9px] text-indigo-400 font-semibold">
                    <MessageSquare className="w-3 h-3" />Ask AI
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div style={{ y: floatYBottomLeft }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.65 }}
                className="absolute bottom-[4%] left-[-2%] z-20 hidden lg:block">
                <GlassCard className="p-3 w-36 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200">Team Online</span>
                    <span className="ml-auto text-[9px] font-mono text-emerald-500 font-bold">4/8</span>
                  </div>
                  <div className="flex -space-x-1.5">
                    {teamAvatars.map((a) => (
                      <div key={a.name} className={`w-6 h-6 rounded-full bg-gradient-to-br ${a.color} border-2 border-white dark:border-[#0B0E17] flex items-center justify-center text-[8px] font-bold text-white shadow-sm`}>
                        {a.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                    ))}
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 border-2 border-white dark:border-[#0B0E17] flex items-center justify-center text-[8px] text-slate-500 dark:text-slate-400 font-semibold">+4</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400">Velocity</span>
                      <span className="text-[9px] font-mono font-bold text-slate-900 dark:text-white">142/wk</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "72%" }} />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div style={{ y: floatYBottomRight }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.75 }}
                className="absolute bottom-[4%] right-[-2%] z-20 hidden lg:block">
                <GlassCard className="p-3.5 space-y-2.5" style={{ width: 148 }}>
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-[#C89B3C]" />
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200">Sprint 14</span>
                    <span className="ml-auto px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] text-amber-600 dark:text-amber-400 font-semibold">Active</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "Completed", val: 32, total: 48, c: "#10b981" },
                      { label: "In Progress", val: 9, total: 48, c: "#C89B3C" },
                      { label: "Blocked", val: 3, total: 48, c: "#f43f5e" },
                    ].map((s) => (
                      <div key={s.label} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[8.5px] text-slate-500 dark:text-slate-400">{s.label}</span>
                          <span className="text-[8.5px] font-mono font-bold text-slate-700 dark:text-slate-300">{s.val}/{s.total}</span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(s.val / s.total) * 100}%`, backgroundColor: s.c }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 1.0 }}
                className="absolute top-[30%] left-[22%] z-[15] hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:border-emerald-500/40 active:scale-95 cursor-pointer transition-all">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">+18% velocity</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 1.1 }}
                className="absolute top-[28%] right-[22%] z-[15] hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:border-amber-500/40 active:scale-95 cursor-pointer transition-all">
                <BadgeCheck className="w-3 h-3 text-amber-500" />
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">94 / 100</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 1.2 }}
                className="absolute bottom-[32%] left-[26%] z-[15] hidden xl:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-sm hover:shadow-[0_0_12px_rgba(99,102,241,0.3)] hover:border-indigo-500/40 active:scale-95 cursor-pointer transition-all">
                <Layers className="w-2.5 h-2.5 text-indigo-400" />
                <span className="text-[8.5px] font-semibold text-indigo-500 dark:text-indigo-400">4 Projects</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 1.3 }}
                className="absolute bottom-[30%] right-[24%] z-[15] hidden xl:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 backdrop-blur-sm hover:shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:border-rose-500/40 active:scale-95 cursor-pointer transition-all">
                <Zap className="w-2.5 h-2.5 text-rose-400" />
                <span className="text-[8.5px] font-semibold text-rose-500 dark:text-rose-400">3 Blockers</span>
              </motion.div>

            </div>
          </div>
        </div>

        <AnimatePresence>
          {isDemoOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDemoOpen(false)}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 dark:bg-black/90 p-4 sm:p-6 backdrop-blur-2xl"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0C0E15] p-6 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Play className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">ManMadhan Progress Walkthrough Demo</h3>
                      <p className="text-xs text-slate-500">Full product tour • Sub-50ms execution system</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsDemoOpen(false)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative aspect-video rounded-2xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
                  <div className="text-center space-y-3 z-10 p-6">
                    <div className="mx-auto w-16 h-16 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
                      <Play className="w-8 h-8 fill-current translate-x-0.5" />
                    </div>
                    <h4 className="text-xl font-bold text-white">Interactive Product Experience Live</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Explore the live workspace, task engine, protected time blocks, and realtime velocity metrics.
                    </p>
                    <button
                      onClick={() => window.location.href = "/welcome"}
                      className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C89B3C] text-black font-bold text-xs hover:bg-[#DDB85A] transition-colors cursor-pointer"
                    >
                      <span>Enter Workspace Preview →</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
