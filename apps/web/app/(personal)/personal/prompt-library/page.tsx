"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import {
  LoaderCircle, Search, Plus, Star, StarOff, Copy, Trash2,
  BookOpen, Play, Edit2, X, Check, ChevronDown
} from "lucide-react";

const CATEGORIES = ["All", "Projects", "Tasks", "PRD", "TRD", "Workflow", "Documents", "Reports", "Development", "Planning", "Productivity", "Custom"];

interface Prompt {
  id: string;
  name: string;
  description: string | null;
  category: string;
  body: string;
  variables: Array<{ key: string; label: string; defaultValue?: string }>;
  tags: string[];
  isFavorite: boolean;
  isSystem: boolean;
  usageCount: number;
}

export default function PromptLibraryPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: "", description: "", category: "Custom", body: "" });

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "All") params.set("category", category);
      if (search) params.set("search", search);
      if (showFavorites) params.set("favorites", "true");
      const res = await apiClient.get(`/personal/prompts?${params}`);
      if (res.data.success) setPrompts(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [category, search, showFavorites]);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const toggleFavorite = async (p: Prompt, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.patch(`/personal/prompts/${p.id}`, { isFavorite: !p.isFavorite });
      setPrompts(prev => prev.map(x => x.id === p.id ? { ...x, isFavorite: !x.isFavorite } : x));
    } catch (err) { console.error(err); }
  };

  const duplicatePrompt = async (p: Prompt, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/personal/prompts/${p.id}/duplicate`);
      fetchPrompts();
    } catch (err) { console.error(err); }
  };

  const deletePrompt = async (p: Prompt, e: React.MouseEvent) => {
    e.stopPropagation();
    if (p.isSystem) return;
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await apiClient.delete(`/personal/prompts/${p.id}`);
      setPrompts(prev => prev.filter(x => x.id !== p.id));
    } catch (err) { console.error(err); }
  };

  const handleUsePrompt = async (p: Prompt) => {
    setSelectedPrompt(p);
    const defaults: Record<string, string> = {};
    (p.variables || []).forEach(v => { defaults[v.key] = v.defaultValue || ""; });
    setVariableValues(defaults);
  };

  const runPrompt = async () => {
    if (!selectedPrompt) return;
    let body = selectedPrompt.body;
    Object.entries(variableValues).forEach(([key, val]) => {
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
    });
    try {
      await apiClient.post(`/personal/prompts/${selectedPrompt.id}/use`);
    } catch { /* non-fatal */ }
    router.push(`/personal/ai-builder?prompt=${encodeURIComponent(body)}`);
    setSelectedPrompt(null);
  };

  const createPrompt = async () => {
    if (!newPrompt.name.trim() || !newPrompt.body.trim()) return;
    setCreating(true);
    try {
      await apiClient.post("/personal/prompts", newPrompt);
      setShowCreateModal(false);
      setNewPrompt({ name: "", description: "", category: "Custom", body: "" });
      fetchPrompts();
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight mb-1">Prompt Library</h1>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Reusable AI prompts with variables. Select one to open in AI Builder.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> New Prompt
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
          <input type="text" placeholder="Search prompts..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] text-sm focus:outline-none focus:border-[#A1A1AA]" />
        </div>
        <button onClick={() => setShowFavorites(!showFavorites)}
          className={`flex items-center gap-2 px-3 h-10 rounded-xl border text-sm font-medium transition-colors ${showFavorites ? "border-amber-400 text-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-[#E5E7EB] dark:border-[#242424] text-[#52525B] dark:text-[#A1A1AA]"}`}>
          <Star className="w-4 h-4" /> Favorites
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-6">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${category === c ? "bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808]" : "bg-[#F4F4F5] dark:bg-[#1D1D1D] text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#E5E7EB] dark:hover:bg-[#242424]"}`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoaderCircle className="w-7 h-7 animate-spin text-[#A1A1AA]" /></div>
      ) : prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl text-center">
          <BookOpen className="w-12 h-12 text-[#A1A1AA] mb-4" />
          <h3 className="text-lg font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">No prompts found</h3>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Try a different filter or create your first prompt.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
          {prompts.map(p => (
            <div key={p.id} className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow cursor-pointer group" onClick={() => handleUsePrompt(p)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F4F4F5] dark:bg-[#1D1D1D] text-[#52525B] dark:text-[#A1A1AA]">{p.category}</span>
                    {p.isSystem && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#D99A00]/10 text-[#D99A00]">Built-in</span>}
                  </div>
                  <h3 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] truncate">{p.name}</h3>
                </div>
                <button onClick={e => toggleFavorite(p, e)} className="p-1 shrink-0 text-[#A1A1AA] hover:text-amber-500 transition-colors">
                  {p.isFavorite ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <Star className="w-4 h-4" />}
                </button>
              </div>
              {p.description && <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] line-clamp-2">{p.description}</p>}
              <p className="text-xs text-[#A1A1AA] bg-[#F4F4F5] dark:bg-[#1D1D1D] p-2 rounded-lg line-clamp-2 font-mono">{p.body}</p>
              {p.variables?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.variables.slice(0, 3).map(v => (
                    <span key={v.key} className="text-[10px] px-2 py-0.5 rounded-full border border-[#E5E7EB] dark:border-[#242424] text-[#52525B] dark:text-[#A1A1AA]">{`{{${v.key}}}`}</span>
                  ))}
                  {p.variables.length > 3 && <span className="text-[10px] text-[#A1A1AA]">+{p.variables.length - 3} more</span>}
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-[#F4F4F5] dark:border-[#1D1D1D]">
                <span className="text-[11px] text-[#A1A1AA]">Used {p.usageCount} times</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => duplicatePrompt(p, e)} className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] hover:text-[#52525B] transition-colors" title="Duplicate">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {!p.isSystem && (
                    <button onClick={e => deletePrompt(p, e)} className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleUsePrompt(p); }} className="p-1.5 rounded-lg bg-[#D99A00] text-white hover:opacity-90 transition-opacity" title="Use Prompt">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Variable Modal */}
      {selectedPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[520px] bg-white dark:bg-[#111111] rounded-2xl shadow-2xl border border-[#E5E7EB] dark:border-[#242424] overflow-hidden">
            <div className="p-5 border-b border-[#E5E7EB] dark:border-[#242424] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#171717] dark:text-[#F5F5F5]">{selectedPrompt.name}</h3>
                <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] mt-0.5">Fill in the variables to run this prompt</p>
              </div>
              <button onClick={() => setSelectedPrompt(null)} className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedPrompt.variables?.length === 0 ? (
                <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">This prompt has no variables. It will run as-is.</p>
              ) : (
                selectedPrompt.variables?.map(v => (
                  <div key={v.key}>
                    <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1.5">{v.label}</label>
                    <input type="text" value={variableValues[v.key] || ""} onChange={e => setVariableValues(prev => ({ ...prev, [v.key]: e.target.value }))} placeholder={v.defaultValue || `Enter ${v.label}`}
                      className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:border-[#D99A00]/50" />
                  </div>
                ))
              )}
            </div>
            <div className="p-5 border-t border-[#E5E7EB] dark:border-[#242424] flex gap-3">
              <button onClick={() => setSelectedPrompt(null)} className="flex-1 h-10 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors">Cancel</button>
              <button onClick={runPrompt} className="flex-1 h-10 rounded-xl bg-[#D99A00] dark:bg-[#F5B800] text-white dark:text-[#080808] text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Run in AI Builder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[520px] bg-white dark:bg-[#111111] rounded-2xl shadow-2xl border border-[#E5E7EB] dark:border-[#242424]">
            <div className="p-5 border-b border-[#E5E7EB] dark:border-[#242424] flex items-center justify-between">
              <h3 className="font-bold text-[#171717] dark:text-[#F5F5F5]">Create Prompt</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1.5">Name *</label>
                <input type="text" value={newPrompt.name} onChange={e => setNewPrompt(p => ({ ...p, name: e.target.value }))} placeholder="My Prompt"
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm focus:outline-none focus:border-[#D99A00]/50 text-[#171717] dark:text-[#F5F5F5]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1.5">Category</label>
                <select value={newPrompt.category} onChange={e => setNewPrompt(p => ({ ...p, category: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm focus:outline-none text-[#171717] dark:text-[#F5F5F5]">
                  {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1.5">Prompt Body * (use {`{{VARIABLE_KEY}}`} for variables)</label>
                <textarea value={newPrompt.body} onChange={e => setNewPrompt(p => ({ ...p, body: e.target.value }))} rows={5} placeholder="Write your prompt here. Use {{PROJECT_NAME}} for variables."
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm focus:outline-none focus:border-[#D99A00]/50 text-[#171717] dark:text-[#F5F5F5] resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-[#E5E7EB] dark:border-[#242424] flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 h-10 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors">Cancel</button>
              <button onClick={createPrompt} disabled={creating || !newPrompt.name.trim() || !newPrompt.body.trim()} className="flex-1 h-10 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {creating ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
