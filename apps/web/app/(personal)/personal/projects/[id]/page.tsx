"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import {
  LoaderCircle, ArrowLeft, Target, Clock, CheckCircle2, Circle,
  Plus, Trash2, Edit2, X, Save, ListTodo, Layers, FileText,
  FolderKanban, Milestone, Check, AlertCircle
} from "lucide-react";

type Tab = "overview" | "features" | "requirements" | "tasks";

interface Feature { id: string; name: string; description: string | null; priority: string; status: string; }
interface Requirement { id: string; title: string; description: string | null; category: string; status: string; }

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [loadingReqs, setLoadingReqs] = useState(false);

  // Feature form state
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [featureForm, setFeatureForm] = useState({ name: "", description: "", priority: "MEDIUM", status: "PLANNED" });

  // Requirement form state
  const [showReqForm, setShowReqForm] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [reqForm, setReqForm] = useState({ title: "", description: "", category: "Functional", status: "PLANNED" });

  const [saving, setSaving] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await apiClient.get(`/personal/projects/${id}`);
      if (res.data.success) {
        setProject(res.data.data);
        setFeatures(res.data.data.features || []);
        setRequirements(res.data.data.requirements || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  // Fetch features separately when tab opens (in case they weren't in initial load)
  const fetchFeatures = useCallback(async () => {
    setLoadingFeatures(true);
    try {
      const res = await apiClient.get(`/personal/projects/${id}/features`);
      if (res.data.success) setFeatures(res.data.data);
    } catch { /* table may not exist yet */ }
    finally { setLoadingFeatures(false); }
  }, [id]);

  const fetchRequirements = useCallback(async () => {
    setLoadingReqs(true);
    try {
      const res = await apiClient.get(`/personal/projects/${id}/requirements`);
      if (res.data.success) setRequirements(res.data.data);
    } catch { /* table may not exist yet */ }
    finally { setLoadingReqs(false); }
  }, [id]);

  useEffect(() => {
    if (activeTab === "features") fetchFeatures();
    if (activeTab === "requirements") fetchRequirements();
  }, [activeTab, fetchFeatures, fetchRequirements]);

  // Feature CRUD
  const saveFeature = async () => {
    if (!featureForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingFeature) {
        const res = await apiClient.patch(`/personal/projects/${id}/features/${editingFeature.id}`, featureForm);
        if (res.data.success) setFeatures(prev => prev.map(f => f.id === editingFeature.id ? res.data.data : f));
      } else {
        const res = await apiClient.post(`/personal/projects/${id}/features`, featureForm);
        if (res.data.success) setFeatures(prev => [...prev, res.data.data]);
      }
      setShowFeatureForm(false); setEditingFeature(null);
      setFeatureForm({ name: "", description: "", priority: "MEDIUM", status: "PLANNED" });
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const deleteFeature = async (fid: string) => {
    if (!confirm("Delete this feature?")) return;
    try {
      await apiClient.delete(`/personal/projects/${id}/features/${fid}`);
      setFeatures(prev => prev.filter(f => f.id !== fid));
    } catch (err) { console.error(err); }
  };

  // Requirement CRUD
  const saveRequirement = async () => {
    if (!reqForm.title.trim()) return;
    setSaving(true);
    try {
      if (editingReq) {
        const res = await apiClient.patch(`/personal/projects/${id}/requirements/${editingReq.id}`, reqForm);
        if (res.data.success) setRequirements(prev => prev.map(r => r.id === editingReq.id ? res.data.data : r));
      } else {
        const res = await apiClient.post(`/personal/projects/${id}/requirements`, reqForm);
        if (res.data.success) setRequirements(prev => [...prev, res.data.data]);
      }
      setShowReqForm(false); setEditingReq(null);
      setReqForm({ title: "", description: "", category: "Functional", status: "PLANNED" });
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const deleteRequirement = async (rid: string) => {
    if (!confirm("Delete this requirement?")) return;
    try {
      await apiClient.delete(`/personal/projects/${id}/requirements/${rid}`);
      setRequirements(prev => prev.filter(r => r.id !== rid));
    } catch (err) { console.error(err); }
  };

  const handleToggleTask = async (task: any) => {
    const newStatus = (task.status === "COMPLETED" || task.status === "Completed") ? "TODO" : "COMPLETED";
    setProject((prev: any) => ({ ...prev, tasks: prev.tasks.map((t: any) => t.id === task.id ? { ...t, status: newStatus } : t) }));
    try { await apiClient.patch(`/personal/tasks/${task.id}`, { status: newStatus }); }
    catch (err) { fetchProject(); }
  };

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center">
      <LoaderCircle className="w-8 h-8 text-[#A1A1AA] animate-spin" />
    </div>
  );

  if (!project) return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <AlertCircle className="w-10 h-10 text-[#A1A1AA]" />
      <h2 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5]">Project Not Found</h2>
      <button onClick={() => router.push("/personal/projects")} className="text-blue-500 hover:underline text-sm">Back to Projects</button>
    </div>
  );

  const completedTasks = project.tasks?.filter((t: any) => t.status === "COMPLETED" || t.status === "Completed").length || 0;
  const totalTasks = project.tasks?.length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.progress || 0;

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "features", label: "Features", count: features.length },
    { key: "requirements", label: "Requirements", count: requirements.length },
    { key: "tasks", label: "Tasks", count: totalTasks },
  ];

  const STATUS_COLORS: Record<string, string> = {
    PLANNED: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    IN_PROGRESS: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    COMPLETED: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    BLOCKED: "bg-red-100 dark:bg-red-900/30 text-red-500",
    VERIFIED: "bg-green-100 dark:bg-green-900/30 text-green-600",
    REJECTED: "bg-red-100 dark:bg-red-900/30 text-red-500",
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-[#F7F7F5] dark:bg-[#080808]">
      <div className="w-full max-w-[1100px] mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">

        {/* Back */}
        <button onClick={() => router.push("/personal/projects")}
          className="flex items-center gap-2 text-sm text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-[#F4F4F5] dark:bg-[#1D1D1D] text-[#52525B] dark:text-[#A1A1AA]">{project.status}</span>
              {project.priority && <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">{project.priority}</span>}
            </div>
            <h1 className="text-[28px] sm:text-[36px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight mb-2">{project.name}</h1>
            <p className="text-base text-[#52525B] dark:text-[#A1A1AA] max-w-[600px]">{project.description || project.goal || "No description."}</p>
          </div>
          <div className="shrink-0 w-full lg:w-[220px] bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-xs text-[#52525B] dark:text-[#A1A1AA]">Progress</div>
                <div className="text-xl font-bold text-green-600">{progress}%</div>
              </div>
            </div>
            <div className="h-2 bg-[#E5E7EB] dark:bg-[#242424] rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-[#A1A1AA]">
              <span>{completedTasks} done</span><span>{totalTasks} total tasks</span>
            </div>
            {project.deadline && (
              <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#242424] flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-[#A1A1AA]" />
                <span className="font-medium text-[#171717] dark:text-[#F5F5F5]">{new Date(project.deadline).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#E5E7EB] dark:border-[#242424] mb-6 overflow-x-auto hide-scrollbar">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? "border-[#D99A00] text-[#171717] dark:text-[#F5F5F5]"
                  : "border-transparent text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              }`}>
              {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ""}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Milestones */}
              <div>
                <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-[#D99A00]" /> Milestones & Tasks
                </h2>
                {project.milestones?.length > 0 ? (
                  <div className="space-y-4">
                    {project.milestones.map((ms: any) => {
                      const mTasks = project.tasks?.filter((t: any) => t.milestoneId === ms.id) || [];
                      const mDone = mTasks.filter((t: any) => t.status === "COMPLETED" || t.status === "Completed").length;
                      return (
                        <div key={ms.id} className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-xl overflow-hidden">
                          <div className="p-4 border-b border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/30 dark:bg-[#1D1D1D]/30 flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-sm text-[#171717] dark:text-[#F5F5F5]">{ms.order}. {ms.name}</h3>
                              {ms.description && <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] mt-0.5">{ms.description}</p>}
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 bg-white dark:bg-[#080808] border border-[#E5E7EB] dark:border-[#242424] rounded">{mDone}/{mTasks.length}</span>
                          </div>
                          <div className="p-2">
                            {mTasks.length === 0 ? (
                              <p className="text-xs text-[#A1A1AA] p-2">No tasks in this milestone.</p>
                            ) : mTasks.map((t: any) => (
                              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F4F4F5]/50 dark:hover:bg-[#1D1D1D]/50 transition-colors">
                                <button onClick={() => handleToggleTask(t)}>
                                  {t.status === "COMPLETED" || t.status === "Completed"
                                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    : <Circle className="w-4 h-4 text-[#E5E7EB] dark:text-[#242424] shrink-0" />}
                                </button>
                                <span className={`text-sm ${(t.status === "COMPLETED" || t.status === "Completed") ? "line-through text-[#A1A1AA]" : "text-[#171717] dark:text-[#F5F5F5]"}`}>{t.title}</span>
                                {t.estimatedMinutes && <span className="ml-auto text-xs text-[#A1A1AA]">{t.estimatedMinutes}m</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-xl text-center text-sm text-[#A1A1AA]">
                    No milestones set for this project.
                  </div>
                )}
              </div>
            </div>
            {/* About Panel */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#52525B] dark:text-[#A1A1AA] mb-4">About</h3>
                <div className="space-y-3 text-sm">
                  {project.goal && <div><span className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F5] block mb-1">Goal</span><p className="text-[#52525B] dark:text-[#A1A1AA]">{project.goal}</p></div>}
                  <div><span className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F5] block mb-1">Created</span><p className="text-[#52525B] dark:text-[#A1A1AA]">{new Date(project.createdAt).toLocaleDateString()}</p></div>
                  {project.startDate && <div><span className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F5] block mb-1">Start Date</span><p className="text-[#52525B] dark:text-[#A1A1AA]">{new Date(project.startDate).toLocaleDateString()}</p></div>}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#242424] text-center">
                    <div><div className="text-lg font-bold text-[#171717] dark:text-[#F5F5F5]">{features.length}</div><div className="text-xs text-[#A1A1AA]">Features</div></div>
                    <div><div className="text-lg font-bold text-[#171717] dark:text-[#F5F5F5]">{requirements.length}</div><div className="text-xs text-[#A1A1AA]">Reqs</div></div>
                    <div><div className="text-lg font-bold text-[#171717] dark:text-[#F5F5F5]">{project.milestones?.length || 0}</div><div className="text-xs text-[#A1A1AA]">Milestones</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FEATURES TAB */}
        {activeTab === "features" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">Features ({features.length})</h2>
              <button onClick={() => { setShowFeatureForm(true); setEditingFeature(null); setFeatureForm({ name: "", description: "", priority: "MEDIUM", status: "PLANNED" }); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-semibold hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /> Add Feature
              </button>
            </div>
            {loadingFeatures ? <div className="flex justify-center py-10"><LoaderCircle className="w-6 h-6 animate-spin text-[#A1A1AA]" /></div>
            : features.length === 0 ? (
              <div className="p-12 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl text-center">
                <Layers className="w-10 h-10 text-[#A1A1AA] mx-auto mb-3" />
                <h3 className="font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">No features yet</h3>
                <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Add features to define the scope of this project.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map(f => (
                  <div key={f.id} className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-sm text-[#171717] dark:text-[#F5F5F5]">{f.name}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setEditingFeature(f); setFeatureForm({ name: f.name, description: f.description || "", priority: f.priority, status: f.status }); setShowFeatureForm(true); }}
                          className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteFeature(f.id)} className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {f.description && <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] mb-3">{f.description}</p>}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_COLORS[f.status] || STATUS_COLORS.PLANNED}`}>{f.status}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F4F4F5] dark:bg-[#1D1D1D] text-[#52525B] dark:text-[#A1A1AA]">{f.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showFeatureForm && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <div className="w-full max-w-[480px] bg-white dark:bg-[#111111] rounded-2xl shadow-2xl border border-[#E5E7EB] dark:border-[#242424]">
                  <div className="p-5 border-b border-[#E5E7EB] dark:border-[#242424] flex items-center justify-between">
                    <h3 className="font-bold text-[#171717] dark:text-[#F5F5F5]">{editingFeature ? "Edit Feature" : "Add Feature"}</h3>
                    <button onClick={() => setShowFeatureForm(false)} className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-5 space-y-3">
                    <input type="text" placeholder="Feature name *" value={featureForm.name} onChange={e => setFeatureForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:border-[#D99A00]/50" />
                    <textarea placeholder="Description (optional)" value={featureForm.description} onChange={e => setFeatureForm(p => ({ ...p, description: e.target.value }))} rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:border-[#D99A00]/50 resize-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={featureForm.priority} onChange={e => setFeatureForm(p => ({ ...p, priority: e.target.value }))}
                        className="h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none">
                        {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(p => <option key={p}>{p}</option>)}
                      </select>
                      <select value={featureForm.status} onChange={e => setFeatureForm(p => ({ ...p, status: e.target.value }))}
                        className="h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none">
                        {["PLANNED", "IN_PROGRESS", "COMPLETED", "BLOCKED"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="p-5 border-t border-[#E5E7EB] dark:border-[#242424] flex gap-3">
                    <button onClick={() => setShowFeatureForm(false)} className="flex-1 h-10 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]">Cancel</button>
                    <button onClick={saveFeature} disabled={saving || !featureForm.name.trim()} className="flex-1 h-10 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REQUIREMENTS TAB */}
        {activeTab === "requirements" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">Requirements ({requirements.length})</h2>
              <button onClick={() => { setShowReqForm(true); setEditingReq(null); setReqForm({ title: "", description: "", category: "Functional", status: "PLANNED" }); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-semibold hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /> Add Requirement
              </button>
            </div>
            {loadingReqs ? <div className="flex justify-center py-10"><LoaderCircle className="w-6 h-6 animate-spin text-[#A1A1AA]" /></div>
            : requirements.length === 0 ? (
              <div className="p-12 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl text-center">
                <FileText className="w-10 h-10 text-[#A1A1AA] mx-auto mb-3" />
                <h3 className="font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">No requirements yet</h3>
                <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Add requirements to document what this project needs to deliver.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {requirements.map(r => (
                  <div key={r.id} className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-xl p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-[#171717] dark:text-[#F5F5F5] mb-1">{r.title}</h3>
                      {r.description && <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] mb-2">{r.description}</p>}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_COLORS[r.status] || STATUS_COLORS.PLANNED}`}>{r.status}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F4F4F5] dark:bg-[#1D1D1D] text-[#52525B] dark:text-[#A1A1AA]">{r.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditingReq(r); setReqForm({ title: r.title, description: r.description || "", category: r.category, status: r.status }); setShowReqForm(true); }}
                        className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteRequirement(r.id)} className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showReqForm && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <div className="w-full max-w-[480px] bg-white dark:bg-[#111111] rounded-2xl shadow-2xl border border-[#E5E7EB] dark:border-[#242424]">
                  <div className="p-5 border-b border-[#E5E7EB] dark:border-[#242424] flex items-center justify-between">
                    <h3 className="font-bold text-[#171717] dark:text-[#F5F5F5]">{editingReq ? "Edit Requirement" : "Add Requirement"}</h3>
                    <button onClick={() => setShowReqForm(false)} className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-5 space-y-3">
                    <input type="text" placeholder="Requirement title *" value={reqForm.title} onChange={e => setReqForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:border-[#D99A00]/50" />
                    <textarea placeholder="Description (optional)" value={reqForm.description} onChange={e => setReqForm(p => ({ ...p, description: e.target.value }))} rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none resize-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={reqForm.category} onChange={e => setReqForm(p => ({ ...p, category: e.target.value }))}
                        className="h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none">
                        {["Functional", "Non-functional", "Business Objective", "Constraint", "Risk", "Acceptance Criteria"].map(c => <option key={c}>{c}</option>)}
                      </select>
                      <select value={reqForm.status} onChange={e => setReqForm(p => ({ ...p, status: e.target.value }))}
                        className="h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none">
                        {["PLANNED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "VERIFIED", "REJECTED"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="p-5 border-t border-[#E5E7EB] dark:border-[#242424] flex gap-3">
                    <button onClick={() => setShowReqForm(false)} className="flex-1 h-10 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]">Cancel</button>
                    <button onClick={saveRequirement} disabled={saving || !reqForm.title.trim()} className="flex-1 h-10 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <div>
            <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider mb-4">All Tasks ({totalTasks})</h2>
            {project.tasks?.length === 0 ? (
              <div className="p-12 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl text-center">
                <ListTodo className="w-10 h-10 text-[#A1A1AA] mx-auto mb-3" />
                <h3 className="font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">No tasks yet</h3>
                <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Create tasks from the Tasks page or use AI to generate a task plan.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {project.tasks?.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 p-4 bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-xl hover:shadow-sm transition-shadow">
                    <button onClick={() => handleToggleTask(t)}>
                      {t.status === "COMPLETED" || t.status === "Completed"
                        ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        : <Circle className="w-5 h-5 text-[#E5E7EB] dark:text-[#242424] shrink-0" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${(t.status === "COMPLETED" || t.status === "Completed") ? "line-through text-[#A1A1AA]" : "text-[#171717] dark:text-[#F5F5F5]"}`}>{t.title}</span>
                      {t.description && <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] mt-0.5 truncate">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.priority === "High" && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/20 text-red-500">HIGH</span>}
                      {t.estimatedMinutes && <span className="text-xs text-[#A1A1AA]">{t.estimatedMinutes}m</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
