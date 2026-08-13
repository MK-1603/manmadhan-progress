"use client";

import Link from "next/link";
import { Activity, ArrowRight, Bell, CheckCircle2, Clock3, GitPullRequest, ShieldCheck, Users } from "lucide-react";

type Role = "CEO" | "CO-CEO" | "MEMBER";

const WORKFLOWS = [
	{ icon: Users, name: "Assignment notifications", trigger: "A task or project is assigned", result: "The assignee receives an in-app notification and it appears in My Work.", roles: ["CEO", "CO-CEO", "MEMBER"] },
	{ icon: CheckCircle2, name: "Submission review", trigger: "A member submits work", result: "The assigned reviewer receives a review item and the task moves to review.", roles: ["CEO", "CO-CEO", "MEMBER"] },
	{ icon: Clock3, name: "Deadline monitoring", trigger: "A deadline approaches or passes", result: "The task is marked overdue and appears in the relevant work queues.", roles: ["CEO", "CO-CEO", "MEMBER"] },
	{ icon: GitPullRequest, name: "GitHub evidence checks", trigger: "A task requires a pull request", result: "Submission requires a pull request reference before review can begin.", roles: ["CEO", "CO-CEO", "MEMBER"] },
	{ icon: Bell, name: "Decision notifications", trigger: "An approval or request changes decision is recorded", result: "The requester receives the decision and feedback in Notifications.", roles: ["CEO", "CO-CEO", "MEMBER"] },
];

export function OrganizationAutomationView({ role }: { role: Role }) {
	const workflows = WORKFLOWS.filter((workflow) => workflow.roles.includes(role));
	const isLeadership = role !== "MEMBER";

	return (
		<main className="mx-auto w-full max-w-6xl space-y-8 p-5 md:p-8">
			<header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
				<div className="max-w-2xl space-y-2">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{role} workspace</p>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">Workflow automation</h1>
					<p className="text-sm leading-6 text-muted-foreground">These workflows are built into the organization execution system. They run from real task, submission, deadline, and decision events.</p>
				</div>
				<div className="inline-flex items-center gap-2 self-start rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600">
					<ShieldCheck className="h-4 w-4" /> Server workflows
				</div>
			</header>

			<section className="grid gap-4 sm:grid-cols-3">
				<Metric label="Available workflows" value={String(workflows.length)} />
				<Metric label="Configuration" value="System-managed" />
				<Metric label="Evidence" value="Activity timeline" />
			</section>

			<section className="space-y-3">
				<div><h2 className="text-base font-semibold text-foreground">What runs automatically</h2><p className="mt-1 text-sm text-muted-foreground">Each workflow is tied to a real backend event. There are no client-only switches on this page.</p></div>
				<div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
					{workflows.map(({ icon: Icon, name, trigger, result }) => (
						<article key={name} className="grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground"><Icon className="h-4 w-4" /></div>
							<div className="min-w-0"><h3 className="text-sm font-semibold text-foreground">{name}</h3><p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">When:</span> {trigger}</p><p className="mt-1 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Then:</span> {result}</p></div>
							<span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground"><Activity className="h-3.5 w-3.5" /> Active</span>
						</article>
					))}
				</div>
			</section>

			<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
				<div><p className="text-sm font-semibold text-foreground">Need to inspect what happened?</p><p className="mt-1 text-xs text-muted-foreground">Review the recorded event trail instead of relying on a simulated counter.</p></div>
				<Link href={isLeadership ? `/${role === "CEO" ? "ceo" : "co-ceo"}/timeline` : "/member/timeline"} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent">Open activity timeline <ArrowRight className="h-3.5 w-3.5" /></Link>
			</div>
		</main>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return <div className="rounded-xl border border-border bg-card p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-sm font-semibold text-foreground">{value}</p></div>;
}
