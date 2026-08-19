import React from "react";
import { cn } from "../../shared/lib/utils";

export type NumericSize = "kpi" | "percentage" | "card" | "secondary" | "table" | "meta";
export type NumericWeight = 400 | 450 | 500 | 600;

export interface NumericValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  value?: number | string | React.ReactNode;
  size?: NumericSize;
  weight?: NumericWeight;
  unit?: string;
  className?: string;
  as?: React.ElementType;
}

const sizeClasses: Record<NumericSize, string> = {
  kpi: "numeric-kpi",
  percentage: "numeric-percentage",
  card: "numeric-card",
  secondary: "numeric-secondary",
  table: "numeric-table",
  meta: "numeric-meta",
};

/**
  * Formats string/number with Geist font, tabular numbers, slashed zero, and restrained font weight.
  * If the value contains a percentage symbol '%' or unit, it automatically formats the unit slightly smaller (0.65em).
  */
export function NumericValue({
  value,
  children,
  size = "card",
  weight = 500,
  unit,
  className,
  as: Component = "span",
  ...props
}: NumericValueProps) {
  const content = value !== undefined ? value : children;

  // Render React nodes or non-string/numbers directly with font-numeric
  if (typeof content !== "string" && typeof content !== "number") {
    return (
      <Component className={cn("font-numeric inline-flex items-baseline", sizeClasses[size], className)} {...props}>
        {content}
      </Component>
    );
  }

  const strVal = String(content).trim();

  // If unit is explicitly provided
  if (unit) {
    return (
      <Component className={cn("font-numeric inline-flex items-baseline", sizeClasses[size], className)} {...props}>
        <span className="metric-value">{strVal}</span>
        <span className="metric-unit">{unit}</span>
      </Component>
    );
  }

  // Handle % symbol in string (e.g. "100%", "06%", "85.5%")
  if (strVal.endsWith("%")) {
    const numPart = strVal.slice(0, -1);
    return (
      <Component className={cn("font-numeric inline-flex items-baseline", sizeClasses[size], className)} {...props}>
        <span className="metric-value">{numPart}</span>
        <span className="metric-unit">%</span>
      </Component>
    );
  }

  // Handle strings with units at the end like "12 hrs", "45 tasks", "3.5h"
  const unitMatch = strVal.match(/^([\d.,/-]+)\s*([a-zA-Z]+|\/day|\/wk)?$/);
  if (unitMatch && unitMatch[2]) {
    return (
      <Component className={cn("font-numeric inline-flex items-baseline", sizeClasses[size], className)} {...props}>
        <span className="metric-value">{unitMatch[1]}</span>
        <span className="metric-unit">{unitMatch[2]}</span>
      </Component>
    );
  }

  return (
    <Component className={cn("font-numeric", sizeClasses[size], className)} {...props}>
      {strVal}
    </Component>
  );
}

export function KPIValue({ value, unit, className, ...props }: Omit<NumericValueProps, "size">) {
  return <NumericValue value={value} unit={unit} size="kpi" className={className} {...props} />;
}

export function PercentageValue({ value, className, ...props }: Omit<NumericValueProps, "size">) {
  const formattedVal = typeof value === "number" ? `${value}%` : String(value || "");
  return <NumericValue value={formattedVal} size="percentage" className={className} {...props} />;
}

export function MetricValue({ value, size = "card", className, ...props }: NumericValueProps) {
  return <NumericValue value={value} size={size} className={className} {...props} />;
}
