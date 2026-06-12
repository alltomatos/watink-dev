import React from "react";
import clsx from "clsx";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "../ui/card";

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: React.ReactElement;
  color?: "primary" | "success" | "warning" | "error" | "info";
  trend?: {
    value: string;
    positive: boolean;
  };
}

const colorMap = {
  primary: {
    bg: "linear-gradient(135deg, rgba(26, 115, 232, 0.04) 0%, rgba(26, 115, 232, 0.15) 100%)",
    icon: "text-[hsl(var(--action-primary))]",
    text: "text-[hsl(var(--action-primary))]"
  },
  success: {
    bg: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 100%)",
    icon: "text-[hsl(var(--status-success))]",
    text: "text-[hsl(var(--status-success))]"
  },
  warning: {
    bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.2) 100%)",
    icon: "text-[hsl(var(--status-warning))]",
    text: "text-[hsl(var(--status-warning))]"
  },
  error: {
    bg: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%)",
    icon: "text-[hsl(var(--status-error))]",
    text: "text-[hsl(var(--status-error))]"
  },
  info: {
    bg: "linear-gradient(135deg, rgba(26, 115, 232, 0.04) 0%, rgba(26, 115, 232, 0.15) 100%)",
    icon: "text-[hsl(var(--status-info))]",
    text: "text-[hsl(var(--status-info))]"
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  color = "primary",
  trend,
  className,
  ...rest
}) => {
  const currentColors = colorMap[color] || colorMap.primary;

  return (
    <Card
      className={clsx(
        "wt-metric relative overflow-visible h-full hover:translate-y-[-6px] transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] border border-[hsl(var(--border))] rounded-2xl shadow-sm hover:shadow-xl bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]",
        className
      )}
      {...rest}
    >
      <CardContent className="p-6">
        {/* Header with icon */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="wt-metric-icon flex items-center justify-center w-14 h-14 rounded-2xl shadow-sm"
            style={{ background: currentColors.bg }}
          >
            {icon &&
              React.cloneElement(icon, {
                className: clsx(icon.props.className, currentColors.icon, "w-7 h-7")
              })}
          </div>
        </div>

        {/* Label */}
        <div className="wt-metric-label text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-1">
          {label}
        </div>

        {/* Value */}
        <div
          className={clsx(
            "wt-metric-value text-4xl font-extrabold tracking-tight leading-none",
            currentColors.text
          )}
        >
          {value}
        </div>

        {/* Trend */}
        {trend && (
          <div className="flex items-center mt-4">
            <span
              className={clsx(
                "wt-metric-trend inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
                trend.positive
                  ? "text-[hsl(var(--status-success))] bg-[rgba(16,185,129,0.1)]"
                  : "text-[hsl(var(--status-error))] bg-[rgba(239,68,68,0.1)]"
              )}
            >
              {trend.positive ? (
                <TrendingUp className="w-4 h-4 mr-0.5" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-0.5" />
              )}
              {trend.value}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
