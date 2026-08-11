"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, CheckCircle2, Circle, Clock, LayoutList } from "lucide-react";
import { PromptComposer } from "@/components/personal/shared/prompt-composer";
import { useSocket } from "@/components/providers/socket-provider";

export default function TasksPage() {
  const { socket, isConnected } = useSocket();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/tasks");
      setTasks(response.data.data);
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("task_created", (newTask: any) => {
      setTasks(prev => [newTask, ...prev]);
    });

    socket.on("task_updated", (updatedTask: any) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    });

    socket.on("task_deleted", ({ id }: { id: string }) => {
      setTasks(prev => prev.filter(t => t.id !== id));
    });

    return () => {
      socket.off("task_created");
      socket.off("task_updated");
      socket.off("task_deleted");
    };
  }, [socket, isConnected]);

  const handleToggleTask = async (task: any) => {
    const newStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      await apiClient.patch(`/personal/tasks/${task.id}`, { status: newStatus });
    } catch (err) {
      console.error("Failed to update task", err);
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 sm:p-8 max-w-[1000px] mx-auto">
      
      {/* Header */}
      <div className="mb-8 w-full">
        <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
          Personal Workspace
        </p>
        <h1 className="text-[26px] font-bold text-foreground tracking-tight leading-none mb-1">
          Tasks & Inbox
        </h1>
        <p className="text-[13px] text-muted-foreground max-w-[560px] leading-relaxed mb-7">
          Capture tasks, schedule focus time, and execute. Tasks sync automatically with your Calendar.
        </p>
        <PromptComposer
          type="task"
          placeholder="e.g. Tomorrow from 9 to 11, build authentication API..."
          onSuccess={fetchTasks}
        />
      </div>

      {/* Task List */}
      <div className="flex-1 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[14px] font-bold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider">
            All Tasks
          </h2>
          <div className="text-sm text-[#A1A1AA]">
            {tasks.filter(t => t.status === "COMPLETED").length} / {tasks.length} Completed
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoaderCircle className="w-8 h-8 text-[#A1A1AA] animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-center">
            <LayoutList className="w-12 h-12 text-[#A1A1AA] dark:text-[#52525B] mb-4" />
            <h3 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">Inbox zero</h3>
            <p className="text-[#52525B] dark:text-[#A1A1AA] max-w-md">
              You have no active tasks. Create a new task by typing what you need to do in the prompt bar above.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className={`group flex items-start gap-4 p-4 sm:p-5 bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-[12px] hover:border-[#A1A1AA] dark:hover:border-[#52525B] transition-all shadow-sm ${task.status === "COMPLETED" ? 'opacity-60 bg-[#FAFAFA] dark:bg-[#0A0A0A]' : ''}`}
              >
                <button 
                  onClick={() => handleToggleTask(task)}
                  className="mt-0.5 text-[#A1A1AA] hover:text-[#16A34A] transition-colors shrink-0"
                >
                  {task.status === "COMPLETED" ? (
                    <CheckCircle2 className="w-6 h-6 text-[#16A34A] dark:text-[#22C55E]" />
                  ) : task.status === "IN_PROGRESS" ? (
                    <Clock className="w-6 h-6 text-[#D99A00] dark:text-[#F5B800]" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base font-semibold text-[#171717] dark:text-[#F5F5F5] mb-1 truncate ${task.status === "COMPLETED" ? 'line-through text-[#A1A1AA] dark:text-[#52525B]' : ''}`}>
                    {task.title}
                  </h3>
                  
                  {(task.project?.name || task.scheduledStart || task.estimatedMinutes) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#52525B] dark:text-[#A1A1AA] mt-2">
                      {task.project?.name && (
                        <div className="flex items-center gap-1.5 font-medium px-2 py-0.5 rounded bg-[#F4F4F5] dark:bg-[#1D1D1D]">
                          {task.project.name}
                        </div>
                      )}
                      
                      {task.scheduledStart && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(task.scheduledStart).toLocaleDateString()}
                        </div>
                      )}
                      
                      {task.estimatedMinutes && (
                        <div>{task.estimatedMinutes} min</div>
                      )}
                    </div>
                  )}
                </div>
                
                {task.priority === "High" && task.status !== "COMPLETED" && (
                  <div className="shrink-0 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md bg-[#EF4444]/10 text-[#EF4444]">
                    High
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
