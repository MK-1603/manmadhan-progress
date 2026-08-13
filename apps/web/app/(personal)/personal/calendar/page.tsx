"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import apiClient from "@/lib/api-client";
import {
  LoaderCircle, ChevronLeft, ChevronRight, Clock,
  Target, X, CheckCircle2, Circle, FolderKanban,
} from "lucide-react";

type ViewMode = "month" | "week" | "agenda";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const s = new Date(d);
  s.setDate(diff);
  s.setHours(0, 0, 0, 0);
  return s;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}
function isToday(d: Date) {
  return isSameDay(d, new Date());
}

/* ─── component ───────────────────────────────────────────────────────────── */
export default function CalendarPage() {
  const [events, setEvents]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<ViewMode>("month");
  const [current, setCurrent]   = useState(new Date());
  const [selected, setSelected] = useState<any | null>(null);

  /* fetch range based on current view */
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "month") {
      const s = startOfMonth(current);
      s.setDate(s.getDate() - s.getDay() + (s.getDay() === 0 ? -6 : 1));
      const e = new Date(s);
      e.setDate(s.getDate() + 41);
      return { rangeStart: s.toISOString(), rangeEnd: e.toISOString() };
    }
    if (view === "week") {
      const s = startOfWeek(current);
      return { rangeStart: s.toISOString(), rangeEnd: addDays(s, 7).toISOString() };
    }
    // agenda: next 30 days
    const s = new Date(current);
    s.setHours(0, 0, 0, 0);
    return { rangeStart: s.toISOString(), rangeEnd: addDays(s, 30).toISOString() };
  }, [view, current]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/personal/calendar?start=${rangeStart}&end=${rangeEnd}`);
      setEvents(res.data.data || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  /* navigation */
  const prev = () => {
    const d = new Date(current);
    if (view === "month")  d.setMonth(d.getMonth() - 1);
    if (view === "week")   d.setDate(d.getDate() - 7);
    if (view === "agenda") d.setDate(d.getDate() - 30);
    setCurrent(d);
  };
  const next = () => {
    const d = new Date(current);
    if (view === "month")  d.setMonth(d.getMonth() + 1);
    if (view === "week")   d.setDate(d.getDate() + 7);
    if (view === "agenda") d.setDate(d.getDate() + 30);
    setCurrent(d);
  };
  const goToday = () => setCurrent(new Date());

  const eventsOnDay = (day: Date) =>
    events.filter(e => isSameDay(new Date(e.start), day));

  /* ── month grid ─────────────────────────────────────────────────────────── */
  const monthCells = useMemo(() => {
    const s = startOfMonth(current);
    const startCell = addDays(s, -(s.getDay() === 0 ? 6 : s.getDay() - 1));
    return Array.from({ length: 42 }, (_, i) => addDays(startCell, i));
  }, [current]);

  /* ── week days ─────────────────────────────────────────────────────────── */
  const weekDays = useMemo(() => {
    const s = startOfWeek(current);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [current]);

  /* ── agenda items ──────────────────────────────────────────────────────── */
  const agendaDays = useMemo(() => {
    const s = new Date(current);
    s.setHours(0, 0, 0, 0);
    return Array.from({ length: 30 }, (_, i) => addDays(s, i))
      .map(day => ({ day, events: eventsOnDay(day) }))
      .filter(d => d.events.length > 0);
  }, [current, events]);

  const periodLabel = useMemo(() => {
    if (view === "month")
      return current.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (view === "week") {
      const s = startOfWeek(current);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return `Next 30 days from ${current.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }, [view, current]);

  return (
    <div className="w-full h-full flex flex-col bg-[#FAFAFA] dark:bg-[#080808] overflow-hidden">
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
          <div>
            <p className="text-[10.5px] font-semibold text-[#A1A1AA] uppercase tracking-widest mb-0.5">
              Personal Workspace
            </p>
            <h1 className="text-[22px] font-bold text-[#171717] dark:text-[#F5F5F5] tracking-tight leading-none">
              {periodLabel}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View switcher */}
            <div className="flex rounded-xl border border-[#E5E7EB] dark:border-[#242424] overflow-hidden shrink-0">
              {(["month", "week", "agenda"] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    view === v
                      ? "bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808]"
                      : "text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {/* Navigation */}
            <button onClick={goToday}
              className="px-3 py-1.5 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-xs font-semibold text-[#171717] dark:text-[#F5F5F5] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]">
              Today
            </button>
            <div className="flex gap-1">
              <button onClick={prev}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] dark:border-[#242424] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] text-[#171717] dark:text-[#F5F5F5]">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={next}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] dark:border-[#242424] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] text-[#171717] dark:text-[#F5F5F5]">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Calendar body ───────────────────────────────────────────── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoaderCircle className="w-6 h-6 text-[#A1A1AA] animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">

            {/* MONTH VIEW */}
            {view === "month" && (
              <div className="h-full flex flex-col bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-[#E5E7EB] dark:border-[#242424]">
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                    <div key={d} className="py-2 text-center text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#E5E7EB] dark:divide-[#242424]">
                  {monthCells.map((day, i) => {
                    const dayEvents = eventsOnDay(day);
                    const isCurrentMonth = day.getMonth() === current.getMonth();
                    return (
                      <div key={i} className={`p-1 sm:p-2 min-h-[64px] flex flex-col ${
                        !isCurrentMonth ? "bg-[#F9F9F9] dark:bg-[#0A0A0A]" : ""
                      } ${isToday(day) ? "bg-[#D99A00]/5 dark:bg-[#F5B800]/5" : ""}`}>
                        <span className={`text-[11px] font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                          isToday(day)
                            ? "bg-[#D99A00] text-white"
                            : isCurrentMonth
                            ? "text-[#171717] dark:text-[#F5F5F5]"
                            : "text-[#A1A1AA]"
                        }`}>
                          {day.getDate()}
                        </span>
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          {dayEvents.slice(0, 3).map(ev => (
                            <button
                              key={ev.id}
                              onClick={() => setSelected(ev)}
                              className={`text-left text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded truncate w-full transition-opacity hover:opacity-80 ${
                                ev.type === "deadline"
                                  ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                                  : ev.status === "COMPLETED" || ev.status === "Completed"
                                  ? "bg-[#16A34A]/10 text-[#16A34A]"
                                  : "bg-[#D99A00]/10 text-[#D99A00] dark:text-[#F5B800]"
                              }`}
                            >
                              {ev.title}
                            </button>
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[9px] text-[#A1A1AA] pl-1">+{dayEvents.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WEEK VIEW */}
            {view === "week" && (
              <div className="h-full flex flex-col bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl overflow-hidden">
                <div className="grid grid-cols-7 border-b border-[#E5E7EB] dark:border-[#242424]">
                  {weekDays.map((day, i) => (
                    <div key={i} className={`p-3 text-center border-r border-[#E5E7EB] dark:border-[#242424] last:border-0 ${
                      isToday(day) ? "bg-[#D99A00]/5 dark:bg-[#F5B800]/5" : ""
                    }`}>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1AA] mb-1">
                        {day.toLocaleDateString(undefined, { weekday: "short" })}
                      </div>
                      <div className={`text-lg font-bold ${
                        isToday(day) ? "text-[#D99A00] dark:text-[#F5B800]" : "text-[#171717] dark:text-[#F5F5F5]"
                      }`}>
                        {day.getDate()}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto grid grid-cols-7 min-h-[400px] divide-x divide-[#E5E7EB] dark:divide-[#242424]">
                  {weekDays.map((day, i) => {
                    const dayEvents = eventsOnDay(day);
                    return (
                      <div key={i} className={`p-2 flex flex-col gap-1.5 ${
                        isToday(day) ? "bg-[#D99A00]/5 dark:bg-[#F5B800]/5" : ""
                      }`}>
                        {dayEvents.length === 0 ? (
                          <div className="text-[10px] text-[#A1A1AA] text-center mt-4">—</div>
                        ) : dayEvents.map(ev => (
                          <button
                            key={ev.id}
                            onClick={() => setSelected(ev)}
                            className={`text-left p-2 rounded-lg text-[10px] font-semibold w-full transition-all hover:opacity-80 ${
                              ev.type === "deadline"
                                ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50"
                                : ev.status === "COMPLETED" || ev.status === "Completed"
                                ? "bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20"
                                : "bg-[#D99A00]/10 text-[#D99A00] dark:text-[#F5B800] border border-[#D99A00]/20"
                            }`}
                          >
                            <p className="font-semibold truncate">{ev.title}</p>
                            {!ev.allDay && (
                              <p className="flex items-center gap-1 mt-0.5 opacity-70">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(ev.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AGENDA VIEW */}
            {view === "agenda" && (
              <div className="h-full overflow-y-auto space-y-4 pb-4">
                {agendaDays.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl text-center">
                    <Target className="w-10 h-10 text-[#A1A1AA] mb-3" />
                    <p className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">No events in next 30 days</p>
                    <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">
                      Tasks with deadlines or scheduled times will appear here.
                    </p>
                  </div>
                ) : agendaDays.map(({ day, events: dayEvents }) => (
                  <div key={day.toISOString()}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isToday(day)
                          ? "bg-[#D99A00] text-white"
                          : "bg-[#F4F4F5] dark:bg-[#1D1D1D] text-[#52525B] dark:text-[#A1A1AA]"
                      }`}>
                        {day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-[#242424]" />
                    </div>
                    <div className="flex flex-col gap-2 pl-2">
                      {dayEvents.map(ev => (
                        <button
                          key={ev.id}
                          onClick={() => setSelected(ev)}
                          className="text-left flex items-start gap-3 p-3 bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-xl hover:border-[#A1A1AA] dark:hover:border-[#52525B] transition-colors"
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            ev.type === "deadline"
                              ? "bg-rose-500"
                              : ev.status === "COMPLETED" || ev.status === "Completed"
                              ? "bg-[#16A34A]"
                              : "bg-[#D99A00]"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5] truncate">{ev.title}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-[#52525B] dark:text-[#A1A1AA]">
                              {!ev.allDay && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(ev.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                              {ev.type === "deadline" && (
                                <span className="flex items-center gap-1 text-rose-500 font-semibold">
                                  <Target className="w-3 h-3" /> Deadline
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Event detail panel ──────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-[400px] bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] dark:border-[#242424]">
              <div className="flex items-center gap-2">
                {selected.type === "deadline"
                  ? <Target className="w-4 h-4 text-rose-500" />
                  : selected.status === "COMPLETED" || selected.status === "Completed"
                  ? <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  : <Circle className="w-4 h-4 text-[#D99A00]" />}
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">
                  {selected.type === "deadline" ? "Deadline" : "Task"}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <h2 className="text-base font-bold text-[#171717] dark:text-[#F5F5F5] leading-snug">
                {selected.title}
              </h2>

              <div className="space-y-2 text-sm">
                {!selected.allDay && (
                  <div className="flex items-center gap-2 text-[#52525B] dark:text-[#A1A1AA]">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      {new Date(selected.start).toLocaleString(undefined, {
                        weekday: "short", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {selected.allDay && (
                  <div className="flex items-center gap-2 text-[#52525B] dark:text-[#A1A1AA]">
                    <Target className="w-4 h-4 shrink-0" />
                    <span>
                      {new Date(selected.start).toLocaleDateString(undefined, {
                        weekday: "short", month: "long", day: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {selected.source?.project?.name && (
                  <div className="flex items-center gap-2 text-[#52525B] dark:text-[#A1A1AA]">
                    <FolderKanban className="w-4 h-4 shrink-0" />
                    <span>{selected.source.project.name}</span>
                  </div>
                )}
                {selected.status && (
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      selected.status === "COMPLETED" || selected.status === "Completed"
                        ? "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20"
                        : "bg-[#D99A00]/10 text-[#D99A00] border-[#D99A00]/20"
                    }`}>
                      {selected.status}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setSelected(null)}
                className="w-full h-9 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
