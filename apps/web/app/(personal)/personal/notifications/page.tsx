"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";

type Notification = { id: string; title?: string; message?: string; createdAt?: string; isRead?: boolean };

export default function NotificationCenterPage() {
  const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => { void apiClient.get("/notifications").then((res) => setItems(res.data?.data ?? [])).catch(() => setItems([])); }, []);
  const markAll = async () => { await apiClient.post("/notifications/read-all"); setItems((current) => current.map((item) => ({ ...item, isRead: true }))); };
  return <div className="min-h-full p-6 md:p-10"><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">System</p><h1 className="mt-2 text-3xl font-bold">Notifications</h1></div><button onClick={() => void markAll()} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">Mark all read</button></div><div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{items.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No notifications yet.</p> : items.map((item) => <div key={item.id} className={`p-5 ${item.isRead ? "" : "bg-accent/40"}`}><p className="text-sm font-semibold">{item.title ?? "Notification"}</p><p className="mt-1 text-sm text-muted-foreground">{item.message ?? ""}</p>{item.createdAt && <p className="mt-2 text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>}</div>)}</div></div></div>;
}
