"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft, Sparkles, Variable, Save, Loader2, AlertCircle } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";

interface OrgNewPromptViewProps {
	basePath: string;
}

export function OrgNewPromptView({ basePath }: OrgNewPromptViewProps) {
	const router = useRouter();
	const [title, setTitle] = useState("");
	const [category, setCategory] = useState("Projects");
	const [description, setDescription] = useState("");
	const [content, setContent] = useState("");
	const [variables, setVariables] = useState<Array<{ name: string; label: string; default: string }>>([]);

	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const categories = [
		"Projects", "Tasks", "Documents", "Reports",
		"Architecture", "Technical", "Workflow", "Management", "Analysis", "Writing"
	];

	// Auto-detect {{VARIABLE_NAME}} tokens in prompt content
	useEffect(() => {
		const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
		const matches = new Set<string>();
		let match;
		while ((match = regex.exec(content)) !== null) {
			matches.add(match[1]);
		}

		const updatedVars = Array.from(matches).map((varName) => {
			const existing = variables.find((v) => v.name === varName);
			return (
				existing || {
					name: varName,
					label: varName.replace(/_/g, " "),
					default: "",
				}
			);
		});
		setVariables(updatedVars);
	}, [content]);

	const handleVariableDefaultChange = (name: string, defaultVal: string) => {
		setVariables((prev) =>
			prev.map((v) => (v.name === name ? { ...v, default: defaultVal } : v)),
		);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || !content.trim()) {
			setError("Title and prompt content are required.");
			return;
		}

		setSaving(true);
		setError("");
		try {
			const res = await apiClient.post("/org/prompts", {
				title: title.trim(),
				category,
				description: description.trim() || null,
				content: content.trim(),
				variables,
			});

			if (res.data.success) {
				router.push(`${basePath}/prompts/${res.data.data.id}`);
			} else {
				setError(res.data.error || "Failed to create prompt");
			}
		} catch (err: any) {
			setError(err?.response?.data?.error || "Failed to create prompt");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="w-full min-h-screen px-6 lg:px-10 py-7 lg:py-9 space-y-8 max-w-4xl">
			{/* Page Header */}
			<div className="flex items-center gap-4 border-b border-border/40 pb-5">
				<button
					type="button"
					onClick={() => router.push(`${basePath}/prompt-library`)}
					className="p-2 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors"
				>
					<ArrowLeft className="w-5 h-5" />
				</button>

				<div>
					<h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
						<Plus className="w-6 h-6 text-gold dark:text-[#E3AA18]" /> Create Enterprise Prompt
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Define prompt template with dynamic variable parameters.
					</p>
				</div>
			</div>

			{error && (
				<div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm">
					<AlertCircle className="w-4 h-4 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			<form onSubmit={handleSave} className="space-y-6">
				<PremiumCard className="space-y-5">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
						<div className="md:col-span-2">
							<label className="text-xs font-semibold text-muted-foreground block mb-1.5">
								Prompt Title *
							</label>
							<input
								type="text"
								required
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="e.g. Generate System TRD Document"
								className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
							/>
						</div>

						<div>
							<label className="text-xs font-semibold text-muted-foreground block mb-1.5">
								Category *
							</label>
							<select
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
							>
								{categories.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
						</div>
					</div>

					<div>
						<label className="text-xs font-semibold text-muted-foreground block mb-1.5">
							Description
						</label>
						<input
							type="text"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Short summary of what this prompt produces..."
							className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
						/>
					</div>

					<div>
						<label className="text-xs font-semibold text-muted-foreground block mb-1.5 flex items-center justify-between">
							<span>Prompt Template Content *</span>
							<span className="text-[11px] text-gold font-normal">
								Use {"{{VARIABLE_NAME}}"} syntax for inputs
							</span>
						</label>
						<textarea
							rows={8}
							required
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder={"Please analyze the feature requirement {{FEATURE_NAME}} for tech stack {{TECH_STACK}}.\n\nInclude architecture diagram and task breakdown."}
							className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gold/30 resize-y"
						/>
					</div>
				</PremiumCard>

				{/* Detected Variables Section */}
				<PremiumCard className="space-y-4">
					<div className="flex items-center justify-between border-b border-border/40 pb-3">
						<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
							<Variable className="w-4 h-4 text-gold dark:text-[#E3AA18]" /> Detected Variables ({variables.length})
						</h3>
						<span className="text-xs text-muted-foreground">
							Auto-extracted from {"{{KEY}}"} tokens
						</span>
					</div>

					{variables.length === 0 ? (
						<p className="text-xs text-muted-foreground italic">
							Type variables in your content using double curly braces (e.g. {"{{PROJECT_NAME}}"}) to configure inputs.
						</p>
					) : (
						<div className="space-y-3">
							{variables.map((v) => (
								<div
									key={v.name}
									className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/20 border border-border/50 rounded-xl items-center text-xs"
								>
									<div className="font-mono font-bold text-gold">{`{{${v.name}}}`}</div>
									<div>
										<input
											type="text"
											value={v.default}
											onChange={(e) => handleVariableDefaultChange(v.name, e.target.value)}
											placeholder="Default placeholder value..."
											className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
										/>
									</div>
									<span className="text-muted-foreground text-[11px]">Default Parameter Value</span>
								</div>
							))}
						</div>
					)}
				</PremiumCard>

				<div className="flex justify-end gap-3 pt-2">
					<button
						type="button"
						onClick={() => router.push(`${basePath}/prompt-library`)}
						className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold rounded-xl transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={saving}
						className="px-5 py-2.5 bg-gold hover:bg-[#F0BC2B] text-black text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
					>
						{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
						<span>Save & Publish Prompt</span>
					</button>
				</div>
			</form>
		</div>
	);
}
