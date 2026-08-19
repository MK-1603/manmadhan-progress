"use client";

import { useState, useEffect, useCallback } from "react";
import {
	CheckCircle2, Clock, AlertTriangle, ShieldCheck, XCircle, RefreshCw,
	Search, Filter, User, Users, FolderKanban, CheckSquare, ChevronRight,
	Calendar, FileText, ArrowRight, X, AlertCircle, Info, MessageSquare,
	Shield, Award, History, Layers, Check, FileCheck
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { AppSelect, AppSelectOption } from "@/components/ui/app-select";
import apiClient from "@/lib/api-client";

interface OrgApprovalsTabProps {
	userRole: string;
}

const TYPE_OPTIONS: AppSelectOption[] = [
	{ value: "", label: "All Types" },
	{ value: "TASK_APPROVAL", label: "Task Approval", sublabel: "Work submissions & reviews" },
	{ value: "DEADLINE_CHANGE", label: "Deadline Change", sublabel: "Extension requests" },
	{ value: "LEAVE_REQUEST", label: "Leave Request", sublabel: "Time off applications" },
	{ value: "PROJECT_ASSIGNMENT", label: "Project Request", sublabel: "Assignments & creation" },
	{ value: "DOCUMENT_REVIEW", label: "Document Review", sublabel: "Milestone documentation" },
];

const PRIORITY_OPTIONS: AppSelectOption[] = [
	{ value: "", label: "All Priorities" },
	{ value: "Urgent", label: "Urgent", color: "bg-rose-500" },
	{ value: "High", label: "High", color: "bg-amber-500" },
	{ value: "Medium", label: "Medium", color: "bg-blue-500" },
	{ value: "Low", label: "Low", color: "bg-emerald-500" },
];

export function OrgApprovalsTab({ userRole }: OrgApprovalsTabProps) {
	const isCEO = userRole === "CEO" || userRole === "SYSTEM_OWNER";
	const isLeadership = isCEO || userRole === "CO-CEO" || userRole === "ADMIN";

	// Data & State
	const [loading, setLoading] = useState(true);
	const [requests, setRequests] = useState<any[]>([]);
	const [kpi, setKpi] = useState<any>({
		pendingCount: 0,
		urgentCount: 0,
		dueTodayCount: 0,
		approvedTodayCount: 0,
		avgReviewTime: "0m",
	});

	// Tabs & Filters
	const [activeTab, setActiveTab] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedType, setSelectedType] = useState("");
	const [selectedStatus, setSelectedStatus] = useState("");
	const [selectedPriority, setSelectedPriority] = useState("");

	// Drawer & Decision Modals
	const [selectedRequest, setSelectedRequest] = useState<any>(null);
	const [detailData, setDetailData] = useState<any>(null);
	const [loadingDetail, setLoadingDetail] = useState(false);

	const [showDecisionModal, setShowDecisionModal] = useState<"APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | null>(null);
	const [decisionReason, setDecisionReason] = useState("");
	const [submittingDecision, setSubmittingDecision] = useState(false);

	const [actionSuccess, setActionSuccess] = useState("");
	const [actionError, setActionError] = useState("");

	// Load Queue Data
	const loadApprovalsData = useCallback(async () => {
		setLoading(true);
		setActionError("");
		try {
			const queryParams = new URLSearchParams();
			if (activeTab) queryParams.set("tab", activeTab);
			if (searchQuery) queryParams.set("search", searchQuery);
			if (selectedType) queryParams.set("requestType", selectedType);
			if (selectedStatus) queryParams.set("status", selectedStatus);
			if (selectedPriority) queryParams.set("priority", selectedPriority);

			const res = await apiClient.get(`/org/approvals?${queryParams.toString()}`);
			if (res.data?.success) {
				setRequests(res.data.data.requests || []);
				setKpi(res.data.data.kpi || {});
			}
		} catch (e: any) {
			console.error("Failed to load approvals:", e);
			setActionError(e.response?.data?.error || "Failed to load approval center.");
		} finally {
			setLoading(false);
		}
	}, [activeTab, searchQuery, selectedType, selectedStatus, selectedPriority]);

	useEffect(() => {
		loadApprovalsData();
	}, [loadApprovalsData]);

	// Open Detail Review Drawer
	const handleOpenReview = async (reqItem: any) => {
		setSelectedRequest(reqItem);
		setLoadingDetail(true);
		try {
			await apiClient.post(`/org/approvals/${reqItem.id}/review`);
			const res = await apiClient.get(`/org/approvals/${reqItem.id}`);
			if (res.data?.success) {
				setDetailData(res.data.data);
			}
		} catch (e: any) {
			console.error("Failed to load request detail:", e);
		} finally {
			setLoadingDetail(false);
		}
	};

	// Execute Decision
	const handleExecuteDecision = async () => {
		if (!showDecisionModal || !selectedRequest) return;

		if ((showDecisionModal === "CHANGES_REQUESTED" || showDecisionModal === "REJECTED") && !decisionReason.trim()) {
			setActionError("A mandatory justification reason is required for requesting changes or rejecting.");
			return;
		}

		setSubmittingDecision(true);
		setActionError("");
		try {
			const res = await apiClient.post(`/org/approvals/${selectedRequest.id}/decision`, {
				decision: showDecisionModal,
				reason: decisionReason,
				comment: decisionReason,
			});

			if (res.data?.success) {
				setActionSuccess(`✓ Request ${showDecisionModal.toLowerCase().replace("_", " ")} successfully.`);
				setShowDecisionModal(null);
				setSelectedRequest(null);
				setDecisionReason("");
				setTimeout(() => setActionSuccess(""), 4000);
				await loadApprovalsData();
			}
		} catch (e: any) {
			console.error("Decision error:", e);
			setActionError(e.response?.data?.error || "Failed to execute decision.");
		} finally {
			setSubmittingDecision(false);
		}
	};

	return (
		<div className="space-y-3.5 max-w-5xl w-full mx-auto pb-2 font-sans">
			{/* Action Notifications */}
			{actionSuccess && (
				<div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
					<CheckCircle2 className="w-4 h-4 shrink-0" /> {actionSuccess}
				</div>
			)}
			{actionError && (
				<div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
					<div className="flex items-center gap-2">
						<AlertTriangle className="w-4 h-4 shrink-0" /> {actionError}
					</div>
					<button type="button" onClick={() => setActionError("")} className="text-rose-400 hover:text-white">
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			)}

			{/* KPI Summary Row - Responsive Grid */}
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5">
				<PremiumCard className="p-2.5 bg-[#0F1218] border-white/10 rounded-xl space-y-0.5">
					<span className="text-[9px] sm:text-[9.5px] font-mono text-[#667085] uppercase tracking-wider block font-bold truncate">Pending Review</span>
					<span className="text-base sm:text-lg font-extrabold text-[#F4F7F5] font-mono">{kpi.pendingCount ?? 0}</span>
				</PremiumCard>

				<PremiumCard className="p-2.5 bg-[#0F1218] border-amber-500/20 rounded-xl space-y-0.5">
					<span className="text-[9px] sm:text-[9.5px] font-mono text-amber-400 uppercase tracking-wider block font-bold truncate">Urgent / High</span>
					<span className="text-base sm:text-lg font-extrabold text-amber-400 font-mono">{kpi.urgentCount ?? 0}</span>
				</PremiumCard>

				<PremiumCard className="p-2.5 bg-[#0F1218] border-blue-500/20 rounded-xl space-y-0.5">
					<span className="text-[9px] sm:text-[9.5px] font-mono text-blue-400 uppercase tracking-wider block font-bold truncate">Due Today</span>
					<span className="text-base sm:text-lg font-extrabold text-blue-400 font-mono">{kpi.dueTodayCount ?? 0}</span>
				</PremiumCard>

				<PremiumCard className="p-2.5 bg-[#0F1218] border-emerald-500/20 rounded-xl space-y-0.5">
					<span className="text-[9px] sm:text-[9.5px] font-mono text-emerald-400 uppercase tracking-wider block font-bold truncate">Approved Today</span>
					<span className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono">{kpi.approvedTodayCount ?? 0}</span>
				</PremiumCard>

				<PremiumCard className="p-2.5 bg-[#0F1218] border-purple-500/20 rounded-xl space-y-0.5 col-span-2 sm:col-span-1">
					<span className="text-[9px] sm:text-[9.5px] font-mono text-purple-400 uppercase tracking-wider block font-bold truncate">Avg Review Time</span>
					<span className="text-base sm:text-lg font-extrabold text-purple-400 font-mono">{kpi.avgReviewTime || "0m"}</span>
				</PremiumCard>
			</div>

			{/* Sub-View Navigation Tabs - Touch Scrollable on Mobile */}
			<div className="flex items-center justify-between gap-2 p-1 rounded-xl bg-[#0F1218] border border-white/10">
				<div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth w-full sm:w-auto">
					{[
						{ id: "all", label: "All Requests" },
						{ id: "my_approvals", label: "My Approvals" },
						{ id: "task_reviews", label: "Task Reviews" },
						{ id: "deadline", label: "Deadline Requests" },
						{ id: "leave", label: "Leave Requests" },
						{ id: "projects", label: "Project Approvals" },
						{ id: "history", label: "Decision History" },
					].map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => setActiveTab(t.id)}
							className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
								activeTab === t.id
									? "bg-[#141820] text-gold border border-gold/30 shadow-xs"
									: "text-[#9AA4B2] hover:text-[#F4F7F5]"
							}`}
						>
							{t.label}
						</button>
					))}
				</div>

				<button
					type="button"
					onClick={loadApprovalsData}
					disabled={loading}
					className="p-1.5 rounded-lg bg-[#0B0E13] border border-white/10 text-[#9AA4B2] hover:text-[#F4F7F5] transition-colors shrink-0"
					title="Refresh queue"
				>
					<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-gold" : ""}`} />
				</button>
			</div>

			{/* Filter & Search Bar - Responsive Stacking & Custom AppSelect Dropdowns */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0F1218] p-2.5 rounded-xl border border-white/10">
				<div className="relative flex-1 w-full sm:max-w-xs">
					<Search className="w-3.5 h-3.5 text-[#667085] absolute left-3 top-2.5 z-10" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search approvals by title, requester..."
						className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#0B0E13] border border-white/10 text-xs text-[#F4F7F5] placeholder:text-[#667085] focus:outline-none focus:border-gold"
					/>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto">
					<div className="w-1/2 sm:w-40">
						<AppSelect
							value={selectedType}
							onChange={(val) => setSelectedType(val)}
							options={TYPE_OPTIONS}
							placeholder="All Types"
							triggerClassName="h-8 text-xs bg-[#0B0E13] border-white/10"
						/>
					</div>

					<div className="w-1/2 sm:w-36">
						<AppSelect
							value={selectedPriority}
							onChange={(val) => setSelectedPriority(val)}
							options={PRIORITY_OPTIONS}
							placeholder="All Priorities"
							triggerClassName="h-8 text-xs bg-[#0B0E13] border-white/10"
						/>
					</div>

					{(searchQuery || selectedType || selectedPriority) && (
						<button
							type="button"
							onClick={() => { setSearchQuery(""); setSelectedType(""); setSelectedPriority(""); }}
							className="px-2 py-1 text-xs text-rose-400 hover:text-white font-bold cursor-pointer shrink-0"
						>
							Clear
						</button>
					)}
				</div>
			</div>

			{/* Approval Requests Queue List */}
			<div className="space-y-2.5">
				{requests.length > 0 ? (
					requests.map((reqItem) => {
						const isPending = ["PENDING", "UNDER_REVIEW"].includes(reqItem.status);

						return (
							<PremiumCard
								key={reqItem.id}
								className={`p-3.5 bg-[#0F1218] border-white/10 rounded-xl space-y-2 transition-all hover:border-gold/30 ${
									reqItem.status === "UNDER_REVIEW" ? "border-gold/40" : ""
								}`}
							>
								<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
									<div className="space-y-1 max-w-2xl">
										<div className="flex items-center gap-1.5 flex-wrap">
											<span
												className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
													reqItem.requestType === "TASK_APPROVAL"
														? "bg-blue-500/10 text-blue-400 border-blue-500/20"
														: reqItem.requestType === "DEADLINE_CHANGE"
														? "bg-purple-500/10 text-purple-400 border-purple-500/20"
														: reqItem.requestType === "LEAVE_REQUEST"
														? "bg-amber-500/10 text-amber-400 border-amber-500/20"
														: "bg-gold/10 text-gold border-gold/20"
												}`}
											>
												{reqItem.requestType?.replace("_", " ")}
											</span>

											<span
												className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
													reqItem.priority === "Urgent" || reqItem.priority === "High"
														? "bg-rose-500/10 text-rose-400 border-rose-500/20"
														: "bg-[#0B0E13] text-[#9AA4B2] border-white/10"
												}`}
											>
												{reqItem.priority || "Medium"}
											</span>

											<span className="text-[10px] text-[#667085] font-mono">
												ID: {reqItem.id.substring(0, 12)}
											</span>
										</div>

										<h3 className="text-xs font-extrabold text-[#F4F7F5]">{reqItem.title}</h3>
										{reqItem.description && (
											<p className="text-[11px] text-[#9AA4B2] line-clamp-2 leading-normal">{reqItem.description}</p>
										)}

										{/* Responsibility Chain Display */}
										<div className="pt-1.5 flex items-center gap-1.5 text-[9.5px] sm:text-[10px] text-[#9AA4B2] font-mono flex-wrap border-t border-white/5">
											<span>Requester: <strong className="text-white">{reqItem.requesterName}</strong></span>
											<span>→</span>
											<span>Responsible: <strong className="text-white">{reqItem.responsibleName}</strong></span>
											<span>→</span>
											<span>Accountable: <strong className="text-white">{reqItem.accountableName}</strong></span>
											<span>→</span>
											<span>Approver: <strong className="text-gold font-bold">{reqItem.approverName}</strong></span>
										</div>
									</div>

									<div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
										<span
											className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
												reqItem.status === "APPROVED"
													? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
													: reqItem.status === "REJECTED"
													? "bg-rose-500/10 text-rose-400 border-rose-500/20"
													: reqItem.status === "CHANGES_REQUESTED"
													? "bg-amber-500/10 text-amber-400 border-amber-500/20"
													: "bg-gold/10 text-gold border-gold/20"
											}`}
										>
											{reqItem.status}
										</span>

										<button
											type="button"
											onClick={() => handleOpenReview(reqItem)}
											className="h-7 px-3 rounded-lg bg-gold hover:bg-gold/90 text-black text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
										>
											<span>{isPending ? "Review" : "View Details"}</span>
											<ChevronRight className="w-3.5 h-3.5" />
										</button>
									</div>
								</div>
							</PremiumCard>
						);
					})
				) : activeTab === "history" ? (
					<PremiumCard className="py-8 px-5 bg-[#0F1218] border-white/10 rounded-xl text-center space-y-2.5">
						<FileCheck className="w-8 h-8 text-gold mx-auto opacity-80" />
						<div className="space-y-1">
							<p className="text-xs font-extrabold text-[#F4F7F5] uppercase tracking-wider">NO DECISION HISTORY YET</p>
							<p className="text-[11px] text-[#9AA4B2] max-w-sm mx-auto">
								No finalized approvals (Approved, Rejected, or Changes Requested) found in the database audit log.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setActiveTab("all")}
							className="px-3.5 py-1.5 bg-[#141820] text-gold border border-gold/30 hover:bg-gold/15 text-xs font-bold rounded-lg cursor-pointer transition-colors"
						>
							Back to Active Queue
						</button>
					</PremiumCard>
				) : (
					<PremiumCard className="py-8 px-5 bg-[#0F1218] border-white/10 rounded-xl text-center space-y-2.5">
						<CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
						<div className="space-y-1">
							<p className="text-xs font-extrabold text-[#F4F7F5] uppercase tracking-wider">NO PENDING APPROVALS</p>
							<p className="text-[11px] text-[#9AA4B2] max-w-sm mx-auto">
								Everything requiring your review has been processed. All task submissions and requests are up to date.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setActiveTab("history")}
							className="px-3.5 py-1.5 bg-[#141820] text-gold border border-gold/30 hover:bg-gold/15 text-xs font-bold rounded-lg cursor-pointer transition-colors"
						>
							View Decision History
						</button>
					</PremiumCard>
				)}
			</div>

			{/* DETAIL REVIEW DRAWER - Responsive Sheet on Mobile */}
			{selectedRequest && (
				<div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-end">
					<div className="bg-[#0F1218] border-l border-white/10 w-full sm:max-w-xl h-full overflow-y-auto p-4 sm:p-5 space-y-5 shadow-2xl flex flex-col justify-between">
						<div className="space-y-4">
							{/* Drawer Header */}
							<div className="flex items-center justify-between border-b border-white/10 pb-3">
								<div>
									<span className="text-[10px] font-mono text-gold font-bold uppercase tracking-wider block">
										{selectedRequest.requestType?.replace("_", " ")}
									</span>
									<h3 className="text-sm font-extrabold text-[#F4F7F5] mt-0.5">{selectedRequest.title}</h3>
								</div>
								<button
									type="button"
									onClick={() => setSelectedRequest(null)}
									className="p-1.5 rounded-lg bg-[#0B0E13] text-[#9AA4B2] hover:text-white"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							{/* Responsibility Chain */}
							<div className="p-3.5 rounded-xl bg-[#0B0E13] border border-white/10 space-y-2">
								<h4 className="text-xs font-bold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
									<Users className="w-3.5 h-3.5 text-gold" /> Responsibility & Governance Chain
								</h4>
								<div className="space-y-1.5 text-xs">
									<div className="flex items-center justify-between p-2 rounded-lg bg-[#0F1218] border border-white/5">
										<span className="text-[#9AA4B2]">Requested By:</span>
										<span className="font-bold text-[#F4F7F5]">{selectedRequest.requesterName}</span>
									</div>
									<div className="flex items-center justify-between p-2 rounded-lg bg-[#0F1218] border border-white/5">
										<span className="text-[#9AA4B2]">Responsible:</span>
										<span className="font-bold text-[#F4F7F5]">{selectedRequest.responsibleName}</span>
									</div>
									<div className="flex items-center justify-between p-2 rounded-lg bg-[#0F1218] border border-white/5">
										<span className="text-[#9AA4B2]">Accountable:</span>
										<span className="font-bold text-[#F4F7F5]">{selectedRequest.accountableName}</span>
									</div>
									<div className="flex items-center justify-between p-2 rounded-lg bg-[#0F1218] border border-white/5">
										<span className="text-[#9AA4B2]">Authorized Approver:</span>
										<span className="font-bold text-gold">{selectedRequest.approverName}</span>
									</div>
								</div>
							</div>

							{/* Request Details & Content */}
							<div className="space-y-1.5 text-xs">
								<h4 className="font-bold text-[#F4F7F5] uppercase tracking-wider">Submission Details</h4>
								<div className="p-3 rounded-xl bg-[#0B0E13] border border-white/10 text-[#9AA4B2] leading-relaxed space-y-2">
									<p>{selectedRequest.description || "No additional text details attached."}</p>
									{selectedRequest.rejectionReason && (
										<div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
											<strong>Previous Feedback:</strong> {selectedRequest.rejectionReason}
										</div>
									)}
								</div>
							</div>

							{/* Timeline History */}
							{detailData?.timeline && (
								<div className="space-y-1.5 text-xs">
									<h4 className="font-bold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
										<History className="w-3.5 h-3.5 text-gold" /> Audit Timeline
									</h4>
									<div className="space-y-1.5">
										{detailData.timeline.map((item: any, idx: number) => (
											<div key={idx} className="p-2 rounded-lg bg-[#0B0E13] border border-white/5 space-y-0.5 font-mono">
												<div className="flex items-center justify-between text-[#F4F7F5]">
													<span className="font-bold text-gold">{item.stage}</span>
													<span className="text-[10px] text-[#667085]">{new Date(item.timestamp).toLocaleTimeString()}</span>
												</div>
												<p className="text-[11px] text-[#9AA4B2]">{item.description}</p>
											</div>
										))}
									</div>
								</div>
							)}
						</div>

						{/* Action Buttons */}
						{isLeadership && ["PENDING", "UNDER_REVIEW"].includes(selectedRequest.status) && (
							<div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2 shrink-0">
								<button
									type="button"
									onClick={() => setShowDecisionModal("REJECTED")}
									className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-bold cursor-pointer"
								>
									Reject
								</button>
								<button
									type="button"
									onClick={() => setShowDecisionModal("CHANGES_REQUESTED")}
									className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-bold cursor-pointer"
								>
									Request Changes
								</button>
								<button
									type="button"
									onClick={() => setShowDecisionModal("APPROVED")}
									className="px-3.5 py-1.5 rounded-lg bg-gold text-black text-xs font-bold hover:bg-gold/90 cursor-pointer flex items-center gap-1.5"
								>
									<Check className="w-3.5 h-3.5" />
									<span>Approve Request</span>
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{/* DECISION CONFIRMATION MODAL */}
			{showDecisionModal && selectedRequest && (
				<div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="bg-[#0F1218] border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-2xl">
						<div className="flex items-center justify-between border-b border-white/10 pb-2.5">
							<h3 className="text-xs font-extrabold text-[#F4F7F5] uppercase tracking-wider">
								Confirm Decision: {showDecisionModal.replace("_", " ")}
							</h3>
							<button type="button" onClick={() => setShowDecisionModal(null)} className="text-[#667085] hover:text-white">
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="space-y-2.5 text-xs text-[#9AA4B2]">
							<p>
								Request: <strong className="text-white">{selectedRequest.title}</strong>
							</p>

							{(showDecisionModal === "CHANGES_REQUESTED" || showDecisionModal === "REJECTED") && (
								<div className="space-y-1">
									<label className="font-bold text-rose-400 block">Justification Reason (Mandatory)</label>
									<textarea
										rows={3}
										placeholder="Provide specific feedback or requirements for the requester..."
										value={decisionReason}
										onChange={(e) => setDecisionReason(e.target.value)}
										className="w-full p-2 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold"
									/>
								</div>
							)}

							{showDecisionModal === "APPROVED" && (
								<div className="space-y-1">
									<label className="font-bold text-[#F4F7F5] block">Approval Comment (Optional)</label>
									<input
										type="text"
										placeholder="e.g. Excellent execution & verified quality"
										value={decisionReason}
										onChange={(e) => setDecisionReason(e.target.value)}
										className="w-full h-8 px-2.5 rounded-lg bg-[#0B0E13] border border-white/15 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold"
									/>
								</div>
							)}
						</div>

						<div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
							<button
								type="button"
								onClick={() => setShowDecisionModal(null)}
								className="px-3.5 py-1.5 rounded-lg bg-[#0B0E13] border border-white/10 text-xs font-bold text-[#9AA4B2] hover:text-white"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleExecuteDecision}
								disabled={submittingDecision}
								className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
									showDecisionModal === "APPROVED"
										? "bg-gold text-black hover:bg-gold/90"
										: showDecisionModal === "CHANGES_REQUESTED"
										? "bg-amber-500 text-black hover:bg-amber-400"
										: "bg-rose-500 text-white hover:bg-rose-600"
								}`}
							>
								{submittingDecision ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
								<span>Confirm {showDecisionModal.replace("_", " ")}</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
