import type React from "react";

export interface MainSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export interface ComingSoonItemProps {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  isLightSidebar: boolean;
}

export interface SidebarHeaderProps {
  collapsed: boolean;
  isLightSidebar: boolean;
  logoEnabled: boolean;
  systemLogo: string;
  systemTitle: string;
  onToggle: () => void;
}

export interface SidebarNavProps {
  collapsed: boolean;
  isLightSidebar: boolean;
  activePlugins: string[];
}
