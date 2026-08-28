import { User, Sliders, Bell, Palette, Shield, Smartphone, Clock, RefreshCw, Download, Sparkles } from "lucide-react";
import Link from "next/link";

interface OrgSettingsNavProps {
	activeTab: string;
	onSelectTab: (tabId: string) => void;
	basePath: string;
}

export function OrgSettingsNav({ activeTab, onSelectTab }: OrgSettingsNavProps) {
	const allItems = [
		{ id: "profile", label: "Profile", group: "ACCOUNT", icon: User },
		{ id: "preferences", label: "Preferences", group: "ACCOUNT", icon: Sliders },
		{ id: "notifications", label: "Notifications", group: "ACCOUNT", icon: Bell },
		{ id: "appearance", label: "Appearance", group: "ACCOUNT", icon: Palette },
		{ id: "security", label: "Security & Password", group: "SECURITY", icon: Shield },
		{ id: "security-devices", label: "Connected Devices", group: "SECURITY", icon: Smartphone },
		{ id: "security-activity", label: "Security Activity", group: "SECURITY", icon: Clock },
	];

	const groups = [
		{
			id: "account-group",
			title: "ACCOUNT",
			items: allItems.filter(i => i.group === "ACCOUNT"),
		},
		{
			id: "security-group",
			title: "SECURITY",
			items: allItems.filter(i => i.group === "SECURITY"),
		},
	];

	return (
		/* Desktop Fixed Vertical Sidebar (>= md) */
		<nav className="hidden md:flex w-60 shrink-0 flex-col gap-6 p-4 border-r border-border/50 bg-card/40 h-full overflow-y-auto">
			{groups.map((group) => (
				<div key={group.id} className="space-y-1.5">
					<h3 className="text-[10px] font-black text-muted-foreground/70 tracking-widest uppercase px-3">
						{group.title}
					</h3>
					<div className="flex flex-col gap-0.5">
						{group.items.map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => onSelectTab(tab.id)}
									className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left focus:outline-none cursor-pointer ${
										isActive
											? "bg-gold/10 text-gold dark:bg-gold/15 dark:text-[#F0BC2B] border border-gold/30 shadow-sm"
											: "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
									}`}
								>
									<div className="flex items-center gap-2.5 min-w-0">
										<Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-gold dark:text-[#F0BC2B]" : "text-muted-foreground/70"}`} />
										<span className="truncate">{tab.label}</span>
									</div>
								</button>
							);
						})}
					</div>
				</div>
			))}
		</nav>
	);
}
