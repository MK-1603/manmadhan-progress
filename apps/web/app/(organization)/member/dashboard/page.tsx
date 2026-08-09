"use client";

import { useEffect, useState } from "react";
import { CheckSquare, ListTodo, Users, Calendar, Sparkles, CheckCircle2, Clock } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";

export default function MemberDashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const { socket } = useSocket();

  const fetchTasks = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (workspaceId) {
        const res = await apiClient.get(`/manmadhan/tasks?workspaceId=${workspaceId}`);
        if (res.data.success) {
          setTasks(res.data.data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (socket) {
      socket.on("TASK_ASSIGNED", () => fetchTasks());
    }
    return () => {
      if (socket) socket.off("TASK_ASSIGNED");
    };
  }, [socket]);

  return (
    <div className="w-full max-w-[1440px] mx-auto p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold tracking-tight text-foreground">Member Execution Board</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <Sparkles className="w-3 h-3" /> Execution Hub
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">
            View your assigned execution tasks, upcoming deadlines, and track daily progress.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-layer-1 border border-border/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Assigned Tasks</span>
            <CheckSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">{tasks.length}</p>
        </div>

        <div className="p-6 rounded-2xl bg-layer-1 border border-border/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Upcoming Deadlines</span>
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">{tasks.filter(t => t.deadline).length}</p>
        </div>

        <div className="p-6 rounded-2xl bg-layer-1 border border-border/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Assigned CO-CEO</span>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-xl font-bold text-foreground">CO-CEO Supervisor</p>
        </div>
      </div>

      {/* Task Execution Board */}
      <div className="rounded-2xl bg-layer-1 border border-border/40 p-6">
        <h2 className="text-[16px] font-bold text-foreground mb-4 flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-emerald-400" /> Today's Assigned Tasks
        </h2>
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs border border-border/30 rounded-xl bg-layer-2/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/40 mx-auto mb-2 animate-pulse" />
            <span className="font-semibold text-foreground">No Tasks Pending</span>
            <p className="text-muted-foreground mt-1">You're all caught up for today!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="p-4 border border-border/30 rounded-xl bg-layer-2/60 flex justify-between items-center hover:bg-layer-2 transition-colors">
                <div>
                  <h3 className="font-semibold text-xs text-foreground">{task.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{task.description || "No description provided."}</p>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {task.status || "In Progress"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
