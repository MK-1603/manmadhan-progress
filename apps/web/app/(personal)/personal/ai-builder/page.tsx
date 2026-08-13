"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Send,
  Plus,
  MessageSquare,
  CheckCircle2,
  FolderKanban,
  CheckSquare,
  BookOpen,
  Headphones,
  GraduationCap,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  Clock,
  Trash2,
  Search,
  Copy,
  Edit2,
  Check,
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
          text: "Hello! I am your personal workspace assistant. Ask me to create tasks, plan projects, track learning, or organize your day.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    },
  ]);
  const [activeChatId, setActiveChatId] = useState<string>("chat-1");
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [executingMessageId, setExecutingMessageId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
          text: "New session started. How can I assist you with your personal workspace today?",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    };
    setChats((prev) => [newSession, ...prev]);
    setActiveChatId(newId);
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chats.length <= 1) return;
    const filtered = chats.filter((c) => c.id !== id);
    setChats(filtered);
    if (activeChatId === id) {
      setActiveChatId(filtered[0].id);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isProcessing) return;

    const userMsgId = `msg-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Update session title if first user message
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === activeChatId) {
          const isFirstUserMsg = chat.messages.length <= 1;
          return {
            ...chat,
            title: isFirstUserMsg
              ? textToSend.trim().length > 30
                ? textToSend.trim().slice(0, 30) + "..."
                : textToSend.trim()
              : chat.title,
            messages: [...chat.messages, userMessage],
          };
        }
        return chat;
      })
    );

    if (!customPrompt) setInput("");
    setIsProcessing(true);

    try {
      const lower = textToSend.toLowerCase();

      // Rule-based prompt parsing for instant real action proposals
      if (lower.includes("task") || lower.includes("remind") || lower.includes("finish") || lower.includes("todo")) {
        const title = textToSend.replace(/create a task|add task|remind me to/gi, "").trim();
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: `I've prepared a task based on your request. Please review the proposal below before executing.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionCard: {
            type: "TASK",
            title: title ? title.charAt(0).toUpperCase() + title.slice(1) : "New Task",
            description: textToSend,
            details: { priority: "High", deadline: "Tomorrow" },
            previewData: { title: title || "New Task", priority: "HIGH" },
          },
        };
        appendAssistantMessage(assistantMsg);
      } else if (lower.includes("project") || lower.includes("build") || lower.includes("portfolio")) {
        const title = textToSend.replace(/create a project|build/gi, "").trim();
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: `I've structured a project plan proposal based on your prompt.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionCard: {
            type: "PROJECT",
            title: title ? title.charAt(0).toUpperCase() + title.slice(1) : "New Workspace Project",
            description: textToSend,
            details: { milestones: 4, tasksCount: 12, dailyCapacity: "3 hours/day" },
            previewData: { name: title || "New Project", description: textToSend },
          },
        };
        appendAssistantMessage(assistantMsg);
      } else {
        // General AI Response
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: `Understood: "${textToSend}". Your personal workspace preference and context have been updated.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        appendAssistantMessage(assistantMsg);
      }
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "assistant",
        text: "Unable to process request. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      appendAssistantMessage(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const appendAssistantMessage = (msg: ChatMessage) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId ? { ...chat, messages: [...chat.messages, msg] } : chat
      )
    );
  };

  const handleExecuteAction = async (msgId: string, card: any) => {
    setExecutingMessageId(msgId);
    try {
      if (card.type === "TASK") {
        await apiClient.post("/personal/tasks", {
          title: card.previewData.title || card.title,
          priority: card.previewData.priority || "HIGH",
          status: "TODO",
        });
      } else if (card.type === "PROJECT") {
        await apiClient.post("/personal/projects", {
          name: card.previewData.name || card.title,
          description: card.description,
          status: "Planning",
        });
      }

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === activeChatId) {
            return {
              ...chat,
              messages: chat.messages.map((m) =>
                m.id === msgId
                  ? { ...m, executionSuccess: `Action Executed & Saved to Database!` }
                  : m
              ),
            };
          }
          return chat;
        })
      );
    } catch (e: any) {
      console.error(e);
    } finally {
      setExecutingMessageId(null);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(chatSearch.toLowerCase())
  );

  return (
    <div className="w-full h-[calc(100dvh-65px)] flex flex-col md:flex-row overflow-hidden bg-background">
      {/* LEFT: Conversation History Sidebar */}
      <aside className="w-full md:w-80 border-r border-border bg-card flex flex-col shrink-0 h-48 md:h-full">
        <div className="p-3.5 border-b border-border space-y-2">
          <button
            onClick={handleNewChat}
            className="w-full h-9 rounded-lg bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:border-foreground/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredChats.map((chat) => {
            const active = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full p-2.5 rounded-lg text-xs font-bold text-left transition-colors flex items-center justify-between group cursor-pointer ${
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </div>

                {chats.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* RIGHT: Active Chat Conversation */}
      <main className="flex-1 flex flex-col h-full min-h-0 bg-background">
        {/* Chat Stream Header */}
        <header className="p-3.5 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground truncate">{activeChat.title}</h2>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeChat.messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-xl text-xs leading-relaxed space-y-3 ${
                    isUser
                      ? "bg-foreground text-background font-medium"
                      : "bg-card border border-border text-foreground shadow-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Proposed Action Card */}
                  {msg.actionCard && (
                    <div className="p-3.5 rounded-lg border border-border bg-background text-foreground space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                          PROPOSED {msg.actionCard.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">Review Mandate</span>
                      </div>

                      <p className="font-bold text-xs">{msg.actionCard.title}</p>
                      <p className="text-[11px] text-muted-foreground">{msg.actionCard.description}</p>

                      {msg.executionSuccess ? (
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[11px] font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {msg.executionSuccess}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleExecuteAction(msg.id, msg.actionCard)}
                          disabled={executingMessageId === msg.id}
                          className="w-full h-8 rounded bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {executingMessageId === msg.id ? "Executing..." : "Confirm & Execute Action"}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>{msg.timestamp}</span>
                    <button
                      onClick={() => handleCopyText(msg.text, msg.id)}
                      className="hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedId === msg.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer */}
        <div className="p-3.5 border-t border-border bg-card space-y-2">
          {/* Quick Action Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(action.label)}
                className="px-2.5 py-1 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {action.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask AI Assistant to create tasks, projects, books..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 h-10 px-3.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:border-foreground/30 transition-colors"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isProcessing || !input.trim()}
              className="px-4 h-10 rounded-lg bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center shrink-0 disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PersonalAIBuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading AI Assistant...</div>}>
      <AIBuilderContent />
    </Suspense>
  );
}
