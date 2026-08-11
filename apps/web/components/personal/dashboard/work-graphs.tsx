import React from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Activity } from "lucide-react";

export function WorkGraphs({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm h-full flex flex-col justify-center items-center text-center">
        <Activity className="w-8 h-8 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm font-medium text-foreground">Not enough work data yet.</p>
      </div>
    );
  }

  const formattedData = [...data].reverse().map(d => ({
    ...d,
    day: format(new Date(d.date), "EEE"),
  }));

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">7-Day Work Graph</h3>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Actual (min)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            <span>Planned (min)</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Line 
              type="monotone" 
              dataKey="plannedMinutes" 
              stroke="var(--muted-foreground)" 
              className="opacity-40"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--muted-foreground)', opacity: 0.4 }}
            />
            <Line 
              type="monotone" 
              dataKey="actualMinutes" 
              stroke="#f59e0b" // amber-500
              strokeWidth={2}
              dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h > 0 ? String(h).padStart(2, "0") + "h" : ""} ${String(m).padStart(2, "0")}m`.trim();
}
