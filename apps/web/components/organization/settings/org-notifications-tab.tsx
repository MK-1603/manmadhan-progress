"use client";

import { useState } from "react";
import { Bell, Check, Save, Shield, FolderKanban, CheckSquare, FileText, Users, AlertTriangle } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

export function OrgNotificationsTab() {
	const [prefs, setPrefs] = useState({
		taskUpdates: true,
		projectUpdates: true,
		approvals: true,
		deadlineAlerts: true,
		documentUpdates: true,
		peopleUpdates: true,
		systemNotifications: true,
	});

	const [saved, setSaved] = useState(false);

	const categories = [
		{ key: "taskUpdates", label: "Task Updates & Assignment Alerts", description: "Receive notifications when tasks are assigned, accepted, or submitted for verification.", icon: CheckSquare },
		{ key: "projectUpdates", label: "Project & Stage Progress", description: "Get notified when projects progress through 8-stage milestones or mandate changes occur.", icon: FolderKanban },
		{ key: "approvals", label: "Approval & Verification Requests", description: "Alerts when your authorization is required for milestone approvals or deadline extensions.", icon: Shield },
		{ key: "deadlineAlerts", label: "Deadline Warning Alerts", description: "Urgent alerts for upcoming task and milestone due dates.", icon: AlertTriangle },
		{ key: "documentUpdates", label: "Document & Knowledge Submissions", description: "Notifications when team members upload PRDs, TRDs, or executive notes.", icon: FileText },
		{ key: "peopleUpdates", label: "People & Member Activity", description: "Updates regarding team member role changes and workspace joins.", icon: Users },
		{ key: "systemNotifications", label: "System Announcements & Maintenance", description: "Important system status and operational announcements.", icon: Bell },
	];

	const toggle = (key: keyof typeof prefs) => {
		setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const handleSave = () => {
		setSaved(true);
		setTimeout(() => setSaved(false), 3000);
	};

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
					<Bell className="w-5 h-5 text-gold dark:text-[#E3AA18]" /> Notification Preferences
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Customize in-app and operational notification channels for your organization workspace.
				</p>
			</div>

			<PremiumCard>
				<div className="space-y-4">
					{categories.map((cat) => {
						const Icon = cat.icon;
						const isChecked = prefs[cat.key as keyof typeof prefs];
						return (
							<div
								key={cat.key}
								className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-xl"
							>
								<div className="flex items-start gap-3.5 pr-4">
									<div className="p-2.5 bg-gold/10 text-gold dark:text-[#F0BC2B] rounded-xl shrink-0">
										<Icon className="w-4 h-4" />
									</div>
									<div className="space-y-0.5">
										<span className="text-sm font-semibold text-foreground block">{cat.label}</span>
										<p className="text-xs text-muted-foreground">{cat.description}</p>
									</div>
								</div>

								<button
									type="button"
									onClick={() => toggle(cat.key as keyof typeof prefs)}
									className={`w-12 h-6 rounded-full transition-colors relative p-1 shrink-0 ${
										isChecked ? "bg-gold" : "bg-muted"
									}`}
								>
									<div
										className={`w-4 h-4 rounded-full bg-black transition-transform ${
											isChecked ? "translate-x-6" : "translate-x-0"
										}`}
									/>
								</button>
							</div>
						);
					})}
				</div>

				{saved && (
					<div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-semibold flex items-center gap-2">
						<Check className="w-4 h-4" /> Notification preferences saved.
					</div>
				)}

				<div className="pt-4 flex justify-end">
					<button
						type="button"
						onClick={handleSave}
						className="px-5 py-2.5 bg-gold hover:bg-[#F0BC2B] text-black text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
					>
						<Save className="w-4 h-4" /> Save Preferences
					</button>
				</div>
			</PremiumCard>
		</div>
	);
}
