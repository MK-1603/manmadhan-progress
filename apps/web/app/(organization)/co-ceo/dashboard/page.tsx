"use client";

import { useEffect, useState } from "react";
import { Users, Briefcase, AlertCircle, FileCheck, Sparkles, Shield, Activity } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";

export default function CoCeoDashboard() {
  const [members, setMembers] = useState<any[]>([]);
  const { socket } = useSocket();

  const fetchDepartmentMembers = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (workspaceId) {
        const res = await apiClient.get(`/organization/members?workspaceId=${workspaceId}`);
        if (res.data.success) {
          setMembers(res.data.data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepartmentMembers();
    if (socket) {
      socket.on("WORKSPACE_UPDATED", () => fetchDepartmentMembers());
      socket.on("MEMBER_ACTIVATED", () => fetchDepartmentMembers());
    }
    return () => {
      if (socket) {
        socket.off("WORKSPACE_UPDATED");
        socket.off("MEMBER_ACTIVATED");
      }
    };
  }, [socket]);

  return (
    <div className="w-full max-w-[1440px] mx-auto p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold tracking-tight text-foreground">CO-CEO Executive Command</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              <Shield className="w-3 h-3" /> Leadership Hub
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">
            Oversee assigned team members, monitor department execution, and handle executive approvals.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-layer-1 border border-border/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Assigned Members</span>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">{members.length}</p>
        </div>
        
        <div className="p-6 rounded-2xl bg-layer-1 border border-border/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Projects</span>
            <Briefcase className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">3</p>
        </div>
        
        <div className="p-6 rounded-2xl bg-layer-1 border border-border/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pending Approvals</span>
            <FileCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">12</p>
        </div>

        <div className="p-6 rounded-2xl bg-layer-1 border border-border/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Alerts</span>
            <AlertCircle className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">2</p>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-2xl bg-layer-1 border border-border/40 p-6">
        <h2 className="text-[16px] font-bold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" /> Assigned Team Members
        </h2>
        {members.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs border border-border/30 rounded-xl bg-layer-2/50">
            <Sparkles className="w-6 h-6 text-purple-400/40 mx-auto mb-2 animate-pulse" />
            No members assigned to your leadership section yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-layer-2/60 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id} className="border-b border-border/30 hover:bg-layer-2/40 transition-colors text-xs">
                    <td className="px-4 py-3.5 font-bold text-foreground">{member.displayName || member.name || member.email}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{member.role}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                        {member.status || "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
