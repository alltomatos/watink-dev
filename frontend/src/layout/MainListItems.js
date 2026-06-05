import React, { useContext, useEffect, useState } from "react";
import Divider from "@material-ui/core/Divider";
import { Badge, ListSubheader } from "@material-ui/core";
import DashboardOutlinedIcon from "@material-ui/icons/DashboardOutlined";
import ListAltIcon from "@material-ui/icons/ListAlt";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SyncAltIcon from "@material-ui/icons/SyncAlt";
import SettingsOutlinedIcon from "@material-ui/icons/SettingsOutlined";
import PeopleAltOutlinedIcon from "@material-ui/icons/PeopleAltOutlined";
import ContactPhoneOutlinedIcon from "@material-ui/icons/ContactPhoneOutlined";
import AccountTreeOutlinedIcon from "@material-ui/icons/AccountTreeOutlined";
import QuestionAnswerOutlinedIcon from "@material-ui/icons/QuestionAnswerOutlined";
import DeviceHubIcon from "@material-ui/icons/DeviceHub";
import LibraryBooksIcon from "@material-ui/icons/LibraryBooks";
import SecurityIcon from "@material-ui/icons/Security";
import PersonOutlineIcon from "@material-ui/icons/PersonOutline";
import HeadsetMicIcon from "@material-ui/icons/HeadsetMic";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import AssignmentIcon from "@material-ui/icons/Assignment";
import MenuBookIcon from "@material-ui/icons/MenuBook";

import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import { Can } from "../components/Can";
import { useThemeContext } from "../context/DarkMode";
import pluginApi from "../services/pluginApi";
import NavButton from "../components/NavButton";

