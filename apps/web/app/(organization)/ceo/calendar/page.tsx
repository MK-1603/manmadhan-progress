"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, AlertCircle,
  Clock, User, ExternalLink, X, Plus, Search, Filter, RefreshCw, CheckCircle2, BookOpen, Layers
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";

type ViewMode = "MONTH" | "WEEK" | "AGENDA";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAYS_SUN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CEOCalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewMode, setViewMode] = useState<ViewMode>("MONTH");

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Mobile Sheet States
  const [showMobileDateSheet, setShowMobileDateSheet] = useState(false);
  const [showMobileSearchSheet, setShowMobileSearchSheet] = useState(false);
  const [activeSheetEvent, setActiveSheetEvent] = useState<any | null>(null);

  // Modals
  const [selectedEventModal, setSelectedEventModal] = useState<any | null>(null);
  const [inspectTask, setInspectTask] = useState<any | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  const fetchCalendarEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const url = `/org/calendar${workspaceId ? `?workspaceId=${workspaceId}` : ""}`;
      const res = await apiClient.get(url);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setEvents(res.data.data);
      } else {
        setError(res.data?.error || "Failed to load calendar events.");
      }
    } catch (err: any) {
      console.error("Calendar fetch error:", err);
      setError("Unable to load calendar. We couldn't retrieve scheduled work for this workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  // Lock body scroll when mobile sheets are open
  useEffect(() => {
    if (showMobileDateSheet || showMobileSearchSheet) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showMobileDateSheet, showMobileSearchSheet]);

  // Navigation handlers
  const resetToToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDate(now);
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Category filter
      if (selectedCategory !== "ALL") {
        if (selectedCategory === "PROJECTS" && ev.sourceType !== "PROJECT") return false;
        if (selectedCategory === "TASKS" && ev.sourceType !== "TASK") return false;
        if (selectedCategory === "LEARNING" && ev.sourceType !== "LEARNING") return false;
        if (selectedCategory === "REVIEWS" && ev.sourceType !== "REVIEW") return false;
        if (selectedCategory === "SUBMISSIONS" && ev.sourceType !== "SUBMISSION") return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (ev.title || "").toLowerCase().includes(q);
        const matchProj = (ev.project?.name || "").toLowerCase().includes(q);
        const matchAssignee = (ev.assignee?.name || "").toLowerCase().includes(q);
        const matchCat = (ev.category || "").toLowerCase().includes(q);
        if (!matchTitle && !matchProj && !matchAssignee && !matchCat) return false;
      }
      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  // Day Events Lookup
  const getEventsForDate = (d: Date) => {
    return filteredEvents.filter((ev) => {
      if (!ev.startAt && !ev.dueAt) return false;
      const evDate = new Date(ev.startAt || ev.dueAt);
      return isSameDay(evDate, d);
    });
  };

  const selectedDayEvents = useMemo(() => {
    return getEventsForDate(selectedDate);
  }, [selectedDate, filteredEvents]);

  // Month grid calculations
  const daysInMonth = getDaysInMonth(year, month);
  const firstDaySun = getFirstDayOfMonth(year, month);

  // Category Badge Color
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "PROJECT DEADLINE":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "LEARNING":
        return "bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] border-[#C9A52A]/20";
      case "REVIEW":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "SUBMISSION":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  const handleMobileDateClick = (cellDate: Date) => {
    setSelectedDate(cellDate);
    setActiveSheetEvent(null);
    setShowMobileDateSheet(true);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none">
      
      {/* ========================================================================= */}
      {/* ── DESKTOP VIEWPORT LAYOUT (hidden md:flex) - 100% UNTOUCHED ───────────── */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col w-full h-full overflow-hidden">
        {/* Desktop Header */}
        <div className="shrink-0 px-6 py-3.5 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />
                <h1 className="text-[28px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                  Calendar
                </h1>
              </div>
              <p className="text-[13px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">
                Schedule work, deadlines, and execution milestones.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetToToday}
                className="px-3.5 h-[38px] rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#C9A52A] transition-colors cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center gap-1 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] p-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-[7px] text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] min-w-[130px] text-center">
                  {MONTHS[month]} {year}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-[7px] text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Toolbar */}
        <div className="shrink-0 px-6 py-2.5 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] p-1">
            {(["MONTH", "WEEK", "AGENDA"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-[7px] text-[12px] font-bold transition-all cursor-pointer capitalize ${
                  viewMode === mode
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-2xs"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                {mode.toLowerCase()}
              </button>
            ))}
          </div>

          <div className="hidden xl:flex items-center gap-4 text-[11px] font-bold text-[#667085]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Project Deadline</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#C9A52A]" /> Task Due</span>
            <span className="flex items-center gap-4 text-[11px] font-bold text-[#667085]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Learning / Review</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
              <input
                type="text"
                placeholder="Search calendar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 h-[36px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-[36px] px-3 rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] outline-none cursor-pointer"
            >
              <option value="ALL">All Work Categories</option>
              <option value="PROJECTS">Projects Only</option>
              <option value="TASKS">Tasks Only</option>
              <option value="LEARNING">Learning Only</option>
              <option value="REVIEWS">Reviews Only</option>
              <option value="SUBMISSIONS">Submissions Only</option>
            </select>
          </div>
        </div>

        {/* Desktop Main Workspace 2-Column Grid */}
        <div className="flex-1 min-h-0 px-6 py-4 overflow-hidden">
          {error ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[16px] border border-rose-500/20 space-y-3 max-w-md mx-auto shadow-2xs">
              <AlertCircle className="w-10 h-10 text-rose-500 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Unable to load calendar</h3>
                <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5]">We couldn't retrieve scheduled work for this workspace.</p>
              </div>
              <button onClick={fetchCalendarEvents} className="px-4 h-[36px] rounded-[9px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 cursor-pointer inline-flex items-center gap-1.5 mt-2">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.1fr)_minmax(320px,0.9fr)] gap-4 h-full overflow-hidden">
              {/* Left Panel */}
              <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-4 flex flex-col h-full overflow-hidden shadow-2xs">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-[#C9A52A] animate-spin" />
                  </div>
                ) : viewMode === "MONTH" ? (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-[#E4E7EC] dark:border-[#272D36] pb-2 text-center text-[11px] font-bold text-[#667085] uppercase shrink-0">
                      {DAYS_SUN.map((d) => (
                        <div key={d}>{d}</div>
                      ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-1 pt-2 overflow-hidden">
                      {Array.from({ length: firstDaySun }).map((_, i) => (
                        <div key={`empty-${i}`} className="rounded-[10px] bg-[#F8F9FB]/30 dark:bg-[#111419]/30 border border-transparent min-h-[64px]" />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const cellDate = new Date(year, month, dayNum);
                        const dayEvents = getEventsForDate(cellDate);
                        const isCurrentToday = isSameDay(cellDate, today);
                        const isSelected = isSameDay(cellDate, selectedDate);

                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => setSelectedDate(cellDate)}
                            className={`rounded-[10px] p-2 text-left flex flex-col justify-start transition-colors border text-xs min-h-[64px] overflow-hidden cursor-pointer ${
                              isSelected
                                ? "bg-[#C9A52A]/10 border-[#C9A52A] ring-1 ring-[#C9A52A]"
                                : isCurrentToday
                                ? "bg-[#C9A52A]/5 border-[#C9A52A]/40"
                                : "bg-[#F8F9FB] dark:bg-[#111419] border-[#E4E7EC] dark:border-[#272D36] hover:border-[#C9A52A]/50"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-[11.5px] font-bold ${isCurrentToday ? "text-[#C9A52A]" : "text-[#17202A] dark:text-[#F2F4F7]"}`}>{dayNum}</span>
                              {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#C9A52A]" />}
                            </div>
                            <div className="mt-1 space-y-1 w-full overflow-hidden">
                              {dayEvents.slice(0, 2).map((ev) => (
                                <div key={ev.id} onClick={(e) => { e.stopPropagation(); setSelectedEventModal(ev); }} className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold truncate border ${getCategoryBadgeClass(ev.category)}`}>
                                  • {ev.title}
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <span className="text-[9.5px] font-bold text-[#667085] block truncate">+{dayEvents.length - 2} more</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : viewMode === "WEEK" ? (
                  <div className="flex-1 flex flex-col h-full overflow-y-auto space-y-3">
                    <div className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">Weekly Execution Timeline</div>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 7 }).map((_, idx) => {
                        const currDay = new Date(selectedDate);
                        currDay.setDate(selectedDate.getDate() - selectedDate.getDay() + idx);
                        const dayEvs = getEventsForDate(currDay);
                        const isCurrentToday = isSameDay(currDay, today);
                        return (
                          <div key={idx} className={`p-2.5 rounded-[12px] border ${isCurrentToday ? "border-[#C9A52A] bg-[#C9A52A]/5" : "border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419]"}`}>
                            <div className="text-[10px] font-bold text-[#667085] uppercase">{DAYS_SUN[idx]}</div>
                            <div className={`text-[16px] font-extrabold ${isCurrentToday ? "text-[#C9A52A]" : "text-[#17202A] dark:text-[#F2F4F7]"}`}>{currDay.getDate()}</div>
                            <div className="mt-2 space-y-1.5">
                              {dayEvs.map((ev) => (
                                <div key={ev.id} onClick={() => setSelectedEventModal(ev)} className={`p-1.5 rounded-[6px] text-[10.5px] font-semibold border cursor-pointer ${getCategoryBadgeClass(ev.category)}`}>
                                  {ev.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3">
                    <div className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">Chronological Execution Agenda</div>
                    {filteredEvents.map((ev) => (
                      <div key={ev.id} onClick={() => setSelectedEventModal(ev)} className="p-3 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] hover:border-[#C9A52A] transition-colors cursor-pointer flex items-center justify-between">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${getCategoryBadgeClass(ev.category)}`}>{ev.category}</span>
                          <h4 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{ev.title}</h4>
                        </div>
                        <span className="text-[11px] font-mono text-[#667085]">{ev.startAt ? new Date(ev.startAt).toLocaleDateString() : "Flexible"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Panel Inspector */}
              <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-5 flex flex-col h-full overflow-hidden shadow-2xs">
                <div className="pb-3 border-b border-[#E4E7EC] dark:border-[#272D36] shrink-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-bold uppercase">{MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] text-[10.5px] font-bold border border-[#C9A52A]/20">{selectedDayEvents.length} SCHEDULED</span>
                  </div>
                  <p className="text-[11.5px] text-[#667085] font-medium">{selectedDate.toLocaleDateString("en-US", { weekday: "long" })}{isSameDay(selectedDate, today) ? " · Today" : ""}</p>
                </div>

                <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                  {selectedDayEvents.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-8 text-center space-y-3">
                      <CheckCircle2 className="w-8 h-8 text-[#C9A52A]" />
                      <h4 className="text-[14px] font-bold">No scheduled work</h4>
                      <p className="text-[12px] text-[#667085]">Nothing is scheduled for this date.</p>
                      <button type="button" onClick={() => setShowCreateTaskModal(true)} className="px-4 h-[34px] rounded-[8px] bg-[#C9A52A] text-[#0B0D10] text-[12px] font-bold">
                        <Plus className="w-3.5 h-3.5 inline mr-1" /> Create Task
                      </button>
                    </div>
                  ) : (
                    selectedDayEvents.map((ev) => (
                      <div key={ev.id} onClick={() => setSelectedEventModal(ev)} className="p-3.5 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] hover:border-[#C9A52A] transition-colors cursor-pointer space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-[#667085]">{ev.allDay ? "ALL DAY" : ev.startAt ? new Date(ev.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "SCHEDULED"}</span>
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${getCategoryBadgeClass(ev.category)}`}>{ev.category}</span>
                        </div>
                        <h4 className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{ev.title}</h4>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-[#E4E7EC] dark:border-[#272D36] shrink-0">
                  <button type="button" onClick={() => setShowCreateTaskModal(true)} className="w-full h-[38px] rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36] text-[12.5px] font-bold hover:bg-[#F8F9FB] dark:hover:bg-[#111419] flex items-center justify-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#C9A52A]" /> Schedule New Task
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* ========================================================================= */}
      {/* ── MOBILE BREAKPOINT LAYOUT (flex md:hidden) - PERFECT GAPLESS FIT ─────── */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col w-full h-[100dvh] overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] relative">
        
        {/* ── 1. COMPACT PAGE HEADER ────────────────────────────────────────────── */}
        <div className="shrink-0 px-4 py-2 bg-[#FFFFFF] dark:bg-[#15191F]">
          <h1 className="text-[22px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none flex items-center gap-1.5">
            <CalendarIcon className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />
            <span>Calendar</span>
          </h1>
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] font-medium mt-1">
            Schedule work and milestones.
          </p>
        </div>

        {/* ── 2. COMPACT DATE NAVIGATION ROW ────────────────────────────────────── */}
        <div className="shrink-0 px-4 py-1.5 border-t border-b border-[#E4E7EC]/60 dark:border-[#272D36]/60 bg-[#FFFFFF] dark:bg-[#15191F] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={resetToToday}
            className="px-2.5 h-[28px] rounded-[6px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#C9A52A] transition-colors shrink-0"
          >
            Today
          </button>

          <div className="flex-1 flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] text-center min-w-[110px]">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Compact Search Trigger Icon */}
          <button
            type="button"
            onClick={() => setShowMobileSearchSheet(true)}
            className="w-[28px] h-[28px] rounded-[6px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-center text-[#667085] hover:text-[#17202A] shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── 3. LIGHTWEIGHT VIEW SWITCHER ROW ─────────────────────────────────── */}
        <div className="shrink-0 px-4 py-1.5 bg-[#FFFFFF] dark:bg-[#15191F]">
          <div className="flex items-center gap-1 bg-[#F8F9FB] dark:bg-[#111419] p-0.5 rounded-[8px]">
            {(["MONTH", "WEEK", "AGENDA"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-1 text-center rounded-[6px] text-[11px] font-semibold transition-all capitalize ${
                  viewMode === mode
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold shadow-2xs"
                    : "text-[#667085] dark:text-[#8B95A5]"
                }`}
              >
                {mode.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── 4. CALENDAR HERO SURFACE (STRETCHES DOWN TO BOTTOM NAV WITH PERFECT 80px PADDING) ─ */}
        <div className="flex-1 min-h-0 px-3 pt-2 pb-[80px] flex flex-col justify-start overflow-hidden bg-[#FFFFFF] dark:bg-[#15191F]">
          {error ? (
            <div className="p-4 text-center bg-[#FFFFFF] dark:bg-[#15191F] border border-rose-500/20 rounded-[10px] my-auto space-y-1.5">
              <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
              <h4 className="text-[12.5px] font-bold">Unable to load calendar</h4>
              <p className="text-[11px] text-[#667085]">We couldn't retrieve scheduled work.</p>
              <button onClick={fetchCalendarEvents} className="px-3 py-1 rounded bg-[#C9A52A] text-[#0B0D10] text-[11px] font-bold">Retry</button>
            </div>
          ) : loading ? (
            <div className="my-auto text-center">
              <Loader2 className="w-6 h-6 text-[#C9A52A] animate-spin mx-auto" />
            </div>
          ) : viewMode === "MONTH" ? (
            /* ── AIRY NON-SCROLLABLE MONTH GRID ── */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#667085] uppercase tracking-wider py-1 shrink-0">
                {DAYS_SUN.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              {/* Date Grid (Cells Expand Evenly Down to Top of Bottom Nav) */}
              <div className="flex-1 grid grid-cols-7 gap-1 auto-rows-fr overflow-hidden">
                {Array.from({ length: firstDaySun }).map((_, i) => (
                  <div key={`m-empty-${i}`} className="rounded-[6px] bg-transparent" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const cellDate = new Date(year, month, dayNum);
                  const dayEvents = getEventsForDate(cellDate);
                  const isCurrentToday = isSameDay(cellDate, today);
                  const isSelected = isSameDay(cellDate, selectedDate);

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleMobileDateClick(cellDate)}
                      className={`rounded-[8px] p-1 flex flex-col items-center justify-between transition-colors border text-xs h-full cursor-pointer overflow-hidden shadow-2xs ${
                        isSelected
                          ? "bg-[#C9A52A]/10 border-[#C9A52A] ring-1 ring-[#C9A52A]"
                          : isCurrentToday
                          ? "bg-[#C9A52A]/5 border-[#C9A52A]/40"
                          : "bg-[#F8F9FB] dark:bg-[#111419] border-[#E4E7EC] dark:border-[#272D36] hover:border-[#C9A52A]/50"
                      }`}
                    >
                      <span className={`text-[12.5px] font-bold ${isCurrentToday ? "w-[24px] h-[24px] rounded-full bg-[#C9A52A] text-[#0B0D10] flex items-center justify-center" : "text-[#17202A] dark:text-[#F2F4F7]"}`}>
                        {dayNum}
                      </span>

                      {/* Dot Indicators */}
                      <div className="flex items-center gap-0.5 mb-1">
                        {dayEvents.slice(0, 3).map((_, di) => (
                          <span key={di} className="w-1 h-1 rounded-full bg-[#C9A52A]" />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : viewMode === "WEEK" ? (
            <div className="flex-1 flex gap-1.5 overflow-x-auto my-auto items-center">
              {Array.from({ length: 7 }).map((_, idx) => {
                const currDay = new Date(selectedDate);
                currDay.setDate(selectedDate.getDate() - selectedDate.getDay() + idx);
                const dayEvs = getEventsForDate(currDay);
                const isCurrentToday = isSameDay(currDay, today);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleMobileDateClick(currDay)}
                    className={`p-2 rounded-[8px] border flex-1 text-center ${isCurrentToday ? "border-[#C9A52A] bg-[#C9A52A]/10" : "border-[#E4E7EC] dark:border-[#272D36]"}`}
                  >
                    <div className="text-[9.5px] font-bold text-[#667085] uppercase">{DAYS_SUN[idx]}</div>
                    <div className="text-[14px] font-bold mt-0.5">{currDay.getDate()}</div>
                    <span className="text-[9.5px] text-[#667085] block mt-1">{dayEvs.length} items</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredEvents.length === 0 ? (
                <div className="p-6 text-center text-[12px] text-[#667085]">No events found.</div>
              ) : (
                filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedDate(new Date(ev.startAt || ev.dueAt || today));
                      setActiveSheetEvent(ev);
                      setShowMobileDateSheet(true);
                    }}
                    className="p-2.5 rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getCategoryBadgeClass(ev.category)}`}>{ev.category}</span>
                      <h4 className="text-[12px] font-bold mt-0.5 text-[#17202A] dark:text-[#F2F4F7]">{ev.title}</h4>
                    </div>
                    <span className="text-[10.5px] font-mono text-[#667085]">{ev.startAt ? new Date(ev.startAt).toLocaleDateString() : "Flexible"}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── 5. SEARCH BOTTOM SHEET OVERLAY ──────────────────────────────────── */}
        {showMobileSearchSheet && (
          <div
            className="md:hidden fixed inset-0 z-[150] flex flex-col justify-end bg-black/40 backdrop-blur-xs font-sans transition-opacity animate-in fade-in duration-150"
            onClick={() => setShowMobileSearchSheet(false)}
          >
            <div
              className="w-full max-h-[75vh] bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[24px] shadow-2xl p-4 flex flex-col animate-in slide-in-from-bottom duration-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-[#E4E7EC] dark:bg-[#272D36] rounded-full mx-auto shrink-0 mb-3" />
              <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Search Calendar Events</h3>
                <button type="button" onClick={() => setShowMobileSearchSheet(false)} className="p-1 rounded-full text-[#667085]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-3 pb-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                <input
                  type="text"
                  placeholder="Type to search tasks, projects, learning..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 h-[38px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 py-2">
                {filteredEvents.length === 0 ? (
                  <p className="text-[12px] text-[#667085] text-center py-6">No matching events found.</p>
                ) : (
                  filteredEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => {
                        setSelectedDate(new Date(ev.startAt || ev.dueAt || today));
                        setActiveSheetEvent(ev);
                        setShowMobileSearchSheet(false);
                        setShowMobileDateSheet(true);
                      }}
                      className="p-3 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getCategoryBadgeClass(ev.category)}`}>{ev.category}</span>
                        <h4 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] mt-0.5">{ev.title}</h4>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#667085]" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 6. MOBILE NATIVE BOTTOM SHEET FOR SELECTED DATE ───────────────────── */}
        {showMobileDateSheet && (
          <div
            className="md:hidden fixed inset-0 z-[140] flex flex-col justify-end bg-black/40 backdrop-blur-xs font-sans transition-opacity animate-in fade-in duration-150"
            onClick={() => {
              setShowMobileDateSheet(false);
              setActiveSheetEvent(null);
            }}
          >
            <div
              className="w-full max-h-[75vh] min-h-[40vh] bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[24px] shadow-2xl p-4 flex flex-col animate-in slide-in-from-bottom duration-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle */}
              <div className="w-10 h-1 bg-[#E4E7EC] dark:bg-[#272D36] rounded-full mx-auto shrink-0 mb-3" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] dark:border-[#272D36] shrink-0">
                {activeSheetEvent ? (
                  <button
                    type="button"
                    onClick={() => setActiveSheetEvent(null)}
                    className="text-[12px] font-bold text-[#C9A52A] flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Date</span>
                  </button>
                ) : (
                  <div>
                    <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-tight">
                      {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
                    </h3>
                    <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] font-medium">
                      {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
                      {isSameDay(selectedDate, today) ? " · Today" : ""}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {!activeSheetEvent && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] text-[10.5px] font-bold border border-[#C9A52A]/20">
                      {selectedDayEvents.length} Events
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileDateSheet(false);
                      setActiveSheetEvent(null);
                    }}
                    className="p-1.5 rounded-full text-[#667085] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sheet Body Content */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                {activeSheetEvent ? (
                  /* EVENT DETAILS VIEW INSIDE SHEET */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getCategoryBadgeClass(activeSheetEvent.category)}`}>
                        {activeSheetEvent.category}
                      </span>
                      <span className="text-[11px] font-mono text-[#667085]">
                        {activeSheetEvent.allDay ? "ALL DAY" : activeSheetEvent.startAt ? new Date(activeSheetEvent.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "SCHEDULED"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                        {activeSheetEvent.title}
                      </h3>
                      {activeSheetEvent.description && (
                        <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-1 leading-relaxed">
                          {activeSheetEvent.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36] text-[12px]">
                      <div className="flex justify-between">
                        <span className="text-[#667085]">Status</span>
                        <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{activeSheetEvent.status}</span>
                      </div>
                      {activeSheetEvent.assignee?.name && (
                        <div className="flex justify-between">
                          <span className="text-[#667085]">Assignee</span>
                          <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{activeSheetEvent.assignee.name}</span>
                        </div>
                      )}
                      {activeSheetEvent.project?.name && (
                        <div className="flex justify-between">
                          <span className="text-[#667085]">Project</span>
                          <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{activeSheetEvent.project.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {activeSheetEvent.sourceType === "TASK" && (
                        <button
                          type="button"
                          onClick={() => {
                            const taskRaw = activeSheetEvent.raw;
                            setShowMobileDateSheet(false);
                            setActiveSheetEvent(null);
                            setInspectTask(taskRaw);
                          }}
                          className="w-full h-[40px] rounded-[10px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View Task Details</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : selectedDayEvents.length === 0 ? (
                  /* EMPTY DATE SHEET */
                  <div className="py-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] flex items-center justify-center border border-[#C9A52A]/20 mx-auto">
                      <CheckCircle2 className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                        No scheduled work
                      </h4>
                      <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                        Nothing scheduled for this date.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileDateSheet(false);
                        setShowCreateTaskModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-4 h-[38px] rounded-[10px] bg-[#C9A52A] text-[#0B0D10] text-[12px] font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs mt-1"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>+ Schedule Task</span>
                    </button>
                  </div>
                ) : (
                  /* EVENTS TIMELINE LIST IN SHEET */
                  selectedDayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setActiveSheetEvent(ev)}
                      className="p-3 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-2 cursor-pointer hover:border-[#C9A52A]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-mono font-bold text-[#667085]">
                          {ev.allDay ? "ALL DAY" : ev.startAt ? new Date(ev.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "SCHEDULED"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase border ${getCategoryBadgeClass(ev.category)}`}>
                          {ev.category}
                        </span>
                      </div>
                      <h4 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                        {ev.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-[#667085] pt-1 border-t border-[#E4E7EC]/60 dark:border-[#272D36]/60">
                        <span>{ev.assignee?.name || "Unassigned"}</span>
                        <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{ev.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── EVENT DETAILS MODAL (DESKTOP / DIRECT) ─────────────────────────── */}
      {selectedEventModal && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans"
          onClick={() => setSelectedEventModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase border ${getCategoryBadgeClass(selectedEventModal.category)}`}>
                {selectedEventModal.category}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEventModal(null)}
                className="p-1 rounded-full text-[#667085] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                {selectedEventModal.title}
              </h3>
              {selectedEventModal.description && (
                <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed mt-1">
                  {selectedEventModal.description}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36] text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#667085]">Status</span>
                <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{selectedEventModal.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Priority</span>
                <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{selectedEventModal.priority || "Medium"}</span>
              </div>
              {selectedEventModal.assignee?.name && (
                <div className="flex justify-between">
                  <span className="text-[#667085]">Assignee</span>
                  <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{selectedEventModal.assignee.name}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedEventModal(null)}
                className="h-[36px] px-4 rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[12.5px] font-bold text-[#667085]"
              >
                Close
              </button>

              {selectedEventModal.sourceType === "TASK" && (
                <button
                  type="button"
                  onClick={() => {
                    const taskRaw = selectedEventModal.raw;
                    setSelectedEventModal(null);
                    setInspectTask(taskRaw);
                  }}
                  className="h-[36px] px-4 rounded-[8px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Task</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Inspection Modal */}
      <TaskDetailModal
        task={inspectTask}
        isOpen={Boolean(inspectTask)}
        onClose={() => setInspectTask(null)}
        onUpdate={fetchCalendarEvents}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        onSuccess={fetchCalendarEvents}
      />
    </div>
  );
}
