"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, Sparkles, Send, Users, ShieldCheck } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";
import { Input } from "@/components/ui/input";

import { RightPanel } from "./components/RightPanel";
import { MasterTable } from "./components/MasterTable";

export default function InvitationsPage() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const { socket } = useSocket();

  const fetchInvitations = async () => {
    try {
      const workspaceId = user?.workspaceId || (typeof window !== "undefined" ? localStorage.getItem("workspaceId") || "" : "");
      const res = await apiClient.get(`/invitations?workspaceId=${workspaceId}`);
      if (res.data.success) {
        setInvitations(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load invitations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();

    if (socket) {
      socket.on("INVITATION_SENT", () => fetchInvitations());
      socket.on("INVITATION_SEND_FAILED", () => fetchInvitations());
      socket.on("INVITATION_UPDATED", () => fetchInvitations());
      socket.on("INVITATION_ACCEPTED", () => fetchInvitations());
      socket.on("INVITATION_DELETED", () => fetchInvitations());
    }

    return () => {
      if (socket) {
        socket.off("INVITATION_SENT");
        socket.off("INVITATION_SEND_FAILED");
        socket.off("INVITATION_UPDATED");
        socket.off("INVITATION_ACCEPTED");
        socket.off("INVITATION_DELETED");
      }
    }
  }, [socket, user?.workspaceId]);

  const filtered = invitations.filter(i => 
    i.email?.toLowerCase().includes(search.toLowerCase()) ||
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.batchNumber?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1440px] mx-auto w-full min-h-[calc(100vh-80px)] animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold tracking-tight text-foreground">Invitation Center</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              <ShieldCheck className="w-3 h-3" /> Executive Dispatch
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">
            Dispatch, manage, and monitor secure organization invitations with live audit timeline tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-layer-2 px-3.5 py-1.5 rounded-xl border border-border/50">
          <Users className="w-4 h-4 text-gold" />
          <span>Total Dispatched: <strong className="text-foreground">{invitations.length}</strong></span>
        </div>
      </div>

      {/* 2-Column AI Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: AI Dispatch Form (4 cols) */}
        <div className="lg:col-span-4">
          <RightPanel onInvitationSent={fetchInvitations} />
        </div>

        {/* Right Column: Combined Master Table & Live Activity Hub (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-foreground">Live Invitations & Activity Hub</h2>
              <p className="text-[12px] text-muted-foreground">Click any row to expand its live step-by-step dispatch timeline.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search name, email or batch..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-layer-1 border-border/50 focus:border-gold"
              />
            </div>
          </div>

          <MasterTable 
            invitations={filtered} 
            selectedId={selectedId} 
            onSelect={setSelectedId} 
            onRefresh={fetchInvitations}
          />
        </div>
      </div>
    </div>
  );
}

