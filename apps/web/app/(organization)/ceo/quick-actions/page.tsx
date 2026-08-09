"use client";

import { motion } from "framer-motion";
import { 
  Zap, FolderKanban, CheckSquare, Megaphone, UserPlus, 
  FileText, Calendar, CreditCard, PlayCircle, Settings
} from "lucide-react";
import Link from "next/link";

const quickActions = [
  {
    category: "Execution",
    items: [
      { name: "New Project", description: "Initialize a new enterprise project.", icon: FolderKanban, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
      { name: "Create Task", description: "Assign a task to a team member.", icon: CheckSquare, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
      { name: "Progress Update", description: "Submit your daily status update.", icon: PlayCircle, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    ]
  },
  {
    category: "People & HR",
    items: [
      { name: "Invite Member", description: "Send an email invitation to join.", icon: UserPlus, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
      { name: "Request Leave", description: "Submit PTO or sick leave request.", icon: Calendar, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20" },
      { name: "Run Payroll", description: "Initiate monthly payroll processing.", icon: CreditCard, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
    ]
  },
  {
    category: "Communication",
    items: [
      { name: "Company Broadcast", description: "Send a global announcement.", icon: Megaphone, color: "text-gold", bg: "bg-gold/10", border: "border-gold/20" },
      { name: "New Document", description: "Create a wiki or knowledge base doc.", icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
      { name: "System Config", description: "Modify global application settings.", icon: Settings, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" },
    ]
  }
];

export default function QuickActionsPage() {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      
      {/* Header */}
      <div className="shrink-0 px-6 py-6 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-gold fill-gold/20" />
          Quick Actions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Rapidly execute common tasks and system functions.</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 md:p-10 bg-muted/5">
        <div className="max-w-6xl mx-auto space-y-12">
          {quickActions.map((group, groupIdx) => (
            <div key={group.category}>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">
                {group.category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.name}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (groupIdx * 0.1) + (idx * 0.05), duration: 0.3 }}
                    >
                      <button className="w-full text-left group bg-card border border-border p-5 rounded-2xl shadow-sm hover:border-gold/50 hover:shadow-md transition-all h-full flex flex-col items-start relative overflow-hidden">
                        
                        {/* Hover Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gold/0 via-gold/0 to-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${action.bg} ${action.border} ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        
                        <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-gold transition-colors relative z-10">
                          {action.name}
                        </h3>
                        <p className="text-sm text-muted-foreground relative z-10 leading-relaxed">
                          {action.description}
                        </p>
                        
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
