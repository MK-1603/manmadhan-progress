"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Check, ExternalLink, ImagePlus, Loader2, Lock, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";

type Organization = {
  id: string; name: string; shortName: string; description: string; logoUrl: string | null;
  website: string; contactEmail: string; createdAt: string; memberCount: number; coCeoCount: number;
  owner?: { name: string; email: string } | null;
};

const emptyOrganization: Organization = { id: "", name: "", shortName: "", description: "", logoUrl: null, website: "", contactEmail: "", createdAt: "", memberCount: 0, coCeoCount: 0 };

export function OrganizationSettings({ canEdit }: { canEdit: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization>(emptyOrganization);
  const [form, setForm] = useState<Organization>(emptyOrganization);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [showDiscard, setShowDiscard] = useState(false);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(organization), [form, organization]);

  useEffect(() => {
    apiClient.get("/organization/profile").then((res) => {
      if (res.data.success) { setOrganization(res.data.data); setForm(res.data.data); }
    }).catch(() => setStatus("error")).finally(() => setLoading(false));
  }, []);

  const update = (key: keyof Organization, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const uploadLogo = async (file: File) => {
    if (!canEdit || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setStatus("error"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const upload = await apiClient.post("/storage/upload", { file: reader.result, folder: "organization-logos" });
        if (upload.data.success) update("logoUrl", upload.data.url);
      } catch { setStatus("error"); }
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!canEdit || saving) return;
    setSaving(true); setStatus("idle");
    try {
      const res = await apiClient.patch("/organization/profile", form);
      if (!res.data.success) throw new Error(res.data.error);
      setOrganization(res.data.data); setForm(res.data.data); setStatus("saved");
    } catch { setStatus("error"); } finally { setSaving(false); }
  };

  const leave = () => { if (dirty && canEdit) setShowDiscard(true); else router.back(); };

  if (loading) return <div className="p-6 md:p-10 text-sm text-muted-foreground">Loading organization settings…</div>;

  return (
    <div className="min-h-[100dvh] p-4 pb-24 md:p-8 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-start gap-3 mb-7">
        <button onClick={leave} className="md:hidden mt-0.5 p-2 -ml-2 rounded-lg hover:bg-muted" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Organization</p><h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Organization Settings</h1><p className="mt-1 text-sm text-muted-foreground">Manage identity and organization-level configuration.</p></div>
      </div>

      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 md:p-7 border-b border-border flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Organization Profile</h2><p className="text-sm text-muted-foreground mt-1">This identity is shared across your organization workspace.</p></div>{!canEdit && <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="w-3.5 h-3.5" /> Read only</span>}</div>
        <div className="p-5 md:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"><div className="w-16 h-16 rounded-2xl border border-border bg-muted flex items-center justify-center overflow-hidden text-xl font-bold">{form.logoUrl ? <img src={form.logoUrl} alt="Organization logo" className="w-full h-full object-cover" /> : (form.shortName || form.name.slice(0, 1) || "O")}</div><div><p className="text-sm font-semibold">Organization Logo</p><p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF or WebP up to 5 MB.</p>{canEdit && <div className="flex gap-2 mt-2"><label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-xs font-semibold cursor-pointer"><ImagePlus className="w-3.5 h-3.5" /> Change<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && uploadLogo(event.target.files[0])} /></label>{form.logoUrl && <button onClick={() => update("logoUrl", "")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /> Remove</button>}</div>}</div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Organization Name" value={form.name} disabled={!canEdit} onChange={(v) => update("name", v)} />
            <Field label="Short Name" value={form.shortName} disabled={!canEdit} onChange={(v) => update("shortName", v)} />
            <Field label="Website" value={form.website} disabled={!canEdit} placeholder="https://example.com" onChange={(v) => update("website", v)} />
            <Field label="Contact Email" value={form.contactEmail} disabled={!canEdit} type="email" onChange={(v) => update("contactEmail", v)} />
          </div>
          <label className="block"><span className="text-xs font-semibold text-muted-foreground">Description</span><textarea value={form.description} disabled={!canEdit} onChange={(event) => update("description", event.target.value)} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/30 disabled:opacity-60 resize-y" /></label>
          {canEdit && <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-2"><span className={`text-xs ${status === "error" ? "text-red-500" : status === "saved" ? "text-emerald-500" : "text-muted-foreground"}`}>{status === "error" ? "Unable to save changes" : status === "saved" ? "Saved" : ""}</span><button onClick={save} disabled={!dirty || saving} className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : status === "saved" ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saving ? "Saving…" : status === "saved" ? "Saved" : "Save Changes"}</button></div>}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <InfoCard title="Organization Details" icon={<Building2 className="w-4 h-4" />}><Info label="Organization ID" value={organization.id} /><Info label="Created" value={organization.createdAt ? new Date(organization.createdAt).toLocaleDateString() : "—"} /><Info label="Owner / CEO" value={organization.owner?.name || user?.displayName || user?.name || "—"} /><Info label="Members" value={`${organization.memberCount} members · ${organization.coCeoCount} CO-CEOs`} /></InfoCard>
        <InfoCard title="Working Hours" icon={<Check className="w-4 h-4" />}><p className="text-sm font-semibold">04:00 AM — 11:00 PM</p><p className="text-xs text-muted-foreground mt-1">System OFF: 11:00 PM — 04:00 AM</p></InfoCard>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">{[["Members", "/members"], ["Roles & Permissions", "/members"], ["Notifications", "/inbox"], ["Scoring & Leaderboard", "/leaderboard"], ["Integrations", "/integrations"], ["Security & Audit", "/audit"]].map(([label, href]) => <a key={label} href={`${user?.role === "CO-CEO" ? "/co-ceo" : user?.role === "MEMBER" ? "/member" : "/ceo"}${href}`} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted/50"><span>{label}</span><ExternalLink className="w-4 h-4 text-muted-foreground" /></a>)}</div>

      {showDiscard && <div className="fixed inset-0 z-[100] bg-background/70 flex items-center justify-center p-4"><div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6"><h3 className="text-lg font-semibold">Unsaved Changes</h3><p className="text-sm text-muted-foreground mt-2">You have unsaved organization changes.</p><div className="flex justify-end gap-2 mt-6"><button onClick={() => setShowDiscard(false)} className="px-4 h-10 rounded-lg text-sm font-semibold hover:bg-muted">Stay</button><button onClick={() => { setShowDiscard(false); router.back(); }} className="px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold">Discard Changes</button></div></div></div>}
    </div>
  );
}

function Field({ label, value, onChange, disabled, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; placeholder?: string; type?: string }) { return <label className="block"><span className="text-xs font-semibold text-muted-foreground">{label}</span><input type={type} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full h-10 rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-gold/30 disabled:opacity-60" /></label>; }
function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="bg-card border border-border rounded-2xl p-5 md:p-6"><h2 className="flex items-center gap-2 font-semibold text-sm"><span className="text-gold">{icon}</span>{title}</h2><div className="mt-5 space-y-3">{children}</div></section>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-semibold text-right break-all">{value}</span></div>; }
