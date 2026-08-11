"use client";

interface FocusBreakdownBarProps {
  categoryBreakdown: Record<string, number>;
  totalSeconds: number;
}

function formatMinutesOrHours(seconds: number) {
  if (seconds <= 0) return "0m";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = (seconds / 3600).toFixed(1);
  return `${hrs}h`;
}

export function FocusBreakdownBar({ categoryBreakdown, totalSeconds }: FocusBreakdownBarProps) {
  const categories = Object.entries(categoryBreakdown).filter(([_, secs]) => secs > 0);

  if (categories.length === 0 || totalSeconds <= 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        No focus category breakdown available for today.
      </div>
    );
  }

  // Sort by highest time spent
  categories.sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {categories.map(([category, seconds]) => {
        const percentage = Math.round((seconds / totalSeconds) * 100);
        return (
          <div key={category} className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{category}</span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {formatMinutesOrHours(seconds)} ({percentage}%)
              </span>
            </div>
            <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.max(percentage, 3)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
