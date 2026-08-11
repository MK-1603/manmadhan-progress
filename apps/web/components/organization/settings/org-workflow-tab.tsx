"use client";

import { GitCommit, ShieldCheck, CheckCircle2, AlertCircle, Layers, FileCheck } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

export function OrgWorkflowTab() {
	const workflowRules = [
		{
			id: "stage-pipeline",
			title: "8-Stage Mandatory Project Pipeline",
			description: "Projects must strictly progress sequentially through Stages 01 to 08 with formal CEO approval for each milestone.",
			type: "System-defined",
			status: "Active Strict",
		},
		{
			id: "project-assignment",
			title: "Canonical Project Mandate Acceptance",
			description: "Assigned CO-CEOs receive formal notifications and must explicitly Accept or Decline with mandatory reason.",
			type: "System-defined",
			status: "Active Canonical",
		},
		{
			id: "task-workflow",
			title: "Task Acceptance Workflow",
			description: "Assigned tasks transition to PENDING_ACCEPTANCE before work begins. Verification requires evidence links or GitHub commits.",
			type: "System-defined",
			status: "Active Mandate",
		},
		{
			id: "extension-request",
			title: "Deadline Extension Approval",
			description: "Deadline extension requests require reason documentation and formal CEO/Leadership authorization.",
			type: "Configured",
			status: "Active Enabled",
		},
		{
			id: "audit-logging",
			title: "Comprehensive Audit Logging",
			description: "All project state transitions, task assignments, role updates, and document submissions recorded in audit trail.",
			type: "System-defined",
			status: "Immutable Logged",
		},
	];

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
					<GitCommit className="w-5 h-5 text-gold dark:text-[#E3AA18]" /> Organization Workflow & Pipeline Policies
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Read-only configuration summary of mandatory execution pipelines and verification policies.
				</p>
			</div>

			<div className="space-y-4">
				{workflowRules.map((rule) => (
					<PremiumCard key={rule.id}>
						<div className="flex items-start justify-between gap-4">
							<div className="space-y-1">
								<div className="flex items-center gap-2.5">
									<h3 className="text-base font-bold text-foreground">{rule.title}</h3>
									<span
										className={`text-[10px] font-bold px-2 py-0.5 rounded ${
											rule.type === "System-defined"
												? "bg-gold/15 text-gold dark:text-[#F0BC2B]"
												: "bg-blue-500/15 text-blue-400"
										}`}
									>
										{rule.type}
									</span>
								</div>
								<p className="text-sm text-muted-foreground">{rule.description}</p>
							</div>

							<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
								{rule.status}
							</span>
						</div>
					</PremiumCard>
				))}
			</div>
		</div>
	);
}
