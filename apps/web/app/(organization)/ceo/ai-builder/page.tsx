"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import {
  Send, Terminal, Check, RefreshCw, AtSign, ExternalLink, Loader2,
  AlertCircle, History, Edit3, CheckCircle2, Search, PlusCircle, UserCheck,
  FolderKanban, CheckSquare, Trash2, ArrowDown, X, MoreVertical, Menu, Wifi
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import apiClient from "@/lib/api-client";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  sender: "user" | "command";
  text: string;
  preview?: any;
  timestamp: string;
  isError?: boolean;
  executed?: boolean;
  executedLink?: string;
}

interface CommandSessionItem {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  timestamp: string;
}

interface MentionOption {
  id: string;
  type: "USER" | "PROJECT" | "TASK";
  displayName: string;
  subtitle: string;
  email?: string;
}

// Generic Instructional Command Templates (Populates input only; NEVER executes automatically)
const GENERIC_COMMAND_TEMPLATES = [
  "Create a project called [project name] with a [deadline] deadline and assign it to [CO-CEO]",
  "Create a task called [task name] under [project name] and assign it to [member]",
  "Invite [name] as a CO-CEO using [email]",
  "Schedule [review name] for [date] at [time]",
  "Find AI tools for [use case] in ManMadhan Hub",
];

