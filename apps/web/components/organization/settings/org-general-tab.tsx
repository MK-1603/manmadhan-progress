"use client";

import { useState, useEffect } from "react";
import {
  Building2, Upload, Trash2, Check, AlertCircle, Save, Loader2, Image as ImageIcon,
  Copy, Globe, Mail, Clock, Eye, AlertTriangle, RotateCcw, ArrowRight
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import apiClient from "@/lib/api-client";
import { OrganizationLogo } from "@/components/organization/org-logo";

interface OrgGeneralTabProps {
  workspace: any;
  userRole: string;
  onUpdated: (ws: any) => void;
  onNavigateTab?: (tabId: string) => void;
}

export function OrgGeneralTab({ workspace, userRole, onUpdated, onNavigateTab }: OrgGeneralTabProps) {
  const [name, setName] = useState(workspace?.name && workspace.name !== "Personal Workspace" ? workspace.name : "");
  const [batchNumber, setBatchNumber] = useState(workspace?.batchNumber || "");
  const [description, setDescription] = useState(workspace?.description || "");
  const [website, setWebsite] = useState(workspace?.website || "");
  const [contactEmail, setContactEmail] = useState(workspace?.contactEmail || "");
  const [logoUrl, setLogoUrl] = useState(workspace?.logoUrl || "");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isLeadership = userRole === "CEO" || userRole === "CO-CEO";

  useEffect(() => {
    if (workspace) {
      setName(workspace.name && workspace.name !== "Personal Workspace" ? workspace.name : "");
      setBatchNumber(workspace.batchNumber || "");
      setDescription(workspace.description || "");
      setWebsite(workspace.website || "");
      setContactEmail(workspace.contactEmail || "");
      setLogoUrl(workspace.logoUrl || "");
    }
  }, [workspace]);

  const isDirty =
    name !== (workspace?.name || "") ||
    batchNumber !== (workspace?.batchNumber || "") ||
    description !== (workspace?.description || "") ||
    website !== (workspace?.website || "") ||
    contactEmail !== (workspace?.contactEmail || "") ||
    logoUrl !== (workspace?.logoUrl || "");

  const handleDiscard = () => {
    if (workspace) {
      setName(workspace.name && workspace.name !== "Personal Workspace" ? workspace.name : "");
      setBatchNumber(workspace.batchNumber || "");
      setDescription(workspace.description || "");
      setWebsite(workspace.website || "");
      setContactEmail(workspace.contactEmail || "");
      setLogoUrl(workspace.logoUrl || "");
    }
    setError("");
    setSuccess("");
  };

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
        name: name.trim() || "ManMadhan Workspace",
        logoUrl: logoUrl || null,
        description: description.trim(),
        website: website.trim(),
        contactEmail: contactEmail.trim(),
      });

      if (res.data.success) {
        if (typeof window !== "undefined") {
          if (logoUrl) {
            localStorage.setItem("orgLogo", logoUrl);
          } else {
            localStorage.removeItem("orgLogo");
          }
          window.dispatchEvent(new Event("orgLogoUpdated"));
        }
        setSuccess("Organization identity updated successfully ✓");
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

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Invalid file format. Please upload PNG, JPG, WebP, or SVG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit. Please choose a smaller image.");
      return;
    }

    if (!workspace?.id) {
      setError("Organization workspace ID not found.");
      return;
    }

    setUploading(true);

    const tempObjectUrl = URL.createObjectURL(file);
    setLogoUrl(tempObjectUrl);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Result = reader.result as string;
      try {
        const res = await apiClient.post(`/workspaces/${workspace.id}/logo`, {
          image: base64Result,
          mimeType: file.type,
        });

        if (res.data.success && res.data.data?.logoUrl) {
          const permanentUrl = res.data.data.logoUrl;
          setLogoUrl(permanentUrl);
          if (typeof window !== "undefined") {
            localStorage.setItem("orgLogo", permanentUrl);
            window.dispatchEvent(new Event("orgLogoUpdated"));
          }
          setSuccess("Organization logo uploaded and saved successfully ✓");
          if (onUpdated) onUpdated(res.data.data);
          setTimeout(() => setSuccess(""), 4000);
        } else {
          setError(res.data.error || "Failed to upload logo.");
          setLogoUrl(workspace?.logoUrl || "");
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || "Failed to upload organization logo.");
        setLogoUrl(workspace?.logoUrl || "");
      } finally {
        setUploading(false);
        URL.revokeObjectURL(tempObjectUrl);
      }
    };

    reader.onerror = () => {
      setError("Failed to read image file.");
      setUploading(false);
      URL.revokeObjectURL(tempObjectUrl);
    };

    reader.readAsDataURL(file);
  };

  const handleConfirmRemoveLogo = async () => {
    if (!workspace?.id) return;
    setShowRemoveModal(false);
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiClient.put(`/workspaces/${workspace.id}`, { logoUrl: null });
      if (res.data.success) {
        setLogoUrl("");
        if (typeof window !== "undefined") {
          localStorage.removeItem("orgLogo");
          window.dispatchEvent(new Event("orgLogoUpdated"));
        }
        setSuccess("Organization logo removed successfully");
        if (onUpdated) onUpdated(res.data.data);
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError(res.data.error || "Failed to remove logo");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to remove logo");
    } finally {
      setUploading(false);
    }
  };

  const handleCopyId = () => {
    const rawId = workspace?.id || "ORG-MM1603";
    navigator.clipboard.writeText(rawId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const orgIdDisplay = workspace?.id || "ORG-MM1603";

  return (
    <div className="space-y-4 max-w-5xl w-full mx-auto pb-12 font-sans">
      {/* Sticky Top Action Bar */}
      <div className="sticky top-0 z-20 bg-[#090B0F]/95 backdrop-blur-md py-3 px-4 rounded-xl border border-white/10 flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#F4F7F5] tracking-tight">Profile & Branding</h2>
          <p className="text-[11px] text-[#9AA4B2] font-medium">Organization identity and public-facing workspace information.</p>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving || uploading}
              className="h-9 px-3.5 rounded-lg border border-white/10 bg-[#0B0E13] text-xs font-semibold text-[#F4F7F5] hover:bg-[#141820] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#9AA4B2]" />
              <span>Discard</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={!isDirty || saving || uploading || !isLeadership}
            className={`h-9 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              isDirty
                ? "bg-gold text-black hover:bg-gold/90 shadow-xs cursor-pointer active:scale-95"
                : "bg-[#0B0E13] text-[#667085] border border-white/5 cursor-not-allowed opacity-60"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* 1. ORGANIZATION IDENTITY */}
      <PremiumCard className="p-4 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
        <div className="border-b border-white/10 pb-2.5">
          <h3 className="text-xs font-bold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-gold" /> 1. Organization Identity
          </h3>
          <p className="text-[11px] text-[#9AA4B2] font-medium mt-0.5">
            Your organization's primary identity across ManMadhan Progress.
          </p>
        </div>

        {/* Logo Section */}
        <div className="p-3.5 rounded-xl bg-[#0B0E13] border border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <OrganizationLogo logoUrl={logoUrl} name={name} size="xl" />

          <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  onChange={handleLogoFileChange}
                  disabled={uploading || !isLeadership}
                  className="hidden"
                />
                <span
                  className={`h-8 px-3.5 rounded-lg bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                    uploading ? "opacity-50 cursor-wait" : "cursor-pointer"
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" /> {logoUrl ? "Change Logo" : "Upload Logo"}
                    </>
                  )}
                </span>
              </label>

              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setShowRemoveModal(true)}
                  disabled={uploading || !isLeadership}
                  className="h-8 px-3 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#9AA4B2] font-medium leading-relaxed">
              PNG, JPG, WebP or SVG · Max file size: <span className="font-bold text-[#F4F7F5]">5 MB</span>.
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-[#F4F7F5] mb-1.5">
              ORGANIZATION NAME <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ManMadhan Progress Workspace"
              disabled={!isLeadership}
              className="w-full h-10 px-3.5 rounded-lg bg-[#0B0E13] border border-white/10 text-xs font-medium text-[#F4F7F5] placeholder:text-[#667085] focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#F4F7F5] mb-1.5">
              ORGANIZATION ID <span className="text-[#667085] font-normal">(System Read-Only)</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={orgIdDisplay}
                readOnly
                className="w-full h-10 pl-3.5 pr-16 rounded-lg bg-[#0B0E13]/80 border border-white/5 font-mono text-xs font-bold text-[#9AA4B2] cursor-not-allowed select-all"
              />
              <button
                type="button"
                onClick={handleCopyId}
                className="absolute right-1.5 h-7 px-2.5 rounded-md bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#F4F7F5] mb-1.5">
            ORGANIZATION DESCRIPTION
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this workspace is responsible for and what the organization uses it to manage..."
            disabled={!isLeadership}
            className="w-full p-3.5 rounded-lg bg-[#0B0E13] border border-white/10 text-xs font-medium text-[#F4F7F5] placeholder:text-[#667085] focus:outline-none focus:border-gold transition-colors resize-none"
          />
        </div>
      </PremiumCard>

      {/* 2. CONTACT */}
      <PremiumCard className="p-4 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
        <div className="border-b border-white/10 pb-2.5">
          <h3 className="text-xs font-bold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-gold" /> 2. Contact
          </h3>
          <p className="text-[11px] text-[#9AA4B2] font-medium mt-0.5">
            How people and systems reach this organization workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#F4F7F5] mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-[#9AA4B2]" /> WEBSITE / PORTAL URL
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://organization-domain.com"
              disabled={!isLeadership}
              className="w-full h-10 px-3.5 rounded-lg bg-[#0B0E13] border border-white/10 text-xs font-medium text-[#F4F7F5] placeholder:text-[#667085] focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#F4F7F5] mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-[#9AA4B2]" /> CONTACT EMAIL
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@organization-domain.com"
              disabled={!isLeadership}
              className="w-full h-10 px-3.5 rounded-lg bg-[#0B0E13] border border-white/10 text-xs font-medium text-[#F4F7F5] placeholder:text-[#667085] focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        </div>
      </PremiumCard>

      {/* 3. OPERATIONS */}
      <PremiumCard className="p-4 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
        <div className="border-b border-white/10 pb-2.5">
          <h3 className="text-xs font-bold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gold" /> 3. Operations
          </h3>
          <p className="text-[11px] text-[#9AA4B2] font-medium mt-0.5">
            Organization working schedule and system availability rules.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#F4F7F5] mb-1.5">TIMEZONE</label>
            <input
              type="text"
              value="Asia/Kolkata (en-IN)"
              readOnly
              className="w-full h-10 px-3.5 rounded-lg bg-[#0B0E13]/80 border border-white/5 text-xs font-bold text-[#9AA4B2] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#F4F7F5] mb-1.5">WORKING HOURS POLICY</label>
            <div className="flex items-center justify-between h-10 px-3.5 rounded-lg bg-[#0B0E13] border border-white/10">
              <span className="text-xs font-semibold text-[#F4F7F5]">Canonical Working Hours Schedule</span>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab("working-hours")}
                  className="text-xs font-bold text-gold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Working Hours</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </PremiumCard>

      {/* 4. BRAND PREVIEW */}
      <PremiumCard className="p-4 bg-[#0F1218] border-white/10 rounded-xl space-y-4">
        <div className="border-b border-white/10 pb-2.5 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-gold" /> 4. Brand Preview
            </h3>
            <p className="text-[11px] text-[#9AA4B2] font-medium mt-0.5">
              Live preview of organization identity across ManMadhan Progress.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gold/30 bg-[#0B0E13] space-y-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <OrganizationLogo logoUrl={logoUrl} name={name} size="lg" />
            <div className="min-w-0">
              <h4 className="text-sm font-extrabold text-[#F4F7F5] truncate">
                {name.trim() || "ManMadhan Workspace"}
              </h4>
              <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 inline-block mt-0.5">
                Organization Workspace
              </span>
            </div>
          </div>

          <p className="text-xs text-[#9AA4B2] font-medium leading-relaxed truncate">
            {description.trim() || "Execution and progress management workspace for ManMadhan."}
          </p>

          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#667085] pt-1.5 border-t border-white/5">
            <span>ID: {orgIdDisplay}</span>
            {website && <span>• {website}</span>}
            {contactEmail && <span>• {contactEmail}</span>}
          </div>
        </div>
      </PremiumCard>

      {/* REMOVE LOGO CONFIRMATION MODAL */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#0F1218] border border-white/10 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[#F4F7F5]">Remove Organization Logo?</h3>
            </div>

            <p className="text-xs text-[#9AA4B2] leading-relaxed">
              The organization identity will return to its default initials (<span className="font-bold text-gold">MM</span>) across all application components until a new logo is uploaded.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowRemoveModal(false)}
                className="h-9 px-4 rounded-lg bg-[#0B0E13] border border-white/10 text-[#F4F7F5] hover:bg-[#141820] text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveLogo}
                className="h-9 px-4 rounded-lg bg-rose-500 text-white hover:bg-rose-600 text-xs font-bold transition-colors cursor-pointer"
              >
                Remove Logo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
