"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api-client";
import {
  LoaderCircle, Send, Plus, Trash2, MessageSquare, ChevronRight,
  Sparkles, X, BookOpen, Copy, Check
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

function AIBuilderContent() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiClient.get("/personal/ai/conversations");
      if (res.data.success) setConversations(res.data.data);
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Pre-fill from Prompt Library query param
  useEffect(() => {
    const promptParam = searchParams?.get("prompt");
    if (promptParam) {
      setInput(decodeURIComponent(promptParam));
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
      }
    }
  }, [searchParams]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    const fetchMessages = async () => {
      setLoadingMsgs(true);
      try {
        const res = await apiClient.get(`/personal/ai/conversations/${activeConvId}/messages`);
        if (res.data.success) setMessages(res.data.data);
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        setLoadingMsgs(false);
      }
    };
    fetchMessages();
  }, [activeConvId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = { id: tempId, role: "user", content: userMessage, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await apiClient.post("/personal/ai/chat", {
        message: userMessage,
        conversationId: activeConvId,
      });
      if (res.data.success) {
        const { conversationId, message: assistantMsg } = res.data.data;
        // Update active conversation
        if (!activeConvId) {
          setActiveConvId(conversationId);
          await fetchConversations();
        }
        // Replace temp user message and add assistant response
        setMessages(prev => [
          ...prev.filter(m => m.id !== tempId),
          { id: `user-${Date.now()}`, role: "user", content: userMessage, createdAt: new Date().toISOString() },
          { id: assistantMsg.id, role: "assistant", content: assistantMsg.content, createdAt: assistantMsg.createdAt },
        ]);
        // Update conversation list
        await fetchConversations();
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: `err-${Date.now()}`, role: "assistant", content: "Failed to get a response. Please check your connection and try again.", createdAt: new Date().toISOString() },
      ]);
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const createNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/personal/ai/conversations/${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
    } catch (err) {
      console.error("Failed to delete conversation", err);
    }
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const QUICK_PROMPTS = [
    "What should I work on today?",
    "Analyze my overdue tasks",
    "Create a project plan for a portfolio website",
    "Generate a task breakdown for my most important project",
    "What is my current project status?",
    "Generate a PRD template for my project",
  ];

  return (
    <div className="w-full h-[100dvh] flex bg-[#F7F7F5] dark:bg-[#080808] overflow-hidden">

      {/* Sidebar */}
      <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col w-full md:w-[280px] shrink-0 border-r border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] h-full`}>
        <div className="p-4 border-b border-[#E5E7EB] dark:border-[#242424] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D99A00] dark:text-[#F5B800]" />
            <span className="font-bold text-sm text-[#171717] dark:text-[#F5F5F5]">AI Builder</span>
          </div>
          <button
            onClick={createNewConversation}
            className="p-1.5 rounded-lg bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] hover:opacity-80 transition-opacity"
            title="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingConvs ? (
            <div className="flex justify-center p-4"><LoaderCircle className="w-5 h-5 animate-spin text-[#A1A1AA]" /></div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-xs text-[#A1A1AA] p-4 mt-4">No conversations yet. Start a new one!</div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => { setActiveConvId(conv.id); if (window.innerWidth < 768) setShowSidebar(false); }}
                className={`group flex items-center justify-between gap-2 p-2.5 rounded-lg cursor-pointer mb-1 transition-colors ${
                  activeConvId === conv.id
                    ? "bg-[#F4F4F5] dark:bg-[#1D1D1D]"
                    : "hover:bg-[#F4F4F5]/50 dark:hover:bg-[#1D1D1D]/50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
                  <span className="text-sm text-[#171717] dark:text-[#F5F5F5] truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#A1A1AA] hover:text-red-500 transition-all shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-[#E5E7EB] dark:border-[#242424] shrink-0">
          <a href="/personal/prompt-library" className="flex items-center gap-2 p-2 rounded-lg text-sm text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors">
            <BookOpen className="w-4 h-4" />
            <span>Prompt Library</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </a>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">

        {/* Chat header */}
        <div className="h-14 border-b border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="md:hidden p-1.5 rounded-lg text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-4 h-4 text-[#D99A00] dark:text-[#F5B800]" />
            <span className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
              {activeConvId ? conversations.find(c => c.id === activeConvId)?.title || "Conversation" : "New Conversation"}
            </span>
          </div>
          {activeConvId && (
            <button onClick={createNewConversation} className="p-1.5 rounded-lg text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {loadingMsgs ? (
            <div className="flex justify-center py-10"><LoaderCircle className="w-6 h-6 animate-spin text-[#A1A1AA]" /></div>
          ) : messages.length === 0 ? (
            <div className="max-w-[600px] mx-auto mt-8">
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#D99A00]/10 dark:bg-[#F5B800]/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-[#D99A00] dark:text-[#F5B800]" />
                </div>
                <h2 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">ManMadhan AI Builder</h2>
                <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">
                  Your personal execution assistant. Ask about your projects, generate plans, analyze progress, and more.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                    className="text-left p-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] text-sm text-[#52525B] dark:text-[#A1A1AA] hover:border-[#D99A00]/50 hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-[720px] mx-auto flex flex-col gap-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-1 ${
                    msg.role === "user"
                      ? "bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808]"
                      : "bg-[#D99A00]/10 dark:bg-[#F5B800]/10"
                  }`}>
                    {msg.role === "user" ? "U" : <Sparkles className="w-3.5 h-3.5 text-[#D99A00] dark:text-[#F5B800]" />}
                  </div>

                  {/* Bubble */}
                  <div className={`group relative max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] rounded-tr-sm"
                        : "bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] text-[#171717] dark:text-[#F5F5F5] rounded-tl-sm"
                    }`}>
                      {msg.content}
                    </div>
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#A1A1AA] hover:text-[#52525B] transition-all self-end"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full shrink-0 bg-[#D99A00]/10 flex items-center justify-center mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#D99A00] dark:text-[#F5B800]" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424]">
                    <div className="flex gap-1.5 items-center h-5">
                      <div className="w-2 h-2 rounded-full bg-[#A1A1AA] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-[#A1A1AA] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-[#A1A1AA] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] shrink-0">
          <div className="max-w-[720px] mx-auto">
            <div className="flex items-end gap-2 p-3 rounded-2xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 focus-within:border-[#D99A00]/50 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your projects, generate a plan, analyze your work..."
                rows={1}
                className="flex-1 bg-transparent resize-none focus:outline-none text-sm text-[#171717] dark:text-[#F5F5F5] placeholder:text-[#A1A1AA] max-h-40"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="p-2 rounded-xl bg-[#D99A00] dark:bg-[#F5B800] text-white dark:text-[#080808] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {sending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-[#A1A1AA] text-center mt-2">
              AI Builder uses your real workspace data. Write actions require confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIBuilderPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-[100dvh] flex items-center justify-center bg-[#F7F7F5] dark:bg-[#080808]">
        <LoaderCircle className="w-6 h-6 text-[#D99A00] animate-spin" />
      </div>
    }>
      <AIBuilderContent />
    </Suspense>
  );
}
