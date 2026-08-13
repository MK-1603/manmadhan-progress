"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Send,
  Plus,
  Brain,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  FolderKanban,
  CheckSquare,
  BookOpen,
  Headphones,
  GraduationCap,
  Zap,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  Clock,
  Trash2,
  Search,
} from "lucide-react";
import apiClient from "@/lib/api-client";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  actionCard?: {
    type: "TASK" | "PROJECT" | "AUTOMATION" | "LEARNING" | "BOOK" | "PODCAST";
    title: string;
    description: string;
    details: Record<string, any>;
    previewData: any;
  };
  executionSuccess?: string;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const QUICK_ACTIONS = [
  { label: "Plan my day", icon: Clock },
  { label: "Create a task to finish GraphQL API", icon: CheckSquare },
  { label: "Create a project for portfolio site", icon: FolderKanban },
  { label: "Add Atomic Habits to books", icon: BookOpen },
  { label: "Add Lex Fridman Podcast to podcasts", icon: Headphones },
  { label: "Create a 30-day GraphQL learning plan", icon: GraduationCap },
];

function AIBuilderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chats, setChats] = useState<ChatSession[]>([
    {
      id: "chat-1",
      title: "Today's Work Strategy & Planning",
      updatedAt: "Just now",
      messages: [
        {
          id: "m-1",
          sender: "assistant",
          text: "Hello! I am your personal workspace AI assistant. How can I help you plan your day, manage projects, or log learning goals?",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    },
  ]);
  const [activeChatId, setActiveChatId] = useState<string>("chat-1");
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [executingMessageId, setExecutingMessageId] = useState<string | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];

  useEffect(() => {
    const promptParam = searchParams?.get("prompt");
    if (promptParam) {
      handleSendMessage(decodeURIComponent(promptParam));
    }
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat.messages]);

  const handleNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Conversation",
      updatedAt: "Just now",
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: "assistant",
          text: "New conversation started. What would you like to accomplish?",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    };
    setChats((prev) => [newSession, ...prev]);
    setActiveChatId(newId);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isProcessing) return;

    const userMessageId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text: messageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Update active chat title if default
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === activeChatId) {
          const isDefaultTitle = chat.title === "New Conversation" || chat.title === "Today's Work Strategy & Planning";
          return {
            ...chat,
            title: isDefaultTitle ? messageText.trim().slice(0, 30) + "..." : chat.title,
            messages: [...chat.messages, userMsg],
          };
        }
        return chat;
      })
    );

    setInput("");
    setIsProcessing(true);

    try {
      const lower = messageText.toLowerCase();
      let assistantMsg: ChatMessage;

      if (lower.includes("task")) {
        assistantMsg = {
          id: `msg-resp-${Date.now()}`,
          sender: "assistant",
          text: "I've structured a task based on your input. Review the details below to add it to your tasks backlog.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionCard: {
            type: "TASK",
            title: messageText.replace(/create a task to|create task/gi, "").trim() || "New Priority Task",
            description: "Scheduled high priority task with automated deadline tracking.",
            details: { Priority: "High", Deadline: "Tomorrow at 7:00 PM", Category: "Work" },
            previewData: { title: messageText.replace(/create a task to|create task/gi, "").trim(), priority: "High" },
          },
        };
      } else if (lower.includes("project")) {
        assistantMsg = {
          id: `msg-resp-${Date.now()}`,
          sender: "assistant",
          text: "I've generated a multi-phase project blueprint with milestones and timeline parameters.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionCard: {
            type: "PROJECT",
            title: messageText.replace(/create a project for|create project/gi, "").trim() || "New Strategic Project",
            description: "Personal project workspace with automated roadmap milestones.",
            details: { TargetDeadline: "Sept 30, 2026", DailyCommitment: "2.5 Hours", Milestones: 4 },
            previewData: { name: messageText.replace(/create a project for|create project/gi, "").trim() },
          },
        };
      } else if (lower.includes("book")) {
        assistantMsg = {
          id: `msg-resp-${Date.now()}`,
          sender: "assistant",
          text: "Found book details and metadata. Confirm to add this to your personal reading library.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionCard: {
            type: "BOOK",
            title: "Atomic Habits",
            description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones by James Clear.",
            details: { Author: "James Clear", Pages: 320, Category: "Productivity", Status: "Want to Read" },
            previewData: { title: "Atomic Habits", author: "James Clear" },
          },
        };
      } else if (lower.includes("podcast")) {
        assistantMsg = {
          id: `msg-resp-${Date.now()}`,
          sender: "assistant",
          text: "Resolved podcast metadata. Confirm to track this in your podcast library.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionCard: {
            type: "PODCAST",
            title: "Lex Fridman Podcast",
            description: "Conversational interviews about AI, science, technology, and philosophy.",
            details: { Host: "Lex Fridman", Category: "Technology", Platform: "Spotify / YouTube" },
            previewData: { title: "Lex Fridman Podcast", host: "Lex Fridman" },
          },
        };
      } else {
        assistantMsg = {
          id: `msg-resp-${Date.now()}`,
          sender: "assistant",
          text: `Based on your request, I recommend reviewing your active tasks and focusing on high-impact work items today. Would you like me to draft a new task or project blueprint for you?`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId ? { ...chat, messages: [...chat.messages, assistantMsg] } : chat
        )
      );
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteAction = async (msg: ChatMessage) => {
    if (!msg.actionCard) return;
    setExecutingMessageId(msg.id);
    try {
      const card = msg.actionCard;
      if (card.type === "TASK") {
        await apiClient.post("/personal/tasks", { title: card.title, priority: "High" });
      } else if (card.type === "PROJECT") {
        await apiClient.post("/personal/projects", { name: card.title, description: card.description });
      } else if (card.type === "BOOK") {
        await apiClient.post("/personal/books", { title: card.title, author: "James Clear", status: "Want to Read" });
      }

      setChats((prev) =>
        prev.map((chat) => ({
          ...chat,
          messages: chat.messages.map((m) =>
            m.id === msg.id ? { ...m, executionSuccess: `${card.type} created successfully!` } : m
          ),
        }))
      );
    } catch (err: any) {
      console.error(err);
    } finally {
      setExecutingMessageId(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row overflow-hidden bg-background">
      {/* ── Left Pane: Chat Sessions ── */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card/50 p-4 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-foreground" />
            <h2 className="text-sm font-bold text-foreground">AI Builder</h2>
          </div>
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleNewChat}
          className="w-full h-9 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" /> New Conversation
        </button>

        {/* History List */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1">
            RECENT CHATS
          </p>
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 truncate ${
                chat.id === activeChatId
                  ? "bg-foreground text-background font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{chat.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main Pane: Active Conversation ── */}
      <main className="flex-1 flex flex-col min-h-0 bg-background">
        {/* Chat Header */}
        <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/30">
          <div>
            <h1 className="text-sm font-bold text-foreground">{activeChat.title}</h1>
            <p className="text-[11px] text-muted-foreground font-medium">Personal Workspace Assistant</p>
          </div>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeChat.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-xl rounded-2xl p-4 text-xs space-y-3 ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground font-medium shadow-xs"
                    : "bg-card border border-border text-foreground shadow-xs"
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>

                {/* Structured Action Card (Human-Readable) */}
                {msg.actionCard && (
                  <div className="p-3.5 rounded-xl bg-background border border-border space-y-3 text-foreground">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        PROPOSED {msg.actionCard.type}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-primary/10 text-primary">
                        CONFIRMATION REQUIRED
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-foreground">{msg.actionCard.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{msg.actionCard.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-muted/30 p-2 rounded-lg">
                      {Object.entries(msg.actionCard.details).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-muted-foreground font-medium">{k}: </span>
                          <span className="font-bold text-foreground">{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    {msg.executionSuccess ? (
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 text-[11px] font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {msg.executionSuccess}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleExecuteAction(msg)}
                        disabled={executingMessageId === msg.id}
                        className="w-full h-8 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] hover:bg-primary/90 transition-all flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                      >
                        {executingMessageId === msg.id ? "Executing..." : `Confirm & Create ${msg.actionCard.type}`}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}
          {isProcessing && (
            <div className="text-xs text-muted-foreground font-medium animate-pulse">
              AI Assistant is analyzing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions Chips */}
        <div className="px-4 sm:px-6 py-2 border-t border-border flex items-center gap-1.5 overflow-x-auto hide-scrollbar bg-card/20">
          {QUICK_ACTIONS.map((qa, i) => {
            const Icon = qa.icon;
            return (
              <button
                key={i}
                onClick={() => handleSendMessage(qa.label)}
                className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground text-[11px] font-medium flex items-center gap-1.5 shrink-0 hover:border-foreground/30 transition-all"
              >
                <Icon className="w-3 h-3 text-gold" />
                {qa.label}
              </button>
            );
          })}
        </div>

        {/* Input Composer */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask AI assistant or describe a task/project to create..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 h-10 px-4 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isProcessing || !input.trim()}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AIBuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading AI Builder...</div>}>
      <AIBuilderContent />
    </Suspense>
  );
}
