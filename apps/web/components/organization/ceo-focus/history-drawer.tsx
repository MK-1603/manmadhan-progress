"use client";

import { useEffect, useMemo } from "react";
import { X, Clock, Folder, Calendar } from "lucide-react";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: any[];
  onSelectSession?: (session: any) => void;
}

function formatShortDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function HistoryDrawer({
  isOpen,
  onClose,
  history = [],
  onSelectSession,
}: HistoryDrawerProps) {
  // Body Scroll Lock & Escape Key Listener
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Group history items chronologically (Today, Yesterday, Earlier)
  const groupedHistory = useMemo(() => {
    if (!history || history.length === 0) return [];

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const todayItems: any[] = [];
    const yesterdayItems: any[] = [];
    const earlierItems: any[] = [];

    history.forEach((item) => {
      if (!item?.startTime) {
        todayItems.push(item);
        return;
      }
      const itemDate = new Date(item.startTime);
      if (isSameDay(itemDate, now)) {
        todayItems.push(item);
      } else if (isSameDay(itemDate, yesterday)) {
        yesterdayItems.push(item);
      } else {
        earlierItems.push(item);
      }
    });

    const groups: { label: string; items: any[] }[] = [];
    if (todayItems.length > 0) groups.push({ label: "TODAY", items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: "YESTERDAY", items: yesterdayItems });
    if (earlierItems.length > 0) groups.push({ label: "EARLIER", items: earlierItems });

    return groups;
  }, [history]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center bg-black/75 backdrop-blur-xs p-0 md:p-6 animate-in fade-in duration-200"
    >
      {/* DESKTOP: Centered Modal (md:max-w-[680px] md:max-h-[80vh]) / MOBILE: Bottom Sheet (max-h-[85dvh] rounded-t-2xl) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-[680px] min-h-[45vh] max-h-[85dvh] md:max-h-[80vh] bg-[#12151D] border-t md:border border-[#212634] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-200 pb-[calc(16px+env(safe-area-inset-bottom,0px))] md:pb-0"
      >
        {/* Mobile Drag Handle Bar */}
        <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1 rounded-full bg-[#374151]" />
        </div>

        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[#1E2330] flex items-center justify-between bg-[#13161F] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#D4B12F]/10 text-[#D4B12F]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-white">
                Session History
              </h2>
              <p className="text-[11px] text-[#8A92A6] mt-0.5">
                Focus execution history & session log stream
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close History"
            className="p-1.5 rounded-lg text-[#8A92A6] hover:text-white hover:bg-[#181D28] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Grouped History List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {groupedHistory.length > 0 ? (
            groupedHistory.map((group) => (
              <div key={group.label} className="space-y-2">
                {/* Date Section Header */}
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D4B12F] pt-1 pb-1 border-b border-[#1E2330] flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-[#D4B12F]" />
                  <span>{group.label}</span>
                </div>

                {/* Session Items Rows */}
                <div className="space-y-2">
                  {group.items.map((s: any, idx: number) => (
                    <div
                      key={s.id || idx}
                      onClick={() => onSelectSession?.(s)}
                      className="p-3.5 rounded-xl border border-[#212634] bg-[#181D28] hover:border-[#D4B12F]/40 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#8A92A6]">
                            {s.startTime
                              ? new Date(s.startTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : "10:14 AM"}
                          </span>
                          {s.category && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#13161F] text-[#8A92A6] border border-[#212634]">
                              {s.category}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-[#D4B12F] transition-colors">
                          {s.displayTitle || s.title || "Focus Activity"}
                        </h4>

                        {s.projectName && (
                          <p className="text-[11px] text-[#8A92A6] flex items-center gap-1">
                            <Folder className="w-3 h-3 text-[#8A92A6]" />
                            <span className="truncate">{s.projectName}</span>
                          </p>
                        )}
                      </div>

                      {/* Right Column: Duration & Status Badge */}
                      <div className="text-right shrink-0 space-y-1">
                        <span className="text-xs font-mono font-bold text-[#D4B12F] block">
                          {formatShortDuration(s.durationSeconds || 0)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {s.outcome || s.status || "Completed"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-14 text-center space-y-2">
              <Clock className="w-8 h-8 text-[#8A92A6]/40 mx-auto" />
              <p className="text-xs font-semibold text-white">No focus sessions recorded yet.</p>
              <p className="text-[11px] text-[#8A92A6] max-w-xs mx-auto">
                Start a focus session to begin building your execution history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
