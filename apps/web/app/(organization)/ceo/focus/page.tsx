"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
	Focus as FocusIcon, Play, Pause, Square, Clock,
	CheckSquare, AlertCircle, Loader2, FolderKanban, CheckCircle2,
	AlertTriangle, RefreshCw, History, X
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import { TaskSelectorModal } from "@/components/organization/ceo-focus/task-selector-modal";
import { EndFocusModal } from "@/components/organization/ceo-focus/end-focus-modal";
import { HistoryDrawer } from "@/components/organization/ceo-focus/history-drawer";
import { StatsDrawer } from "@/components/organization/ceo-focus/stats-drawer";

function formatDigitalTimer(seconds: number) {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatShortDuration(seconds: number) {
	if (!seconds || seconds <= 0) return "0m";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

export default function CEOFocusPage() {
	// Core State
	const [activeSession, setActiveSession] = useState<any>(null);
	const [selectedTask, setSelectedTask] = useState<any>(null);
	const [elapsed, setElapsed] = useState(0);
	const [overview, setOverview] = useState<any>(null);
	const [priorities, setPriorities] = useState<any[]>([]);
	const [allTasks, setAllTasks] = useState<any[]>([]);
	const [allProjects, setAllProjects] = useState<any[]>([]);
	const [history, setHistory] = useState<any[]>([]);
	const [scheduleStatus, setScheduleStatus] = useState<any>(null);
	const [weeklyData, setWeeklyData] = useState<any>(null);
	const [weekOffset, setWeekOffset] = useState(0);

	// Modals & Drawers State
	const [showTaskSelector, setShowTaskSelector] = useState(false);
	const [showEndModal, setShowEndModal] = useState(false);
	const [showPauseModal, setShowPauseModal] = useState(false);
	const [pauseReason, setPauseReason] = useState("");
	const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
	const [showStatsDrawer, setShowStatsDrawer] = useState(false);

	// Loading & Error States
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);
	const [actionSuccess, setActionSuccess] = useState("");
	const [error, setError] = useState("");

	const timerRef = useRef<any>(null);

	// Fetch Focus Workspace Data
	const loadWorkspaceData = useCallback(async () => {
		try {
			const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
			const wsParam = workspaceId ? `?workspaceId=${workspaceId}` : "";
			const wsParamAnd = workspaceId ? `&workspaceId=${workspaceId}` : "";

			const [activeRes, overviewRes, prioritiesRes, historyRes, scheduleRes, weeklyRes] = await Promise.all([
				apiClient.get(`/org/focus/active${wsParam}`).catch(() => null),
				apiClient.get(`/org/focus/overview${wsParam}`).catch(() => null),
				apiClient.get(`/org/focus/priorities${wsParam}`).catch(() => null),
				apiClient.get(`/org/focus/history?limit=20${wsParamAnd}`).catch(() => null),
				apiClient.get(`/org/working-hours/status`).catch(() => null),
				apiClient.get(`/org/focus/weekly?weekOffset=${weekOffset}${wsParamAnd}`).catch(() => null),
			]);

			if (activeRes?.data?.success) {
				const session = activeRes.data.data;
				setActiveSession(session);
				if (session && session.status === "Active") {
					const startTime = session.resumedAt || session.startTime;
					const initialElapsed = (session.durationSeconds || 0) + Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
					setElapsed(initialElapsed);
					if (session.task) setSelectedTask(session.task);
				} else if (session && session.status === "Paused") {
					setElapsed(session.durationSeconds || 0);
					if (session.task) setSelectedTask(session.task);
				} else {
					setElapsed(0);
				}
			}

			if (overviewRes?.data?.success) setOverview(overviewRes.data.data);
			if (prioritiesRes?.data?.success) {
				const taskList = prioritiesRes.data.data.tasks || [];
				setPriorities(prioritiesRes.data.data.priorities || []);
				setAllTasks(taskList);
				setAllProjects(prioritiesRes.data.data.projects || []);

				if (!selectedTask && !activeSession && taskList.length > 0) {
					setSelectedTask(taskList[0]);
				}
			}
			if (historyRes?.data?.success) setHistory(historyRes.data.data || []);
			if (scheduleRes?.data?.success) setScheduleStatus(scheduleRes.data.data);
			if (weeklyRes?.data?.success) setWeeklyData(weeklyRes.data.data);
		} catch {
			setError("Failed to load organization focus workspace data");
		} finally {
			setLoading(false);
		}
	}, [selectedTask, activeSession, weekOffset]);

	useEffect(() => {
		loadWorkspaceData();
	}, [loadWorkspaceData]);

	// Register with Global Pull-to-Refresh
	useRegisterRefresh(loadWorkspaceData);

	// Precision Timestamp-Driven Timer Engine
	useEffect(() => {
		if (activeSession?.status === "Active") {
			const updatePrecisionElapsed = () => {
				const startTime = activeSession.resumedAt || activeSession.startTime;
				if (startTime) {
					const activeMs = Date.now() - new Date(startTime).getTime();
					const currentSegment = Math.max(0, Math.floor(activeMs / 1000));
					setElapsed((activeSession.durationSeconds || 0) + currentSegment);
				}
			};

			updatePrecisionElapsed();
			timerRef.current = setInterval(updatePrecisionElapsed, 1000);
		} else if (activeSession?.status === "Paused") {
			setElapsed(activeSession.durationSeconds || 0);
			clearInterval(timerRef.current);
		} else {
			setElapsed(0);
			clearInterval(timerRef.current);
		}

		return () => clearInterval(timerRef.current);
	}, [activeSession]);

	// Start Focus Session
	const handleStartFocus = async (taskToStart?: any) => {
		const targetTask = taskToStart || selectedTask;
		const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;

		setActionLoading(true);
		setError("");
		try {
			const res = await apiClient.post("/org/focus/start", {
				workspaceId,
				sourceType: "TASK",
				taskId: targetTask?.id,
				projectId: targetTask?.projectId,
				title: targetTask?.title || "Executive Focus",
				description: targetTask?.description,
				priority: targetTask?.priority || "High",
			});

			if (res.data?.success) {
				setActionSuccess("✓ Focus session started.");
				setTimeout(() => setActionSuccess(""), 4000);
				await loadWorkspaceData();
			} else {
				setError(res.data?.error || "Failed to start focus session.");
			}
		} catch (err: any) {
			setError(err.response?.data?.error || err.message || "Failed to start focus session.");
		} finally {
			setActionLoading(false);
		}
	};

	// Pause Focus Session
	const handlePauseFocus = async () => {
		if (!activeSession) return;
		const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
		setActionLoading(true);
		try {
			const res = await apiClient.post("/org/focus/pause", { workspaceId, reason: pauseReason });
			if (res.data?.success) {
				setActiveSession({ ...activeSession, status: "Paused" });
				setShowPauseModal(false);
				setPauseReason("");
				setActionSuccess("✓ Focus session paused.");
				setTimeout(() => setActionSuccess(""), 4000);
			} else {
				setError(res.data?.error || "Failed to pause session.");
			}
		} catch (err: any) {
			setError(err.response?.data?.error || err.message || "Failed to pause session.");
		} finally {
			setActionLoading(false);
		}
	};

	// Resume Focus Session
	const handleResumeFocus = async () => {
		if (!activeSession) return;
		const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
		setActionLoading(true);
		try {
			const res = await apiClient.post("/org/focus/resume", { workspaceId });
			if (res.data?.success) {
				setActiveSession({ ...activeSession, status: "Active" });
				setActionSuccess("✓ Focus session resumed.");
				setTimeout(() => setActionSuccess(""), 4000);
			} else {
				setError(res.data?.error || "Failed to resume session.");
			}
		} catch (err: any) {
			setError(err.response?.data?.error || err.message || "Failed to resume session.");
		} finally {
			setActionLoading(false);
		}
	};

	// Finish Focus Session Workflow
	const handleFinishFocus = async (endData: any) => {
		if (!activeSession) return;
		const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
		setActionLoading(true);
		try {
			const res = await apiClient.post("/org/focus/end", {
				workspaceId,
				...endData,
			});
			if (res.data?.success) {
				setActiveSession(null);
				setElapsed(0);
				setShowEndModal(false);
				setActionSuccess("✓ Focus session completed and recorded.");
				setTimeout(() => setActionSuccess(""), 4000);
				await loadWorkspaceData();
			} else {
				setError(res.data?.error || "Failed to finish session.");
			}
		} catch (err: any) {
			setError(err.response?.data?.error || err.message || "Failed to finish session.");
		} finally {
			setActionLoading(false);
		}
	};

	// Create Follow-Up Task
	const handleCreateFollowUpTask = async (taskData: any) => {
		const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
		const res = await apiClient.post("/org/focus/follow-up-task", {
			workspaceId,
			...taskData,
		});
		if (res.data?.success) {
			await loadWorkspaceData();
			return res.data.data;
		}
		throw new Error(res.data?.error || "Failed to create follow-up task.");
	};

	if (loading) {
		return (
			<div className="h-full w-full min-h-[400px] flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-gold" />
			</div>
		);
	}

	const isOperational = scheduleStatus?.isOperational ?? true;
	const activeStatusText = activeSession?.status === "Active" ? "FOCUSING" : activeSession?.status === "Paused" ? "PAUSED" : "READY";
	const currentProject = allProjects.find((p) => p.id === selectedTask?.projectId) || activeSession?.project;

	return (
		<div className="max-w-[1240px] w-full mx-auto p-4 sm:p-6 space-y-4 font-sans select-none">
			{/* 1. PAGE HEADER */}
			<div className="flex items-center justify-between gap-3 border-b border-border pb-3">
				<div>
					<h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
						FOCUS
					</h1>
					<p className="text-xs text-muted-foreground font-medium mt-0.5">
						Deep work execution console
					</p>
				</div>

				{/* Working Hours Live Status Pill & Refresh Button */}
				<div className="flex items-center gap-2 shrink-0">
					<span
						className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
							isOperational
								? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
								: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
						}`}
					>
						<span className={`w-2 h-2 rounded-full ${isOperational ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse" : "bg-rose-500 dark:bg-rose-400"}`} />
						{isOperational ? "● SYSTEM ACTIVE · 04:00–23:00 IST" : "● SYSTEM RESTRICTED · 23:00–04:00 IST"}
					</span>

					<button
						type="button"
						onClick={loadWorkspaceData}
						className="p-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
						title="Refresh focus workspace"
					>
						<RefreshCw className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>

			{/* Action Notifications */}
			{actionSuccess && (
				<div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
					<CheckCircle2 className="w-4 h-4 shrink-0" /> {actionSuccess}
				</div>
			)}
			{error && (
				<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
					<div className="flex items-center gap-2">
						<AlertTriangle className="w-4 h-4 shrink-0" /> {error}
					</div>
					<button type="button" onClick={() => setError("")} className="text-rose-500 dark:text-rose-400 hover:text-foreground cursor-pointer">
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			)}

			{/* 2. KPI SUMMARY (STRICT 4-COLUMN GRID) */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<PremiumCard className="p-3.5 rounded-xl space-y-1">
					<span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block font-bold">Focus Time Today</span>
					<span className="text-xl font-extrabold text-amber-600 dark:text-gold font-mono block">
						{formatShortDuration(overview?.totalFocusedSeconds || 0)}
					</span>
				</PremiumCard>

				<PremiumCard className="p-3.5 rounded-xl space-y-1">
					<span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block font-bold">Sessions</span>
					<span className="text-xl font-extrabold text-foreground font-mono block">
						{overview?.totalSessionsCount || 0}
					</span>
				</PremiumCard>

				<PremiumCard className="p-3.5 rounded-xl space-y-1">
					<span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block font-bold">Tasks Completed</span>
					<span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono block">
						{overview?.completedCount || 0}
					</span>
				</PremiumCard>

				<PremiumCard className="p-3.5 rounded-xl space-y-1">
					<span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block font-bold">Current Session</span>
					<span className="text-xl font-extrabold text-purple-600 dark:text-purple-400 font-mono block">
						{formatDigitalTimer(elapsed)}
					</span>
				</PremiumCard>
			</div>

			{/* 3. EXECUTION AREA (MOBILE REORDER: CURRENT WORK -> TIMER ON DESKTOP EQUAL COLUMNS) */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
				{/* CURRENT WORK CARD */}
				<PremiumCard className="p-4 rounded-xl flex flex-col justify-between space-y-3.5 min-h-[260px]">
					<div className="space-y-3">
						<div className="flex items-center justify-between border-b border-border pb-2.5">
							<span className="text-xs font-bold text-foreground uppercase tracking-wider">
								CURRENT WORK
							</span>
							<button
								type="button"
								onClick={() => setShowTaskSelector(true)}
								className="px-3 py-1 rounded-lg bg-secondary border border-border text-xs font-bold text-amber-600 dark:text-gold hover:bg-amber-500/10 transition-all cursor-pointer"
							>
								{selectedTask ? "Change Task" : "Select Task"}
							</button>
						</div>

						{selectedTask || activeSession ? (
							<div className="space-y-2.5">
								<span className="text-[10px] text-amber-600 dark:text-gold font-mono font-bold uppercase tracking-wider block">
									{currentProject?.name || "ORGANIZATION WORK"}
								</span>

								<h3 className="text-sm font-extrabold text-foreground leading-snug">
									{selectedTask?.title || activeSession?.title || "Executive Focus Task"}
								</h3>

								<p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
									{selectedTask?.description || activeSession?.description || "Concentrate on completing task objectives and documenting deliverables."}
								</p>

								<div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs font-mono">
									<div>
										<span className="text-muted-foreground text-[10px] uppercase block">Priority</span>
										<span className="font-bold text-foreground">{selectedTask?.priority || activeSession?.priority || "High"}</span>
									</div>
									<div>
										<span className="text-muted-foreground text-[10px] uppercase block">Deadline</span>
										<span className="font-bold text-foreground">
											{selectedTask?.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : "Due Today"}
										</span>
									</div>
									<div>
										<span className="text-muted-foreground text-[10px] uppercase block">Assigned by</span>
										<span className="font-bold text-foreground">Leadership</span>
									</div>
									<div>
										<span className="text-muted-foreground text-[10px] uppercase block">Progress</span>
										<span className="font-bold text-amber-600 dark:text-gold">{selectedTask?.progress || 62}%</span>
									</div>
								</div>
							</div>
						) : (
							<div className="py-6 text-center space-y-2 my-auto">
								<h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">No task selected</h4>
								<p className="text-xs text-muted-foreground max-w-xs mx-auto">
									Select an assigned task to begin a focused work session.
								</p>
								<button
									type="button"
									onClick={() => setShowTaskSelector(true)}
									className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white dark:bg-gold dark:hover:bg-gold/90 dark:text-black text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
								>
									Select Task
								</button>
							</div>
						)}
					</div>
				</PremiumCard>

				{/* FOCUS TIMER CARD */}
				<PremiumCard className="p-4 rounded-xl flex flex-col justify-between items-center text-center space-y-3.5 min-h-[260px]">
					<div className="w-full flex items-center justify-between border-b border-border pb-2.5">
						<span className="text-xs font-bold text-foreground uppercase tracking-wider">
							FOCUS TIMER
						</span>
						<span
							className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
								activeStatusText === "FOCUSING"
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 animate-pulse"
									: activeStatusText === "PAUSED"
									? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
									: "bg-muted text-muted-foreground border-border"
							}`}
						>
							● {activeStatusText}
						</span>
					</div>

					{/* Digital Timer & Subtitle */}
					<div className="py-3 space-y-1.5 my-auto">
						<div className="text-4xl sm:text-5xl font-extrabold font-mono text-foreground tracking-tight tabular-nums">
							{formatDigitalTimer(elapsed)}
						</div>
						<p className="text-xs font-mono text-muted-foreground uppercase tracking-wider font-bold">
							{!isOperational
								? "SYSTEM OFF · Focus unavailable (23:00–04:00 IST)"
								: activeStatusText === "FOCUSING"
								? "WORKING"
								: activeStatusText === "PAUSED"
								? "PAUSED"
								: "TIMER READY"}
						</p>
					</div>

					{/* Primary Action Button */}
					<div className="w-full pt-3 border-t border-border flex items-center justify-center gap-2">
						{activeStatusText === "READY" && (
							<button
								type="button"
								onClick={() => handleStartFocus()}
								disabled={actionLoading || !isOperational}
								className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white dark:bg-gold dark:hover:bg-gold/90 dark:text-black text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
							>
								{actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
								<span>▶ START FOCUS SESSION</span>
							</button>
						)}

						{activeStatusText === "FOCUSING" && (
							<>
								<button
									type="button"
									onClick={() => setShowPauseModal(true)}
									disabled={actionLoading}
									className="flex-1 py-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
								>
									<Pause className="w-3.5 h-3.5" /> Pause
								</button>

								<button
									type="button"
									onClick={() => setShowEndModal(true)}
									disabled={actionLoading}
									className="flex-1 py-3 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
								>
									<CheckCircle2 className="w-3.5 h-3.5" /> Finish Session
								</button>
							</>
						)}

						{activeStatusText === "PAUSED" && (
							<>
								<button
									type="button"
									onClick={handleResumeFocus}
									disabled={actionLoading || !isOperational}
									className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white dark:bg-gold dark:hover:bg-gold/90 dark:text-black text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
								>
									<Play className="w-3.5 h-3.5 fill-current" /> Resume
								</button>

								<button
									type="button"
									onClick={() => setShowEndModal(true)}
									disabled={actionLoading}
									className="flex-1 py-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
								>
									<Square className="w-3.5 h-3.5" /> End Session
								</button>
							</>
						)}
					</div>
				</PremiumCard>
			</div>

			{/* 4. TODAY'S ACTIVITY */}
			<PremiumCard className="p-4 rounded-xl space-y-3">
				<div className="flex items-center justify-between border-b border-border pb-2.5">
					<h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
						TODAY'S ACTIVITY
					</h3>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setShowHistoryDrawer(true)}
							className="px-3 py-1 rounded-lg bg-secondary border border-border text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
						>
							History
						</button>
						<button
							type="button"
							onClick={() => setShowStatsDrawer(true)}
							className="px-3 py-1 rounded-lg bg-secondary border border-border text-xs font-bold text-amber-600 dark:text-gold hover:bg-amber-500/10 cursor-pointer"
						>
							Statistics
						</button>
					</div>
				</div>

				<div className="space-y-1.5">
					{history.length > 0 ? (
						history.slice(0, 5).map((item, idx) => (
							<div
								key={idx}
								className="p-2.5 rounded-lg bg-muted/40 border border-border/50 grid grid-cols-4 items-center text-xs font-mono"
							>
								<span className="text-muted-foreground text-[11px] font-bold">
									{new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
								</span>
								<span className="font-bold text-foreground truncate col-span-1">{item.displayTitle}</span>
								<span className="text-center">
									<span
										className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase border ${
											item.status === "Completed"
												? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
												: item.status === "Paused"
												? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
												: "bg-muted text-muted-foreground border-border"
										}`}
									>
										{item.status}
									</span>
								</span>
								<span className="text-right text-amber-600 dark:text-gold font-bold">
									{formatShortDuration(item.durationSeconds)}
								</span>
							</div>
						))
					) : (
						<div className="py-6 text-center text-xs text-muted-foreground space-y-1">
							<p>No focus sessions recorded yet today.</p>
							<p className="text-[11px] text-muted-foreground/80">Select a task and click Start Focus to begin tracking.</p>
						</div>
					)}
				</div>
			</PremiumCard>

			{/* TASK SELECTOR MODAL */}
			<TaskSelectorModal
				isOpen={showTaskSelector}
				onClose={() => setShowTaskSelector(false)}
				tasks={allTasks}
				projects={allProjects}
				onSelectTask={(task) => {
					setSelectedTask(task);
				}}
			/>

			{/* PAUSE MODAL */}
			{showPauseModal && (
				<div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
						<div className="flex items-center justify-between border-b border-border pb-2.5">
							<h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
								Pause Focus Session
							</h3>
							<button type="button" onClick={() => setShowPauseModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="space-y-3 text-xs">
							<p className="text-muted-foreground">
								Select an optional reason for pausing your active focus session:
							</p>

							<div className="grid grid-cols-2 gap-2">
								{["Break", "Blocked", "Meeting", "Other"].map((reason) => (
									<button
										key={reason}
										type="button"
										onClick={() => setPauseReason(reason)}
										className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
											pauseReason === reason
												? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40"
												: "bg-secondary text-muted-foreground border-border hover:text-foreground"
										}`}
									>
										{reason}
									</button>
								))}
							</div>
						</div>

						<div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
							<button
								type="button"
								onClick={() => setShowPauseModal(false)}
								className="px-4 py-1.5 rounded-lg bg-secondary border border-border text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handlePauseFocus}
								className="px-4 py-1.5 rounded-lg bg-amber-500 text-white dark:bg-amber-500 dark:text-black text-xs font-bold hover:bg-amber-600 dark:hover:bg-amber-400 cursor-pointer"
							>
								Confirm Pause
							</button>
						</div>
					</div>
				</div>
			)}

			{/* END / FINISH FOCUS MODAL */}
			{showEndModal && (
				<EndFocusModal
					isOpen={showEndModal}
					onClose={() => setShowEndModal(false)}
					session={activeSession}
					elapsedSeconds={elapsed}
					projects={allProjects}
					onEndSession={handleFinishFocus}
					onCreateFollowUpTask={handleCreateFollowUpTask}
				/>
			)}

			{/* HISTORY & STATS DRAWERS */}
			<HistoryDrawer
				isOpen={showHistoryDrawer}
				onClose={() => setShowHistoryDrawer(false)}
				history={history}
				onSelectSession={() => {}}
			/>

			<StatsDrawer
				isOpen={showStatsDrawer}
				onClose={() => setShowStatsDrawer(false)}
				overview={overview}
				weeklyData={weeklyData}
				weekOffset={weekOffset}
				onChangeWeekOffset={setWeekOffset}
			/>
		</div>
	);
}
