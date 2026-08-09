"use client";

import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon, Target, FileText, Clock,
  Play, Pause, CheckCircle2, ChevronRight, Activity, Bell, ListTodo, Plus, Sparkles, Check,
  Wifi, WifiOff, RefreshCw, FolderKanban, LogOut, Settings, MoreVertical, Flame
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";
import { useSocket } from "@/components/providers/socket-provider";
import { cn } from "@/shared/lib/utils";

// --- ANIMATION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 350, damping: 25 } }
};

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  projectId: string | null;
}

interface ProjectPulse {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  completedTasks: number;
  remainingTasks: number;
  totalTasks: number;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  deadline: string | null;
}

interface ActivityEvent {
  id: string;
  eventType: string;
  details: string | null;
  createdAt: string;
}

interface UpcomingItem {
  id: string;
  type: string;
  title: string;
  time: string | null;
  status: string;
}

interface GraphDataPoint {
  hour: number;
  label: string;
  completedTasks: number;
  focusMinutes: number;
}

export default function PersonalDashboard() {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Good morning");
  const [currentDate, setCurrentDate] = useState("");
  const [chartMetric, setChartMetric] = useState<"focus" | "tasks">("focus");

  const [data, setData] = useState<{
    greetingName: string;
    kpis: {
      tasksToday: number;
      completedTasksToday: number;
      remainingTasksToday: number;
      focusSecondsToday: number;
      focusSecondsYesterday: number;
      activeProjectsCount: number;
      upcomingDeadlinesCount: number;
      todayProgressPercent: number;
    };
    priorities: Task[];
    activeFocus: {
      id: string;
      startTime: string;
      taskId: string | null;
      task: Task | null;
      project: any | null;
    } | null;
    upcoming: UpcomingItem[];
    projects: ProjectPulse[];
    goals: Goal[];
    activity: ActivityEvent[];
    unreadNotificationsCount: number;
    graphData: GraphDataPoint[];
  } | null>(null);

  // Focus Timer States
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connection State for Reconnect Banner
  const [isOnline, setIsOnline] = useState(true);

  // Quick Action States
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    updateGreetingAndDate();
    fetchDashboardData();

    // Online/Offline status listeners
    const handleOnline = () => {
      setIsOnline(true);
      fetchDashboardData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Listen to WebSocket events for real-time synchronization.
  // Use payload.type to refetch only the affected data slice instead of
  // blindly refetching the entire dashboard on every event.
  useEffect(() => {
    if (!socket) return;

    const handleWorkspaceUpdate = (payload: any) => {
      const type: string = payload?.type ?? "";

      if (
        type === "focus_started" ||
        type === "focus_paused" ||
        type === "focus_completed"
      ) {
        // Only focus / timer data changed — refetch dashboard to sync KPIs and activeFocus
        fetchDashboardData();
      } else if (
        type === "task_updated" ||
        type === "task_completed" ||
        type === "task_created"
      ) {
        // Task list or KPI counts changed — refetch dashboard
        fetchDashboardData();
      } else {
        // Unknown/generic update — full refetch as fallback
        fetchDashboardData();
      }
    };

    socket.on("TASK_UPDATED", handleWorkspaceUpdate);
    socket.on("TASK_COMPLETED", handleWorkspaceUpdate);
    socket.on("TASK_CREATED", handleWorkspaceUpdate);
    socket.on("FOCUS_STARTED", handleWorkspaceUpdate);
    socket.on("FOCUS_PAUSED", handleWorkspaceUpdate);
    socket.on("FOCUS_COMPLETED", handleWorkspaceUpdate);
    socket.on("TASK_ASSIGNED", handleWorkspaceUpdate);

    return () => {
      socket.off("TASK_UPDATED", handleWorkspaceUpdate);
      socket.off("TASK_COMPLETED", handleWorkspaceUpdate);
      socket.off("TASK_CREATED", handleWorkspaceUpdate);
      socket.off("FOCUS_STARTED", handleWorkspaceUpdate);
      socket.off("FOCUS_PAUSED", handleWorkspaceUpdate);
      socket.off("FOCUS_COMPLETED", handleWorkspaceUpdate);
      socket.off("TASK_ASSIGNED", handleWorkspaceUpdate);
    };
  }, [socket]);


  // Handle Focus Session Timer Counting
  useEffect(() => {
    if (data?.activeFocus) {
      const startTime = new Date(data.activeFocus.startTime).getTime();
      const calculateElapsed = () => {
        const now = new Date().getTime();
        const elapsed = Math.max(0, Math.floor((now - startTime) / 1000));
        setTimerSeconds(elapsed);
      };
      
      calculateElapsed();
      setTimerRunning(true);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(calculateElapsed, 1000);
    } else {
      setTimerRunning(false);
      setTimerSeconds(0);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [data?.activeFocus]);

  const updateGreetingAndDate = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    setCurrentDate(
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date())
    );
  };

  const fetchDashboardData = async () => {
    try {
      let workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) {
        const wsRes = await apiClient.get("/workspaces");
        if (wsRes.data.success && wsRes.data.data.length > 0) {
          const defaultId = wsRes.data.data[0].id as string;
          localStorage.setItem("workspaceId", defaultId);
          workspaceId = defaultId;
        } else {
          setError("No workspace context. Please switch or create a workspace.");
          setLoading(false);
          return;
        }
      }
      setError(null);
      const res = await apiClient.get(`/dashboard?workspaceId=${workspaceId}`);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError("Failed to fetch workspace data");
      }
    } catch (err: any) {
      console.error(err);
      setError("Unable to connect to server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await apiClient.put(`/personal/tasks/${taskId}/status`, { status: "Completed" });
      if (res.data.success) {
        // Optimistic UI updates are handled because we refetch on return
        // and also emit a socket update so other tabs update too!
        if (socket) {
          const workspaceId = localStorage.getItem("workspaceId");
          socket.emit("send_room_message", { room: `workspace_${workspaceId}`, text: "task_updated" });
        }
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartFocus = async (taskId: string | null) => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;

      const res = await apiClient.post("/focus/start", { taskId, workspaceId });
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePauseFocus = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;

      const res = await apiClient.post("/focus/pause", { workspaceId });
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteFocus = async (completeTask: boolean) => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;

      const res = await apiClient.post("/focus/complete", { workspaceId, completeTask });
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle) return;
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;

      const res = await apiClient.post("/personal/tasks", {
        title: quickTaskTitle,
        workspaceId,
        assigneeId: user?.id,
      });

      if (res.data.success) {
        setQuickTaskTitle("");
        setQuickTaskOpen(false);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatHoursMinutes = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} mins`;
  };

  // --- SVG GRAPH PLOTTING ---
  const renderGraph = () => {
    if (!data?.graphData || data.graphData.length === 0) return null;

    const values = data.graphData.map(d => chartMetric === "focus" ? d.focusMinutes : d.completedTasks);
    const maxVal = Math.max(...values, 5); // Fallback to 5 to avoid flat charts
    const hasData = values.some(v => v > 0);

    if (!hasData) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-center p-4">
          <Activity className="w-8 h-8 stroke-[1.5] text-muted-foreground/60 mb-2.5" />
          <p className="text-xs font-semibold text-foreground">No work data yet today.</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Start working to see your activity here.</p>
        </div>
      );
    }

    const width = 800;
    const height = 200;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Generate Points coordinates
    const points = data.graphData.map((d, index) => {
      const val = chartMetric === "focus" ? d.focusMinutes : d.completedTasks;
      const x = paddingLeft + (index / 23) * chartWidth;
      const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
      return { x, y, value: val, label: d.label };
    });

    // Create SVG Path String
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // Create Area Path String
    const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

    return (
      <div className="w-full overflow-x-auto scrollbar-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[700px] h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D9A321" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#D9A321" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: 4 }).map((_, i) => {
            const y = paddingTop + (i / 3) * chartHeight;
            const gridVal = Math.round(maxVal - (i / 3) * maxVal);
            return (
              <g key={i} className="opacity-20">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth={1} strokeDasharray="3 3" className="text-muted-foreground" />
                <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-muted-foreground font-mono font-semibold">{gridVal}</text>
              </g>
            );
          })}

          {/* Time Labels */}
          {points.filter((_, i) => i % 4 === 0).map((pt, i) => (
            <text key={i} x={pt.x} y={height - 10} textAnchor="middle" className="text-[9px] fill-muted-foreground font-mono font-semibold">
              {pt.label.split(" ")[0]} {pt.label.split(" ")[1]}
            </text>
          ))}

          {/* Graph Paths */}
          <path d={areaD} fill="url(#areaGrad)" />
          <path d={pathD} fill="none" stroke="#D9A321" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          {/* Highlight Points on hover */}
          {points.map((pt, i) => (
            <g key={i} className="group/dot cursor-pointer">
              <circle cx={pt.x} cy={pt.y} r={pt.value > 0 ? 3.5 : 0} className="fill-gold stroke-background stroke-2 transition-all group-hover/dot:r-5" />
              <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none duration-150">
                <rect x={pt.x - 45} y={pt.y - 35} width={90} height={24} rx={6} className="fill-card stroke-border stroke" />
                <text x={pt.x} y={pt.y - 20} textAnchor="middle" className="text-[9px] fill-foreground font-bold font-mono">
                  {pt.value} {chartMetric === "focus" ? "mins" : "tasks"} @ {pt.label}
                </text>
              </g>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-background px-6 lg:px-8 py-6 flex flex-col gap-6 scrollbar-thin">
      
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 py-2.5 px-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-bounce shrink-0">
          <span className="flex items-center gap-2"><WifiOff className="w-4 h-4" /> Offline mode — changes will be synchronized when connection is restored.</span>
          <button onClick={fetchDashboardData} className="p-1 hover:bg-red-500/10 rounded"><RefreshCw className="w-3.5 h-3.5 animate-spin" /></button>
        </div>
      )}

      {/* Global Errors */}
      {error && (
        <div className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-500 py-3 px-5 rounded-2xl flex items-center justify-between text-sm shrink-0">
          <span>{error}</span>
          <button onClick={fetchDashboardData} className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold rounded-lg transition-colors">Retry</button>
        </div>
      )}

      {/* HEADER SECTION */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{greeting}, {data?.greetingName || user?.displayName || user?.name || "Member"}</h1>
          <p className="text-xs text-muted-foreground font-medium mt-1">{currentDate} • Private personal dashboard center.</p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Subtle Online/Offline indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40 bg-muted/20 text-[9.5px] font-semibold text-muted-foreground select-none">
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-500/90"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Synced</span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-500/90"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Connecting</span>
            )}
          </div>
          <button onClick={() => setQuickTaskOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-hover text-slate-950 font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all select-none">
            <Plus className="w-3.5 h-3.5" /> Quick Task
          </button>
        </div>
      </motion.div>

      {/* LOADING STATE */}
      {loading ? (
        <div className="space-y-6 flex-1 min-h-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-3xl bg-card border border-border/50 animate-pulse" />)}
          </div>
          <div className="h-64 rounded-3xl bg-card border border-border/50 animate-pulse" />
        </div>
      ) : data && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex-1 flex flex-col gap-6 min-h-0 pb-12">
          
          {/* 1. KPI CARDS */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
            {/* TASKS TODAY */}
            <div className="bg-card border border-border/50 rounded-3xl p-5 shadow-xs flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Tasks Today</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-foreground leading-none">{data.kpis.tasksToday}</span>
                <span className="text-xs font-medium text-muted-foreground mt-0.5">{data.kpis.completedTasksToday} completed</span>
              </div>
            </div>

            {/* FOCUS TODAY */}
            <div className="bg-card border border-border/50 rounded-3xl p-5 shadow-xs flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Focus Today</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-foreground leading-none">{formatHoursMinutes(data.kpis.focusSecondsToday)}</span>
                {data.kpis.focusSecondsYesterday > 0 && (
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">vs {formatHoursMinutes(data.kpis.focusSecondsYesterday)} yesterday</span>
                )}
              </div>
            </div>

            {/* ACTIVE PROJECTS */}
            <div className="bg-card border border-border/50 rounded-3xl p-5 shadow-xs flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Active Projects</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-foreground leading-none">{data.kpis.activeProjectsCount}</span>
                <span className="text-xs font-medium text-muted-foreground mt-0.5">{data.kpis.upcomingDeadlinesCount} upcoming</span>
              </div>
            </div>

            {/* TODAY'S PROGRESS */}
            <div className="bg-card border border-border/50 rounded-3xl p-5 shadow-xs flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Today's Progress</span>
              <div className="mt-3 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground mb-1.5">
                  <span>Completion Rate</span>
                  <span>{data.kpis.todayProgressPercent}%</span>
                </div>
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden border border-border/30">
                  <div className="bg-gold h-full rounded-full transition-all duration-500" style={{ width: `${data.kpis.todayProgressPercent}%` }} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. TODAY'S WORK GRAPH */}
          <motion.div variants={itemVariants} className="bg-card border border-border/50 rounded-3xl p-6 shadow-xs shrink-0 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"><Activity className="w-4 h-4 text-gold" /> Today's Work</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Visualize your productivity waves across 24 hours.</p>
              </div>
              <div className="flex bg-muted/40 p-0.5 rounded-xl border border-border/80 h-9 items-center">
                <button 
                  onClick={() => setChartMetric("focus")} 
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-medium uppercase rounded-lg transition-all focus:outline-none select-none h-7 flex items-center justify-center", 
                    chartMetric === "focus" 
                      ? "bg-gold/10 text-gold border border-gold/20 font-semibold shadow-xs" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Focus Minutes
                </button>
                <button 
                  onClick={() => setChartMetric("tasks")} 
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-medium uppercase rounded-lg transition-all focus:outline-none select-none h-7 flex items-center justify-center", 
                    chartMetric === "tasks" 
                      ? "bg-gold/10 text-gold border border-gold/20 font-semibold shadow-xs" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tasks Done
                </button>
              </div>
            </div>
            {renderGraph()}
          </motion.div>

          {/* BOTTOM INTEL GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0 items-start">
            
            {/* COLUMN 1: PRIORITIES & TIMER (8 Cols) */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              
              {/* CURRENT FOCUS TIMER */}
              <motion.div variants={itemVariants} className="bg-card border border-border/50 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                    <Clock className={cn("w-6 h-6", timerRunning && "animate-pulse")} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Active Focus Session</span>
                    {data.activeFocus ? (
                      <>
                        <h4 className="text-base font-bold text-foreground mt-0.5 truncate max-w-[280px]">{data.activeFocus.task?.title || "General Focus"}</h4>
                        {data.activeFocus.project && (
                          <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">{data.activeFocus.project.name}</span>
                        )}
                      </>
                    ) : (
                      <h4 className="text-sm font-semibold text-muted-foreground mt-0.5">No active focus session</h4>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {timerRunning && (
                    <div className="text-3xl font-extrabold font-mono tracking-tighter tabular-nums select-none">
                      {formatDuration(timerSeconds)}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {data.activeFocus ? (
                      <>
                        <button onClick={handlePauseFocus} className="px-4 py-2 bg-muted hover:bg-muted-foreground/15 text-foreground font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 border border-border/50">
                          <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                        </button>
                        <button onClick={() => handleCompleteFocus(true)} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/25 font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Complete Task
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleStartFocus(null)} className="px-5 py-2.5 bg-foreground text-background font-bold text-xs rounded-xl shadow-sm hover:bg-foreground/90 transition-all active:scale-95 flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 fill-current" /> Start Focus
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* TODAY'S PRIORITIES */}
              <motion.div variants={itemVariants} className="bg-card border border-border/50 rounded-3xl p-0 shadow-xs overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-border/80 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"><ListTodo className="w-4 h-4 text-gold" /> Today's Priorities</h3>
                  <Link href="/personal/tasks" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-gold transition-colors flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></Link>
                </div>
                <div className="p-6 flex flex-col gap-3.5">
                  {data.priorities.length === 0 ? (
                    <div className="text-center py-8 flex flex-col items-center justify-center">
                      <span className="text-xs font-semibold text-foreground">No tasks scheduled for today</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">Complete or create priorities!</span>
                    </div>
                  ) : (
                    data.priorities.map((task) => (
                      <div key={task.id} className="group p-4 bg-muted/20 border border-border/40 hover:border-border hover:bg-muted/40 transition-colors rounded-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleCompleteTask(task.id)} className="w-5 h-5 rounded-md border border-muted-foreground/30 flex items-center justify-center hover:border-gold hover:bg-gold/15 transition-all text-gold shrink-0">
                            <Check className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                          </button>
                          <div>
                            <span className="text-sm font-semibold text-foreground leading-snug">{task.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border", task.priority === "High" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : task.priority === "Medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20")}>
                                {task.priority}
                              </span>
                              {task.deadline && (
                                <span className="text-[9px] text-muted-foreground flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleStartFocus(task.id)} className="p-1.5 bg-card border border-border/60 hover:border-gold rounded-lg text-muted-foreground hover:text-gold transition-colors" title="Focus on Task">
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>

              {/* PROJECT PULSE */}
              <motion.div variants={itemVariants} className="bg-card border border-border/50 rounded-3xl p-0 shadow-xs overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-border/80 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"><FolderKanban className="w-4 h-4 text-gold" /> Project Pulse</h3>
                  <Link href="/personal/projects" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-gold transition-colors flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></Link>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  {data.projects.length === 0 ? (
                    <div className="text-center py-6 flex flex-col items-center justify-center">
                      <span className="text-xs font-semibold text-foreground">No active projects yet</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">Build your first execution scope!</span>
                    </div>
                  ) : (
                    data.projects.map((project) => (
                      <Link href="/personal/projects" key={project.id} className="group p-4 bg-muted/20 border border-border/40 hover:border-border hover:bg-muted/40 transition-all rounded-2xl flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-foreground group-hover:text-gold transition-colors truncate max-w-[200px] block">{project.name}</span>
                            <span className="text-[9px] font-semibold text-muted-foreground block mt-0.5">{project.remainingTasks} remaining tasks</span>
                          </div>
                          <span className="text-[10px] font-bold text-foreground shrink-0">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden border border-border/10">
                          <div className="bg-gold h-full rounded-full transition-all duration-300" style={{ width: `${project.progress}%` }} />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </motion.div>

            </div>

            {/* COLUMN 2: UPCOMING, GOALS, ACTIVITY (4 Cols) */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              
              {/* UPCOMING EVENTS */}
              <motion.div variants={itemVariants} className="bg-card border border-border/50 rounded-3xl p-0 shadow-xs overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-border/80">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"><CalendarIcon className="w-4 h-4 text-gold" /> Upcoming</h3>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  {data.upcoming.length === 0 ? (
                    <div className="text-center py-4 flex flex-col items-center justify-center">
                      <span className="text-xs font-semibold text-foreground">No upcoming items</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">No upcoming deadlines or reminders.</span>
                    </div>
                  ) : (
                    data.upcoming.map((item) => (
                      <Link href="/personal/calendar" key={item.id} className="flex items-start gap-3 p-1 rounded-lg group">
                        <div className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0" />
                        <div>
                          <span className="text-xs font-semibold text-foreground group-hover:text-gold transition-colors leading-relaxed block">{item.title}</span>
                          {item.time && (
                            <span className="text-[9px] text-muted-foreground block mt-0.5">{new Date(item.time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </motion.div>

              {/* GOAL SNAPSHOT */}
              <motion.div variants={itemVariants} className="bg-card border border-border/50 rounded-3xl p-0 shadow-xs overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-border/80">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"><Target className="w-4 h-4 text-gold" /> Goals</h3>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  {data.goals.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs">No active goals yet. Create vision objectives!</div>
                  ) : (
                    data.goals.map((goal) => (
                      <Link href="/personal/goals" key={goal.id} className="flex flex-col gap-2 p-1 group">
                        <div className="flex justify-between items-center text-xs font-bold text-foreground group-hover:text-gold transition-colors">
                          <span className="truncate max-w-[150px]">{goal.title}</span>
                          <span>{goal.progress}%</span>
                        </div>
                        <div className="w-full bg-muted/60 h-1 rounded-full overflow-hidden">
                          <div className="bg-gold h-full rounded-full" style={{ width: `${goal.progress}%` }} />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </motion.div>

              {/* RECENT ACTIVITY */}
              <motion.div variants={itemVariants} className="bg-card border border-border/50 rounded-3xl p-0 shadow-xs overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-border/80">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"><Activity className="w-4 h-4 text-gold" /> Recent Activity</h3>
                </div>
                <div className="p-6 flex flex-col gap-4 max-h-[300px] overflow-y-auto scrollbar-none">
                  {data.activity.length === 0 ? (
                    <div className="text-center py-4 flex flex-col items-center justify-center">
                      <span className="text-xs font-semibold text-foreground">No recent activity</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">No recent activity logged.</span>
                    </div>
                  ) : (
                    data.activity.map((act) => (
                      <div key={act.id} className="flex flex-col gap-1 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <span className="text-xs font-semibold text-foreground leading-snug">{act.details}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>

            </div>

          </div>

        </motion.div>
      )}

      {/* QUICK TASK CREATION POPUP */}
      {quickTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Quick Create Task</h3>
            <form onSubmit={handleCreateQuickTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Task Title</label>
                <input required placeholder="What do you need to execute?" type="text" value={quickTaskTitle} onChange={(e) => setQuickTaskTitle(e.target.value)} className="w-full px-4 py-2 bg-muted/40 border border-border/80 rounded-xl text-sm text-foreground focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setQuickTaskOpen(false)} className="px-4 py-2 text-xs font-semibold text-muted-foreground">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-bold rounded-lg text-xs shadow-sm">Create Task</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
