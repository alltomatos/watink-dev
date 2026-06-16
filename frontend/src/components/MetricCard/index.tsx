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
    bg: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 4%, transparent) 0%, color-mix(in srgb, var(--color-primary) 15%, transparent) 100%)",
    icon: "text-[var(--color-primary)]",
    text: "text-[var(--color-primary)]"
  },
  success: {
    bg: "linear-gradient(135deg, color-mix(in srgb, var(--color-success) 10%, transparent) 0%, color-mix(in srgb, var(--color-success) 20%, transparent) 100%)",
    icon: "text-[var(--color-success)]",
    text: "text-[var(--color-success)]"
  },
  warning: {
    bg: "linear-gradient(135deg, color-mix(in srgb, var(--color-warning) 10%, transparent) 0%, color-mix(in srgb, var(--color-warning) 20%, transparent) 100%)",
    icon: "text-[var(--color-warning)]",
    text: "text-[var(--color-warning)]"
  },
  error: {
    bg: "linear-gradient(135deg, color-mix(in srgb, var(--color-error) 10%, transparent) 0%, color-mix(in srgb, var(--color-error) 20%, transparent) 100%)",
    icon: "text-[var(--color-error)]",
    text: "text-[var(--color-error)]"
  },
  info: {
    bg: "linear-gradient(135deg, color-mix(in srgb, var(--color-info) 4%, transparent) 0%, color-mix(in srgb, var(--color-info) 15%, transparent) 100%)",
    icon: "text-[var(--color-info)]",
    text: "text-[var(--color-info)]"
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
        "wt-metric relative overflow-visible h-full hover:translate-y-[-6px] transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] border border-[var(--border)] rounded-2xl shadow-sm hover:shadow-xl bg-[var(--card)] text-[var(--card-foreground)]",
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
        <div className="wt-metric-label text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-1">
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
                  ? "text-[var(--color-success)] bg-[var(--color-success-bg)]"
                  : "text-[var(--color-error)] bg-[var(--color-error-bg)]"
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
