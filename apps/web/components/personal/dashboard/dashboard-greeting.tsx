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
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
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
    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-[28px] sm:text-[34px] font-bold text-[#171717] dark:text-[#F5F5F5] tracking-tight leading-tight">
          {getGreeting()}{greetingName ? `, ${greetingName}` : ""}! <span className="text-2xl">👋</span>
        </h1>
      </div>
      <div className="text-left md:text-right pb-1">
        <p className="text-[18px] sm:text-[20px] font-bold text-[#171717] dark:text-[#F5F5F5] font-mono tabular-nums leading-none mb-1 md:mb-1.5 h-[20px]">
          {now ? format(now, "HH:mm:ss") : "--:--:--"}
        </p>
        <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA] font-medium leading-none h-[12px]">
          {now ? format(now, "EEEE, d MMM yyyy") : ""}
        </p>
      </div>
    </div>
  );
}
