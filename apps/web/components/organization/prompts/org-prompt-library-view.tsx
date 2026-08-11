"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	BookOpen, Plus, Search, Star, Sparkles, Variable, Eye,
	Loader2, Check, ArrowRight, Filter
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";

interface OrgPromptLibraryViewProps {
	basePath: string;
}

export function OrgPromptLibraryView({ basePath }: OrgPromptLibraryViewProps) {
	const router = useRouter();
	const [prompts, setPrompts] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("All");

	const categories = [
		"All", "Projects", "Tasks", "Documents", "Reports",
		"Architecture", "Technical", "Workflow", "Management", "Analysis", "Writing"
	];

	const fetchPrompts = async () => {
		try {
			setLoading(true);
			const res = await apiClient.get("/org/prompts", {
				params: {
					category: selectedCategory,
					search: search || undefined,
				},
			});
			if (res.data.success) {
				setPrompts(res.data.data || []);
			}
		} catch (err) {
			console.error("Failed to fetch prompts:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPrompts();
	}, [selectedCategory]);

	const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			const res = await apiClient.post(`/org/prompts/${id}/favorite`);
			if (res.data.success) {
				setPrompts((prev) =>
					prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)),
				);
			}
		} catch (err) {
			console.error("Favorite toggle error:", err);
		}
	};

	const filteredPrompts = prompts.filter((p) => {
		if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
		if (search.trim()) {
			const q = search.toLowerCase();
			return (
				p.title.toLowerCase().includes(q) ||
				(p.description || "").toLowerCase().includes(q) ||
				p.content.toLowerCase().includes(q)
			);
		}
		return true;
	});

	return (
		<div className="w-full min-h-screen px-6 lg:px-10 py-7 lg:py-9 space-y-8">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
				<div>
					<h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
						<BookOpen className="w-7 h-7 text-gold dark:text-[#E3AA18]" /> Organization Prompt Library
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Enterprise prompt repository with variable resolution and execution context.
					</p>
				</div>

				<Link
					href={`${basePath}/prompts/new`}
					className="px-5 py-2.5 bg-gold hover:bg-[#F0BC2B] text-black text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors shrink-0 shadow-sm"
				>
					<Plus className="w-4 h-4" />
					<span>Create New Prompt</span>
				</Link>
			</div>

			{/* Search & Filter Controls */}
			<div className="space-y-4">
				<div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
					<div className="relative w-full sm:w-80">
						<Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search prompts by title or keyword..."
							className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
						/>
					</div>

					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<Filter className="w-3.5 h-3.5" />
						<span>Showing {filteredPrompts.length} prompts</span>
					</div>
				</div>

				{/* Category Pill Bar */}
				<div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
					{categories.map((cat) => {
						const isActive = selectedCategory === cat;
						return (
							<button
								key={cat}
								type="button"
								onClick={() => setSelectedCategory(cat)}
								className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
									isActive
										? "bg-gold text-black shadow-xs"
										: "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
								}`}
							>
								{cat}
							</button>
						);
					})}
				</div>
			</div>

			{/* Prompts Card Grid */}
			{loading ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="w-8 h-8 animate-spin text-gold" />
				</div>
			) : filteredPrompts.length === 0 ? (
				<div className="text-center py-16 p-8 bg-card border border-border/50 rounded-2xl space-y-3">
					<BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
					<h3 className="text-base font-bold text-foreground">No Prompts Found</h3>
					<p className="text-xs text-muted-foreground max-w-sm mx-auto">
						No prompts match the selected category or search filter. Create your first prompt!
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredPrompts.map((prompt) => (
						<PremiumCard
							key={prompt.id}
							onClick={() => router.push(`${basePath}/prompts/${prompt.id}`)}
							className="cursor-pointer hover:border-gold/40 transition-all flex flex-col justify-between space-y-4 group"
						>
							<div className="space-y-3">
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gold/15 text-gold dark:text-[#F0BC2B]">
											{prompt.category}
										</span>
										{prompt.isBuiltin && (
											<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">
												System Built-in
											</span>
										)}
									</div>

									<button
										type="button"
										onClick={(e) => handleToggleFavorite(prompt.id, e)}
										className="p-1 text-muted-foreground hover:text-gold transition-colors"
									>
										<Star
											className={`w-4 h-4 ${
												prompt.isFavorite ? "fill-gold text-gold" : ""
											}`}
										/>
									</button>
								</div>

								<div>
									<h3 className="text-base font-bold text-foreground group-hover:text-gold transition-colors line-clamp-1">
										{prompt.title}
									</h3>
									<p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
										{prompt.description || prompt.content}
									</p>
								</div>
							</div>

							<div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
								<div className="flex items-center gap-3">
									<span className="flex items-center gap-1 font-mono">
										<Variable className="w-3.5 h-3.5 text-gold" /> {prompt.variables?.length || 0} vars
									</span>
									<span>Used {prompt.usageCount || 0}x</span>
								</div>

								<span className="text-gold dark:text-[#F0BC2B] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
									<span>Open</span> <ArrowRight className="w-3.5 h-3.5" />
								</span>
							</div>
						</PremiumCard>
					))}
				</div>
			)}
		</div>
	);
}
