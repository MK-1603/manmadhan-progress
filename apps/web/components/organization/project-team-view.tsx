"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users, Plus, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import apiClient from "@/lib/api-client";
import { DeleteConfirmationModal } from "@/components/organization/delete-confirmation-modal";

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  orgRole: string;
  projectRole: "OWNER" | "EXECUTION_LEAD" | "CONTRIBUTOR";
  assignedTasks: number;
  completedTasks: number;
  progress: number;
  joinedAt: string;
}

interface ProjectTeamViewProps {
  projectId: string;
  ownerName?: string;
}

export function ProjectTeamView({ projectId, ownerName }: ProjectTeamViewProps) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [projectRole, setProjectRole] = useState<"EXECUTION_LEAD" | "CONTRIBUTOR">("CONTRIBUTOR");
  const [adding, setAdding] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Delete Member Confirmation State
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTeam = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/projects/${projectId}/members${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        const teamData = res.data.data?.team || res.data?.team || res.data?.data || [];
        setTeam(Array.isArray(teamData) ? teamData : []);
        setError("");
      } else {
        setError(res.data?.error || "Failed to load project team members.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load team members.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const fetchEligibleUsers = async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/projects/eligible-assignees${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.members || res.data?.data?.all || res.data?.coCeos) {
        const allUsers = [
          ...(res.data.coCeos || []),
          ...(res.data.members || []),
          ...(res.data.data?.all || []),
        ];
        setEligibleUsers(allUsers);
      }
    } catch (err) {
      console.error("Failed to fetch assignees:", err);
    }
  };

  const handleOpenAddModal = () => {
    setSelectedUserId("");
    setProjectRole("CONTRIBUTOR");
    setUserSearch("");
    setShowAddModal(true);
    fetchEligibleUsers();
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.post(`/org/projects/${projectId}/members${wsId ? `?workspaceId=${wsId}` : ""}`, {
        assignedToUserId: selectedUserId,
        projectRole,
      });
      setShowAddModal(false);
      fetchTeam();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to add member to project.");
    } finally {
      setAdding(false);
    }
  };

  const confirmRemoveMember = async () => {
    if (!removingId) return;
    setDeleting(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.delete(`/org/projects/${projectId}/members/${removingId}${wsId ? `?workspaceId=${wsId}` : ""}`);
      setRemovingId(null);
      fetchTeam();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to remove team member.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Header & Controls */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C9A52A]" />
            <span>Project Team</span>
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            People assigned to execute and contribute to this project.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="h-[36px] px-4 rounded-xl bg-[#C9A52A] text-[#0B0D10] text-xs font-extrabold hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Member</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchTeam}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Team Cards Grid */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center bg-card rounded-2xl border border-border space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A52A]" />
          <span className="text-xs text-muted-foreground font-medium">Loading project team...</span>
        </div>
      ) : team.length === 0 ? (
        <div className="p-8 text-center bg-card rounded-2xl border border-border space-y-3 max-w-md mx-auto my-4">
          <Users className="w-8 h-8 text-[#C9A52A] mx-auto opacity-80" />
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-foreground">No project members assigned yet</h3>
            <p className="text-[11px] text-muted-foreground">
              Add organization members to assign work items and track execution progress.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="h-[34px] px-4 rounded-xl bg-[#C9A52A] text-[#0B0D10] text-xs font-extrabold hover:brightness-105 inline-flex items-center gap-1.5 cursor-pointer mt-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Member</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-2xl bg-card border border-border space-y-3.5 hover:border-[#C9A52A]/40 transition-all shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#C9A52A]/10 border border-[#C9A52A]/20 flex items-center justify-center text-[#C9A52A] font-extrabold text-xs shrink-0">
                    {member.name ? member.name.charAt(0).toUpperCase() : "M"}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-foreground truncate">
                      {member.name || member.email}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {member.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {removingId && (
        <DeleteConfirmationModal
          isOpen={!!removingId}
          onClose={() => setRemovingId(null)}
          onConfirm={confirmRemoveMember}
          title="Remove Member?"
          description="Are you sure you want to remove this member from the project assignment?"
          isSubmitting={deleting}
        />
      )}
    </div>
  );
}
