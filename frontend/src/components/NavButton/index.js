/* @jsxImportSource react */
import React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { Tooltip, ListItem, ListItemIcon, ListItemText } from "@material-ui/core";
import { motion } from "framer-motion";
import { useThemeContext } from "../../context/DarkMode";

// Mapa semântico de cores por seção (CSS vars)
const ICON_THEME_COLORS = {
  dashboard: "var(--nav-icon-blue)",
  pipelines: "var(--nav-icon-purple)",
  tickets: "var(--nav-icon-green)",
  contacts: "var(--nav-icon-orange)",
  quickAnswers: "var(--nav-icon-purple)",
  flowBuilder: "var(--nav-icon-blue)",
  clients: "var(--nav-icon-blue)",
  helpdesk: "var(--nav-icon-red)",
  myActivities: "var(--nav-icon-blue)",
  tags: "var(--nav-icon-purple)",
  connections: "var(--nav-icon-teal)",
  users: "var(--nav-icon-blue)",
  access: "var(--nav-icon-blue)",
  queues: "var(--nav-icon-yellow)",
  knowledgeBase: "var(--nav-icon-orange)",
  settings: "var(--nav-icon-red)",
  swagger: "var(--nav-icon-pink)",
};

/**
 * NavButton — item de navegação unificado com suporte a:
 * - selected state via var(--nav-active-bg/text) do bridge.js
 * - hover/focus via var(--nav-item-hover-bg) do bridge.js
 * - Tema Google: ícones coloridos por seção (iconTheme prop)
 * - Tema Apple: fontWeight 600, sem cor de ícone
 * - Collapse com tooltip
 */
const NavButton = ({ icon, label, primary, to, collapsed = false, iconTheme }) => {
  const location = useLocation();
  const isSelected = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
  const { appTheme } = useThemeContext();
  const isGoogleTheme = appTheme === "google";

  // Compatibilidade: aceita label OU primary (migração gradual)
  const displayText = label || primary || "";

  const renderLink = React.useMemo(
    () =>
      React.forwardRef(function RouterLinkItem(itemProps, ref) {
        return <RouterLink to={to} ref={ref} {...itemProps} />;
      }),
    [to]
  );

  // Clonar ícone com cor se for tema Google
  const resolvedColor = iconTheme && ICON_THEME_COLORS[iconTheme]
    ? ICON_THEME_COLORS[iconTheme]
    : null;

  const coloredIcon = isGoogleTheme && resolvedColor && icon
    ? React.cloneElement(icon, { style: { color: resolvedColor } })
    : icon;

  const listItem = (
    <motion.div
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <ListItem
        button
        selected={isSelected}
        component={renderLink}
        style={{
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? "12px 0" : "12px 18px",
        }}
      >
        {coloredIcon ? (
          <ListItemIcon
            style={{
              minWidth: collapsed ? 0 : 38,
              justifyContent: "center",
              marginRight: collapsed ? 0 : 12,
            }}
          >
            {coloredIcon}
          </ListItemIcon>
        ) : null}
        {!collapsed && (
          <ListItemText
            primary={displayText}
            primaryTypographyProps={{
              style: {
                fontWeight: appTheme === "apple" ? 600 : 500,
                fontSize: "0.9rem",
                letterSpacing: "-0.01em",
              },
            }}
          />
        )}
      </ListItem>
    </motion.div>
  );

  if (collapsed) {
    return (
      <li>
        <Tooltip title={displayText} placement="right" arrow>
          {listItem}
        </Tooltip>
      </li>
    );
  }

  return <li>{listItem}</li>;
};

export default NavButton;
