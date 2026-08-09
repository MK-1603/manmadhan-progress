"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, RefreshCw, Search, Filter, ArrowUpDown, GripVertical, Calendar as CalIcon, Flag, Play } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { PersonalTaskCreateModal } from "@/components/personal/personal-task-create-modal";
import { Task, Project } from "@/components/tasks/task-modal";

const COLUMNS = ["TODO", "IN_PROGRESS", "PAUSED", "COMPLETED"];

export default function TasksPage() {
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal & Detail State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { socket } = useSocket();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        apiClient.get(`/personal/tasks`),
        apiClient.get(`/personal/projects`)
      ]);
      
      setTasks(tasksRes.data?.data ?? []);
      setProjects(projectsRes.data?.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    void loadData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (payload: any) => {
      // Re-fetch everything for simplicity, or we could surgically update state
      // Opting for surgical update if we get the full task object
      if (payload.task) {
        setTasks(current => {
          const exists = current.find(t => t.id === payload.task.id);
          if (exists) {
            return current.map(t => t.id === payload.task.id ? payload.task : t);
          }
          return [...current, payload.task];
        });
      } else {
        loadData();
      }
    };

    socket.on("TASK_CREATED", handleUpdate);
    socket.on("TASK_UPDATED", handleUpdate);
    
    return () => {
      socket.off("TASK_CREATED", handleUpdate);
      socket.off("TASK_UPDATED", handleUpdate);
    };
  }, [socket]);

  const moveTask = async (task: Task, newStatus: string) => {
    if (task.status === newStatus) return;
    
    const previousState = [...tasks];
    // Optimistic UI Update
    setTasks(current => current.map(item => item.id === task.id ? { ...item, status: newStatus } : item));
    
    try {
      await apiClient.patch(`/personal/tasks/${task.id}`, { status: newStatus });
    } catch (err) {
      // Rollback
      setTasks(previousState);
      setError(err instanceof Error ? err.message : "Unable to move task");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDragStart = (event: React.DragEvent, taskId: string) => {
    event.dataTransfer.setData("taskId", taskId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (event: React.DragEvent, column: string) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("taskId");
    const task = tasks.find(t => t.id === taskId);
    if (task) void moveTask(task, column);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const groupedTasks = useMemo(() => {
    return Object.fromEntries(
      COLUMNS.map(col => [col, tasks.filter(t => t.status === col)])
    );
  }, [tasks]);

  const openNewTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleSaveTask = (savedTask: Task) => {
    setTasks(current => {
      const exists = current.find(t => t.id === savedTask.id);
      if (exists) return current.map(t => t.id === savedTask.id ? savedTask : t);
      return [...current, savedTask];
    });
  };

  if (!mounted) return null;

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* HEADER */}
      <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-muted bg-card/50 backdrop-blur-md z-10">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            Personal / <span className="text-foreground">Tasks</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              className="pl-9 pr-4 py-1.5 text-sm bg-muted rounded-full border border-transparent focus:bg-background focus:border-border transition-colors w-64 outline-none" 
            />
          </div>
          <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><Filter className="w-4 h-4" /></button>
          <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ArrowUpDown className="w-4 h-4" /></button>
          <button onClick={() => void loadData()} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><RefreshCw className="w-4 h-4" /></button>
          <button 
            onClick={openNewTask}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </header>

      {/* ERROR TOAST */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-500 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-semibold animate-in slide-in-from-top-4">
          {error}
        </div>
      )}

      {/* KANBAN BOARD */}
      <main className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-6 relative">
        {loading ? (
          <div className="flex gap-6 h-full absolute inset-6">
             {COLUMNS.map(col => (
               <div key={col} className="w-[320px] shrink-0 bg-muted/20 rounded-2xl animate-pulse" />
             ))}
          </div>
        ) : (
          <div className="flex gap-6 h-full absolute inset-6 pb-6">
            {COLUMNS.map(column => (
              <section 
                key={column} 
                className="w-[320px] shrink-0 flex flex-col bg-muted/10 rounded-2xl border border-muted/50 overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, column)}
              >
                <div className="px-4 py-3 border-b border-muted/50 flex items-center justify-between bg-card/30 shrink-0">
                  <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" /> {column}
                  </h2>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {groupedTasks[column]?.length ?? 0}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {groupedTasks[column]?.map(task => (
                    <article 
                      key={task.id} 
                      draggable 
                      onDragStart={e => handleDragStart(e, task.id)}
                      onClick={() => openTaskDetail(task)}
                      className="group cursor-grab active:cursor-grabbing bg-card rounded-xl p-4 border border-border hover:border-primary/50 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                          {task.title}
                        </h3>
                        <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      
                      {task.projectId && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                          {projects.find(p => p.id === task.projectId)?.title ?? "Project"}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        {task.priority && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1
                            ${task.priority === 'High' ? 'bg-rose-500/10 text-rose-500' : 
                              task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 
                              'bg-emerald-500/10 text-emerald-500'}
                          `}>
                            <Flag className="w-2.5 h-2.5" /> {task.priority}
                          </span>
                        )}
                        
                        {task.deadline && (
                          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                            <CalIcon className="w-2.5 h-2.5" /> {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <PersonalTaskCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projects={projects as any}
        onSave={(newTask: Task) => setTasks((prev) => [newTask, ...prev])}
      />

      <TaskDetailPanel
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        task={selectedTask}
        projects={projects}
        workspaceId={typeof window !== 'undefined' ? localStorage.getItem("workspaceId") || "" : ""}
        onUpdate={handleSaveTask}
        onDelete={(id) => {
          setTasks(current => current.filter(t => t.id !== id));
          setIsDetailOpen(false);
        }}
      />
    </div>
  );
}
