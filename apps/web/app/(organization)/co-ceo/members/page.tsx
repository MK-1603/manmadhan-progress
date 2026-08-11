"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Users, Target, FolderKanban, AlertCircle, Loader2,
  RefreshCw, ArrowLeft, UserCheck, Clock,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import Link from "next/link";

export default function CoCeoMembersPage() {
  const { socket } = useSocket();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const wsId = localStorage.getItem("workspaceId");
      const res = await apiClient.get(`/org/members?workspaceId=${wsId}`);
      if (res.data?.success) {
        // Filter to show only MEMBER role users (not other CO-CEOs)
        const all = res.data.data || [];
        setMembers(all.filter((m: any) => {
          const r = (m.role || m.workspaceRole || "").toUpperCase();
          return r === "MEMBER";
        }));
      } else {
        setError(res.data?.error || "Failed to load members");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  useEffect(() => {
    if (!socket) return;
    socket.on("MEMBER_ACTIVATED", fetchMembers);
    socket.on("task.updated", fetchMembers);
    return () => {
      socket.off("MEMBER_ACTIVATED", fetchMembers);
      socket.off("task.updated", fetchMembers);
    };
  }, [socket, fetchMembers]);

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/co-ceo/dashboard" className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              CO-CEO · Team
            </p>
            <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none flex items-center gap-2">
              <Users className="w-5 h-5 text-gold" /> My Members
            </h1>
          </div>
        </div>
        <button onClick={fetchMembers} className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-[12px] text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-gold" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Users className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-[14px] font-semibold text-foreground">No members yet</p>
          <p className="text-[12px] text-muted-foreground max-w-xs">
            Members assigned under your management will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              {members.length} Member{members.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-border">
            {members.map((m: any) => (
              <div key={m.id || m.userId} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-[12px] font-bold text-foreground shrink-0">
                  {(m.name || m.displayName || "M").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{m.name || m.displayName || "Member"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.currentTask ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Target className="w-3 h-3 text-gold" />
                      <span className="truncate max-w-[120px]">{m.currentTask}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/50 italic">Idle</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                    m.status === "Active" || m.status === "active"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}>
                    {m.status || "Active"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
