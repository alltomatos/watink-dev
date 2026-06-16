import React from "react";
import clsx from "clsx";
import { Card } from "../ui/card";

export interface BaseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  actions?: React.ReactNode;
  hoverEffect?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const BaseCard: React.FC<BaseCardProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  actions,
  hoverEffect = false,
  onClick,
  className,
  children,
  style,
  ...rest
}) => {
  const isClickable = !!onClick;

  return (
    <Card
      onClick={onClick}
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] transition-all duration-300 ease-[var(--ease-out,cubic-bezier(0.25,0.8,0.25,1))]",
        hoverEffect && "shadow-md hover:shadow-lg hover:scale-[1.01]",
        isClickable ? "cursor-pointer hover:border-[var(--primary)]" : "cursor-default",
        className
      )}
      style={style}
      {...rest}
    >
      {(title || icon || actions) && (
        <div
          className={clsx(
            "flex items-center justify-between p-4",
            title && "border-b border-[var(--border)] border-opacity-50"
          )}
        >
          <div className="flex items-center gap-4">
            {icon && (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                style={{
                  backgroundColor: iconColor || "var(--primary)"
                }}
              >
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="font-semibold text-lg leading-tight text-[var(--foreground)]">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </Card>
  );
};

export default BaseCard;
