"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Loader2, AlertCircle, Target, CheckSquare, Flag } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";

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
          if (p.startDate) {
            const d = new Date(p.startDate);
            if (!isNaN(d.getTime())) {
              ev.push({ date: d, type: "project-start", label: `[START] ${p.name}`, color: "bg-emerald-500", id: p.id });
            }
          }
          if (p.deadline) {
            const d = new Date(p.deadline);
            if (!isNaN(d.getTime())) {
              ev.push({ date: d, type: "project-deadline", label: `[DEADLINE] ${p.name}`, color: "bg-blue-500", id: p.id });
            }
          }
        }
      }

      if (taskRes.data?.success && Array.isArray(taskRes.data.data)) {
        for (const t of taskRes.data.data) {
          if (t.deadline) {
            const d = new Date(t.deadline);
            if (!isNaN(d.getTime())) {
              ev.push({
                date: d,
                type: "task",
                label: `[TASK] ${t.title}${t.assigneeName ? ` (${t.assigneeName})` : ""}`,
                color: t.isOverdue ? "bg-rose-500" : "bg-amber-500",
                id: t.id,
                assigneeName: t.assigneeName,
              });
            }
          }
        }
      }

      setEvents(ev);
    } catch {
      setError("Unable to load calendar events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCalendar(); }, []);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const getEventsForDay = (day: number) => events.filter(e => e.date.getFullYear() === year && e.date.getMonth() === month && e.date.getDate() === day);

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" /> Calendar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Organization schedule — projects, tasks, and deadlines</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <PremiumCard>
            {/* Month Nav */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-accent transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
              <h2 className="text-base font-bold text-foreground">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-accent transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-1">{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventsForDay(day);
                  const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                  const isSelected = selectedDay === day;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`relative min-h-[44px] rounded-lg p-1 text-xs font-medium transition-colors ${isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent text-foreground"}`}
                    >
                      <span className="block text-center">{day}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 justify-center mt-0.5 flex-wrap">
                          {dayEvents.slice(0, 3).map((ev, ei) => (
                            <div key={ei} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground/70" : ev.color}`} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Projects</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Tasks</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Overdue</span>
            </div>
          </PremiumCard>
        </div>

        {/* Selected Day Events */}
        <div>
          <PremiumCard>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {selectedDay ? `${MONTHS[month]} ${selectedDay}` : "Select a day"}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No events on this day</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border">
                    {ev.type === "project" ? <Target className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" /> : <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-xs font-medium text-foreground">{ev.label}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{ev.type} deadline</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PremiumCard>

          {/* Upcoming deadlines */}
          <PremiumCard className="mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming Deadlines</h3>
            <div className="space-y-2">
              {events
                .filter(e => e.date >= today)
                .sort((a, b) => a.date - b.date)
                .slice(0, 5)
                .map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${ev.color}`} />
                    <span className="text-foreground flex-1 truncate">{ev.label}</span>
                    <span className="text-muted-foreground shrink-0">{ev.date.toLocaleDateString()}</span>
                  </div>
                ))}
              {events.filter(e => e.date >= today).length === 0 && (
                <p className="text-xs text-muted-foreground">No upcoming deadlines</p>
              )}
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
