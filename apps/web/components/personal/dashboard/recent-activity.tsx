import React from "react";
import { format, isToday, isYesterday } from "date-fns";
import Link from "next/link";

export interface DashboardActivityLog {
  id: string;
  eventType: string;
  details: string | null;
  createdAt: string;
}

interface RecentActivityProps {
  activities?: DashboardActivityLog[];
  className?: string;
}

const EVENT_META: Record<string, { label: string; color: string }> = {
  complete: { label: "Completed", color: "#22C55E" },
  start:    { label: "Started",   color: "#3B82F6" },
  running:  { label: "Started",   color: "#3B82F6" },
  create:   { label: "Created",   color: "#A855F7" },
  update:   { label: "Updated",   color: "#D4AF37" },
  edit:     { label: "Updated",   color: "#D4AF37" },
  delete:   { label: "Deleted",   color: "#EF4444" },
  remove:   { label: "Deleted",   color: "#EF4444" },
};

function getMeta(eventType: string) {
  const t = eventType.toLowerCase();
  for (const [key, val] of Object.entries(EVENT_META)) {
    if (t.includes(key)) return val;
  }
  return { label: "Activity", color: "#71717A" };
}

function fmtTime(dateStr: string) {
  const d = new Date(dateStr);
  const t = format(d, "h:mm a");
  if (isToday(d))     return `Today · ${t}`;
  if (isYesterday(d)) return `Yesterday · ${t}`;
  return `${format(d, "MMM d")} · ${t}`;
}

export function RecentActivity({ activities = [], className = "" }: RecentActivityProps) {
  const list = activities.slice(0, 4);

  return (
    <div className={`bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">
          Recent Activity
        </span>
        <Link href="/personal/timeline" className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
          View all
        </Link>
      </div>

      <div className="relative flex flex-col">
        {/* timeline track */}
        <div className="absolute left-[3px] top-2 bottom-2 w-px bg-border" />

        {list.length === 0 ? (
          <p className="text-[13px] text-muted-foreground pl-6">No recent activity</p>
        ) : (
          list.map((item, i) => {
            const meta = getMeta(item.eventType);
            return (
              <div key={item.id || i} className="flex items-start gap-4 mb-5 last:mb-0 relative z-10">
                {/* dot */}
                <div
                  className="w-[7px] h-[7px] rounded-full shrink-0 mt-1.5"
                  style={{ backgroundColor: meta.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate leading-none mb-0.5">
                    {meta.label}
                  </p>
                  <p className="text-[13px] text-muted-foreground truncate mb-1">
                    {item.details || item.eventType}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    {fmtTime(item.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
