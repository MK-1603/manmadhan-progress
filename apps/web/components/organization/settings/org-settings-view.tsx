"use client";

import { useState, useEffect } from "react";
import {
  Loader2, Settings as SettingsIcon, User, Sliders, Bell, Palette,
  Shield, Smartphone, Clock, ChevronRight, ArrowLeft
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import apiClient from "@/lib/api-client";
import { OrgSettingsNav } from "./org-settings-nav";
import { CEOProfileTab } from "./ceo-profile-tab";
import { CEOPreferencesTab } from "./ceo-preferences-tab";
import { CEONotificationsTab } from "./ceo-notifications-tab";
import { OrgAppearanceTab } from "./org-appearance-tab";
import { OrgSecurityTab } from "./org-security-tab";

interface OrgSettingsViewProps {
	userRole: "CEO" | "CO-CEO" | "MEMBER";
	basePath: string;
}

export function OrgSettingsView({ userRole, basePath }: OrgSettingsViewProps) {
	const { user } = useAuth();
	const [activeTab, setActiveTab] = useState("profile");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(true); // On mobile, show settings index by default
	const [loading, setLoading] = useState(true);
	const [workspace, setWorkspace] = useState<any>(null);

	useEffect(() => {
		const fetchWorkspace = async () => {
			try {
				const workspaceId = localStorage.getItem("workspaceId");
				const res = await apiClient.get("/workspaces");
				if (res.data.success && res.data.data?.length > 0) {
					const found = res.data.data.find((w: any) => w.id === workspaceId) || res.data.data[0];
					setWorkspace(found);
				}
			} catch (err) {
				console.error("Failed to load workspace:", err);
			} finally {
				setLoading(false);
			}
		};
		fetchWorkspace();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
				<Loader2 className="w-8 h-8 animate-spin text-gold" />
			</div>
		);
	}

	const settingGroups = [
		{
			group: "ACCOUNT",
			items: [
				{ id: "profile", label: "Profile", desc: "Photo, name & authenticated user credentials", icon: User },
				{ id: "preferences", label: "Preferences", desc: "Default landing view, time display & language", icon: Sliders },
				{ id: "notifications", label: "Notifications", desc: "Personal task & approval event alerts", icon: Bell },
				{ id: "appearance", label: "Appearance", desc: "Theme preferences (System, Light, Dark)", icon: Palette },
			],
		},
		{
			group: "SECURITY",
			items: [
				{ id: "security", label: "Security & Password", desc: "Password change form & credential updates", icon: Shield },
				{ id: "security-devices", label: "Connected Devices", desc: "Strict 2-device limit (1 Mobile + 1 Desktop)", icon: Smartphone },
				{ id: "security-activity", label: "Security Activity", desc: "Security audit activity log timeline", icon: Clock },
			],
		},
	];

	return (
		<div className="w-full h-[calc(100dvh-65px)] flex flex-col overflow-hidden bg-background">
			{/* Fixed Header Bar */}
			<div className="shrink-0 sticky top-0 z-20 px-4 md:px-6 py-3.5 border-b border-border/40 bg-background flex items-center justify-between">
				<div className="flex items-center gap-3">
					{!isMobileMenuOpen && (
						<button
							type="button"
							onClick={() => setIsMobileMenuOpen(true)}
							className="md:hidden p-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
						>
							<ArrowLeft className="w-4 h-4" />
						</button>
					)}
					<div>
						<h1 className="text-lg md:text-xl font-black text-foreground tracking-tight flex items-center gap-2">
							<SettingsIcon className="w-5 h-5 text-gold dark:text-[#F0BC2B]" /> Organization Settings
						</h1>
						<p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[240px] sm:max-w-none">
							ManMadhan Organization · Workspace Code MK1603 · Role Controls ({userRole})
						</p>
					</div>
				</div>
			</div>

			{/* Main Content Layout */}
			<div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
				
				{/* =========================================================================
				    MOBILE SETTINGS INDEX VIEW (Renders when isMobileMenuOpen is true on mobile)
				   ========================================================================= */}
				{isMobileMenuOpen && (
					<div className="w-full h-full overflow-y-auto p-4 space-y-6 md:hidden pb-24 bg-background">
						<div>
							<h2 className="text-lg font-black text-foreground">Settings Index</h2>
							<p className="text-xs text-muted-foreground mt-0.5">Select an account setting to open dedicated page.</p>
						</div>

						{settingGroups.map((group) => (
							<div key={group.group} className="space-y-2">
								<h3 className="text-[10px] font-black text-gold uppercase tracking-widest px-1">
									{group.group}
								</h3>
								<div className="space-y-2">
									{group.items.map((item) => {
										const Icon = item.icon;
										return (
											<div
												key={item.id}
												onClick={() => {
													setActiveTab(item.id);
													setIsMobileMenuOpen(false);
												}}
												className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/80 active:border-gold cursor-pointer transition-colors"
											>
												<div className="flex items-center gap-3 min-w-0">
													<div className="w-9 h-9 rounded-xl bg-gold/10 text-gold flex items-center justify-center shrink-0">
														<Icon className="w-4 h-4" />
													</div>
													<div className="min-w-0">
														<p className="text-xs font-bold text-foreground truncate">{item.label}</p>
														<p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
													</div>
												</div>
												<ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
											</div>
										);
									})}
								</div>
							</div>
						))}
					</div>
				)}

				{/* =========================================================================
				    DESKTOP FIXED LEFT SUB-NAV (Hidden on mobile)
				   ========================================================================= */}
				<OrgSettingsNav activeTab={activeTab} onSelectTab={(tabId) => { setActiveTab(tabId); setIsMobileMenuOpen(false); }} basePath={basePath} />

				{/* =========================================================================
				    SCROLLABLE RIGHT CONTENT PANEL (Renders on desktop OR on mobile when index is closed)
				   ========================================================================= */}
				<main className={`flex-1 h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8 ${isMobileMenuOpen ? "hidden md:block" : "block"}`}>
					{activeTab === "profile" && <CEOProfileTab user={user} workspace={workspace} />}
					{activeTab === "preferences" && <CEOPreferencesTab />}
					{activeTab === "notifications" && <CEONotificationsTab />}
					{activeTab === "appearance" && <OrgAppearanceTab />}
					{(activeTab === "security" || activeTab === "security-devices" || activeTab === "security-activity") && (
						<OrgSecurityTab activeSubTab={activeTab} />
					)}
				</main>
			</div>
		</div>
	);
}
