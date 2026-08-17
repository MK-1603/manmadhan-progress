"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, AlertCircle,
  Clock, User, ExternalLink, X, Plus, Search, RefreshCw, CheckCircle2
} from "lucide-react";
import apiClient from "@/lib/api-client";

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

export default function PersonalCalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewMode, setViewMode] = useState<ViewMode>("MONTH");

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventModal, setSelectedEventModal] = useState<any | null>(null);

  const fetchPersonalCalendar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const s = new Date(year, month, 1).toISOString();
      const e = new Date(year, month + 1, 0).toISOString();
      const res = await apiClient.get(`/personal/calendar?start=${s}&end=${e}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setEvents(res.data.data);
      } else {
        setEvents([]);
      }
    } catch (err: any) {
      console.error("Personal calendar fetch error:", err);
      setError("Unable to load personal calendar events.");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchPersonalCalendar();
  }, [fetchPersonalCalendar]);

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

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (ev.title || "").toLowerCase().includes(q);
    });
  }, [events, searchQuery]);

  const getEventsForDate = (d: Date) => {
    return filteredEvents.filter((ev) => {
      const evDate = new Date(ev.start || ev.end);
      return isSameDay(evDate, d);
    });
  };

  const selectedDayEvents = useMemo(() => {
    return getEventsForDate(selectedDate);
  }, [selectedDate, filteredEvents]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDaySun = getFirstDayOfMonth(year, month);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none">
      
      {/* Page Header */}
      <div className="shrink-0 px-6 py-3.5 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />
              <h1 className="text-[28px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                Personal Calendar
              </h1>
            </div>
            <p className="text-[13px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">
              Schedule personal tasks, learning goals, and target deadlines.
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

      {/* Toolbar */}
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
                  : "text-[#667085] dark:text-[#8B95A5]"
              }`}
            >
              {mode.toLowerCase()}
            </button>
          ))}
        </div>

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
      </div>

      {/* Workspace Grid */}
      <div className="flex-1 min-h-0 px-6 py-4 overflow-hidden">
        {error ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[16px] border border-rose-500/20 space-y-3 max-w-md mx-auto">
            <AlertCircle className="w-10 h-10 text-rose-500 shrink-0" />
            <p className="text-[13px] font-bold">{error}</p>
            <button onClick={fetchPersonalCalendar} className="px-4 py-1.5 rounded bg-[#C9A52A] text-[#0B0D10] text-[12px] font-bold">
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.1fr)_minmax(320px,0.9fr)] gap-4 h-full overflow-hidden">
            {/* Left Month View */}
            <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-4 flex flex-col h-full overflow-hidden shadow-2xs">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-[#C9A52A] animate-spin" />
                </div>
              ) : (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-[#E4E7EC] dark:border-[#272D36] pb-2 text-center text-[11px] font-bold text-[#667085] uppercase shrink-0">
                    {DAYS_SUN.map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>

                  <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-1 pt-2 overflow-hidden">
                    {Array.from({ length: firstDaySun }).map((_, i) => (
                      <div key={`empty-${i}`} className="rounded-[10px] bg-[#F8F9FB]/30 border border-transparent min-h-[64px]" />
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
                            <span className={`text-[11.5px] font-bold ${isCurrentToday ? "text-[#C9A52A]" : "text-[#17202A] dark:text-[#F2F4F7]"}`}>
                              {dayNum}
                            </span>
                            {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#C9A52A]" />}
                          </div>

                          <div className="mt-1 space-y-1 w-full overflow-hidden">
                            {dayEvents.slice(0, 2).map((ev) => (
                              <div
                                key={ev.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedEventModal(ev); }}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate bg-[#C9A52A]/10 text-[#C9A52A]"
                              >
                                • {ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <span className="text-[9.5px] font-bold text-[#667085] block truncate">
                                +{dayEvents.length - 2} more
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Inspector */}
            <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-5 flex flex-col h-full overflow-hidden shadow-2xs">
              <div className="pb-3 border-b border-[#E4E7EC] dark:border-[#272D36] shrink-0 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-[16px] font-bold uppercase">
                    {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] text-[10.5px] font-bold">
                    {selectedDayEvents.length} ITEMS
                  </span>
                </div>
                <p className="text-[11.5px] text-[#667085] font-medium">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
                  {isSameDay(selectedDate, today) ? " · Today" : ""}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-2">
                {selectedDayEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-[#667085]">
                    <CheckCircle2 className="w-8 h-8 text-[#C9A52A]" />
                    <p className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No scheduled work</p>
                    <p className="text-[11.5px]">Nothing is scheduled for this date.</p>
                  </div>
                ) : (
                  selectedDayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventModal(ev)}
                      className="p-3 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-1 cursor-pointer"
                    >
                      <h4 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{ev.title}</h4>
                      <p className="text-[11px] text-[#667085]">{ev.status || "Scheduled"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setSelectedEventModal(null)}>
          <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-6 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold">{selectedEventModal.title}</h3>
            <p className="text-[12px] text-[#667085]">Status: {selectedEventModal.status || "Active"}</p>
            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedEventModal(null)} className="px-4 py-1.5 rounded bg-[#C9A52A] text-[#0B0D10] text-[12px] font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
