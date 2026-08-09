"use client";

import { motion } from "framer-motion";
import { Clock, Users, Target, Activity, ChevronRight, TrendingUp, User, RefreshCw, CheckCircle2 } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " year" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " month" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " day" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " hr" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " min" + (interval > 1 ? "s" : "") + " ago";
  return "just now";
}

export default function CEODashboard() {
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboard = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/organization/dashboard?workspaceId=${workspaceId}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleWorkspaceUpdate = (payload: any) => {
      fetchDashboard();
    };
    socket.on("workspace_update", handleWorkspaceUpdate);
    return () => {
      socket.off("workspace_update", handleWorkspaceUpdate);
    };
  }, [socket]);

  const handleApprove = async (taskId: string) => {
    try {
      await apiClient.patch(`/manmadhan/tasks/${taskId}`, { status: "Approved" });
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis = data?.kpis || { overallProgress: 0, activeProjectsCount: 0, teamMembers: 0, hoursLogged: 0 };
  
  const stats = [
    { name: "Overall Progress", value: `${kpis.overallProgress}%`, trend: "Real-time", icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Active Projects", value: kpis.activeProjectsCount, trend: "Current", icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Team Members", value: kpis.teamMembers, trend: "Active", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
    { name: "Hours Logged", value: kpis.hoursLogged, trend: "Recorded", icon: Clock, color: "text-gold", bg: "bg-gold/10" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1440px] mx-auto w-full min-h-[calc(100vh-80px)]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="body-text text-muted-foreground mt-2">Here is what needs your attention today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 bg-layer-2 text-foreground text-sm font-semibold rounded-md border border-border hover:bg-layer-3 transition-colors outline-none focus-ring-brand">
            Generate Report
          </button>
          <button className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-md shadow-sm hover:bg-primary/90 transition-colors outline-none focus-ring-brand">
            New Project
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 30 }}
            className="cursor-pointer group"
          >
            <PremiumCard className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="meta-text text-muted-foreground">{stat.name}</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground leading-none">{stat.value}</div>
                <div className="caption-text text-muted-foreground mt-2 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  {stat.trend}
                </div>
              </div>
            </PremiumCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="col-span-4 md:col-span-8 lg:col-span-8 space-y-8">
          
          {/* Active Projects */}
          <section className="flex flex-col min-h-0">
            <PremiumCard className="p-0 flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-layer-1">
                <h2 className="section-title text-foreground">Active Projects</h2>
                <button className="caption-text font-bold text-gold hover:text-gold-hover transition-colors flex items-center gap-1 outline-none focus-ring-brand rounded-sm">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {(!data?.activeProjects || data.activeProjects.length === 0) ? (
                  <div className="p-6 text-center text-muted-foreground">No active projects found.</div>
                ) : (
                  data.activeProjects.map((project: any) => (
                    <div key={project.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-layer-2 transition-colors cursor-pointer group outline-none focus-ring-brand">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10 flex items-center justify-center shrink-0">
                          <Target className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                          <h3 className="body-text font-medium text-foreground group-hover:text-primary transition-colors">{project.name}</h3>
                          <p className="caption-text text-muted-foreground mt-1">
                            {project.deadline ? `Due ${new Date(project.deadline).toLocaleDateString()} • ` : ''}{project.totalTasks} Tasks
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:w-1/3">
                        <div className="flex-1">
                          <div className="flex justify-between meta-text text-foreground mb-2">
                            <span>Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <div className="enterprise-progress-bg !h-1.5">
                            <div className="enterprise-progress-fill !bg-indigo-500" style={{ width: `${project.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PremiumCard>
          </section>

          {/* Recent Activities */}
          <section className="flex flex-col min-h-0">
            <PremiumCard className="p-0 flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-border bg-layer-1">
                <h2 className="section-title text-foreground">Recent Activities</h2>
              </div>
              <div className="p-6 space-y-6">
                {(!data?.recentActivities || data.recentActivities.length === 0) ? (
                  <div className="text-center text-muted-foreground">No recent activities.</div>
                ) : (
                  data.recentActivities.map((act: any) => (
                    <div key={act.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-layer-2 border border-border shrink-0 flex items-center justify-center">
                        {act.userAvatar ? (
                          <img src={act.userAvatar} alt={act.userName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 pb-4 border-b border-border last:border-0 last:pb-0">
                        <p className="body-text text-foreground">
                          <span className="font-semibold">{act.userName || "System"}</span> {act.details}
                        </p>
                        <span className="meta-text text-muted-foreground mt-2 block">
                          {timeAgo(act.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PremiumCard>
          </section>

        </div>

        {/* Right Sidebar Area */}
        <div className="col-span-4 md:col-span-8 lg:col-span-4 space-y-8">
          
          {/* Pending Approvals */}
          <section className="flex flex-col min-h-0">
            <PremiumCard className="p-0 flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-border bg-layer-1">
                <h2 className="section-title text-foreground">Pending Approvals</h2>
              </div>
              <div className="divide-y divide-border">
                {(!data?.pendingApprovals || data.pendingApprovals.length === 0) ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">No pending tasks to approve.</div>
                ) : (
                  data.pendingApprovals.map((task: any) => (
                    <div key={task.id} className="p-6 flex items-start gap-4 hover:bg-layer-2 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="body-text font-medium text-foreground">{task.title}</h4>
                        <p className="caption-text text-muted-foreground mt-1">Submitted by {task.assigneeName}</p>
                        <div className="flex gap-3 mt-4">
                          <button onClick={() => handleApprove(task.id)} className="flex-1 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-md shadow-sm transition-transform active:scale-95 outline-none focus-ring-brand">Approve</button>
                          <button className="flex-1 py-2 bg-layer-2 text-foreground border border-border text-xs font-semibold rounded-md transition-transform active:scale-95 outline-none focus-ring-brand">View</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PremiumCard>
          </section>

          {/* Team Leaderboard */}
          <section className="flex flex-col min-h-0">
            <PremiumCard className="p-0 flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-layer-1">
                <h2 className="section-title text-foreground">Top Performers</h2>
              </div>
              <div className="p-6 space-y-5">
                {(!data?.topPerformers || data.topPerformers.length === 0) ? (
                  <div className="text-center text-muted-foreground text-sm">No task completions today.</div>
                ) : (
                  data.topPerformers.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-layer-2 border border-border flex items-center justify-center meta-text text-foreground uppercase">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="body-text font-medium text-foreground">{user.name}</h4>
                          <p className="caption-text text-muted-foreground mt-0.5">{user.tasksCompleted} tasks done today</p>
                        </div>
                      </div>
                      <div className="body-text font-bold text-primary">#{user.rank}</div>
                    </div>
                  ))
                )}
              </div>
            </PremiumCard>
          </section>

        </div>
      </div>
    </div>
  );
}
