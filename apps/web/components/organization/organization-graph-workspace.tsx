"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Users, UserPlus, RefreshCw, Maximize2, AlertCircle, Plus, Search,
  ZoomIn, ZoomOut, RotateCcw, X, Shield, ChevronDown, Loader2, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import { useAuth } from "@/components/auth/auth-context";
import { DesktopInviteModal } from "./desktop-invite-modal";
import { MobileInviteSheet } from "./mobile-invite-sheet";
import { PersonDetailDrawer } from "./person-detail-drawer";
import { OrganizationGraphData, GraphMemberNode } from "./organization-graph-preview-data";

interface OrganizationGraphWorkspaceProps {
  userRole?: "CEO" | "CO-CEO" | "MEMBER";
}

function getInitials(name?: string, email?: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (email && email.trim().length > 0) {
    return email[0].toUpperCase();
  }
  return "H";
}

export function OrganizationGraphWorkspace({ userRole = "CEO" }: OrganizationGraphWorkspaceProps) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [graphData, setGraphData] = useState<OrganizationGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Canvas pan & zoom state
  const [zoom, setZoom] = useState(0.95);
  const [pan, setPan] = useState({ x: 0, y: 10 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Search & Node inspection drawer
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphMemberNode | null>(null);

  // Invite Modal / Sheet trigger state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [coCeosList, setCoCeosList] = useState<any[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchGraph = useCallback(async () => {
    try {
      let workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
        const wsRes = await apiClient.get("/workspaces/current").catch(() => null);
        if (wsRes?.data?.data?.id) {
          workspaceId = String(wsRes.data.data.id);
          localStorage.setItem("workspaceId", workspaceId);
        } else {
          const allWsRes = await apiClient.get("/workspaces").catch(() => null);
          const firstWs = allWsRes?.data?.data?.[0]?.id || allWsRes?.data?.[0]?.id;
          if (firstWs) {
            workspaceId = String(firstWs);
            localStorage.setItem("workspaceId", workspaceId);
          }
        }
      }

      if (!workspaceId) {
        setGraphData(null);
        setLoading(false);
        return;
      }

      const [treeRes, membersRes, coCeosRes] = await Promise.all([
        apiClient.get(`/org/reports/tree?workspaceId=${workspaceId}`, { timeout: 8000 }).catch(() => null),
        apiClient.get(`/organization/members?workspaceId=${workspaceId}`).catch(() => null),
        apiClient.get(`/organization/co-ceos?workspaceId=${workspaceId}`).catch(() => null),
      ]);

      const activeCoCeos = coCeosRes?.data?.data || [];
      setCoCeosList(activeCoCeos);

      if (treeRes?.data?.success && treeRes.data.data && (treeRes.data.data.coCeoNodes?.length > 0 || treeRes.data.data.memberNodes?.length > 0)) {
        setGraphData(treeRes.data.data);
        setError("");
      } else {
        const members = membersRes?.data?.data || [];

        if (members.length > 0 || activeCoCeos.length > 0) {
          const ceoMember = members.find((m: any) => m.role === "CEO" || m.role === "SYSTEM_OWNER");
          const ceoNode: GraphMemberNode = {
            id: ceoMember?.id || "ceo-hemanth",
            name: ceoMember?.name || ceoMember?.displayName || "HEMANTH",
            email: ceoMember?.email || "hemanth@manmadhan.org",
            role: "CEO",
            department: "Executive Leadership",
            status: "Active",
            projectsCount: 0,
            tasksCount: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            overdueTasks: 0,
            onTimeRate: 100,
            approvalRate: 100,
            recentWork: [],
          };

          const coCeoNodes: GraphMemberNode[] = activeCoCeos.map((m: any) => ({
            id: m.id || m.userId,
            name: m.name || m.displayName || m.user?.name || "CO-CEO",
            email: m.email || m.user?.email || "",
            role: "CO-CEO",
            status: m.status || "Active",
            projectsCount: m.projectsCount || 0,
            tasksCount: m.tasksCount || 0,
            completedTasks: m.completedTasks || 0,
            inProgressTasks: m.inProgressTasks || 0,
            overdueTasks: m.overdueTasks || 0,
            onTimeRate: m.onTimeRate || 100,
            approvalRate: m.approvalRate || 100,
            recentWork: [],
          }));

          const memberNodes: GraphMemberNode[] = members
            .filter((m: any) => (m.role || "").toUpperCase() === "MEMBER")
            .map((m: any) => ({
              id: m.id || m.userId,
              name: m.name || m.displayName || m.user?.name || "Member",
              email: m.email || m.user?.email || "",
              role: "MEMBER",
              status: m.status || "Active",
              managerId: m.managerId || m.assignedCoCeoId,
              supervisor: m.managerName || m.supervisor,
              projectsCount: m.projectsCount || 0,
              tasksCount: m.tasksCount || 0,
              completedTasks: m.completedTasks || 0,
              inProgressTasks: m.inProgressTasks || 0,
              overdueTasks: m.overdueTasks || 0,
              onTimeRate: m.onTimeRate || 100,
              approvalRate: m.approvalRate || 100,
              recentWork: [],
            }));

          setGraphData({
            id: "org-live",
            name: "Organization",
            preview: false,
            ceoNode,
            coCeoNodes,
            memberNodes,
          });
        } else {
          setGraphData(null);
        }
        setError("");
      }
    } catch {
      setGraphData(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useRegisterRefresh(fetchGraph);

  useEffect(() => {
    if (!socket) return;
    socket.on("member.invited", fetchGraph);
    socket.on("member.removed", fetchGraph);
    socket.on("member.updated", fetchGraph);
    return () => {
      socket.off("member.invited", fetchGraph);
      socket.off("member.removed", fetchGraph);
      socket.off("member.updated", fetchGraph);
    };
  }, [socket, fetchGraph]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchGraph();
  };

  const handleResetGraph = () => {
    setZoom(0.95);
    setPan({ x: 0, y: 10 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".graph-node") || (e.target as HTMLElement).closest(".graph-control")) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const filterMatch = (node: GraphMemberNode) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return node.name.toLowerCase().includes(q) || node.email.toLowerCase().includes(q);
  };

  // Group members under their assigned CO-CEO
  const { assignedMembersMap, unassignedMembers } = useMemo(() => {
    const map = new Map<string, GraphMemberNode[]>();
    const unassigned: GraphMemberNode[] = [];

    if (graphData?.memberNodes) {
      graphData.memberNodes.forEach((m) => {
        const mgrId = m.managerId;
        if (mgrId) {
          if (!map.has(mgrId)) map.set(mgrId, []);
          map.get(mgrId)!.push(m);
        } else {
          // Check if supervisor string matches a CO-CEO name
          const matchedCoCeo = graphData.coCeoNodes?.find((c) => m.supervisor && m.supervisor.includes(c.name));
          if (matchedCoCeo) {
            if (!map.has(matchedCoCeo.id)) map.set(matchedCoCeo.id, []);
            map.get(matchedCoCeo.id)!.push(m);
          } else {
            unassigned.push(m);
          }
        }
      });
    }

    return { assignedMembersMap: map, unassignedMembers: unassigned };
  }, [graphData]);

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden bg-[#F9FAFB] dark:bg-[#060806] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none p-4 sm:p-5 md:px-8 md:py-4 pb-3 md:pb-4 max-w-[1600px] mx-auto space-y-3 box-border">

      {/* 1. HEADER ROW */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#E5E7EB] dark:border-[#272D36] shrink-0">
        <div className="space-y-0.5 min-w-0">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none truncate">
            Organization Graph
          </h1>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] truncate">
            {userRole === "CEO"
              ? "Reporting hierarchy: CEO → CO-CEO → Members."
              : userRole === "CO-CEO"
                ? "Your team reporting tree: CO-CEO → Assigned Members."
                : "Your management chain: CO-CEO → Me."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {userRole === "CEO" && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="h-[44px] px-3.5 rounded-[12px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[13px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Invite</span>
            </button>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-[44px] sm:w-auto h-[44px] px-0 sm:px-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[12.5px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors shrink-0 shadow-xs"
            title="Refresh graph"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : "text-[#667085] dark:text-[#8B95A5]"}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. GRAPH INTERACTIVE CANVAS */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex-1 min-h-0 w-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[20px] relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xs"
      >
        {/* Floating Zoom & Control Toolbar */}
        <div className="graph-control absolute right-3 bottom-3 md:right-4 md:bottom-4 z-20 flex items-center gap-1 p-1 rounded-[12px] bg-[#FFFFFF]/90 dark:bg-[#15191F]/90 border border-[#E5E7EB] dark:border-[#272D36] backdrop-blur-md shadow-lg">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.1, 1.6))}
            className="p-2 rounded-[8px] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#07090D] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
            className="p-2 rounded-[8px] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#07090D] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-[#E5E7EB] dark:bg-[#272D36] mx-0.5" />
          <button
            onClick={handleResetGraph}
            className="p-2 rounded-[8px] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#07090D] transition-colors cursor-pointer"
            title="Reset Position & Fit"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3 p-8">
            <Loader2 className="w-7 h-7 animate-spin text-[#B28D18] dark:text-[#C9A52A]" />
            <span className="text-[13px] font-medium text-[#667085] dark:text-[#8B95A5]">Loading organization graph...</span>
          </div>
        ) : !graphData ? (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 max-w-sm">
            <div className="w-11 h-11 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 flex items-center justify-center text-[#B28D18] dark:text-[#C9A52A]">
              <Users className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No graph data available</h3>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                Add team members to your organization to visualize the reporting tree.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="transition-transform duration-75 origin-center flex flex-col items-center justify-start p-8 min-w-[600px] min-h-[400px]"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* 1. LEVEL 0: CEO NODE (CEO View Only) */}
            {userRole === "CEO" && graphData.ceoNode && (
              <div className="flex flex-col items-center">
                <div
                  onClick={() => setSelectedNode(graphData.ceoNode)}
                  className={`graph-node w-[240px] sm:w-[260px] p-3.5 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border ${filterMatch(graphData.ceoNode)
                      ? "border-[#B28D18] dark:border-[#C9A52A] shadow-lg"
                      : "border-[#E5E7EB] dark:border-[#272D36] opacity-35"
                    } cursor-pointer hover:scale-[1.02] transition-all text-center relative space-y-2`}
                >
                  <div className="w-9 h-9 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/30 dark:border-[#C9A52A]/30 flex items-center justify-center text-[12px] font-bold text-[#B28D18] dark:text-[#C9A52A] mx-auto">
                    {getInitials(graphData.ceoNode.name, graphData.ceoNode.email)}
                  </div>

                  <div>
                    <h3 className="font-bold text-[14px] text-[#17202A] dark:text-[#F2F4F7] truncate">
                      {graphData.ceoNode.name}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B28D18] dark:text-[#C9A52A]">
                      {graphData.ceoNode.role}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{graphData.ceoNode.status}</span>
                    </div>
                    <span className="text-[#667085] dark:text-[#8B95A5] font-mono">{graphData.ceoNode.tasksCount} Active Tasks</span>
                  </div>
                </div>

                {/* Vertical Connector Line to CO-CEOs */}
                {(graphData.coCeoNodes?.length > 0 || unassignedMembers.length > 0) && (
                  <div className="w-[1.5px] h-8 bg-[#E5E7EB] dark:bg-[#272D36] my-1" />
                )}
              </div>
            )}

            {/* 2. LEVEL 1: CO-CEO NODES & THEIR ASSIGNED MEMBERS */}
            {graphData.coCeoNodes?.length > 0 && (
              <div className="flex items-start gap-8 sm:gap-12 relative flex-wrap justify-center">
                {graphData.coCeoNodes
                  .filter((c) => userRole !== "CO-CEO" || c.id === user?.id || c.email === user?.email)
                  .map((coCeo) => {
                    const assigned = assignedMembersMap.get(coCeo.id) || [];
                    return (
                      <div key={coCeo.id} className="flex flex-col items-center">
                        <div
                          onClick={() => setSelectedNode(coCeo)}
                          className={`graph-node w-[210px] sm:w-[230px] p-3 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border ${filterMatch(coCeo)
                              ? "border-[#E5E7EB] dark:border-[#272D36] hover:border-[#B28D18] dark:hover:border-[#C9A52A]"
                              : "border-[#E5E7EB] dark:border-[#272D36] opacity-35"
                            } cursor-pointer hover:scale-[1.02] transition-all text-center space-y-1.5 shadow-xs`}
                        >
                          <div className="w-8 h-8 rounded-full bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-center text-[10.5px] font-bold text-[#B28D18] dark:text-[#C9A52A] mx-auto">
                            {getInitials(coCeo.name, coCeo.email)}
                          </div>

                          <div>
                            <h4 className="font-bold text-[13px] text-[#17202A] dark:text-[#F2F4F7] truncate">
                              {coCeo.name}
                            </h4>
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#B28D18] dark:text-[#C9A52A]">
                              {coCeo.role}
                            </span>
                          </div>

                          <div className="pt-1.5 border-t border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between text-[10.5px]">
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{coCeo.status}</span>
                            </div>
                            <span className="text-[#667085] dark:text-[#8B95A5] font-mono">{assigned.length} Members</span>
                          </div>
                        </div>

                        {/* Line to Assigned Members */}
                        {assigned.length > 0 && (
                          <>
                            <div className="w-[1.5px] h-6 bg-[#E5E7EB] dark:bg-[#272D36] my-1" />
                            <div className="flex flex-col items-center gap-2">
                              {assigned.map((member: GraphMemberNode) => (
                                <div
                                  key={member.id}
                                  onClick={() => setSelectedNode(member)}
                                  className={`graph-node w-[170px] sm:w-[190px] p-2.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border ${filterMatch(member)
                                      ? "border-[#E5E7EB] dark:border-[#272D36] hover:border-[#B28D18] dark:hover:border-[#C9A52A]"
                                      : "border-[#E5E7EB] dark:border-[#272D36] opacity-35"
                                    } cursor-pointer hover:scale-[1.02] transition-all space-y-1 shadow-xs`}
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] truncate max-w-[110px]">
                                      {member.name}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-500">Member</span>
                                  </div>
                                  <p className="text-[10px] text-[#667085] dark:text-[#8B95A5] truncate">{member.email}</p>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* UNASSIGNED MEMBERS WARNING SECTION */}
            {unassignedMembers.length > 0 && (
              <div className="mt-8 pt-4 border-t border-dashed border-[#E5E7EB] dark:border-[#272D36] flex flex-col items-center space-y-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10.5px] font-bold inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Unassigned Members — CO-CEO Assignment Required</span>
                </span>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {unassignedMembers.map((member: GraphMemberNode) => (
                    <div
                      key={member.id}
                      onClick={() => setSelectedNode(member)}
                      className="p-2 px-3 rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-amber-500/30 text-[11px] font-semibold text-[#17202A] dark:text-[#F2F4F7] cursor-pointer hover:border-amber-500"
                    >
                      {member.name} ({member.email})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NODE DETAILS DRAWER */}
      {selectedNode && (
        <PersonDetailDrawer
          person={{
            id: selectedNode.id,
            name: selectedNode.name,
            email: selectedNode.email,
            role: selectedNode.role,
            status: selectedNode.status,
            supervisor: selectedNode.supervisor || (selectedNode.role === "CO-CEO" ? "CEO / Organization Head" : "CO-CEO Supervisor"),
          }}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* INVITE MODAL (DESKTOP) & SHEET (MOBILE) */}
      <DesktopInviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={fetchGraph}
        coCeos={coCeosList}
      />
      <MobileInviteSheet
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={fetchGraph}
        coCeos={coCeosList}
      />
    </div>
  );
}
