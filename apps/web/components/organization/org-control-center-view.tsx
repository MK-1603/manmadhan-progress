"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2, Users, ShieldAlert, Activity, FolderKanban, Clock, GitCommit,
  ClipboardCheck, FileText, ShieldCheck, Trophy, Network, Loader2, Plus,
  Folder, ChevronRight, Upload, Search, Trash2, Eye, Shield, Check, Copy,
  ArrowRight, FileCode, Layers, CheckCircle2, AlertCircle, Mail, ArrowLeft,
  CheckSquare, XCircle, ExternalLink, RefreshCw, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { OrganizationLogo } from "./org-logo";
import { OrgGeneralTab } from "./settings/org-general-tab";
import { OrgPeopleTab } from "./org-people-tab";
import { OrgWorkingHoursTab } from "./settings/org-working-hours-tab";
import { OrgWorkflowTab } from "./settings/org-workflow-tab";
import { OrgEmailTemplatesTab } from "./org-email-templates-tab";
import { OrgApprovalsTab } from "./org-approvals-tab";
import { NumericValue } from "@/components/ui/numeric-value";
import { OrganizationHeader } from "./org-header";
import { OrganizationNavigation, ORG_NAV_ITEMS } from "./org-navigation";
import { AppSelect } from "@/components/ui/app-select";
import { AccessRestricted } from "@/components/ui/access-restricted";

interface OrgControlCenterViewProps {
	basePath: string;
}

