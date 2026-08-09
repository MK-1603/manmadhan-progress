"use client";

import { useState } from "react";
import apiClient from "@/lib/api-client";
import { X, Send, UserCheck, Briefcase } from "lucide-react";

export function InvitationPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.post("/invitations", {
        email,
        role,
        workspaceId,
        departmentId: departmentId || null
      });
      onClose();
      setEmail("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-layer-1 border-l border-border shadow-2xl animate-in slide-in-from-right flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-500" /> New Invitation
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-layer-2 rounded-lg transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full px-4 py-3 bg-layer-2 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Role assignment</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("Member")}
                  className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${
                    role === "Member" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-border/50 bg-layer-2 text-muted-foreground hover:bg-layer-3"
                  }`}
                >
                  <UserCheck className="w-6 h-6" />
                  <span className="font-semibold">Member</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("CO-CEO")}
                  className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${
                    role === "CO-CEO" ? "border-gold bg-gold/10 text-gold" : "border-border/50 bg-layer-2 text-muted-foreground hover:bg-layer-3"
                  }`}
                >
                  <Briefcase className="w-6 h-6" />
                  <span className="font-semibold">CO-CEO</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Department (Optional)</label>
              <input 
                type="text" 
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                placeholder="e.g. Engineering, Sales"
                className="w-full px-4 py-3 bg-layer-2 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-foreground text-background font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Sending Invitation..." : "Send Invitation"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
