import React from "react";
import { cn } from "@/shared/lib/utils";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({ children, className, ...props }) => {
  return (
    <div className={cn("premium-card", className)} {...props}>
      {children}
    </div>
  );
};
