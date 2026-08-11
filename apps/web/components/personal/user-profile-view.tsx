"use client";

import { useState } from "react";
import { User, Mail, Shield, Save, Check, AlertCircle, Loader2, Camera } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";

interface UserProfileViewProps {
	roleLabel: string;
}

export function UserProfileView({ roleLabel }: UserProfileViewProps) {
	const { user, checkSession } = useAuth();

	const [name, setName] = useState(user?.name || "");
	const [displayName, setDisplayName] = useState(user?.displayName || "");
	const [avatar, setAvatar] = useState(user?.avatar || "");

	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");

		try {
			const res = await apiClient.put("/auth/me", {
				name,
				displayName,
				avatar,
			});

			if (res.data.success) {
				setSuccess("Profile details updated successfully");
				if (checkSession) await checkSession();
				setTimeout(() => setSuccess(""), 4000);
			} else {
				setError(res.data.error || "Failed to update profile");
			}
		} catch (err: any) {
			setError(err?.response?.data?.error || "Failed to update profile");
		} finally {
			setSaving(false);
		}
	};

	const initials = (name || user?.name || "U")
		.split(" ")
		.map((n: string) => n[0])
		.join("")
		.toUpperCase()
		.substring(0, 2);

	return (
		<div className="w-full min-h-screen px-6 lg:px-10 py-7 lg:py-9 space-y-8 max-w-6xl">
			{/* Header */}
			<div className="border-b border-border/40 pb-5">
				<h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
					<User className="w-7 h-7 text-gold dark:text-[#E3AA18]" /> Personal Profile
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Manage your personal account details, display name, and avatar.
				</p>
			</div>

			{error && (
				<div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm">
					<AlertCircle className="w-4 h-4 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{success && (
				<div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm">
					<Check className="w-4 h-4 shrink-0" />
					<span>{success}</span>
				</div>
			)}

			{/* Two Column Layout */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
				{/* Left Column: Avatar & Summary */}
				<PremiumCard className="flex flex-col items-center text-center p-6 space-y-4">
					<div className="relative group">
						<div className="w-24 h-24 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold dark:text-[#E3AA18] text-2xl font-black shadow-md overflow-hidden">
							{avatar ? (
								<img src={avatar} alt={name} className="w-full h-full object-cover" />
							) : (
								<span>{initials}</span>
							)}
						</div>
					</div>

					<div className="space-y-1">
						<h2 className="text-lg font-bold text-foreground">{name || user?.name || "User"}</h2>
						<p className="text-xs text-muted-foreground">{user?.email}</p>
					</div>

					<div className="w-full pt-4 border-t border-border/40 space-y-2 text-left">
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground font-medium">Workspace Role:</span>
							<span className="font-bold text-gold dark:text-[#E3AA18]">{roleLabel}</span>
						</div>
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground font-medium">Account Status:</span>
							<span className="font-bold text-emerald-500">Active</span>
						</div>
					</div>
				</PremiumCard>

				{/* Right Column: Editable Profile Details */}
				<PremiumCard className="md:col-span-2">
					<form onSubmit={handleSave} className="space-y-5">
						<h3 className="text-base font-bold text-foreground pb-2 border-b border-border/40">
							Account Details
						</h3>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
							<div>
								<label className="text-xs font-semibold text-muted-foreground block mb-1.5">
									Full Name *
								</label>
								<input
									type="text"
									required
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
								/>
							</div>

							<div>
								<label className="text-xs font-semibold text-muted-foreground block mb-1.5">
									Display Name
								</label>
								<input
									type="text"
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
									placeholder="Executive handle..."
									className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
								/>
							</div>
						</div>

						<div>
							<label className="text-xs font-semibold text-muted-foreground block mb-1.5">
								Email Address
							</label>
							<input
								type="email"
								disabled
								value={user?.email || ""}
								className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-muted-foreground"
							/>
							<p className="text-[11px] text-muted-foreground mt-1">
								Email address is managed by organization authentication directory.
							</p>
						</div>

						<div>
							<label className="text-xs font-semibold text-muted-foreground block mb-1.5">
								Avatar URL
							</label>
							<input
								type="url"
								value={avatar}
								onChange={(e) => setAvatar(e.target.value)}
								placeholder="https://example.com/avatar.jpg"
								className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
							/>
						</div>

						<div className="pt-4 flex justify-end">
							<button
								type="submit"
								disabled={saving}
								className="px-5 py-2.5 bg-gold hover:bg-[#F0BC2B] text-black text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
							>
								{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
								<span>Save Profile Changes</span>
							</button>
						</div>
					</form>
				</PremiumCard>
			</div>
		</div>
	);
}
