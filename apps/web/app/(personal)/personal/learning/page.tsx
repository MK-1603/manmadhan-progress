"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import {
  GraduationCap,
  Plus,
  Clock,
  Target,
  CheckCircle2,
  TrendingUp,
  X,
  Zap,
  ArrowRight,
  AlertCircle,
  BookOpen,
  Trash2,
} from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { useConfirm } from "@/hooks/use-confirm";

const LEARNING_EXAMPLES = [
  "Create a 14-day learning plan for Redis.",
  "Create a learning plan for system design over the next 30 days.",
  "Create a learning plan for React with 1 hour every morning.",
  "Create a learning plan for GraphQL and schedule it for 7 PM every weekday.",
];

export default function LearningPage() {
  const { socket, isConnected } = useSocket();
  const { confirm } = useConfirm();

  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Integrated Prompt Creation
  const [promptInput, setPromptInput] = useState("");
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<any | null>(null);

  // Manual Modal State
  const [showModal, setShowModal] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: "",
    category: "Engineering",
    currentLevel: "Beginner",
    targetLevel: "Expert",
    progressPercent: 0,
  });

  const fetchSkills = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/learning/skills");
      if (response.data?.success && Array.isArray(response.data.data)) {
        setSkills(response.data.data);
      }
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
    const handleCreated = (skill: any) => setSkills((prev) => [skill, ...prev]);
    const handleUpdated = (skill: any) =>
      setSkills((prev) => prev.map((s) => (s.id === skill.id ? skill : s)));
    const handleDeleted = ({ id }: { id: string }) =>
      setSkills((prev) => prev.filter((s) => s.id !== id));

    socket.on("skill_created", handleCreated);
    socket.on("skill_updated", handleUpdated);
    socket.on("skill_deleted", handleDeleted);

    return () => {
      socket.off("skill_created");
      socket.off("skill_updated");
      socket.off("skill_deleted");
    };
  }, [socket, isConnected]);

  // Handle Natural Language Prompt Interpretation
  const handleInterpretPrompt = async (raw?: string) => {
    const text = raw || promptInput;
    if (!text.trim() || text.trim().length < 4) return;
    setError(null);
    setIsInterpreting(true);

    try {
      const topic = text.replace(/create a|learning plan for|learn|study/gi, "").trim();
      setPreviewPlan({
        name: `Master ${topic.charAt(0).toUpperCase() + topic.slice(1) || "GraphQL"}`,
        category: "Technical Skill",
        duration: "30 Days",
        dailyCommitment: "2 Hours / Evening",
        currentLevel: "Beginner",
        targetLevel: "Expert",
        stagesCount: 4,
        description: text,
      });
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleSavePreview = async () => {
    if (!previewPlan) return;
    setSaving(true);
    setError(null);

    try {
      const res = await apiClient.post("/personal/learning/skills", {
        name: previewPlan.name,
        category: previewPlan.category,
        currentLevel: previewPlan.currentLevel,
        targetLevel: previewPlan.targetLevel,
        progressPercent: 0,
      });

      if (res.data?.success) {
        setPreviewPlan(null);
        setPromptInput("");
        await fetchSkills();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to save learning plan.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateManual = async () => {
    if (!newSkill.name.trim()) return;
    setSaving(true);
    try {
      await apiClient.post("/personal/learning/skills", newSkill);
      setShowModal(false);
      setNewSkill({
        name: "",
        category: "Engineering",
        currentLevel: "Beginner",
        targetLevel: "Expert",
        progressPercent: 0,
      });
      await fetchSkills();
    } catch (err) {
      console.error("Failed to create skill", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this learning plan?")) return;
    try {
      await apiClient.delete(`/personal/learning/skills/${id}`);
      setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete skill", err);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6">
      {/* ── Page Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Learning & Skills</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Structure your skill development roadmaps and track learning sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 h-9 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0 shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Add Skill
        </button>
      </header>

      {/* ── Integrated Natural Language Prompt Box ── */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
        <div>
          <h2 className="text-xs font-bold text-foreground">Create Learning Plan with Prompt</h2>
          <p className="text-[11px] text-muted-foreground font-medium">
            Describe what you want to learn, target level, and daily commitment.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="e.g. Create a 30-day GraphQL learning plan with 2 hours every evening..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
          />
          <button
            type="button"
            onClick={() => handleInterpretPrompt()}
            disabled={isInterpreting || !promptInput.trim()}
            className="w-full sm:w-auto px-4 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-40"
          >
            {isInterpreting ? "Structuring Plan..." : "Generate Track"} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Example Prompt Chips */}
        <div className="pt-2 border-t border-border flex flex-wrap gap-2">
          {LEARNING_EXAMPLES.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPromptInput(ex);
                handleInterpretPrompt(ex);
              }}
              className="px-2.5 py-1 rounded-lg border border-border bg-muted/20 hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              "{ex}"
            </button>
          ))}
        </div>
      </section>

      {/* ── Human-Readable Preview Card ── */}
      {previewPlan && (
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Learning Roadmap Preview: {previewPlan.name}
            </h3>
            <span className="px-2 py-0.5 rounded-md bg-gold/10 text-gold text-[10px] font-bold border border-gold/20">
              {previewPlan.category}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-background border border-border">
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Duration</span>
              <p className="text-xs font-bold text-foreground">{previewPlan.duration}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Daily Commitment</span>
              <p className="text-xs font-bold text-foreground">{previewPlan.dailyCommitment}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Starting Level</span>
              <p className="text-xs font-bold text-foreground">{previewPlan.currentLevel}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Target Level</span>
              <p className="text-xs font-bold text-foreground">{previewPlan.targetLevel}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setPreviewPlan(null)}
              className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted"
            >
              Discard
            </button>
            <button
              onClick={handleSavePreview}
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90"
            >
              {saving ? "Creating Track..." : "Confirm & Create Plan"}
            </button>
          </div>
        </section>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Skills & Learning Plans Grid ── */}
      <section className="flex-1 min-h-0">
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground font-medium">
            Loading skills & learning tracks...
          </div>
        ) : skills.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card space-y-2">
            <GraduationCap className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-xs font-bold text-foreground">No learning plans found</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto font-medium">
              Create a learning roadmap above using natural language or add a skill manually.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <article
                key={skill.id}
                className="p-5 rounded-2xl border border-border bg-card hover:border-foreground/20 transition-all flex flex-col justify-between space-y-4 shadow-xs group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-bold uppercase tracking-wider border border-border">
                      {skill.category || "Skill"}
                    </span>
                    <button
                      onClick={() => handleDelete(skill.id)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-foreground truncate">{skill.name}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pt-1">
                    <span>Level: {skill.currentLevel || "Beginner"}</span>
                    <span>Target: {skill.targetLevel || "Expert"}</span>
                  </div>
                </div>

                <div className="space-y-1 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                    <span>Progress</span>
                    <span>{skill.progressPercent || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(skill.progressPercent || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Manual Add Skill Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Add New Skill / Learning Track</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">SKILL / TOPIC NAME *</label>
                <input
                  type="text"
                  placeholder="e.g. System Design Architecture"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">CATEGORY</label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineering"
                  value={newSkill.category}
                  onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateManual}
                disabled={saving || !newSkill.name.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {saving ? "Creating..." : "Save Skill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
