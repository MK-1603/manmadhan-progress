"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
	Clock, ShieldAlert, Moon, Sun, CheckCircle2, Save, AlertTriangle,
	RefreshCw, Calendar, Plus, Trash2, Zap, History, X, Check, Globe,
	Shield, Lock, AlertCircle, Info, Sliders, ArrowRight
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";

interface OrgWorkingHoursTabProps {
	userRole: string;
}

const TIMEZONES = [
	{ value: "Asia/Kolkata", label: "Asia/Kolkata (IST +05:30)" },
	{ value: "UTC", label: "UTC (Coordinated Universal Time)" },
	{ value: "America/New_York", label: "America/New_York (EST/EDT)" },
	{ value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
	{ value: "Europe/London", label: "Europe/London (GMT/BST)" },
	{ value: "Asia/Tokyo", label: "Asia/Tokyo (JST +09:00)" },
	{ value: "Asia/Dubai", label: "Asia/Dubai (GST +04:00)" },
	{ value: "Australia/Sydney", label: "Australia/Sydney (AEST +10:00)" },
];

const DAYS_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface WeeklyDayConfig {
	dayOfWeek: number;
	isWorkingDay: boolean;
	startTime: string;
	endTime: string;
}

export function OrgWorkingHoursTab({ userRole }: OrgWorkingHoursTabProps) {
	const isCEO = userRole === "CEO" || userRole === "SYSTEM_OWNER";

	// Data State
	const [loading, setLoading] = useState(true);
	const [status, setStatus] = useState<any>(null);
	const [policy, setPolicy] = useState<any>(null);
	const [weeklySchedule, setWeeklySchedule] = useState<WeeklyDayConfig[]>([]);
	const [exceptions, setExceptions] = useState<any[]>([]);
	const [historyLogs, setHistoryLogs] = useState<any[]>([]);

	// Draft State (for Edit mode)
	const [isEditing, setIsEditing] = useState(false);
	const [draftTimezone, setDraftTimezone] = useState("Asia/Kolkata");
	const [draftStart, setDraftStart] = useState("04:00");
	const [draftEnd, setDraftEnd] = useState("23:00");
	const [draftEnforce, setDraftEnforce] = useState(true);
	const [draftBlockExecution, setDraftBlockExecution] = useState(true);
	const [draftBlockSubmission, setDraftBlockSubmission] = useState(true);
	const [draftBlockProject, setDraftBlockProject] = useState(true);
	const [draftBlockApproval, setDraftBlockApproval] = useState(true);
	const [draftBlockTimer, setDraftBlockTimer] = useState(true);
	const [draftDeadlinePolicy, setDraftDeadlinePolicy] = useState("preserve_calendar");
	const [draftWeekly, setDraftWeekly] = useState<WeeklyDayConfig[]>([]);

	// Feedback / Modal States
	const [actionSuccess, setActionSuccess] = useState("");
	const [actionError, setActionError] = useState("");
	const [saving, setSaving] = useState(false);
	const [showImpactModal, setShowImpactModal] = useState(false);
	const [showAddExceptionModal, setShowAddExceptionModal] = useState(false);
	const [showOverrideModal, setShowOverrideModal] = useState(false);
	const [showHistoryDetailModal, setShowHistoryDetailModal] = useState<any>(null);

	// Add Exception Form
	const [excDate, setExcDate] = useState("");
	const [excReason, setExcReason] = useState("");
	const [excType, setExcType] = useState("CLOSED");
	const [excIsClosed, setExcIsClosed] = useState(true);
	const [excStart, setExcStart] = useState("09:00");
	const [excEnd, setExcEnd] = useState("17:00");

	// Emergency Override Form
	const [ovReason, setOvReason] = useState("");
	const [ovDuration, setOvDuration] = useState(60);
	const [ovActions, setOvActions] = useState<string[]>([
		"task_execution", "task_submission", "project_submission", "approvals"
	]);

	// Fetch Policy Data
	const loadPolicyData = useCallback(async () => {
		setLoading(true);
		setActionError("");
		try {
			const res = await apiClient.get("/org/working-hours");
			if (res.data?.success) {
				const d = res.data.data;
				setStatus(d.status);
				setPolicy(d.policy);
				setWeeklySchedule(d.weeklySchedule || []);
				setExceptions(d.exceptions || []);

				// Populate Drafts
				if (d.policy) {
					setDraftTimezone(d.policy.timezone || "Asia/Kolkata");
					setDraftStart(d.policy.workingHoursStart || "04:00");
					setDraftEnd(d.policy.workingHoursEnd || "23:00");
					setDraftEnforce(d.policy.enforceWorkingHours ?? true);
					setDraftBlockExecution(d.policy.blockTaskExecution ?? true);
					setDraftBlockSubmission(d.policy.blockTaskSubmission ?? true);
					setDraftBlockProject(d.policy.blockProjectSubmission ?? true);
					setDraftBlockApproval(d.policy.blockApprovalActions ?? true);
					setDraftBlockTimer(d.policy.blockTimerTracking ?? true);
					setDraftDeadlinePolicy(d.policy.deadlinePolicy || "preserve_calendar");
				}
				if (d.weeklySchedule) {
					setDraftWeekly(JSON.parse(JSON.stringify(d.weeklySchedule)));
				}
			}

			// Also fetch history
			const histRes = await apiClient.get("/org/working-hours/history");
			if (histRes.data?.success) {
				setHistoryLogs(histRes.data.data || []);
			}
		} catch (e: any) {
			console.error("Failed to load working hours policy:", e);
			setActionError(e.response?.data?.error || "Failed to connect to working hours engine.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadPolicyData();
	}, [loadPolicyData]);

	// Calculate auto-derived restricted window
	const derivedRestrictedStart = draftEnd;
	const derivedRestrictedEnd = draftStart;

	// Unsaved changes check
	const isDirty = useMemo(() => {
		if (!policy) return false;
		if (draftTimezone !== policy.timezone) return true;
		if (draftStart !== policy.workingHoursStart) return true;
		if (draftEnd !== policy.workingHoursEnd) return true;
		if (draftEnforce !== policy.enforceWorkingHours) return true;
		if (draftBlockExecution !== policy.blockTaskExecution) return true;
		if (draftBlockSubmission !== policy.blockTaskSubmission) return true;
		if (draftBlockProject !== policy.blockProjectSubmission) return true;
		if (draftBlockApproval !== policy.blockApprovalActions) return true;
		if (draftBlockTimer !== policy.blockTimerTracking) return true;
		if (draftDeadlinePolicy !== policy.deadlinePolicy) return true;
		if (JSON.stringify(draftWeekly) !== JSON.stringify(weeklySchedule)) return true;
		return false;
	}, [
		policy, draftTimezone, draftStart, draftEnd, draftEnforce,
		draftBlockExecution, draftBlockSubmission, draftBlockProject,
		draftBlockApproval, draftBlockTimer, draftDeadlinePolicy,
		draftWeekly, weeklySchedule
	]);

	// Save policy handler
	const handleSavePolicy = async () => {
		if (draftStart === draftEnd && draftEnforce) {
			setActionError("Operational start time must be different from operational end time.");
			return;
		}

		setSaving(true);
		setActionError("");
		try {
			const res = await apiClient.put("/org/working-hours", {
				timezone: draftTimezone,
				workingHoursStart: draftStart,
				workingHoursEnd: draftEnd,
				enforceWorkingHours: draftEnforce,
				blockTaskExecution: draftBlockExecution,
				blockTaskSubmission: draftBlockSubmission,
				blockProjectSubmission: draftBlockProject,
				blockApprovalActions: draftBlockApproval,
				blockTimerTracking: draftBlockTimer,
				deadlinePolicy: draftDeadlinePolicy,
				weeklySchedule: draftWeekly,
			});

			if (res.data?.success) {
				setActionSuccess("✓ Working hours & operational policy applied successfully.");
				setShowImpactModal(false);
				setIsEditing(false);
				setTimeout(() => setActionSuccess(""), 4000);
				await loadPolicyData();
			}
		} catch (e: any) {
			console.error("Save error:", e);
			setActionError(e.response?.data?.error || "Failed to update working hours policy.");
		} finally {
			setSaving(false);
		}
	};

	// Discard Changes
	const handleDiscard = () => {
		if (policy) {
			setDraftTimezone(policy.timezone || "Asia/Kolkata");
			setDraftStart(policy.workingHoursStart || "04:00");
			setDraftEnd(policy.workingHoursEnd || "23:00");
			setDraftEnforce(policy.enforceWorkingHours ?? true);
			setDraftBlockExecution(policy.blockTaskExecution ?? true);
			setDraftBlockSubmission(policy.blockTaskSubmission ?? true);
			setDraftBlockProject(policy.blockProjectSubmission ?? true);
			setDraftBlockApproval(policy.blockApprovalActions ?? true);
			setDraftBlockTimer(policy.blockTimerTracking ?? true);
			setDraftDeadlinePolicy(policy.deadlinePolicy || "preserve_calendar");
		}
		if (weeklySchedule) {
			setDraftWeekly(JSON.parse(JSON.stringify(weeklySchedule)));
		}
		setIsEditing(false);
		setActionError("");
	};

	// Apply Mon to Weekdays shortcut
	const handleApplyMonToWeekdays = () => {
		const mon = draftWeekly.find(d => d.dayOfWeek === 1);
		if (!mon) return;
		setDraftWeekly(prev => prev.map(d => {
			if (d.dayOfWeek >= 1 && d.dayOfWeek <= 5) {
				return { ...d, isWorkingDay: mon.isWorkingDay, startTime: mon.startTime, endTime: mon.endTime };
			}
			return d;
		}));
	};

	// Add Exception Submit
	const handleAddException = async () => {
		if (!excDate || !excReason) {
			setActionError("Date and reason are required for schedule exception.");
			return;
		}

		setSaving(true);
		try {
			const res = await apiClient.post("/org/working-hours/exceptions", {
				date: excDate,
				reason: excReason,
				exceptionType: excType,
				isClosed: excIsClosed,
				startTime: excIsClosed ? null : excStart,
				endTime: excIsClosed ? null : excEnd,
			});

			if (res.data?.success) {
				setActionSuccess("✓ Schedule exception added.");
				setShowAddExceptionModal(false);
				setExcDate("");
				setExcReason("");
				setTimeout(() => setActionSuccess(""), 4000);
				await loadPolicyData();
			}
		} catch (e: any) {
			setActionError(e.response?.data?.error || "Failed to add exception.");
		} finally {
			setSaving(false);
		}
	};

	// Delete Exception
	const handleDeleteException = async (id: string) => {
		try {
			const res = await apiClient.delete(`/org/working-hours/exceptions/${id}`);
			if (res.data?.success) {
				setActionSuccess("✓ Schedule exception removed.");
				setTimeout(() => setActionSuccess(""), 4000);
				await loadPolicyData();
			}
		} catch (e: any) {
			setActionError(e.response?.data?.error || "Failed to delete exception.");
		}
	};

	// Activate Emergency Override
	const handleActivateOverride = async () => {
		if (!ovReason.trim()) {
			setActionError("A mandatory reason must be provided for Emergency Override.");
			return;
		}

		setSaving(true);
		try {
			const res = await apiClient.post("/org/working-hours/emergency-override", {
				reason: ovReason,
				durationMinutes: ovDuration,
				allowedActions: ovActions,
			});

			if (res.data?.success) {
				setActionSuccess("✓ CEO Emergency Override activated.");
				setShowOverrideModal(false);
				setOvReason("");
				setTimeout(() => setActionSuccess(""), 4000);
				await loadPolicyData();
			}
		} catch (e: any) {
			setActionError(e.response?.data?.error || "Failed to activate emergency override.");
		} finally {
			setSaving(false);
		}
	};

	// End Emergency Override
	const handleEndOverride = async () => {
		try {
			const res = await apiClient.delete("/org/working-hours/emergency-override");
			if (res.data?.success) {
				setActionSuccess("✓ CEO Emergency Override deactivated.");
				setTimeout(() => setActionSuccess(""), 4000);
				await loadPolicyData();
			}
		} catch (e: any) {
			setActionError(e.response?.data?.error || "Failed to end override.");
		}
	};

	return (
		<div className="space-y-6 max-w-5xl w-full mx-auto pb-16 font-sans">
			{/* Page Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-xl font-extrabold text-[#F4F7F5] tracking-tight flex items-center gap-2">
							<Clock className="w-5 h-5 text-gold" /> Working Hours & Operational Policy Engine
						</h2>
						{/* Live Status Pill */}
						{status && (
							<span
								className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border shadow-xs ${
									status.currentState === "EMERGENCY_OVERRIDE"
										? "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse"
										: status.isOperational
										? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
										: "bg-rose-500/15 text-rose-400 border-rose-500/30"
								}`}
							>
								<span
									className={`w-2 h-2 rounded-full ${
										status.currentState === "EMERGENCY_OVERRIDE"
											? "bg-amber-400"
											: status.isOperational
											? "bg-emerald-400"
											: "bg-rose-400"
									}`}
								/>
								{status.currentState === "EMERGENCY_OVERRIDE"
									? "● OVERRIDE ACTIVE"
									: status.isOperational
									? "● OPERATIONAL"
									: "● RESTRICTED"}
							</span>
						)}
					</div>
					<p className="text-xs text-[#9AA4B2] font-medium mt-1">
						Define daily execution windows, timezone policies, weekly rules, holiday exceptions, and emergency enforcement.
					</p>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{isCEO && (!isEditing ? (
						<button
							type="button"
							onClick={() => setIsEditing(true)}
							className="h-9 px-4 rounded-lg bg-gold hover:bg-gold/90 text-black text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
						>
							<Sliders className="w-3.5 h-3.5" />
							<span>Edit Schedule</span>
						</button>
					) : (
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleDiscard}
								className="h-9 px-3.5 rounded-lg bg-[#0F1218] border border-white/10 text-xs font-bold text-[#9AA4B2] hover:text-white cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => setShowImpactModal(true)}
								className="h-9 px-4 rounded-lg bg-gold hover:bg-gold/90 text-black text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
							>
								<Save className="w-3.5 h-3.5" />
								<span>Save Changes</span>
							</button>
						</div>
					))}

					<button
						type="button"
						onClick={loadPolicyData}
						disabled={loading}
						className="p-2 rounded-lg bg-[#0F1218] border border-white/10 text-[#9AA4B2] hover:text-[#F4F7F5] transition-colors cursor-pointer"
						title="Refresh policy engine data"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-gold" : ""}`} />
					</button>
				</div>
			</div>

			{/* Action Notifications */}
			{actionSuccess && (
				<div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
					<CheckCircle2 className="w-4 h-4 shrink-0" /> {actionSuccess}
				</div>
			)}
			{actionError && (
				<div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
					<div className="flex items-center gap-2">
						<AlertTriangle className="w-4 h-4 shrink-0" /> {actionError}
					</div>
					<button type="button" onClick={() => setActionError("")} className="text-rose-400 hover:text-white">
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			)}

			{/* Unsaved Changes Alert Bar */}
			{isDirty && (
				<div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
					<div className="flex items-center gap-2.5">
						<AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
						<div>
							<span className="font-extrabold uppercase tracking-wider block">Unsaved Changes</span>
							<span className="text-[11px] text-amber-200/80 font-normal">Your schedule modifications have not been committed to database.</span>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handleDiscard}
							className="px-3 py-1.5 rounded-lg bg-[#0F1218] border border-white/10 text-xs font-bold text-[#9AA4B2] hover:text-white cursor-pointer"
						>
							Discard
						</button>
						<button
							type="button"
							onClick={() => setShowImpactModal(true)}
							className="px-3 py-1.5 rounded-lg bg-gold text-black text-xs font-bold hover:bg-gold/90 cursor-pointer flex items-center gap-1.5"
						>
							<Save className="w-3.5 h-3.5" /> Save Changes
						</button>
					</div>
				</div>
			)}

			{/* Active Emergency Override Banner */}
			{status?.activeOverride && (
				<div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
					<div className="flex items-center justify-between flex-wrap gap-2">
						<div className="flex items-center gap-2">
							<ShieldAlert className="w-5 h-5 text-amber-400 animate-bounce" />
							<span className="text-sm font-extrabold tracking-wide uppercase">● CEO Emergency Override Active</span>
						</div>
						{isCEO && (
							<button
								type="button"
								onClick={handleEndOverride}
								className="px-3 py-1 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 cursor-pointer shadow-xs"
							>
								End Override Now
							</button>
						)}
					</div>
					<p className="text-xs text-amber-200/90 font-medium">
						Reason: <span className="font-bold text-white">{status.activeOverride.reason}</span>
					</p>
					<div className="flex items-center gap-4 text-[11px] font-mono text-amber-300/80 pt-1 border-t border-amber-500/20">
						<span>Expires in: <strong className="text-amber-400 font-bold">{status.timeRemaining.formatted}</strong></span>
						<span>Allowed: <strong className="text-white">{status.activeOverride.allowedActions?.join(", ")}</strong></span>
					</div>
				</div>
			)}

			{/* 1. CURRENT SCHEDULE & TIMEZONE SECTION */}
			<PremiumCard className="p-5 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
				<div className="flex items-center justify-between border-b border-white/10 pb-3">
					<div>
						<h3 className="text-sm font-extrabold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
							<Globe className="w-4 h-4 text-gold" /> Current Organization Schedule
						</h3>
						<p className="text-xs text-[#9AA4B2] font-medium mt-0.5">
							Canonical operational window and canonical organization timezone.
						</p>
					</div>
					<div className="text-right">
						<span className="text-[10px] font-mono text-[#667085] uppercase block">Current Time</span>
						<span className="text-sm font-mono font-extrabold text-gold">
							{status?.currentTime || "--:--"} ({status?.timezone || "Asia/Kolkata"})
						</span>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Timezone Selector */}
					<div className="space-y-1.5">
						<label className="text-xs font-bold text-[#F4F7F5] flex items-center gap-1.5">
							Organization Timezone
						</label>
						{isEditing ? (
							<select
								value={draftTimezone}
								onChange={(e) => setDraftTimezone(e.target.value)}
								className="w-full h-9 px-3 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold cursor-pointer"
							>
								{TIMEZONES.map((tz) => (
									<option key={tz.value} value={tz.value}>
										{tz.label}
									</option>
								))}
							</select>
						) : (
							<div className="h-9 px-3 rounded-lg bg-[#0B0E13] border border-white/10 text-xs text-[#F4F7F5] font-mono flex items-center justify-between">
								<span>{draftTimezone}</span>
								<span className="text-[10px] text-[#667085]">Canonical</span>
							</div>
						)}
					</div>

					{/* Operational Hours */}
					<div className="space-y-1.5">
						<label className="text-xs font-bold text-[#F4F7F5] flex items-center gap-1.5">
							<Sun className="w-3.5 h-3.5 text-emerald-400" /> Operational Window
						</label>
						{isEditing ? (
							<div className="flex items-center gap-2">
								<input
									type="time"
									value={draftStart}
									onChange={(e) => setDraftStart(e.target.value)}
									className="w-full h-9 px-2 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] font-mono focus:outline-none focus:border-gold cursor-pointer"
								/>
								<span className="text-xs text-[#667085]">to</span>
								<input
									type="time"
									value={draftEnd}
									onChange={(e) => setDraftEnd(e.target.value)}
									className="w-full h-9 px-2 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] font-mono focus:outline-none focus:border-gold cursor-pointer"
								/>
							</div>
						) : (
							<div className="h-9 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-400 flex items-center justify-between">
								<span>{draftStart} — {draftEnd}</span>
								<span className="text-[10px] text-emerald-500/80 uppercase">Active</span>
							</div>
						)}
					</div>

					{/* Auto-derived Restricted Window */}
					<div className="space-y-1.5">
						<label className="text-xs font-bold text-[#F4F7F5] flex items-center gap-1.5">
							<Moon className="w-3.5 h-3.5 text-rose-400" /> Derived Restricted Window
						</label>
						<div className="h-9 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-mono font-bold text-rose-400 flex items-center justify-between">
							<span>{derivedRestrictedStart} — {derivedRestrictedEnd}</span>
							<span className="text-[10px] text-rose-400/80 uppercase">Auto Inverse</span>
						</div>
					</div>
				</div>

				{/* Next Transition Display */}
				{status && (
					<div className="p-3 rounded-xl bg-[#0B0E13] border border-white/10 flex items-center justify-between text-xs">
						<div className="flex items-center gap-2.5">
							<Clock className="w-4 h-4 text-gold shrink-0" />
							<div>
								<span className="font-bold text-[#F4F7F5]">{status.nextTransition.label}</span>
								<span className="text-[11px] text-[#9AA4B2] font-mono block">
									Scheduled at <strong className="text-white">{status.nextTransition.time}</strong> ({status.timezone})
								</span>
							</div>
						</div>
						<div className="text-right font-mono">
							<span className="text-[10px] text-[#667085] uppercase block">Time Remaining</span>
							<span className="text-sm font-bold text-gold">{status.timeRemaining.formatted}</span>
						</div>
					</div>
				)}

				{/* Card Bottom Save Bar during Edit Mode */}
				{isEditing && (
					<div className="pt-3 border-t border-white/10 flex items-center justify-between">
						<span className="text-xs text-gold font-semibold flex items-center gap-1.5">
							<Info className="w-3.5 h-3.5 text-gold" /> Editing Active Schedule Draft
						</span>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleDiscard}
								className="h-8 px-3 rounded-lg bg-[#0B0E13] border border-white/10 text-xs font-bold text-[#9AA4B2] hover:text-white cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => setShowImpactModal(true)}
								className="h-8 px-4 rounded-lg bg-gold hover:bg-gold/90 text-black text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
							>
								<Save className="w-3.5 h-3.5" />
								<span>Save Schedule Changes</span>
							</button>
						</div>
					</div>
				)}
			</PremiumCard>

			{/* 2. WEEKLY SCHEDULE SECTION */}
			<PremiumCard className="p-5 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
					<div>
						<h3 className="text-sm font-extrabold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
							<Calendar className="w-4 h-4 text-gold" /> Weekly Schedule Configuration
						</h3>
						<p className="text-xs text-[#9AA4B2] font-medium mt-0.5">
							Configure operational status and custom hours for each day of the week.
						</p>
					</div>

					{isEditing && (
						<button
							type="button"
							onClick={handleApplyMonToWeekdays}
							className="h-8 px-3 rounded-lg bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
						>
							<Check className="w-3 h-3" /> Apply Monday to Weekdays
						</button>
					)}
				</div>

				<div className="grid grid-cols-1 gap-2.5">
					{draftWeekly.map((day) => {
						const dayName = DAYS_NAMES[day.dayOfWeek] || `Day ${day.dayOfWeek}`;
						const isToday = status?.dayOfWeek === day.dayOfWeek;

						return (
							<div
								key={day.dayOfWeek}
								className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
									isToday
										? "bg-gold/5 border-gold/40 shadow-xs"
										: "bg-[#0B0E13] border-white/10"
								}`}
							>
								<div className="flex items-center gap-3 min-w-[140px]">
									<button
										type="button"
										disabled={!isEditing}
										onClick={() => {
											setDraftWeekly(prev => prev.map(d => d.dayOfWeek === day.dayOfWeek ? { ...d, isWorkingDay: !d.isWorkingDay } : d));
										}}
										className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
											day.isWorkingDay ? "bg-emerald-500" : "bg-[#141820]"
										}`}
									>
										<div className={`w-4 h-4 rounded-full bg-black transition-transform ${day.isWorkingDay ? "translate-x-4" : "translate-x-0"}`} />
									</button>
									<div>
										<span className="font-bold text-[#F4F7F5] flex items-center gap-1.5">
											{dayName}
											{isToday && <span className="px-1.5 py-0.2 text-[9px] font-mono bg-gold text-black rounded font-bold uppercase">Today</span>}
										</span>
										<span className="text-[10px] text-[#667085] font-mono block">
											{day.isWorkingDay ? "Operational Day" : "Restricted / Off Day"}
										</span>
									</div>
								</div>

								{day.isWorkingDay ? (
									isEditing ? (
										<div className="flex items-center gap-2">
											<input
												type="time"
												value={day.startTime}
												onChange={(e) => {
													const val = e.target.value;
													setDraftWeekly(prev => prev.map(d => d.dayOfWeek === day.dayOfWeek ? { ...d, startTime: val } : d));
												}}
												className="h-8 px-2 rounded-lg bg-[#0F1218] border border-white/15 text-xs text-[#F4F7F5] font-mono focus:outline-none focus:border-gold"
											/>
											<span className="text-xs text-[#667085]">to</span>
											<input
												type="time"
												value={day.endTime}
												onChange={(e) => {
													const val = e.target.value;
													setDraftWeekly(prev => prev.map(d => d.dayOfWeek === day.dayOfWeek ? { ...d, endTime: val } : d));
												}}
												className="h-8 px-2 rounded-lg bg-[#0F1218] border border-white/15 text-xs text-[#F4F7F5] font-mono focus:outline-none focus:border-gold"
											/>
										</div>
									) : (
										<span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
											{day.startTime} — {day.endTime}
										</span>
									)
								) : (
									<span className="font-mono text-xs text-[#667085] bg-[#0F1218] px-2.5 py-1 rounded-lg border border-white/5">
										Closed / Off
									</span>
								)}
							</div>
						);
					})}
				</div>
			</PremiumCard>

			{/* 3. ENFORCEMENT & DEADLINE POLICY SECTION */}
			<PremiumCard className="p-5 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
				<div className="border-b border-white/10 pb-3">
					<h3 className="text-sm font-extrabold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
						<ShieldAlert className="w-4 h-4 text-gold" /> Enforcement & Compliance Rules
					</h3>
					<p className="text-xs text-[#9AA4B2] font-medium mt-0.5">
						Configure granular system lockout restrictions and deadline behavior during restricted hours.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{/* Restricted Hours Enforcement Toggle */}
					<div className="flex items-center justify-between p-3.5 bg-[#0B0E13] border border-white/10 rounded-xl">
						<div className="space-y-0.5 pr-2">
							<span className="text-xs font-bold text-[#F4F7F5] block">Restricted-Hours Enforcement</span>
							<p className="text-[11px] text-[#9AA4B2]">Master switch to enforce working hours organization-wide.</p>
						</div>
						<button
							type="button"
							disabled={!isEditing}
							onClick={() => setDraftEnforce(!draftEnforce)}
							className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${draftEnforce ? "bg-gold" : "bg-[#141820]"}`}
						>
							<div className={`w-4 h-4 rounded-full bg-black transition-transform ${draftEnforce ? "translate-x-5" : "translate-x-0"}`} />
						</button>
					</div>

					{/* Task Execution Block */}
					<div className="flex items-center justify-between p-3.5 bg-[#0B0E13] border border-white/10 rounded-xl">
						<div className="space-y-0.5 pr-2">
							<span className="text-xs font-bold text-[#F4F7F5] block">Block Task Execution</span>
							<p className="text-[11px] text-[#9AA4B2]">Prevent active work session starts during restricted hours.</p>
						</div>
						<button
							type="button"
							disabled={!isEditing}
							onClick={() => setDraftBlockExecution(!draftBlockExecution)}
							className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${draftBlockExecution ? "bg-gold" : "bg-[#141820]"}`}
						>
							<div className={`w-4 h-4 rounded-full bg-black transition-transform ${draftBlockExecution ? "translate-x-5" : "translate-x-0"}`} />
						</button>
					</div>

					{/* Task Submission Block */}
					<div className="flex items-center justify-between p-3.5 bg-[#0B0E13] border border-white/10 rounded-xl">
						<div className="space-y-0.5 pr-2">
							<span className="text-xs font-bold text-[#F4F7F5] block">Block Task Submissions</span>
							<p className="text-[11px] text-[#9AA4B2]">Block task completion submissions during restricted hours.</p>
						</div>
						<button
							type="button"
							disabled={!isEditing}
							onClick={() => setDraftBlockSubmission(!draftBlockSubmission)}
							className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${draftBlockSubmission ? "bg-gold" : "bg-[#141820]"}`}
						>
							<div className={`w-4 h-4 rounded-full bg-black transition-transform ${draftBlockSubmission ? "translate-x-5" : "translate-x-0"}`} />
						</button>
					</div>

					{/* Project Submission Block */}
					<div className="flex items-center justify-between p-3.5 bg-[#0B0E13] border border-white/10 rounded-xl">
						<div className="space-y-0.5 pr-2">
							<span className="text-xs font-bold text-[#F4F7F5] block">Block Project Submissions</span>
							<p className="text-[11px] text-[#9AA4B2]">Block project stage and document dispatches during off-hours.</p>
						</div>
						<button
							type="button"
							disabled={!isEditing}
							onClick={() => setDraftBlockProject(!draftBlockProject)}
							className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${draftBlockProject ? "bg-gold" : "bg-[#141820]"}`}
						>
							<div className={`w-4 h-4 rounded-full bg-black transition-transform ${draftBlockProject ? "translate-x-5" : "translate-x-0"}`} />
						</button>
					</div>

					{/* Approval Actions Block */}
					<div className="flex items-center justify-between p-3.5 bg-[#0B0E13] border border-white/10 rounded-xl">
						<div className="space-y-0.5 pr-2">
							<span className="text-xs font-bold text-[#F4F7F5] block">Block Approvals</span>
							<p className="text-[11px] text-[#9AA4B2]">Restrict CO-CEO & leadership approval actions off-hours.</p>
						</div>
						<button
							type="button"
							disabled={!isEditing}
							onClick={() => setDraftBlockApproval(!draftBlockApproval)}
							className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${draftBlockApproval ? "bg-gold" : "bg-[#141820]"}`}
						>
							<div className={`w-4 h-4 rounded-full bg-black transition-transform ${draftBlockApproval ? "translate-x-5" : "translate-x-0"}`} />
						</button>
					</div>

					{/* Timer Tracking Block */}
					<div className="flex items-center justify-between p-3.5 bg-[#0B0E13] border border-white/10 rounded-xl">
						<div className="space-y-0.5 pr-2">
							<span className="text-xs font-bold text-[#F4F7F5] block">Block Focus Timer Tracking</span>
							<p className="text-[11px] text-[#9AA4B2]">Automatically pause active focus sessions during restricted hours.</p>
						</div>
						<button
							type="button"
							disabled={!isEditing}
							onClick={() => setDraftBlockTimer(!draftBlockTimer)}
							className={`w-10 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${draftBlockTimer ? "bg-gold" : "bg-[#141820]"}`}
						>
							<div className={`w-4 h-4 rounded-full bg-black transition-transform ${draftBlockTimer ? "translate-x-5" : "translate-x-0"}`} />
						</button>
					</div>
				</div>

				{/* Deadline Behavior Selector */}
				<div className="space-y-2 pt-2 border-t border-white/10">
					<label className="text-xs font-extrabold text-[#F4F7F5] uppercase tracking-wider block">
						Deadline Behavior Policy
					</label>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						{[
							{ id: "preserve_calendar", label: "Preserve Calendar Deadlines", desc: "Deadlines strictly follow calendar dates regardless of off-hours." },
							{ id: "exclude_restricted", label: "Exclude Restricted Hours", desc: "SLA timer pauses during restricted windows and resumes on next active window." },
							{ id: "auto_extend", label: "Auto-Extend for Off Days", desc: "Automatically shifts deadlines when a non-working day or holiday is encountered." },
						].map((dp) => (
							<div
								key={dp.id}
								onClick={() => isEditing && setDraftDeadlinePolicy(dp.id)}
								className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
									isEditing ? "cursor-pointer" : ""
								} ${
									draftDeadlinePolicy === dp.id
										? "bg-gold/10 border-gold text-[#F4F7F5]"
										: "bg-[#0B0E13] border-white/10 text-[#9AA4B2]"
								}`}
							>
								<div className="flex items-center justify-between font-bold text-[#F4F7F5]">
									<span>{dp.label}</span>
									{draftDeadlinePolicy === dp.id && <Check className="w-3.5 h-3.5 text-gold" />}
								</div>
								<p className="text-[10.5px] leading-relaxed">{dp.desc}</p>
							</div>
						))}
					</div>
				</div>
			</PremiumCard>

			{/* 4. EXCEPTIONS & HOLIDAYS SECTION */}
			<PremiumCard className="p-5 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
				<div className="flex items-center justify-between border-b border-white/10 pb-3">
					<div>
						<h3 className="text-sm font-extrabold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
							<Calendar className="w-4 h-4 text-gold" /> Exceptions & Holidays
						</h3>
						<p className="text-xs text-[#9AA4B2] font-medium mt-0.5">
							Specific date overrides (Date Exception &gt; Weekly Schedule &gt; Organization Default).
						</p>
					</div>

					{isCEO && (
						<button
							type="button"
							onClick={() => setShowAddExceptionModal(true)}
							className="h-8 px-3 rounded-lg bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<Plus className="w-3.5 h-3.5" />
							<span>Add Exception</span>
						</button>
					)}
				</div>

				<div className="space-y-2.5">
					{exceptions.length > 0 ? (
						exceptions.map((exc) => (
							<div
								key={exc.id}
								className="flex items-center justify-between p-3.5 rounded-xl bg-[#0B0E13] border border-white/10 text-xs"
							>
								<div className="space-y-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="font-mono font-bold text-[#F4F7F5] text-xs">{exc.date}</span>
										<span
											className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase border ${
												exc.exceptionType === "CLOSED" || exc.isClosed
													? "bg-rose-500/10 text-rose-400 border-rose-500/20"
													: "bg-blue-500/10 text-blue-400 border-blue-500/20"
											}`}
										>
											{exc.exceptionType}
										</span>
									</div>
									<p className="text-xs text-[#9AA4B2] font-medium truncate">{exc.reason}</p>
									<span className="text-[10px] text-[#667085] font-mono block">
										{exc.isClosed ? "Organization Closed" : `Custom Hours: ${exc.startTime} — ${exc.endTime}`}
									</span>
								</div>

								{isCEO && (
									<button
										type="button"
										onClick={() => handleDeleteException(exc.id)}
										className="p-1.5 rounded-lg bg-[#141820] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
										title="Delete exception"
									>
										<Trash2 className="w-3.5 h-3.5" />
									</button>
								)}
							</div>
						))
					) : (
						<div className="py-6 text-center text-xs text-[#9AA4B2] font-medium">
							No custom schedule exceptions configured.
						</div>
					)}
				</div>
			</PremiumCard>

			{/* 5. EMERGENCY OVERRIDE CONTROL SECTION */}
			<PremiumCard className="p-5 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
				<div className="flex items-center justify-between border-b border-white/10 pb-3">
					<div>
						<h3 className="text-sm font-extrabold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
							<Zap className="w-4 h-4 text-gold" /> CEO Emergency Override Protocol
						</h3>
						<p className="text-xs text-[#9AA4B2] font-medium mt-0.5">
							Controlled temporary bypass of restricted-hour enforcement for critical security hotfixes.
						</p>
					</div>

					{isCEO && (
						<button
							type="button"
							onClick={() => setShowOverrideModal(true)}
							className="h-8 px-3.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<Zap className="w-3.5 h-3.5" />
							<span>Activate Emergency Override</span>
						</button>
					)}
				</div>

				<div className="p-4 rounded-xl bg-[#0B0E13] border border-white/10 text-xs text-[#9AA4B2] space-y-2">
					<p>
						Activating emergency override creates an audited session that temporarily allows selected execution actions during mandatory off-hours. Every activation requires a mandatory justification reason.
					</p>
				</div>
			</PremiumCard>

			{/* 6. VISUAL SCHEDULE & WEEK PREVIEW SECTION */}
			<PremiumCard className="p-5 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
				<div className="border-b border-white/10 pb-3">
					<h3 className="text-sm font-extrabold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
						<Sliders className="w-4 h-4 text-gold" /> 24-Hour Visual Timeline & Week Preview
					</h3>
					<p className="text-xs text-[#9AA4B2] font-medium mt-0.5">
						Visual timeline representation of operational vs restricted windows and current execution marker.
					</p>
				</div>

				{/* 24-Hour Timeline Bar */}
				<div className="space-y-2">
					<div className="flex items-center justify-between text-[10px] font-mono text-[#667085]">
						<span>00:00</span>
						<span>04:00</span>
						<span>08:00</span>
						<span>12:00</span>
						<span>16:00</span>
						<span>20:00</span>
						<span>24:00</span>
					</div>

					<div className="relative w-full h-8 rounded-xl bg-[#0B0E13] border border-white/10 overflow-hidden flex">
						{/* Render 24h segments */}
						{Array.from({ length: 24 }).map((_, hour) => {
							const startMin = parseInt(draftStart.split(":")[0], 10) || 4;
							const endMin = parseInt(draftEnd.split(":")[0], 10) || 23;
							const isOp = hour >= startMin && hour < endMin;

							return (
								<div
									key={hour}
									className={`flex-1 border-r border-white/5 h-full transition-colors ${
										isOp ? "bg-emerald-500/25 hover:bg-emerald-500/35" : "bg-rose-500/10 hover:bg-rose-500/20"
									}`}
									title={`${String(hour).padStart(2, "0")}:00 — ${isOp ? "Operational" : "Restricted"}`}
								/>
							);
						})}
					</div>

					<div className="flex items-center justify-between text-[11px] font-mono">
						<span className="text-emerald-400 font-bold flex items-center gap-1">
							<span className="w-2 h-2 rounded-full bg-emerald-400" /> Operational ({draftStart} – {draftEnd})
						</span>
						<span className="text-rose-400 font-bold flex items-center gap-1">
							<span className="w-2 h-2 rounded-full bg-rose-400" /> Restricted ({derivedRestrictedStart} – {derivedRestrictedEnd})
						</span>
					</div>
				</div>
			</PremiumCard>

			{/* 7. POLICY AUDIT HISTORY SECTION */}
			<PremiumCard className="p-5 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
				<div className="border-b border-white/10 pb-3">
					<h3 className="text-sm font-extrabold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
						<History className="w-4 h-4 text-gold" /> Policy Audit Stream
					</h3>
					<p className="text-xs text-[#9AA4B2] font-medium mt-0.5">
						Immutable historical record of all working-hour schedule updates and emergency override activations.
					</p>
				</div>

				<div className="space-y-2">
					{historyLogs.length > 0 ? (
						historyLogs.slice(0, 10).map((log) => (
							<div
								key={log.id}
								className="flex items-center justify-between p-3 rounded-xl bg-[#0B0E13] border border-white/10 text-xs"
							>
								<div className="space-y-0.5 min-w-0">
									<div className="flex items-center gap-2">
										<span className="font-bold text-[#F4F7F5]">{log.changedBy?.name || log.changedBy?.email || "System CEO"}</span>
										<span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-gold/10 text-gold border border-gold/20 uppercase">
											{log.changeType}
										</span>
									</div>
									<p className="text-[11px] text-[#9AA4B2] font-mono truncate">{log.reason || "Policy updated"}</p>
								</div>
								<div className="text-right shrink-0">
									<span className="text-[10px] text-[#667085] font-mono block">
										{new Date(log.createdAt).toLocaleString()}
									</span>
								</div>
							</div>
						))
					) : (
						<div className="py-6 text-center text-xs text-[#9AA4B2] font-medium">
							No historical policy audit records recorded yet.
						</div>
					)}
				</div>
			</PremiumCard>

			{/* MODAL 1: IMPACT PREVIEW MODAL */}
			{showImpactModal && (
				<div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="bg-[#0F1218] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
						<div className="flex items-center justify-between border-b border-white/10 pb-3">
							<h3 className="text-sm font-extrabold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
								<AlertTriangle className="w-4 h-4 text-gold" /> Schedule Change Impact Preview
							</h3>
							<button type="button" onClick={() => setShowImpactModal(false)} className="text-[#667085] hover:text-white">
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="space-y-3 text-xs text-[#9AA4B2]">
							<div className="p-3 rounded-xl bg-[#0B0E13] border border-white/10 space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-[#667085]">Current Operational:</span>
									<span className="font-mono font-bold text-white">{policy?.workingHoursStart} – {policy?.workingHoursEnd}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-[#667085]">New Operational:</span>
									<span className="font-mono font-bold text-emerald-400">{draftStart} – {draftEnd} ({draftTimezone})</span>
								</div>
							</div>

							<div className="space-y-1">
								<span className="font-bold text-[#F4F7F5] block">Affected Services & Systems:</span>
								<ul className="list-disc list-inside space-y-1 text-[11px] text-[#9AA4B2]">
									<li>Active task execution session timing</li>
									<li>Task completion submission windows</li>
									<li>Project document dispatch permissions</li>
									<li>Focus timer tracking availability</li>
									<li>Automated off-hours notifications</li>
								</ul>
							</div>
						</div>

						<div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
							<button
								type="button"
								onClick={() => setShowImpactModal(false)}
								className="px-4 py-2 rounded-lg bg-[#0B0E13] border border-white/10 text-xs font-bold text-[#9AA4B2] hover:text-white cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSavePolicy}
								disabled={saving}
								className="px-4 py-2 rounded-lg bg-gold text-black text-xs font-bold hover:bg-gold/90 cursor-pointer flex items-center gap-1.5"
							>
								{saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
								<span>Confirm & Apply Schedule</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* MODAL 2: ADD EXCEPTION MODAL */}
			{showAddExceptionModal && (
				<div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="bg-[#0F1218] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
						<div className="flex items-center justify-between border-b border-white/10 pb-3">
							<h3 className="text-sm font-extrabold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
								<Calendar className="w-4 h-4 text-gold" /> Add Schedule Exception
							</h3>
							<button type="button" onClick={() => setShowAddExceptionModal(false)} className="text-[#667085] hover:text-white">
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="space-y-3 text-xs">
							<div className="space-y-1">
								<label className="font-bold text-[#F4F7F5] block">Date</label>
								<input
									type="date"
									value={excDate}
									onChange={(e) => setExcDate(e.target.value)}
									className="w-full h-9 px-3 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold"
								/>
							</div>

							<div className="space-y-1">
								<label className="font-bold text-[#F4F7F5] block">Reason / Description</label>
								<input
									type="text"
									placeholder="e.g. National Holiday / System Maintenance"
									value={excReason}
									onChange={(e) => setExcReason(e.target.value)}
									className="w-full h-9 px-3 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold"
								/>
							</div>

							<div className="space-y-1">
								<label className="font-bold text-[#F4F7F5] block">Exception Type</label>
								<select
									value={excType}
									onChange={(e) => {
										setExcType(e.target.value);
										setExcIsClosed(e.target.value === "CLOSED");
									}}
									className="w-full h-9 px-3 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold"
								>
									<option value="CLOSED">CLOSED (Organization Closed)</option>
									<option value="SPECIAL">SPECIAL (Special Working Hours)</option>
									<option value="MODIFIED">MODIFIED (Modified Hours)</option>
								</select>
							</div>

							{!excIsClosed && (
								<div className="flex items-center gap-2 pt-1">
									<input
										type="time"
										value={excStart}
										onChange={(e) => setExcStart(e.target.value)}
										className="w-full h-9 px-2 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] font-mono"
									/>
									<span className="text-xs text-[#667085]">to</span>
									<input
										type="time"
										value={excEnd}
										onChange={(e) => setExcEnd(e.target.value)}
										className="w-full h-9 px-2 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] font-mono"
									/>
								</div>
							)}
						</div>

						<div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
							<button
								type="button"
								onClick={() => setShowAddExceptionModal(false)}
								className="px-4 py-2 rounded-lg bg-[#0B0E13] border border-white/10 text-xs font-bold text-[#9AA4B2] hover:text-white"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleAddException}
								disabled={saving}
								className="px-4 py-2 rounded-lg bg-gold text-black text-xs font-bold hover:bg-gold/90"
							>
								Save Exception
							</button>
						</div>
					</div>
				</div>
			)}

			{/* MODAL 3: EMERGENCY OVERRIDE MODAL */}
			{showOverrideModal && (
				<div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="bg-[#0F1218] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
						<div className="flex items-center justify-between border-b border-white/10 pb-3">
							<h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
								<Zap className="w-4 h-4" /> Activate CEO Emergency Override
							</h3>
							<button type="button" onClick={() => setShowOverrideModal(false)} className="text-[#667085] hover:text-white">
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="space-y-3 text-xs">
							<div className="space-y-1">
								<label className="font-bold text-[#F4F7F5] block">Justification Reason (Mandatory)</label>
								<input
									type="text"
									placeholder="e.g. Critical production hotfix dispatch"
									value={ovReason}
									onChange={(e) => setOvReason(e.target.value)}
									className="w-full h-9 px-3 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold"
								/>
							</div>

							<div className="space-y-1">
								<label className="font-bold text-[#F4F7F5] block">Override Duration</label>
								<select
									value={ovDuration}
									onChange={(e) => setOvDuration(parseInt(e.target.value, 10))}
									className="w-full h-9 px-3 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold"
								>
									<option value={30}>30 Minutes</option>
									<option value={60}>60 Minutes (1 Hour)</option>
									<option value={120}>120 Minutes (2 Hours)</option>
									<option value={240}>240 Minutes (4 Hours)</option>
								</select>
							</div>
						</div>

						<div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
							<button
								type="button"
								onClick={() => setShowOverrideModal(false)}
								className="px-4 py-2 rounded-lg bg-[#0B0E13] border border-white/10 text-xs font-bold text-[#9AA4B2] hover:text-white"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleActivateOverride}
								disabled={saving}
								className="px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400"
							>
								Confirm Override
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
