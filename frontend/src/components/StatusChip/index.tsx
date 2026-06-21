import React from "react";
import clsx from "clsx";

export interface StatusChipProps extends React.HTMLAttributes<HTMLDivElement> {
  status: "success" | "error" | "warning" | "info" | "default";
  label: string;
  size?: "sm" | "md" | "lg";
  dot?: boolean;
}

const statusMap = {
  success: {
    bg: "bg-[hsl(var(--status-success-bg))]",
    text: "text-[hsl(var(--status-success-text))]",
    dot: "bg-[hsl(var(--status-success))]"
  },
  error: {
    bg: "bg-[hsl(var(--status-error-bg))]",
    text: "text-[hsl(var(--status-error-text))]",
    dot: "bg-[hsl(var(--status-error))]"
  },
  warning: {
    bg: "bg-[hsl(var(--status-warning-bg))]",
    text: "text-[hsl(var(--status-warning-text))]",
    dot: "bg-[hsl(var(--status-warning))]"
  },
  info: {
    bg: "bg-[hsl(var(--status-info-bg))]",
    text: "text-[hsl(var(--status-info-text))]",
    dot: "bg-[hsl(var(--status-info))]"
  },
  default: {
    bg: "bg-[hsl(var(--status-default-bg))]",
    text: "text-[hsl(var(--status-default-text))]",
    dot: "bg-[hsl(var(--text-muted))]"
  }
};

const sizeMap = {
  sm: "px-2 py-0.5 text-[11px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3.5 py-1.5 text-sm gap-2"
};

const dotSizeMap = {
  sm: "w-1 h-1",
  md: "w-1.5 h-1.5",
  lg: "w-2 h-2"
};

export const StatusChip: React.FC<StatusChipProps> = ({
  status = "default",
  label,
  size = "md",
  dot = true,
  className,
  ...rest
}) => {
  const currentStyles = statusMap[status] || statusMap.default;
  const sizeStyles = sizeMap[size] || sizeMap.md;
  const dotSizeStyles = dotSizeMap[size] || dotSizeMap.md;

  return (
    <div
      className={clsx(
        "wt-chip inline-flex items-center font-semibold rounded-full leading-none select-none transition-colors duration-200",
        currentStyles.bg,
        currentStyles.text,
        sizeStyles,
        className
      )}
      {...rest}
    >
      {dot && (
        <span
          className={clsx(
            "wt-chip-dot rounded-full flex-shrink-0 transition-colors duration-250",
            currentStyles.dot,
            dotSizeStyles
          )}
        />
      )}
      <span>{label}</span>
    </div>
  );
};

export default StatusChip;
