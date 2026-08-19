"use client";

import { useState } from "react";
import { Search, X, CheckSquare, FolderKanban, AlertCircle, ChevronRight } from "lucide-react";
import { AppSelect, AppSelectOption } from "@/components/ui/app-select";

interface TaskSelectorModalProps {
	isOpen: boolean;
	onClose: () => void;
	tasks: any[];
	projects: any[];
	onSelectTask: (task: any) => void;
}

const PRIORITY_OPTIONS: AppSelectOption[] = [
	{ value: "", label: "All Priorities" },
	{ value: "Urgent", label: "Urgent", color: "bg-rose-500" },
	{ value: "High", label: "High", color: "bg-amber-500" },
	{ value: "Medium", label: "Medium", color: "bg-blue-500" },
	{ value: "Low", label: "Low", color: "bg-emerald-500" },
];

export function TaskSelectorModal({
	isOpen,
	onClose,
	tasks,
	projects,
	onSelectTask,
}: TaskSelectorModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedProject, setSelectedProject] = useState("");
	const [selectedPriority, setSelectedPriority] = useState("");

	if (!isOpen) return null;

	const projectOptions: AppSelectOption[] = [
		{ value: "", label: "All Projects" },
		...projects.map((p) => ({ value: p.id, label: p.name })),
	];

	// Filter active tasks
	const filteredTasks = tasks.filter((t) => {
		if (selectedProject && t.projectId !== selectedProject) return false;
		if (selectedPriority && (t.priority || "Medium").toLowerCase() !== selectedPriority.toLowerCase()) return false;
		if (searchQuery) {
			const s = searchQuery.toLowerCase();
			return (
				t.title.toLowerCase().includes(s) ||
				(t.description && t.description.toLowerCase().includes(s))
			);
		}
		return true;
	});

	return (
		<div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
			<div className="bg-[#0F1218] border border-white/10 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col justify-between p-5 space-y-4 shadow-2xl">
				{/* Modal Header */}
				<div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
					<div>
						<h3 className="text-sm font-extrabold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
							<CheckSquare className="w-4 h-4 text-gold" /> Select Work to Begin Focus
						</h3>
						<p className="text-xs text-[#9AA4B2] mt-0.5">
							Choose an assigned task from your organization work queue.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-lg bg-[#0B0E13] text-[#9AA4B2] hover:text-white"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Search & Filter Controls */}
				<div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
					<div className="relative flex-1 w-full">
						<Search className="w-3.5 h-3.5 text-[#667085] absolute left-3 top-2.5 z-10" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search tasks..."
							className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#0B0E13] border border-white/10 text-xs text-[#F4F7F5] placeholder:text-[#667085] focus:outline-none focus:border-gold"
						/>
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto">
						<div className="w-1/2 sm:w-36">
							<AppSelect
								value={selectedProject}
								onChange={(val) => setSelectedProject(val)}
								options={projectOptions}
								placeholder="All Projects"
								triggerClassName="h-8 text-xs bg-[#0B0E13] border-white/10"
							/>
						</div>

						<div className="w-1/2 sm:w-32">
							<AppSelect
								value={selectedPriority}
								onChange={(val) => setSelectedPriority(val)}
								options={PRIORITY_OPTIONS}
								placeholder="All Priorities"
								triggerClassName="h-8 text-xs bg-[#0B0E13] border-white/10"
							/>
						</div>
					</div>
				</div>

				{/* Tasks List */}
				<div className="overflow-y-auto flex-1 space-y-2 pr-1 max-h-[50vh]">
					{filteredTasks.length > 0 ? (
						filteredTasks.map((t) => {
							const proj = projects.find((p) => p.id === t.projectId);

							return (
								<button
									key={t.id}
									type="button"
									onClick={() => {
										onSelectTask(t);
										onClose();
									}}
									className="w-full p-3 rounded-xl bg-[#0B0E13] border border-white/10 hover:border-gold/50 text-left transition-all space-y-1.5 cursor-pointer group"
								>
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<span
												className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
													t.priority === "Urgent" || t.priority === "High"
														? "bg-rose-500/10 text-rose-400 border-rose-500/20"
														: "bg-white/5 text-[#9AA4B2] border-white/10"
												}`}
											>
												{t.priority || "Medium"}
											</span>
											{proj && (
												<span className="text-[10px] text-gold font-mono flex items-center gap-1">
													<FolderKanban className="w-3 h-3" /> {proj.name}
												</span>
											)}
										</div>
										<ChevronRight className="w-3.5 h-3.5 text-[#667085] group-hover:text-gold transition-colors" />
									</div>

									<h4 className="text-xs font-extrabold text-[#F4F7F5] group-hover:text-gold transition-colors">
										{t.title}
									</h4>

									{t.description && (
										<p className="text-[11px] text-[#9AA4B2] line-clamp-1 leading-normal">
											{t.description}
										</p>
									)}

									<div className="flex items-center justify-between text-[10px] text-[#667085] font-mono pt-1 border-t border-white/5">
										<span>Status: <strong className="text-[#9AA4B2]">{t.status || "Assigned"}</strong></span>
										<span>Due: <strong className="text-[#9AA4B2]">{t.deadline ? new Date(t.deadline).toLocaleDateString() : "Flexible"}</strong></span>
									</div>
								</button>
							);
						})
					) : (
						<div className="py-10 text-center text-xs text-[#9AA4B2] space-y-1">
							<AlertCircle className="w-7 h-7 text-[#667085] mx-auto" />
							<p className="font-bold text-[#F4F7F5]">No matching tasks found</p>
							<p className="text-[11px] text-[#667085]">Adjust your search query or priority filters.</p>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="pt-2 border-t border-white/10 flex items-center justify-end shrink-0">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-1.5 rounded-lg bg-[#0B0E13] border border-white/10 text-xs font-bold text-[#9AA4B2] hover:text-white"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
}
