"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";

interface DashboardGreetingProps {
  greetingName: string;
  className?: string;
}

export function DashboardGreeting({ greetingName, className = "" }: DashboardGreetingProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    if (!now) return "Hello";
    const hour = now.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 ${className}`}>
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
          ManMadhan Progress
        </p>
        <h1 className="text-[26px] sm:text-[30px] font-bold text-foreground tracking-tight leading-none">
          {getGreeting()}{greetingName ? `, ${greetingName}` : ""}
        </h1>
      </div>
      <div className="sm:text-right pb-px">
        <p className="text-[17px] font-semibold text-foreground font-mono tabular-nums leading-none">
          {now ? format(now, "HH:mm:ss") : "——:——:——"}
        </p>
        <p className="text-[11px] text-muted-foreground font-medium leading-none mt-1.5">
          {now ? format(now, "EEEE, d MMM yyyy") : ""}
        </p>
      </div>
    </div>
  );
}
