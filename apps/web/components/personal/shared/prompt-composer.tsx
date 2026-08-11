"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, LoaderCircle, X, Check, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";

interface PromptComposerProps {
  type: "project" | "task" | "learning";
  placeholder?: string;
  onSuccess?: () => void;
}

export function PromptComposer({ type, placeholder = "Describe what you want to accomplish...", onSuccess }: PromptComposerProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const endpoint = type === "project" 
        ? "/personal/projects/generate-plan"
        : "/personal/tasks/generate-task";
        
      const response = await apiClient.post(endpoint, { prompt });
      setPreviewPlan(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to interpret prompt. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    setIsCreating(true);
    setError(null);

    try {
      if (type === "project") {
        // Create Project Transactionally
        await apiClient.post("/personal/projects/create-from-plan", previewPlan);
      } else if (type === "task") {
        await apiClient.post("/personal/tasks", {
          title: previewPlan.title,
          description: previewPlan.description,
          priority: previewPlan.priority,
          estimatedMinutes: previewPlan.estimatedMinutes,
          scheduledStart: previewPlan.scheduledStart,
          scheduledEnd: previewPlan.scheduledEnd,
        });
      }

      setPrompt("");
      setPreviewPlan(null);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create records.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <form onSubmit={handleGenerate} className="relative w-full flex items-center">
        <div className="absolute left-4 text-[#A1A1AA] dark:text-[#52525B]">
          {isGenerating ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleGenerate(e);
            }
          }}
          placeholder={placeholder}
          disabled={isGenerating || isCreating || !!previewPlan}
          rows={1}
          style={{ minHeight: "56px" }}
          className="w-full py-4 pl-12 pr-14 rounded-3xl border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B] transition-colors disabled:opacity-50 resize-none overflow-hidden"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isGenerating || isCreating || !!previewPlan}
          className="absolute right-3 p-2.5 rounded-full bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {error && (
        <div className="text-sm text-red-500 px-4">
          {error}
        </div>
      )}

      {/* Preview Approval Modal/Card */}
      {previewPlan && (
        <div className="w-full bg-[#FFFFFF] dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-6 shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[#171717] dark:text-[#F5F5F5] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#52525B] dark:text-[#A1A1AA]" />
              {type === "project" ? "Project Plan Proposal" : "Task Proposal"}
            </h3>
            <button 
              onClick={() => setPreviewPlan(null)}
              className="text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4 mb-6">
            {type === "project" ? (
              <>
                <div>
                  <div className="text-sm text-[#A1A1AA] mb-1 uppercase tracking-wide font-semibold">Project Name</div>
                  <div className="text-base text-[#171717] dark:text-[#F5F5F5] font-medium">{previewPlan.name}</div>
                </div>
                <div>
                  <div className="text-sm text-[#A1A1AA] mb-1 uppercase tracking-wide font-semibold">Goal</div>
                  <div className="text-base text-[#52525B] dark:text-[#A1A1AA]">{previewPlan.goal}</div>
                </div>
                {previewPlan.milestones && (
                  <div>
                    <div className="text-sm text-[#A1A1AA] mb-2 uppercase tracking-wide font-semibold">Milestones</div>
                    <ul className="space-y-2">
                      {previewPlan.milestones.map((m: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
                          <span className="w-5 h-5 rounded-full bg-[#F4F4F5] dark:bg-[#1D1D1D] flex items-center justify-center text-xs shrink-0">{i + 1}</span>
                          <span><strong className="text-[#171717] dark:text-[#F5F5F5]">{m.name}:</strong> {m.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {previewPlan.tasks && (
                  <div>
                    <div className="text-sm text-[#A1A1AA] mb-2 uppercase tracking-wide font-semibold">Tasks Generated</div>
                    <div className="text-base text-[#171717] dark:text-[#F5F5F5] font-medium">{previewPlan.tasks.length} Actionable Tasks</div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <div className="text-sm text-[#A1A1AA] mb-1 uppercase tracking-wide font-semibold">Task Title</div>
                  <div className="text-base text-[#171717] dark:text-[#F5F5F5] font-medium">{previewPlan.title}</div>
                </div>
                <div className="flex gap-8">
                  <div>
                    <div className="text-sm text-[#A1A1AA] mb-1 uppercase tracking-wide font-semibold">Duration</div>
                    <div className="text-base text-[#52525B] dark:text-[#A1A1AA]">{previewPlan.estimatedMinutes} min</div>
                  </div>
                  <div>
                    <div className="text-sm text-[#A1A1AA] mb-1 uppercase tracking-wide font-semibold">Scheduled</div>
                    <div className="text-base text-[#52525B] dark:text-[#A1A1AA]">
                      {new Date(previewPlan.scheduledStart).toLocaleDateString()} at {new Date(previewPlan.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={isCreating}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {isCreating ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Approve & Create
            </button>
            <button
              onClick={() => setPreviewPlan(null)}
              disabled={isCreating}
              className="px-6 h-12 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-[#171717] dark:text-[#F5F5F5] font-medium transition-colors hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
