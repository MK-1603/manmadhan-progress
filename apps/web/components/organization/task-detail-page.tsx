"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Calendar, CheckSquare, Clock3, RefreshCw, User } from "lucide-react";
import apiClient from "@/lib/api-client";
import { formatEnumLabel } from "@/lib/utils/formatters";

export function OrganizationTaskDetailPage({ role }: { role: "CEO" | "CO-CEO" | "MEMBER" }) {
	const params = useParams<{ id: string }>();
	const [task, setTask] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const workspaceId = localStorage.getItem("workspaceId");
			const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
			const response = await apiClient.get(`/org/tasks/${params.id}${query}`);
			if (!response.data?.success) throw new Error(response.data?.error || "Task not found");
			setTask(response.data.data);
		} catch (err: any) {
			setError(err.response?.data?.error || err.message || "Unable to load task");
		} finally {
			setLoading(false);
		}
	}, [params.id]);

	useEffect(() => { load(); }, [load]);

	if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading task…</div>;
	if (error || !task) return <div className="p-8 space-y-4"><Link href={`/${role === "CEO" ? "ceo" : role === "CO-CEO" ? "co-ceo" : "member"}/tasks`} className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Back to tasks</Link><p className="text-sm text-destructive">{error || "Task not found"}</p></div>;

	return (
		<main className="mx-auto w-full max-w-4xl space-y-6 p-5 md:p-8">
			<div className="flex items-center justify-between gap-4">
				<Link href={`/${role === "CEO" ? "ceo" : role === "CO-CEO" ? "co-ceo" : "member"}/tasks`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Tasks</Link>
				<button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
			</div>
			<section className="rounded-2xl border border-border bg-card p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{formatEnumLabel(task.type || "Task")}</p><h1 className="text-2xl font-semibold text-foreground">{task.title}</h1></div>
					<span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold">{formatEnumLabel(task.status)}</span>
				</div>
				{task.description && <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{task.description}</p>}
				<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<Info icon={<User />} label="Assignee" value={task.assigneeName || "Unassigned"} />
					<Info icon={<Calendar />} label="Deadline" value={task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"} />
					<Info icon={<Clock3 />} label="Verified work" value={`${Math.round((task.verifiedWorkSeconds || 0) / 60)} min`} />
					<Info icon={<CheckSquare />} label="Priority" value={formatEnumLabel(task.priority || "Normal")} />
				</div>
			</section>
		</main>
	);
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
	return <div className="rounded-xl border border-border bg-background p-3"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-[11px] uppercase tracking-wider">{label}</span></div><p className="mt-2 text-sm font-medium text-foreground">{value}</p></div>;
}
