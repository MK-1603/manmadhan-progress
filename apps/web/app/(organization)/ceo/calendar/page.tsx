"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, AlertCircle, CheckSquare, Target, Clock, User, ExternalLink, X } from "lucide-react";
import apiClient from "@/lib/api-client";
import { formatEnumLabel } from "@/lib/utils/formatters";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function CEOCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  
  const [selectedEventModal, setSelectedEventModal] = useState<any | null>(null);
  const [inspectTask, setInspectTask] = useState<any | null>(null);

  const fetchCalendar = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const projUrl = `/org/projects${workspaceId ? `?workspaceId=${workspaceId}` : ""}`;
      const taskUrl = `/org/tasks${workspaceId ? `?workspaceId=${workspaceId}` : ""}`;

      const [projRes, taskRes] = await Promise.all([
        apiClient.get(projUrl).catch(() => ({ data: { success: false } })),
        apiClient.get(taskUrl).catch(() => ({ data: { success: false } })),
      ]);

      const ev: any[] = [];
      if (projRes.data?.success && Array.isArray(projRes.data.data)) {
        for (const p of projRes.data.data) {
          if (p.deadline) {
            const d = new Date(p.deadline);
            if (!isNaN(d.getTime())) {
              ev.push({
                date: d,
                type: "PROJECT",
                title: p.name,
                status: p.status,
                color: "bg-blue-500",
                id: p.id,
                raw: p,
              });
            }
          }
        }
      }

      if (taskRes.data?.success && Array.isArray(taskRes.data.data)) {
        for (const t of taskRes.data.data) {
          const taskDate = t.startTime ? new Date(t.startTime) : t.deadline ? new Date(t.deadline) : null;
          if (taskDate && !isNaN(taskDate.getTime())) {
            ev.push({
              date: taskDate,
              type: "TASK",
              title: t.title,
              status: t.status,
              priority: t.priority,
              assigneeName: t.assigneeName,
              projectName: t.projectName,
              projectId: t.projectId,
              color: t.isOverdue ? "bg-[#E05252]" : "bg-[#E3AA18]",
              id: t.id,
              raw: t,
            });
          }
        }
      }

      setEvents(ev);
    } catch {
      setError("Unable to load scheduled events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCalendar(); }, []);

  const resetToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const getEventsForDay = (day: number) => events.filter(e => e.date.getFullYear() === year && e.date.getMonth() === month && e.date.getDate() === day);

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1440px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">ManMadhan · Organization</p>
          <h1 className="text-[28px] font-bold text-foreground tracking-tight flex items-center gap-2.5 leading-none">
            <CalendarIcon className="w-6 h-6 text-gold" /> Calendar
          </h1>
          <p className="text-[12px] text-muted-foreground mt-2">View scheduled work, project deadlines, and task due dates.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetToToday}
            className="px-3.5 py-2 rounded-xl bg-card border border-border text-foreground text-[12px] font-semibold hover:bg-muted transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="px-3 text-[12px] font-semibold text-foreground min-w-[130px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[12px]">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {DAYS.map(d => <div key={d} className="py-1">{d}</div>)}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-gold" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="min-h-[72px]" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                const isSelected = selectedDay === day;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[72px] rounded-xl p-2 text-left flex flex-col justify-start transition-all border text-xs ${
                      isSelected
                        ? "bg-muted border-gold"
                        : isToday
                        ? "bg-gold/5 border-gold/30"
                        : "bg-background border-border hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <span className={`text-[11px] font-semibold block ${isToday ? "text-gold" : "text-foreground"}`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5 w-full overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev, ei) => (
                        <div
                          key={ei}
                          onClick={(e) => { e.stopPropagation(); setSelectedEventModal(ev); }}
                          className={`px-1.5 py-0.5 rounded text-[9px] truncate font-semibold ${
                            ev.type === "PROJECT"
                              ? "bg-blue-500/20 text-blue-600"
                              : "bg-gold/20 text-gold"
                          }`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] text-muted-foreground block font-semibold">
                          + {dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Day Agenda */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-[12px] font-bold text-foreground uppercase tracking-widest mb-4">
              {selectedDay ? `${MONTHS[month]} ${selectedDay}` : "Select a day"}
            </h3>

            {selectedDayEvents.length === 0 ? (
              <p className="text-[12px] text-muted-foreground py-8 text-center">No scheduled work for this date</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((ev, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedEventModal(ev)}
                    className="p-3 rounded-xl bg-muted/30 border border-border hover:border-border/80 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-semibold text-foreground truncate">{ev.title}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${
                        ev.type === "PROJECT"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          : "bg-gold/10 text-gold border-gold/20"
                      }`}>
                        {ev.type}
                      </span>
                    </div>
                    {ev.assigneeName && (
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="w-3 h-3" /> {ev.assigneeName}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{ev.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Legend</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-foreground">
                <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30" />
                Project Deadlines
              </div>
              <div className="flex items-center gap-2 text-[11px] text-foreground">
                <div className="w-3 h-3 rounded bg-gold/20 border border-gold/30" />
                Task Due Dates
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedEventModal(null)}>
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                selectedEventModal.type === "PROJECT"
                  ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                  : "bg-gold/10 text-gold border border-gold/20"
              }`}>
                {selectedEventModal.type}
              </span>
              <button onClick={() => setSelectedEventModal(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-[14px] font-bold text-foreground">{selectedEventModal.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Scheduled: {selectedEventModal.date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border text-[12px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold text-foreground">{selectedEventModal.status}</span>
              </div>
              {selectedEventModal.projectName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project</span>
                  <span className="font-semibold text-foreground">{selectedEventModal.projectName}</span>
                </div>
              )}
              {selectedEventModal.assigneeName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assignee</span>
                  <span className="font-semibold text-foreground">{selectedEventModal.assigneeName}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setSelectedEventModal(null)}
                className="px-4 py-2 rounded-xl border border-border text-muted-foreground text-[12px] font-semibold hover:bg-muted transition-colors"
              >
                Close
              </button>
              {selectedEventModal.type === "TASK" && (
                <button
                  onClick={() => {
                    const taskRaw = selectedEventModal.raw;
                    setSelectedEventModal(null);
                    setInspectTask(taskRaw);
                  }}
                  className="px-4 py-2 rounded-xl bg-gold hover:bg-gold/90 text-[#111827] text-[12px] font-bold transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Task
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <TaskDetailModal
        task={inspectTask}
        isOpen={Boolean(inspectTask)}
        onClose={() => setInspectTask(null)}
        onUpdate={fetchCalendar}
      />
    </div>
  );
}
