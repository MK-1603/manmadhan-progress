"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox as InboxIcon, Check, CheckCircle2, Clock, AlertCircle, 
  MessageSquare, FileText, UserPlus, Filter, Search, MoreHorizontal,
  Archive, Trash2, Reply
} from "lucide-react";
import { useAuth } from "../../../../components/auth/auth-context";

// Dummy data for Inbox
const initialMessages = [
  {
    id: "1",
    type: "approval",
    title: "Q3 Budget Review",
    sender: "Finance Team",
    time: "10 mins ago",
    preview: "Please review and approve the finalized Q3 marketing and engineering budget allocations.",
    isRead: false,
    priority: "high"
  },
  {
    id: "2",
    type: "mention",
    title: "Mentioned you in Core API Task",
    sender: "Alex Dev",
    time: "1 hour ago",
    preview: "@CEO Can we get sign-off on the new rate limiting limits for the public API?",
    isRead: false,
    priority: "normal"
  },
  {
    id: "3",
    type: "system",
    title: "Database Backup Completed",
    sender: "System",
    time: "3 hours ago",
    preview: "Automated daily backup for eu-west-1 cluster was successful.",
    isRead: true,
    priority: "low"
  },
  {
    id: "4",
    type: "request",
    title: "Leave Request: John Smith",
    sender: "HR System",
    time: "Yesterday",
    preview: "John Smith has requested Paid Time Off from Aug 15 to Aug 20.",
    isRead: true,
    priority: "normal"
  }
];

export default function InboxPage() {
  const [messages, setMessages] = useState(initialMessages);
  const [activeMessageId, setActiveMessageId] = useState(initialMessages[0].id);
  const [filter, setFilter] = useState("all");

  const activeMessage = messages.find(m => m.id === activeMessageId);

  const getIconForType = (type: string) => {
    switch (type) {
      case "approval": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "mention": return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "system": return <FileText className="w-4 h-4 text-slate-500" />;
      case "request": return <UserPlus className="w-4 h-4 text-amber-500" />;
      default: return <InboxIcon className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const markAsRead = (id: string) => {
    setMessages(messages.map(m => m.id === id ? { ...m, isRead: true } : m));
  };

  const filteredMessages = messages.filter(m => {
    if (filter === "unread") return !m.isRead;
    return true;
  });

  return (
    <div className="flex h-full bg-background overflow-hidden">
      
      {/* Sidebar List (Left Pane) */}
      <div className="w-[350px] shrink-0 border-r border-border bg-card/30 flex flex-col h-full">
        <div className="p-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <InboxIcon className="w-5 h-5 text-gold" />
              Inbox
            </h1>
            <span className="bg-gold/10 text-gold text-xs font-bold px-2 py-0.5 rounded-full">
              {messages.filter(m => !m.isRead).length} New
            </span>
          </div>
          
          <div className="flex bg-muted/50 p-1 rounded-lg">
            <button 
              onClick={() => setFilter("all")}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${filter === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter("unread")}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${filter === "unread" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Unread
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredMessages.map((msg) => (
            <div 
              key={msg.id}
              onClick={() => {
                setActiveMessageId(msg.id);
                if (!msg.isRead) markAsRead(msg.id);
              }}
              className={`p-4 border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/30 relative ${activeMessageId === msg.id ? 'bg-accent/50' : ''}`}
            >
              {!msg.isRead && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gold rounded-r-md" />}
              
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  {getIconForType(msg.type)}
                  <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">{msg.sender}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{msg.time}</span>
              </div>
              
              <h4 className={`text-sm mb-1 line-clamp-1 ${msg.isRead ? 'text-muted-foreground font-medium' : 'text-foreground font-bold'}`}>
                {msg.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {msg.preview}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Details (Right Pane) */}
      <div className="flex-1 flex flex-col bg-muted/10 relative">
        {activeMessage ? (
          <>
            <div className="h-14 px-6 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {getIconForType(activeMessage.type)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{activeMessage.sender}</div>
                  <div className="text-xs text-muted-foreground capitalize">{activeMessage.type} Notification</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors">
                  <Archive className="w-4 h-4" />
                </button>
                <button className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-8">
              <div className="max-w-3xl mx-auto bg-card border border-border rounded-xl shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">{activeMessage.title}</h2>
                  <span className="text-sm font-medium text-muted-foreground">{activeMessage.time}</span>
                </div>
                
                <div className="text-sm text-foreground leading-loose border-l-2 border-gold/50 pl-4 mb-8">
                  {activeMessage.preview}
                  <br/><br/>
                  Nulla facilisi. Integer vel nisl nec neque commodo convallis vel sed est. Vivamus vitae felis sed massa consequat vulputate. Quisque ut vehicula ligula.
                </div>

                {activeMessage.type === "approval" && (
                  <div className="flex items-center gap-3 bg-muted/30 p-4 rounded-lg border border-border/50">
                    <button className="h-9 px-6 rounded-lg bg-emerald-500/10 text-emerald-500 font-semibold text-sm hover:bg-emerald-500/20 transition-colors">
                      Approve
                    </button>
                    <button className="h-9 px-6 rounded-lg border border-border bg-card hover:bg-accent text-foreground font-semibold text-sm transition-colors">
                      Reject
                    </button>
                  </div>
                )}
                
                {activeMessage.type === "mention" && (
                  <div className="mt-6 border border-border rounded-lg overflow-hidden bg-card focus-within:ring-1 focus-within:ring-gold transition-shadow">
                    <textarea 
                      placeholder="Reply to conversation..." 
                      className="w-full bg-transparent p-4 text-sm focus:outline-none min-h-[100px] resize-none"
                    />
                    <div className="p-2 bg-muted/50 border-t border-border flex justify-end">
                      <button className="h-8 px-4 rounded-md bg-gold hover:bg-gold/90 text-black font-semibold text-xs flex items-center gap-2 transition-colors">
                        <Reply className="w-3.5 h-3.5" />
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <InboxIcon className="w-16 h-16 opacity-20 mb-4" />
            <p className="font-medium">Select a message to read</p>
          </div>
        )}
      </div>

    </div>
  );
}
