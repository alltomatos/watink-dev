import React from "react";
import { cn } from "@/lib/utils";

interface InfoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerColor?: string;
  headerActions?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  noPadding?: boolean;
}

/**
 * InfoCard Component
 *
 * Card para exibir informações detalhadas com header, body e footer.
 * Ideal para configurações, detalhes de registro, formulários, etc.
 */
const InfoCard = ({
  title,
  subtitle,
  headerColor,
  headerActions,
  children,
  actions,
  noPadding = false,
  className,
  ...rest
}: InfoCardProps) => {
  return (
    <div
      className={cn(
        "bg-[var(--bg-surface)] rounded-2xl border-none shadow-[0px_4px_20px_var(--shadow-medium)] overflow-hidden",
        className
      )}
      {...rest}
    >
      {title && (
        <div
          className="px-6 py-4 bg-[var(--bg-surface)]"
          style={{
            borderLeft: `4px solid ${headerColor ?? "var(--status-info)"}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg text-[var(--text-primary)]">
                {title}
              </p>
              {subtitle && (
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {headerActions && (
              <div className="flex gap-2">{headerActions}</div>
            )}
          </div>
        </div>
      )}

      <div className={cn(noPadding ? "p-0" : "p-6")}>{children}</div>

      {actions && (
        <div className="px-6 py-4 bg-[var(--bg-surface)] border-t border-[var(--border-default)] flex justify-end gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

export default InfoCard;
