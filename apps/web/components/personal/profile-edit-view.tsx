"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Shield, Camera, Upload, Trash2,
  Save, Loader2, Check, AlertCircle, ArrowLeft, X
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";

export function ProfileEditView() {
  const router = useRouter();
  const { user, checkSession } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || "");
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [previewAvatar, setPreviewAvatar] = useState(user?.avatar || "");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      setError("Invalid format. Please upload PNG, JPG, or WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB limit.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreviewAvatar(result);
      setAvatar(result);
      setUploading(false);
    };
    reader.onerror = () => {
      setError("Failed to read image.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPreviewAvatar("");
    setAvatar("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiClient.put("/auth/me", {
        name: name || displayName,
        displayName: displayName || name,
        avatar,
      });

      if (res.data.success) {
        setSuccess("Profile updated successfully.");
        if (checkSession) await checkSession();
        setTimeout(() => {
          router.back();
        }, 1200);
      } else {
        setError(res.data.error || "Failed to update profile.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update profile.");
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
    <div className="w-full h-[calc(100dvh-65px)] flex flex-col overflow-hidden bg-background">
      {/* Fixed Header */}
      <div className="shrink-0 sticky top-0 z-20 px-4 py-3.5 border-b border-border/40 bg-background flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-black text-foreground tracking-tight">Edit Profile</h1>
            <p className="text-[11px] text-muted-foreground">Update your personal profile information</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-black rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-8 space-y-5 max-w-2xl">

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-500 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {/* Profile Photo Section */}
        <PremiumCard className="p-5 bg-card border-border/80 rounded-xl">
          <h3 className="text-xs font-black text-foreground uppercase tracking-wider mb-4">Profile Photo</h3>

          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-border overflow-hidden flex items-center justify-center">
                {previewAvatar ? (
                  <img src={previewAvatar} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-gold">{initials}</span>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-background/80 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-gold" />
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-2 bg-gold hover:bg-[#F0BC2B] text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {previewAvatar ? "Change Photo" : "Upload Photo"}
                </button>
                {previewAvatar && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Supported: PNG, JPG, WebP. Max 5MB.</p>
            </div>
          </div>
        </PremiumCard>

        {/* Profile Details Form */}
        <PremiumCard className="p-5 bg-card border-border/80 rounded-xl">
          <h3 className="text-xs font-black text-foreground uppercase tracking-wider mb-4">Personal Information</h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs font-medium focus:border-gold outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display handle (optional)"
                className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs font-medium focus:border-gold outline-none transition-colors"
              />
              <p className="text-[11px] text-muted-foreground">Used as your display name across the workspace.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="w-full h-10 rounded-xl bg-muted/50 border border-border/60 px-3 pr-10 text-xs font-medium text-muted-foreground cursor-not-allowed"
                />
                <Mail className="w-4 h-4 text-muted-foreground/40 absolute right-3 top-3" />
              </div>
              <p className="text-[11px] text-muted-foreground">Email is managed by organization authentication.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Role</label>
              <div className="h-10 rounded-xl bg-gold/10 border border-gold/30 px-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gold" />
                <span className="text-xs font-bold text-gold">{user?.role || "CEO"}</span>
              </div>
            </div>
          </form>
        </PremiumCard>
      </div>
    </div>
  );
}
