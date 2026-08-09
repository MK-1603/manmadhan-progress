"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Filter, Calendar, Clock, CheckCircle2, 
  Circle, AlertCircle, LayoutList, Kanban, MoreHorizontal 
} from "lucide-react";
import { useAuth } from "../../../../components/auth/auth-context";
import apiClient from "@/lib/api-client";
import { ManMadhanTaskCreateModal } from "@/components/organization/manmadhan-task-create-modal";
import { ManMadhanTaskEditModal } from "@/components/organization/manmadhan-task-edit-modal";
import { Trash2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  projectId: string;
  assigneeId: string;
  deadline: string;
  createdAt: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;

      const [tasksRes, projectsRes] = await Promise.all([
        apiClient.get(`/manmadhan/tasks?workspaceId=${workspaceId}`),
        apiClient.get(`/manmadhan/projects?workspaceId=${workspaceId}`)
      ]);
      
      if (tasksRes.data?.success) setTasks(tasksRes.data.data);
      if (projectsRes.data?.success) setProjects(projectsRes.data.data);
    } catch (e) {
      console.error("Failed to fetch tasks", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "Draft": return <Circle className="w-4 h-4 text-slate-400" />;
      case "In Progress": return <Clock className="w-4 h-4 text-blue-500" />;
      case "Review": return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "Completed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.delete(`/manmadhan/tasks/${taskId}?workspaceId=${workspaceId}`);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error("Failed to delete task", err);
      alert("Failed to delete task");
    }
  };

  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // For Kanban
  const statuses = ["Draft", "In Progress", "Review", "Completed"];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      
      {/* Header */}
      <div className="shrink-0 px-6 py-6 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-gold" />
              Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and track action items across all projects.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="h-9 px-4 rounded-lg bg-gold hover:bg-gold/90 text-black font-semibold text-sm flex items-center gap-2 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-9 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button className="h-9 px-3 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <div className="h-9 p-1 rounded-lg border border-border bg-card flex items-center">
              <button 
                onClick={() => setView("list")}
                className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setView("kanban")}
                className={`p-1.5 rounded-md transition-colors ${view === "kanban" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-muted/10">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No tasks found</h3>
            <p className="text-sm text-muted-foreground mb-6">Create a task to assign work to your team.</p>
            <button className="h-9 px-4 rounded-lg bg-gold hover:bg-gold/90 text-black font-semibold text-sm flex items-center gap-2 shadow-sm transition-colors">
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          </div>
        ) : (
          view === "list" ? (
            <div className="flex flex-col gap-2 max-w-5xl mx-auto">
              <AnimatePresence>
                {filteredTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div 
                      onClick={() => { setSelectedTask(task); setIsEditModalOpen(true); }}
                      className="group flex items-center gap-4 p-3.5 pr-4 rounded-xl border border-transparent bg-card hover:border-border hover:shadow-sm transition-all cursor-pointer"
                    >
                      <button className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center shrink-0 transition-colors">
                        {getStatusIcon(task.status)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-gold transition-colors">{task.title}</h3>
                        {task.projectId && (
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Project
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        {task.deadline && (
                          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(task.deadline).toLocaleDateString()}
                          </div>
                        )}
                        <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-card flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          CEO
                        </div>
                        <button 
                          onClick={(e) => handleDeleteTask(e, task.id)}
                          className="p-1.5 rounded-md text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex gap-6 h-full overflow-x-auto pb-4 hide-scrollbar">
              {statuses.map(status => (
                <div key={status} className="w-[320px] shrink-0 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      {getStatusIcon(status)}
                      {status}
                      <span className="text-muted-foreground font-normal ml-1 bg-muted px-1.5 py-0.5 rounded-md text-xs">
                        {filteredTasks.filter(t => t.status === status).length}
                      </span>
                    </h3>
                    <button className="p-1 text-muted-foreground hover:bg-accent hover:text-foreground rounded-md transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col gap-3 bg-muted/30 rounded-xl p-2 min-h-[200px]">
                    <AnimatePresence>
                      {filteredTasks.filter(t => t.status === status).map(task => (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-card border border-border p-3 rounded-lg shadow-sm hover:border-gold/50 cursor-pointer transition-colors group"
                        >
                          <h4 className="text-sm font-semibold text-foreground mb-1 group-hover:text-gold transition-colors">{task.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
                          <div className="flex items-center justify-between mt-auto">
                            {task.deadline ? (
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.deadline).toLocaleDateString()}
                              </div>
                            ) : <div />}
                            <div className="w-5 h-5 rounded-full bg-slate-800 border-2 border-card flex items-center justify-center text-[8px] font-bold text-white">
                              CEO
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <ManMadhanTaskCreateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projects={projects}
        workspaceId={typeof window !== "undefined" ? localStorage.getItem("workspaceId") || "" : ""}
        onSave={(newTask) => {
          setTasks([newTask, ...tasks]);
        }}
      />

      <ManMadhanTaskEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        projects={projects}
        workspaceId={localStorage.getItem("workspaceId") || ""}
        task={selectedTask}
        onSave={(updated) => {
          setTasks(tasks.map(t => t.id === updated.id ? updated : t));
        }}
      />
    </div>
  );
}
