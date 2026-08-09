"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Plus, CheckCircle2, Clock
} from "lucide-react";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const today = () => setCurrentDate(new Date());

  // Dummy tasks for visualization
  const dummyTasks = [
    { day: 5, title: "Database Migration", type: "task" },
    { day: 12, title: "Q3 Planning", type: "event" },
    { day: 12, title: "Review PR #45", type: "task" },
    { day: 18, title: "Client Demo", type: "event" },
    { day: 25, title: "Launch V2", type: "milestone" },
  ];

  const renderCells = () => {
    const cells = [];
    
    // Empty cells for padding
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="min-h-[120px] bg-muted/5 border-b border-r border-border/50 p-2 opacity-30" />);
    }
    
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = 
        day === new Date().getDate() && 
        currentDate.getMonth() === new Date().getMonth() && 
        currentDate.getFullYear() === new Date().getFullYear();
        
      const dayTasks = dummyTasks.filter(t => t.day === day);
        
      cells.push(
        <div key={`day-${day}`} className={`min-h-[120px] bg-card border-b border-r border-border/50 p-2 transition-colors hover:bg-accent/30 group ${isToday ? 'bg-gold/5' : ''}`}>
          <div className="flex items-center justify-between">
            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${isToday ? 'bg-gold text-black' : 'text-foreground group-hover:text-gold transition-colors'}`}>
              {day}
            </span>
            <button className="w-6 h-6 rounded hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="mt-2 flex flex-col gap-1.5">
            {dayTasks.map((task, idx) => (
              <div 
                key={idx} 
                className={`text-[10px] font-semibold px-1.5 py-1 rounded cursor-pointer truncate ${
                  task.type === "task" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                  task.type === "event" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                  "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                }`}
              >
                {task.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Fill remaining cells for grid
    const totalCells = cells.length;
    const remaining = 42 - totalCells; // 6 rows of 7
    for (let i = 0; i < remaining; i++) {
      cells.push(<div key={`empty-end-${i}`} className="min-h-[120px] bg-muted/5 border-b border-r border-border/50 p-2 opacity-30" />);
    }
    
    return cells;
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      
      {/* Header */}
      <div className="shrink-0 px-6 py-6 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-gold" />
              Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Schedule and view tasks, deadlines, and milestones.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={today} className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-accent text-foreground text-sm font-medium transition-colors">
              Today
            </button>
            <div className="flex items-center rounded-lg border border-border bg-card overflow-hidden">
              <button onClick={prevMonth} className="h-9 px-3 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors border-r border-border">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth} className="h-9 px-3 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Tasks</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Events</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Milestones</div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto bg-muted/10 p-6">
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/30 shrink-0">
            {daysOfWeek.map(day => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/50 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          
          {/* Cells */}
          <div className="grid grid-cols-7 flex-1">
            {renderCells()}
          </div>
        </div>
      </div>

    </div>
  );
}
