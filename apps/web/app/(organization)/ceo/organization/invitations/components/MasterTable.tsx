import React, { useState } from "react";
import { Clock, Mail, CheckCircle2, XCircle, Sparkles, Hash, Shield, User, ChevronDown, ChevronUp, RefreshCw, Trash2, Pencil, Copy, Check, Activity, X, MessageCircle, UserCheck } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import apiClient from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MasterTableProps {
  invitations: any[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRefresh?: () => void;
}

export function MasterTable({ invitations, selectedId, onSelect, onRefresh }: MasterTableProps) {
  const [editingInv, setEditingInv] = useState<any | null>(null);
  const [deletingInv, setDeletingInv] = useState<any | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editBatch, setEditBatch] = useState("");
  const [editRole, setEditRole] = useState<"CO-CEO" | "MEMBER">("MEMBER");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ACCEPTED" | "REVOKED">("ALL");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
      case "Queued":
      case "Sending":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3 mr-1" />{status}</span>;
      case "Delivered":
      case "Opened":
      case "Viewed":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"><Mail className="w-3 h-3 mr-1" />{status}</span>;
      case "Accepted":
      case "Activated":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><Sparkles className="w-3 h-3 mr-1" />Workspace Accepted</span>;
      case "Revoked":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20"><XCircle className="w-3 h-3 mr-1" />Revoked</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border">{status}</span>;
    }
  };

  const handleCopyLink = (inv: any) => {
    const link = `${window.location.origin}/invite/${inv.token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsAppShare = (inv: any) => {
    const link = `${window.location.origin}/invite/${inv.token}`;
    const text = `Hello ${inv.name || 'there'},\n\nYou have been invited to join our organization workspace on ManMadhan Progress as a ${inv.role}.\n\nClick the link below to activate your account:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleResend = async (inv: any) => {
    try {
      setIsActionLoading(true);
      await apiClient.post(`/invitations/${inv.id}/resend`);
      onRefresh?.();
    } catch (err) {
      console.error("Resend error", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRevoke = async (inv: any) => {
    try {
      setIsActionLoading(true);
      await apiClient.post(`/invitations/${inv.id}/revoke`);
      onRefresh?.();
    } catch (err) {
      console.error("Revoke error", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingInv) return;
    try {
      setIsActionLoading(true);
      await apiClient.delete(`/invitations/${deletingInv.id}`);
      setDeletingInv(null);
      onRefresh?.();
    } catch (err) {
      console.error("Delete error", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setIsActionLoading(true);
      await apiClient.delete("/invitations/clear-all");
      onRefresh?.();
    } catch (err) {
      console.error("Clear all error", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const exportCSV = () => {
    if (invitations.length === 0) return;
    const headers = "ID,Email,Name,Role,BatchNumber,Status,CreatedAt\n";
    const rows = invitations.map(i => `"${i.id}","${i.email}","${i.name || ''}","${i.role}","${i.batchNumber || ''}","${i.status}","${i.createdAt}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invitations-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const startEdit = (inv: any) => {
    setEditingInv(inv);
    setEditEmail(inv.email || "");
    setEditBatch(inv.batchNumber || "");
    setEditRole(inv.role === "CO-CEO" ? "CO-CEO" : "MEMBER");
  };

  const handleSaveEdit = async () => {
    if (!editingInv) return;
    try {
      setIsActionLoading(true);
      await apiClient.put(`/invitations/${editingInv.id}`, {
        email: editEmail,
        batchNumber: editBatch,
        role: editRole,
      });
      setEditingInv(null);
      onRefresh?.();
    } catch (err) {
      console.error("Save edit error", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredByStatus = invitations.filter(inv => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "PENDING") return ["Pending", "Queued", "Sending", "Delivered", "Opened", "Viewed"].includes(inv.status);
    if (statusFilter === "ACCEPTED") return ["Accepted", "Activated"].includes(inv.status);
    if (statusFilter === "REVOKED") return inv.status === "Revoked";
    return true;
  });

  if (invitations.length === 0) {
    return (
      <div className="w-full h-44 flex flex-col items-center justify-center text-muted-foreground text-xs border border-border/40 rounded-2xl bg-layer-1 p-6 text-center">
        <Sparkles className="w-8 h-8 text-gold/40 mb-2 animate-pulse" />
        <span className="font-semibold text-foreground">No Organization Invitations Found</span>
        <span className="text-muted-foreground mt-1">Use the dispatch panel on the left to issue new invitations.</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border border-border/40 rounded-2xl bg-layer-1 shadow-none relative space-y-0">
      {/* Top Filter & Toolbar Bar */}
      <div className="p-3 border-b border-border/40 bg-layer-2/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex bg-layer-2 p-0.5 rounded-lg border border-border/40 text-[11px] font-bold">
          {(["ALL", "PENDING", "ACCEPTED", "REVOKED"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1 rounded-md transition-all uppercase tracking-wider ${
                statusFilter === tab ? "bg-layer-3 text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Manual Refresh"
              className="p-1.5 rounded-lg bg-layer-2 border border-border/40 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-[11px] font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
          <button
            onClick={exportCSV}
            title="Export to CSV"
            className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-colors font-bold text-[11px] flex items-center gap-1"
          >
            Export CSV
          </button>
          <button
            onClick={handleClearAll}
            title="Clear all test invitation records"
            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors font-semibold text-[11px] flex items-center gap-1"
          >
            Clear Invites
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/40 bg-layer-2/60 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3.5">Member</th>
              <th className="px-4 py-3.5">Batch</th>
              <th className="px-4 py-3.5">Role</th>
              <th className="px-4 py-3.5">Assigned CO-CEO</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Date Sent</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs">
            {filteredByStatus.map((inv) => {
              const isSelected = selectedId === inv.id;
              
              const steps = [
                { label: "Invitation Created", isDone: true, date: inv.createdAt },
                { label: "Email Delivered", isDone: ["Delivered", "Opened", "Viewed", "Accepted", "Activated"].includes(inv.status), date: inv.emailDeliveryTime },
                { label: "Email Opened", isDone: ["Opened", "Viewed", "Accepted", "Activated"].includes(inv.status), date: inv.emailOpenTime },
                { label: "Invitation Accepted", isDone: ["Accepted", "Activated"].includes(inv.status), date: null },
                { label: "Workspace Activated", isDone: inv.status === "Activated", date: null },
              ];

              const progressPct = inv.status === 'Activated' ? 100 : inv.status === 'Accepted' ? 75 : inv.status === 'Opened' || inv.status === 'Viewed' ? 50 : 20;

              return (
                <React.Fragment key={inv.id}>
                  <tr 
                    onClick={() => onSelect(isSelected ? null : inv.id)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-layer-2/50",
                      isSelected && "bg-layer-2/80"
                    )}
                  >
                    <td className="px-4 py-3.5 font-bold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-layer-3 flex items-center justify-center font-bold text-[11px] text-foreground border border-border/50 shrink-0">
                          {inv.name ? inv.name.charAt(0).toUpperCase() : inv.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-semibold text-foreground">{inv.name || inv.email?.split("@")[0]}</span>
                          <span className="text-[11px] text-muted-foreground truncate">{inv.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                      {inv.batchNumber ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-layer-2 border border-border/40 text-foreground font-semibold">
                          <Hash className="w-3 h-3 mr-1 text-gold" /> {inv.batchNumber}
                        </span>
                      ) : "—"}
                    </td>

                    <td className="px-4 py-3.5">
                      {inv.role === "CO-CEO" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20 text-[11px]">
                          <Shield className="w-3 h-3" /> CO-CEO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-500/10 text-slate-300 font-medium border border-slate-500/20 text-[11px]">
                          <User className="w-3 h-3" /> Member
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {inv.role === "CO-CEO" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold/10 text-gold font-bold border border-gold/20 text-[11px]">
                          Executive Board
                        </span>
                      ) : inv.assignedCoCeoName || inv.assignedCoCeoEmail ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20 text-[11px]">
                          <UserCheck className="w-3 h-3 text-gold" /> {inv.assignedCoCeoName || inv.assignedCoCeoEmail}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">CEO Direct</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">{getStatusBadge(inv.status)}</td>

                    <td className="px-4 py-3.5 text-muted-foreground text-[11px]">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleCopyLink(inv)} 
                          title="Copy Invitation Link"
                          className="p-1.5 rounded-lg hover:bg-layer-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          onClick={() => handleWhatsAppShare(inv)} 
                          title="Share via WhatsApp"
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                        </button>
                        <button 
                          onClick={() => startEdit(inv)} 
                          title="Edit Invitation"
                          className="p-1.5 rounded-lg hover:bg-layer-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleResend(inv)} 
                          title="Resend Email Invitation"
                          className="p-1.5 rounded-lg hover:bg-layer-3 text-muted-foreground hover:text-gold transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleRevoke(inv)} 
                          title="Revoke Invitation"
                          className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setDeletingInv(inv)} 
                          title="Permanently Delete Invitation"
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onSelect(isSelected ? null : inv.id)}
                          className="p-1.5 rounded-lg hover:bg-layer-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Live AI Timeline Drawer */}
                  {isSelected && (
                    <tr className="bg-layer-2/30 border-b border-border/40">
                      <td colSpan={6} className="p-4 sm:p-5">
                        <div className="rounded-xl border border-border/40 bg-layer-1 p-4 sm:p-5 space-y-4 shadow-none">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-border/40">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-gold" />
                              <span className="font-bold text-xs text-foreground">Live AI Dispatch Feed</span>
                              <span className="text-[10px] text-muted-foreground font-mono">({inv.email})</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">Activation Level:</span>
                              <span className="font-bold text-gold">{progressPct}%</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-layer-2 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-500 to-gold rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                          </div>

                          {/* Step timeline */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                            {steps.map((step, idx) => (
                              <div key={idx} className={`p-2.5 rounded-lg border text-left space-y-1 ${step.isDone ? 'bg-gold/10 border-gold/30 text-foreground' : 'bg-layer-2/50 border-border/40 text-muted-foreground'}`}>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                  {step.isDone ? <Check className="w-3.5 h-3.5 text-gold shrink-0" /> : <Clock className="w-3.5 h-3.5 shrink-0 opacity-50" />}
                                  <span className="truncate">{step.label}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {step.date && step.isDone ? new Date(step.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : step.isDone ? "Completed" : "Waiting"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Invitation Modal */}
      {editingInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-layer-1 border border-border/50 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Pencil className="w-4 h-4 text-gold" /> Edit Invitation
              </h3>
              <button onClick={() => setEditingInv(null)} className="p-1 rounded-lg hover:bg-layer-2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Email</label>
                <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="h-9 text-xs bg-layer-2 border-border/50 mt-1" />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Batch Number</label>
                <Input value={editBatch} onChange={e => setEditBatch(e.target.value)} className="h-9 text-xs bg-layer-2 border-border/50 mt-1" />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Role</label>
                <div className="grid grid-cols-2 gap-2 mt-1 bg-layer-2 p-1 rounded-xl border border-border/40">
                  <button
                    type="button"
                    onClick={() => setEditRole("CO-CEO")}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${editRole === "CO-CEO" ? "bg-layer-3 text-foreground shadow-xs" : "text-muted-foreground"}`}
                  >
                    CO-CEO
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole("MEMBER")}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${editRole === "MEMBER" ? "bg-layer-3 text-foreground shadow-xs" : "text-muted-foreground"}`}
                  >
                    Member
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-border/40">
              <Button variant="ghost" onClick={() => setEditingInv(null)} className="h-9 text-xs">Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={isActionLoading} className="h-9 text-xs font-bold bg-primary text-primary-foreground">
                {isActionLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation AI Modal */}
      {deletingInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-layer-1 border border-rose-500/30 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Permanently Delete Invitation?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure you want to delete invitation for <strong className="text-foreground">{deletingInv.email}</strong>?
                Once deleted, this link will immediately become inaccessible and show "Invitation Not Found".
              </p>
            </div>
            <div className="pt-2 flex gap-2 justify-center">
              <Button variant="ghost" onClick={() => setDeletingInv(null)} className="h-9 text-xs flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmDelete} 
                disabled={isActionLoading} 
                className="h-9 text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 flex-1"
              >
                {isActionLoading ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
