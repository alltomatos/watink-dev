/* @jsxImportSource react */
import React from "react";
import { cn } from "@/lib/utils";
import { useThemeContext } from "../../context/DarkMode";
import VersionFooter from "../VersionFooter";
import { useMainSidebar } from "./hooks/useMainSidebar";
import SidebarHeader from "./components/SidebarHeader";
import SidebarNav from "./components/SidebarNav";
import type { MainSidebarProps } from "./mainSidebarTypes";

const getSidebarClass = (isLight: boolean, collapsed: boolean): string =>
  cn(
    "flex flex-col h-full transition-all duration-300 relative z-20",
    isLight
      ? "bg-[var(--bg-sidebar)] border-r border-[var(--border-sidebar)]"
      : "bg-[var(--slate-800)] border-r border-[var(--slate-700)]",
    collapsed ? "w-[70px]" : "w-[200px]"
  );

const getFooterClass = (isLight: boolean): string =>
  cn(
    "mt-auto border-t flex items-center justify-center px-3 py-2 min-h-[44px]",
    isLight ? "border-[var(--border-sidebar)]" : "border-[var(--slate-700)]"
  );

const MainSidebar: React.FC<MainSidebarProps> = ({ collapsed, onToggle }) => {
  const { appTheme } = useThemeContext();
  const isLightSidebar = appTheme === "whatsapp";
  const { activePlugins, systemLogo, systemTitle, logoEnabled } = useMainSidebar();

  return (
    <aside className={getSidebarClass(isLightSidebar, collapsed)}>
      <SidebarHeader
        collapsed={collapsed}
        isLightSidebar={isLightSidebar}
        logoEnabled={logoEnabled}
        systemLogo={systemLogo}
        systemTitle={systemTitle}
        onToggle={onToggle}
      />

      <SidebarNav
        collapsed={collapsed}
        isLightSidebar={isLightSidebar}
        activePlugins={activePlugins}
      />

      <div className={getFooterClass(isLightSidebar)}>
        <VersionFooter collapsed={collapsed} />
      </div>
    </aside>
  );
};

export default MainSidebar;
