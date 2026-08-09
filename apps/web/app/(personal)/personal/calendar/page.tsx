"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, RefreshCw } from "lucide-react";
import apiClient from "@/lib/api-client";

type CalendarItem = { id: string; title: string; date: string; kind: "Task" | "Reminder" };

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCalendar = async () => {
    setLoading(true);
    setError(null);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) throw new Error("No workspace selected");
      const [dashboard, reminders] = await Promise.all([
        apiClient.get(`/dashboard?workspaceId=${workspaceId}`),
        apiClient.get(`/personal/reminders?workspaceId=${workspaceId}`),
      ]);
      const tasks = dashboard.data?.data?.priorities ?? [];
      const upcoming = tasks
        .filter((task: { deadline?: string | null }) => task.deadline)
        .map((task: { id: string; title: string; deadline: string }) => ({ id: task.id, title: task.title, date: task.deadline, kind: "Task" as const }));
      const reminderItems = (reminders.data?.data ?? [])
        .filter((item: { remindAt?: string; isCompleted?: boolean }) => item.remindAt && !item.isCompleted)
        .map((item: { id: string; title: string; remindAt: string }) => ({ id: item.id, title: item.title, date: item.remindAt, kind: "Reminder" as const }));
      setItems([...upcoming, ...reminderItems]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load calendar data");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCalendar(); }, []);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [cursor]);

  const monthItems = items.filter((item) => {
    const date = new Date(item.date);
    return date.getFullYear() === cursor.getFullYear() && date.getMonth() === cursor.getMonth();
  });
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const today = new Date();

  return (
    <div className="min-h-full bg-background text-foreground p-4 md:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Personal Calendar</p><h1 className="mt-1 text-2xl font-bold">{cursor.toLocaleDateString([], { month: "long", year: "numeric" })}</h1></div>
          <div className="flex items-center gap-2"><button onClick={() => setCursor(new Date())} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Today</button><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-lg p-2 hover:bg-accent" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-lg p-2 hover:bg-accent" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button><button onClick={() => void loadCalendar()} className="rounded-lg p-2 hover:bg-accent" aria-label="Refresh calendar"><RefreshCw className="h-4 w-4" /></button></div>
        </header>
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">{error}. Select a workspace and try again.</div>}
        <div className="grid min-h-[calc(100dvh-170px)] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card xl:grid-cols-[1fr_340px]">
          <section className="min-w-0"><div className="grid grid-cols-7 border-b border-border">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="p-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{day}</div>)}</div><div className="grid grid-cols-7 auto-rows-[minmax(90px,1fr)]">{days.map((day) => { const dayItems = items.filter((item) => isSameDay(new Date(item.date), day)); return <div key={day.toISOString()} className={`min-w-0 border-b border-r border-border p-2 ${day.getMonth() !== cursor.getMonth() ? "opacity-40" : ""}`}><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isSameDay(day, today) ? "bg-gold text-background" : "text-muted-foreground"}`}>{day.getDate()}</span><div className="mt-1 space-y-1">{dayItems.map((item) => <div key={item.id} className="truncate rounded bg-gold/10 px-1.5 py-1 text-[10px] font-semibold text-gold" title={item.title}>{item.title}</div>)}</div></div>; })}</div></section>
          <aside className="border-t border-border p-5 xl:border-l xl:border-t-0"><div className="mb-5 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold" /><h2 className="text-xs font-bold uppercase tracking-wider">This month</h2></div>{loading ? <p className="text-sm text-muted-foreground">Loading calendar…</p> : monthItems.length === 0 ? <div className="rounded-xl border border-dashed border-border p-5 text-center"><p className="text-sm font-semibold">No scheduled items</p><p className="mt-1 text-xs text-muted-foreground">Tasks with due dates and active reminders will appear here.</p></div> : <div className="space-y-3">{monthItems.sort((a, b) => +new Date(a.date) - +new Date(b.date)).map((item) => <div key={item.id} className="rounded-xl border border-border p-3"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" />{new Date(item.date).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {item.kind}</p></div>)}</div>}</aside>
        </div>
      </div>
    </div>
  );
}
