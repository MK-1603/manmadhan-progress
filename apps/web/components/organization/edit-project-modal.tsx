"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, Save, FolderKanban, Users, ShieldAlert } from "lucide-react";
import apiClient from "@/lib/api-client";

interface AssigneeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface ProjectData {
  id: string;
  name: string;
  objective?: string;
  description?: string;
  status: string;
  priority: string;
  deadline?: string;
  ownerId?: string;
  assignment?: {
    assignmentType?: string;
    responsibleCoCeoId?: string;
    assignedToUserId?: string;
  };
}

interface EditProjectModalProps {
  isOpen: boolean;
  project: ProjectData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProjectModal({ isOpen, project, onClose, onSuccess }: EditProjectModalProps) {
  const [activeTab, setActiveTab] = useState<"INFO" | "ASSIGNMENT" | "EXECUTION">("INFO");
  const [name, setName] = useState("");
  const [mandate, setMandate] = useState("");

  const [assignmentType, setAssignmentType] = useState<string>("CEO_TO_CO_CEO");
  const [responsibleCoCeoId, setResponsibleCoCeoId] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("");

  const [status, setStatus] = useState("PLANNING");
  const [priority, setPriority] = useState("MEDIUM");
  const [deadline, setDeadline] = useState("");

  const [coCeos, setCoCeos] = useState<AssigneeUser[]>([]);
  const [members, setMembers] = useState<AssigneeUser[]>([]);
  const [allUsers, setAllUsers] = useState<AssigneeUser[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && project) {
      setActiveTab("INFO");
      setName(project.name || "");
      setMandate(project.objective || project.description || "");
      setStatus(project.status || "PLANNING");
      setPriority((project.priority || "MEDIUM").toUpperCase());
      setDeadline(project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : "");

      setAssignmentType(project.assignment?.assignmentType || "CEO_TO_CO_CEO");
      setResponsibleCoCeoId(project.assignment?.responsibleCoCeoId || "");
      setAssignedToUserId(project.assignment?.assignedToUserId || project.ownerId || "");

      setError("");
      fetchEligibleAssignees();
    }
  }, [isOpen, project]);

  const fetchEligibleAssignees = async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/projects/eligible-assignees${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.data) {
        setCoCeos(res.data.data.coCeos || []);
        setMembers(res.data.data.members || []);
        setAllUsers(res.data.data.all || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch assignees:", err);
    }
  };

  if (!isOpen || !project) return null;

  const handleUpdate = async () => {
    setError("");
    if (!name.trim()) {
      setError("Project Name cannot be empty.");
      return;
    }

    setSubmitting(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.put(`/org/projects/${project.id}${wsId ? `?workspaceId=${wsId}` : ""}`, {
        name: name.trim(),
        mandate: mandate.trim(),
        objective: mandate.trim(),
        status,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        assignmentType,
        responsibleCoCeoId: assignmentType === "CEO_TO_MEMBER" ? responsibleCoCeoId : assignedToUserId,
        assignedToUserId,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-t-[20px] sm:rounded-[16px] shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between bg-[#F8F9FB] dark:bg-[#111419]">
          <div>
            <h2 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-2">
              <span>Edit Project</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] font-semibold border border-[#C9A52A]/20">
                {project.name}
              </span>
            </h2>
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
              Update project mandate, assignment, and execution status
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#667085] dark:text-[#8B95A5] hover:bg-[#E4E7EC] dark:hover:bg-[#272D36] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] px-5 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("INFO")}
            className={`py-3 text-[12.5px] font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "INFO"
                ? "border-[#C9A52A] dark:border-[#D4B12F] text-[#C9A52A] dark:text-[#D4B12F]"
                : "border-transparent text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" /> Project Information
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ASSIGNMENT")}
            className={`py-3 text-[12.5px] font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "ASSIGNMENT"
                ? "border-[#C9A52A] dark:border-[#D4B12F] text-[#C9A52A] dark:text-[#D4B12F]"
                : "border-transparent text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Assignment
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("EXECUTION")}
            className={`py-3 text-[12.5px] font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "EXECUTION"
                ? "border-[#C9A52A] dark:border-[#D4B12F] text-[#C9A52A] dark:text-[#D4B12F]"
                : "border-transparent text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Execution
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12.5px] font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Form Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === "INFO" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Project Mandate *
                </label>
                <textarea
                  rows={5}
                  value={mandate}
                  onChange={(e) => setMandate(e.target.value)}
                  className="w-full p-3 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === "ASSIGNMENT" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Assignment Type
                </label>
                <select
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
                >
                  <option value="CEO_TO_CO_CEO">CEO → CO-CEO</option>
                  <option value="CEO_TO_MEMBER">CEO → MEMBER</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Assigned User
                </label>
                <select
                  value={assignedToUserId}
                  onChange={(e) => setAssignedToUserId(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
                >
                  <option value="">Select User...</option>
                  {(assignmentType === "CEO_TO_CO_CEO" ? (coCeos.length > 0 ? coCeos : allUsers) : (members.length > 0 ? members : allUsers)).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              {assignmentType === "CEO_TO_MEMBER" && (
                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                    Responsible CO-CEO
                  </label>
                  <select
                    value={responsibleCoCeoId}
                    onChange={(e) => setResponsibleCoCeoId(e.target.value)}
                    className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
                  >
                    <option value="">Select Responsible CO-CEO...</option>
                    {(coCeos.length > 0 ? coCeos : allUsers).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {activeTab === "EXECUTION" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between bg-[#F8F9FB] dark:bg-[#111419]">
          <button
            type="button"
            onClick={onClose}
            className="h-[40px] px-4 rounded-[10px] text-[#667085] dark:text-[#8B95A5] text-[13px] font-semibold hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleUpdate}
            className="h-[40px] px-6 rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-bold hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 shadow-xs disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
