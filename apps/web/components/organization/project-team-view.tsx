"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users, Plus, Shield, UserCheck, Trash2, Loader2, AlertCircle, X, Check, Search } from "lucide-react";
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
    setLoading(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/projects/${projectId}/members${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        setTeam(res.data.data.team || []);
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
    if (projectId) fetchTeam();
  }, [projectId, fetchTeam]);

  const fetchEligibleUsers = async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/projects/eligible-assignees${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.data) {
        setEligibleUsers(res.data.data.all || []);
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

  const filteredUsers = eligibleUsers.filter((u) => {
    const isAlreadyMember = team.some((tm) => tm.userId === u.id);
    const matchesSearch =
      (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(userSearch.toLowerCase());
    return !isAlreadyMember && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Controls */}
      <div className="flex items-center justify-between gap-4 border-b border-[#E4E7EC] dark:border-[#272D36] pb-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F]" />
            <span>Project Team</span>
          </h2>
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
            People assigned to execute and contribute to this project.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="h-[38px] px-4 rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-bold hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Member</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12.5px] font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Team Cards Grid */}
      {loading ? (
        <div className="p-12 flex items-center justify-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[14px] border border-[#E4E7EC] dark:border-[#272D36]">
          <Loader2 className="w-7 h-7 animate-spin text-[#C9A52A] dark:text-[#D4B12F]" />
        </div>
      ) : team.length === 0 ? (
        <div className="p-8 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[14px] border border-[#E4E7EC] dark:border-[#272D36] space-y-3">
          <Users className="w-9 h-9 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
          <div className="space-y-1">
            <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No project members assigned yet</h3>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] max-w-md mx-auto">
              Add organization members to assign work items and track execution progress.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="h-[38px] px-4 rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer mt-1"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Member</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-3.5 hover:border-[#C9A52A] transition-all shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#C9A52A]/10 border border-[#C9A52A]/20 flex items-center justify-center text-[#C9A52A] dark:text-[#D4B12F] font-bold text-[14px] shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">
                      {member.name}
                    </h4>
                    <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] truncate">
                      {member.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setRemovingId(member.id)}
                  className="p-1.5 rounded-md text-[#667085] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                  title="Remove from project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11.5px] border-t border-[#E4E7EC]/60 dark:border-[#272D36]/60 pt-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] border border-[#C9A52A]/20 font-bold uppercase tracking-wider text-[10px]">
                  {member.projectRole.replace("_", " ")}
                </span>

                <span className="text-[#667085] dark:text-[#8B95A5] font-medium">
                  {member.orgRole}
                </span>
              </div>

              {/* Member Work Stats */}
              <div className="space-y-1 bg-[#F8F9FB] dark:bg-[#111419] p-2.5 rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36]">
                <div className="flex items-center justify-between text-[11.5px] font-mono">
                  <span className="text-[#667085] dark:text-[#8B95A5]">Assigned Work</span>
                  <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">
                    {member.completedTasks}/{member.assignedTasks} completed ({member.progress}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full transition-all duration-500"
                    style={{ width: `${member.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-x-hidden">
          <div className="w-full sm:max-w-md bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-t-[20px] sm:rounded-[16px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden font-sans">
            <div className="px-5 py-4 border-b border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between bg-[#F8F9FB] dark:bg-[#111419]">
              <div>
                <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  Add Project Team Member
                </h3>
                <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
                  Assign an organization member to this project workspace.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-[#667085] hover:bg-[#E4E7EC] dark:hover:bg-[#272D36]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Project Execution Role
                </label>
                <select
                  value={projectRole}
                  onChange={(e) => setProjectRole(e.target.value as any)}
                  className="w-full h-[42px] px-3.5 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                >
                  <option value="CONTRIBUTOR">Contributor / Member</option>
                  <option value="EXECUTION_LEAD">Execution Lead (CO-CEO)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Select Organization Member
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                  <input
                    type="text"
                    placeholder="Search member by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 h-[40px] rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
                  />
                </div>

                <div className="max-h-[200px] overflow-y-auto divide-y divide-[#E4E7EC] dark:divide-[#272D36] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F]">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-[12px] text-[#667085]">
                      No eligible members found.
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className={`w-full p-3 text-left flex items-center justify-between transition-colors ${
                          selectedUserId === u.id ? "bg-[#C9A52A]/10 border-l-4 border-l-[#C9A52A]" : "hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                        }`}
                      >
                        <div>
                          <div className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{u.name} ({u.role})</div>
                          <div className="text-[11.5px] text-[#667085]">{u.email}</div>
                        </div>
                        {selectedUserId === u.id && <Check className="w-4 h-4 text-[#C9A52A]" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between bg-[#F8F9FB] dark:bg-[#111419]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="h-[38px] px-4 rounded-[10px] text-[#667085] text-[12.5px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedUserId || adding}
                onClick={handleAddMember}
                className="h-[38px] px-5 rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
                <span>Add Member</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!removingId}
        title="Remove Member from Project?"
        description="Are you sure you want to remove this member from the project team? Their assigned tasks will remain in the project."
        count={1}
        isSubmitting={deleting}
        onClose={() => setRemovingId(null)}
        onConfirm={confirmRemoveMember}
      />
    </div>
  );
}
