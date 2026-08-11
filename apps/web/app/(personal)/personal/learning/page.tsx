"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, Plus, BookOpen, Target, Activity, CheckCircle2, TrendingUp, X, Save } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { useConfirm } from "@/hooks/use-confirm";

export default function LearningPage() {
  const { socket, isConnected } = useSocket();
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"skills" | "sessions">("skills");
  const { confirm } = useConfirm();

  // Modal States
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState<string | null>(null);

  // New Skill State
  const [newSkill, setNewSkill] = useState({ name: "", category: "", targetLevel: "Expert", currentLevel: "Beginner", progressPercent: 0 });
  // New Session State
  const [newSession, setNewSession] = useState({ topic: "", durationMinutes: 30, notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchSkills = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/learning/skills");
      setSkills(response.data.data);
    } catch (err) {
      console.error("Failed to load skills", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("skill_created", (skill: any) => {
      setSkills(prev => [skill, ...prev]);
    });

    socket.on("skill_updated", (skill: any) => {
      setSkills(prev => prev.map(s => s.id === skill.id ? skill : s));
    });

    socket.on("skill_deleted", ({ id }: { id: string }) => {
      setSkills(prev => prev.filter(s => s.id !== id));
    });

    // We don't fetch all sessions by default, but when a session is logged we might update skill progress if backend did it.
    // For now, rely on manual refresh or assume no automatic progress calculation in backend yet.

    return () => {
      socket.off("skill_created");
      socket.off("skill_updated");
      socket.off("skill_deleted");
    };
  }, [socket, isConnected]);

  const handleCreateSkill = async () => {
    if (!newSkill.name.trim()) return;
    setSaving(true);
    try {
      await apiClient.post("/personal/learning/skills", newSkill);
      setShowSkillModal(false);
      setNewSkill({ name: "", category: "", targetLevel: "Expert", currentLevel: "Beginner", progressPercent: 0 });
    } catch (err) {
      console.error("Failed to create skill", err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogSession = async () => {
    if (!showSessionModal || !newSession.durationMinutes) return;
    setSaving(true);
    try {
      await apiClient.post(`/personal/learning/skills/${showSessionModal}/sessions`, newSession);
      setShowSessionModal(null);
      setNewSession({ topic: "", durationMinutes: 30, notes: "" });
      
      // Optionally update the skill's progress locally or let user manually manage it
      alert("Session logged successfully!");
    } catch (err) {
      console.error("Failed to log session", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteSkill = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({ title: "Confirm Action", description: "Delete this skill?", variant: "destructive", confirmLabel: "Confirm" });
    if (ok) {
      try {
        await apiClient.delete(`/personal/learning/skills/${id}`);
      } catch (err) {
        console.error("Failed to delete", err);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500 overflow-y-auto hide-scrollbar">
      
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight tracking-tight mb-2">
            Learning & Skills
          </h1>
          <p className="text-[16px] text-[#52525B] dark:text-[#A1A1AA] max-w-[600px]">
            Master new abilities, track your progress, and log your study sessions.
          </p>
        </div>

        <button 
          onClick={() => setShowSkillModal(true)}
          className="h-10 px-5 rounded-full bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoaderCircle className="w-8 h-8 text-[#A1A1AA] animate-spin" />
        </div>
      ) : skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-center">
          <BookOpen className="w-12 h-12 text-[#A1A1AA] dark:text-[#52525B] mb-4" />
          <h3 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">No skills tracked yet</h3>
          <p className="text-[#52525B] dark:text-[#A1A1AA] max-w-md">
            Add a language, programming framework, or any other skill you want to master.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map(skill => (
            <div key={skill.id} className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-6 shadow-sm relative group hover:border-[#A1A1AA] dark:hover:border-[#52525B] transition-colors">
              <button 
                onClick={(e) => deleteSkill(skill.id, e)}
                className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] text-[#A1A1AA] opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium hover:text-red-500"
              >
                Delete
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#171717] dark:bg-[#F5F5F5] flex items-center justify-center text-white dark:text-[#080808]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#171717] dark:text-[#F5F5F5] leading-none mb-1 pr-12">{skill.name}</h3>
                  <span className="text-xs font-medium text-[#52525B] dark:text-[#A1A1AA] bg-[#F4F4F5] dark:bg-[#1D1D1D] px-2 py-0.5 rounded-md">
                    {skill.category || "General"}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-[#52525B] dark:text-[#A1A1AA] flex items-center gap-1.5"><Activity className="w-4 h-4" /> Current</span>
                    <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{skill.currentLevel}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#52525B] dark:text-[#A1A1AA] flex items-center gap-1.5"><Target className="w-4 h-4" /> Target</span>
                    <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{skill.targetLevel}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">
                    <span>Mastery Progress</span>
                    <span>{skill.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E5E7EB] dark:bg-[#242424] overflow-hidden">
                    <div className="h-full bg-[#171717] dark:bg-[#F5F5F5] rounded-full transition-all duration-500" style={{ width: `${skill.progressPercent}%` }} />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSessionModal(skill.id)}
                className="w-full py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#242424] text-[#171717] dark:text-[#F5F5F5] text-sm font-medium hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Log Session
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5]">Add New Skill</h2>
              <button onClick={() => setShowSkillModal(false)} className="text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Skill Name</label>
                <input 
                  type="text" 
                  value={newSkill.name} 
                  onChange={(e) => setNewSkill({...newSkill, name: e.target.value})}
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                  placeholder="e.g. Spanish, React, Guitar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Category</label>
                <input 
                  type="text" 
                  value={newSkill.category} 
                  onChange={(e) => setNewSkill({...newSkill, category: e.target.value})}
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                  placeholder="e.g. Language, Programming"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Current Level</label>
                  <select 
                    value={newSkill.currentLevel} 
                    onChange={(e) => setNewSkill({...newSkill, currentLevel: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Target Level</label>
                  <select 
                    value={newSkill.targetLevel} 
                    onChange={(e) => setNewSkill({...newSkill, targetLevel: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              onClick={handleCreateSkill}
              disabled={saving || !newSkill.name.trim()}
              className="w-full h-10 rounded-lg bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Skill"}
            </button>
          </div>
        </div>
      )}

      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5]">Log Session</h2>
              <button onClick={() => setShowSessionModal(null)} className="text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Topic Covered (Optional)</label>
                <input 
                  type="text" 
                  value={newSession.topic} 
                  onChange={(e) => setNewSession({...newSession, topic: e.target.value})}
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                  placeholder="e.g. Chapter 4, Verb conjugations"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Duration (Minutes)</label>
                <input 
                  type="number" 
                  value={newSession.durationMinutes} 
                  onChange={(e) => setNewSession({...newSession, durationMinutes: parseInt(e.target.value) || 0})}
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Notes</label>
                <textarea 
                  value={newSession.notes} 
                  onChange={(e) => setNewSession({...newSession, notes: e.target.value})}
                  className="w-full h-24 p-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm resize-none focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                  placeholder="Any reflections on this session?"
                />
              </div>
            </div>

            <button 
              onClick={handleLogSession}
              disabled={saving}
              className="w-full h-10 rounded-lg bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors disabled:opacity-50"
            >
              {saving ? "Logging..." : "Save Session"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
