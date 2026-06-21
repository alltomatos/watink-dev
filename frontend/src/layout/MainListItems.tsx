import React from "react";

import { useThemeContext } from "../context/DarkMode";
import { useMainListItems } from "./hooks/useMainListItems";
import { MainListItemsProps } from "./mainListItemsTypes";
import MainNavItems from "./components/MainNavItems";
import AdminSectionDivider from "./components/AdminSectionDivider";
import AdminNavItems from "./components/AdminNavItems";

const MainListItems: React.FC<MainListItemsProps> = ({
  drawerClose,
  collapsed = false,
}) => {
  const { appTheme } = useThemeContext();
  const { connectionWarning, activePlugins } = useMainListItems();

  const isMinimal = appTheme === "apple" || appTheme === "whatsapp";

  return (
    <div onClick={drawerClose}>
      <MainNavItems collapsed={collapsed} activePlugins={activePlugins} />
      <AdminSectionDivider collapsed={collapsed} isMinimal={isMinimal} />
      <AdminNavItems collapsed={collapsed} connectionWarning={connectionWarning} />
    </div>
  );
};

export default MainListItems;