export function OrgControlCenterView({ basePath }: OrgControlCenterViewProps) {
	const router = useRouter();
	const { socket } = useSocket();

	const [activeTab, setActiveTab] = useState("overview");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(true); // On mobile, show index by default
	const [workspace, setWorkspace] = useState<any>(null);
	const [stats, setStats] = useState<any>(null);
	const [realProjects, setRealProjects] = useState<any[]>([]);
	const [recentActivity, setRecentActivity] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	// ── Approvals Queue State ──
	const [approvals, setApprovals] = useState<any>({ tasks: [], extensions: [], leaves: [], total: 0 });
	const [loadingApprovals, setLoadingApprovals] = useState(false);
	const [approvalActionId, setApprovalActionId] = useState<string | null>(null);

	// ── Real Leaderboard State ──
	const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
	const [leaderboardPeriod, setLeaderboardPeriod] = useState<string>("weekly");
	const [leaderboardRole, setLeaderboardRole] = useState<string>("ALL");
	const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

	// ── Real Graph Data State ──
	const [graphData, setGraphData] = useState<any>(null);
	const [loadingGraph, setLoadingGraph] = useState(false);

	// ── Documents Navigation & Documents List State ──
	const [selectedStageCode, setSelectedStageCode] = useState<string | null>(null);
	const [documentsMap, setDocumentsMap] = useState<Record<string, any[]>>({
		"01": [
			{ id: "d1", title: "Project Charter & Team Setup", stage: "01 Project Invite & Connect", date: "Today", author: "CEO" },
			{ id: "d2", title: "Repository & Webhook Connect Guide", stage: "01 Project Invite & Connect", date: "Yesterday", author: "Lead Architect" }
		],
		"02": [
			{ id: "d3", title: "Master Product Requirements (PRD)", stage: "02 PRD", date: "Today", author: "CEO" },
			{ id: "d4", title: "User Stories & Acceptance Matrix", stage: "02 PRD", date: "3 days ago", author: "CO-CEO" }
		],
		"03": [
			{ id: "d5", title: "Technical Requirements & Architecture", stage: "03 TRD", date: "Today", author: "CO-CEO" }
		],
		"04": [
			{ id: "d6", title: "Application State Machine & Flows", stage: "04 Application Workflow", date: "4 days ago", author: "System Architect" }
		],
		"05": [
			{ id: "d7", title: "UI/UX Design System Specification", stage: "05 UI/UX Design Brief", date: "2 days ago", author: "UI Designer" }
		],
		"06": [
			{ id: "d8", title: "Database Drizzle Schema Definition", stage: "06 Database / Schema Plan", date: "5 days ago", author: "Backend Lead" }
		],
		"07": [
			{ id: "d9", title: "Sprint Implementation Plan & Milestones", stage: "07 Implementation Plan", date: "1 week ago", author: "CO-CEO" }
		],
		"08": [
			{ id: "d10", title: "Verification & Automated Testing Plan", stage: "08 Implementation & Final Verification", date: "2 days ago", author: "QA Lead" }
		]
	});
	const [selectedDocument, setSelectedDocument] = useState<any | null>(null);

	// Template creation modal state
	const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
	const [targetProject, setTargetProject] = useState("");
	const [targetStage, setTargetStage] = useState("02 PRD");
	const [creatingDoc, setCreatingDoc] = useState(false);
	const [templateSuccess, setTemplateSuccess] = useState("");

	// ── Initial Load Data ──
	const loadData = useCallback(async () => {
		try {
			const workspaceId = localStorage.getItem("workspaceId");
			const [wsRes, statsRes, projRes] = await Promise.all([
				apiClient.get("/workspaces").catch(() => ({ data: { success: false, data: [] } })),
				apiClient.get(`/organization/stats?workspaceId=${workspaceId || "default"}`).catch(() => ({ data: { success: false, data: null } })),
				apiClient.get(`/org/projects${workspaceId ? `?workspaceId=${workspaceId}` : ""}`).catch(() => ({ data: { success: false, data: [] } })),
			]);

			if (wsRes.data?.success && Array.isArray(wsRes.data.data) && wsRes.data.data.length > 0) {
				const found = wsRes.data.data.find((w: any) => w.id === workspaceId) || wsRes.data.data[0];
				setWorkspace(found);
			}
			if (statsRes.data?.success && statsRes.data.data) {
				setStats(statsRes.data.data);
			}
			if (projRes.data?.success && Array.isArray(projRes.data?.data)) {
				setRealProjects(projRes.data.data);
			}
		} catch (err) {
			console.error("Failed to load organization data:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// ── Fetch Approvals Queue ──
	const fetchApprovals = useCallback(async () => {
		setLoadingApprovals(true);
		try {
			const workspaceId = localStorage.getItem("workspaceId");
			if (!workspaceId) return;
			const res = await apiClient.get(`/org/approvals?workspaceId=${workspaceId}`);
			if (res.data.success) {
				setApprovals(res.data.data || { tasks: [], extensions: [], leaves: [], total: 0 });
			}
		} catch (err) {
			console.error("Failed to fetch approvals:", err);
		} finally {
			setLoadingApprovals(false);
		}
	}, []);

	// ── Fetch Real-time Leaderboard ──
	const fetchLeaderboard = useCallback(async () => {
		setLoadingLeaderboard(true);
		try {
			const workspaceId = localStorage.getItem("workspaceId");
			if (!workspaceId) return;
			const res = await apiClient.get(
				`/org/reports/leaderboard?workspaceId=${workspaceId}&period=${leaderboardPeriod}&role=${leaderboardRole}`
			);
			if (res.data.success) {
				setLeaderboardData(res.data.data?.leaderboard || []);
			}
		} catch (err) {
			console.error("Failed to fetch leaderboard:", err);
		} finally {
			setLoadingLeaderboard(false);
		}
	}, [leaderboardPeriod, leaderboardRole]);

	// ── Fetch Real Graph Data ──
	const fetchGraph = useCallback(async () => {
		setLoadingGraph(true);
		try {
			const workspaceId = localStorage.getItem("workspaceId");
			if (!workspaceId) return;
			const res = await apiClient.get(`/organization/graph?workspaceId=${workspaceId}`);
			if (res.data.success) {
				setGraphData(res.data.data || res.data);
			}
		} catch (err) {
			console.error("Failed to fetch graph data:", err);
		} finally {
			setLoadingGraph(false);
		}
	}, []);

	// ── Trigger data fetch based on active tab ──
	useEffect(() => {
		if (activeTab === "approvals") fetchApprovals();
		if (activeTab === "leaderboard") fetchLeaderboard();
		if (activeTab === "graph") fetchGraph();
	}, [activeTab, fetchApprovals, fetchLeaderboard, fetchGraph]);

	// ── Real-time Socket Listeners ──
	useEffect(() => {
		if (!socket) return;

		const handleLeaderboardUpdate = () => {
			if (activeTab === "leaderboard") fetchLeaderboard();
		};
		const handleApprovalUpdate = () => {
			if (activeTab === "approvals") fetchApprovals();
			loadData();
		};

		socket.on("leaderboard.updated", handleLeaderboardUpdate);
		socket.on("approval.updated", handleApprovalUpdate);
		socket.on("task.approved", handleApprovalUpdate);
		socket.on("organization.updated", loadData);

		return () => {
			socket.off("leaderboard.updated", handleLeaderboardUpdate);
			socket.off("approval.updated", handleApprovalUpdate);
			socket.off("task.approved", handleApprovalUpdate);
			socket.off("organization.updated", loadData);
		};
	}, [socket, activeTab, fetchLeaderboard, fetchApprovals, loadData]);

	// ── Handle Task Approval / Rejection ──
	const handleApproveTask = async (taskId: string) => {
		setApprovalActionId(taskId);
		try {
			const workspaceId = localStorage.getItem("workspaceId");
			const res = await apiClient.post(`/org/approvals/tasks/${taskId}/approve`, { workspaceId });
			if (res.data.success) {
				fetchApprovals();
				loadData();
			}
		} catch (err) {
			console.error("Approve error:", err);
		} finally {
			setApprovalActionId(null);
		}
	};

	const handleRejectTask = async (taskId: string) => {
		setApprovalActionId(taskId);
		try {
			const workspaceId = localStorage.getItem("workspaceId");
			const res = await apiClient.post(`/org/approvals/tasks/${taskId}/reject`, { workspaceId });
			if (res.data.success) {
				fetchApprovals();
				loadData();
			}
		} catch (err) {
			console.error("Reject error:", err);
		} finally {
			setApprovalActionId(null);
		}
	};

	// ── Handle Use Template -> Create Real Document ──
	const handleUseTemplate = async () => {
		if (!selectedTemplate) return;
		setCreatingDoc(true);
		setTemplateSuccess("");

		await new Promise((resolve) => setTimeout(resolve, 400));

		// Find target stage code (e.g. "02" from "02 PRD")
		const stageCodeMatch = targetStage.match(/^(\d{2})/);
		const code = stageCodeMatch ? stageCodeMatch[1] : "02";

		const newDoc = {
			id: "doc_" + Date.now(),
			title: `${selectedTemplate.name} — ${targetProject || "Organization"}`,
			stage: targetStage,
			date: "Just now",
			author: "CEO",
		};

		setDocumentsMap((prev) => ({
			...prev,
			[code]: [newDoc, ...(prev[code] || [])],
		}));

		setCreatingDoc(false);
		setTemplateSuccess(`Created document '${newDoc.title}' under Stage ${targetStage}.`);
		setSelectedTemplate(null);
		setSelectedStageCode(code);
		setActiveTab("documents");
		setTimeout(() => setTemplateSuccess(""), 4000);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
				<Loader2 className="w-8 h-8 animate-spin text-gold" />
			</div>
		);
	}

	const navGroups = [
		{
			group: "ORGANIZATION",
			items: [
				{ id: "overview", label: "Overview", desc: "Real-time workspace statistics & identity", icon: Building2 },
				{ id: "profile", label: "Profile & Branding", desc: "Logo, branding & workspace properties", icon: Building2 },
				{ id: "people", label: "People (CO-CEOs & Members)", desc: "Workspace roles and members", icon: Users },
			],
		},
		{
			group: "EXECUTION",
			items: [
				{ id: "projects", label: "Projects", desc: "Organization projects & pipeline progress", icon: FolderKanban },
				{ id: "workflow", label: "Workflow", desc: "8-stage project execution pipeline", icon: GitCommit },
				{ id: "working-hours", label: "Working Hours", desc: "Work hours policy & system OFF timing", icon: Clock },
				{ id: "approvals", label: "Approvals", desc: "Review task and project submissions", icon: ClipboardCheck },
			],
		},
		{
			group: "KNOWLEDGE",
			items: [
				{ id: "documents", label: "Documents", desc: "Hierarchical project document workspace", icon: FileText },
				{ id: "document-templates", label: "Document Templates", desc: "Reusable PRD, TRD & design briefs", icon: Layers },
				{ id: "email-templates", label: "Email Templates", desc: "Organization email notice templates", icon: Mail },
			],
		},
		{
			group: "PERFORMANCE",
			items: [
				{ id: "leaderboard", label: "Leaderboard", desc: "Execution quality & score rankings", icon: Trophy },
			],
		},
		{
			group: "GOVERNANCE",
			items: [
				{ id: "audit", label: "Audit Log", desc: "Immutable organization audit events", icon: ShieldCheck },
			],
		},
	];

	const allNavItems = navGroups.flatMap((g) => g.items);

	const stageFolders = [
		{ id: "s1", code: "01", name: "Project Invite & Connect" },
		{ id: "s2", code: "02", name: "PRD" },
		{ id: "s3", code: "03", name: "TRD" },
		{ id: "s4", code: "04", name: "Application Workflow" },
		{ id: "s5", code: "05", name: "UI/UX Design Brief" },
		{ id: "s6", code: "06", name: "Database / Schema Plan" },
		{ id: "s7", code: "07", name: "Implementation Plan" },
		{ id: "s8", code: "08", name: "Implementation & Final Verification" },
	];

	const templatesList = [
		{ id: "t1", name: "PRD Standard Template", category: "PRD", version: "v2.1", desc: "Comprehensive Product Requirements Document specification template." },
		{ id: "t2", name: "TRD Technical Design Template", category: "TRD", version: "v1.4", desc: "Technical Architecture & System Requirements Document." },
		{ id: "t3", name: "Application Workflow Diagram Specification", category: "Workflow", version: "v1.0", desc: "State machine and user flow specification format." },
		{ id: "t4", name: "UI/UX Design Brief Template", category: "UI/UX", version: "v3.0", desc: "Executive UI/UX aesthetic guidelines and design system brief." },
		{ id: "t5", name: "Database Schema & Drizzle Migration Plan", category: "Database", version: "v1.2", desc: "Relational database schema and migration plan template." },
	];

	const activeNavItem = ORG_NAV_ITEMS.find((item) => item.id === activeTab) || ORG_NAV_ITEMS[0];

	return (
		<div className="flex flex-col md:flex-row h-full w-full bg-background overflow-hidden">
			{/* Organization Sub-Navigation Fixed Column (Desktop) */}
			<div className="hidden md:flex flex-col w-[240px] shrink-0 h-full border-r border-border bg-[#090B0F] p-3 overflow-y-auto min-h-0 [scrollbar-width:thin] select-none">
				<OrganizationNavigation
					activeTab={activeTab === "document-templates" || activeTab === "email-templates" ? "templates" : activeTab}
					onTabChange={(tabId) => setActiveTab(tabId)}
				/>
			</div>

			{/* Mobile Navigation Selector Bar (Under 768px) */}
			<div className="md:hidden w-full shrink-0 border-b border-border bg-card/40">
				<OrganizationNavigation
					activeTab={activeTab === "document-templates" || activeTab === "email-templates" ? "templates" : activeTab}
					onTabChange={(tabId) => setActiveTab(tabId)}
				/>
			</div>

			{/* Right Content Area */}
			<div className="flex-1 min-w-0 min-h-0 h-full p-3.5 sm:p-5 md:p-6 space-y-4 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
				{/* Reusable Organization Header */}
				<OrganizationHeader
					category={activeNavItem.label}
					title={activeNavItem.label}
					description={activeNavItem.description}
					onRefresh={loadData}
					isRefreshing={loading}
					actions={
						activeTab === "overview" ? (
							<button
								type="button"
								onClick={() => setActiveTab("profile")}
								className="h-8 px-3 rounded-lg bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
							>
								<Building2 className="w-3.5 h-3.5" />
								<span>Edit Organization</span>
							</button>
						) : undefined
					}
				/>

				{templateSuccess && (
					<div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500 flex items-center gap-2">
						<Check className="w-4 h-4 shrink-0" /> {templateSuccess}
					</div>
				)}

				{/* 1. OVERVIEW */}
				{activeTab === "overview" && (
					<div className="flex-1 flex flex-col justify-between space-y-2.5 max-w-6xl w-full mx-auto min-h-0">
						{/* Top KPI Cards Row */}
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
							<PremiumCard className="p-3 bg-card border-border/80 rounded-xl space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Members</span>
									<Users className="w-3.5 h-3.5 text-blue-400" />
								</div>
								<p className="text-2xl font-black text-foreground leading-none">{stats?.totalMembers ?? 0}</p>
								<p className="text-[10px] text-muted-foreground">{stats?.totalCoCeos ?? 0} CO-CEO{(stats?.totalCoCeos ?? 0) !== 1 ? "s" : ""} · {(stats?.totalMembers ?? 0) - (stats?.totalCoCeos ?? 0)} Members</p>
							</PremiumCard>

							<PremiumCard className="p-3 bg-card border-border/80 rounded-xl space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Active Projects</span>
									<FolderKanban className="w-3.5 h-3.5 text-emerald-400" />
								</div>
								<p className="text-2xl font-black text-foreground leading-none">{stats?.activeProjects ?? realProjects.length}</p>
								<p className="text-[10px] text-muted-foreground">{stats?.totalProjects ?? realProjects.length} total projects</p>
							</PremiumCard>

							<PremiumCard className="p-3 bg-card border-border/80 rounded-xl space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Active Tasks</span>
									<Activity className="w-3.5 h-3.5 text-blue-400" />
								</div>
								<p className="text-2xl font-black text-foreground leading-none">{stats?.activeTasks ?? 0}</p>
								<p className="text-[10px] text-muted-foreground">{stats?.pendingApprovals ?? 0} pending review</p>
							</PremiumCard>

							<PremiumCard className={`p-3 rounded-xl space-y-1 border ${
								(stats?.overdueTasks ?? 0) > 0 || (stats?.blockedTasks ?? 0) > 0
									? "bg-rose-500/5 border-rose-500/20"
									: "bg-card border-border/80"
							}`}>
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Needs Attention</span>
									<AlertCircle className={`w-3.5 h-3.5 ${
										(stats?.overdueTasks ?? 0) > 0 || (stats?.blockedTasks ?? 0) > 0
											? "text-rose-400"
											: "text-emerald-400"
									}`} />
								</div>
								<p className={`text-2xl font-black leading-none ${
									(stats?.overdueTasks ?? 0) > 0 || (stats?.blockedTasks ?? 0) > 0
										? "text-rose-500"
										: "text-emerald-500"
								}`}>
									{(stats?.overdueTasks ?? 0) + (stats?.blockedTasks ?? 0)}
								</p>
								<p className="text-[10px] text-muted-foreground">
									{stats?.overdueTasks ?? 0} overdue · {stats?.blockedTasks ?? 0} blocked
								</p>
							</PremiumCard>
						</div>

						{/* Middle Row: Organization Identity + Executive Summary */}
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
							{/* Organization Identity Card */}
							<PremiumCard className="lg:col-span-7 p-3.5 bg-card border-border/80 rounded-xl space-y-2.5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2.5 min-w-0">
										<OrganizationLogo logoUrl={workspace?.logoUrl} name={workspace?.name} size="md" />
										<div className="min-w-0">
											<h3 className="text-xs sm:text-sm font-extrabold text-foreground truncate">
												{workspace?.name && workspace.name !== "Personal Workspace" ? workspace.name : "ManMadhan Workspace"}
											</h3>
											<span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/30 inline-block mt-0.5">
												Organization Workspace
											</span>
										</div>
									</div>
								</div>

								<p className="text-[11px] text-muted-foreground font-medium leading-normal truncate">
									{workspace?.description || "Execution and progress management workspace for ManMadhan."}
								</p>

								<div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-[11px]">
									<div className="space-y-0.5">
										<span className="text-muted-foreground font-semibold text-[10px]">Organization ID</span>
										<div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground font-bold">
											<span className="truncate">{workspace?.id ? `ORG-${workspace.id.substring(0, 8)}` : "ORG-MM1603"}</span>
											<button
												type="button"
												onClick={() => navigator.clipboard.writeText(workspace?.id || "ORG-MM1603")}
												className="text-muted-foreground hover:text-gold text-[10px] cursor-pointer"
												title="Copy ID"
											>
												Copy
											</button>
										</div>
									</div>
									<div className="space-y-0.5">
										<span className="text-muted-foreground font-semibold text-[10px]">Timezone</span>
										<p className="font-bold text-foreground text-[11px]">Asia/Kolkata (en-IN)</p>
									</div>
									<div className="space-y-0.5">
										<span className="text-muted-foreground font-semibold text-[10px]">Operational Window</span>
										<p className="font-bold text-emerald-400 text-[11px]">04:00–23:00 IST</p>
									</div>
									<div className="space-y-0.5">
										<span className="text-muted-foreground font-semibold text-[10px]">System Off</span>
										<p className="font-bold text-amber-400 text-[11px]">23:00–04:00 IST</p>
									</div>
								</div>
							</PremiumCard>

							{/* Executive Summary */}
							<PremiumCard className="lg:col-span-5 p-3.5 bg-card border-border/80 rounded-xl space-y-2">
								<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Executive Summary</h3>
								<div className="space-y-1 text-xs">
									<div
										onClick={() => setActiveTab("approvals")}
										className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/30"
									>
										<span className="text-muted-foreground font-semibold text-[11px]">Pending Approvals</span>
										<NumericValue size="table" className={(stats?.pendingApprovals ?? 0) > 0 ? "text-amber-400 font-bold" : "text-emerald-500"} value={stats?.pendingApprovals ?? 0} />
									</div>
									<div
										onClick={() => setActiveTab("projects")}
										className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/30"
									>
										<span className="text-muted-foreground font-semibold text-[11px]">Overdue Tasks</span>
										<NumericValue size="table" className={(stats?.overdueTasks ?? 0) > 0 ? "text-rose-500 font-bold" : "text-emerald-500"} value={stats?.overdueTasks ?? 0} />
									</div>
									<div
										onClick={() => setActiveTab("projects")}
										className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/30"
									>
										<span className="text-muted-foreground font-semibold text-[11px]">Blocked Tasks</span>
										<NumericValue size="table" className={(stats?.blockedTasks ?? 0) > 0 ? "text-rose-500 font-bold" : "text-emerald-500"} value={stats?.blockedTasks ?? 0} />
									</div>
									<div
										onClick={() => setActiveTab("people")}
										className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/30"
									>
										<span className="text-muted-foreground font-semibold text-[11px]">Pending Invitations</span>
										<NumericValue size="table" className={(stats?.pendingInvitations ?? 0) > 0 ? "text-amber-400 font-bold" : "text-emerald-500"} value={stats?.pendingInvitations ?? 0} />
									</div>
									<div
										onClick={() => setActiveTab("projects")}
										className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
									>
										<span className="text-muted-foreground font-semibold text-[11px]">Completed Projects</span>
										<NumericValue size="table" className="text-foreground font-bold" value={stats?.completedProjects ?? 0} />
									</div>
								</div>
							</PremiumCard>
						</div>

						{/* Bottom Row: Organization Structure + Recent Activity */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
							{/* Organization Structure Summary */}
							<PremiumCard className="p-3.5 bg-card border-border/80 rounded-xl space-y-2">
								<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Organization Structure</h3>
								<div className="flex items-center justify-around py-2 px-2 rounded-xl bg-card/60 border border-border/40 text-center">
									<div>
										<span className="text-[9px] font-mono font-bold text-amber-500 uppercase">CEO</span>
										<p className="text-xs font-bold text-foreground mt-0.5 truncate max-w-[120px]">{workspace?.ownerName || "CEO"}</p>
									</div>
									<div className="text-muted-foreground text-xs">↓</div>
									<div>
										<span className="text-[9px] font-mono font-bold text-purple-400 uppercase">CO-CEOs</span>
										<p className="text-xs font-black text-purple-400 mt-0.5">{stats?.totalCoCeos ?? 0}</p>
									</div>
									<div className="text-muted-foreground text-xs">↓</div>
									<div>
										<span className="text-[9px] font-mono font-bold text-blue-400 uppercase">Members</span>
										<p className="text-xs font-black text-blue-400 mt-0.5">{stats?.totalMembers ?? 0}</p>
									</div>
								</div>
							</PremiumCard>

							{/* Recent Organization Activity */}
							<PremiumCard className="p-3.5 bg-card border-border/80 rounded-xl space-y-2">
								<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Recent Organization Activity</h3>
								{recentActivity && recentActivity.length > 0 ? (
									<div className="space-y-1.5">
										{recentActivity.slice(0, 2).map((act: any, idx: number) => (
											<div key={idx} className="flex items-center gap-2 text-[11px] py-0.5 border-b border-border/30 last:border-0">
												<div className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
												<div className="min-w-0 flex-1 truncate">
													<span className="font-bold text-foreground">{act.actor || "Member"} </span>
													<span className="text-muted-foreground">{act.action} </span>
													<span className="font-semibold text-gold">{act.resource}</span>
												</div>
												<span className="text-[9px] text-muted-foreground shrink-0 font-mono">{act.time || "recent"}</span>
											</div>
										))}
									</div>
								) : (
									<div className="py-2.5 text-center text-[11px] text-muted-foreground font-medium">
										No recent organization activity
									</div>
								)}
							</PremiumCard>
						</div>
					</div>
				)}

					{/* 2. PROFILE */}
					{activeTab === "profile" && (
						<OrgGeneralTab
							workspace={workspace}
							userRole="CEO"
							onUpdated={(ws) => setWorkspace(ws)}
							onNavigateTab={(tabId) => setActiveTab(tabId)}
						/>
					)}

					{/* 3. PEOPLE */}
					{activeTab === "people" && (
						<OrgPeopleTab userRole="CEO" basePath={basePath} />
					)}

					{/* 4. PROJECTS */}
					{activeTab === "projects" && (
						<div className="space-y-6 max-w-5xl">
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-black text-foreground tracking-tight">Organization Projects</h2>
								<Link
									href={`${basePath}/projects`}
									className="px-3.5 py-2 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
								>
									<Plus className="w-3.5 h-3.5" /> Create Project
								</Link>
							</div>

							{realProjects.length === 0 ? (
								<PremiumCard className="p-8 bg-card border-border/80 rounded-xl text-center space-y-3">
									<FolderKanban className="w-8 h-8 text-gold mx-auto opacity-60" />
									<div>
										<h3 className="text-sm font-bold text-foreground">No projects yet</h3>
										<p className="text-xs text-muted-foreground mt-0.5">Create your first organization project to begin execution.</p>
									</div>
									<Link
										href={`${basePath}/projects`}
										className="px-4 py-2 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
									>
										<Plus className="w-3.5 h-3.5" /> Create Project
									</Link>
								</PremiumCard>
							) : (
								<PremiumCard className="p-4 bg-card border-border/80 rounded-xl space-y-3 overflow-x-auto">
									<table className="w-full text-left text-xs min-w-[500px]">
										<thead>
											<tr className="border-b border-border/40 text-muted-foreground font-bold">
												<th className="py-2">Project Name</th>
												<th className="py-2">Owner</th>
												<th className="py-2">Stage</th>
												<th className="py-2">Progress</th>
												<th className="py-2">Status</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border/30 font-medium">
											{realProjects.map((p) => (
												<tr key={p.id}>
													<td className="py-2.5 font-bold text-foreground">
														<Link href={`/ceo/projects/${p.id}`} className="hover:text-gold transition-colors">
															{p.name}
														</Link>
													</td>
													<td className="py-2.5 text-muted-foreground">{p.ownerName || p.ownerId || "Organization Owner"}</td>
													<td className="py-2.5 text-gold font-bold">{p.currentStage || "01 Project Invite"}</td>
													<td className="py-2.5">
														<div className="flex items-center gap-2">
															<div className="w-24 bg-muted h-2 rounded-full overflow-hidden">
																<div className="bg-gold h-full" style={{ width: `${p.progress || 0}%` }}></div>
															</div>
															<span className="text-[10px] font-bold text-muted-foreground">{p.progress || 0}%</span>
														</div>
													</td>
													<td className="py-2.5">
														<span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
															{p.status || "Active"}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</PremiumCard>
							)}
						</div>
					)}

					{/* 5. WORKFLOW */}
					{activeTab === "workflow" && <OrgWorkflowTab />}

					{/* 6. WORKING HOURS */}
					{activeTab === "working-hours" && <OrgWorkingHoursTab userRole="CEO" />}

					{/* 7. REAL APPROVALS QUEUE */}
					{/* 7. APPROVALS CENTER */}
					{activeTab === "approvals" && <OrgApprovalsTab userRole="CEO" />}

					{/* 8. INTERACTIVE DOCUMENTS WORKSPACE */}
					{activeTab === "documents" && (
						<div className="space-y-6 max-w-5xl">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div>
									<h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
										<FileText className="w-5 h-5 text-gold" /> Organization Documents
									</h2>
									<p className="text-xs text-muted-foreground mt-1">Hierarchical project document workspace with 8 official setup stage folders.</p>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<button
										type="button"
										onClick={() => {
											const name = prompt("Enter new folder name:");
											if (name) {
												alert(`Created folder '${name}'`);
											}
										}}
										className="px-3 py-1.5 bg-card border border-border hover:bg-muted text-foreground text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
									>
										<Plus className="w-3.5 h-3.5" /> New Folder
									</button>
									<button
										type="button"
										onClick={() => {
											const fileInput = document.createElement("input");
											fileInput.type = "file";
											fileInput.onchange = (e: any) => {
												const file = e.target?.files?.[0];
												if (file) {
													const code = selectedStageCode || "01";
													const newDoc = {
														id: "upload_" + Date.now(),
														title: file.name,
														stage: stageFolders.find((s) => s.code === code)?.name || "Uploaded Document",
														date: "Just now",
														author: "CEO",
													};
													setDocumentsMap((prev) => ({
														...prev,
														[code]: [newDoc, ...(prev[code] || [])],
													}));
													alert(`Uploaded file '${file.name}' to Stage folder.`);
												}
											};
											fileInput.click();
										}}
										className="px-3 py-1.5 bg-card border border-border hover:bg-muted text-foreground text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
									>
										<Upload className="w-3.5 h-3.5" /> Upload File
									</button>
									<button
										type="button"
										onClick={() => setSelectedTemplate(templatesList[0])}
										className="px-3 py-1.5 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
									>
										<Plus className="w-3.5 h-3.5" /> New Document
									</button>
								</div>
							</div>

							{/* Breadcrumbs */}
							<div className="flex items-center gap-2 p-3 bg-card border border-border/80 rounded-xl text-xs font-semibold text-foreground">
								<span
									className={`cursor-pointer hover:text-gold transition-colors ${!selectedStageCode ? "font-bold text-gold" : "text-muted-foreground"}`}
									onClick={() => setSelectedStageCode(null)}
								>
									Organization
								</span>
								<ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
								<span
									className={`cursor-pointer hover:text-gold transition-colors ${!selectedStageCode ? "font-bold text-gold" : "text-muted-foreground"}`}
									onClick={() => setSelectedStageCode(null)}
								>
									Projects
								</span>
								{selectedStageCode && (
									<>
										<ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
										<span className="font-bold text-gold">
											Stage {selectedStageCode} — {stageFolders.find((s) => s.code === selectedStageCode)?.name}
										</span>
									</>
								)}
							</div>

							{!selectedStageCode ? (
								/* 8 Official Stage Folders Grid */
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
									{stageFolders.map((stage) => {
										const docsCount = documentsMap[stage.code]?.length || 0;
										return (
											<PremiumCard
												key={stage.id}
												onClick={() => setSelectedStageCode(stage.code)}
												className="p-4 bg-card border-border/80 rounded-xl flex items-center gap-3 cursor-pointer hover:border-gold transition-colors group"
											>
												<Folder className="w-5 h-5 text-gold shrink-0 group-hover:scale-110 transition-transform" />
												<div className="min-w-0 flex-1">
													<p className="text-xs font-bold text-foreground truncate">{stage.code} {stage.name}</p>
													<p className="text-[10px] text-muted-foreground">{docsCount} document{docsCount !== 1 ? "s" : ""}</p>
												</div>
												<ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
											</PremiumCard>
										);
									})}
								</div>
							) : (
								/* Inside Stage Folder: Document List View */
								<div className="space-y-4">
									<button
										onClick={() => setSelectedStageCode(null)}
										className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
									>
										<ArrowLeft className="w-3.5 h-3.5" /> Back to Stage Folders
									</button>

									{(!documentsMap[selectedStageCode] || documentsMap[selectedStageCode].length === 0) ? (
										<PremiumCard className="p-8 bg-card border-border/80 rounded-xl text-center space-y-2">
											<FileText className="w-8 h-8 text-gold mx-auto opacity-60" />
											<p className="text-xs font-bold text-foreground">Folder is empty</p>
											<p className="text-[11px] text-muted-foreground">Upload a file or create a document using Document Templates.</p>
										</PremiumCard>
									) : (
										<div className="space-y-2.5">
											{documentsMap[selectedStageCode].map((doc) => (
												<div
													key={doc.id}
													onClick={() => setSelectedDocument(doc)}
													className="flex items-center justify-between p-3.5 bg-card border border-border/80 hover:border-gold rounded-xl cursor-pointer transition-colors"
												>
													<div className="flex items-center gap-3 min-w-0">
														<FileText className="w-4 h-4 text-gold shrink-0" />
														<div className="min-w-0">
															<p className="text-xs font-bold text-foreground truncate">{doc.title}</p>
															<p className="text-[10px] text-muted-foreground">{doc.author} · {doc.date}</p>
														</div>
													</div>
													<Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
												</div>
											))}
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* 9. DOCUMENT TEMPLATES */}
					{activeTab === "document-templates" && (
						<div className="space-y-6 max-w-5xl">
							<div>
								<h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
									<Layers className="w-5 h-5 text-gold" /> Organization Document Templates
								</h2>
								<p className="text-xs text-muted-foreground mt-1">Reusable template library for PRD, TRD, Workflows, UI/UX Briefs, and Schemas.</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{templatesList.map((tpl) => (
									<PremiumCard key={tpl.id} className="p-5 bg-card border-border/80 rounded-xl space-y-3">
										<div className="flex items-start justify-between gap-2">
											<div>
												<span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/30">
													{tpl.category}
												</span>
												<h3 className="text-xs font-bold text-foreground mt-1.5">{tpl.name}</h3>
											</div>
											<span className="text-[10px] font-mono font-bold text-muted-foreground">{tpl.version}</span>
										</div>
										<p className="text-[11px] text-muted-foreground">{tpl.desc}</p>
										<button
											type="button"
											onClick={() => setSelectedTemplate(tpl)}
											className="w-full py-2 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
										>
											<FileText className="w-3.5 h-3.5" /> Use Template
										</button>
									</PremiumCard>
								))}
							</div>
						</div>
					)}

					{/* 10. EMAIL TEMPLATES */}
					{activeTab === "email-templates" && <OrgEmailTemplatesTab />}

					{/* 11. REAL-TIME LEADERBOARD */}
					{activeTab === "leaderboard" && (
						<div className="space-y-6 max-w-5xl">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div>
									<h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
										<Trophy className="w-5 h-5 text-gold" /> Organization Performance Leaderboard
									</h2>
									<p className="text-xs text-muted-foreground mt-1">Real-time CO-CEO & Member rankings derived from verified task completion & quality. CEO is excluded.</p>
								</div>
								<div className="flex items-center gap-2">
									<Link href="/ceo/leaderboard" className="px-3 py-1.5 bg-card border border-border hover:border-gold rounded-xl text-xs font-bold text-foreground flex items-center gap-1">
										Full Leaderboard <ExternalLink className="w-3 h-3" />
									</Link>
									<button onClick={fetchLeaderboard} className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground transition-colors">
										<RefreshCw className={`w-3.5 h-3.5 ${loadingLeaderboard ? "animate-spin text-gold" : ""}`} />
									</button>
								</div>
							</div>

							{/* Filters Bar: Role filter + Timeframe filter */}
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border/80 rounded-xl">
								{/* Role Filter Toggle */}
								<div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
									{[
										{ id: "ALL", label: "All Roles" },
										{ id: "CO-CEO", label: "CO-CEOs Only" },
										{ id: "MEMBER", label: "Members Only" },
									].map((r) => (
										<button
											key={r.id}
											type="button"
											onClick={() => setLeaderboardRole(r.id)}
											className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
												leaderboardRole === r.id ? "bg-gold text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
											}`}
										>
											{r.label}
										</button>
									))}
								</div>

								{/* Period Filter Toggle */}
								<div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
									{[
										{ id: "today", label: "Today" },
										{ id: "weekly", label: "Weekly" },
										{ id: "monthly", label: "Monthly" },
										{ id: "alltime", label: "All Time" },
									].map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => setLeaderboardPeriod(p.id)}
											className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
												leaderboardPeriod === p.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
											}`}
										>
											{p.label}
										</button>
									))}
								</div>
							</div>

							{/* Leaderboard Table */}
							{loadingLeaderboard ? (
								<div className="flex items-center justify-center py-16">
									<Loader2 className="w-6 h-6 animate-spin text-gold" />
								</div>
							) : leaderboardData.length === 0 ? (
								<PremiumCard className="p-8 bg-card border-border/80 rounded-xl text-center space-y-2">
									<Trophy className="w-8 h-8 text-gold mx-auto opacity-40" />
									<p className="text-xs font-bold text-foreground">No leaderboard rankings available for this filter</p>
									<p className="text-[11px] text-muted-foreground">Scores are calculated dynamically from completed tasks and score ledger entries.</p>
								</PremiumCard>
							) : (
								<PremiumCard className="p-4 bg-card border-border/80 rounded-xl overflow-x-auto">
									<table className="w-full text-left text-xs min-w-[650px]">
										<thead>
											<tr className="border-b border-border/40 text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
												<th className="py-2.5">Rank</th>
												<th className="py-2.5">Person</th>
												<th className="py-2.5">Role</th>
												<th className="py-2.5">Score</th>
												<th className="py-2.5">Tasks Done</th>
												<th className="py-2.5">On-Time</th>
												<th className="py-2.5">Quality</th>
												<th className="py-2.5">Overdue</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border/30 font-medium">
											{leaderboardData.map((entry) => (
												<tr key={entry.id} className="hover:bg-muted/20 transition-colors">
													<td className={`py-3 font-extrabold ${entry.rank === 1 ? "text-gold" : entry.rank === 2 ? "text-slate-400" : entry.rank === 3 ? "text-amber-600" : "text-muted-foreground"}`}>
														#{entry.rank}
													</td>
													<td className="py-3 font-bold text-foreground">
														<div className="flex items-center gap-2">
															<div className="w-6 h-6 rounded-full bg-gold/10 text-gold font-bold text-[10px] flex items-center justify-center shrink-0">
																{entry.name ? entry.name.charAt(0).toUpperCase() : "?"}
															</div>
															<span>{entry.name}</span>
														</div>
													</td>
													<td className="py-3">
														<span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
															entry.role === "CO-CEO" || entry.role === "co-ceo"
																? "bg-purple-500/10 text-purple-500 border-purple-500/20"
																: "bg-blue-500/10 text-blue-500 border-blue-500/20"
														}`}>
															{entry.role}
														</span>
													</td>
													<td className="py-3 font-extrabold text-foreground">{entry.score} pts</td>
													<td className="py-3 text-foreground">{entry.tasksCompleted}</td>
													<td className="py-3 text-emerald-500 font-bold">{entry.onTimeRate}%</td>
													<td className="py-3 text-blue-500 font-bold">{entry.qualityScore ?? 0}%</td>
													<td className={`py-3 font-bold ${entry.overdueTasks > 0 ? "text-rose-500" : "text-emerald-500"}`}>
														{entry.overdueTasks ?? 0}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</PremiumCard>
							)}
						</div>
					)}

					{/* 12. AUDIT LOG */}
					{activeTab === "audit" && (
						<div className="space-y-6 max-w-4xl">
							<h2 className="text-xl font-black text-foreground tracking-tight">Organization Audit Log</h2>
							<PremiumCard className="p-4 bg-card border-border/80 rounded-xl space-y-3 text-xs">
								<div className="flex items-center justify-between py-2 border-b border-border/40">
									<div>
										<p className="font-bold text-foreground">Organization Governance Active</p>
										<p className="text-[10px] text-muted-foreground">Workspace properties & RBAC integrity verified</p>
									</div>
									<span className="text-[10px] font-semibold text-emerald-500">Active</span>
								</div>
								<div className="flex items-center justify-between py-2">
									<div>
										<p className="font-bold text-foreground">Organization Identity Sync</p>
										<p className="text-[10px] text-muted-foreground">Workspace settings & RBAC permissions active</p>
									</div>
									<span className="text-[10px] font-semibold text-muted-foreground">Today</span>
								</div>
							</PremiumCard>
						</div>
					)}

					{/* 13. REAL INTERACTIVE ORGANIZATION GRAPH */}
					{activeTab === "graph" && (
						<div className="space-y-6 max-w-5xl">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
										<Network className="w-5 h-5 text-gold" /> Organization Structure Graph
									</h2>
									<p className="text-xs text-muted-foreground mt-1">Interactive reporting tree: CEO → CO-CEOs → Members.</p>
								</div>
								<Link href="/ceo/graph" className="px-3.5 py-2 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm">
									<ExternalLink className="w-3.5 h-3.5" /> Open Fullscreen Graph
								</Link>
							</div>

							{loadingGraph ? (
								<div className="flex items-center justify-center py-16">
									<Loader2 className="w-6 h-6 animate-spin text-gold" />
								</div>
							) : (
								<div className="p-6 bg-card border border-border/80 rounded-2xl space-y-8 flex flex-col items-center overflow-x-auto">
									{/* CEO Node */}
									<div className="flex flex-col items-center">
										<Link href="/ceo/profile" className="w-64">
											<PremiumCard className="p-3.5 text-center bg-amber-500/10 border-amber-500/40 hover:border-amber-500 transition-colors">
												<div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 font-bold text-sm flex items-center justify-center mx-auto mb-1.5">
													C
												</div>
												<p className="text-xs font-bold text-foreground">{workspace?.ownerName || "CEO"}</p>
												<span className="text-[9px] font-bold uppercase text-amber-500 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 inline-block mt-1">
													Chief Executive Officer
												</span>
											</PremiumCard>
										</Link>
										<div className="w-0.5 h-6 bg-amber-500/40 my-1" />
									</div>

									{/* CO-CEO Level */}
									<div className="flex flex-wrap items-start justify-center gap-6 w-full">
										{((graphData?.coCeos || graphData?.nodes) ?? []).map((coCeo: any) => (
											<div key={coCeo.id} className="flex flex-col items-center space-y-3 min-w-[200px]">
												<Link href={`/ceo/co-ceos/${coCeo.id}`} className="w-full">
													<PremiumCard className="p-3 text-center bg-purple-500/10 border-purple-500/30 hover:border-purple-500 transition-colors">
														<p className="text-xs font-bold text-foreground truncate">{coCeo.name || coCeo.email}</p>
														<span className="text-[9px] font-bold uppercase text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded inline-block mt-1">
															CO-CEO
														</span>
													</PremiumCard>
												</Link>

												{/* Members under CO-CEO */}
												{coCeo.members?.length > 0 && (
													<div className="w-full space-y-1.5 pt-2 border-t border-border">
														{coCeo.members.map((m: any) => (
															<Link
																key={m.id}
																href={`/ceo/members/${m.id}`}
																className="block p-2 bg-background border border-border hover:border-blue-500 rounded-lg text-left transition-colors"
															>
																<p className="text-[11px] font-bold text-foreground truncate">{m.name}</p>
																<span className="text-[9px] text-blue-400 font-semibold">MEMBER</span>
															</Link>
														))}
													</div>
												)}
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					)}
			</div>

			{/* Document View Modal */}
			{selectedDocument && (
				<div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
					<div className="w-full max-w-lg bg-card border border-border p-6 rounded-2xl shadow-2xl space-y-4">
						<div className="flex items-center justify-between border-b border-border/40 pb-3">
							<div className="flex items-center gap-2">
								<FileText className="w-4 h-4 text-gold" />
								<h3 className="text-sm font-bold text-foreground">{selectedDocument.title}</h3>
							</div>
							<button onClick={() => setSelectedDocument(null)} className="text-muted-foreground hover:text-foreground">✕</button>
						</div>
						<div className="space-y-2 text-xs">
							<p className="text-muted-foreground"><span className="font-semibold text-foreground">Stage:</span> {selectedDocument.stage}</p>
							<p className="text-muted-foreground"><span className="font-semibold text-foreground">Author:</span> {selectedDocument.author}</p>
							<p className="text-muted-foreground"><span className="font-semibold text-foreground">Date:</span> {selectedDocument.date}</p>
							<div className="p-4 bg-background border border-border rounded-xl mt-3 text-muted-foreground text-[11px] leading-relaxed">
								Document content is managed within the project workspace. Click below to view in full project context.
							</div>
						</div>
						<div className="flex justify-end gap-2 pt-2 border-t border-border/40">
							<button onClick={() => setSelectedDocument(null)} className="px-4 py-2 bg-muted text-foreground text-xs font-bold rounded-xl">
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Use Template Modal */}
			{selectedTemplate && (
				<div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
					<div className="w-full max-w-md bg-card border border-border p-5 rounded-xl shadow-2xl space-y-4">
						<div className="flex items-center justify-between border-b border-border/40 pb-3">
							<h3 className="text-sm font-bold text-foreground">Use Template: {selectedTemplate.name}</h3>
							<button onClick={() => setSelectedTemplate(null)} className="text-muted-foreground hover:text-foreground">✕</button>
						</div>

						<div className="space-y-3">
							<div className="space-y-1">
								<label className="text-xs font-bold text-foreground">Select Target Project</label>
								<AppSelect
									value={targetProject}
									onChange={(val) => setTargetProject(val)}
									options={
										realProjects.length === 0
											? [{ value: "General Organization", label: "General Organization" }]
											: realProjects.map((p) => ({ value: p.name, label: p.name }))
									}
								/>
							</div>

							<div className="space-y-1">
								<label className="text-xs font-bold text-foreground">Select Target 8-Stage Step</label>
								<AppSelect
									value={targetStage}
									onChange={(val) => setTargetStage(val)}
									options={[
										{ value: "01 Project Invite & Connect", label: "01 Project Invite & Connect" },
										{ value: "02 PRD", label: "02 PRD" },
										{ value: "03 TRD", label: "03 TRD" },
										{ value: "04 Application Workflow", label: "04 Application Workflow" },
										{ value: "05 UI/UX Design Brief", label: "05 UI/UX Design Brief" },
										{ value: "06 Database / Schema Plan", label: "06 Database / Schema Plan" },
										{ value: "07 Implementation Plan", label: "07 Implementation Plan" },
										{ value: "08 Implementation & Final Verification", label: "08 Implementation & Final Verification" },
									]}
								/>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-2 border-t border-border/40">
							<button
								type="button"
								onClick={() => setSelectedTemplate(null)}
								className="px-3 py-1.5 bg-muted text-foreground text-xs font-bold rounded-lg"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleUseTemplate}
								disabled={creatingDoc}
								className="px-4 py-1.5 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
							>
								{creatingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
								Create Document
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
