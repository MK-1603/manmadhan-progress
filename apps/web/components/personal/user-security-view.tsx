"use client";

import { useState, useEffect } from "react";
import { Shield, Key, Smartphone, LogOut, Check, AlertCircle, Loader2, Lock, History } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";

export function UserSecurityView() {
	const [loading, setLoading] = useState(true);
	const [securityData, setSecurityData] = useState<any>(null);
	const [revoking, setRevoking] = useState(false);
	const [message, setMessage] = useState("");

	useEffect(() => {
		const fetchSecurity = async () => {
			try {
				const res = await apiClient.get("/auth/security/sessions");
				if (res.data.success) {
					setSecurityData(res.data.data);
				}
			} catch (err) {
				console.error("Failed to load security info:", err);
			} finally {
				setLoading(false);
			}
		};
		fetchSecurity();
	}, []);

	const handleRevokeOthers = async () => {
		setRevoking(true);
		setMessage("");
		try {
			const res = await apiClient.post("/auth/security/sessions/revoke-others");
			if (res.data.success) {
				setMessage("All other active sessions have been successfully revoked.");
				setTimeout(() => setMessage(""), 4000);
			}
		} catch (err) {
			console.error(err);
		} finally {
			setRevoking(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
				<Loader2 className="w-8 h-8 animate-spin text-gold" />
			</div>
		);
	}

	return (
		<div className="w-full min-h-screen px-6 lg:px-10 py-7 lg:py-9 space-y-8 max-w-6xl">
			{/* Header */}
			<div className="border-b border-border/40 pb-5">
				<h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
					<Shield className="w-7 h-7 text-gold dark:text-[#E3AA18]" /> Account Security & Active Sessions
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Review authentication details, active session tokens, and security activity logs.
				</p>
			</div>

			{message && (
				<div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm">
					<Check className="w-4 h-4 shrink-0" />
					<span>{message}</span>
				</div>
			)}

			<div className="space-y-6">
				{/* Authentication Method */}
				<PremiumCard>
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<h3 className="text-base font-bold text-foreground flex items-center gap-2">
								<Key className="w-4 h-4 text-gold dark:text-[#E3AA18]" /> Authentication Method
							</h3>
							<p className="text-xs text-muted-foreground">
								{securityData?.authMethod || "Password Authentication"}
							</p>
						</div>
						<span className="text-xs font-bold px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full">
							Secured
						</span>
					</div>
				</PremiumCard>

				{/* Active Sessions */}
				<PremiumCard>
					<div className="flex items-center justify-between mb-4">
						<div>
							<h3 className="text-base font-bold text-foreground flex items-center gap-2">
								<Smartphone className="w-4 h-4 text-gold dark:text-[#E3AA18]" /> Active Sessions
							</h3>
							<p className="text-xs text-muted-foreground">
								Devices currently logged into your account
							</p>
						</div>

						<button
							type="button"
							onClick={handleRevokeOthers}
							disabled={revoking}
							className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
						>
							{revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
							<span>Sign Out Other Sessions</span>
						</button>
					</div>

					<div className="space-y-3">
						{(securityData?.activeSessions || []).map((session: any) => (
							<div
								key={session.id}
								className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-xl"
							>
								<div className="flex items-center gap-3">
									<div className="p-2.5 bg-gold/10 text-gold dark:text-[#F0BC2B] rounded-xl">
										<Smartphone className="w-5 h-5" />
									</div>
									<div>
										<span className="text-sm font-semibold text-foreground block">{session.device}</span>
										<span className="text-xs text-muted-foreground font-mono">
											IP: {session.ip} · Last active: {new Date(session.lastActive).toLocaleTimeString()}
										</span>
									</div>
								</div>

								{session.isCurrent && (
									<span className="text-xs font-bold px-2.5 py-1 bg-gold/20 text-gold dark:text-[#F0BC2B] rounded-md uppercase tracking-wider">
										Current Session
									</span>
								)}
							</div>
						))}
					</div>
				</PremiumCard>

				{/* Security Audit Events */}
				<PremiumCard>
					<h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
						<History className="w-4 h-4 text-gold dark:text-[#E3AA18]" /> Security Activity Log
					</h3>

					<div className="space-y-3">
						{(securityData?.securityEvents || []).map((evt: any) => (
							<div
								key={evt.id}
								className="flex items-center justify-between p-3.5 bg-muted/10 border border-border/40 rounded-xl text-xs"
							>
								<div className="flex items-center gap-3">
									<Lock className="w-4 h-4 text-muted-foreground" />
									<span className="font-semibold text-foreground">{evt.event}</span>
								</div>
								<span className="text-muted-foreground font-mono">
									{new Date(evt.timestamp).toLocaleString()}
								</span>
							</div>
						))}
					</div>
				</PremiumCard>
			</div>
		</div>
	);
}
