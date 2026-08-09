"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Filter, Calendar, Activity, 
  CheckCircle2, Clock, AlertCircle, ArrowUpRight
} from "lucide-react";
import { useAuth } from "../../../../components/auth/auth-context";
import apiClient from "@/lib/api-client";

interface ProgressUpdate {
  id: string;
  userId: string;
  taskId: string | null;
  projectId: string | null;
  date: string;
  type: string;
  status: string;
  notes: string;
  hoursSpent: string;
}

export default function ProgressPage() {
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const res = await apiClient.get("/progress");
      if (res.data.success) setUpdates(res.data.data);
    } catch (e) {
      console.error("Failed to fetch progress updates", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "On Track": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "At Risk": return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "Off Track": return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default: return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const filteredUpdates = updates.filter(u => u.notes?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      
      {/* Header */}
      <div className="shrink-0 px-6 py-6 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-6 h-6 text-gold" />
              Progress Updates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track daily updates, blockers, and team velocity.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="h-9 px-4 rounded-lg bg-gold hover:bg-gold/90 text-black font-semibold text-sm flex items-center gap-2 shadow-sm transition-colors">
              <Plus className="w-4 h-4" />
              Submit Update
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search updates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-9 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button className="h-9 px-3 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-muted/10">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUpdates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No updates yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Submit your first progress update to start tracking velocity.</p>
            <button className="h-9 px-4 rounded-lg bg-gold hover:bg-gold/90 text-black font-semibold text-sm flex items-center gap-2 shadow-sm transition-colors">
              <Plus className="w-4 h-4" />
              Submit Update
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 relative before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border">
            <AnimatePresence>
              {filteredUpdates.map((update, idx) => (
                <motion.div
                  key={update.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                    {getStatusIcon(update.status)}
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-xl border border-border bg-card shadow-sm hover:border-gold/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(update.date).toLocaleDateString()}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold text-foreground">
                        {update.type}
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-semibold text-foreground mb-2">
                      Update from Sai Krishnan (CEO)
                    </h3>
                    
                    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                      {update.notes || "No additional notes provided."}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Status:</span>
                        <span className="text-xs font-semibold text-foreground">{update.status}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <span>{update.hoursSpent} hrs</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
}
