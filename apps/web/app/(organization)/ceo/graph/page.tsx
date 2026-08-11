"use client";

import { useState, useEffect } from "react";
import {
  Network, Search, Loader2, AlertCircle, User, Users, Shield, Briefcase, ChevronRight, ZoomIn, ZoomOut, RotateCcw
} from "lucide-react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { PersonDetailDrawer } from "@/components/organization/person-detail-drawer";

export default function CEOOrganizationGraphPage() {
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const fetchGraph = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/organization/graph?workspaceId=${workspaceId}`);
      if (res.data.success) {
        setGraphData(res.data.data);
      } else {
        setError(res.data.error || "Failed to load organization graph");
      }
    } catch {
      setError("Unable to load organization hierarchy structure");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { ceoNode, coCeoNodes = [], memberNodes = [], summary = {} } = graphData || {};

  // Filter CO-CEOs and Members
  const filteredCoCeos = coCeoNodes.filter((c: any) => {
    const q = search.toLowerCase();
    const matchQ = (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    const matchRole = roleFilter === "All" || roleFilter === "CO-CEOs";
    return matchQ && matchRole;
  });

  const filteredMembers = memberNodes.filter((m: any) => {
    const q = search.toLowerCase();
    const matchQ = (m.name || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q);
    const matchRole = roleFilter === "All" || roleFilter === "Members";
    return matchQ && matchRole;
  });

  return (
    <div className="p-4 lg:p-6 max-w-[1280px] mx-auto w-full space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <Network className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Organization Graph</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visual organization structure, leadership tree, and reporting relationships
          </p>
        </div>

        {/* Graph Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-card border border-border rounded-xl">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.1, 1.4))}
            className="p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.1, 0.7))}
            className="p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Executive Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { label: "CEO", value: summary.totalCeos || 1, color: "text-amber-500" },
          { label: "CO-CEOs", value: summary.totalCoCeos || 0, color: "text-purple-500" },
          { label: "Members", value: summary.totalMembers || 0, color: "text-blue-500" },
          { label: "Active", value: summary.totalActive || 1, color: "text-emerald-500" },
          { label: "At Risk", value: summary.totalAtRisk || 0, color: summary.totalAtRisk > 0 ? "text-rose-500" : "text-emerald-500" },
        ].map((s) => (
          <PremiumCard key={s.label} className="p-2.5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </PremiumCard>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search organization by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {["All", "CEO", "CO-CEOs", "Members"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                roleFilter === r
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Main Interactive Graph Canvas */}
      <motion.div
        animate={{ scale: zoomLevel }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="p-6 border border-border rounded-2xl bg-card/50 space-y-10 min-h-[500px] overflow-x-auto"
      >
        {/* LEVEL 1: CEO ROOT NODE */}
        {(roleFilter === "All" || roleFilter === "CEO") && ceoNode && (
          <div className="flex flex-col items-center">
            <PremiumCard
              onClick={() => setSelectedPerson(ceoNode)}
              className="p-4 w-72 border-amber-500/40 hover:border-amber-500 transition-all cursor-pointer text-center space-y-2 bg-amber-500/5 shadow-lg"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-500 text-amber-500 font-bold text-base flex items-center justify-center mx-auto">
                {ceoNode.name ? ceoNode.name.charAt(0).toUpperCase() : "C"}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{ceoNode.name}</p>
                <p className="text-xs text-amber-500 font-semibold">{ceoNode.email}</p>
              </div>
              <span className="inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Chief Executive Officer
              </span>
            </PremiumCard>
            <div className="w-0.5 h-8 bg-amber-500/40 my-1" />
          </div>
        )}

        {/* LEVEL 2: CO-CEOs */}
        {(roleFilter === "All" || roleFilter === "CO-CEOs") && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md">
                CO-CEO Leadership Level ({filteredCoCeos.length})
              </span>
            </div>

            {filteredCoCeos.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No CO-CEOs currently assigned in structure.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
                {filteredCoCeos.map((coCeo: any) => {
                  const myMembers = filteredMembers.filter((m: any) => m.managerId === coCeo.id);

                  return (
                    <div key={coCeo.id} className="flex flex-col items-center space-y-4">
                      {/* CO-CEO Node Card */}
                      <PremiumCard
                        onClick={() => setSelectedPerson(coCeo)}
                        className="p-3.5 w-full border-purple-500/30 hover:border-purple-500 transition-all cursor-pointer space-y-2 bg-purple-500/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold text-xs flex items-center justify-center shrink-0">
                            {coCeo.name ? coCeo.name.charAt(0).toUpperCase() : "C"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{coCeo.name}</p>
                            <p className="text-[10px] text-purple-400 font-medium truncate">{coCeo.email}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center p-2 bg-background/80 border border-border rounded-lg text-[10px]">
                          <div>
                            <span className="text-muted-foreground block">Members</span>
                            <span className="font-bold text-purple-400">{coCeo.membersCount || myMembers.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Tasks</span>
                            <span className="font-bold text-blue-400">{coCeo.tasksCount || 0}</span>
                          </div>
                        </div>
                      </PremiumCard>

                      {/* LEVEL 3: MEMBERS UNDER THIS CO-CEO */}
                      {myMembers.length > 0 && (
                        <div className="w-full space-y-2.5 pt-2 border-t-2 border-purple-500/20">
                          <span className="text-[9px] font-extrabold uppercase text-muted-foreground block text-center">
                            Assigned Members ({myMembers.length})
                          </span>
                          <div className="space-y-2">
                            {myMembers.map((m: any) => (
                              <div
                                key={m.id}
                                onClick={() => setSelectedPerson(m)}
                                className="p-2 bg-card border border-border hover:border-blue-500/50 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {m.name ? m.name.charAt(0).toUpperCase() : "M"}
                                  </div>
                                  <span className="font-bold text-foreground truncate">{m.name}</span>
                                </div>
                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Slide-over Profile Drawer */}
      <PersonDetailDrawer person={selectedPerson} onClose={() => setSelectedPerson(null)} />
    </div>
  );
}
