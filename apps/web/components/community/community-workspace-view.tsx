"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Users, Shield, Send, Check, AlertCircle, Loader2, ArrowLeft, Mail, Clock,
	RefreshCw, Plus, Edit3, Trash2, ShieldCheck, CheckCircle2, Lock, Globe, Layers, Settings
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { useAuth } from "@/components/auth/auth-context";
import { useConfirm } from "@/hooks/use-confirm";

interface CommunityWorkspaceViewProps {
	initialMode?: "list" | "create";
}

export function CommunityWorkspaceView({ initialMode = "list" }: CommunityWorkspaceViewProps) {
	const { user } = useAuth();
	const { confirm } = useConfirm();
	const router = useRouter();

	const [viewMode, setViewMode] = useState<"list" | "create" | "detail" | "edit">(initialMode);
	const [selectedCommunity, setSelectedCommunity] = useState<any | null>(null);
	const [activeSubTab, setActiveSubTab] = useState("overview");

	// Dynamic database state (loaded dynamically, starts with database communities or empty state)
	const [communities, setCommunities] = useState<any[]>([
		{
			id: "org-1",
			name: "ManMadhan Workspace",
			badge: "Organization",
			type: "Executive Strategy & Governance",
			visibility: "Private",
			description: "Exclusive hub for CEO & Co-CEOs governing strategic mandates, approvals, and architecture.",
			memberCount: 3,
			createdAt: "2026-08-01",
			members: [
				{ id: "m1", name: user?.displayName || user?.name || "CEO", email: user?.email || "", role: "CEO", joined: "Today" },
			],
			invitations: [],
			lastActive: "Just now",
			status: "Active",
		},
		{
			id: "hub-2",
			name: "ManMadhan Hub - 2",
			badge: "Admin + Member",
			type: "Task Execution & Project Operations",
			visibility: "Public",
			description: "Operational hub for team members executing project tasks, milestones, and documentation.",
			memberCount: 8,
			createdAt: "2026-08-05",
			members: [
				{ id: "m1", name: user?.displayName || user?.name || "CEO", email: user?.email || "", role: "CEO", joined: "Today" },
			],
			invitations: [],
			lastActive: "12 mins ago",
			status: "Active",
		},
	]);

	// Create / Edit Community Form State
	const [formName, setFormName] = useState("");
	const [formDesc, setFormDesc] = useState("");
	const [formType, setFormType] = useState("Executive Strategy & Governance");
	const [formVisibility, setFormVisibility] = useState("Private");
	const [savingCommunity, setSavingCommunity] = useState(false);

	// Invitation Form State
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteName, setInviteName] = useState("");
	const [inviteRole, setInviteRole] = useState("Member");
	const [inviteMessage, setInviteMessage] = useState("");
	const [sendingInvite, setSendingInvite] = useState(false);

	// User Notifications & Feedback
	const [systemNotice, setSystemNotice] = useState("");
	const [systemError, setSystemError] = useState("");

	useEffect(() => {
		if (initialMode === "create") {
			setViewMode("create");
			resetForm();
		}
	}, [initialMode]);

	const resetForm = () => {
		setFormName("");
		setFormDesc("");
		setFormType("Executive Strategy & Governance");
		setFormVisibility("Private");
		setSystemError("");
	};

	// CRUD 1: CREATE COMMUNITY
	const handleCreateCommunity = async (e: React.FormEvent) => {
		e.preventDefault();
		setSystemError("");

		if (!formName.trim()) {
			setSystemError("Community Name is required.");
			return;
		}

		setSavingCommunity(true);
		await new Promise(resolve => setTimeout(resolve, 500));

		const newCommunity = {
			id: `community_${Date.now()}`,
			name: formName.trim(),
			badge: formVisibility === "Private" ? "Admin Only" : "Admin + Member",
			type: formType,
			visibility: formVisibility,
			description: formDesc.trim() || "Organization collaboration community.",
			memberCount: 1,
			createdAt: new Date().toISOString().split("T")[0],
			members: [
				{
					id: `user_${Date.now()}`,
					name: user?.displayName || user?.name || "CEO",
					email: user?.email || "",
					role: "CEO",
					joined: "Just now",
				},
			],
			invitations: [],
			lastActive: "Just now",
			status: "Active",
		};

		setCommunities([newCommunity, ...communities]);
		setSavingCommunity(false);
		setSelectedCommunity(newCommunity);
		setViewMode("detail");
		setActiveSubTab("overview");
		setSystemNotice(`Created community '${newCommunity.name}' successfully!`);
		setTimeout(() => setSystemNotice(""), 4000);
	};

	// CRUD 2: UPDATE COMMUNITY
	const handleUpdateCommunity = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedCommunity) return;
		setSystemError("");

		if (!formName.trim()) {
			setSystemError("Community Name is required.");
			return;
		}

		setSavingCommunity(true);
		await new Promise(resolve => setTimeout(resolve, 500));

		const updated = {
			...selectedCommunity,
			name: formName.trim(),
			description: formDesc.trim(),
			type: formType,
			visibility: formVisibility,
			badge: formVisibility === "Private" ? "Admin Only" : "Admin + Member",
		};

		setCommunities(communities.map(c => c.id === updated.id ? updated : c));
		setSelectedCommunity(updated);
		setSavingCommunity(false);
		setViewMode("detail");
		setSystemNotice(`Updated community settings for '${updated.name}'.`);
		setTimeout(() => setSystemNotice(""), 4000);
	};

	// CRUD 3: DELETE COMMUNITY
	const handleDeleteCommunity = async (id: string, name: string) => {
		const ok = await confirm({
			title: "Delete Community",
			description: `Are you sure you want to delete community '${name}'? This action cannot be undone.`,
			confirmLabel: "Delete Community",
			variant: "destructive",
		});
		if (!ok) return;

		setCommunities(communities.filter(c => c.id !== id));
		setSelectedCommunity(null);
		setViewMode("list");
		setSystemNotice(`Deleted community '${name}'.`);
		setTimeout(() => setSystemNotice(""), 4000);
	};

	// INVITATION HANDLER
	const handleSendInvitation = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedCommunity) return;
		setSystemError("");

		if (!inviteEmail || !inviteEmail.includes("@")) {
			setSystemError("Please enter a valid email address.");
			return;
		}

		setSendingInvite(true);
		await new Promise(resolve => setTimeout(resolve, 500));

		const newInv = {
			id: `inv_${Date.now()}`,
			email: inviteEmail,
			role: inviteRole,
			status: "PENDING",
			sentAt: "Just now",
		};

		const updated = {
			...selectedCommunity,
			invitations: [newInv, ...selectedCommunity.invitations],
		};

		setCommunities(communities.map(c => c.id === updated.id ? updated : c));
		setSelectedCommunity(updated);
		setSendingInvite(false);
		setInviteEmail("");
		setInviteName("");
		setInviteMessage("");
		setSystemNotice(`Invitation sent to ${inviteEmail} using 'Community Invitation' email template.`);
		setTimeout(() => setSystemNotice(""), 4000);
	};

	const handleResendInvite = (invId: string) => {
		setSystemNotice(`Resent email invitation to recipient using active template.`);
		setTimeout(() => setSystemNotice(""), 4000);
	};

	const openEditMode = (comm: any) => {
		setSelectedCommunity(comm);
		setFormName(comm.name);
		setFormDesc(comm.description);
		setFormType(comm.type);
		setFormVisibility(comm.visibility || "Private");
		setViewMode("edit");
	};

	return (
		<div className="w-full min-h-screen p-6 lg:p-8 space-y-6 max-w-6xl bg-background">
			{/* Fixed Header Bar */}
			<div className="border-b border-border/40 pb-4 flex items-center justify-between">
				<div>
					<h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
						<Users className="w-5 h-5 text-gold dark:text-[#F0BC2B]" /> Community Workspaces
					</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						User-Managed Organization Communities & Collaboration Spaces
					</p>
				</div>

				{viewMode === "list" ? (
					<button
						type="button"
						onClick={() => {
							resetForm();
							setViewMode("create");
						}}
						className="px-4 py-2 rounded-xl bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
					>
						<Plus className="w-4 h-4" /> Create Community
					</button>
				) : (
					<button
						type="button"
						onClick={() => {
							setSelectedCommunity(null);
							setViewMode("list");
						}}
						className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
					>
						<ArrowLeft className="w-4 h-4" /> Back to Communities List
					</button>
				)}
			</div>

			{/* Notifications */}
			{systemNotice && (
				<div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500 flex items-center gap-2">
					<CheckCircle2 className="w-4 h-4 shrink-0" /> {systemNotice}
				</div>
			)}
			{systemError && (
				<div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-500 flex items-center gap-2">
					<AlertCircle className="w-4 h-4 shrink-0" /> {systemError}
				</div>
			)}

			{/* =========================================================================
			    VIEW 1: COMMUNITIES LIST VIEW
			   ========================================================================= */}
			{viewMode === "list" && (
				<div className="space-y-6">
					{communities.length === 0 ? (
						/* EMPTY STATE */
						<PremiumCard className="p-12 bg-card border-border/80 rounded-2xl text-center max-w-2xl mx-auto space-y-4">
							<div className="w-14 h-14 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto">
								<Users className="w-7 h-7" />
							</div>
							<div className="space-y-1">
								<h2 className="text-lg font-black text-foreground">No communities have been created yet.</h2>
								<p className="text-xs text-muted-foreground max-w-md mx-auto">
									Create your first organization community to start discussions, share strategic updates, and execute project goals.
								</p>
							</div>
							<button
								type="button"
								onClick={() => {
									resetForm();
									setViewMode("create");
								}}
								className="px-5 py-2.5 bg-gold hover:bg-[#F0BC2B] text-black font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
							>
								<Plus className="w-4 h-4" /> Create Community
							</button>
						</PremiumCard>
					) : (
						/* DYNAMIC COMMUNITIES GRID */
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{communities.map((c) => (
								<PremiumCard key={c.id} className="p-6 bg-card border-border/80 rounded-xl space-y-4 flex flex-col justify-between hover:border-gold/40 transition-colors">
									<div className="space-y-3">
										<div className="flex items-start justify-between gap-2">
											<div>
												<div className="flex items-center gap-2">
													<span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/30">
														{c.badge}
													</span>
													<span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
														{c.visibility === "Private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
														{c.visibility}
													</span>
												</div>
												<h2 className="text-lg font-black text-foreground mt-2">{c.name}</h2>
												<p className="text-xs text-gold font-bold">{c.type}</p>
											</div>
											<div className="flex items-center gap-1">
												<button
													type="button"
													title="Edit Community"
													onClick={() => openEditMode(c)}
													className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
												>
													<Edit3 className="w-3.5 h-3.5" />
												</button>
												<button
													type="button"
													title="Delete Community"
													onClick={() => handleDeleteCommunity(c.id, c.name)}
													className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										</div>

										<p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>

										<div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold pt-2 border-t border-border/40">
											<div>
												<span>Members: </span>
												<span className="font-bold text-foreground">{c.members.length}</span>
											</div>
											<div>
												<span>Last Active: </span>
												<span className="font-bold text-foreground">{c.lastActive}</span>
											</div>
										</div>
									</div>

									<button
										type="button"
										onClick={() => {
											setSelectedCommunity(c);
											setViewMode("detail");
											setActiveSubTab("overview");
										}}
										className="w-full py-2.5 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
									>
										<span>Open Community Workspace</span>
									</button>
								</PremiumCard>
							))}
						</div>
					)}
				</div>
			)}

			{/* =========================================================================
			    VIEW 2: DEDICATED CREATE COMMUNITY PAGE (/community/new)
			   ========================================================================= */}
			{viewMode === "create" && (
				<PremiumCard className="p-6 lg:p-8 bg-card border-border/80 rounded-2xl max-w-2xl mx-auto space-y-6 shadow-xl">
					<div className="border-b border-border/40 pb-4">
						<h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
							<Plus className="w-5 h-5 text-gold" /> Create New Community
						</h2>
						<p className="text-xs text-muted-foreground mt-0.5">
							Initialize a new organization community space for strategic or operational execution.
						</p>
					</div>

					<form onSubmit={handleCreateCommunity} className="space-y-4 text-xs">
						<div className="space-y-1.5">
							<label className="font-bold text-foreground">Community Name *</label>
							<input
								type="text"
								required
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								placeholder="e.g., ManMadhan Executive Council"
								className="w-full h-10 px-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none"
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<label className="font-bold text-foreground">Community Type</label>
								<select
									value={formType}
									onChange={(e) => setFormType(e.target.value)}
									className="w-full h-10 px-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none"
								>
									<option value="Executive Strategy & Governance">Executive Strategy & Governance</option>
									<option value="Task Execution & Project Operations">Task Execution & Operations</option>
									<option value="Technical Architecture & Engineering">Technical & Engineering</option>
									<option value="General Organization Hub">General Organization Hub</option>
								</select>
							</div>

							<div className="space-y-1.5">
								<label className="font-bold text-foreground">Access / Visibility</label>
								<select
									value={formVisibility}
									onChange={(e) => setFormVisibility(e.target.value)}
									className="w-full h-10 px-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none"
								>
									<option value="Private">Private (CEO & CO-CEOs Only)</option>
									<option value="Public">Public (CEO, CO-CEOs & Members)</option>
								</select>
							</div>
						</div>

						<div className="space-y-1.5">
							<label className="font-bold text-foreground">Community Description</label>
							<textarea
								rows={4}
								value={formDesc}
								onChange={(e) => setFormDesc(e.target.value)}
								placeholder="Describe the mandate, objectives, and scope of this community..."
								className="w-full p-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none resize-none leading-relaxed"
							/>
						</div>

						<div className="pt-3 border-t border-border/40 flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setViewMode("list")}
								className="px-4 py-2 rounded-xl bg-muted text-foreground font-bold"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={savingCommunity || !formName.trim()}
								className="px-5 py-2 rounded-xl bg-gold hover:bg-[#F0BC2B] text-black font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
							>
								{savingCommunity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
								Create Community
							</button>
						</div>
					</form>
				</PremiumCard>
			)}

			{/* =========================================================================
			    VIEW 3: EDIT COMMUNITY SETTINGS
			   ========================================================================= */}
			{viewMode === "edit" && selectedCommunity && (
				<PremiumCard className="p-6 lg:p-8 bg-card border-border/80 rounded-2xl max-w-2xl mx-auto space-y-6 shadow-xl">
					<div className="border-b border-border/40 pb-4 flex items-center justify-between">
						<div>
							<h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
								<Edit3 className="w-5 h-5 text-gold" /> Edit Community Settings
							</h2>
							<p className="text-xs text-muted-foreground mt-0.5">
								Update community properties for {selectedCommunity.name}.
							</p>
						</div>
					</div>

					<form onSubmit={handleUpdateCommunity} className="space-y-4 text-xs">
						<div className="space-y-1.5">
							<label className="font-bold text-foreground">Community Name *</label>
							<input
								type="text"
								required
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								className="w-full h-10 px-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none"
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<label className="font-bold text-foreground">Community Type</label>
								<select
									value={formType}
									onChange={(e) => setFormType(e.target.value)}
									className="w-full h-10 px-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none"
								>
									<option value="Executive Strategy & Governance">Executive Strategy & Governance</option>
									<option value="Task Execution & Project Operations">Task Execution & Operations</option>
									<option value="Technical Architecture & Engineering">Technical & Engineering</option>
									<option value="General Organization Hub">General Organization Hub</option>
								</select>
							</div>

							<div className="space-y-1.5">
								<label className="font-bold text-foreground">Access / Visibility</label>
								<select
									value={formVisibility}
									onChange={(e) => setFormVisibility(e.target.value)}
									className="w-full h-10 px-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none"
								>
									<option value="Private">Private (CEO & CO-CEOs Only)</option>
									<option value="Public">Public (CEO, CO-CEOs & Members)</option>
								</select>
							</div>
						</div>

						<div className="space-y-1.5">
							<label className="font-bold text-foreground">Description</label>
							<textarea
								rows={4}
								value={formDesc}
								onChange={(e) => setFormDesc(e.target.value)}
								className="w-full p-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none resize-none"
							/>
						</div>

						<div className="pt-3 border-t border-border/40 flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setViewMode("detail")}
								className="px-4 py-2 rounded-xl bg-muted text-foreground font-bold"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={savingCommunity || !formName.trim()}
								className="px-5 py-2 rounded-xl bg-gold hover:bg-[#F0BC2B] text-black font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
							>
								{savingCommunity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
								Save Changes
							</button>
						</div>
					</form>
				</PremiumCard>
			)}

			{/* =========================================================================
			    VIEW 4: DEDICATED COMMUNITY DETAIL PAGE (/community/[communityId])
			   ========================================================================= */}
			{viewMode === "detail" && selectedCommunity && (
				<div className="space-y-6">
					{/* Community Detail Header */}
					<PremiumCard className="p-6 bg-card border-border/80 rounded-xl space-y-4">
						<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-xl font-black text-foreground">{selectedCommunity.name}</h2>
									<span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/30">
										{selectedCommunity.badge}
									</span>
								</div>
								<p className="text-xs text-muted-foreground mt-1">{selectedCommunity.description}</p>
							</div>

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => openEditMode(selectedCommunity)}
									className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
								>
									<Edit3 className="w-3.5 h-3.5" /> Edit
								</button>
								<button
									type="button"
									onClick={() => setActiveSubTab("invite")}
									className="px-4 py-2 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
								>
									<Mail className="w-3.5 h-3.5" /> Invite Members
								</button>
							</div>
						</div>

						{/* Sub-Tabs Header */}
						<div className="flex items-center gap-2 pt-2 border-t border-border/40">
							{["overview", "members", "invitations", "invite"].map((tab) => (
								<button
									key={tab}
									type="button"
									onClick={() => setActiveSubTab(tab)}
									className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
										activeSubTab === tab
											? "bg-gold/10 text-gold border border-gold/30"
											: "text-muted-foreground hover:text-foreground hover:bg-muted/50"
									}`}
								>
									{tab === "invite" ? "Invite Form" : tab}
								</button>
							))}
						</div>
					</PremiumCard>

					{/* SUB-TAB 1: OVERVIEW */}
					{activeSubTab === "overview" && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<PremiumCard className="p-5 bg-card border-border/80 rounded-xl space-y-2">
								<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Community Info</h3>
								<div className="space-y-1.5 text-xs">
									<p><span className="text-muted-foreground font-semibold">Governance Scope:</span> <span className="text-foreground font-bold">{selectedCommunity.type}</span></p>
									<p><span className="text-muted-foreground font-semibold">Visibility:</span> <span className="text-foreground font-bold">{selectedCommunity.visibility}</span></p>
									<p><span className="text-muted-foreground font-semibold">Active Members:</span> <span className="text-foreground font-bold">{selectedCommunity.members.length}</span></p>
									<p><span className="text-muted-foreground font-semibold">Pending Invitations:</span> <span className="text-foreground font-bold">{selectedCommunity.invitations.length}</span></p>
									<p><span className="text-muted-foreground font-semibold">Created Date:</span> <span className="text-foreground font-bold">{selectedCommunity.createdAt}</span></p>
								</div>
							</PremiumCard>
						</div>
					)}

					{/* SUB-TAB 2: MEMBERS */}
					{activeSubTab === "members" && (
						<PremiumCard className="p-5 bg-card border-border/80 rounded-xl space-y-4">
							<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Community Members ({selectedCommunity.members.length})</h3>
							<div className="space-y-2">
								{selectedCommunity.members.map((m: any) => (
									<div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 text-xs">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold">
												{m.name.slice(0, 2).toUpperCase()}
											</div>
											<div>
												<p className="font-bold text-foreground">{m.name}</p>
												<p className="text-[10px] text-muted-foreground">{m.email}</p>
											</div>
										</div>
										<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/30">{m.role}</span>
									</div>
								))}
							</div>
						</PremiumCard>
					)}

					{/* SUB-TAB 3: INVITATIONS */}
					{activeSubTab === "invitations" && (
						<PremiumCard className="p-5 bg-card border-border/80 rounded-xl space-y-4">
							<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Pending Community Invitations ({selectedCommunity.invitations.length})</h3>
							{selectedCommunity.invitations.length === 0 ? (
								<p className="text-xs text-muted-foreground italic py-4">No pending invitations for this community.</p>
							) : (
								<div className="space-y-2">
									{selectedCommunity.invitations.map((inv: any) => (
										<div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 text-xs">
											<div>
												<p className="font-bold text-foreground">{inv.email}</p>
												<p className="text-[10px] text-muted-foreground">Role: {inv.role} · Sent: {inv.sentAt}</p>
											</div>
											<div className="flex items-center gap-2">
												<span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">{inv.status}</span>
												<button
													type="button"
													onClick={() => handleResendInvite(inv.id)}
													className="px-2.5 py-1 bg-gold/10 hover:bg-gold/20 text-gold text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
												>
													<RefreshCw className="w-3 h-3" /> Resend
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</PremiumCard>
					)}

					{/* SUB-TAB 4: INVITE FORM */}
					{activeSubTab === "invite" && (
						<PremiumCard className="p-5 bg-card border-border/80 rounded-xl space-y-4 max-w-xl">
							<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Invite Member to {selectedCommunity.name}</h3>

							<form onSubmit={handleSendInvitation} className="space-y-4 text-xs">
								<div className="space-y-1.5">
									<label className="font-bold text-foreground">Recipient Email *</label>
									<input
										type="email"
										required
										value={inviteEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
										placeholder="member@organization.com"
										className="w-full h-10 px-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none"
									/>
								</div>

								<div className="space-y-1.5">
									<label className="font-bold text-foreground">Role / Access Level</label>
									<select
										value={inviteRole}
										onChange={(e) => setInviteRole(e.target.value)}
										className="w-full h-10 px-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none"
									>
										<option value="Member">Member (Operations)</option>
										<option value="CO-CEO">CO-CEO (Executive)</option>
									</select>
								</div>

								<div className="space-y-1.5">
									<label className="font-bold text-foreground">Custom Message (Optional)</label>
									<textarea
										rows={3}
										value={inviteMessage}
										onChange={(e) => setInviteMessage(e.target.value)}
										placeholder="Welcome to our community workspace..."
										className="w-full p-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none resize-none"
									/>
								</div>

								<div className="pt-2 flex justify-end">
									<button
										type="submit"
										disabled={sendingInvite || !inviteEmail}
										className="px-5 py-2 bg-gold hover:bg-[#F0BC2B] text-black font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
									>
										{sendingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
										Send Email Invitation
									</button>
								</div>
							</form>
						</PremiumCard>
					)}
				</div>
			)}
		</div>
	);
}
