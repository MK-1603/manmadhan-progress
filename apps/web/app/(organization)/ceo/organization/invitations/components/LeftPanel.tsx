import React from "react";
import { PremiumCard } from "@/components/ui/premium-card";
import { User, Shield, Briefcase, Hash, Calendar, Building, Info } from "lucide-react";

interface LeftPanelProps {
  invitation: any | null;
}

export function LeftPanel({ invitation }: LeftPanelProps) {
  if (!invitation) {
    return (
      <PremiumCard className="h-full min-h-[400px] flex flex-col items-center justify-center text-center border-dashed">
        <Info className="w-10 h-10 text-muted-foreground/30 mb-4" />
        <h3 className="text-[16px] font-medium text-foreground">No Invitation Selected</h3>
        <p className="text-[14px] text-muted-foreground mt-1 max-w-[200px]">
          Select an invitation from the list to view its complete details.
        </p>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard className="h-full flex flex-col space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg shrink-0">
          {invitation.name ? invitation.name.charAt(0).toUpperCase() : "?"}
        </div>
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight">{invitation.name || "Unknown"}</h2>
          <p className="text-[14px] text-muted-foreground">{invitation.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Invitation Details</h3>
        
        <div className="grid gap-4">
          <div className="flex items-center text-[14px]">
            <Shield className="w-4 h-4 mr-3 text-muted-foreground shrink-0" />
            <span className="w-24 text-muted-foreground shrink-0">Role</span>
            <span className="font-medium truncate">{invitation.role}</span>
          </div>
          <div className="flex items-center text-[14px]">
            <Briefcase className="w-4 h-4 mr-3 text-muted-foreground shrink-0" />
            <span className="w-24 text-muted-foreground shrink-0">Department</span>
            <span className="font-medium truncate">{invitation.departmentId || "—"}</span>
          </div>
          <div className="flex items-center text-[14px]">
            <Hash className="w-4 h-4 mr-3 text-muted-foreground shrink-0" />
            <span className="w-24 text-muted-foreground shrink-0">Batch</span>
            <span className="font-medium truncate">{invitation.batchNumber || "—"}</span>
          </div>
          <div className="flex items-center text-[14px]">
            <Calendar className="w-4 h-4 mr-3 text-muted-foreground shrink-0" />
            <span className="w-24 text-muted-foreground shrink-0">Created</span>
            <span className="font-medium truncate">
              {invitation.createdAt ? new Date(invitation.createdAt).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border mt-auto">
        <h3 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-4">Activation Progress</h3>
        <div className="enterprise-progress-bg">
          <div 
            className="enterprise-progress-fill" 
            style={{ 
              width: invitation.status === 'Activated' ? '100%' : 
                     invitation.status === 'Accepted' ? '60%' : 
                     invitation.status === 'Opened' ? '40%' : '10%' 
            }}
          />
        </div>
        <p className="text-[12px] text-muted-foreground mt-2 text-right">
          Current: {invitation.status}
        </p>
      </div>
    </PremiumCard>
  );
}
