/* @jsxImportSource react */
import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { cn } from "@/lib/utils";
import type { ComingSoonItemProps } from "../mainSidebarTypes";

const ComingSoonItem: React.FC<ComingSoonItemProps> = ({ icon, label, collapsed, isLightSidebar }) => {
  const itemClass = cn(
    "flex items-center gap-3 px-3 py-2 rounded-lg opacity-40 cursor-not-allowed select-none",
    collapsed ? "justify-center px-2" : "",
    isLightSidebar ? "text-[var(--text-muted)]" : "text-[var(--slate-400)]"
  );

  const content = (
    <div className={itemClass} aria-disabled="true">
      <div className="flex shrink-0 items-center justify-center">{icon}</div>
      {!collapsed && (
        <span className="flex flex-1 items-center justify-between text-sm truncate">
          {label}
          <span className="ml-1 rounded bg-muted px-1 py-px text-[0.55rem] font-bold uppercase tracking-wide text-muted-foreground">
            breve
          </span>
        </span>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span>{content}</span>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-semibold">
          {label} <span className="ml-1 opacity-60">(em breve)</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

export default ComingSoonItem;
