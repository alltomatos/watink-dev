import React, { useContext, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ListSubheader from "@material-ui/core/ListSubheader";
import Divider from "@material-ui/core/Divider";
import { Badge, Tooltip, makeStyles } from "@material-ui/core";
import DashboardOutlinedIcon from "@material-ui/icons/DashboardOutlined";
import ListAltIcon from "@material-ui/icons/ListAlt";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SyncAltIcon from "@material-ui/icons/SyncAlt";
import SettingsOutlinedIcon from "@material-ui/icons/SettingsOutlined";
import PeopleAltOutlinedIcon from "@material-ui/icons/PeopleAltOutlined";
import ContactPhoneOutlinedIcon from "@material-ui/icons/ContactPhoneOutlined";
import AccountTreeOutlinedIcon from "@material-ui/icons/AccountTreeOutlined";
import QuestionAnswerOutlinedIcon from "@material-ui/icons/QuestionAnswerOutlined";
import MenuBookIcon from "@material-ui/icons/MenuBook";

import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import { Can } from "../components/Can";
import { useThemeContext } from "../context/DarkMode";

// Cores do Google para ícones (MD3)
const googleColors = {
  blue: "#1A73E8",
  green: "#1E8E3E",
  yellow: "#F9AB00",
  red: "#D93025",
  purple: "#7C4DFF",
  teal: "#00897B",
  orange: "#E8710A",
  pink: "#D01884",
};

function ListItemLink(props) {
  const { icon, primary, to, className, collapsed, iconColor } = props;
  const { appTheme } = useThemeContext();
  const isGoogleTheme = appTheme === "google";

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  // Clonar ícone com cor se for tema Google
  const coloredIcon = isGoogleTheme && iconColor && icon
    ? React.cloneElement(icon, { style: { color: iconColor } })
    : icon;

  const listItem = (
    <ListItem button component={renderLink} className={className}>
      {coloredIcon ? <ListItemIcon>{coloredIcon}</ListItemIcon> : null}
      {!collapsed && <ListItemText primary={primary} />}
    </ListItem>
  );

  // Mostrar tooltip quando colapsado
  if (collapsed) {
    return (
      <li>
        <Tooltip title={primary} placement="right" arrow>
          {listItem}
        </Tooltip>
      </li>
    );
  }

  return <li>{listItem}</li>;
}

const MainListItems = (props) => {
  const { drawerClose, collapsed = false } = props;
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (whatsApps.length > 0) {
        const offlineWhats = whatsApps.filter((whats) => {
          return (
            whats.status === "qrcode" ||
            whats.status === "PAIRING" ||
            whats.status === "DISCONNECTED" ||
            whats.status === "TIMEOUT" ||
            whats.status === "OPENING"
          );
        });
        if (offlineWhats.length > 0) {
          setConnectionWarning(true);
        } else {
          setConnectionWarning(false);
        }
      }
    }, 2000);
    return () => clearTimeout(delayDebounceFn);
  }, [whatsApps]);

  return (
    <div onClick={drawerClose}>
      <ListItemLink
        to="/"
        primary="Estatísticas"
        icon={<DashboardOutlinedIcon />}
        iconColor={googleColors.blue}
        collapsed={collapsed}
      />
      <ListItemLink
        to="/pipelines"
        primary="Pipelines"
        icon={<ListAltIcon />}
        iconColor={googleColors.purple}
        collapsed={collapsed}
      />
      <ListItemLink
        to="/tickets"
        primary={i18n.t("mainDrawer.listItems.tickets")}
        icon={<WhatsAppIcon />}
        iconColor={googleColors.green}
        collapsed={collapsed}
      />

      <ListItemLink
        to="/contacts"
        primary={i18n.t("mainDrawer.listItems.contacts")}
        icon={<ContactPhoneOutlinedIcon />}
        iconColor={googleColors.orange}
        collapsed={collapsed}
      />
      <ListItemLink
        to="/quickAnswers"
        primary={i18n.t("mainDrawer.listItems.quickAnswers")}
        icon={<QuestionAnswerOutlinedIcon />}
        iconColor={googleColors.purple}
        collapsed={collapsed}
      />
      <Can
        role={user.profile}
        perform="drawer-admin-items:view"
        yes={() => (
          <>
            <Divider />
            {!collapsed && (
              <ListSubheader inset>
                {i18n.t("mainDrawer.listItems.administration")}
              </ListSubheader>
            )}
            <ListItemLink
              to="/connections"
              primary={i18n.t("mainDrawer.listItems.connections")}
              icon={
                <Badge badgeContent={connectionWarning ? "!" : 0} color="error">
                  <SyncAltIcon />
                </Badge>
              }
              iconColor={googleColors.teal}
              collapsed={collapsed}
            />
            <ListItemLink
              to="/users"
              primary={i18n.t("mainDrawer.listItems.users")}
              icon={<PeopleAltOutlinedIcon />}
              iconColor={googleColors.blue}
              collapsed={collapsed}
            />
            <ListItemLink
              to="/queues"
              primary={i18n.t("mainDrawer.listItems.queues")}
              icon={<AccountTreeOutlinedIcon />}
              iconColor={googleColors.yellow}
              collapsed={collapsed}
            />
            <ListItemLink
              to="/settings"
              primary={i18n.t("mainDrawer.listItems.settings")}
              icon={<SettingsOutlinedIcon />}
              iconColor={googleColors.red}
              collapsed={collapsed}
            />
            <ListItemLink
              to="/swagger"
              primary="Swagger"
              icon={<MenuBookIcon />}
              iconColor={googleColors.pink}
              collapsed={collapsed}
            />
          </>
        )}
      />
    </div>
  );
};

export default MainListItems;


