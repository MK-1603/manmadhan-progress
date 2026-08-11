"use client";

import { useState, useEffect } from "react";
import { Shield, ShieldCheck, Smartphone, Monitor, Trash2, AlertCircle, Loader2, Check, Clock, Key, Eye, EyeOff, Lock } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";

interface OrgSecurityTabProps {
	activeSubTab?: string;
}

export function OrgSecurityTab({ activeSubTab = "security" }: OrgSecurityTabProps) {
	const [subTab, setSubTab] = useState(activeSubTab);
	const [devices, setDevices] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
	const [targetDevice, setTargetDevice] = useState<any | null>(null);
	
	// Password Change Form State
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showOldPassword, setShowOldPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [changingPassword, setChangingPassword] = useState(false);
	const [passwordError, setPasswordError] = useState("");
	const [passwordSuccess, setPasswordSuccess] = useState("");

	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	useEffect(() => {
		if (activeSubTab) {
			setSubTab(activeSubTab);
		}
	}, [activeSubTab]);

	const fetchDevices = async () => {
		try {
			const res = await apiClient.get("/auth/devices");
			if (res.data.success) {
				setDevices(res.data.devices || []);
			}
		} catch (err: any) {
			console.error("Failed to load connected devices:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDevices();
	}, []);

	const handlePasswordChange = async (e: React.FormEvent) => {
		e.preventDefault();
		setPasswordError("");
		setPasswordSuccess("");

		if (!oldPassword) {
			setPasswordError("Current password is required.");
			return;
		}

		if (newPassword.length < 6) {
			setPasswordError("New password must be at least 6 characters long.");
			return;
		}

		if (newPassword !== confirmPassword) {
			setPasswordError("New passwords do not match.");
			return;
		}

		setChangingPassword(true);

		try {
			const res = await apiClient.post("/auth/password/change", {
				oldPassword,
				newPassword,
			});

			if (res.data.success) {
				setPasswordSuccess("Password changed successfully.");
				setOldPassword("");
				setNewPassword("");
				setConfirmPassword("");
				setTimeout(() => setPasswordSuccess(""), 4000);
			} else {
				setPasswordError(res.data.error || "Failed to change password.");
			}
		} catch (err: any) {
			setPasswordError(err?.response?.data?.error || "Failed to change password.");
		} finally {
			setChangingPassword(false);
		}
	};

	const handleConfirmDisconnect = async () => {
		if (!targetDevice) return;
		setDisconnectingId(targetDevice.id);
		setError("");
		setSuccess("");

		try {
			const res = await apiClient.delete(`/auth/devices/${targetDevice.id}`);
			if (res.data.success) {
				setSuccess(`Successfully disconnected ${targetDevice.deviceName || "device"}.`);
				setTargetDevice(null);
				await fetchDevices();
				setTimeout(() => setSuccess(""), 4000);
			} else {
				setError(res.data.error || "Failed to disconnect device.");
			}
		} catch (err: any) {
			setError(err?.response?.data?.error || "Failed to disconnect device.");
		} finally {
			setDisconnectingId(null);
		}
	};

	// Categorize devices into Mobile (max 1) and Desktop (max 1)
	const mobileDevice = devices.find((d) => {
		const os = (d.os || "").toLowerCase();
		return os.includes("android") || os.includes("ios");
	});

	const desktopDevice = devices.find((d) => {
		const os = (d.os || "").toLowerCase();
		return !(os.includes("android") || os.includes("ios"));
	});

	const connectedCount = (mobileDevice ? 1 : 0) + (desktopDevice ? 1 : 0);

	return (
		<div className="space-y-6 max-w-3xl pb-10">
			{/* Top Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
				<div>
					<h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
						<Shield className="w-5 h-5 text-gold dark:text-[#F0BC2B]" /> Security Center
					</h2>
					<p className="text-xs text-muted-foreground mt-0.5">
						Manage account security, password credential updates, connected devices, and audit activity.
					</p>
				</div>

				{/* Internal Sub-Tab Selectors */}
				<div className="flex items-center gap-1.5 bg-card border border-border/80 p-1 rounded-xl shrink-0">
					{[
						{ id: "security", label: "Password", icon: Key },
						{ id: "security-devices", label: "Devices", icon: Smartphone },
						{ id: "security-activity", label: "Activity", icon: Clock },
					].map((tab) => {
						const Icon = tab.icon;
						const isActive = subTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setSubTab(tab.id)}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
									isActive ? "bg-gold text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
								}`}
							>
								<Icon className="w-3.5 h-3.5" />
								<span>{tab.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			{error && (
				<div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-500">
					{error}
				</div>
			)}

			{success && (
				<div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-500 flex items-center gap-2">
					<Check className="w-4 h-4 shrink-0" /> {success}
				</div>
			)}

			{/* =========================================================================
			    SECTION 1: SECURITY OVERVIEW & PASSWORD CHANGE FORM (subTab === 'security')
			   ========================================================================= */}
			{subTab === "security" && (
				<div className="space-y-6">
					{/* Security Overview Status */}
					<PremiumCard className="p-4 bg-card border-border/80 rounded-xl flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
								<ShieldCheck className="w-5 h-5" />
							</div>
							<div>
								<h3 className="text-xs font-bold text-foreground">Security Overview</h3>
								<p className="text-[11px] text-muted-foreground mt-0.5">Account protected with HTTP-only tokens and OTP verification.</p>
							</div>
						</div>
						<span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
							Account Secure
						</span>
					</PremiumCard>

					{/* Password Change Form */}
					<PremiumCard className="p-5 bg-card border-border/80 rounded-xl space-y-4">
						<div className="flex items-center gap-2">
							<Key className="w-4 h-4 text-gold dark:text-[#F0BC2B]" />
							<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Change Password</h3>
						</div>

						{passwordError && (
							<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-500">
								{passwordError}
							</div>
						)}

						{passwordSuccess && (
							<div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-500 flex items-center gap-2">
								<Check className="w-4 h-4 shrink-0" /> {passwordSuccess}
							</div>
						)}

						<form onSubmit={handlePasswordChange} className="space-y-4">
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-foreground">Current Password *</label>
								<div className="relative">
									<input
										type={showOldPassword ? "text" : "password"}
										value={oldPassword}
										onChange={(e) => setOldPassword(e.target.value)}
										placeholder="Enter current password"
										className="w-full h-10 rounded-xl bg-background border border-border px-3 pr-10 text-xs font-medium focus:border-gold outline-none"
									/>
									<button
										type="button"
										onClick={() => setShowOldPassword(!showOldPassword)}
										className="absolute right-3 top-3 text-muted-foreground/60 hover:text-foreground"
									>
										{showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									</button>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<label className="text-xs font-bold text-foreground">New Password *</label>
									<div className="relative">
										<input
											type={showNewPassword ? "text" : "password"}
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
											placeholder="Enter new password"
											className="w-full h-10 rounded-xl bg-background border border-border px-3 pr-10 text-xs font-medium focus:border-gold outline-none"
										/>
										<button
											type="button"
											onClick={() => setShowNewPassword(!showNewPassword)}
											className="absolute right-3 top-3 text-muted-foreground/60 hover:text-foreground"
										>
											{showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
										</button>
									</div>
								</div>

								<div className="space-y-1.5">
									<label className="text-xs font-bold text-foreground">Confirm New Password *</label>
									<input
										type="password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										placeholder="Re-enter new password"
										className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs font-medium focus:border-gold outline-none"
									/>
								</div>
							</div>

							<div className="flex justify-end pt-1">
								<button
									type="submit"
									disabled={changingPassword || !oldPassword || !newPassword}
									className="px-5 py-2 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
								>
									{changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : <Lock className="w-3.5 h-3.5" />}
									Change Password
								</button>
							</div>
						</form>
					</PremiumCard>
				</div>
			)}

			{/* =========================================================================
			    SECTION 2: CONNECTED DEVICES (STRICT 2-DEVICE LIMIT) (subTab === 'security-devices')
			   ========================================================================= */}
			{subTab === "security-devices" && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
							Connected Devices ({connectedCount} of 2 connected)
						</h3>
						<span className="text-[10px] font-bold text-gold">Strict Limit: 1 Mobile + 1 Desktop</span>
					</div>

					{loading ? (
						<div className="flex items-center justify-center p-8 bg-card border border-border/80 rounded-xl">
							<Loader2 className="w-6 h-6 animate-spin text-gold" />
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Mobile Slot */}
							<PremiumCard className="p-4 bg-card border-border/80 rounded-xl flex flex-col justify-between gap-3 relative">
								<div className="flex items-start justify-between gap-2">
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-lg bg-gold/10 text-gold flex items-center justify-center shrink-0">
											<Smartphone className="w-4 h-4" />
										</div>
										<div>
											<h4 className="text-xs font-bold text-foreground">Mobile Device</h4>
											<p className="text-[10px] text-muted-foreground">{mobileDevice?.os || "Android / iOS"}</p>
										</div>
									</div>
									{mobileDevice ? (
										<span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
											Connected
										</span>
									) : (
										<span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
											Slot Available
										</span>
									)}
								</div>

								{mobileDevice ? (
									<div className="space-y-2 pt-2 border-t border-border/40">
										<p className="text-[11px] text-muted-foreground truncate">
											Browser: <span className="text-foreground font-semibold">{mobileDevice.browser || "Chrome / Safari"}</span>
										</p>
										<p className="text-[10px] text-muted-foreground">
											Last Active: {new Date(mobileDevice.lastActive || mobileDevice.loginTime).toLocaleTimeString()}
										</p>
										<button
											type="button"
											onClick={() => setTargetDevice(mobileDevice)}
											className="w-full py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
										>
											<Trash2 className="w-3.5 h-3.5" /> Disconnect Mobile
										</button>
									</div>
								) : (
									<p className="text-[11px] text-muted-foreground italic py-2">
										No mobile device connected. Sign in from a mobile device to use this slot.
									</p>
								)}
							</PremiumCard>

							{/* Desktop Slot */}
							<PremiumCard className="p-4 bg-card border-border/80 rounded-xl flex flex-col justify-between gap-3 relative">
								<div className="flex items-start justify-between gap-2">
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-lg bg-gold/10 text-gold flex items-center justify-center shrink-0">
											<Monitor className="w-4 h-4" />
										</div>
										<div>
											<h4 className="text-xs font-bold text-foreground">Desktop Device</h4>
											<p className="text-[10px] text-muted-foreground">{desktopDevice?.os || "Windows / Mac / Linux"}</p>
										</div>
									</div>
									{desktopDevice ? (
										<span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/30">
											Current Device
										</span>
									) : (
										<span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
											Slot Available
										</span>
									)}
								</div>

								{desktopDevice ? (
									<div className="space-y-2 pt-2 border-t border-border/40">
										<p className="text-[11px] text-muted-foreground truncate">
											Browser: <span className="text-foreground font-semibold">{desktopDevice.browser || "Chrome"}</span>
										</p>
										<p className="text-[10px] text-muted-foreground">
											Last Active: Just now
										</p>
										<span className="block text-center py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold">
											Active Session
										</span>
									</div>
								) : (
									<p className="text-[11px] text-muted-foreground italic py-2">
										No desktop device recorded.
									</p>
								)}
							</PremiumCard>
						</div>
					)}
				</div>
			)}

			{/* =========================================================================
			    SECTION 3: SECURITY ACTIVITY LOG (subTab === 'security-activity')
			   ========================================================================= */}
			{subTab === "security-activity" && (
				<div className="space-y-3">
					<h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
						<Clock className="w-3.5 h-3.5 text-gold" /> Security Audit Activity
					</h3>
					<PremiumCard className="p-4 bg-card border-border/80 rounded-xl space-y-3">
						<div className="flex items-center justify-between text-xs py-2 border-b border-border/40">
							<div>
								<p className="font-bold text-foreground">Desktop Session Active</p>
								<p className="text-[10px] text-muted-foreground">Windows · Chrome browser</p>
							</div>
							<span className="text-[10px] font-semibold text-muted-foreground">Just now</span>
						</div>
						<div className="flex items-center justify-between text-xs py-2">
							<div>
								<p className="font-bold text-foreground">Security Check Verified</p>
								<p className="text-[10px] text-muted-foreground">Authenticated Executive Session</p>
							</div>
							<span className="text-[10px] font-semibold text-muted-foreground">Today</span>
						</div>
					</PremiumCard>
				</div>
			)}

			{/* Disconnect Confirmation Modal */}
			{targetDevice && (
				<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="w-full max-w-sm bg-card border border-border p-5 rounded-xl shadow-2xl space-y-4">
						<div className="flex items-center gap-3 text-rose-500">
							<AlertCircle className="w-5 h-5 shrink-0" />
							<h3 className="text-sm font-bold text-foreground">Disconnect Device?</h3>
						</div>
						<p className="text-xs text-muted-foreground leading-relaxed">
							You will need to sign in again on <span className="font-bold text-foreground">{targetDevice.deviceName || targetDevice.os}</span> to re-establish session access.
						</p>
						<div className="flex items-center justify-end gap-2 pt-2">
							<button
								type="button"
								onClick={() => setTargetDevice(null)}
								className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleConfirmDisconnect}
								disabled={!!disconnectingId}
								className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
							>
								{disconnectingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
								Disconnect
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
