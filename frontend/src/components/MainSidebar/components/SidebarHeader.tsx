/* @jsxImportSource react */
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "@/lib/utils";
import { getBackendUrl } from "../../../helpers/urlUtils";
import type { SidebarHeaderProps } from "../mainSidebarTypes";

const getHeaderClass = (isLight: boolean): string =>
  cn(
    "flex items-center h-16 min-h-16 border-b px-3 gap-2",
    isLight ? "border-[var(--border-sidebar)]" : "border-[var(--slate-700)]"
  );

const getToggleClass = (isLight: boolean): string =>
  cn(
    "shrink-0 rounded-full h-8 w-8",
    isLight
      ? "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5"
      : "text-[var(--slate-400)] hover:text-white hover:bg-white/10"
  );

const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  collapsed,
  isLightSidebar,
  logoEnabled,
  systemLogo,
  systemTitle,
  onToggle,
}) => {
  return (
    <div className={getHeaderClass(isLightSidebar)}>
      <div className={cn("flex flex-1 items-center overflow-hidden", collapsed ? "justify-center" : "justify-start pl-1")}>
        {collapsed ? (
          <div className="w-8 h-8 bg-primary rounded-full shrink-0" />
        ) : logoEnabled && systemLogo ? (
          <img
            src={getBackendUrl(systemLogo)}
            alt={systemTitle}
            className="h-8 w-auto object-contain brightness-0 invert opacity-90"
          />
        ) : (
          <h1 className={cn("text-lg font-bold truncate", isLightSidebar ? "text-[var(--text-primary)]" : "text-white")}>
            {systemTitle}
          </h1>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className={getToggleClass(isLightSidebar)}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </Button>
    </div>
  );
};

export default SidebarHeader;
