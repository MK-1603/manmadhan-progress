"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User, CheckCircle2, XCircle, LayoutGrid, Zap, FileText, Calendar, Trash2 } from "lucide-react";
import apiClient from "@/lib/api-client";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: { type: string; payload: any } | null;
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await apiClient.post(`/personal/assistant/chat`, {
        message: text,
        conversationId
      });
      
      const aiData = res.data.data;
      if (!conversationId) setConversationId(aiData.conversationId);

      const aiMsg: Message = {
        id: aiData.id,
        role: "assistant",
        content: aiData.content,
        toolCalls: aiData.toolCalls
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "Sorry, I encountered an error." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (msgId: string, actionType: string, payload: any, confirm: boolean) => {
    if (!confirm) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "Action cancelled." }]);
      return;
    }
    
    setLoading(true);
    try {
      const res = await apiClient.post(`/personal/assistant/execute`, {
        actionType, payload, conversationId
      });
      setMessages(prev => [...prev, res.data.data]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <div className="h-screen bg-background flex flex-col font-sans">
      <header className="px-6 md:px-10 py-5 border-b border-border bg-card shrink-0 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Personal Assistant</h1>
            <p className="text-xs text-muted-foreground">AI Execution Engine</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors" title="Clear Chat">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/20">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-2">How can I help?</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-10">
              I can analyze your workspace, fetch notes, schedule deep work, and manage your tasks.
            </p>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg text-left">
              <button onClick={() => sendMessage("What should I work on today?")} className="bg-card border border-border p-4 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-3 group">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold text-sm">Plan my day</span>
              </button>
              <button onClick={() => sendMessage("What are my most important tasks?")} className="bg-card border border-border p-4 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-3 group">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="font-semibold text-sm">Review Tasks</span>
              </button>
              <button onClick={() => sendMessage("Find my notes about AI")} className="bg-card border border-border p-4 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-3 group">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="font-semibold text-sm">Find Notes</span>
              </button>
              <button onClick={() => sendMessage("How productive was I this week?")} className="bg-card border border-border p-4 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-3 group">
                <LayoutGrid className="w-5 h-5 text-purple-500" />
                <span className="font-semibold text-sm">Productivity</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            {messages.map((msg, i) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-accent" : "bg-primary text-primary-foreground"}`}>
                  {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`px-5 py-3.5 rounded-2xl ${msg.role === "user" ? "bg-accent text-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm shadow-sm"}`}>
                    <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                  </div>

                  {msg.toolCalls && (
                    <div className="bg-card border border-border p-4 rounded-2xl shadow-sm w-full mt-2 animate-in slide-in-from-top-2">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Requested Action</div>
                      <div className="font-mono text-sm bg-accent/50 p-3 rounded-lg mb-4">
                        {msg.toolCalls.type}: {JSON.stringify(msg.toolCalls.payload)}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(msg.id, msg.toolCalls!.type, msg.toolCalls!.payload, true)} className="flex-1 py-2 bg-foreground text-background font-bold text-sm rounded-xl flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Confirm
                        </button>
                        <button onClick={() => handleAction(msg.id, msg.toolCalls!.type, msg.toolCalls!.payload, false)} className="flex-1 py-2 bg-accent text-foreground font-bold text-sm rounded-xl flex items-center justify-center gap-2">
                          <XCircle className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary shrink-0 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground animate-pulse" />
                </div>
                <div className="bg-card border border-border px-5 py-3.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </main>

      <footer className="p-6 md:p-10 bg-background shrink-0 w-full max-w-4xl mx-auto border-t border-transparent relative z-20">
        <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask anything about your workspace..." 
            className="w-full bg-card border border-border rounded-2xl pl-5 pr-14 py-4 shadow-xl focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
          />
          <button disabled={loading || !input.trim()} type="submit" className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors">
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="text-center mt-3 text-xs text-muted-foreground">
          Assistant uses real workspace data. Sensitive Vault files require explicit context access.
        </div>
      </footer>
    </div>
  );
}
