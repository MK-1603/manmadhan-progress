"use client";

import { useEffect, useState } from "react";
import { PremiumCard } from "@/components/ui/premium-card";
import { Users, Search, MoreVertical, Edit2, ShieldAlert, UserCheck } from "lucide-react";
import apiClient from "@/lib/api-client";
import Image from "next/image";
import { InvitationPanel } from "@/components/organization/invitation-panel";

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const workspaceId = localStorage.getItem("workspaceId") || "default";
        const res = await apiClient.get(`/organization/members?workspaceId=${workspaceId}`);
        if (res.data.success) {
          setMembers(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load members", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(search.toLowerCase()) || 
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-500" /> Member Management
          </h1>
          <p className="text-muted-foreground mt-1">View and manage all members in your organization.</p>
        </div>
        <button 
          onClick={() => setIsInviteOpen(true)}
          className="h-10 px-4 rounded-xl bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20 flex items-center gap-2"
        >
          Invite Member
        </button>
      </div>

      <PremiumCard className="p-0 overflow-hidden layer-2 border-border/50">
        <div className="p-4 border-b border-border bg-layer-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search members by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-layer-2 border border-border rounded-xl focus:border-gold outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {/* Filters can go here */}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-layer-1/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Member</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Assigned CO-CEO</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                      Loading members...
                    </div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-border/50 hover:bg-layer-3/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full bg-layer-3 flex items-center justify-center border border-border overflow-hidden shrink-0">
                          {member.avatar ? (
                            <Image src={member.avatar} alt={member.name} fill className="object-cover" />
                          ) : (
                            <span className="font-bold text-muted-foreground text-xs">{member.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{member.displayName || member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-layer-3 border border-border">
                        {member.role === "CEO" ? <ShieldAlert className="w-3 h-3 mr-1 text-gold" /> : null}
                        {member.role}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {member.role === "MEMBER" || member.role === "Member" ? (
                        member.assignedCoCeoName || member.assignedCoCeoEmail ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <UserCheck className="w-3 h-3 text-gold" />
                            <span>{member.assignedCoCeoName || member.assignedCoCeoEmail}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">CEO Direct</span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/10 text-gold border border-gold/20">
                          Executive Board
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${member.status === 'Created' || member.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <span className="text-xs font-medium text-foreground">{member.status || "Active"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-layer-3 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>

      <InvitationPanel 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
      />
    </div>
  );
}
