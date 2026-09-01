"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSheet } from "@/components/ui/global-sheet";
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
    <GlobalSheet
      open={isOpen}
      onClose={handleClose}
      title="Quick Action"
      subtitle={isPersonal ? "PERSONAL WORKSPACE" : "ORGANIZATION MANDATE"}
      desktopMode="modal"
      desktopMaxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs select-text">
        {status === "IDLE" && (
          <>
            <p className="text-sm font-semibold text-[#17202A] dark:text-[#F3FFF0]">
              What would you like to add?
            </p>

            <div className="flex flex-col space-y-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe something to add..."
                className="h-[120px] w-full bg-[#F8F9FA] dark:bg-[#15191D] border border-[#E4E7EC] dark:border-[#292F38] rounded-xl p-3 text-sm text-[#17202A] dark:text-[#F3FFF0] placeholder:text-[#667085] dark:placeholder:text-[#8E949E] focus:outline-none focus:border-[#D4B12F] focus:ring-1 focus:ring-[#D4B12F] resize-none"
                autoFocus
              />
              <span className="text-[11px] font-mono text-[#667085] dark:text-[#8E949E]">
                Task, project, note, book, reminder...
              </span>

              <button
                type="button"
                onClick={handlePlan}
                disabled={!prompt.trim()}
                className={`h-[48px] w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 ${
                  prompt.trim()
                    ? "bg-[#C89B18] dark:bg-[#D4B12F] text-white dark:text-[#0B0D10] hover:brightness-105 shadow-sm"
                    : "bg-[#E4E7EC] dark:bg-[#1C2027] text-[#9AA2AF] cursor-not-allowed"
                }`}
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2">
              <span className="text-[10px] font-mono font-medium tracking-[0.1em] text-[#667085] dark:text-[#8E949E] uppercase block mb-2">
                QUICK START
              </span>
              <div className="grid grid-cols-2 gap-2">
                {quickStartItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handlePreFill(item.label)}
                    className="h-[54px] px-3 rounded-xl bg-[#F8F9FA] dark:bg-[#15191D] border border-[#E4E7EC] dark:border-[#292F38] hover:border-[#D4B12F] flex items-center gap-2.5 text-left text-xs font-semibold text-[#17202A] dark:text-[#F3FFF0] transition-colors cursor-pointer"
                  >
                    <item.icon className="w-4 h-4 text-[#C89B18] dark:text-[#D4B12F] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {status === "PLANNING" && (
          <div className="py-12 flex flex-col items-center justify-center text-[#667085] dark:text-[#8E949E]">
            <Loader2 className="w-8 h-8 animate-spin text-[#C89B18] dark:text-[#D4B12F] mb-3" />
            <p className="text-xs font-mono">Analyzing request...</p>
          </div>
        )}

        {status === "REVIEW" && proposedPlan && (
          <div className="flex flex-col space-y-4">
            <h4 className="font-bold text-sm text-[#17202A] dark:text-[#F3FFF0]">Proposed Changes</h4>
            <div className="max-h-[260px] overflow-y-auto space-y-3 p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#15191D] border border-[#E4E7EC] dark:border-[#292F38]">
              {proposedPlan.projects?.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono font-bold text-[#C89B18] dark:text-[#D4B12F] uppercase">Projects ({proposedPlan.projects.length})</p>
                  {proposedPlan.projects.map((p: any, i: number) => (
                    <div key={i} className="text-xs text-[#17202A] dark:text-[#F3FFF0] mt-0.5">• {p.name}</div>
                  ))}
                </div>
              )}
              {proposedPlan.tasks?.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono font-bold text-[#C89B18] dark:text-[#D4B12F] uppercase">Tasks ({proposedPlan.tasks.length})</p>
                  {proposedPlan.tasks.map((t: any, i: number) => (
                    <div key={i} className="text-xs text-[#17202A] dark:text-[#F3FFF0] mt-0.5">• {t.title}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("IDLE")}
                className="flex-1 h-[44px] rounded-xl bg-[#F8F9FA] dark:bg-[#1C2027] text-xs font-semibold text-[#17202A] dark:text-[#F3FFF0] border border-[#E4E7EC] dark:border-[#292F38]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecute}
                className="flex-1 h-[44px] rounded-xl bg-[#C89B18] dark:bg-[#D4B12F] text-white dark:text-[#0B0D10] text-xs font-bold"
              >
                Execute
              </button>
            </div>
          </div>
        )}

        {status === "EXECUTING" && (
          <div className="py-12 flex flex-col items-center justify-center text-[#667085] dark:text-[#8E949E]">
            <Loader2 className="w-8 h-8 animate-spin text-[#C89B18] dark:text-[#D4B12F] mb-3" />
            <p className="text-xs font-mono">Executing action...</p>
          </div>
        )}

        {status === "SUCCESS" && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
            <h4 className="font-bold text-sm text-[#17202A] dark:text-[#F3FFF0] mb-1">Action Complete</h4>
            <button
              type="button"
              onClick={() => { handleClose(); onComplete?.(); }}
              className="px-6 h-[40px] rounded-xl bg-[#C89B18] dark:bg-[#D4B12F] text-white dark:text-[#0B0D10] text-xs font-bold mt-4"
            >
              Done
            </button>
          </div>
        )}

        {status === "ERROR" && (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-rose-500 mb-3">{errorMsg || "Unable to complete action"}</p>
            <button
              type="button"
              onClick={() => setStatus("IDLE")}
              className="px-6 h-[40px] rounded-xl bg-[#F8F9FA] dark:bg-[#1C2027] text-xs font-semibold text-[#17202A] dark:text-[#F3FFF0] border border-[#E4E7EC] dark:border-[#292F38]"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </GlobalSheet>
  );
}
