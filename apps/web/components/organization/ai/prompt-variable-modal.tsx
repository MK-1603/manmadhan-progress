"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, Play, Copy, Check } from "lucide-react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";

interface PromptVariableModalProps {
	isOpen: boolean;
	onClose: () => void;
	prompt: any;
	onInjectPrompt: (resolvedText: string) => void;
}

export function PromptVariableModal({
	isOpen,
	onClose,
	prompt,
	onInjectPrompt,
}: PromptVariableModalProps) {
	const [values, setValues] = useState<Record<string, string>>({});

	useEffect(() => {
		if (prompt?.variables) {
			const initial: Record<string, string> = {};
			for (const v of prompt.variables) {
				initial[v.name] = v.default || "";
			}
			setValues(initial);
		} else {
			setValues({});
		}
	}, [prompt]);

	if (!prompt) return null;

	const handleValueChange = (name: string, val: string) => {
		setValues((prev) => ({ ...prev, [name]: val }));
	};

	const generateResolvedContent = () => {
		let text = prompt.content || "";
		Object.entries(values).forEach(([key, val]) => {
			const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
			text = text.replace(regex, val || `[${key}]`);
		});
		return text;
	};

	const handleRun = () => {
		const resolved = generateResolvedContent();
		onInjectPrompt(resolved);
		onClose();
	};

	return (
		<ResponsiveModal isOpen={isOpen} onClose={onClose}>
			<div className="space-y-5 p-4">
				<div className="p-3.5 bg-gold/10 border border-gold/20 rounded-xl space-y-1">
					<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
						<Sparkles className="w-4 h-4 text-gold dark:text-[#F0BC2B]" /> {prompt.title}
					</h3>
					<p className="text-xs text-muted-foreground">{prompt.description}</p>
				</div>

				<div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
					{(!prompt.variables || prompt.variables.length === 0) ? (
						<p className="text-xs text-muted-foreground">No variables required for this prompt.</p>
					) : (
						prompt.variables.map((varItem: any) => (
							<div key={varItem.name} className="space-y-1.5">
								<label className="text-xs font-semibold text-foreground flex items-center justify-between">
									<span>{varItem.label || varItem.name}</span>
									<span className="text-[10px] font-mono text-muted-foreground">{`{{${varItem.name}}}`}</span>
								</label>
								<input
									type="text"
									value={values[varItem.name] || ""}
									onChange={(e) => handleValueChange(varItem.name, e.target.value)}
									placeholder={varItem.default || `Enter ${varItem.name}...`}
									className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
								/>
							</div>
						))
					)}
				</div>

				{/* Preview */}
				<div className="space-y-1.5">
					<label className="text-xs font-semibold text-muted-foreground block">Resolved Prompt Preview</label>
					<div className="p-3 bg-muted/30 border border-border/50 rounded-xl text-xs font-mono text-foreground whitespace-pre-wrap max-h-36 overflow-y-auto">
						{generateResolvedContent()}
					</div>
				</div>

				<div className="pt-2 flex justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleRun}
						className="px-5 py-2 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
					>
						<Play className="w-3.5 h-3.5 fill-black" /> Insert into AI Builder
					</button>
				</div>
			</div>
		</ResponsiveModal>
	);
}
