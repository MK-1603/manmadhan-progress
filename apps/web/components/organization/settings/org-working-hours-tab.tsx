"use client";

import { useState } from "react";
import { Clock, ShieldAlert, Moon, Sun, CheckCircle2, Save, AlertTriangle } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

interface OrgWorkingHoursTabProps {
	userRole: string;
}

export function OrgWorkingHoursTab({ userRole }: OrgWorkingHoursTabProps) {
	const [strictEnforcement, setStrictEnforcement] = useState(true);
	const [allowNightOverride, setAllowNightOverride] = useState(false);
	const [saved, setSaved] = useState(false);

	const isCEO = userRole === "CEO";

	const handleSave = () => {
		setSaved(true);
		setTimeout(() => setSaved(false), 3000);
	};

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
					<Clock className="w-5 h-5 text-gold dark:text-[#E3AA18]" /> Working Hours & Operational Schedule
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Define daily organizational execution windows and mandatory night off-hours enforcement.
				</p>
			</div>

			{/* Operational Window Overview */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
				<PremiumCard className="border-emerald-500/20 bg-emerald-500/5">
					<div className="flex items-center gap-3 mb-3">
						<div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
							<Sun className="w-6 h-6" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-foreground">Operational Execution Window</h3>
							<p className="text-xs text-muted-foreground">Active Task & Project Submission Window</p>
						</div>
					</div>
					<div className="text-2xl font-black text-emerald-500 font-mono tracking-tight">
						04:00 — 23:00 IST
					</div>
					<p className="text-xs text-muted-foreground mt-2">
						Tasks, milestone submissions, approvals, and leaderboard tracking active.
					</p>
				</PremiumCard>

				<PremiumCard className="border-rose-500/20 bg-rose-500/5">
					<div className="flex items-center gap-3 mb-3">
						<div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
							<Moon className="w-6 h-6" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-foreground">Mandatory System OFF Window</h3>
							<p className="text-xs text-muted-foreground">System Lockout & Rest Period</p>
						</div>
					</div>
					<div className="text-2xl font-black text-rose-500 font-mono tracking-tight">
						23:00 — 04:00 IST
					</div>
					<p className="text-xs text-muted-foreground mt-2">
						System submissions restricted to enforce healthy work-rest boundaries.
					</p>
				</PremiumCard>
			</div>

			{/* Enforcement Controls */}
			<PremiumCard>
				<h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
					<ShieldAlert className="w-4 h-4 text-gold dark:text-[#E3AA18]" /> Enforcement & Compliance Rules
				</h3>

				<div className="space-y-4">
					<div className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-xl">
						<div className="space-y-1 pr-4">
							<span className="text-sm font-semibold text-foreground block">Strict Lockout Enforcement</span>
							<p className="text-xs text-muted-foreground">
								Automatically block non-urgent task and project submissions between 23:00 and 04:00.
							</p>
						</div>
						<button
							type="button"
							disabled={!isCEO}
							onClick={() => setStrictEnforcement(!strictEnforcement)}
							className={`w-12 h-6 rounded-full transition-colors relative p-1 shrink-0 ${
								strictEnforcement ? "bg-gold" : "bg-muted"
							}`}
						>
							<div
								className={`w-4 h-4 rounded-full bg-black transition-transform ${
									strictEnforcement ? "translate-x-6" : "translate-x-0"
								}`}
							/>
						</button>
					</div>

					<div className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-xl">
						<div className="space-y-1 pr-4">
							<span className="text-sm font-semibold text-foreground block">CEO Emergency Override</span>
							<p className="text-xs text-muted-foreground">
								Allow CEOs to force-bypass night lockout for critical security hotfixes or mandates.
							</p>
						</div>
						<button
							type="button"
							disabled={!isCEO}
							onClick={() => setAllowNightOverride(!allowNightOverride)}
							className={`w-12 h-6 rounded-full transition-colors relative p-1 shrink-0 ${
								allowNightOverride ? "bg-gold" : "bg-muted"
							}`}
						>
							<div
								className={`w-4 h-4 rounded-full bg-black transition-transform ${
									allowNightOverride ? "translate-x-6" : "translate-x-0"
								}`}
							/>
						</button>
					</div>
				</div>

				{saved && (
					<div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-semibold flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4" /> Working hours preferences saved.
					</div>
				)}

				{isCEO && (
					<div className="pt-4 flex justify-end">
						<button
							type="button"
							onClick={handleSave}
							className="px-5 py-2.5 bg-gold hover:bg-[#F0BC2B] text-black text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
						>
							<Save className="w-4 h-4" /> Save Schedule Preferences
						</button>
					</div>
				)}
			</PremiumCard>
		</div>
	);
}
