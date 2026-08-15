"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FolderKanban, CheckSquare, PenSquare, FileText, BookOpen,
  Headphones, GraduationCap, Archive, Bell, X, Loader2, CheckCircle2, ArrowRight,
  UserPlus, BarChart, ShieldCheck, ClipboardList
} from "lucide-react";
import { useAuth } from "../auth/auth-context";

type EngineStatus = "IDLE" | "PLANNING" | "REVIEW" | "EXECUTING" | "SUCCESS" | "ERROR";

interface SinglePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  isPersonal?: boolean;
}

const API_BASE_URL = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100");

export function SinglePromptModal({ isOpen, onClose, onComplete, isPersonal = true }: SinglePromptModalProps) {
  const { user } = useAuth();
  
  const [status, setStatus] = useState<EngineStatus>("IDLE");
  const [prompt, setPrompt] = useState("");
  const [proposedPlan, setProposedPlan] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleClose = () => {
    setPrompt("");
    setStatus("IDLE");
    setProposedPlan(null);
    setExecutionResult(null);
    setErrorMsg("");
    onClose();
  };

  const workspaceId = user?.workspaceId || "unknown";

  const handlePlan = async () => {
    if (!prompt.trim()) return;
    setStatus("PLANNING");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/personal/ai/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to generate plan");
      
      setProposedPlan(data.data);
      setStatus("REVIEW");
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("ERROR");
    }
  };

  const handleExecute = async () => {
    setStatus("EXECUTING");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/personal/ai/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: proposedPlan, workspaceId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to execute plan");
      
      setExecutionResult(data.data);
      setStatus("SUCCESS");
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("ERROR");
    }
  };

  const handlePreFill = (label: string) => {
    setPrompt(prev => {
      if (!prev) return `Add this ${label.toLowerCase()}: `;
      return `Add this ${label.toLowerCase()}: \n${prev}`;
    });
  };

  // Quick Start cards configured per workspace
  const personalQuickStart = [
    { label: "Project", icon: FolderKanban },
    { label: "Task", icon: CheckSquare },
    { label: "Journal", icon: PenSquare },
    { label: "Book", icon: BookOpen },
    { label: "Learning", icon: GraduationCap },
    { label: "Reminder", icon: Bell },
    { label: "Note", icon: FileText },
    { label: "Document", icon: Archive },
  ];

  const orgQuickStart = [
    { label: "Project", icon: FolderKanban },
    { label: "Task", icon: CheckSquare },
    { label: "Assign Work", icon: UserPlus },
    { label: "Reminder", icon: Bell },
    { label: "Report", icon: BarChart },
    { label: "Request", icon: ClipboardList },
    { label: "Note", icon: FileText },
    { label: "Document", icon: Archive },
  ];

  const quickStartItems = isPersonal ? personalQuickStart : orgQuickStart;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[10000]"
          />

          {/* iOS Bottom Sheet (75-85vh) */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                handleClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 md:left-[25vw] md:right-[25vw] md:bottom-auto md:top-[12vh] z-[10001] bg-[#FFFFFF] dark:bg-[#15181D] border border-[#E5E7EB] dark:border-[#24282E] md:rounded-[24px] rounded-t-[24px] pb-[max(16px,env(safe-area-inset-bottom))] flex flex-col md:max-h-[80vh] max-h-[85vh] shadow-2xl p-4 select-none"
          >
            {/* Top Drag Handle */}
            <div className="w-full flex justify-center pt-1 pb-2 shrink-0 md:hidden">
              <div className="w-9 h-1 rounded-full bg-[#E5E7EB] dark:bg-[#24282E]" />
            </div>

            {/* Header: Title + Close Button (No + icon beside title) */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#24282E] shrink-0">
              <h3 className="text-[18px] font-semibold text-[#17202A] dark:text-[#F2F3F5]">
                Quick Action
              </h3>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close quick action"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pt-3 space-y-4 pr-1 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {status === "IDLE" && (
                <>
                  {/* Clean Wording Prompt Label */}
                  <p className="text-sm font-medium text-[#667085] dark:text-[#8B94A3]">
                    What would you like to add?
                  </p>

                  {/* Primary Input Container */}
                  <div className="flex flex-col space-y-2">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe something to add..."
                      className="h-[120px] w-full bg-[#F8F9FA] dark:bg-[#0F1216] border border-[#D9DEE5] dark:border-[#303640] rounded-xl p-3 text-sm text-[#17202A] dark:text-[#F2F3F5] placeholder:text-[#667085] dark:placeholder:text-[#8B94A3] focus:outline-none focus:border-[#B28D18] dark:focus:border-[#D4B12F] resize-none"
                      autoFocus
                    />
                    <span className="text-[11px] font-mono text-[#667085] dark:text-[#8B94A3]">
                      Task, project, note, book, reminder...
                    </span>

                    <button
                      type="button"
                      onClick={handlePlan}
                      disabled={!prompt.trim()}
                      className={`h-[48px] w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 ${
                        prompt.trim()
                          ? "bg-[#B28D18] dark:bg-[#D4B12F] text-[#0B0D10] hover:brightness-105 shadow-2xs"
                          : "bg-[#F3F4F6] dark:bg-[#1C2027] text-[#667085] dark:text-[#8B94A3] cursor-not-allowed"
                      }`}
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Start 2-Column Rectangular Grid */}
                  <div className="pt-2">
                    <span className="text-[10px] font-mono font-medium tracking-[0.1em] text-[#667085] dark:text-[#8B94A3] uppercase block mb-2">
                      QUICK START
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {quickStartItems.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handlePreFill(item.label)}
                          className="h-[54px] px-3 rounded-xl bg-[#FFFFFF] dark:bg-[#171B21] border border-[#E5E7EB] dark:border-[#24282E] hover:border-[#B28D18]/50 dark:hover:border-[#D4B12F]/50 flex items-center gap-2.5 text-left text-xs font-semibold text-[#17202A] dark:text-[#F2F3F5] transition-colors cursor-pointer"
                        >
                          <item.icon className="w-4 h-4 text-[#B28D18] dark:text-[#D4B12F] shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {status === "PLANNING" && (
                <div className="py-12 flex flex-col items-center justify-center text-[#667085] dark:text-[#8B94A3]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#B28D18] dark:text-[#D4B12F] mb-3" />
                  <p className="text-xs font-mono">Analyzing request...</p>
                </div>
              )}

              {status === "REVIEW" && proposedPlan && (
                <div className="flex flex-col space-y-4">
                  <h4 className="font-semibold text-sm text-[#17202A] dark:text-[#F2F3F5]">Proposed Changes</h4>
                  <div className="max-h-[260px] overflow-y-auto space-y-3 p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#0F1216] border border-[#E5E7EB] dark:border-[#24282E]">
                    {proposedPlan.projects?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-mono font-medium text-[#B28D18] dark:text-[#D4B12F] uppercase">Projects ({proposedPlan.projects.length})</p>
                        {proposedPlan.projects.map((p: any, i: number) => (
                          <div key={i} className="text-xs text-[#17202A] dark:text-[#F2F3F5] mt-0.5">• {p.name}</div>
                        ))}
                      </div>
                    )}
                    {proposedPlan.tasks?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-mono font-medium text-[#B28D18] dark:text-[#D4B12F] uppercase">Tasks ({proposedPlan.tasks.length})</p>
                        {proposedPlan.tasks.map((t: any, i: number) => (
                          <div key={i} className="text-xs text-[#17202A] dark:text-[#F2F3F5] mt-0.5">• {t.title}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus("IDLE")}
                      className="flex-1 h-[44px] rounded-xl bg-[#F3F4F6] dark:bg-[#1C2027] text-xs font-semibold text-[#17202A] dark:text-[#F2F3F5]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleExecute}
                      className="flex-1 h-[44px] rounded-xl bg-[#B28D18] dark:bg-[#D4B12F] text-[#0B0D10] text-xs font-bold"
                    >
                      Execute
                    </button>
                  </div>
                </div>
              )}

              {status === "EXECUTING" && (
                <div className="py-12 flex flex-col items-center justify-center text-[#667085] dark:text-[#8B94A3]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#B28D18] dark:text-[#D4B12F] mb-3" />
                  <p className="text-xs font-mono">Executing action...</p>
                </div>
              )}

              {status === "SUCCESS" && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                  <h4 className="font-semibold text-sm text-[#17202A] dark:text-[#F2F3F5] mb-1">Action Complete</h4>
                  <button
                    type="button"
                    onClick={() => { handleClose(); onComplete?.(); }}
                    className="px-6 h-[40px] rounded-xl bg-[#B28D18] dark:bg-[#D4B12F] text-[#0B0D10] text-xs font-bold mt-4"
                  >
                    Done
                  </button>
                </div>
              )}

              {status === "ERROR" && (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <p className="text-xs text-red-500 mb-3">{errorMsg || "Unable to complete action"}</p>
                  <button
                    type="button"
                    onClick={() => setStatus("IDLE")}
                    className="px-6 h-[40px] rounded-xl bg-[#F3F4F6] dark:bg-[#1C2027] text-xs font-semibold text-[#17202A] dark:text-[#F2F3F5]"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
