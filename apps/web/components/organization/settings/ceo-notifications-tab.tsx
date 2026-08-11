"use client";

import { useState } from "react";
import { Bell, Check, Save, Loader2 } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

export function CEONotificationsTab() {
	const [taskAssigned, setTaskAssigned] = useState(true);
	const [taskSubmitted, setTaskSubmitted] = useState(true);
	const [approvalRequired, setApprovalRequired] = useState(true);
	const [deadlineReminder, setDeadlineReminder] = useState(true);
	const [projectUpdates, setProjectUpdates] = useState(true);
	const [systemNotifications, setSystemNotifications] = useState(true);

	const [saving, setSaving] = useState(false);
	const [success, setSuccess] = useState("");

	const isDirty = !taskAssigned || !taskSubmitted || !approvalRequired || !deadlineReminder || !projectUpdates || !systemNotifications;

	const handleSave = async () => {
		setSaving(true);
		await new Promise(resolve => setTimeout(resolve, 400));
		setSaving(false);
		setSuccess("Personal notification preferences saved.");
		setTimeout(() => setSuccess(""), 4000);
	};

	const handleCancel = () => {
		setTaskAssigned(true);
		setTaskSubmitted(true);
		setApprovalRequired(true);
		setDeadlineReminder(true);
		setProjectUpdates(true);
		setSystemNotifications(true);
	};

	return (
		<div className="space-y-6 max-w-3xl pb-10">
			<div>
				<h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
					<Bell className="w-5 h-5 text-gold dark:text-[#F0BC2B]" /> Personal Notification Preferences
				</h2>
				<p className="text-xs text-muted-foreground mt-1">
					Configure which events dispatch personal in-app and email notifications to your account.
				</p>
			</div>

			{success && (
				<div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-500 flex items-center gap-2">
					<Check className="w-4 h-4 shrink-0" /> {success}
				</div>
			)}

			<PremiumCard className="p-5 space-y-4 bg-card border-border/80 rounded-xl">
				<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Personal Event Alerts</h3>

				<div className="space-y-3">
					{[
						{ label: "Task Assigned", desc: "Alert when a new task is assigned to you", val: taskAssigned, set: setTaskAssigned },
						{ label: "Task Submitted for Review", desc: "Alert when a team member submits a task for your approval", val: taskSubmitted, set: setTaskSubmitted },
						{ label: "Approval Required", desc: "Alert when executive sign-off or deadline extension is requested", val: approvalRequired, set: setApprovalRequired },
						{ label: "Deadline Reminders", desc: "Reminders for approaching project & task deadlines", val: deadlineReminder, set: setDeadlineReminder },
						{ label: "Project Milestone Updates", desc: "Notifications on project stage completion and health changes", val: projectUpdates, set: setProjectUpdates },
						{ label: "System Security Events", desc: "Alerts for new device logins and password updates", val: systemNotifications, set: setSystemNotifications },
					].map((item) => (
						<div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
							<div>
								<p className="text-xs font-bold text-foreground">{item.label}</p>
								<p className="text-[11px] text-muted-foreground">{item.desc}</p>
							</div>
							<label className="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									checked={item.val}
									onChange={(e) => item.set(e.target.checked)}
									className="sr-only peer"
								/>
								<div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold"></div>
							</label>
						</div>
					))}
				</div>
			</PremiumCard>

			{/* Unsaved Changes Banner */}
			{isDirty && (
				<div className="p-4 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-between shadow-md">
					<span className="text-xs font-bold text-gold">You have unsaved notification preferences</span>
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
