"use client";

import { useState, useEffect, useRef } from "react";
import { User, Mail, Shield, Building, Camera, Save, Loader2, Check } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";

interface CEOProfileTabProps {
	user: any;
	workspace?: any;
	onUpdated?: (updatedUser: any) => void;
}

export function CEOProfileTab({ user, workspace, onUpdated }: CEOProfileTabProps) {
	const { checkSession } = useAuth();
	const [displayName, setDisplayName] = useState(user?.displayName || user?.name || "");
	const [email, setEmail] = useState(user?.email || "");
	const [avatar, setAvatar] = useState(user?.avatar || "");
	
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const fileInputRef = useRef<HTMLInputElement>(null);

	// Sync authenticated user data dynamically when loaded from backend / checkSession
	useEffect(() => {
		if (user) {
			setDisplayName(user.displayName || user.name || "");
			setEmail(user.email || "");
			setAvatar(user.avatar || "");
		}
	}, [user]);

	const initialName = user?.displayName || user?.name || "";
	const isDirty = displayName !== initialName || avatar !== (user?.avatar || "");

	const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setError("");
		if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
			setError("Invalid file format. Please upload PNG, JPG, or WebP.");
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			setError("File size exceeds 5MB limit.");
			return;
		}

		setUploading(true);
		const reader = new FileReader();
		reader.onload = () => {
			setAvatar(reader.result as string);
			setUploading(false);
			setSuccess("Profile photo preview updated.");
		};
		reader.onerror = () => {
			setError("Failed to read image file.");
			setUploading(false);
		};
		reader.readAsDataURL(file);
	};

	const handleSave = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");

		try {
			const res = await apiClient.put("/auth/me", {
				displayName,
				name: displayName,
				avatar,
			});

			if (res.data.success) {
				setSuccess("CEO Profile updated successfully.");
				await checkSession();
				if (onUpdated) onUpdated(res.data.user);
				setTimeout(() => setSuccess(""), 4000);
			} else {
				setError(res.data.error || "Failed to update profile.");
			}
		} catch (err: any) {
			setError(err?.response?.data?.error || "Failed to update profile.");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		setDisplayName(initialName);
		setAvatar(user?.avatar || "");
		setError("");
		setSuccess("");
	};

	return (
		<div className="space-y-6 max-w-3xl pb-10">
			<div>
				<h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
					<User className="w-5 h-5 text-gold dark:text-[#F0BC2B]" /> CEO Profile
				</h2>
				<p className="text-xs text-muted-foreground mt-1">
					Manage your personal executive profile identity and authenticated user credentials.
				</p>
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

			{/* Profile Photo Section */}
			<PremiumCard className="p-5 space-y-4 bg-card border-border/80 rounded-xl">
				<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Profile Photo</h3>
				<div className="flex items-center gap-5">
					<div className="relative w-16 h-16 rounded-full border-2 border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
						{avatar ? (
							<img src={avatar} alt="CEO Avatar" className="w-full h-full object-cover" />
						) : (
							<User className="w-8 h-8 text-muted-foreground/60" />
						)}
					</div>

					<div className="space-y-2">
						<input
							type="file"
							accept="image/png, image/jpeg, image/webp"
							ref={fileInputRef}
							className="hidden"
							onChange={handleAvatarUpload}
						/>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={uploading}
							className="px-3.5 py-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-xs font-bold transition-colors flex items-center gap-2"
						>
							<Camera className="w-3.5 h-3.5" />
							{uploading ? "Uploading..." : "Change Photo"}
						</button>
						<p className="text-[11px] text-muted-foreground">Supported: PNG, JPG, WebP. Max 5MB.</p>
					</div>
				</div>
			</PremiumCard>

			{/* Account Details Form */}
			<PremiumCard className="p-5 space-y-4 bg-card border-border/80 rounded-xl">
				<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Authenticated User Credentials</h3>
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-1.5">
						<label className="text-xs font-bold text-foreground">Full Name</label>
						<input
							type="text"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs font-medium focus:border-gold outline-none transition-colors"
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-bold text-foreground">Email Address (Authenticated)</label>
						<div className="relative">
							<input
								type="email"
								disabled
								value={email || "Loading email..."}
								className="w-full h-10 rounded-xl bg-muted/50 border border-border/60 px-3 text-xs font-medium text-muted-foreground cursor-not-allowed"
							/>
							<Mail className="w-4 h-4 text-muted-foreground/50 absolute right-3 top-3" />
						</div>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-bold text-foreground">Role</label>
						<div className="h-10 rounded-xl bg-gold/10 border border-gold/30 px-3 flex items-center gap-2">
							<Shield className="w-4 h-4 text-gold" />
							<span className="text-xs font-bold text-gold">{user?.role || "CEO"} (Executive Leadership)</span>
						</div>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-bold text-foreground">Organization</label>
						<div className="h-10 rounded-xl bg-muted/50 border border-border/60 px-3 flex items-center gap-2 text-muted-foreground">
							<Building className="w-4 h-4 text-muted-foreground/60" />
							<span className="text-xs font-semibold">{workspace?.name || "ManMadhan Progress Workspace"}</span>
						</div>
					</div>
				</div>
			</PremiumCard>

			{/* Unsaved Changes Banner */}
			{isDirty && (
				<div className="p-4 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-between shadow-md">
					<span className="text-xs font-bold text-gold">You have unsaved profile changes</span>
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
