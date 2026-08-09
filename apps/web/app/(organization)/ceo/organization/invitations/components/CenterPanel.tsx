import React from "react";
import { PremiumCard } from "@/components/ui/premium-card";
import { CheckCircle2, Clock, Mail, Info, Activity, MonitorPlay } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface CenterPanelProps {
  invitation: any | null;
}

export function CenterPanel({ invitation }: CenterPanelProps) {
  if (!invitation) {
    return (
      <PremiumCard className="h-full min-h-[400px] flex flex-col items-center justify-center text-center border-dashed">
        <Activity className="w-10 h-10 text-muted-foreground/30 mb-4" />
        <h3 className="text-[16px] font-medium text-foreground">Activity Feed</h3>
        <p className="text-[14px] text-muted-foreground mt-1 max-w-[200px]">
          Invitation timeline and activity will appear here.
        </p>
      </PremiumCard>
    );
  }

  const steps = [
    { label: "Invitation Created", status: ["Pending", "Queued", "Sending", "Delivered", "Opened", "Accepted", "Activated"], date: invitation.createdAt },
    { label: "Email Delivered", status: ["Delivered", "Opened", "Accepted", "Activated"], date: invitation.emailDeliveryTime },
    { label: "Email Opened", status: ["Opened", "Accepted", "Activated"], date: invitation.emailOpenTime },
    { label: "Invitation Accepted", status: ["Accepted", "Activated"], date: null },
    { label: "Workspace Activated", status: ["Activated"], date: null },
  ];

  const currentStatus = invitation.status;

  return (
    <PremiumCard className="h-full flex flex-col">
      <div className="flex items-center mb-6">
        <MonitorPlay className="w-5 h-5 mr-2 text-primary" />
        <h2 className="text-[16px] font-semibold tracking-tight">Live Timeline</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 space-y-6 relative">
        <div className="absolute top-2 bottom-2 left-[15px] w-[2px] bg-border" />
        
        {steps.map((step, index) => {
          const isCompleted = step.status.includes(currentStatus) || 
                              (currentStatus === 'Activated'); // Failsafe
          const isCurrent = step.label === "Invitation Created" && currentStatus === "Pending"; // simple fallback
          
          return (
            <div key={index} className="relative flex gap-4">
              <div className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 bg-background",
                isCompleted ? "border-primary text-primary" : "border-border text-muted-foreground"
              )}>
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <div className="flex-1 pt-1">
                <h4 className={cn("text-[14px] font-medium", isCompleted ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </h4>
                {step.date && isCompleted && (
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {new Date(step.date).toLocaleString()}
                  </p>
                )}
                {!step.date && isCompleted && (
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Completed
                  </p>
                )}
                {!isCompleted && (
                  <p className="text-[12px] text-muted-foreground/50 mt-0.5">
                    Waiting...
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
}
