import React, { useState, useEffect } from "react";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, MessageCircle, Send, Plus, Hash, Sparkles, UserCheck, Shield, User } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";
import { useDebounce } from "@/hooks/use-debounce";

interface RightPanelProps {
  onInvitationSent: () => void;
}

export function RightPanel({ onInvitationSent }: RightPanelProps) {
  const { user } = useAuth();
  const workspaceId = user?.workspaceId || (typeof window !== "undefined" ? localStorage.getItem("workspaceId") || "" : "");
  
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"CO-CEO" | "MEMBER">("MEMBER");
  const [assignedCoCeoId, setAssignedCoCeoId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  
  const [emailStatus, setEmailStatus] = useState<"IDLE" | "VALID" | "ERROR">("IDLE");
  const [errorMsg, setErrorMsg] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [success, setSuccess] = useState(false);
  const [coCeos, setCoCeos] = useState<any[]>([]);

  const debouncedEmail = useDebounce(email, 500);

  useEffect(() => {
    async function fetchCoCeos() {
      try {
        const url = workspaceId 
          ? `/organization/co-ceos?workspaceId=${workspaceId}` 
          : `/organization/co-ceos`;
        const res = await apiClient.get(url);
        if (res.data.success && Array.isArray(res.data.coCeos)) {
          setCoCeos(res.data.coCeos);
          if (res.data.coCeos.length > 0 && !assignedCoCeoId) {
            setAssignedCoCeoId(res.data.coCeos[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to load CO-CEOs", e);
      }
    }
    fetchCoCeos();
  }, [workspaceId]);

  useEffect(() => {
    async function validateEmail() {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!debouncedEmail || !emailRegex.test(debouncedEmail)) {
        setEmailStatus("IDLE");
        setErrorMsg("");
        return;
      }

      setIsValidating(true);
      try {
        const res = await apiClient.post("/organization/invitations/validate", { email: debouncedEmail, workspaceId });
        if (res.data.success) {
          setEmailStatus("VALID");
          setErrorMsg("");
        } else {
          setEmailStatus("ERROR");
          setErrorMsg(res.data.error || "Email unavailable");
        }
      } catch (err: any) {
        // Fallback: If backend returns warning or error, allow standard valid formatting
        if (emailRegex.test(debouncedEmail)) {
          setEmailStatus("VALID");
          setErrorMsg("");
        } else {
          setEmailStatus("ERROR");
          setErrorMsg(err.response?.data?.error || "Failed to validate email");
        }
      } finally {
        setIsValidating(false);
      }
    }
    validateEmail();
  }, [debouncedEmail, workspaceId]);

  const canProceed = (emailStatus === "VALID" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && name.trim().length > 1;

  const [mode, setMode] = useState<"SINGLE" | "BATCH">("SINGLE");
  const [batchEmails, setBatchEmails] = useState("");

  const handleBatchSend = async () => {
    const rawList = batchEmails.split(/[\n,]+/).map(s => s.trim()).filter(s => s.includes("@"));
    if (rawList.length === 0) return;
    setIsSending(true);
    try {
      const res = await apiClient.post("/invitations/batch-send", {
        workspaceId,
        emails: rawList,
        role,
        batchNumber: batchNumber || undefined,
      });

      if (res.data.success) {
        setSuccess(true);
        onInvitationSent();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    if (!canProceed) return;
    setIsSending(true);
    try {
      const res = await apiClient.post("/invitations/send", {
        workspaceId,
        email,
        name,
        role,
        batchNumber: batchNumber || undefined,
        managerId: role === "MEMBER" ? (assignedCoCeoId || undefined) : undefined,
      });

      if (res.data.success) {
        setSuccess(true);
        onInvitationSent();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleWhatsApp = () => {
    const text = `Hello ${name},\n\nWelcome to ManMadhan Progress.\n\nAn invitation has been sent to your email address (${email}). Please check your inbox and complete your activation.\n\nRegards,\n${user?.name}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (success) {
    return (
      <div className="h-auto flex flex-col p-6 rounded-2xl bg-layer-1 border border-border/40 relative overflow-hidden">
        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Invitation Dispatched</h3>
          <p className="text-xs text-muted-foreground">The member has been queued and notified.</p>
          <div className="pt-3 space-y-2">
            <Button 
              onClick={handleWhatsApp} 
              className="w-full h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4" /> Share via WhatsApp
            </Button>
            <Button onClick={() => {
              setSuccess(false);
              setEmail("");
              setBatchEmails("");
              setName("");
              setEmailStatus("IDLE");
            }} variant="outline" className="w-full h-9 text-xs font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Invite Another Member
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-auto flex flex-col p-6 rounded-2xl bg-layer-1 border border-border/40 relative overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3 h-3" /> AI Dispatch Engine
        </div>
        <div className="flex bg-layer-2 p-0.5 rounded-lg border border-border/40 text-[10px] font-bold">
          <button 
            type="button" 
            onClick={() => setMode("SINGLE")} 
            className={`px-2.5 py-1 rounded-md transition-all ${mode === "SINGLE" ? "bg-layer-3 text-foreground" : "text-muted-foreground"}`}
          >
            Single
          </button>
          <button 
            type="button" 
            onClick={() => setMode("BATCH")} 
            className={`px-2.5 py-1 rounded-md transition-all ${mode === "BATCH" ? "bg-layer-3 text-foreground" : "text-muted-foreground"}`}
          >
            Bulk Batch
          </button>
        </div>
      </div>

      {mode === "SINGLE" ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Display Name</Label>
            <Input 
              placeholder="John Doe" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="h-10 text-xs bg-layer-2 border-border/50 focus:border-gold"
            />
          </div>

          <div className="space-y-1.5 relative">
            <Label className="text-xs font-semibold text-foreground">Work Email</Label>
            <div className="relative">
              <Input 
                type="email" 
                placeholder="john@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className={`h-10 text-xs bg-layer-2 pr-9 transition-all ${
                  emailStatus === "ERROR" ? "border-destructive focus:border-destructive" : 
                  emailStatus === "VALID" ? "border-emerald-500 focus:border-emerald-500" : "border-border/50 focus:border-gold"
                }`}
              />
              <div className="absolute right-3 top-2.5">
                {isValidating && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                {emailStatus === "VALID" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </div>
            </div>
            {errorMsg && <p className="text-[11px] text-destructive">{errorMsg}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Batch Number</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-3 w-3.5 h-3.5 text-muted-foreground" />
              <Input 
                className="pl-9 h-10 text-xs bg-layer-2 border-border/50 focus:border-gold" 
                placeholder="MK1603" 
                value={batchNumber} 
                onChange={e => setBatchNumber(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Role</Label>
            <div className="grid grid-cols-2 gap-2 bg-layer-2 p-1 rounded-xl border border-border/40">
              <button
                type="button"
                onClick={() => setRole("CO-CEO")}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  role === "CO-CEO" 
                    ? "bg-layer-3 text-foreground shadow-xs border border-border/50" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                CO-CEO
              </button>
              <button
                type="button"
                onClick={() => setRole("MEMBER")}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  role === "MEMBER" 
                    ? "bg-layer-3 text-foreground shadow-xs border border-border/50" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Member
              </button>
            </div>
          </div>

          {role === "MEMBER" && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Assign CO-CEO Supervisor</Label>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {coCeos.length} Available
                </span>
              </div>
              <div className="relative">
                <UserCheck className="absolute left-3 top-3 w-3.5 h-3.5 text-gold" />
                <select 
                  className="flex h-10 w-full rounded-xl border border-border/50 bg-layer-2 pl-9 pr-3 text-xs font-medium text-foreground focus:outline-none focus:border-gold transition-colors cursor-pointer"
                  value={assignedCoCeoId}
                  onChange={e => setAssignedCoCeoId(e.target.value)}
                >
                  <option value="">Select CO-CEO Supervisor (Optional)</option>
                  {coCeos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.displayName || c.name || c.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Upgrade/Invite CO-CEO Action */}
              <button
                type="button"
                onClick={() => setRole("CO-CEO")}
                className="w-full mt-2 py-2 px-3 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>+ Invite & Assign New CO-CEO</span>
              </button>
            </div>
          )}

          <div className="pt-4 mt-5 border-t border-border/40">
            <Button 
              className="w-full h-11 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm group" 
              onClick={handleSend} 
              disabled={!canProceed || isSending}
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Dispatching...</>
              ) : (
                <><Send className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" /> Dispatch Invitation</>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Paste Emails (Comma or Line Separated)</Label>
            <textarea
              rows={4}
              placeholder="alex@acme.com, sara@acme.com&#10;david@acme.com"
              value={batchEmails}
              onChange={e => setBatchEmails(e.target.value)}
              className="w-full text-xs bg-layer-2 border border-border/50 rounded-xl p-3 text-foreground focus:border-gold outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Batch Number Tag</Label>
            <Input 
              className="h-10 text-xs bg-layer-2 border-border/50 focus:border-gold" 
              placeholder="BATCH-MK2026" 
              value={batchNumber} 
              onChange={e => setBatchNumber(e.target.value)} 
            />
          </div>

          <div className="pt-4 mt-5 border-t border-border/40">
            <Button 
              className="w-full h-11 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm group" 
              onClick={handleBatchSend} 
              disabled={!batchEmails.includes("@") || isSending}
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Dispatching Batch...</>
              ) : (
                <><Send className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" /> Dispatch Bulk Batch</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
