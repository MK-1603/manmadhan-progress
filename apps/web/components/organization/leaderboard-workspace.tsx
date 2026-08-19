"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Trophy, Loader2, AlertCircle, RefreshCw, ChevronRight, CheckCircle2,
  Clock, Shield, User, X, ExternalLink, Activity, ArrowUpRight, ArrowDownRight,
  Info, Sparkles, Award, Star, ChevronDown, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import { PersonDetailDrawer } from "./person-detail-drawer";
import Link from "next/link";
import { NumericValue } from "../ui/numeric-value";

type PeriodFilter = "today" | "7d" | "30d" | "90d";
type RoleFilter = "ALL" | "CO-CEO" | "MEMBER";

interface LeaderboardWorkspaceProps {
  userRole?: "CEO" | "CO-CEO" | "MEMBER";
}

function getInitials(name?: string, email?: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

export function LeaderboardWorkspace({ userRole = "CEO" }: LeaderboardWorkspaceProps) {
  const { socket } = useSocket();

  const [rawRankings, setRawRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showMethodology, setShowMethodology] = useState(false);

  // Mobile Filter Popover State
  const [mobileRoleMenuOpen, setMobileRoleMenuOpen] = useState(false);
  const [mobilePeriodMenuOpen, setMobilePeriodMenuOpen] = useState(false);

  const [period, setPeriod] = useState<PeriodFilter>("7d");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  // Selected Person Drawer/Sheet State
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

  // Map frontend period to API backend parameter
  const apiPeriod = useMemo(() => {
    if (period === "today") return "today";
    if (period === "7d") return "weekly";
    if (period === "30d") return "monthly";
    return "alltime";
  }, [period]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (!workspaceId) {
        setRawRankings([]);
        setLoading(false);
        return;
      }

      const res = await apiClient.get(
        `/org/reports/leaderboard?workspaceId=${workspaceId}&period=${apiPeriod}&role=${roleFilter}`,
        { timeout: 10000 }
      );

      if (res.data?.success) {
        const rawList = res.data.data?.leaderboard || res.data.data?.rankings || res.data.data || [];
        const cleanRankings = rawList
          .filter((item: any) => item && item.role && item.role.toUpperCase() !== "CEO")
          .map((item: any, idx: number) => ({
            ...item,
            rank: item.rank || idx + 1,
            score: Math.round(item.score ?? item.performanceScore ?? 0),
            onTimeRate: Math.round(item.onTimeRate ?? item.onTimePercent ?? 0),
            qualityScore: Math.round(item.qualityScore ?? 0),
            approvedTasks: item.approvedTasks ?? item.tasksCompleted ?? 0,
            submittedTasks: item.submittedTasks ?? item.tasksCompleted ?? 0,
            consistencyScore: Math.round(item.consistencyScore ?? 0),
            completionRate: Math.round(item.completionRate ?? 0),
          }));

        setRawRankings(cleanRankings);
        setError("");
      } else {
        setRawRankings([]);
      }
    } catch (err: any) {
      setRawRankings([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [apiPeriod, roleFilter]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchLeaderboard();
  };

  useRegisterRefresh(fetchLeaderboard);

  useEffect(() => {
    if (!socket) return;
    socket.on("leaderboard.updated", fetchLeaderboard);
    socket.on("task.approved", fetchLeaderboard);
    return () => {
      socket.off("leaderboard.updated", fetchLeaderboard);
      socket.off("task.approved", fetchLeaderboard);
    };
  }, [socket, fetchLeaderboard]);

  // Active Real Rankings List
  const rankings = useMemo(() => {
    if (roleFilter === "ALL") return rawRankings;
    return rawRankings.filter((item) => (item.role || "").toUpperCase() === roleFilter);
  }, [rawRankings, roleFilter]);

  // Compute Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (rankings.length === 0) {
      return { avgScore: "—", avgOnTime: "—", totalApproved: "—" };
    }
    const totalScore = rankings.reduce((acc, r) => acc + (r.score || 0), 0);
    const totalOnTime = rankings.reduce((acc, r) => acc + (r.onTimeRate || 0), 0);
    const totalApproved = rankings.reduce((acc, r) => acc + (r.approvedTasks || 0), 0);

    return {
      avgScore: `${Math.round(totalScore / rankings.length)}`,
      avgOnTime: `${Math.round(totalOnTime / rankings.length)}%`,
      totalApproved: `${totalApproved}`,
    };
  }, [rankings]);

  // Top 3 Performers
  const topPerformers = useMemo(() => {
    return rankings.slice(0, 3);
  }, [rankings]);

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden bg-[#F9FAFB] dark:bg-[#060806] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none p-2 sm:p-5 md:px-8 md:py-4 pb-1 md:pb-4 max-w-[1600px] mx-auto space-y-2 md:space-y-3 box-border">
      
      {/* 1. COMPACT PAGE HEADER */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#E5E7EB] dark:border-[#272D36] shrink-0">
        <div className="space-y-0.5 min-w-0">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none truncate">
            Leaderboard
          </h1>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] hidden sm:block truncate">
            Verified execution performance based on approved work, quality, timeliness, and consistency.
          </p>
          <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] sm:hidden truncate">
            Execution ranking & approved work performance.
          </p>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          aria-label="Refresh leaderboard"
          className="h-[36px] px-2.5 sm:px-3 rounded-[9px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors shrink-0 shadow-xs"
          title="Refresh leaderboard data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : "text-[#667085] dark:text-[#8B95A5]"}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12px] font-medium flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchLeaderboard} className="font-semibold underline cursor-pointer shrink-0 ml-2">
            Try again
          </button>
        </div>
      )}

      {/* 2. RESPONSIVE CONTROL TOOLBAR */}
      
      {/* MOBILE CONTROL TOOLBAR: TWO COMPACT DROPDOWN BUTTONS SIDE-BY-SIDE (NO HORIZONTAL SCROLL) */}
      <div className="md:hidden flex items-center gap-2.5 w-full shrink-0">
        {/* Role Dropdown Button */}
        <div className="relative flex-1">
          <button
            onClick={() => {
              setMobileRoleMenuOpen(!mobileRoleMenuOpen);
              setMobilePeriodMenuOpen(false);
            }}
            className="w-full h-[40px] px-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center justify-between shadow-xs cursor-pointer active:scale-[0.98] transition-transform"
          >
            <span className="truncate">
              {roleFilter === "ALL" ? "All People" : roleFilter === "CO-CEO" ? "CO-CEOs" : "Members"}
            </span>
            <ChevronDown className={`w-4 h-4 text-[#667085] dark:text-[#8B95A5] shrink-0 transition-transform ${mobileRoleMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Role Popover */}
          <AnimatePresence>
            {mobileRoleMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobileRoleMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute left-0 top-[46px] w-full z-50 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[14px] shadow-xl p-1 space-y-0.5 text-[13px]"
                >
                  {[
                    { id: "ALL", label: "All People" },
                    { id: "CO-CEO", label: "CO-CEOs" },
                    { id: "MEMBER", label: "Members" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setRoleFilter(opt.id as RoleFilter);
                        setMobileRoleMenuOpen(false);
                      }}
                      className={`w-full h-[38px] px-3 rounded-[9px] font-bold flex items-center justify-between cursor-pointer ${
                        roleFilter === opt.id
                          ? "bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A]"
                          : "text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F8F9FA] dark:hover:bg-[#07090D]"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {roleFilter === opt.id && <Check className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Time Period Dropdown Button */}
        <div className="relative flex-1">
          <button
            onClick={() => {
              setMobilePeriodMenuOpen(!mobilePeriodMenuOpen);
              setMobileRoleMenuOpen(false);
            }}
            className="w-full h-[40px] px-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center justify-between shadow-xs cursor-pointer active:scale-[0.98] transition-transform"
          >
            <span className="uppercase">
              {period === "today" ? "Today" : period === "7d" ? "7D" : period === "30d" ? "30D" : "90D"}
            </span>
            <ChevronDown className={`w-4 h-4 text-[#667085] dark:text-[#8B95A5] shrink-0 transition-transform ${mobilePeriodMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Period Popover */}
          <AnimatePresence>
            {mobilePeriodMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobilePeriodMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute right-0 top-[46px] w-full z-50 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[14px] shadow-xl p-1 space-y-0.5 text-[13px]"
                >
                  {[
                    { id: "today", label: "Today" },
                    { id: "7d", label: "7 Days" },
                    { id: "30d", label: "30 Days" },
                    { id: "90d", label: "90 Days" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setPeriod(opt.id as PeriodFilter);
                        setMobilePeriodMenuOpen(false);
                      }}
                      className={`w-full h-[38px] px-3 rounded-[9px] font-bold flex items-center justify-between cursor-pointer ${
                        period === opt.id
                          ? "bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A]"
                          : "text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F8F9FA] dark:hover:bg-[#07090D]"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {period === opt.id && <Check className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* DESKTOP CONTROL TOOLBAR: FULL SEGMENTED CONTROL BAR */}
      <div className="hidden md:flex bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[14px] px-4 py-2 shadow-xs items-center justify-between gap-3 shrink-0">
        
        {/* Role Filters */}
        <div className="flex items-center gap-1 shrink-0">
          {(["ALL", "CO-CEO", "MEMBER"] as RoleFilter[]).map((rf) => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`h-[36px] px-3 text-[12px] font-bold rounded-[8px] transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center ${
                roleFilter === rf
                  ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] shadow-xs"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              {rf === "ALL" ? "All People" : rf === "CO-CEO" ? "CO-CEOs" : "Members"}
            </button>
          ))}
        </div>

        {/* Subtle Vertical Divider */}
        <div className="w-[1px] h-5 bg-[#E5E7EB] dark:bg-[#272D36] shrink-0 mx-0.5" />

        {/* Time Period Filter Tabs */}
        <div className="flex items-center gap-1 shrink-0">
          {(["today", "7d", "30d", "90d"] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`h-[36px] px-3 text-[11.5px] font-bold rounded-[8px] transition-colors uppercase whitespace-nowrap cursor-pointer flex items-center justify-center ${
                period === p
                  ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] shadow-xs"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAIN LEADERBOARD SURFACE */}
      <div className="flex-1 min-h-0 w-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden flex flex-col justify-between shadow-xs">
        
        {loading ? (
          /* SKELETON LOADING STATE */
          <div className="p-4 space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-[#F3F4F6] dark:bg-[#07090D] rounded-xl animate-pulse flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-[#E5E7EB] dark:bg-[#15191F]" />
                  <div className="w-32 h-4 rounded bg-[#E5E7EB] dark:bg-[#15191F]" />
                </div>
                <div className="w-12 h-6 rounded bg-[#E5E7EB] dark:bg-[#15191F]" />
              </div>
            ))}
          </div>
        ) : rankings.length === 0 ? (
          /* CENTERED EMPTY STATE WHEN REAL BACKEND DATA IS EMPTY */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10 space-y-3">
            <div className="w-11 h-11 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 flex items-center justify-center text-[#B28D18] dark:text-[#C9A52A] mx-auto">
              <Activity className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-[17px] sm:text-[18px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No performance data yet</h3>
              <p className="text-[14px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                Rankings will appear after team members complete work that has been reviewed and approved.
              </p>
            </div>
            {userRole === "CEO" && (
              <Link
                href="/ceo/people"
                className="h-[38px] px-4 rounded-[10px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[12.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform shadow-xs mt-2"
              >
                <span>View People →</span>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP ENTERPRISE RANKING TABLE WITH TOP PERFORMERS */}
            <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">
              
              {/* DESKTOP TOP PERFORMERS CARDS */}
              {topPerformers.length > 0 && (
                <div className="p-4 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA]/50 dark:bg-[#07090D]/50 shrink-0">
                  <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-[#B28D18] dark:text-[#C9A52A]" />
                    <span>TOP PERFORMERS</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {topPerformers.map((item, idx) => (
                      <div
                        key={item.id || item.rank}
                        onClick={() => setSelectedPerson(item)}
                        className={`p-3.5 rounded-[14px] border flex flex-col justify-between cursor-pointer hover:border-[#B28D18] transition-all shadow-xs ${
                          idx === 0
                            ? "bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border-[#B28D18]/30 dark:border-[#C9A52A]/30"
                            : "bg-[#FFFFFF] dark:bg-[#15191F] border-[#E5E7EB] dark:border-[#272D36]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                            idx === 0
                              ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10]"
                              : idx === 1
                              ? "bg-slate-400 text-white dark:text-[#0B0D10]"
                              : "bg-amber-700 text-white"
                          }`}>
                            #{String(item.rank).padStart(2, "0")}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-[#667085] dark:text-[#8B95A5]">
                            {item.role || "Member"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 my-1">
                          <div className="w-9 h-9 rounded-full bg-[#F3F4F6] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-center text-[11px] font-extrabold text-[#B28D18] dark:text-[#C9A52A] shrink-0">
                            {getInitials(item.name || item.displayName, item.email)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">{item.name || item.displayName}</p>
                            <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] truncate">{item.approvedTasks} approved · {item.onTimeRate}% on-time</p>
                          </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-[#E5E7EB]/50 dark:border-[#272D36] flex items-center justify-between text-[12px]">
                          <span className="text-[11px] text-[#667085] dark:text-[#8B95A5]">Performance Score</span>
                          <NumericValue size="secondary" className="text-[#B28D18] dark:text-[#C9A52A]" value={item.score} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sticky Header */}
              <div className="bg-[#F8F9FA] dark:bg-[#111419] border-b border-[#E5E7EB] dark:border-[#272D36] text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em] grid grid-cols-12 px-6 py-2.5 shrink-0">
                <div className="col-span-1">RANK</div>
                <div className="col-span-4">PERSON</div>
                <div className="col-span-2">ROLE</div>
                <div className="col-span-2">APPROVED WORK</div>
                <div className="col-span-2">ON-TIME</div>
                <div className="col-span-1 text-right">SCORE</div>
              </div>

              {/* DESKTOP TABLE BODY WITH SUBTLE THEME-AWARE SCROLLBAR */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-[#272D36] [scrollbar-width:thin] [scrollbar-color:rgba(180,180,180,0.2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-400/20 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400/40 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600/50">
                {rankings.map((item) => (
                  <div
                    key={item.id || item.userId || item.rank}
                    onClick={() => setSelectedPerson(item)}
                    className="grid grid-cols-12 px-6 py-3 items-center text-[13px] hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors cursor-pointer"
                  >
                    {/* Rank */}
                    <div className="col-span-1 text-[#667085] dark:text-[#8B95A5]">
                      <NumericValue size="table" value={`#${String(item.rank).padStart(2, "0")}`} />
                    </div>

                    {/* Person */}
                    <div className="col-span-4 font-medium text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-3 pr-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#F3F4F6] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-center text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] shrink-0">
                        {getInitials(item.name || item.displayName, item.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#17202A] dark:text-[#F2F4F7] truncate text-[13.5px]">{item.name || item.displayName || "Member"}</p>
                        <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] truncate">{item.email || "—"}</p>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="col-span-2">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10.5px] font-semibold ${
                        (item.role || "").toUpperCase().includes("CO")
                          ? "bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A] border-[#B28D18]/20 dark:border-[#C9A52A]/20"
                          : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                      }`}>
                        {item.role || "Member"}
                      </span>
                    </div>

                    {/* Approved Work */}
                    <div className="col-span-2 text-[#17202A] dark:text-[#F2F4F7]">
                      <NumericValue size="table" value={item.approvedTasks} unit="approved" />
                    </div>

                    {/* On-Time Rate */}
                    <div className="col-span-2 text-[#667085] dark:text-[#8B95A5]">
                      <NumericValue size="table" value={`${item.onTimeRate}%`} />
                    </div>

                    {/* Performance Score */}
                    <div className="col-span-1 text-right text-[#B28D18] dark:text-[#C9A52A]">
                      <NumericValue size="secondary" value={item.score} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MOBILE RECONSTRUCTED RANKING LIST (OVERLAY SCROLL, NO BROWSER SCROLLBAR) */}
            <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              
              {/* TOP PERFORMERS COMPACT RANKING SURFACE (MOBILE ONLY) */}
              {topPerformers.length > 0 && (
                <div className="space-y-2 mb-4">
                  {/* Section Header */}
                  <div className="flex items-center justify-between text-[12px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider px-1">
                    <span>TOP PERFORMERS</span>
                    <button
                      onClick={() => {
                        const el = document.getElementById("full-ranking-section");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="text-[12px] font-semibold text-[#B28D18] dark:text-[#C9A52A] hover:underline cursor-pointer flex items-center gap-0.5 normal-case tracking-normal"
                    >
                      <span>View all →</span>
                    </button>
                  </div>

                  {/* Single Surface Containing Compact Rows */}
                  <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden divide-y divide-[#E5E7EB] dark:divide-[#1E242C] shadow-xs">
                    {topPerformers.map((item) => {
                      const isFirst = item.rank === 1;
                      return (
                        <div
                          key={item.id || item.rank}
                          onClick={() => setSelectedPerson(item)}
                          className="py-3 px-3.5 sm:px-4 flex items-center justify-between gap-3 cursor-pointer active:bg-[#F8F9FA] dark:active:bg-[#15191F] transition-colors"
                        >
                          {/* Rank */}
                          <span className={`font-mono text-[13px] font-extrabold shrink-0 w-6 ${
                            isFirst
                              ? "text-[#B28D18] dark:text-[#C9A52A]"
                              : "text-[#667085] dark:text-[#8B95A5]"
                          }`}>
                            {String(item.rank).padStart(2, "0")}
                          </span>

                          {/* Avatar */}
                          <div className={`w-[36px] h-[36px] rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            isFirst
                              ? "bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A] border-[#B28D18]/30 dark:border-[#C9A52A]/30"
                              : "bg-[#F8F9FA] dark:bg-[#15191F] text-[#667085] dark:text-[#8B95A5] border-[#E5E7EB] dark:border-[#272D36]"
                          }`}>
                            {getInitials(item.name || item.displayName, item.email)}
                          </div>

                          {/* Person Info */}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-[15px] font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate">
                              {item.name || item.displayName}
                            </p>
                            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] font-medium truncate">
                              {item.role || "Member"} · {item.approvedTasks} approved · {item.onTimeRate}% on-time
                            </p>
                          </div>

                          {/* Score */}
                          <div className="text-right shrink-0">
                            <span className={`font-mono text-[21px] font-bold leading-none block ${
                              isFirst
                                ? "text-[#B28D18] dark:text-[#C9A52A]"
                                : "text-[#17202A] dark:text-[#F2F4F7]"
                            }`}>
                              {item.score}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FULL RANKINGS LIST */}
              <div id="full-ranking-section" className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider px-1">
                  FULL RANKING ({rankings.length})
                </div>

                {rankings.map((item) => (
                  <div
                    key={item.id || item.userId || item.rank}
                    onClick={() => setSelectedPerson(item)}
                    className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[13px] p-2.5 flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] transition-transform shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="font-mono text-[12px] font-extrabold text-[#667085] dark:text-[#8B95A5] shrink-0 w-6">
                        #{String(item.rank).padStart(2, "0")}
                      </span>

                      <div className="w-8 h-8 rounded-full bg-[#F3F4F6] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-center text-[10.5px] font-bold text-[#B28D18] dark:text-[#C9A52A] shrink-0">
                        {getInitials(item.name || item.displayName, item.email)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">{item.name || item.displayName}</p>
                          <span className="text-[9.5px] font-semibold text-[#667085] dark:text-[#8B95A5]">({item.role || "Member"})</span>
                        </div>
                        <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] truncate">{item.approvedTasks} approved · {item.onTimeRate}% on-time</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <span className="font-mono text-[16px] font-extrabold text-[#B28D18] dark:text-[#C9A52A] leading-none block">
                          {item.score}
                        </span>
                        <span className="text-[8.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase">PTS</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 4. FOOTER SUMMARY & COMPACT METHODOLOGY STRIP */}
        <div className="bg-[#F8F9FA] dark:bg-[#111419] border-t border-[#E5E7EB] dark:border-[#272D36] p-2.5 px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-2 text-[12px] text-[#667085] dark:text-[#8B95A5] shrink-0">
          
          {/* Organization Summary */}
          <div className="flex items-center gap-4 sm:gap-6 text-[11.5px] sm:text-[12px]">
            <div>
              <span>Avg Score: </span>
              <strong className="text-[#B28D18] dark:text-[#C9A52A] font-mono font-bold">{summaryMetrics.avgScore}</strong>
            </div>
            <div>
              <span>On-Time: </span>
              <strong className="text-[#17202A] dark:text-[#F2F4F7] font-mono font-bold">{summaryMetrics.avgOnTime}</strong>
            </div>
            <div>
              <span>Approved: </span>
              <strong className="text-[#17202A] dark:text-[#F2F4F7] font-mono font-bold">{summaryMetrics.totalApproved}</strong>
            </div>
          </div>

          {/* Compact Score Methodology Toggle */}
          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="inline-flex items-center gap-1 text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-[#B28D18] dark:text-[#C9A52A]" />
              <span className="font-semibold">Methodology</span>
            </button>
            <span className="hidden sm:inline">· Completion 40% · Approval 30% · On-time 20% · Consistency 10%</span>
          </div>
        </div>
      </div>

      {/* Methodology Explainer Modal */}
      <AnimatePresence>
        {showMethodology && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMethodology(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-[2px] cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[20px] p-5 shadow-2xl space-y-3 text-[#17202A] dark:text-[#F2F4F7]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#272D36]">
                <div className="flex items-center gap-2">
                  <Award className="w-4.5 h-4.5 text-[#B28D18] dark:text-[#C9A52A]" />
                  <h3 className="font-bold text-[15px]">Scoring Methodology</h3>
                </div>
                <button onClick={() => setShowMethodology(false)} className="text-[#667085] dark:text-[#8B95A5]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-[12px] text-[#667085] dark:text-[#8B95A5]">
                <div className="flex justify-between p-2 rounded-lg bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36]">
                  <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">Task Completion</span>
                  <span className="font-mono font-bold text-[#B28D18] dark:text-[#C9A52A]">40%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36]">
                  <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">Approval Quality</span>
                  <span className="font-mono font-bold text-[#B28D18] dark:text-[#C9A52A]">30%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36]">
                  <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">On-Time Delivery</span>
                  <span className="font-mono font-bold text-[#B28D18] dark:text-[#C9A52A]">20%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36]">
                  <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">Consistency Rate</span>
                  <span className="font-mono font-bold text-[#B28D18] dark:text-[#C9A52A]">10%</span>
                </div>
              </div>

              <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] pt-1">
                Leaderboard scores recalculate in real time based on verified work submissions approved by CEOs and CO-CEOs.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. REACT PORTAL PERSON DETAILS DRAWER / SHEET */}
      {selectedPerson && (
        <PersonDetailDrawer
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
}
