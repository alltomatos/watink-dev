import React, { useContext } from "react";
import {
  Settings,
  Users,
  Network,
  Library,
  Shield,
  Tag,
  BookOpen,
} from "lucide-react";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NavButton from "../../components/NavButton";
import ConnectionIcon from "./ConnectionIcon";

const ts = (key: string): string => i18n.t(key) as string;

interface AdminNavItemsProps {
  collapsed: boolean;
  connectionWarning: boolean;
}

const AdminNavItems: React.FC<AdminNavItemsProps> = ({
  collapsed,
  connectionWarning,
}) => {
  const { user } = useContext(AuthContext);

  return (
    <>
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
    </>
  );
};

export default AdminNavItems;
