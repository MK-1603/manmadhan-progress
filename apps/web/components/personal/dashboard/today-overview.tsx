import React from "react";
import { format } from "date-fns";
import { Clock, CheckCircle2, Folder, Star } from "lucide-react";



export function TodayOverview({ 
  greetingName,
  kpis
}: { 
  greetingName: string,
  kpis: any
}) {
  const hours = Math.floor((kpis?.focusSecondsToday || 0) / 3600);
  const minutes = Math.floor(((kpis?.focusSecondsToday || 0) % 3600) / 60);

  const completed = kpis?.completedTasksToday || 0;
  const total = kpis?.tasksToday || 0;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const score = kpis?.score !== undefined ? kpis.score : null;



  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Greeting Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {getGreeting()}, {greetingName}! <span className="text-xl sm:text-2xl">👋</span>
          </h1>
        </div>
        <div className="text-left md:text-right">
          <p className="text-sm font-bold text-foreground">{format(new Date(), "EEEE, d MMM yyyy")}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Have a productive day! 🚀</p>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {/* Card 1: Focus Time */}
        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-foreground" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Focus Time Today</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground">
              {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m
            </span>
            <span className="text-sm text-muted-foreground">/ 06h 00m goal</span>
          </div>
          <div className="w-full h-1 bg-border/50 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(((hours * 60 + minutes) / 360) * 100, 100)}%` }} />
          </div>
          <div className="mt-3 text-xs text-muted-foreground font-medium">
            Yesterday: {Math.floor((kpis?.focusSecondsYesterday || 0) / 3600)}h {Math.floor(((kpis?.focusSecondsYesterday || 0) % 3600) / 60)}m
          </div>
        </div>

        {/* Card 2: Tasks Completed */}
        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Tasks Completed</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{completed} / {total}</span>
            <span className="text-sm text-muted-foreground">{progressPercent}% completed</span>
          </div>
          <div className="w-full h-1 bg-border/50 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="mt-3 text-xs text-muted-foreground font-medium">
            Yesterday: {kpis?.tasksCompletedYesterday || 0} / {kpis?.tasksTotalYesterday || 0}
          </div>
        </div>

        {/* Card 3: Projects Active */}
        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Folder className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Projects Active</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{kpis?.activeProjectsCount || 0}</span>
            <span className="text-sm text-muted-foreground">On track</span>
          </div>
          <div className="w-full h-1 bg-border/50 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full w-3/4" />
          </div>
          <div className="mt-3 text-xs text-muted-foreground font-medium">
            Total Projects: {kpis?.totalProjectsCount || (kpis?.activeProjectsCount || 0)}
          </div>
        </div>

        {/* Card 4: Today's Score */}
        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Today's Score</span>
          </div>
          <div className="flex items-baseline gap-2">
            {score !== null ? (
              <>
                <span className="text-2xl font-bold text-foreground">{score} / 10</span>
                <span className="text-sm text-muted-foreground">Keep it up!</span>
              </>
            ) : (
              <span className="text-lg font-semibold text-foreground mt-1">Not available yet</span>
            )}
          </div>
          <div className="w-full h-1 bg-border/50 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: score !== null ? `${(score/10)*100}%` : '0%' }} />
          </div>
          <div className="mt-3 text-xs text-muted-foreground font-medium">
            Yesterday: {kpis?.scoreYesterday !== undefined ? `${kpis.scoreYesterday} / 10` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
