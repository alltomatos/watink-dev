import React, { useContext } from "react";
import {
  LayoutDashboard,
  List,
  MessageSquare,
  Contact,
  MessageSquareMore,
  Network,
  User,
  Headphones,
  ClipboardList,
} from "lucide-react";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NavButton from "../../components/NavButton";

const ts = (key: string): string => i18n.t(key) as string;

interface MainNavItemsProps {
  collapsed: boolean;
  activePlugins: string[];
}

const MainNavItems: React.FC<MainNavItemsProps> = ({
  collapsed,
  activePlugins,
}) => {
  const { user } = useContext(AuthContext);

  return (
    <>
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
    </>
  );
};

export default MainNavItems;
