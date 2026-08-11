"use client";

import { useState } from "react";
import { Mail, Edit, Eye, Save, Loader2, Check, Copy, Code, Sparkles, CheckCircle2 } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

export function OrgEmailTemplatesTab() {
	const [templates, setTemplates] = useState([
		{
			id: "tpl_1",
			name: "Community Invitation",
			category: "Invitation",
			subject: "You're invited to join {{community_name}}",
			body: "Hello {{recipient_name}},\n\n{{inviter_name}} has invited you to join {{community_name}} on {{organization_name}}.\n\nClick the link below to accept your invitation:\n{{invitation_link}}\n\nThis invitation expires at {{expires_at}}.\n\nBest regards,\n{{organization_name}} Executive Team",
			status: "ACTIVE",
			version: "v1.2",
			updatedAt: "Today, 04:30 PM",
		},
		{
			id: "tpl_2",
			name: "Community Invitation Resend",
			category: "Invitation",
			subject: "Reminder: Join {{community_name}}",
			body: "Hello {{recipient_name}},\n\nThis is a friendly reminder that {{inviter_name}} invited you to join {{community_name}}.\n\nAccept your invite here: {{invitation_link}}",
			status: "ACTIVE",
			version: "v1.0",
			updatedAt: "Yesterday",
		},
		{
			id: "tpl_3",
			name: "Invitation Accepted Notice",
			category: "Community",
			subject: "{{recipient_name}} accepted your invitation to {{community_name}}",
			body: "Hello {{inviter_name}},\n\n{{recipient_name}} has accepted your invitation and is now an active member of {{community_name}}.",
			status: "ACTIVE",
			version: "v1.0",
			updatedAt: "2 days ago",
		},
		{
			id: "tpl_4",
			name: "Member Organization Welcome",
			category: "System",
			subject: "Welcome to {{organization_name}}",
			body: "Welcome {{recipient_name}},\n\nYour account has been activated for {{organization_name}}.",
			status: "ACTIVE",
			version: "v2.0",
			updatedAt: "3 days ago",
		},
	]);

	const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
	const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
	const [saving, setSaving] = useState(false);
	const [success, setSuccess] = useState("");

	const allowedVariables = [
		"{{recipient_name}}",
		"{{inviter_name}}",
		"{{community_name}}",
		"{{organization_name}}",
		"{{invitation_link}}",
		"{{expires_at}}",
	];

	const handleSaveTemplate = async () => {
		if (!editingTemplate) return;
		setSaving(true);
		await new Promise(resolve => setTimeout(resolve, 400));

		setTemplates(templates.map(t => t.id === editingTemplate.id ? { ...editingTemplate, updatedAt: "Just now" } : t));
		setSaving(false);
		setSuccess(`Saved email template '${editingTemplate.name}'.`);
		setEditingTemplate(null);
		setTimeout(() => setSuccess(""), 4000);
	};

	const renderPreviewBody = (text: string) => {
		return text
			.replace(/\{\{recipient_name\}\}/g, "Alex Johnson")
			.replace(/\{\{inviter_name\}\}/g, "Hemanth MM")
			.replace(/\{\{community_name\}\}/g, "ManMadhan Hub - 1")
			.replace(/\{\{organization_name\}\}/g, "ManMadhan Progress Workspace")
			.replace(/\{\{invitation_link\}\}/g, "https://manmadhan-progress.org/invite/token_abc123")
			.replace(/\{\{expires_at\}\}/g, "Aug 18, 2026");
	};

	return (
		<div className="space-y-6 max-w-5xl pb-10">
			<div>
				<h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
					<Mail className="w-5 h-5 text-gold dark:text-[#F0BC2B]" /> Organization Email Templates
				</h2>
				<p className="text-xs text-muted-foreground mt-1">
					Manage reusable email templates for community invitations, member notices, and system alerts.
				</p>
			</div>

			{success && (
				<div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500 flex items-center gap-2">
					<CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
				</div>
			)}

			{!editingTemplate ? (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{templates.map((tpl) => (
						<PremiumCard key={tpl.id} className="p-5 bg-card border-border/80 rounded-xl space-y-3 flex flex-col justify-between">
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/30">
										{tpl.category}
									</span>
									<span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
										{tpl.status}
									</span>
								</div>
								<h3 className="text-xs font-bold text-foreground">{tpl.name}</h3>
								<p className="text-[11px] font-mono text-muted-foreground truncate">Subject: {tpl.subject}</p>
							</div>

							<div className="pt-2 border-t border-border/40 flex items-center justify-between">
								<span className="text-[10px] text-muted-foreground font-mono">{tpl.version} · {tpl.updatedAt}</span>
								<button
									type="button"
									onClick={() => {
										setEditingTemplate({ ...tpl });
										setViewMode("edit");
									}}
									className="px-3 py-1.5 bg-gold/10 hover:bg-gold/20 text-gold text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
								>
									<Edit className="w-3.5 h-3.5" /> Edit Template
								</button>
							</div>
						</PremiumCard>
					))}
				</div>
			) : (
				/* TEMPLATE EDITOR & PREVIEW */
				<PremiumCard className="p-6 bg-card border-border/80 rounded-xl space-y-5 max-w-3xl">
					<div className="flex items-center justify-between border-b border-border/40 pb-3">
						<h3 className="text-sm font-bold text-foreground">Edit Template: {editingTemplate.name}</h3>
						<div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
							<button
								type="button"
								onClick={() => setViewMode("edit")}
								className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${viewMode === "edit" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
							>
								Editor
							</button>
							<button
								type="button"
								onClick={() => setViewMode("preview")}
								className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${viewMode === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
							>
								Live Preview
							</button>
						</div>
					</div>

					{viewMode === "edit" ? (
						<div className="space-y-4 text-xs">
							<div className="space-y-1.5">
								<label className="font-bold text-foreground">Subject Line *</label>
								<input
									type="text"
									value={editingTemplate.subject}
									onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
									className="w-full h-10 px-3 rounded-xl bg-background border border-border font-medium focus:border-gold outline-none"
								/>
							</div>

							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<label className="font-bold text-foreground">Email Body Template *</label>
									<span className="text-[10px] text-muted-foreground">Click variable to insert</span>
								</div>
								<textarea
									rows={8}
									value={editingTemplate.body}
									onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
									className="w-full p-3 rounded-xl bg-background border border-border font-mono text-xs focus:border-gold outline-none resize-none leading-relaxed"
								/>
							</div>

							{/* Variables bar */}
							<div className="space-y-1.5">
								<label className="font-bold text-foreground">Allowed Variables</label>
								<div className="flex flex-wrap gap-1.5">
									{allowedVariables.map((v) => (
										<button
											key={v}
											type="button"
											onClick={() => setEditingTemplate({ ...editingTemplate, body: editingTemplate.body + " " + v })}
											className="px-2 py-1 rounded bg-muted/60 hover:bg-gold/10 text-muted-foreground hover:text-gold border border-border text-[10px] font-mono font-bold transition-colors cursor-pointer"
										>
											{v}
										</button>
									))}
								</div>
							</div>
						</div>
					) : (
						/* PREVIEW MODE */
						<div className="p-4 rounded-xl bg-background border border-border/80 space-y-3 font-sans text-xs">
							<div className="border-b border-border/40 pb-2">
								<p className="text-muted-foreground font-semibold">Subject: <span className="font-bold text-foreground">{renderPreviewBody(editingTemplate.subject)}</span></p>
							</div>
							<div className="whitespace-pre-wrap leading-relaxed font-medium text-foreground py-2">
								{renderPreviewBody(editingTemplate.body)}
							</div>
						</div>
					)}

					<div className="flex justify-end gap-2 pt-3 border-t border-border/40">
						<button
							type="button"
							onClick={() => setEditingTemplate(null)}
							className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-bold"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSaveTemplate}
							disabled={saving}
							className="px-5 py-2 rounded-xl bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
						>
							{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
							Save Template
						</button>
					</div>
				</PremiumCard>
			)}
		</div>
	);
}
