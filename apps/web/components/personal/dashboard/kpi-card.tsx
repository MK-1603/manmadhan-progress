import React from "react";
import { Clock, CheckCircle2, Folder, Star, ArrowUp } from "lucide-react";
import { NumericValue } from "../../ui/numeric-value";

interface KpiCardProps {
  title: string;
  value: string | React.ReactNode;
  subtitle: string;
  icon: "clock" | "check" | "folder" | "star";
  trendValue?: string;
  progressPercent?: number;
  type: "sparkline" | "progress" | "trend";
}

export function KpiCard({ title, value, subtitle, icon, trendValue, progressPercent, type }: KpiCardProps) {
  const IconComponent = {
    clock: Clock,
    check: CheckCircle2,
    folder: Folder,
    star: Star,
  }[icon];

  const IconColor = {
    clock: "text-[#16A34A] dark:text-[#22C55E]",
    check: "text-[#2563EB] dark:text-[#3B82F6]",
    folder: "text-[#9333EA] dark:text-[#A855F7]",
    star: "text-[#D99A00] dark:text-[#F5B800]",
  }[icon];

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#242424] rounded-[14px] p-5 flex flex-col justify-between shadow-sm dark:shadow-none hover:bg-[#F3F4F6] dark:hover:bg-[#1D1D1D] transition-colors">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <IconComponent className={`w-4 h-4 ${IconColor}`} />
          <span className="text-[12px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
            {title}
          </span>
        </div>
        <div className="text-[#171717] dark:text-[#F5F5F5] leading-none mb-2">
          <NumericValue size="kpi" value={value} />
        </div>
        
        {trendValue ? (
          <p className="text-[13px] text-[#16A34A] dark:text-[#22C55E] flex items-center gap-1 font-medium">
            <ArrowUp className="w-3.5 h-3.5" />
            {trendValue.replace(/[↑↓]\s*/, '')}
          </p>
        ) : (
          <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA]">{subtitle}</p>
        )}
      </div>

      <div className="mt-6 h-6 flex items-end">
        {type === "progress" && (
          <div className="w-full h-1.5 bg-[#F3F4F6] dark:bg-[#1D1D1D] rounded-full overflow-hidden self-center">
            <div
              className={`h-full rounded-full ${icon === "check" ? "bg-[#3B82F6]" : "bg-[#A855F7]"}`}
              style={{ width: `${progressPercent || 0}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
