"use client";

import { useState } from "react";
import { Sliders, Layout, Clock, Calendar, Globe, Save, Loader2, Check } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

export function CEOPreferencesTab() {
	const [landingPage, setLandingPage] = useState("dashboard");
	const [timeFormat, setTimeFormat] = useState("24h");
	const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
	const [language, setLanguage] = useState("en");

	const [saving, setSaving] = useState(false);
	const [success, setSuccess] = useState("");

	const isDirty = landingPage !== "dashboard" || timeFormat !== "24h" || dateFormat !== "DD/MM/YYYY" || language !== "en";

	const handleSave = async () => {
		setSaving(true);
		await new Promise(resolve => setTimeout(resolve, 400));
		setSaving(false);
		setSuccess("CEO Preferences saved.");
		setTimeout(() => setSuccess(""), 4000);
	};

	const handleCancel = () => {
		setLandingPage("dashboard");
		setTimeFormat("24h");
		setDateFormat("DD/MM/YYYY");
		setLanguage("en");
	};

	return (
		<div className="space-y-6 max-w-3xl">
			<div>
				<h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
					<Sliders className="w-5 h-5 text-gold dark:text-[#F0BC2B]" /> CEO Preferences
				</h2>
				<p className="text-xs text-muted-foreground mt-1">
					Customize your personal interface, default view, and regional formatting preferences.
				</p>
			</div>

			{success && (
				<div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-500 flex items-center gap-2">
					<Check className="w-4 h-4 shrink-0" /> {success}
				</div>
			)}

			<PremiumCard className="p-5 space-y-5 bg-card border-border/80 rounded-xl">
				<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Interface & Personal Workflow</h3>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
					{/* Default Landing Page */}
					<div className="space-y-1.5">
						<label className="text-xs font-bold text-foreground flex items-center gap-2">
							<Layout className="w-3.5 h-3.5 text-gold" /> Default Landing View
						</label>
						<select
							value={landingPage}
							onChange={(e) => setLandingPage(e.target.value)}
							className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs font-medium focus:border-gold outline-none"
						>
							<option value="dashboard">Executive Dashboard</option>
							<option value="focus">Focus Execution Workspace</option>
							<option value="my-work">My Work Tasks</option>
							<option value="projects">Projects Overview</option>
						</select>
					</div>

					{/* Time Format */}
					<div className="space-y-1.5">
						<label className="text-xs font-bold text-foreground flex items-center gap-2">
							<Clock className="w-3.5 h-3.5 text-gold" /> Time Display Format
						</label>
						<select
							value={timeFormat}
							onChange={(e) => setTimeFormat(e.target.value)}
							className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs font-medium focus:border-gold outline-none"
						>
							<option value="24h">24-hour (14:30)</option>
							<option value="12h">12-hour (02:30 PM)</option>
						</select>
					</div>

					{/* Date Format */}
					<div className="space-y-1.5">
						<label className="text-xs font-bold text-foreground flex items-center gap-2">
							<Calendar className="w-3.5 h-3.5 text-gold" /> Date Format
						</label>
						<select
							value={dateFormat}
							onChange={(e) => setDateFormat(e.target.value)}
							className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs font-medium focus:border-gold outline-none"
						>
							<option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
							<option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
							<option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
						</select>
					</div>

					{/* Language */}
					<div className="space-y-1.5">
						<label className="text-xs font-bold text-foreground flex items-center gap-2">
							<Globe className="w-3.5 h-3.5 text-gold" /> Preferred Language
						</label>
						<select
							value={language}
							onChange={(e) => setLanguage(e.target.value)}
							className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs font-medium focus:border-gold outline-none"
						>
							<option value="en">English (US / Global)</option>
						</select>
					</div>
				</div>
			</PremiumCard>

			{/* Unsaved Banner */}
			{isDirty && (
				<div className="p-4 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-between shadow-md">
					<span className="text-xs font-bold text-gold">You have unsaved preference changes</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCancel}
							className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSave}
							disabled={saving}
							className="px-4 py-1.5 rounded-lg bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold transition-colors flex items-center gap-1.5"
						>
							{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
							Save Changes
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