const MainListItems = (props) => {
  const { drawerClose, collapsed = false } = props;
  const { appTheme } = useThemeContext();
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [activePlugins, setActivePlugins] = useState([]);

  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const { data } = await pluginApi.get("/plugins/installed");
        setActivePlugins(data.active || []);
      } catch (err) {
        // Silent error for offline/502/CORS to avoid user disruption
      }
    };
    fetchPlugins();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (whatsApps && whatsApps.length > 0) {
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
      <Can
        user={user}
        perform="dashboard:read"
        yes={() => (
          <NavButton
            to="/"
            primary={i18n.t("mainDrawer.listItems.dashboard")}
            icon={<DashboardOutlinedIcon />}
            iconTheme="dashboard"
            collapsed={collapsed}
          />
        )}
      />
      <Can
        user={user}
        perform="pipelines:read"
        yes={() => (
          <NavButton
            to="/pipelines"
            primary={i18n.t("mainDrawer.listItems.pipelines")}
            icon={<ListAltIcon />}
            iconTheme="pipelines"
            collapsed={collapsed}
          />
        )}
      />
      <Can
        user={user}
        perform="tickets:read"
        yes={() => (
          <NavButton
            to="/tickets"
            primary={i18n.t("mainDrawer.listItems.tickets")}
            icon={<WhatsAppIcon />}
            iconTheme="tickets"
            collapsed={collapsed}
          />
        )}
      />

      {activePlugins.includes("helpdesk") && (
        <NavButton
          to="/my-activities"
          primary={i18n.t("mainDrawer.listItems.myActivities")}
          icon={<AssignmentIcon />}
          iconTheme="myActivities"
          collapsed={collapsed}
        />
      )}

      <Can
        user={user}
        perform="contacts:read"
        yes={() => (
          <NavButton
            to="/contacts"
            primary={i18n.t("mainDrawer.listItems.contacts")}
            icon={<ContactPhoneOutlinedIcon />}
            iconTheme="contacts"
            collapsed={collapsed}
          />
        )}
      />
      <Can
        user={user}
        perform="quick_answers:read"
        yes={() => (
          <NavButton
            to="/quickAnswers"
            primary={i18n.t("mainDrawer.listItems.quickAnswers")}
            icon={<QuestionAnswerOutlinedIcon />}
            iconTheme="quickAnswers"
            collapsed={collapsed}
          />
        )}
      />

      <Can
        user={user}
        perform="flows:read"
        yes={() => (
          <NavButton
            to="/flowbuilder"
            primary={i18n.t("mainDrawer.listItems.flowBuilder")}
            icon={<DeviceHubIcon />}
            iconTheme="flowBuilder"
            collapsed={collapsed}
          />
        )}
      />

      {/* Dynamic Plugins */}
      {activePlugins.includes("clientes") && (
        <Can
          user={user}
          perform="clients:read"
          yes={() => (
            <NavButton
              to="/clients"
              primary={i18n.t("mainDrawer.listItems.clients")}
              icon={<PersonOutlineIcon />}
              iconTheme="clients"
              collapsed={collapsed}
            />
          )}
        />
      )}

      {activePlugins.includes("helpdesk") && (
        <Can
          user={user}
          perform="helpdesk:read"
          yes={() => (
            <NavButton
              to="/helpdesk"
              primary={i18n.t("mainDrawer.listItems.helpdesk")}
              icon={<HeadsetMicIcon />}
              iconTheme="helpdesk"
              collapsed={collapsed}
            />
          )}
        />
      )}

      {appTheme !== "apple" && appTheme !== "whatsapp" && <Divider />}
      {!collapsed && appTheme !== "apple" && appTheme !== "whatsapp" && (
        <ListSubheader inset>
          {i18n.t("mainDrawer.listItems.administration")}
        </ListSubheader>
      )}

      <Can
        user={user}
        perform="tags:read"
        yes={() => (
          <NavButton
            to="/tags"
            primary={i18n.t("mainDrawer.listItems.tags")}
            icon={<LocalOfferIcon />}
            iconTheme="tags"
            collapsed={collapsed}
          />
        )}
      />

      {/* Groups oculto do menu — funcionalidade migrada para Funções (Roles).
          Rota /groups mantida ativa para acesso legado/direto. */}
      <Can
        user={user}
        perform="connections:read"
        yes={() => (
          <NavButton
            to="/connections"
            primary={i18n.t("mainDrawer.listItems.connections")}
            icon={
              <Badge badgeContent={connectionWarning ? "!" : 0} color="error" overlap="rectangular">
                <SyncAltIcon />
              </Badge>
            }
            iconTheme="connections"
            collapsed={collapsed}
          />
        )}
      />

      <Can
        user={user}
        perform="users:read"
        yes={() => (
          <NavButton
            to="/users"
            primary={i18n.t("mainDrawer.listItems.users")}
            icon={<PeopleAltOutlinedIcon />}
            iconTheme="users"
            collapsed={collapsed}
          />
        )}
      />

      <Can
        user={user}
        perform="roles:read"
        yes={() => (
          <NavButton
            to="/access"
            primary="Acesso e Permissões"
            icon={<SecurityIcon />}
            iconTheme="access"
            collapsed={collapsed}
          />
        )}
      />

      <Can
        user={user}
        perform="queues:read"
        yes={() => (
          <NavButton
            to="/queues"
            primary={i18n.t("mainDrawer.listItems.queues")}
            icon={<AccountTreeOutlinedIcon />}
            iconTheme="queues"
            collapsed={collapsed}
          />
        )}
      />

      <Can
        user={user}
        perform="knowledge_bases:read"
        yes={() => (
          <NavButton
            to="/knowledge-bases"
            primary={i18n.t("mainDrawer.listItems.knowledgeBase")}
            icon={<LibraryBooksIcon />}
            iconTheme="knowledgeBase"
            collapsed={collapsed}
          />
        )}
      />

      <Can
        user={user}
        perform="settings:read"
        yes={() => (
          <NavButton
            to="/settings"
            primary={i18n.t("mainDrawer.listItems.settings")}
            icon={<SettingsOutlinedIcon />}
            iconTheme="settings"
            collapsed={collapsed}
          />
        )}
      />

      <Can
        user={user}
        perform="swagger:read"
        yes={() => (
          <NavButton
            to="/swagger"
            primary={i18n.t("mainDrawer.listItems.swagger")}
            icon={<MenuBookIcon />}
            iconTheme="swagger"
            collapsed={collapsed}
          />
        )}
      />
    </div>
  );
};

export default MainListItems;
