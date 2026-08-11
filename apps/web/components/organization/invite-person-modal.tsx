"use client";

import { useState, useEffect } from "react";
import { X, Send, Loader2, AlertCircle, Shield, User, ChevronDown, Check, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";

interface InvitePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvitePersonModal({ isOpen, onClose, onSuccess }: InvitePersonModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"CO-CEO" | "MEMBER">("MEMBER");
  const [managerId, setManagerId] = useState("");
  const [message, setMessage] = useState("");

  const [coCeos, setCoCeos] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [step, setStep] = useState<"FORM" | "CONFIRM">("FORM");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      const workspaceId = localStorage.getItem("workspaceId");
      if (workspaceId) {
        apiClient.get(`/organization/co-ceos?workspaceId=${workspaceId}`)
          .then((res) => {
            if (res.data.success) {
              const list = res.data.coCeos || [];
              setCoCeos(list);
              if (list.length > 0 && !managerId) setManagerId(list[0].id);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, managerId]);

  if (!isOpen) return null;

  const handleNext = async () => {
    if (!email.trim()) { setError("Email address is required."); return; }
    if (role === "MEMBER" && coCeos.length > 0 && !managerId) {
      setError("Please select an Assigned CO-CEO for this Member.");
      return;
    }
    setError("");

    // Validate email first
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const val = await apiClient.post("/organization/invitations/validate", { email: email.trim(), workspaceId });
      if (!val.data.success) {
        setError(val.data.error || "Invitation validation failed.");
        return;
      }
      setStep("CONFIRM");
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Validation failed.");
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post("/invitations/send", {
        email: email.trim(),
        name: name.trim() || undefined,
        role,
        managerId: role === "MEMBER" ? managerId : undefined,
        message: message.trim() || undefined,
        workspaceId,
      });

      if (res.data.success) {
        setEmail("");
        setName("");
        setMessage("");
        setStep("FORM");
        onSuccess();
        onClose();
      } else {
        setError(res.data.error || "Failed to send invitation.");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to send invitation.");
    } finally {
      setSending(false);
    }
  };

  const selectedCoCeo = coCeos.find(c => c.id === managerId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Invite Person</h3>
                <p className="text-[10px] text-muted-foreground">Dispatch organization mandate invitation</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {step === "FORM" ? (
            <div className="space-y-4 text-xs">
              {/* Recipient Name */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arun Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="arun@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                  Organization Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("MEMBER")}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      role === "MEMBER"
                        ? "bg-primary/10 border-primary text-foreground"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">Member</p>
                      <p className="text-[10px] text-muted-foreground">Execution & Development</p>
                    </div>
                    {role === "MEMBER" && <Check className="w-4 h-4 text-primary" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("CO-CEO")}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      role === "CO-CEO"
                        ? "bg-purple-500/10 border-purple-500 text-purple-400"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">CO-CEO</p>
                      <p className="text-[10px] text-muted-foreground">Leadership & Delegation</p>
                    </div>
                    {role === "CO-CEO" && <Check className="w-4 h-4 text-purple-400" />}
                  </button>
                </div>
              </div>

              {/* Mandatory Assigned CO-CEO dropdown for Members */}
              {role === "MEMBER" && (
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 block mb-1">
                    Assigned CO-CEO Supervisor <span className="text-rose-500">*</span>
                  </label>
                  {coCeos.length === 0 ? (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-[11px]">
                      No active CO-CEO found. Member will be assigned directly under CEO.
                    </div>
                  ) : (
                    <select
                      value={managerId}
                      onChange={(e) => setManagerId(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:border-primary outline-none"
                    >
                      {coCeos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.email} (CO-CEO)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Advanced Options Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"} <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                </button>

                {showAdvanced && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                      Optional Welcome Message
                    </label>
                    <textarea
                      placeholder="Welcome to ManMadhan Progress organization execution team..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-primary outline-none resize-none"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Confirmation Step */
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-background border border-border rounded-xl space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Review Invitation Details</span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Recipient Email</span>
                    <span className="font-bold text-foreground">{email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Role</span>
                    <span className="font-bold text-primary">{role}</span>
                  </div>
                </div>

                {role === "MEMBER" && selectedCoCeo && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground block text-[10px]">Assigned CO-CEO Supervisor</span>
                    <span className="font-bold text-purple-400">{selectedCoCeo.name || selectedCoCeo.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            {step === "CONFIRM" ? (
              <>
                <button
                  type="button"
                  onClick={() => setStep("FORM")}
                  className="px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sending ? "Sending..." : "Confirm & Send"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
                >
                  Review Invitation
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
