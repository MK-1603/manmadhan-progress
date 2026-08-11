"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Search, Loader2, AlertCircle, Clock, CheckSquare,
  Activity, ChevronRight, User, FolderKanban, Trophy,
  Plus, RefreshCw, Circle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";
import { TaskCreateModal } from "@/components/organization/task-create-modal";

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "In Progress": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Accepted": "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "Review": "text-purple-500 bg-purple-500/10 border-purple-500/20",
    "Assigned": "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "Completed": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Approved": "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (["Approved", "Completed"].includes(status)) return false;
  return new Date(deadline) < new Date();
}

export default function CoCeoMembersPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [members, setMembers] = useState<any[]>([]);
  const [memberTasks, setMemberTasks] = useState<Record<string, any[]>>({});
  const [memberCurrentTasks, setMemberCurrentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState<string | undefined>(undefined);

  const fetchAll = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const [membersRes, currentRes] = await Promise.all([
        apiClient.get(`/organization/members?workspaceId=${workspaceId}`),
        apiClient.get(`/org/tasks/current?workspaceId=${workspaceId}`),
      ]);

      if (membersRes.data.success) {
        const all: any[] = membersRes.data.data || [];
        // CO-CEO sees members they manage
        const mine = all.filter((m: any) =>
          m.managerId === user?.id || (m.role === "MEMBER" && m.managerId === user?.id)
        );
        setMembers(mine.length > 0 ? mine : all.filter((m: any) => m.role === "MEMBER"));
      }

      if (currentRes.data.success) {
        setMemberCurrentTasks(currentRes.data.data?.memberCurrentTasks || []);
      }
    } catch { setError("Unable to load members"); }
    finally { setLoading(false); }
  }, [user?.id]);

  const fetchMemberTasks = useCallback(async (memberId: string) => {
    if (memberTasks[memberId]) return; // cached
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/org/tasks?workspaceId=${workspaceId}&assigneeId=${memberId}`);
      if (res.data.success) {
        setMemberTasks(prev => ({ ...prev, [memberId]: res.data.data || [] }));
      }
    } catch { /* silently fail */ }
  }, [memberTasks]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (selectedMember) fetchMemberTasks(selectedMember.id);
  }, [selectedMember, fetchMemberTasks]);

  useEffect(() => {
    if (!socket) return;
    socket.on("MEMBER_ACTIVATED", fetchAll);
    socket.on("task.updated", fetchAll);
    return () => { socket.off("MEMBER_ACTIVATED"); socket.off("task.updated"); };
  }, [socket, fetchAll]);

  const getTaskEntry = (memberId: string) =>
    memberCurrentTasks.find((e: any) => e.member.id === memberId);

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return (m.name || m.displayName || m.email || "").toLowerCase().includes(q)
      || (m.email || "").toLowerCase().includes(q);
  });

  const MemberDetailPanel = ({ member }: { member: any }) => {
    const tasks = memberTasks[member.id] || [];
    const currentEntry = getTaskEntry(member.id);
    const activeTasks = tasks.filter(t => !["Completed", "Approved"].includes(t.status));
    const completedTasks = tasks.filter(t => ["Completed", "Approved"].includes(t.status));
    const overdueTasks = tasks.filter(t => isOverdue(t.deadline, t.status));

    return (
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-5"
      >
        {/* Member header */}
        <PremiumCard>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-xl font-bold text-emerald-500 shrink-0">
              {(member.displayName || member.name || member.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground">
                {member.displayName || member.name || "Member"}
              </p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {member.role || "MEMBER"}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  member.status === "Activated"
                    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                    : "text-muted-foreground bg-muted border-border"
                }`}>
                  {member.status || "Active"}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => { setAssignTarget(member.id); setShowAssignModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Assign Task
              </button>
            </div>
          </div>
        </PremiumCard>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active", value: activeTasks.length, color: "text-amber-500" },
            { label: "Completed", value: completedTasks.length, color: "text-emerald-500" },
            { label: "Overdue", value: overdueTasks.length, color: overdueTasks.length > 0 ? "text-rose-500" : "text-muted-foreground" },
          ].map(s => (
            <PremiumCard key={s.label} className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </PremiumCard>
          ))}
        </div>

        {/* Current task */}
        {currentEntry?.currentTask && (
          <PremiumCard>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Currently Working On
            </p>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{currentEntry.currentTask.title}</p>
                {currentEntry.currentTask.projectName && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <FolderKanban className="w-3 h-3 inline mr-1" />
                    {currentEntry.currentTask.projectName}
                  </p>
                )}
                {currentEntry.currentTask.deadline && (
                  <p className={`text-xs mt-0.5 ${isOverdue(currentEntry.currentTask.deadline, currentEntry.currentTask.status) ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    Due {new Date(currentEntry.currentTask.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor(currentEntry.currentTask.status)}`}>
                {currentEntry.currentTask.status}
              </span>
            </div>
          </PremiumCard>
        )}

        {/* All tasks */}
        {tasks.length > 0 && (
          <PremiumCard className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                All Tasks ({tasks.length})
              </p>
            </div>
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                    {t.deadline && (
                      <p className={`text-[11px] mt-0.5 ${isOverdue(t.deadline, t.status) ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
                        Due {new Date(t.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${statusColor(t.status)}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </PremiumCard>
        )}
      </motion.div>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-500" /> My Team
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Members under your management — current status and task progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => { setAssignTarget(undefined); setShowAssignModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Assign Task
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Member list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm font-medium text-muted-foreground">No members assigned to you yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Ask the CEO to assign members to your supervision
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(member => {
                const entry = getTaskEntry(member.id);
                const isSelected = selectedMember?.id === member.id;
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(isSelected ? null : member)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${
                      isSelected
                        ? "border-purple-500/40 bg-purple-500/5"
                        : "border-border bg-card hover:border-border/80 hover:bg-accent/30"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-500 shrink-0">
                      {(member.displayName || member.name || member.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {member.displayName || member.name || member.email}
                      </p>
                      {entry?.currentTask ? (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          → {entry.currentTask.title}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/50 italic mt-0.5">No active task</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {entry?.currentTask ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${statusColor(entry.currentTask.status)}`}>
                          {entry.currentTask.status}
                        </span>
                      ) : (
                        <Circle className="w-2 h-2 text-muted-foreground/30" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {selectedMember ? (
              <MemberDetailPanel key={selectedMember.id} member={selectedMember} />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8"
              >
                <User className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground font-medium">Select a member to view details</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  See their current work, task history, and performance
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <TaskCreateModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onCreated={fetchAll}
        role="CO-CEO"
      />
    </div>
  );
}
