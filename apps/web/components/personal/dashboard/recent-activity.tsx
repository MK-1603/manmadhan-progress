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

export function RecentActivity({ activities = [], className = "" }: RecentActivityProps) {
  const displayActivities = activities.slice(0, 4);

  const formatActivityTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const timeStr = format(d, "h:mm a");
    if (isToday(d)) return `Today · ${timeStr}`;
    if (isYesterday(d)) return `Yesterday · ${timeStr}`;
    return `${format(d, "MMM d")} · ${timeStr}`;
  };

  const getEventMeta = (eventType: string) => {
    const type = eventType.toLowerCase();
    if (type.includes("complete")) return { action: "Completed", color: "bg-[#22C55E]" };
    if (type.includes("start") || type.includes("running")) return { action: "Started", color: "bg-[#3B82F6]" };
    if (type.includes("create")) return { action: "Created", color: "bg-[#A855F7]" };
    if (type.includes("update") || type.includes("edit")) return { action: "Updated", color: "bg-[#F5B800]" };
    if (type.includes("delete") || type.includes("remove")) return { action: "Deleted", color: "bg-[#EF4444]" };
    return { action: "Activity", color: "bg-[#71717A]" };
  };

  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#242424] rounded-[14px] p-6 flex flex-col h-full shadow-sm dark:shadow-none transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
          RECENT ACTIVITY
        </h2>
        <Link href="/personal/activity" className="text-[12px] font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors">
          View all
        </Link>
      </div>

      <div className="flex-1 flex flex-col relative">
        {/* Timeline track */}
        <div className="absolute left-[3px] top-2 bottom-2 w-px bg-[#E5E7EB] dark:bg-[#242424]" />

        {displayActivities.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-[#71717A]">
            No recent activity
          </div>
        ) : (
          displayActivities.map((item, i) => {
            const meta = getEventMeta(item.eventType);
            return (
              <div key={item.id || i} className="flex items-start gap-4 mb-5 relative z-10">
                {/* Timeline dot */}
                <div 
                  className="relative flex items-center justify-center w-[7px] h-[7px] rounded-full shrink-0 mt-1.5 z-10" 
                  style={{ backgroundColor: meta.color.replace('bg-[', '').replace(']', '') }}
                >
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#171717] dark:text-[#F5F5F5] truncate mb-0.5">
                    {meta.action}
                  </p>
                  <p className="text-[14px] text-[#52525B] dark:text-[#A1A1AA] truncate mb-1">
                    {item.details || item.eventType}
                  </p>
                  <p className="text-[12px] text-[#71717A] dark:text-[#71717A]">
                    {formatActivityTime(item.createdAt)}
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
