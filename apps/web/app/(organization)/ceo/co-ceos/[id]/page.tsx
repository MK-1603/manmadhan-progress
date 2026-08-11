"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, UserCheck, Briefcase, CheckSquare,
  Users, AlertCircle, Loader2, Trophy, ChevronRight,
  PlusCircle, CheckCircle2, FolderKanban,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { CreateProjectModal } from "@/components/projects/create-project-modal";

type Tab = "profile" | "projects" | "tasks" | "members" | "performance";

interface SuccessState {
  type: "task" | "project";
  title: string;
  id: string;
  assigneeName: string;
}

export default function CoCeoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { socket } = useSocket();

  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);

  const fetchPerson = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId || !id) return;
      const res = await apiClient.get(
        `/organization/people/${id}/summary?workspaceId=${workspaceId}`
      );
      if (res.data.success) {
        setPerson(res.data.data);
      } else {
        setError(res.data.error || "Failed to load profile");
      }
    } catch {
      setError("Unable to load CO-CEO profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerson();
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    socket.on("MEMBER_ACTIVATED", fetchPerson);
    socket.on("organization.updated", fetchPerson);
    socket.on("task.created", fetchPerson);
    socket.on("project.created", fetchPerson);
    return () => {
      socket.off("MEMBER_ACTIVATED", fetchPerson);
      socket.off("organization.updated", fetchPerson);
      socket.off("task.created", fetchPerson);
      socket.off("project.created", fetchPerson);
    };
  }, [socket]);

  const handleTaskCreated = (task: any) => {
    setShowTaskModal(false);
    setSuccessState({
      type: "task",
      title: task.title,
      id: task.id,
      assigneeName: person?.name || "CO-CEO",
    });
    // Refetch profile counts
    fetchPerson();
  };

  const handleProjectCreated = (project: any) => {
    setShowProjectModal(false);
    setSuccessState({
      type: "project",
      title: project.name,
      id: project.id,
      assigneeName: person?.name || "CO-CEO",
    });
    // Refetch profile counts
    fetchPerson();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="p-6 max-w-[800px] mx-auto">
        <Link
          href="/ceo/co-ceos"
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to CO-CEOs
        </Link>
        <div className="flex items-center gap-2 p-4 bg-card border border-border rounded-xl text-[13px] text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error || "CO-CEO profile not found."}
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "projects", label: "Projects" },
    { id: "tasks", label: "Tasks" },
    { id: "members", label: "Managed Members" },
    { id: "performance", label: "Performance" },
  ];

  // ── Success screen after task/project assignment ──
  if (successState) {
    const isTask = successState.type === "task";
    return (
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-16 max-w-[700px] mx-auto w-full space-y-6">
        <Link
          href="/ceo/co-ceos"
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to CO-CEOs
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
              {isTask ? "TASK CREATED" : "PROJECT CREATED"}
            </p>
            <h2 className="text-[20px] font-bold text-foreground">{successState.title}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
            <div className="px-4 py-3 bg-background border border-border rounded-xl">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Assigned To</p>
              <p className="text-[13px] font-semibold text-foreground mt-1">{successState.assigneeName}</p>
            </div>
            <div className="px-4 py-3 bg-background border border-border rounded-xl">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Role</p>
              <p className="text-[13px] font-semibold text-purple-500 mt-1">CO-CEO</p>
            </div>
            <div className="px-4 py-3 bg-background border border-border rounded-xl col-span-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
              <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 mt-1">
                PENDING ACCEPTANCE
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href={isTask ? `/ceo/tasks` : `/ceo/projects/${successState.id}`}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-card border border-border hover:border-primary text-[12px] font-semibold text-foreground rounded-xl transition-colors"
            >
              {isTask ? <CheckSquare className="w-3.5 h-3.5" /> : <FolderKanban className="w-3.5 h-3.5" />}
              {isTask ? "View Tasks" : "Open Project"}
            </Link>
            <button
              onClick={() => setSuccessState(null)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground text-[12px] font-semibold rounded-xl transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" /> Back to {person.name}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-16 max-w-[1000px] mx-auto w-full space-y-6">
      {/* Back navigation */}
      <Link
        href="/ceo/co-ceos"
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to CO-CEOs
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-purple-500/10 border-2 border-purple-500/30 text-purple-500 font-bold text-xl flex items-center justify-center shrink-0">
              {person.name ? person.name.charAt(0).toUpperCase() : "C"}
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-foreground leading-tight">
                {person.name}
              </h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">{person.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  CO-CEO
                </span>
                <span
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                    person.status === "ACTIVE" || person.status === "Activated"
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {person.status || "ACTIVE"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex items-center gap-2 self-start shrink-0">
            <button
              type="button"
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-card border border-border hover:border-gold hover:bg-gold/5 rounded-xl text-[12px] font-semibold text-foreground transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-gold" /> Assign Task
            </button>
            <button
              type="button"
              onClick={() => setShowProjectModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gold hover:bg-gold/90 text-[#111827] rounded-xl text-[12px] font-semibold transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" /> Assign Project
            </button>
          </div>
        </div>

        {/* KPI Strip — real data from API */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-border">
          {[
            { label: "Projects", value: person.projectsCount ?? 0, color: "text-amber-500" },
            { label: "Tasks", value: person.tasksCount ?? 0, color: "text-blue-500" },
            { label: "Completed", value: person.completedTasks ?? 0, color: "text-emerald-500" },
            { label: "Overdue", value: person.overdueTasks ?? 0, color: person.overdueTasks > 0 ? "text-rose-500" : "text-emerald-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-background border border-border rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <p className={`text-[20px] font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h2 className="text-[13px] font-bold text-foreground">Organization Role</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="px-4 py-3 bg-background border border-border rounded-xl">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Role</p>
                  <p className="text-[13px] font-semibold text-foreground mt-1">CO-CEO</p>
                </div>
                <div className="px-4 py-3 bg-background border border-border rounded-xl">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Status</p>
                  <p className="text-[13px] font-semibold text-foreground mt-1">{person.status || "ACTIVE"}</p>
                </div>
                <div className="px-4 py-3 bg-background border border-border rounded-xl">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Managed Members</p>
                  <p className="text-[13px] font-semibold text-foreground mt-1">{person.membersCount ?? 0}</p>
                </div>
                <div className="px-4 py-3 bg-background border border-border rounded-xl">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Email</p>
                  <p className="text-[13px] font-semibold text-foreground mt-1 truncate">{person.email}</p>
                </div>
              </div>
            </div>

            {/* Current Work */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="text-[13px] font-bold text-foreground mb-3">Active Mandate</h2>
              {person.currentWork ? (
                <div className="px-4 py-3 bg-background border border-border rounded-xl space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Current Task</p>
                  <p className="text-[13px] font-semibold text-foreground">{person.currentWork.title}</p>
                  {person.currentWork.projectName && (
                    <p className="text-[11px] text-amber-500 font-medium">{person.currentWork.projectName}</p>
                  )}
                  <span className="inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    {person.currentWork.status}
                  </span>
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">No active task currently assigned.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "projects" && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold text-foreground">Assigned Projects</h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{person.projectsCount ?? 0} total</span>
                <button
                  type="button"
                  onClick={() => setShowProjectModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gold hover:bg-gold/90 text-[#111827] text-[10px] font-bold rounded-lg transition-colors"
                >
                  <Briefcase className="w-3 h-3" /> Assign Project
                </button>
              </div>
            </div>
            {(person.projectsCount ?? 0) === 0 ? (
              <div className="text-center py-10 text-[12px] text-muted-foreground">
                <Briefcase className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                No projects assigned yet.
              </div>
            ) : (
              <Link
                href="/ceo/projects"
                className="flex items-center justify-between px-4 py-3 bg-background border border-border rounded-xl hover:border-primary transition-colors"
              >
                <span className="text-[12px] font-semibold text-foreground">
                  View {person.projectsCount} project(s) in Projects
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            )}
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold text-foreground">Tasks</h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{person.tasksCount ?? 0} total</span>
                <button
                  type="button"
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-card border border-gold/40 hover:border-gold text-[10px] font-bold text-foreground rounded-lg transition-colors"
                >
                  <CheckSquare className="w-3 h-3 text-gold" /> Assign Task
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "In Progress", value: Math.max(0, (person.tasksCount ?? 0) - (person.completedTasks ?? 0) - (person.overdueTasks ?? 0)), color: "text-blue-500" },
                { label: "Completed", value: person.completedTasks ?? 0, color: "text-emerald-500" },
                { label: "Overdue", value: person.overdueTasks ?? 0, color: "text-rose-500" },
              ].map((s) => (
                <div key={s.label} className="bg-background border border-border rounded-xl p-3 text-center">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">{s.label}</p>
                  <p className={`text-[18px] font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold text-foreground">Managed Members</h2>
              <span className="text-[11px] text-muted-foreground">{person.membersCount ?? 0} members</span>
            </div>
            {(person.membersCount ?? 0) === 0 ? (
              <div className="text-center py-10 text-[12px] text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                No members assigned to this CO-CEO yet.
              </div>
            ) : (
              <Link
                href="/ceo/members"
                className="flex items-center justify-between px-4 py-3 bg-background border border-border rounded-xl hover:border-primary transition-colors"
              >
                <span className="text-[12px] font-semibold text-foreground">
                  View {person.membersCount} managed member(s)
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            )}
          </div>
        )}

        {activeTab === "performance" && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="text-[13px] font-bold text-foreground">Performance Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Total Tasks", value: person.tasksCount ?? 0 },
                { label: "Completed", value: person.completedTasks ?? 0 },
                { label: "Overdue", value: person.overdueTasks ?? 0 },
                {
                  label: "Completion Rate",
                  value: person.tasksCount > 0
                    ? `${Math.round(((person.completedTasks ?? 0) / person.tasksCount) * 100)}%`
                    : "—",
                },
                { label: "Managed Members", value: person.membersCount ?? 0 },
                { label: "Active Projects", value: person.projectsCount ?? 0 },
              ].map((s) => (
                <div key={s.label} className="bg-background border border-border rounded-xl p-3 text-center">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <p className="text-[18px] font-bold text-foreground mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Performance is calculated from real task and project data.
            </p>
            <Link
              href="/ceo/leaderboard"
              className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
            >
              <Trophy className="w-3.5 h-3.5" /> View Leaderboard
            </Link>
          </div>
        )}
      </div>

      {/* ── Create Task Modal — CO-CEO pre-selected ── */}
      {showTaskModal && person && (
        <CreateTaskModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          onSuccess={handleTaskCreated}
          defaultAssigneeId={person.id}
          defaultAssigneeName={person.name}
          defaultAssigneeRole="CO-CEO"
        />
      )}

      {/* ── Create Project Modal — CO-CEO pre-selected ── */}
      {showProjectModal && person && (
        <CreateProjectModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onSuccess={handleProjectCreated}
          defaultAssigneeId={person.id}
          defaultAssigneeName={person.name}
        />
      )}
    </div>
  );
}
