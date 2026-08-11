"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Network, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import apiClient from "@/lib/api-client";
import Link from "next/link";

function OrgNode({ label, role, children }: { label: string; role: string; children?: any[] }) {
  const roleColor = role === "CEO" ? "bg-gold text-[#111827]"
    : role === "CO-CEO" ? "bg-purple-500 text-white"
    : "bg-emerald-500 text-white";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`px-4 py-2 rounded-xl ${roleColor} text-[11px] font-bold shadow-sm text-center min-w-[100px]`}>
        <div className="font-bold">{label}</div>
        <div className="opacity-80 text-[9px] uppercase tracking-wider">{role}</div>
      </div>
      {children && children.length > 0 && (
        <div className="w-px h-4 bg-border" />
      )}
      {children && children.length > 0 && (
        <div className="flex items-start gap-6">
          {children.map((child, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="w-px h-4 bg-border" />
              <OrgNode label={child.label} role={child.role} children={child.children} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoCeoOrgGraphPage() {
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchGraph = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const wsId = localStorage.getItem("workspaceId");
      const res = await apiClient.get(`/org/graph?workspaceId=${wsId}`);
      if (res.data?.success) setGraphData(res.data.data);
      else setError(res.data?.error || "Failed to load organization graph");
    } catch (err: any) {
      // Build from members list if graph endpoint doesn't exist
      try {
        const wsId = localStorage.getItem("workspaceId");
        const mRes = await apiClient.get(`/org/members?workspaceId=${wsId}`);
        if (mRes.data?.success) {
          setGraphData({ members: mRes.data.data || [] });
        } else {
          setError("Organization graph data unavailable");
        }
      } catch {
        setError("Could not load organization structure");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const members = graphData?.members || graphData?.nodes || [];
  const ceo = members.find((m: any) => (m.role || "").toUpperCase() === "CEO");
  const coCeos = members.filter((m: any) => {
    const r = (m.role || m.workspaceRole || "").toUpperCase();
    return r === "CO-CEO" || r === "COCEO";
  });
  const mems = members.filter((m: any) => {
    const r = (m.role || m.workspaceRole || "").toUpperCase();
    return r === "MEMBER";
  });

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/co-ceo/dashboard" className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            CO-CEO · Organization
          </p>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none flex items-center gap-2">
            <Network className="w-5 h-5 text-gold" /> Organization Graph
          </h1>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-[12px] text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-gold" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Network className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-[14px] font-semibold text-foreground">No organization data</p>
          <p className="text-[12px] text-muted-foreground">The organization structure will appear here as members join.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 overflow-auto">
          <div className="flex flex-col items-center gap-6 min-w-max mx-auto">
            {/* CEO */}
            {ceo ? (
              <div className="bg-gold text-[#111827] px-5 py-2.5 rounded-xl text-[12px] font-bold shadow-sm text-center">
                <div>{ceo.name || ceo.displayName || "CEO"}</div>
                <div className="text-[9px] uppercase tracking-wider opacity-70">CEO</div>
              </div>
            ) : (
              <div className="bg-gold text-[#111827] px-5 py-2.5 rounded-xl text-[12px] font-bold shadow-sm">
                CEO
              </div>
            )}

            {(coCeos.length > 0 || mems.length > 0) && <div className="w-px h-6 bg-border" />}

            {/* CO-CEOs + Members */}
            {coCeos.length > 0 && (
              <div className="flex items-start gap-12">
                {coCeos.map((cc: any, idx: number) => (
                  <div key={cc.id || idx} className="flex flex-col items-center gap-3">
                    <div className="bg-purple-500 text-white px-4 py-2 rounded-xl text-[11px] font-bold shadow-sm text-center min-w-[100px]">
                      <div>{cc.name || cc.displayName || "CO-CEO"}</div>
                      <div className="text-[9px] uppercase tracking-wider opacity-70">CO-CEO</div>
                    </div>
                    {mems.length > 0 && (
                      <>
                        <div className="w-px h-4 bg-border" />
                        <div className="flex gap-4">
                          {mems.map((m: any, mi: number) => (
                            <div key={m.id || mi} className="flex flex-col items-center gap-2">
                              <div className="w-px h-3 bg-border" />
                              <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm text-center min-w-[80px]">
                                <div>{m.name || m.displayName || "Member"}</div>
                                <div className="text-[8px] uppercase tracking-wider opacity-70">Member</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-border w-full justify-center">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="w-3 h-3 rounded bg-gold" /> CEO
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="w-3 h-3 rounded bg-purple-500" /> CO-CEO
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="w-3 h-3 rounded bg-emerald-500" /> Member
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
