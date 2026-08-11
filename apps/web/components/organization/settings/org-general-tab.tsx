"use client";

import { useState, useEffect } from "react";
import { Building2, Upload, Trash2, Check, AlertCircle, Save, Loader2, Image as ImageIcon } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";

interface OrgGeneralTabProps {
	workspace: any;
	userRole: string;
	onUpdated: (ws: any) => void;
}

export function OrgGeneralTab({ workspace, userRole, onUpdated }: OrgGeneralTabProps) {
	const [name, setName] = useState(workspace?.name || "");
	const [description, setDescription] = useState(workspace?.description || "");
	const [website, setWebsite] = useState(workspace?.website || "");
	const [contactEmail, setContactEmail] = useState(workspace?.contactEmail || "");
	const [logoUrl, setLogoUrl] = useState(workspace?.logoUrl || "");

	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const isCEO = userRole === "CEO";

	// Dynamically update form fields when workspace prop is loaded from backend
	useEffect(() => {
		if (workspace) {
			setName(workspace.name || "");
			setDescription(workspace.description || "");
			setWebsite(workspace.website || "");
			setContactEmail(workspace.contactEmail || "");
			setLogoUrl(workspace.logoUrl || "");
		}
	}, [workspace]);

	const isDirty =
		name !== (workspace?.name || "") ||
		description !== (workspace?.description || "") ||
		website !== (workspace?.website || "") ||
		contactEmail !== (workspace?.contactEmail || "") ||
		logoUrl !== (workspace?.logoUrl || "");

	const handleSave = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!workspace?.id) {
			setError("Organization workspace ID not found.");
			return;
		}

		setSaving(true);
		setError("");
		setSuccess("");

		try {
			const res = await apiClient.put(`/workspaces/${workspace.id}`, {
				name,
				logoUrl,
				description,
				website,
				contactEmail,
			});

			if (res.data.success) {
				if (logoUrl && typeof window !== "undefined") {
					localStorage.setItem("orgLogo", logoUrl);
					window.dispatchEvent(new Event("orgLogoUpdated"));
				}
				setSuccess("Organization settings updated successfully");
				onUpdated(res.data.data);
				setTimeout(() => setSuccess(""), 4000);
			} else {
				setError(res.data.error || "Failed to update organization settings");
			}
		} catch (err: any) {
			setError(err?.response?.data?.error || "Failed to update organization settings");
		} finally {
			setSaving(false);
		}
	};

	const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setError("");
		const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
		if (!validTypes.includes(file.type)) {
			setError("Invalid file format. Please upload PNG, JPG, WebP, or SVG.");
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			setError("File size exceeds 5MB limit. Please choose a smaller image.");
			return;
		}

		setUploading(true);
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			setLogoUrl(result);
			setUploading(false);
			setSuccess("Logo preview updated. Click 'Save Changes' to apply.");
		};
		reader.onerror = () => {
			setError("Failed to read image file.");
			setUploading(false);
		};
		reader.readAsDataURL(file);
	};

	const handleRemoveLogo = () => {
		setLogoUrl("");
		setSuccess("Logo removed. Click 'Save Changes' to apply.");
	};

	return (
		<div className="space-y-6 max-w-4xl pb-10">
			<div>
				<h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
					<Building2 className="w-5 h-5 text-gold dark:text-[#F0BC2B]" /> Organization Identity & Branding
				</h2>
				<p className="text-xs text-muted-foreground mt-1">
					Configure organization workspace identity, branding logo, and workspace details.
				</p>
			</div>

			{error && (
				<div className="flex items-center gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-semibold">
					<AlertCircle className="w-4 h-4 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{success && (
				<div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-semibold">
					<Check className="w-4 h-4 shrink-0" />
					<span>{success}</span>
				</div>
			)}

			{/* Organization Logo Section */}
			<PremiumCard className="p-5 bg-card border-border/80 rounded-xl">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
						<ImageIcon className="w-4 h-4 text-gold dark:text-[#F0BC2B]" /> Organization Logo
					</h3>
					<span className="text-[11px] text-muted-foreground font-medium">Appears on Sidebar, Workspace Switcher & Exports</span>
				</div>

				<div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 bg-muted/20 border border-border/60 rounded-xl">
					<div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
						{logoUrl ? (
							<img src={logoUrl} alt="Organization Logo" className="w-full h-full object-contain p-1.5" />
						) : (
							<Building2 className="w-7 h-7 text-gold" />
						)}
						{uploading && (
							<div className="absolute inset-0 bg-background/80 flex items-center justify-center">
								<Loader2 className="w-5 h-5 animate-spin text-gold" />
							</div>
						)}
					</div>

					<div className="space-y-2 flex-1 min-w-0">
						<div className="flex flex-wrap items-center gap-2.5">
							<label className="cursor-pointer px-3.5 py-2 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold rounded-lg flex items-center gap-2 transition-colors">
								<Upload className="w-3.5 h-3.5" />
								<span>{uploading ? "Uploading..." : "Upload Logo"}</span>
								<input
									type="file"
									accept="image/png,image/jpeg,image/svg+xml,image/webp"
									className="hidden"
									onChange={handleLogoFileChange}
									disabled={!isCEO || uploading}
								/>
							</label>

							{logoUrl && (
								<button
									type="button"
									onClick={handleRemoveLogo}
									disabled={!isCEO}
									className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
								>
									<Trash2 className="w-3.5 h-3.5" /> Remove
								</button>
							)}
						</div>
						<p className="text-[11px] text-muted-foreground font-medium">
							Supported formats: PNG, JPG, WebP, SVG. Maximum file size: 5MB.
						</p>
					</div>
				</div>
			</PremiumCard>

			{/* Organization Information Form */}
			<PremiumCard className="p-5 bg-card border-border/80 rounded-xl space-y-4">
				<h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Workspace Information</h3>
				<form onSubmit={handleSave} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<label className="text-xs font-bold text-foreground">
								Organization Name *
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={!isCEO}
								required
								className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-medium focus:border-gold outline-none"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-bold text-foreground">
								Organization ID (System Read-Only)
							</label>
							<input
								type="text"
								value={workspace?.id || "N/A"}
								disabled
								className="w-full h-10 px-3 bg-muted/50 border border-border/60 rounded-xl text-xs font-mono text-muted-foreground cursor-not-allowed"
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-bold text-foreground">
							Short Description
						</label>
						<textarea
							rows={3}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							disabled={!isCEO}
							placeholder="Execution mandate and scope of this organization workspace..."
							className="w-full p-3 bg-background border border-border rounded-xl text-xs font-medium focus:border-gold outline-none resize-none"
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<label className="text-xs font-bold text-foreground">
								Website / Portal URL
							</label>
							<input
								type="url"
								value={website}
								onChange={(e) => setWebsite(e.target.value)}
								disabled={!isCEO}
								placeholder="https://organization.example.com"
								className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-medium focus:border-gold outline-none"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-bold text-foreground">
								Contact Email
							</label>
							<input
								type="email"
								value={contactEmail}
								onChange={(e) => setContactEmail(e.target.value)}
								disabled={!isCEO}
								placeholder="admin@organization.com"
								className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-medium focus:border-gold outline-none"
							/>
						</div>
					</div>
				</form>
			</PremiumCard>

			{/* Unsaved Changes Banner */}
			{isDirty && (
				<div className="p-4 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-between shadow-md">
					<span className="text-xs font-bold text-gold">You have unsaved organization changes</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => {
								setName(workspace?.name || "");
								setDescription(workspace?.description || "");
								setWebsite(workspace?.website || "");
								setContactEmail(workspace?.contactEmail || "");
								setLogoUrl(workspace?.logoUrl || "");
								setError("");
								setSuccess("");
							}}
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
