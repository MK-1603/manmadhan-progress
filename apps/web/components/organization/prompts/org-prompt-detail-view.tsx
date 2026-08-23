"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	BookOpen, ArrowLeft, Star, Play, Copy, Check, Trash2,
	Variable, Loader2, Sparkles, AlertCircle
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";
import { useConfirm } from "@/hooks/use-confirm";

interface OrgPromptDetailViewProps {
	promptId: string;
	basePath: string;
}

export function OrgPromptDetailView({ promptId, basePath }: OrgPromptDetailViewProps) {
	const router = useRouter();
	const { confirm } = useConfirm();
	const [prompt, setPrompt] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		const fetchDetail = async () => {
			try {
				const res = await apiClient.get(`/org/prompts/${promptId}`);
				if (res.data.success) {
					setPrompt(res.data.data);
				} else {
					setError(res.data.error || "Prompt not found");
				}
			} catch (err: any) {
				setError(err?.response?.data?.error || "Failed to load prompt details");
			} finally {
				setLoading(false);
			}
		};
		fetchDetail();
	}, [promptId]);

	const handleToggleFavorite = async () => {
		try {
			const res = await apiClient.post(`/org/prompts/${promptId}/favorite`);
			if (res.data.success) {
				setPrompt((prev: any) => ({ ...prev, isFavorite: !prev.isFavorite }));
			}
		} catch (err) {
			console.error("Favorite toggle error:", err);
		}
	};

	const handleDelete = async () => {
		const ok = await confirm({
			title: "Delete Prompt",
			description: "Are you sure you want to delete this prompt? This action cannot be undone.",
			confirmLabel: "Delete Prompt",
			variant: "destructive",
		});
		if (!ok) return;
		try {
			const res = await apiClient.delete(`/org/prompts/${promptId}`);
			if (res.data.success) {
				router.push(`${basePath}/prompt-library`);
			}
		} catch (err) {
			console.error("Delete error:", err);
		}
	};

	const handleCopy = () => {
		if (!prompt) return;
		navigator.clipboard.writeText(prompt.content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleUseInAI = async () => {
		if (!prompt) return;
		// Record usage
		apiClient.post(`/org/prompts/${promptId}/use`).catch(() => undefined);
		// Navigate to AI Builder
		router.push(`${basePath}/ai-builder`);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
				<Loader2 className="w-8 h-8 animate-spin text-gold" />
			</div>
		);
	}

	if (error || !prompt) {
		return (
			<div className="p-8 max-w-2xl mx-auto space-y-4 text-center">
				<AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
				<h2 className="text-xl font-bold text-foreground">Prompt Not Found</h2>
				<p className="text-sm text-muted-foreground">{error}</p>
				<button
					type="button"
					onClick={() => router.push(`${basePath}/prompt-library`)}
					className="px-4 py-2 bg-gold text-black font-semibold rounded-xl text-xs"
				>
					Back to Prompt Library
				</button>
			</div>
		);
	}

	return (
		<div className="w-full min-h-screen px-6 lg:px-10 py-7 lg:py-9 space-y-8 max-w-5xl">
			{/* Page Header */}
			<div className="flex items-center justify-between border-b border-border/40 pb-5">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => router.push(`${basePath}/prompt-library`)}
						className="p-2 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors"
					>
						<ArrowLeft className="w-5 h-5" />
					</button>

					<div>
						<div className="flex items-center gap-2 mb-1">
							<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold/15 text-gold dark:text-[#F0BC2B]">
								{prompt.category}
							</span>
							{prompt.isBuiltin && (
								<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">
									System Built-in
								</span>
							)}
						</div>
						<h1 className="text-2xl font-extrabold text-foreground tracking-tight">
							{prompt.title}
						</h1>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={handleToggleFavorite}
						className="p-2.5 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-gold rounded-xl transition-colors"
						title="Toggle Favorite"
					>
						<Star className={`w-5 h-5 ${prompt.isFavorite ? "fill-gold text-gold" : ""}`} />
					</button>

					<button
						type="button"
						onClick={handleUseInAI}
						className="px-5 py-2.5 bg-gold hover:bg-[#F0BC2B] text-black font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm"
					>
						<Play className="w-4 h-4 fill-black" /> Use in AI Builder
					</button>
				</div>
			</div>

			{/* Main Details & Content */}
			<div className="space-y-6">
				<PremiumCard className="space-y-4">
					<h3 className="text-sm font-bold text-foreground">Description</h3>
					<p className="text-sm text-muted-foreground leading-relaxed">
						{prompt.description || "No specific description provided for this prompt template."}
					</p>

					<div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
						<span>Used {prompt.usageCount || 0} times</span>
						<span>Created: {new Date(prompt.createdAt).toLocaleDateString()}</span>
					</div>
				</PremiumCard>

				{/* Prompt Template Body */}
				<PremiumCard className="space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
							<Sparkles className="w-4 h-4 text-gold dark:text-[#E3AA18]" /> Prompt Template Body
						</h3>

						<button
							type="button"
							onClick={handleCopy}
							className="px-3 py-1.5 bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground rounded-lg flex items-center gap-1.5 transition-colors"
						>
							{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
							<span>{copied ? "Copied" : "Copy Template"}</span>
						</button>
					</div>

					<div className="p-4 bg-muted/20 border border-border/50 rounded-xl text-sm font-mono text-foreground whitespace-pre-wrap leading-relaxed">
						{prompt.content}
					</div>
				</PremiumCard>

				{/* Configured Variables */}
				<PremiumCard className="space-y-4">
					<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
						<Variable className="w-4 h-4 text-gold dark:text-[#E3AA18]" /> Variable Parameters ({prompt.variables?.length || 0})
					</h3>

					{(!prompt.variables || prompt.variables.length === 0) ? (
						<p className="text-xs text-muted-foreground">No variables defined for this prompt template.</p>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							{prompt.variables.map((v: any) => (
								<div
									key={v.name}
									className="p-3 bg-muted/20 border border-border/50 rounded-xl space-y-1 text-xs"
								>
									<div className="font-mono font-bold text-gold">{`{{${v.name}}}`}</div>
									<div className="text-muted-foreground">{v.label || v.name}</div>
									{v.default && (
										<div className="text-[11px] text-muted-foreground/80 font-mono">
											Default: {v.default}
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</PremiumCard>

				{!prompt.isBuiltin && (
					<div className="pt-4 flex justify-end">
						<button
							type="button"
							onClick={handleDelete}
							className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
						>
							<Trash2 className="w-4 h-4" /> Delete Prompt Template
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
