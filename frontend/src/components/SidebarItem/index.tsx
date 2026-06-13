/* @jsxImportSource react */
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed?: boolean;
  activeColor?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  to,
  icon,
  label,
  collapsed = false,
  activeColor = "var(--primary)",
}) => {
  const location = useLocation();
  const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const content = (
    <NavLink
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative select-none",
        "hover:bg-accent hover:text-accent-foreground",
        isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      {/* Active Indicator */}
      {isActive && (
        <div 
          className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" 
          style={{ backgroundColor: activeColor }}
        />
      )}
      
      <div className={cn(
        "flex shrink-0 items-center justify-center transition-transform group-hover:scale-110",
        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
      )}>
        {icon}
      </div>

      {!collapsed && (
        <span className="text-sm truncate animate-in fade-in slide-in-from-left-2 duration-300">
          {label}
        </span>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="font-semibold">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

export default SidebarItem;
