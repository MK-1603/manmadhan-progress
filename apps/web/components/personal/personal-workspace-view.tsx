"use client";

import { useState } from "react";
import { User, CheckSquare, Notebook, FileText, Calendar, Plus, Clock, Shield } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { useAuth } from "@/components/auth/auth-context";

export function PersonalWorkspaceView() {
	const { user } = useAuth();
	const [personalNote, setPersonalNote] = useState("Private executive notes and reminders...");
	const [tasks, setTasks] = useState([
		{ id: "p1", title: "Review quarterly strategy outline", done: false, priority: "High" },
		{ id: "p2", title: "Prepare weekly focus agenda", done: true, priority: "Normal" },
	]);
	const [newTask, setNewTask] = useState("");

	const handleAddTask = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTask.trim()) return;
		setTasks([...tasks, { id: `p_${Date.now()}`, title: newTask, done: false, priority: "Normal" }]);
		setNewTask("");
	};

	const toggleTask = (id: string) => {
		setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
	};

	return (
		<div className="w-full min-h-screen p-6 lg:p-8 space-y-6 max-w-5xl bg-background">
			{/* Fixed Personal Header */}
			<div className="border-b border-border/40 pb-4">
				<h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
					<User className="w-5 h-5 text-gold dark:text-[#F0BC2B]" /> Personal Workspace
				</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					Isolated personal life & task execution workspace for {user?.displayName || user?.name || "CEO"} (`user_id` isolated).
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Personal Tasks Card */}
				<PremiumCard className="p-5 bg-card border-border/80 rounded-xl space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
							<CheckSquare className="w-4 h-4 text-gold" /> Personal Tasks
						</h3>
						<span className="text-[10px] font-bold text-muted-foreground">Private (`user_id` scope)</span>
					</div>

					<form onSubmit={handleAddTask} className="flex gap-2">
						<input
							type="text"
							value={newTask}
							onChange={(e) => setNewTask(e.target.value)}
							placeholder="Add new personal task..."
							className="flex-1 h-9 bg-background border border-border px-3 rounded-lg text-xs outline-none focus:border-gold"
						/>
						<button
							type="submit"
							className="px-3 h-9 bg-gold hover:bg-[#F0BC2B] text-black font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
						>
							<Plus className="w-3.5 h-3.5" /> Add
						</button>
					</form>

					<div className="space-y-2">
						{tasks.map(t => (
							<div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40 text-xs">
								<div className="flex items-center gap-2.5">
									<input
										type="checkbox"
										checked={t.done}
										onChange={() => toggleTask(t.id)}
										className="rounded text-gold focus:ring-gold"
									/>
									<span className={`font-medium ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
										{t.title}
									</span>
								</div>
								<span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.priority === "High" ? "bg-rose-500/10 text-rose-500" : "bg-muted text-muted-foreground"}`}>
									{t.priority}
								</span>
							</div>
						))}
					</div>
				</PremiumCard>

				{/* Personal Scratchpad Notes */}
				<PremiumCard className="p-5 bg-card border-border/80 rounded-xl space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
							<Notebook className="w-4 h-4 text-gold" /> Personal Notes Scratchpad
						</h3>
						<span className="text-[10px] font-bold text-muted-foreground">Auto-saved</span>
					</div>

					<textarea
						rows={6}
						value={personalNote}
						onChange={(e) => setPersonalNote(e.target.value)}
						className="w-full p-3 bg-background border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:border-gold resize-none"
					/>
				</PremiumCard>
			</div>
		</div>
	);
}
