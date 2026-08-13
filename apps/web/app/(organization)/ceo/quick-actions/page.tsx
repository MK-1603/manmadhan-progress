"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Zap, FolderKanban, CheckSquare, UserPlus,
  FileText, History, Bell, BarChart3, Users,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";

const ACTIONS = [
  {
    category: "Execution",
    items: [
      {
        id: "new-project",
        name: "New Project",
        description: "Create and assign an organization project.",
        icon: FolderKanban,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        action: "modal-project",
      },
      {
        id: "new-task",
        name: "Assign Task",
        description: "Create and assign a task to a team member.",
        icon: CheckSquare,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        action: "modal-task",
      },
      {
        id: "timeline",
        name: "View Timeline",
        description: "Review organization execution history.",
        icon: History,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        href: "/ceo/timeline",
      },
    ],
  },
  {
    category: "People",
    items: [
      {
        id: "invite",
        name: "Invite Member",
        description: "Send an email invitation to join the org.",
        icon: UserPlus,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        href: "/ceo/invitations",
      },
      {
        id: "members",
        name: "View Members",
        description: "See all team members and their status.",
        icon: Users,
        color: "text-indigo-500",
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/20",
        href: "/ceo/members",
      },
      {
        id: "co-ceos",
        name: "View CO-CEOs",
        description: "Manage CO-CEO assignments and profiles.",
        icon: Users,
        color: "text-rose-500",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        href: "/ceo/co-ceos",
      },
    ],
  },
  {
    category: "Analytics",
    items: [
      {
        id: "reports",
        name: "Reports",
        description: "Organization-wide execution analytics.",
        icon: BarChart3,
        color: "text-gold",
        bg: "bg-gold/10",
        border: "border-gold/20",
        href: "/ceo/reports",
      },
      {
        id: "notifications",
        name: "Notifications",
        description: "Review all organization notifications.",
        icon: Bell,
        color: "text-cyan-500",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/20",
        href: "/ceo/notifications",
      },
      {
        id: "documents",
        name: "Documents",
        description: "Access organization documents and files.",
        icon: FileText,
        color: "text-slate-400",
        bg: "bg-slate-500/10",
        border: "border-slate-500/20",
        href: "/ceo/documents",
      },
    ],
  },
];

export default function QuickActionsPage() {
  const router = useRouter();
  const [showProject, setShowProject] = useState(false);
  const [showTask, setShowTask]       = useState(false);

  const handleAction = (item: any) => {
    if (item.href)              router.push(item.href);
    if (item.action === "modal-project") setShowProject(true);
    if (item.action === "modal-task")    setShowTask(true);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">

      {/* Header */}
      <div className="shrink-0 px-6 py-6 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-0.5">
          <Zap className="w-5 h-5 text-gold fill-gold/20" />
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Quick Actions</h1>
        </div>
        <p className="text-[12px] text-muted-foreground">Jump to common workflows without navigating the sidebar.</p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-5 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {ACTIONS.map(group => (
            <div key={group.category}>
              <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                {group.category}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleAction(item)}
                      className="group text-left bg-card border border-border p-5 rounded-2xl hover:border-gold/40 hover:shadow-sm transition-all flex flex-col gap-3"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.bg} ${item.border} group-hover:scale-105 transition-transform`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[14px] font-bold text-foreground group-hover:text-gold transition-colors">
                            {item.name}
                          </p>
                          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-gold transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showProject && (
        <CreateProjectModal
          isOpen={showProject}
          onClose={() => setShowProject(false)}
          onSuccess={() => { setShowProject(false); router.push("/ceo/projects"); }}
        />
      )}
      {showTask && (
        <CreateTaskModal
          isOpen={showTask}
          onClose={() => setShowTask(false)}
          onSuccess={() => { setShowTask(false); router.push("/ceo/tasks"); }}
        />
      )}
    </div>
  );
}
