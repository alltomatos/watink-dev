import React, { useContext, useEffect, useState } from "react";
import {
  LayoutDashboard,
  List,
  MessageSquare,
  RefreshCw,
  Settings,
  Users,
  Contact,
  Network,
  MessageSquareMore,
  Library,
  Shield,
  User,
  Headphones,
  Tag,
  ClipboardList,
  BookOpen
} from "lucide-react";

import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import { Can } from "../components/Can";
import { useThemeContext } from "../context/DarkMode";
import pluginApi from "../services/pluginApi";
import NavButton from "../components/NavButton";

/** i18n.t() retorna DefaultTFuncReturn (inclui null); NavButton.primary exige string. */
const ts = (key: string): string => i18n.t(key) as string;

// AlertCircle não existe em algumas versões — fallback inline
const ConnectionIcon: React.FC<{ warn: boolean }> = ({ warn }) => (
  <span className="relative inline-flex">
    <RefreshCw />
    {warn && (
      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
        !
      </span>
    )}
  </span>
);

interface MainListItemsProps {
  drawerClose?: () => void;
  collapsed?: boolean;
}

const MainListItems: React.FC<MainListItemsProps> = ({
  drawerClose,
  collapsed = false,
}) => {
  const { appTheme } = useThemeContext();
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [activePlugins, setActivePlugins] = useState<string[]>([]);

  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const { data } = await pluginApi.get("/plugins/installed");
        setActivePlugins(data.active || []);
      } catch {
        // Silent — offline/502/CORS
      }
    };
    fetchPlugins();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (whatsApps && whatsApps.length > 0) {
        const offline = whatsApps.filter((w) =>
          ["qrcode", "PAIRING", "DISCONNECTED", "TIMEOUT", "OPENING"].includes(
            w.status
          )
        );
        setConnectionWarning(offline.length > 0);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [whatsApps]);

  const isMinimal = appTheme === "apple" || appTheme === "whatsapp";

  return (
    <div onClick={drawerClose}>
      <Can
        user={user}
        perform="dashboard:read"
        yes={() => (
          <NavButton
            to="/"
            primary={ts("mainDrawer.listItems.dashboard")}
            icon={<LayoutDashboard />}
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
            primary={ts("mainDrawer.listItems.pipelines")}
            icon={<List />}
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
            primary={ts("mainDrawer.listItems.tickets")}
            icon={<MessageSquare />}
            iconTheme="tickets"
            collapsed={collapsed}
          />
        )}
      />

      {activePlugins.includes("helpdesk") && (
        <NavButton
          to="/my-activities"
          primary={ts("mainDrawer.listItems.myActivities")}
          icon={<ClipboardList />}
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
            primary={ts("mainDrawer.listItems.contacts")}
            icon={<Contact />}
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
            primary={ts("mainDrawer.listItems.quickAnswers")}
            icon={<MessageSquareMore />}
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
            primary={ts("mainDrawer.listItems.flowBuilder")}
            icon={<Network />}
            iconTheme="flowBuilder"
            collapsed={collapsed}
          />
        )}
      />

      {activePlugins.includes("clientes") && (
        <Can
          user={user}
          perform="clients:read"
          yes={() => (
            <NavButton
              to="/clients"
              primary={ts("mainDrawer.listItems.clients")}
              icon={<User />}
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
              primary={ts("mainDrawer.listItems.helpdesk")}
              icon={<Headphones />}
              iconTheme="helpdesk"
              collapsed={collapsed}
            />
          )}
        />
      )}

      {!isMinimal && (
        <hr className="my-2 border-t border-border" />
      )}
      {!collapsed && !isMinimal && (
        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {i18n.t("mainDrawer.listItems.administration")}
        </p>
      )}

      <Can
        user={user}
        perform="tags:read"
        yes={() => (
          <NavButton
            to="/tags"
            primary={ts("mainDrawer.listItems.tags")}
            icon={<Tag />}
            iconTheme="tags"
            collapsed={collapsed}
          />
        )}
      />
      <Can
        user={user}
        perform="connections:read"
        yes={() => (
          <NavButton
            to="/connections"
            primary={ts("mainDrawer.listItems.connections")}
            icon={<ConnectionIcon warn={connectionWarning} />}
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
            primary={ts("mainDrawer.listItems.users")}
            icon={<Users />}
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
            icon={<Shield />}
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
            primary={ts("mainDrawer.listItems.queues")}
            icon={<Network />}
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
            primary={ts("mainDrawer.listItems.knowledgeBase")}
            icon={<Library />}
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
            primary={ts("mainDrawer.listItems.settings")}
            icon={<Settings />}
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
            primary={ts("mainDrawer.listItems.swagger")}
            icon={<BookOpen />}
            iconTheme="swagger"
            collapsed={collapsed}
          />
        )}
      />
    </div>
  );
};

export default MainListItems;
