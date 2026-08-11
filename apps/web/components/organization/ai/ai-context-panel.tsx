"use client";

import { useState, useEffect } from "react";
import { FolderKanban, CheckSquare, FileText, Notebook, BookOpen, ChevronRight, Check, Sparkles } from "lucide-react";
import apiClient from "@/lib/api-client";

interface AIContextPanelProps {
	selectedProject: any;
	setSelectedProject: (p: any) => void;
	selectedTask: any;
	setSelectedTask: (t: any) => void;
	selectedDocument: any;
	setSelectedDocument: (d: any) => void;
	onOpenPromptModal: (prompt: any) => void;
}

export function AIContextPanel({
	selectedProject,
	setSelectedProject,
	selectedTask,
	setSelectedTask,
	selectedDocument,
	setSelectedDocument,
	onOpenPromptModal,
}: AIContextPanelProps) {
	const [projects, setProjects] = useState<any[]>([]);
	const [tasks, setTasks] = useState<any[]>([]);
	const [documents, setDocuments] = useState<any[]>([]);
	const [prompts, setPrompts] = useState<any[]>([]);

	useEffect(() => {
		const workspaceId = localStorage.getItem("workspaceId");
		// Fetch Projects
		apiClient.get("/org/projects").then((res) => {
			if (res.data.success) setProjects(res.data.data || []);
		}).catch(() => undefined);

		// Fetch Tasks
		apiClient.get("/org/tasks").then((res) => {
			if (res.data.success) setTasks(res.data.data || []);
		}).catch(() => undefined);

		// Fetch Prompts
		apiClient.get("/org/prompts").then((res) => {
			if (res.data.success) setPrompts(res.data.data || []);
		}).catch(() => undefined);
	}, []);

	return (
		<div className="w-80 shrink-0 border-l border-border/50 bg-card/40 flex flex-col h-full overflow-y-auto p-4 space-y-6">
			<div>
				<h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
					Execution Context
				</h3>
				<p className="text-[11px] text-muted-foreground">
					Attach workspace entities to ground AI responses.
				</p>
			</div>

			{/* Project Context */}
			<div className="space-y-2">
				<label className="text-xs font-semibold text-foreground flex items-center justify-between">
					<span className="flex items-center gap-1.5">
						<FolderKanban className="w-3.5 h-3.5 text-gold dark:text-[#E3AA18]" /> Project Context
					</span>
					{selectedProject && (
						<button
							type="button"
							onClick={() => setSelectedProject(null)}
							className="text-[10px] text-rose-400 hover:underline"
						>
							Clear
						</button>
					)}
				</label>

				<select
					value={selectedProject?.id || ""}
					onChange={(e) => {
						const found = projects.find((p) => p.id === e.target.value);
						setSelectedProject(found || null);
					}}
					className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gold/30"
				>
					<option value="">No Project Selected</option>
					{projects.map((p) => (
						<option key={p.id} value={p.id}>
							{p.name} ({p.status})
						</option>
					))}
				</select>

				{selectedProject && (
					<div className="p-2.5 bg-gold/10 border border-gold/20 rounded-xl text-xs space-y-1">
						<div className="font-semibold text-gold dark:text-[#F0BC2B]">{selectedProject.name}</div>
						<div className="text-[11px] text-muted-foreground line-clamp-2">
							{selectedProject.description || "Active organization project."}
						</div>
					</div>
				)}
			</div>

			{/* Task Context */}
			<div className="space-y-2">
				<label className="text-xs font-semibold text-foreground flex items-center justify-between">
					<span className="flex items-center gap-1.5">
						<CheckSquare className="w-3.5 h-3.5 text-gold dark:text-[#E3AA18]" /> Task Context
					</span>
					{selectedTask && (
						<button
							type="button"
							onClick={() => setSelectedTask(null)}
							className="text-[10px] text-rose-400 hover:underline"
						>
							Clear
						</button>
					)}
				</label>

				<select
					value={selectedTask?.id || ""}
					onChange={(e) => {
						const found = tasks.find((t) => t.id === e.target.value);
						setSelectedTask(found || null);
					}}
					className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gold/30"
				>
					<option value="">No Task Selected</option>
					{tasks.map((t) => (
						<option key={t.id} value={t.id}>
							{t.title} ({t.status})
						</option>
					))}
				</select>

				{selectedTask && (
					<div className="p-2.5 bg-gold/10 border border-gold/20 rounded-xl text-xs space-y-1">
						<div className="font-semibold text-gold dark:text-[#F0BC2B]">{selectedTask.title}</div>
						<div className="text-[11px] text-muted-foreground">Priority: {selectedTask.priority}</div>
					</div>
				)}
			</div>

			{/* Prompt Library Shortcuts */}
			<div className="space-y-2 pt-2 border-t border-border/40">
				<h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
					<span className="flex items-center gap-1.5">
						<BookOpen className="w-3.5 h-3.5 text-gold dark:text-[#E3AA18]" /> Prompt Library
					</span>
					<span className="text-[10px] text-gold">{prompts.length} Prompts</span>
				</h3>

				<div className="space-y-2 max-h-64 overflow-y-auto pr-1">
					{prompts.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => onOpenPromptModal(p)}
							className="w-full text-left p-2.5 bg-muted/20 hover:bg-gold/10 border border-border/50 hover:border-gold/30 rounded-xl transition-colors group flex items-center justify-between"
						>
							<div className="space-y-0.5 min-w-0 pr-2">
								<span className="text-xs font-semibold text-foreground group-hover:text-gold block truncate">
									{p.title}
								</span>
								<span className="text-[10px] text-muted-foreground block truncate">
									{p.category} · {p.variables?.length || 0} vars
								</span>
							</div>
							<Sparkles className="w-3.5 h-3.5 text-gold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
