import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTagColorStyles } from "../../helpers/tagColors";

interface Tag {
  id: number | string;
  name: string;
  color?: string;
  icon?: string;
}

interface TagChipProps {
  tag: Tag;
  size?: "small" | "medium" | "large";
  onRemove?: (tag: Tag) => void;
  onClick?: (tag: Tag) => void;
  showIcon?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const sizeClasses = {
  small:  "text-[0.65rem] px-1.5 py-0.5",
  medium: "text-[0.75rem] px-2 py-0.5",
  large:  "text-[0.85rem] px-2.5 py-1",
};

const TagChip = ({ tag, size = "medium", onRemove, onClick, showIcon = false, className, style }: TagChipProps) => {
  const colors = getTagColorStyles(tag.color || "gray");

  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(tag)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(tag); }}
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium cursor-pointer transition-[filter] duration-200 hover:brightness-95 select-none",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: colors.background, color: colors.text, ...style }}
    >
      {showIcon && tag.icon && <span aria-hidden>{tag.icon}</span>}
      {tag.name}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remover tag ${tag.name}`}
          onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
          className="ml-0.5 -mr-0.5 rounded-sm opacity-70 hover:opacity-100 focus-visible:ring-1"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

export default TagChip;