function formatHumanTerminology(val: string): string {
  if (!val) return "";
  const map: Record<string, string> = {
    CO_CEO: "CO-CEO",
    MEMBER: "Member",
    CEO: "CEO",
    CONFIRMATION_REQUIRED: "Confirmation required",
    ACTION_PREVIEW: "Review action",
    PROJECT_CREATED: "Project created",
    TASK_CREATED: "Task created",
    USER_INVITED: "Invitation sent",
    COMPLETED: "Completed",
    PROCESSING: "Processing...",
  };
  return map[val] || val.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function ManMadhanCommandContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const userRole = user?.role || "CEO";
  const currentSessionId = searchParams.get("session");

  const [promptText, setPromptText] = useState("");
  const [structuredMentions, setStructuredMentions] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [executingMsgId, setExecutingMsgId] = useState<string | null>(null);

  // Realtime Socket.IO Connection Status
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "reconnecting" | "offline">("connected");
  const socketRef = useRef<Socket | null>(null);

  // Mobile Viewport Detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // History Drawer State
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Command History Sessions
  const [sessionsList, setSessionsList] = useState<CommandSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  
  // Popover Menu Positioning & Stacking State
  const [sessionMenuId, setSessionMenuId] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [newTitleText, setNewTitleText] = useState("");

  // Context-Aware @Mentions System V2
  const [showMentionsPicker, setShowMentionsPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<{ people: MentionOption[]; projects: MentionOption[]; tasks: MentionOption[] }>({
    people: [],
    projects: [],
    tasks: [],
  });
  const [mentionsLoading, setMentionsLoading] = useState(false);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  // Active Context Entity Strip & Contextual Suggestions
  const [selectedContextEntity, setSelectedContextEntity] = useState<MentionOption | null>(null);

  // User Message Editing State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMsgText, setEditMsgText] = useState("");

  // Action Preview editing state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>({});

  // Scroll Control State
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close popover menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setSessionMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Socket.IO Realtime Connection with JWT Auth Token
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";

    const socket = io(socketUrl, {
      query: { token: token || "" },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => setRealtimeStatus("connected"));
    socket.on("reconnect_attempt", () => setRealtimeStatus("reconnecting"));
    socket.on("disconnect", () => setRealtimeStatus("offline"));

    socket.on("command_session_deleted", (data: { sessionId: string }) => {
      setSessionsList((prev) => prev.filter((s) => s.id !== data.sessionId));
      if (data.sessionId === currentSessionId) {
        setMessages([]);
        router.push("/ceo/ai-builder");
      }
    });

    socket.on("command_message_created", (data: { message: any }) => {
      if (data.message.sessionId === currentSessionId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentSessionId, router]);

  // Auto Scroll Listener
  const handleScrollMessages = () => {
    if (!messagesScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesScrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollDownBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!showScrollDownBtn) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking, showScrollDownBtn]);

  // Fetch Sessions list for LEFT Command History panel
  const fetchSessions = useCallback(async (search = "") => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res = await apiClient.get(`/ai/command/sessions${search ? `?q=${encodeURIComponent(search)}` : ""}`);
      if (res.data?.success) {
        setSessionsList(res.data.data || []);
      } else {
        setSessionsError(res.data?.error || "Unable to load command sessions.");
      }
    } catch (e: any) {
      setSessionsError(e.response?.data?.error || "Unable to load command sessions.");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions(historySearchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [historySearchQuery, fetchSessions]);

  // Deep-link / URL Routing: Load specific session messages if ?session=<id> present
  useEffect(() => {
    async function loadSessionDetail(sessionId: string) {
      setIsThinking(true);
      try {
        const res = await apiClient.get(`/ai/command/sessions/${sessionId}`);
        if (res.data?.success) {
          const loadedMsgs = res.data.data.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender === "user" ? "user" : "command",
            text: m.text,
            preview: m.preview || null,
            executed: m.executed,
            executedLink: m.executedLink,
            timestamp: m.timestamp,
          }));
          setMessages(loadedMsgs);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error("Failed to load session:", err);
        setMessages([]);
      } finally {
        setIsThinking(false);
      }
    }

    if (currentSessionId) {
      loadSessionDetail(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Server-side search API for @mentions
  const fetchMentions = useCallback(async (query: string) => {
    setMentionsLoading(true);
    try {
      const res = await apiClient.get(`/ai/command/mentions?q=${encodeURIComponent(query)}`);
      if (res.data?.success) {
        setMentionResults(res.data.data);
      }
    } catch (e) {
      console.warn("Failed to search mentions:", e);
    } finally {
      setMentionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showMentionsPicker) {
      const timer = setTimeout(() => {
        fetchMentions(mentionQuery);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [mentionQuery, showMentionsPicker, fetchMentions]);

  // Flattened mentions options list for keyboard navigation
  const flatMentionList = useMemo(() => {
    return [
      ...mentionResults.people,
      ...mentionResults.projects,
      ...mentionResults.tasks,
    ];
  }, [mentionResults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPromptText(val);

    const lastChar = val.slice(-1);
    if (lastChar === "@") {
      setShowMentionsPicker(true);
      setMentionQuery("");
      setMentionSelectedIndex(0);
    } else if (showMentionsPicker) {
      const atIdx = val.lastIndexOf("@");
      if (atIdx !== -1) {
        setMentionQuery(val.slice(atIdx + 1));
      } else {
        setShowMentionsPicker(false);
      }
    }
  };

  const handleSelectMention = (option: MentionOption) => {
    const atIdx = promptText.lastIndexOf("@");
    const newText = atIdx !== -1 ? promptText.slice(0, atIdx) + `@${option.displayName} ` : `${promptText}@${option.displayName} `;
    setPromptText(newText);
    setStructuredMentions((prev) => [...prev, { id: option.id, type: option.type, displayName: option.displayName }]);
    setSelectedContextEntity(option);
    setShowMentionsPicker(false);
    inputRef.current?.focus();
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionsPicker && flatMentionList.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % flatMentionList.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev - 1 + flatMentionList.length) % flatMentionList.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = flatMentionList[mentionSelectedIndex];
        if (selected) handleSelectMention(selected);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionsPicker(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Click generic template to populate command input ONLY (never auto-executes)
  const handleSelectTemplate = (templateText: string) => {
    setPromptText(templateText);
    inputRef.current?.focus();
  };

  // Click contextual suggestion pill
  const handleSelectContextSuggestion = (pillTemplate: string) => {
    setPromptText(pillTemplate);
    inputRef.current?.focus();
  };

  // Switch to a new blank session
  const handleStartNewCommand = () => {
    setPromptText("");
    setStructuredMentions([]);
    setSelectedContextEntity(null);
    setMessages([]);
    setIsHistoryDrawerOpen(false);
    router.push("/ceo/ai-builder");
  };

  // Send Command Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || promptText.trim();
    if (!text || isThinking) return;

    setPromptText("");
    setShowMentionsPicker(false);

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = { id: `m-${Date.now()}`, sender: "user", text, timestamp };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const res = await apiClient.post("/ai/command", {
        prompt: text,
        workspaceType: "ORGANIZATION",
        sessionId: currentSessionId || undefined,
        mentions: structuredMentions,
      });

      setStructuredMentions([]);

      const responseText = res.data?.data?.responseText || "Command processed successfully.";
      const preview = res.data?.data?.preview || null;
      const returnedSessionId = res.data?.data?.sessionId;

      if (returnedSessionId && returnedSessionId !== currentSessionId) {
        router.push(`/ceo/ai-builder?session=${returnedSessionId}`);
      }

      const aiMsg: ChatMessage = {
        id: `m-ai-${Date.now()}`,
        sender: "command",
        text: responseText,
        preview,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      fetchSessions(historySearchQuery);
    } catch (err: any) {
      const errorText = err.response?.data?.error || err.message || "Couldn't start this command session. Please try again.";
      const errorMsg: ChatMessage = {
        id: `m-ai-${Date.now()}`,
        sender: "command",
        text: errorText,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  // User Message Edit & Delete
  const handleStartEditUserMsg = (msgId: string, text: string) => {
    setEditingMessageId(msgId);
    setEditMsgText(text);
  };

  const handleSaveEditUserMsg = async (msgId: string) => {
    if (!editMsgText.trim()) return;
    try {
      const res = await apiClient.patch(`/ai/command/messages/${msgId}`, { text: editMsgText.trim() });
      if (res.data?.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, text: editMsgText.trim() } : m))
        );
        setEditingMessageId(null);
        // Re-evaluate command without auto-executing
        handleSendMessage(editMsgText.trim());
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to edit message.");
    }
  };

  const handleDeleteUserMsg = async (msgId: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      const res = await apiClient.delete(`/ai/command/messages/${msgId}`);
      if (res.data?.success) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete message.");
    }
  };

  // Session Rename & Delete
  const handleStartRenameSession = (sess: CommandSessionItem) => {
    setRenamingSessionId(sess.id);
    setNewTitleText(sess.title);
    setSessionMenuId(null);
  };

  const handleSaveRenameSession = async (sessionId: string) => {
    if (!newTitleText.trim()) return;
    try {
      const res = await apiClient.patch(`/ai/command/sessions/${sessionId}`, { title: newTitleText.trim() });
      if (res.data?.success) {
        setSessionsList((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: newTitleText.trim() } : s))
        );
        setRenamingSessionId(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to rename session.");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Delete conversation? This will remove this conversation from Command history.")) return;
    try {
      const res = await apiClient.delete(`/ai/command/sessions/${sessionId}`);
      if (res.data?.success) {
        setSessionsList((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          setMessages([]);
          router.push("/ceo/ai-builder");
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete session.");
    } finally {
      setSessionMenuId(null);
    }
  };

  const handleStartEditPreview = (msgId: string, fields: any) => {
    setEditingMsgId(msgId);
    setEditFields({ ...fields });
  };

  const handleSaveEditPreview = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.preview
          ? { ...m, preview: { ...m.preview, fields: { ...editFields } } }
          : m
      )
    );
    setEditingMsgId(null);
  };

  const handleConfirmExecute = async (msgId: string, previewObj: any) => {
    setExecutingMsgId(msgId);
    try {
      const res = await apiClient.post("/ai/command/execute", {
        actionPreview: previewObj,
        workspaceId: typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined,
      });

      if (res.data?.success) {
        const link = res.data.data.redirectUrl || "/ceo/projects";
        const messageText = res.data.data.message || "Action executed successfully.";

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, executed: true, executedLink: link, text: `${m.text}\n\n✓ **Completed**: ${messageText}` }
              : m
          )
        );
        fetchSessions(historySearchQuery);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to execute action preview.");
    } finally {
      setExecutingMsgId(null);
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans relative">
      
      {/* ── CANONICAL HEADER ─────────────────────────────────────────────────── */}
      <div className="shrink-0 h-13 px-4 sm:px-6 bg-[#FFFFFF] dark:bg-[#15191F] border-b border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between z-10 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
            className="p-1.5 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors cursor-pointer"
            title="Toggle Command History Drawer"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight flex items-center gap-2 leading-none">
              <div className="w-5.5 h-5.5 rounded-lg bg-[#15191F] border border-[#272D36] flex items-center justify-center text-[#C9A52A]">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              ManMadhan Command
            </h1>
            {!isMobile && (
              <p className="text-[10.5px] text-[#667085] dark:text-[#8B95A5] mt-0.5 flex items-center gap-2">
                <span>Organization execution command center</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 font-medium text-[10.5px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ManMadhan Organization
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Realtime Socket.IO Status Indicator */}
          <span className="text-[10px] font-medium text-[#667085] dark:text-[#8B95A5] bg-[#F8F9FB] dark:bg-[#111419] px-2 py-0.5 rounded-md border border-[#E4E7EC] dark:border-[#272D36] hidden sm:flex items-center gap-1">
            <Wifi className={`w-3 h-3 ${realtimeStatus === "connected" ? "text-emerald-500" : "text-amber-500"}`} />
            <span>● {realtimeStatus === "connected" ? "Live" : "Reconnecting..."}</span>
          </span>

          <button
            onClick={handleStartNewCommand}
            className="px-3 py-1.5 rounded-xl bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#C9A52A]/50 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#C9A52A]" />
            <span className="hidden sm:inline">New Command</span>
          </button>
        </div>
      </div>

      {/* ── SLIDE-OUT COMMAND HISTORY DRAWER (Z-50 OVERLAY FIX) ─────────────────── */}
      {isHistoryDrawerOpen && (
        <div className="absolute inset-0 z-50 flex">
          <div
            onClick={() => setIsHistoryDrawerOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-[320px] max-w-[85vw] h-full bg-[#FFFFFF] dark:bg-[#15191F] border-r border-[#E4E7EC] dark:border-[#272D36] flex flex-col p-4 space-y-3 z-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#C9A52A]" /> Command History
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => fetchSessions(historySearchQuery)} title="Refresh history">
                  <RefreshCw className={`w-3.5 h-3.5 text-[#667085] hover:text-[#17202A] transition-colors cursor-pointer ${sessionsLoading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={() => setIsHistoryDrawerOpen(false)} title="Close drawer">
                  <X className="w-4 h-4 text-[#667085] hover:text-[#17202A]" />
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 h-[34px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-xl text-xs text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] outline-none focus:border-[#C9A52A]"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#667085]" />
            </div>

            {/* Non-nested Accessible HTML History List */}
            <div className="flex-1 overflow-y-auto space-y-2 text-[11.5px] pr-1 font-sans">
              {sessionsLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-[#C9A52A]" />
                </div>
              ) : sessionsError ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center space-y-2">
                  <AlertCircle className="w-5 h-5 text-rose-500 mx-auto" />
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Unable to load command sessions.</p>
                  <button
                    onClick={() => fetchSessions(historySearchQuery)}
                    className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[11px] font-bold"
                  >
                    Retry
                  </button>
                </div>
              ) : sessionsList.length === 0 ? (
                <div className="text-center text-[#667085] dark:text-[#8B95A5] py-12 space-y-1">
                  <p className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No executions yet</p>
                  <p className="text-[11px] leading-relaxed">Your confirmed commands will appear here.</p>
                </div>
              ) : (
                sessionsList.map((s) => (
                  <div key={s.id} className="relative">
                    {renamingSessionId === s.id ? (
                      <div className="p-2 bg-[#F8F9FB] dark:bg-[#111419] rounded-xl border border-[#C9A52A] flex items-center gap-1">
                        <input
                          type="text"
                          value={newTitleText}
                          onChange={(e) => setNewTitleText(e.target.value)}
                          className="w-full bg-transparent text-xs outline-none px-1"
                        />
                        <button onClick={() => handleSaveRenameSession(s.id)} className="text-xs text-[#C9A52A] font-bold px-1">Save</button>
                        <button onClick={() => setRenamingSessionId(null)} className="text-xs text-[#667085] px-1">X</button>
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setIsHistoryDrawerOpen(false);
                          router.push(`/ceo/ai-builder?session=${s.id}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setIsHistoryDrawerOpen(false);
                            router.push(`/ceo/ai-builder?session=${s.id}`);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer space-y-1 ${
                          currentSessionId === s.id
                            ? "bg-[#C9A52A]/10 border-[#C9A52A] text-[#17202A] dark:text-[#F2F4F7]"
                            : "bg-[#F8F9FB] dark:bg-[#111419] border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:border-[#C9A52A]/50"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-[12px] text-[#17202A] dark:text-[#F2F4F7]">
                          <span className="truncate pr-4">{s.title}</span>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionMenuId(sessionMenuId === s.id ? null : s.id);
                              }}
                              className="p-1 text-[#667085] hover:text-[#17202A]"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Popover Menu Fix: High z-index & fixed overlay positioning to prevent clipping */}
                            {sessionMenuId === s.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-28 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-xl shadow-2xl p-1 z-50"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartRenameSession(s);
                                  }}
                                  className="w-full px-2 py-1 text-left text-xs hover:bg-[#F8F9FB] dark:hover:bg-[#111419] rounded font-semibold text-[#17202A] dark:text-[#F2F4F7]"
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSession(s.id);
                                  }}
                                  className="w-full px-2 py-1 text-left text-xs text-rose-500 font-semibold hover:bg-rose-500/10 rounded"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#667085]">
                          <span>Session</span>
                          <span>{s.timestamp}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FULL-WIDTH CHAT WORKSPACE (MAX-W-[920PX] CENTERED CONVERSATION) ─────────── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        
        {/* Messages Scroll Region */}
        <div
          ref={messagesScrollRef}
          onScroll={handleScrollMessages}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6"
        >
          <div className="max-w-[920px] mx-auto w-full space-y-4 font-sans">
            {messages.length === 0 ? (
              <div className="py-12 sm:py-20 flex flex-col items-center justify-center text-center p-4 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-xl bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-center text-[#C9A52A] mb-3 shadow-2xs">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className="text-[19px] font-bold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                  What can I help you execute?
                </h3>
                <p className="text-[13px] text-[#667085] dark:text-[#8B95A5] max-w-[500px] leading-relaxed mb-6">
                  Tell ManMadhan what needs to happen across your organization.
                </p>

                <div className="w-full text-left space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5] block text-center mb-1">
                    Examples
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 text-[12px]">
                    {GENERIC_COMMAND_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectTemplate(tmpl)}
                        className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:border-[#C9A52A]/40 transition-colors cursor-pointer block text-left shadow-2xs"
                      >
                        • {tmpl.slice(0, 32)}...
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col group relative ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  {/* User Message Edit & Delete Actions */}
                  {msg.sender === "user" && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 right-2 flex items-center gap-1 bg-[#15191F] border border-[#272D36] rounded-lg px-1.5 py-0.5 shadow-md z-10">
                      <button
                        type="button"
                        onClick={() => handleStartEditUserMsg(msg.id, msg.text)}
                        className="p-1 text-[#667085] hover:text-[#C9A52A]"
                        title="Edit message"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUserMsg(msg.id)}
                        className="p-1 text-[#667085] hover:text-rose-500"
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] sm:max-w-[760px] rounded-2xl p-4 text-[13px] leading-relaxed space-y-3 ${
                      msg.sender === "user"
                        ? "bg-[#C9A52A] text-[#0B0D10] font-semibold shadow-2xs"
                        : msg.isError
                        ? "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
                        : "bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] shadow-2xs"
                    }`}
                  >
                    {editingMessageId === msg.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editMsgText}
                          onChange={(e) => setEditMsgText(e.target.value)}
                          className="w-full p-2 bg-[#111419] text-[#F2F4F7] border border-[#C9A52A] rounded-lg text-xs"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setEditingMessageId(null)} className="px-2 py-1 text-xs text-[#667085]">Cancel</button>
                          <button onClick={() => handleSaveEditUserMsg(msg.id)} className="px-2 py-1 text-xs bg-[#C9A52A] text-[#0B0D10] font-bold rounded">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    )}

                    {/* Compact Action Review Card */}
                    {msg.preview && (
                      <div className="mt-3 p-4 bg-[#F8F9FB] dark:bg-[#111419] rounded-xl border border-[#E4E7EC] dark:border-[#272D36] space-y-3 text-[#17202A] dark:text-[#F2F4F7] font-sans shadow-2xs max-w-[760px]">
                        <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A52A]">
                            REVIEW ACTION
                          </span>
                          {!msg.executed ? (
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              Confirmation required
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          )}
                        </div>

                        <h4 className="text-[14px] font-bold">{msg.preview.title}</h4>
                        {msg.preview.summary && <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">{msg.preview.summary}</p>}

                        {/* Two-Column Details */}
                        {editingMsgId === msg.id ? (
                          <div className="space-y-2 p-3 bg-[#FFFFFF] dark:bg-[#15191F] rounded-xl border border-[#C9A52A]/40 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-[#667085] block mb-1">Name / Title</label>
                                <input
                                  type="text"
                                  value={editFields.name || editFields.projectName || ""}
                                  onChange={(e) => setEditFields({ ...editFields, name: e.target.value, projectName: e.target.value })}
                                  className="w-full px-2.5 h-[32px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-lg text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase text-[#667085] block mb-1">Lead / Assignee / Email</label>
                                <input
                                  type="text"
                                  value={editFields.leadName || editFields.assigneeName || editFields.userEmail || ""}
                                  onChange={(e) => setEditFields({ ...editFields, leadName: e.target.value, assigneeName: e.target.value, userEmail: e.target.value })}
                                  className="w-full px-2.5 h-[32px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-lg text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase text-[#667085] block mb-1">Deadline</label>
                                <input
                                  type="date"
                                  value={editFields.deadline || ""}
                                  onChange={(e) => setEditFields({ ...editFields, deadline: e.target.value })}
                                  className="w-full px-2.5 h-[32px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-lg text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase text-[#667085] block mb-1">Priority</label>
                                <select
                                  value={editFields.priority || "HIGH"}
                                  onChange={(e) => setEditFields({ ...editFields, priority: e.target.value })}
                                  className="w-full px-2.5 h-[32px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-lg text-xs"
                                >
                                  <option value="LOW">LOW</option>
                                  <option value="MEDIUM">MEDIUM</option>
                                  <option value="HIGH">HIGH</option>
                                  <option value="CRITICAL">CRITICAL</option>
                                </select>
                              </div>
                            </div>
                            <div className="pt-2 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveEditPreview(msg.id)}
                                className="px-3 py-1 rounded-lg bg-[#C9A52A] text-[#0B0D10] font-bold text-[11px]"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] font-mono p-3 bg-[#FFFFFF] dark:bg-[#15191F] rounded-xl border border-[#E4E7EC] dark:border-[#272D36]">
                            {msg.preview.fields?.projectName && <div>Project: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{msg.preview.fields.projectName}</strong></div>}
                            {msg.preview.fields?.name && <div>Name: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{msg.preview.fields.name}</strong></div>}
                            {msg.preview.fields?.leadName && <div>Lead: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{msg.preview.fields.leadName}</strong></div>}
                            {msg.preview.fields?.assigneeName && <div>Assignee: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{msg.preview.fields.assigneeName}</strong></div>}
                            {msg.preview.fields?.userEmail && <div>Email: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{msg.preview.fields.userEmail}</strong></div>}
                            {msg.preview.fields?.targetRole && <div>Role: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{formatHumanTerminology(msg.preview.fields.targetRole)}</strong></div>}
                            {msg.preview.fields?.hubToolName && <div>Tool: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{msg.preview.fields.hubToolName}</strong></div>}
                            {msg.preview.fields?.deadline && <div>Deadline: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{msg.preview.fields.deadline}</strong></div>}
                            {msg.preview.fields?.priority && <div>Priority: <strong className="text-[#C9A52A] font-semibold">{msg.preview.fields.priority}</strong></div>}
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-end gap-2">
                          {!msg.executed ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditPreview(msg.id, msg.preview.fields)}
                                className="px-3 py-1.5 rounded-xl border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-semibold hover:bg-[#FFFFFF] dark:hover:bg-[#15191F] inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit details
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmExecute(msg.id, msg.preview)}
                                disabled={executingMsgId === msg.id}
                                className="px-4 py-2 rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                              >
                                {executingMsgId === msg.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Confirm & Create</span>
                              </button>
                            </>
                          ) : (
                            msg.executedLink && (
                              <button
                                type="button"
                                onClick={() => router.push(msg.executedLink!)}
                                className="px-3.5 py-1.5 rounded-xl bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20 text-[12px] font-bold hover:bg-[#C9A52A]/20 inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                Open Entity <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] opacity-60 block text-right font-mono mt-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}

            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-[#667085] dark:text-[#8B95A5] italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A52A]" />
                <span>ManMadhan Command is processing command...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Restrained Circular Floating Scroll Button */}
        {showScrollDownBtn && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-20 right-6 w-9 h-9 bg-[#15191F] text-[#C9A52A] border border-[#C9A52A]/50 rounded-full shadow-lg flex items-center justify-center hover:bg-[#272D36] transition-all z-20 cursor-pointer animate-bounce"
            title="Scroll to latest message"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Active Context Entity Strip */}
        {selectedContextEntity && (
          <div className="px-4 py-2 bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] space-y-1 font-sans max-w-[920px] mx-auto w-full">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
              <span className="flex items-center gap-1 text-[#C9A52A]">
                <FolderKanban className="w-3.5 h-3.5" />
                <span>{selectedContextEntity.type} CONTEXT: <strong>@{selectedContextEntity.displayName}</strong></span>
              </span>
              <button type="button" onClick={() => setSelectedContextEntity(null)} className="text-[#667085] hover:text-[#17202A]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {selectedContextEntity.type === "PROJECT" && (
                <>
                  <button type="button" onClick={() => handleSelectContextSuggestion(`Create a task under @${selectedContextEntity.displayName} called [task name] and assign to [member]`)} className="px-2.5 py-0.5 rounded-md bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] hover:text-[#C9A52A]">
                    + Create task under @{selectedContextEntity.displayName}
                  </button>
                  <button type="button" onClick={() => handleSelectContextSuggestion(`Show progress of @${selectedContextEntity.displayName}`)} className="px-2.5 py-0.5 rounded-md bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] hover:text-[#C9A52A]">
                    View progress
                  </button>
                </>
              )}
              {selectedContextEntity.type === "TASK" && (
                <>
                  <button type="button" onClick={() => handleSelectContextSuggestion(`Show status of @${selectedContextEntity.displayName}`)} className="px-2.5 py-0.5 rounded-md bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] hover:text-[#C9A52A]">
                    Show status of @{selectedContextEntity.displayName}
                  </button>
                  <button type="button" onClick={() => handleSelectContextSuggestion(`Reassign @${selectedContextEntity.displayName} to [member]`)} className="px-2.5 py-0.5 rounded-md bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] hover:text-[#C9A52A]">
                    Reassign task
                  </button>
                </>
              )}
              {selectedContextEntity.type === "USER" && (
                <>
                  <button type="button" onClick={() => handleSelectContextSuggestion(`Assign task to @${selectedContextEntity.displayName}`)} className="px-2.5 py-0.5 rounded-md bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] hover:text-[#C9A52A]">
                    Assign task to @{selectedContextEntity.displayName}
                  </button>
                  <button type="button" onClick={() => handleSelectContextSuggestion(`Show current work of @${selectedContextEntity.displayName}`)} className="px-2.5 py-0.5 rounded-md bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] hover:text-[#C9A52A]">
                    Show current work
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Primary AI Composer Bar */}
        <div className="p-3 sm:p-4 border-t border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] shrink-0 relative">
          <div className="max-w-[920px] mx-auto w-full relative">
            
            {/* Server-Side @Mentions Search Dropdown */}
            {showMentionsPicker && (
              <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-xl shadow-xl p-2 max-h-72 overflow-y-auto z-30 font-sans space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#667085] px-2 flex items-center justify-between">
                  <span>Organization Entities</span>
                  {mentionsLoading && <Loader2 className="w-3 h-3 animate-spin text-[#C9A52A]" />}
                </div>

                {flatMentionList.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#667085]">
                    {mentionsLoading ? "Searching organization..." : "No matching people, projects, or tasks."}
                  </div>
                ) : (
                  <>
                    {mentionResults.people.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#667085] px-2 block">PEOPLE</span>
                        {mentionResults.people.map((opt) => (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => handleSelectMention(opt)}
                            className="w-full px-2.5 py-1.5 text-left text-xs rounded-lg flex items-center justify-between hover:bg-[#F8F9FB] dark:hover:bg-[#111419] text-[#17202A] dark:text-[#F2F4F7]"
                          >
                            <span className="flex items-center gap-1.5 font-semibold">
                              <UserCheck className="w-3.5 h-3.5 text-[#C9A52A]" /> @{opt.displayName}
                            </span>
                            <span className="text-[10px] text-[#667085] font-mono">{formatHumanTerminology(opt.subtitle)}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {mentionResults.projects.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold text-[#667085] px-2 block">PROJECTS</span>
                        {mentionResults.projects.map((opt) => (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => handleSelectMention(opt)}
                            className="w-full px-2.5 py-1.5 text-left text-xs rounded-lg flex items-center justify-between hover:bg-[#F8F9FB] dark:hover:bg-[#111419] text-[#17202A] dark:text-[#F2F4F7]"
                          >
                            <span className="flex items-center gap-1.5 font-semibold">
                              <FolderKanban className="w-3.5 h-3.5 text-blue-500" /> @{opt.displayName}
                            </span>
                            <span className="text-[10px] text-[#667085] font-mono">{opt.subtitle}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {mentionResults.tasks.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold text-[#667085] px-2 block">TASKS</span>
                        {mentionResults.tasks.map((opt) => (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => handleSelectMention(opt)}
                            className="w-full px-2.5 py-1.5 text-left text-xs rounded-lg flex items-center justify-between hover:bg-[#F8F9FB] dark:hover:bg-[#111419] text-[#17202A] dark:text-[#F2F4F7]"
                          >
                            <span className="flex items-center gap-1.5 font-semibold">
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" /> @{opt.displayName}
                            </span>
                            <span className="text-[10px] text-[#667085] font-mono">{opt.subtitle}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Message ManMadhan..."
                  value={promptText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDownInput}
                  className="w-full pl-4 pr-10 h-[48px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-xl text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#C9A52A] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowMentionsPicker(!showMentionsPicker);
                    setMentionQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#C9A52A] transition-colors cursor-pointer"
                  title="Mention member, project, or task"
                >
                  <AtSign className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!promptText.trim() || isThinking}
                className="w-12 h-[48px] rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-2xs"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ManMadhanCommandPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-full flex items-center justify-center p-12 text-[#C9A52A]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    }>
      <ManMadhanCommandContent />
    </Suspense>
  );
}
