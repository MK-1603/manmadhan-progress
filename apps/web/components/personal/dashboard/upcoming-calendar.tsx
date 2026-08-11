import React from "react";
import { format } from "date-fns";
import { formatEnumLabel } from "@/lib/utils/formatters";
import { Calendar as CalendarIcon, Video, MapPin, Clock } from "lucide-react";

export function UpcomingCalendar({ events }: { events: any[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col gap-4 pb-6">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Next Up</p>
        <div className="text-sm text-muted-foreground">No scheduled events.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Next Up</p>
      <div className="flex flex-col">
        {events.slice(0, 3).map((event) => (
          <div key={event.id} className="group flex items-start gap-4 py-3 border-b border-border/40 hover:bg-secondary/30 transition-colors cursor-pointer">
            <div className="w-12 text-xs font-medium text-foreground tabular-nums pt-0.5">
              {format(new Date(event.startDate), "HH:mm")}
            </div>
            
            <div className="flex flex-col flex-1">
              <h4 className="text-sm font-medium text-foreground">{event.title}</h4>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                {event.sourceType && (
                  <span className="opacity-70">{formatEnumLabel(event.sourceType)}</span>
                )}
                {event.description && (
                  <span className="truncate max-w-[150px] opacity-70"> • {event.description}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
