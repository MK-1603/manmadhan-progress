"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Target } from "lucide-react";

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Start with current week
  const [currentDate, setCurrentDate] = useState(new Date());

  // Simple Week View generator
  const getWeekDates = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const startOfWeek = new Date(d.setDate(diff));
    startOfWeek.setHours(0,0,0,0);
    
    return Array.from({ length: 7 }).map((_, i) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(dayDate.getDate() + i);
      return dayDate;
    });
  };

  const weekDates = getWeekDates(currentDate);
  const startDateStr = weekDates[0].toISOString();
  const endDateStr = new Date(weekDates[6].getTime() + 86400000).toISOString();

  const fetchCalendarEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/personal/calendar?start=${startDateStr}&end=${endDateStr}`);
      setEvents(response.data.data);
    } catch (err) {
      console.error("Failed to load calendar events", err);
    } finally {
      setLoading(false);
    }
  }, [startDateStr, endDateStr]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear();
  };

  return (
    <div className="w-full h-full flex flex-col p-6 sm:p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight tracking-tight mb-2">
            Calendar
          </h1>
          <p className="text-[16px] text-[#52525B] dark:text-[#A1A1AA]">
            {weekDates[0].toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-4 h-10 rounded-lg border border-[#E5E7EB] dark:border-[#242424] text-[#171717] dark:text-[#F5F5F5] text-sm font-semibold hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors mr-2"
          >
            Today
          </button>
          <button 
            onClick={prevWeek}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#E5E7EB] dark:border-[#242424] text-[#171717] dark:text-[#F5F5F5] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextWeek}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#E5E7EB] dark:border-[#242424] text-[#171717] dark:text-[#F5F5F5] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="flex-1 bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl overflow-hidden flex flex-col">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-[#E5E7EB] dark:border-[#242424] bg-[#FAFAFA] dark:bg-[#0A0A0A]">
          {weekDates.map((date, i) => (
            <div key={i} className={`p-4 text-center border-r border-[#E5E7EB] dark:border-[#242424] last:border-0 ${isToday(date) ? 'bg-[#D99A00]/5 dark:bg-[#F5B800]/5' : ''}`}>
              <div className="text-[12px] uppercase font-bold tracking-wider text-[#A1A1AA] mb-1">
                {date.toLocaleDateString(undefined, { weekday: 'short' })}
              </div>
              <div className={`text-[20px] font-bold ${isToday(date) ? 'text-[#D99A00] dark:text-[#F5B800]' : 'text-[#171717] dark:text-[#F5F5F5]'}`}>
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Days Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <LoaderCircle className="w-8 h-8 text-[#A1A1AA] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 flex-1 min-h-[600px] divide-x divide-[#E5E7EB] dark:divide-[#242424]">
            {weekDates.map((date, i) => {
              // Filter events for this day
              const dayEvents = events.filter(e => {
                const eDate = new Date(e.start);
                return eDate.getDate() === date.getDate() && 
                       eDate.getMonth() === date.getMonth() && 
                       eDate.getFullYear() === date.getFullYear();
              });

              return (
                <div key={i} className={`p-2 sm:p-3 flex flex-col gap-2 ${isToday(date) ? 'bg-[#D99A00]/5 dark:bg-[#F5B800]/5' : ''}`}>
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      className={`p-2.5 rounded-lg border text-sm flex flex-col gap-1.5 transition-colors cursor-pointer
                        ${event.type === 'deadline' 
                          ? 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]' 
                          : event.status === 'COMPLETED'
                            ? 'bg-[#16A34A]/10 border-[#16A34A]/20 text-[#16A34A]'
                            : 'bg-[#F4F4F5] dark:bg-[#1D1D1D] border-transparent text-[#171717] dark:text-[#F5F5F5] hover:border-[#A1A1AA] dark:hover:border-[#52525B]'
                        }
                      `}
                    >
                      <div className="font-semibold leading-tight line-clamp-2">{event.title}</div>
                      {!event.allDay && (
                        <div className="flex items-center gap-1 opacity-70 text-[11px] font-medium uppercase tracking-wider">
                          <Clock className="w-3 h-3" />
                          {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {event.type === 'deadline' && (
                        <div className="flex items-center gap-1 opacity-70 text-[11px] font-bold uppercase tracking-wider">
                          <Target className="w-3 h-3" />
                          DEADLINE
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
