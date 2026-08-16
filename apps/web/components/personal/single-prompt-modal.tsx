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
            <p className="text-sm font-medium text-muted-foreground">
              What would you like to add?
            </p>

            <div className="flex flex-col space-y-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe something to add..."
                className="h-[120px] w-full bg-muted/30 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold resize-none"
                autoFocus
              />
              <span className="text-[11px] font-mono text-muted-foreground">
                Task, project, note, book, reminder...
              </span>

              <button
                type="button"
                onClick={handlePlan}
                disabled={!prompt.trim()}
                className={`h-[48px] w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 ${
                  prompt.trim()
                    ? "bg-gold text-[#0B0D10] hover:brightness-105 shadow-2xs"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2">
              <span className="text-[10px] font-mono font-medium tracking-[0.1em] text-muted-foreground uppercase block mb-2">
                QUICK START
              </span>
              <div className="grid grid-cols-2 gap-2">
                {quickStartItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handlePreFill(item.label)}
                    className="h-[54px] px-3 rounded-xl bg-card border border-border hover:border-gold/50 flex items-center gap-2.5 text-left text-xs font-semibold text-foreground transition-colors cursor-pointer"
                  >
                    <item.icon className="w-4 h-4 text-gold shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {status === "PLANNING" && (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-gold mb-3" />
            <p className="text-xs font-mono">Analyzing request...</p>
          </div>
        )}

        {status === "REVIEW" && proposedPlan && (
          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-sm text-foreground">Proposed Changes</h4>
            <div className="max-h-[260px] overflow-y-auto space-y-3 p-3 rounded-xl bg-muted/40 border border-border">
              {proposedPlan.projects?.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono font-medium text-gold uppercase">Projects ({proposedPlan.projects.length})</p>
                  {proposedPlan.projects.map((p: any, i: number) => (
                    <div key={i} className="text-xs text-foreground mt-0.5">• {p.name}</div>
                  ))}
                </div>
              )}
              {proposedPlan.tasks?.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono font-medium text-gold uppercase">Tasks ({proposedPlan.tasks.length})</p>
                  {proposedPlan.tasks.map((t: any, i: number) => (
                    <div key={i} className="text-xs text-foreground mt-0.5">• {t.title}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("IDLE")}
                className="flex-1 h-[44px] rounded-xl bg-muted text-xs font-semibold text-foreground"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecute}
                className="flex-1 h-[44px] rounded-xl bg-gold text-[#0B0D10] text-xs font-bold"
              >
                Execute
              </button>
            </div>
          </div>
        )}

        {status === "EXECUTING" && (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-gold mb-3" />
            <p className="text-xs font-mono">Executing action...</p>
          </div>
        )}

        {status === "SUCCESS" && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
            <h4 className="font-semibold text-sm text-foreground mb-1">Action Complete</h4>
            <button
              type="button"
              onClick={() => { handleClose(); onComplete?.(); }}
              className="px-6 h-[40px] rounded-xl bg-gold text-[#0B0D10] text-xs font-bold mt-4"
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
              className="px-6 h-[40px] rounded-xl bg-muted text-xs font-semibold text-foreground"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </GlobalSheet>
  );
}
