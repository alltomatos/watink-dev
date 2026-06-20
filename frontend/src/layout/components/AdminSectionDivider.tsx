import React from "react";
import { i18n } from "../../translate/i18n";

interface AdminSectionDividerProps {
  collapsed: boolean;
  isMinimal: boolean;
}

const AdminSectionDivider: React.FC<AdminSectionDividerProps> = ({
  collapsed,
  isMinimal,
}) => {
  if (isMinimal) return null;

  return (
    <>
      <hr className="my-2 border-t border-border" />
      {!collapsed && (
        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {i18n.t("mainDrawer.listItems.administration")}
        </p>
      )}
    </>
  );
};

export default AdminSectionDivider;
