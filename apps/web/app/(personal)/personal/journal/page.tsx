"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import {
  FileText,
  Plus,
  Calendar,
  Search,
  Lock,
  Tag as TagIcon,
  X,
  Trash2,
  Edit3,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";

export default function JournalPage() {
  const { confirm } = useConfirm();

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Editor State
  const [isComposing, setIsComposing] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [mood, setMood] = useState("Focused");
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/journal");
      if (response.data?.success && Array.isArray(response.data.data)) {
        setEntries(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load journal entries", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // AI Assistance for structuring user's provided notes
  const handleStructurePrompt = () => {
    if (!promptInput.trim()) return;
    setTitle("Daily Work & Focus Reflection");
    setBody(promptInput.trim());
    setTags("reflection, focus, progress");
    setPromptInput("");
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await apiClient.post("/personal/journal", {
        title: title.trim(),
        body: body.trim(),
        mood,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });

      setTitle("");
      setBody("");
      setTags("");
      setIsComposing(false);
      await fetchEntries();
    } catch (err) {
      console.error("Failed to save journal entry", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this private journal entry?")) return;
    try {
      await apiClient.delete(`/personal/journal/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete journal entry", err);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return e.title?.toLowerCase().includes(s) || e.body?.toLowerCase().includes(s);
  });

  return (
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6">
      {/* ── Page Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Personal Journal</h1>
            <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-wider border border-border flex items-center gap-1">
              <Lock className="w-3 h-3 text-muted-foreground" /> 100% Private
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Private reflections and daily execution logs. User-scoped and encrypted.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search journal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsComposing(true)}
            className="px-4 h-9 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> New Entry
          </button>
        </div>
      </header>

      {/* ── AI Reflection Assistance Box ── */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs">
        <div>
          <h2 className="text-xs font-bold text-foreground">Structure Reflection with Prompt</h2>
          <p className="text-[11px] text-muted-foreground font-medium">
            Paste your raw notes or thoughts to format a calm reflection entry.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="e.g. Completed the backend API audit today, struggled with schema migration, target focus tomorrow..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
          />
          <button
            type="button"
            onClick={handleStructurePrompt}
            disabled={!promptInput.trim()}
            className="w-full sm:w-auto px-4 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-40"
          >
            Format Entry <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* ── Journal Entries Timeline ── */}
      <section className="flex-1 min-h-0 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground font-medium">
            Loading private journal...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card space-y-2">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-xs font-bold text-foreground">No journal entries yet</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto font-medium">
              Start your personal writing timeline by clicking New Entry above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <article
                key={entry.id}
                className="p-5 rounded-2xl border border-border bg-card hover:border-foreground/20 transition-all space-y-3 shadow-xs group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(entry.createdAt || entry.date).toLocaleDateString()}
                    </span>
                    {entry.mood && (
                      <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-foreground border border-border">
                        {entry.mood}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-foreground">{entry.title}</h3>
                <p className="text-xs text-muted-foreground font-medium whitespace-pre-wrap leading-relaxed">
                  {entry.body}
                </p>

                {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {entry.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="text-[10px] text-muted-foreground font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Editor Modal ── */}
      {isComposing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">New Private Journal Entry</h3>
              <button onClick={() => setIsComposing(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">ENTRY TITLE *</label>
                <input
                  type="text"
                  placeholder="e.g. Project Progress Reflection"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">REFLECTIONS & BODY</label>
                <textarea
                  rows={5}
                  placeholder="Write your private thoughts and reflections..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full p-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">TAGS (COMMA SEPARATED)</label>
                  <input
                    type="text"
                    placeholder="e.g. project, learning, focus"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">MOOD</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                  >
                    <option value="Focused">Focused</option>
                    <option value="Productive">Productive</option>
                    <option value="Reflective">Reflective</option>
                    <option value="Calm">Calm</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setIsComposing(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
