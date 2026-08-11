import React from "react";
import { AlertCircle, AlertTriangle, Clock } from "lucide-react";

export function AttentionSection({ tasks }: { tasks: any[] }) {
  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const attentionTasks = tasks.filter(t => t.status !== "Completed" && t.deadline).map(t => {
    const d = new Date(t.deadline);
    let type = "DUE_SOON";
    if (d < now) type = "OVERDUE";
    else if (d <= todayEnd) type = "DUE_TODAY";
    
    // In a full implementation, we'd check blockers via dependencies or explicit tags
    if (t.tags?.includes("blocked")) type = "BLOCKED";
    if (t.tags?.includes("risk")) type = "AT_RISK";

    return { ...t, attentionType: type, deadlineDate: d };
  }).filter(t => t.attentionType !== "DUE_SOON")
    .sort((a, b) => {
      const w: Record<string, number> = { "BLOCKED": 4, "OVERDUE": 3, "AT_RISK": 2, "DUE_TODAY": 1 };
      return w[b.attentionType] - w[a.attentionType];
    });

  if (attentionTasks.length === 0) {
    return (
      <div className="flex flex-col gap-4 pb-6">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deadlines</p>
        <div className="text-sm text-muted-foreground">No upcoming deadlines.</div>
      </div>
    );
  }

  const getStyle = (type: string) => {
    switch(type) {
      case "OVERDUE": return "text-red-500";
      case "BLOCKED": return "text-amber-500";
      case "AT_RISK": return "text-amber-500";
      case "DUE_TODAY": return "text-foreground";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deadlines</p>
      <div className="flex flex-col">
        {attentionTasks.slice(0, 5).map(task => (
          <div key={task.id} className="group flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border/40 hover:bg-secondary/30 transition-colors">
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${getStyle(task.attentionType)}`}>{task.title}</span>
            </div>
            <div className="text-xs font-medium text-muted-foreground mt-1 sm:mt-0">
              {task.attentionType.replace("_", " ")} • {task.deadlineDate.toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
