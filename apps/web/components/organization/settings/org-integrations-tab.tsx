"use client";

import { Link2, Github, Calendar, MessageSquare, Check, ShieldCheck } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

export function OrgIntegrationsTab() {
	return (
		<div className="space-y-6 max-w-3xl">
			<div>
				<h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
					<Link2 className="w-5 h-5 text-gold dark:text-[#F0BC2B]" /> Organization Integrations
				</h2>
				<p className="text-xs text-muted-foreground mt-1">
					Connected system integrations, version control repository bindings, and automation channels.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4">
				{/* GitHub Binding */}
				<PremiumCard className="p-5 bg-card border-border/80 rounded-xl flex items-start gap-4">
					<div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
						<Github className="w-5 h-5" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between gap-2">
							<h3 className="text-sm font-bold text-foreground">GitHub Project Binding</h3>
							<span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
								<Check className="w-3 h-3" /> Connected
							</span>
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							Sync repositories, commits, and pull requests directly into task execution workflows.
						</p>
					</div>
				</PremiumCard>

				{/* Google Calendar */}
				<PremiumCard className="p-5 bg-card border-border/80 rounded-xl flex items-start gap-4">
					<div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
						<Calendar className="w-5 h-5" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between gap-2">
							<h3 className="text-sm font-bold text-foreground">Google Calendar Integration</h3>
							<span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
								Configured
							</span>
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							Sync working hours policies, executive events, and calendar deadlines.
						</p>
					</div>
				</PremiumCard>

				{/* System Webhooks */}
				<PremiumCard className="p-5 bg-card border-border/80 rounded-xl flex items-start gap-4">
					<div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center shrink-0">
						<MessageSquare className="w-5 h-5" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between gap-2">
							<h3 className="text-sm font-bold text-foreground">System Notification Webhooks</h3>
							<span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gold/10 text-gold border border-gold/30 flex items-center gap-1">
								<ShieldCheck className="w-3 h-3" /> Active
							</span>
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							Broadcast critical project approvals and deadline events to configured webhooks.
						</p>
					</div>
				</PremiumCard>
			</div>
		</div>
	);
}
