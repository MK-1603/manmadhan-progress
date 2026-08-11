"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FolderKanban, CheckSquare, PenSquare, FileText, BookOpen,
  Headphones, GraduationCap, Archive, Bell, X, Loader2, CheckCircle2, Plus
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                handleClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 md:left-[25vw] md:right-[25vw] md:bottom-auto md:top-[15vh] z-[61] bg-card border border-border md:rounded-3xl rounded-t-3xl pb-[env(safe-area-inset-bottom)] flex flex-col md:max-h-[70vh] max-h-[85vh] shadow-2xl"
          >
            {/* Handle for mobile */}
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 md:hidden">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
            </div>

            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 px-5 pt-3 md:pt-5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4 text-foreground" /> Quick Action
                </h3>
                <button onClick={handleClose} className="p-1.5 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 flex flex-col p-5 pt-0 overflow-y-auto">
                {status === "IDLE" && (
                  <>
                    <p className="text-sm font-semibold text-muted-foreground mb-4 text-center">
                      Describe your task, idea, or project. The system will categorize and plan it automatically.
                    </p>
                    <div className="relative flex-1 flex flex-col min-h-[150px]">
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="E.g., Add this book https://example.com/book/123 or build portfolio by Sept 15..."
                        className="flex-1 bg-muted/30 border border-border rounded-2xl p-4 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gold text-foreground placeholder:text-muted-foreground/50 mb-14"
                        autoFocus
                      />
                      <button
                        onClick={handlePlan}
                        disabled={!prompt.trim()}
                        className="absolute bottom-0 left-0 right-0 h-12 bg-gold hover:bg-gold-hover text-slate-950 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Plan & Review
                      </button>
                    </div>

                    {isPersonal && (
                      <div className="mt-6">
                        <p className="text-xs text-muted-foreground font-semibold mb-3">QUICK START</p>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          {[
                            { label: "Project", icon: FolderKanban },
                            { label: "Task", icon: CheckSquare },
                            { label: "Journal", icon: PenSquare },
                            { label: "Book", icon: BookOpen },
                            { label: "Learning", icon: GraduationCap },
                            { label: "Reminder", icon: Bell },
                          ].map(item => (
                            <button key={item.label} onClick={() => handlePreFill(item.label)} className="flex flex-col items-center gap-1 shrink-0 w-16">
                              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20 transition-colors border border-border">
                                <item.icon className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <span className="text-[10px] font-semibold text-muted-foreground">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {status === "PLANNING" && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-gold mb-4" />
                    <p className="text-sm font-medium">Analyzing intent & preparing structural changes...</p>
                  </div>
                )}

                {status === "REVIEW" && proposedPlan && (
                  <div className="flex flex-col h-full">
                    <h4 className="font-bold text-foreground mb-4">Proposed Changes</h4>
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                      {proposedPlan.projects?.length > 0 && (
                        <div className="bg-muted/30 p-3 rounded-xl border border-border">
                          <p className="text-xs font-bold text-gold mb-2 uppercase">Projects ({proposedPlan.projects.length})</p>
                          {proposedPlan.projects.map((p: any, i: number) => (
                            <div key={i} className="text-sm text-foreground mb-1">• {p.name}</div>
                          ))}
                        </div>
                      )}
                      {proposedPlan.tasks?.length > 0 && (
                        <div className="bg-muted/30 p-3 rounded-xl border border-border">
                          <p className="text-xs font-bold text-gold mb-2 uppercase">Tasks ({proposedPlan.tasks.length})</p>
                          {proposedPlan.tasks.map((t: any, i: number) => (
                            <div key={i} className="text-sm text-foreground mb-1">• {t.title}</div>
                          ))}
                        </div>
                      )}
                      {proposedPlan.books?.length > 0 && (
                        <div className="bg-muted/30 p-3 rounded-xl border border-border">
                          <p className="text-xs font-bold text-gold mb-2 uppercase">Books ({proposedPlan.books.length})</p>
                          {proposedPlan.books.map((b: any, i: number) => (
                            <div key={i} className="text-sm text-foreground mb-1">• {b.title}</div>
                          ))}
                        </div>
                      )}
                      {proposedPlan.calendarEvents?.length > 0 && (
                        <div className="bg-muted/30 p-3 rounded-xl border border-border">
                          <p className="text-xs font-bold text-gold mb-2 uppercase">Calendar Events ({proposedPlan.calendarEvents.length})</p>
                          {proposedPlan.calendarEvents.map((c: any, i: number) => (
                            <div key={i} className="text-sm text-foreground mb-1">• {c.title}</div>
                          ))}
                        </div>
                      )}
                      {proposedPlan.reminders?.length > 0 && (
                        <div className="bg-muted/30 p-3 rounded-xl border border-border">
                          <p className="text-xs font-bold text-gold mb-2 uppercase">Reminders ({proposedPlan.reminders.length})</p>
                          {proposedPlan.reminders.map((r: any, i: number) => (
                            <div key={i} className="text-sm text-foreground mb-1">• {r.title}</div>
                          ))}
                        </div>
                      )}
                      
                      {proposedPlan.podcasts?.length > 0 && (
                        <div className="bg-muted/30 p-3 rounded-xl border border-border">
                          <p className="text-xs font-bold text-gold mb-2 uppercase">Podcasts ({proposedPlan.podcasts.length})</p>
                          {proposedPlan.podcasts.map((p: any, i: number) => (
                            <div key={i} className="text-sm text-foreground mb-1">• {p.title}</div>
                          ))}
                        </div>
                      )}
                      
                      {Object.keys(proposedPlan).every(k => !proposedPlan[k] || proposedPlan[k].length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">No structural changes detected.</p>
                      )}
                    </div>
                    <div className="flex gap-3 mt-auto shrink-0">
                      <button onClick={() => setStatus("IDLE")} className="flex-1 py-3 rounded-xl bg-muted text-foreground text-sm font-bold">
                        Edit Prompt
                      </button>
                      <button onClick={handleExecute} className="flex-1 py-3 rounded-xl bg-gold hover:bg-gold-hover text-slate-950 text-sm font-bold transition-colors">
                        Approve & Execute
                      </button>
                    </div>
                  </div>
                )}

                {status === "EXECUTING" && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-gold mb-4" />
                    <p className="text-sm font-medium">Executing approved changes in database...</p>
                  </div>
                )}

                {status === "SUCCESS" && executionResult && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                    <h4 className="font-bold text-foreground mb-2 text-lg">Execution Successful</h4>
                    <div className="text-sm text-muted-foreground text-center mb-6">
                      Created {executionResult.projects || 0} Projects, {executionResult.tasks || 0} Tasks, {executionResult.calendarEvents || 0} Events.
                    </div>
                    <button onClick={() => { handleClose(); onComplete?.(); }} className="px-8 py-3 rounded-xl bg-muted hover:bg-accent text-foreground text-sm font-bold transition-colors">
                      Done
                    </button>
                  </div>
                )}

                {status === "ERROR" && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                    <X className="w-12 h-12 text-destructive mb-4" />
                    <h4 className="font-bold text-foreground mb-2 text-lg">Execution Failed</h4>
                    <p className="text-sm text-destructive text-center mb-6">{errorMsg}</p>
                    <button onClick={() => setStatus("IDLE")} className="px-8 py-3 rounded-xl bg-muted text-foreground text-sm font-bold">
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
