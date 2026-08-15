"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen, Plus, UserCheck, FileText, CheckCircle2, ChevronRight,
  ShieldCheck, Loader2, Sparkles, Layers
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

export const LEARNING_TOPICS = [
  { id: "1", title: "AI AGENTS", category: "Core AI", hours: 4 },
  { id: "2", title: "AI AUTOMATION", category: "Workflow", hours: 4 },
  { id: "3", title: "FINE TUNING & AI ASSISTANTS", category: "Models", hours: 5 },
  { id: "4", title: "PROMPT ENGINEERING", category: "Core AI", hours: 3 },
  { id: "5", title: "STAYING UPDATED", category: "Research", hours: 2 },
  { id: "6", title: "RAG", category: "Architecture", hours: 6 },
  { id: "7", title: "LLM MANAGEMENT", category: "Ops", hours: 4 },
  { id: "8", title: "MULTIMODAL AI", category: "Models", hours: 4 },
  { id: "9", title: "AI TOOL STACKING", category: "Workflow", hours: 3 },
  { id: "10", title: "AI VIDEO CONTENT GENERATION", category: "Media", hours: 4 },
  { id: "11", title: "VOICE", category: "Media", hours: 3 },
  { id: "12", title: "MCP", category: "Protocol", hours: 5 },
  { id: "13", title: "AGENT PROTOCOL", category: "Protocol", hours: 4 },
  { id: "14", title: "AI POWERED SAAS DEVELOPMENT", category: "Product", hours: 8 },
];

export default function LearningPage() {
  const [learningPlanActive, setLearningPlanActive] = useState(false);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);

  const handleCreateLearningPlan = () => {
    const initializedTopics = LEARNING_TOPICS.map((t) => ({
      ...t,
      status: "Not Started",
      assigneeName: "Unassigned",
      handbookCreated: false,
      toolsCreated: false,
    }));
    setTopics(initializedTopics);
    setLearningPlanActive(true);
  };

  const handleAssignTopic = (topicId: string, assigneeName: string) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, assigneeName, status: "In Progress" } : t))
    );
  };

  const handleCreateHandbook = (topicId: string) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, handbookCreated: true } : t))
    );
  };

  const handleCreateToolsDoc = (topicId: string) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, toolsCreated: true } : t))
    );
  };

  const completedCount = topics.filter((t) => t.status === "Completed").length;

  return (
    <div className="w-full h-full max-h-full flex flex-col justify-between overflow-hidden px-4 sm:px-6 md:px-10 py-4 sm:py-5 max-w-[1400px] mx-auto bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none space-y-4">
      {/* Header */}
      <div className="shrink-0 pb-3 border-b border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F]" />
            <h1 className="text-[22px] sm:text-[26px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
              Learning Workspace
            </h1>
          </div>
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] mt-1">
            Organize and manage your 14-topic AI study blueprint and handbook documents.
          </p>
        </div>

        {!learningPlanActive && (
          <button
            type="button"
            onClick={handleCreateLearningPlan}
            className="inline-flex items-center gap-1.5 px-4 h-[40px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Learning Plan</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        {!learningPlanActive ? (
          <div className="flex-1 min-h-[300px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] flex flex-col items-center justify-center p-8 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-[#C9A52A] opacity-60" />
            <div className="space-y-1">
              <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                No Learning Plan Active
              </h3>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] max-w-md mx-auto leading-relaxed">
                Create a learning plan to organize the 14 core AI mastery topics, assign responsibilities, and generate handbooks.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateLearningPlan}
              className="mt-2 inline-flex items-center gap-1.5 px-5 h-[40px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create 14-Topic Learning Plan</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] overflow-hidden">
            {/* Plan Summary Bar */}
            <div className="px-5 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">AI Learning Plan</span>
                <span className="text-[11.5px] font-mono text-[#667085] bg-[#E4E7EC] dark:bg-[#272D36] px-2 py-0.5 rounded-full">
                  14 Topics · {completedCount} / 14 Completed
                </span>
              </div>

              <span className="text-[11px] font-bold text-[#C9A52A] uppercase tracking-wide">
                Production Ready Plan
              </span>
            </div>

            {/* Topics Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {topics.map((t, idx) => (
                <div
                  key={t.id}
                  className="p-4 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-[#667085] dark:text-[#8B95A5]">
                        TOPIC {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] font-bold text-[#C9A52A] px-2 py-0.5 rounded bg-[#C9A52A]/10">
                        {t.category}
                      </span>
                    </div>

                    <h4 className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-snug">
                      {t.title}
                    </h4>

                    <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                      Assigned To: <strong className="text-[#17202A] dark:text-[#F2F4F7]">{t.assigneeName}</strong>
                    </p>
                  </div>

                  {/* Actions & Docs Status */}
                  <div className="space-y-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className={`w-2 h-2 rounded-full ${t.handbookCreated ? "bg-emerald-500" : "bg-gray-400"}`} />
                      <span className="text-[#667085] dark:text-[#8B95A5]">Handbook:</span>
                      {t.handbookCreated ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Created</span>
                      ) : (
                        <button
                          onClick={() => handleCreateHandbook(t.id)}
                          className="font-bold text-[#C9A52A] hover:underline cursor-pointer"
                        >
                          + Create
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className={`w-2 h-2 rounded-full ${t.toolsCreated ? "bg-emerald-500" : "bg-gray-400"}`} />
                      <span className="text-[#667085] dark:text-[#8B95A5]">10 Tools Doc:</span>
                      {t.toolsCreated ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Created</span>
                      ) : (
                        <button
                          onClick={() => handleCreateToolsDoc(t.id)}
                          className="font-bold text-[#C9A52A] hover:underline cursor-pointer"
                        >
                          + Create
                        </button>
                      )}
                    </div>

                    <div className="pt-1">
                      <CustomSelect
                        value={t.assigneeName === "Unassigned" ? "" : t.assigneeName}
                        onChange={(val) => handleAssignTopic(t.id, val || "Unassigned")}
                        options={[
                          { value: "", label: "Unassigned" },
                          { value: "CO-CEO", label: "Assign to CO-CEO" },
                          { value: "Member A", label: "Assign to Member A" },
                          { value: "Member B", label: "Assign to Member B" },
                        ]}
                        placeholder="Assign Topic"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
