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
    bg: "bg-[var(--color-success-bg)]",
    text: "text-[var(--color-success)]",
    dot: "bg-[var(--color-success)]"
  },
  error: {
    bg: "bg-[var(--color-error-bg)]",
    text: "text-[var(--color-error)]",
    dot: "bg-[var(--color-error)]"
  },
  warning: {
    bg: "bg-[var(--color-warning-bg)]",
    text: "text-[var(--color-warning)]",
    dot: "bg-[var(--color-warning)]"
  },
  info: {
    bg: "bg-[var(--color-info-bg)]",
    text: "text-[var(--color-info)]",
    dot: "bg-[var(--color-info)]"
  },
  default: {
    bg: "bg-[var(--secondary)]",
    text: "text-[var(--secondary-foreground)]",
    dot: "bg-[var(--muted-foreground)]"
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
