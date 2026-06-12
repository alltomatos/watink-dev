import React from "react";
import clsx from "clsx";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
}

const sizeMap = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-[11px]",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-[22px]"
};

const dotSizeMap = {
  xs: "w-2 h-2 bottom-0 right-0 border-[1.5px]",
  sm: "w-2.5 h-2.5 bottom-0 right-0 border-[1.5px]",
  md: "w-3 h-3 bottom-0.5 right-0.5 border-2",
  lg: "w-3.5 h-3.5 bottom-0.5 right-0.5 border-2",
  xl: "w-4 h-4 bottom-1 right-1 border-2"
};

const getInitials = (name: string): string => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  const first = parts[0]?.charAt(0) || "";
  const second = parts[1]?.charAt(0) || "";
  return (first + second).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  online,
  className,
  style,
  ...rest
}) => {
  const [imgError, setImgError] = React.useState(false);
  const initials = getInitials(name);
  const displayImage = src && !imgError;

  return (
    <div
      className={clsx(
        "wt-avatar relative inline-flex items-center justify-center rounded-full font-bold select-none flex-shrink-0 bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] border border-[hsl(var(--border))] leading-none",
        sizeMap[size] || sizeMap.md,
        className
      )}
      style={style}
      {...rest}
    >
      {displayImage ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}

      {online !== undefined && (
        <span
          className={clsx(
            "wt-avatar-status absolute rounded-full border-[hsl(var(--card))] box-content",
            online ? "bg-[hsl(var(--status-success))]" : "bg-[hsl(var(--text-muted))]",
            dotSizeMap[size] || dotSizeMap.md
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
