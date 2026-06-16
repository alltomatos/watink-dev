/* @jsxImportSource react */
import React, { useContext, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Kanban,
  MessageSquare,
  Users,
  Contact,
  GitMerge,
  MessageCircle,
  Settings,
  ClipboardList,
  RefreshCw,
  Tags,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import VersionFooter from "../VersionFooter";
import { getBackendUrl } from "../../helpers/urlUtils";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import pluginApi from "../../services/pluginApi";
import SidebarItem from "../SidebarItem";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import api from "../../services/api";

interface MainSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const MainSidebar: React.FC<MainSidebarProps> = ({ collapsed, onToggle }) => {
  const { user } = useContext(AuthContext);
  const [activePlugins, setActivePlugins] = useState<string[]>([]);
  const [systemLogo, setSystemLogo] = useState("");
  const [systemTitle, setSystemTitle] = useState("Watink");
  const [logoEnabled, setLogoEnabled] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get("/settings");
        const settings = Array.isArray(data) ? data : [];
        const logo = settings.find((s) => s.key === "systemLogo");
        const title = settings.find((s) => s.key === "systemTitle");
        const enabled = settings.find((s) => s.key === "systemLogoEnabled");

        if (logo?.value) setSystemLogo(logo.value);
        if (title?.value) setSystemTitle(title.value);
        if (enabled) setLogoEnabled(enabled.value === "true");
      } catch { /* silence — settings fetch is non-critical */ }
    };
    fetchData();

    const fetchPlugins = async () => {
      try {
        const { data } = await pluginApi.get("/plugins/installed");
        setActivePlugins(data.active || []);
      } catch {
        // Silent error
      }
    };
    fetchPlugins();
  }, []);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-card border-r border-border transition-all duration-300 relative z-20 shadow-sm",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center justify-center py-6 h-16 min-h-16">
        {collapsed ? (
            <div className="w-8 h-8 bg-primary rounded-full" />
        ) : (
          logoEnabled && systemLogo ? (
            <img src={getBackendUrl(systemLogo)} alt={systemTitle} className="h-12 w-auto object-contain" />
          ) : (
            <h1 className="text-xl font-bold text-primary truncate px-4">{systemTitle}</h1>
          )
        )}
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 custom-scrollbar">
        <Can
          user={user}
          perform="dashboard:read"
          yes={() => (
            <SidebarItem
              to="/"
              label={i18n.t("mainDrawer.listItems.dashboard")}
              icon={<LayoutDashboard size={20} />}
              collapsed={collapsed}
              activeColor="var(--nav-icon-blue)"
            />
          )}
        />

        <Can
          user={user}
          perform="pipelines:read"
          yes={() => (
            <SidebarItem
              to="/pipelines"
              label={i18n.t("mainDrawer.listItems.pipelines")}
              icon={<Kanban size={20} />}
              collapsed={collapsed}
              activeColor="var(--nav-icon-purple)"
            />
          )}
        />

        <Can
          user={user}
          perform="tickets:read"
          yes={() => (
            <SidebarItem
              to="/tickets"
              label={i18n.t("mainDrawer.listItems.tickets")}
              icon={<MessageSquare size={20} />}
              collapsed={collapsed}
              activeColor="var(--nav-icon-green)"
            />
          )}
        />

        {activePlugins.includes("helpdesk") && (
          <SidebarItem
            to="/my-activities"
            label={i18n.t("mainDrawer.listItems.myActivities")}
            icon={<ClipboardList size={20} />}
            collapsed={collapsed}
            activeColor="var(--nav-icon-blue)"
          />
        )}

        <Can
          user={user}
          perform="contacts:read"
          yes={() => (
            <SidebarItem
              to="/contacts"
              label={i18n.t("mainDrawer.listItems.contacts")}
              icon={<Contact size={20} />}
              collapsed={collapsed}
              activeColor="var(--nav-icon-orange)"
            />
          )}
        />

        <Can
          user={user}
          perform="quick-answers:read"
          yes={() => (
            <SidebarItem
              to="/quick-answers"
              label={i18n.t("mainDrawer.listItems.quickAnswers")}
              icon={<MessageCircle size={20} />}
              collapsed={collapsed}
              activeColor="var(--nav-icon-purple)"
            />
          )}
        />

        <Can
          user={user}
          perform="tags:read"
          yes={() => (
            <SidebarItem
              to="/tags"
              label={i18n.t("mainDrawer.listItems.tags")}
              icon={<Tags size={20} />}
              collapsed={collapsed}
              activeColor="var(--nav-icon-purple)"
            />
          )}
        />

        <div className="my-4 border-t border-border/50 mx-2" />

        <Can
          user={user}
          perform="connections:read"
          yes={() => (
            <SidebarItem
              to="/connections"
              label={i18n.t("mainDrawer.listItems.connections")}
              icon={<RefreshCw size={20} />}
              collapsed={collapsed}
              activeColor="var(--nav-icon-teal)"
            />
          )}
        />

        <Can
          user={user}
          perform="users:read"
          yes={() => (
            <SidebarItem
              to="/users"
              label={i18n.t("mainDrawer.listItems.users")}
              icon={<Users size={20} />}
              collapsed={collapsed}
              activeColor="var(--nav-icon-blue)"
            />
          )}
        />

        <Can
          user={user}
          perform="queues:read"
          yes={() => (
            <SidebarItem
              to="/queues"
              label={i18n.t("mainDrawer.listItems.queues")}
              icon={<GitMerge size={20} />}
              collapsed={collapsed}
              activeColor="var(--nav-icon-yellow)"
            />
          )}
        />

        <Can
          user={user}
          perform="settings:read"
          yes={() => (
            <SidebarItem
              to="/settings"
              label={i18n.t("mainDrawer.listItems.settings")}
              icon={<Settings size={20} />}
              collapsed={collapsed}
              activeColor="var(--nav-icon-red)"
            />
          )}
        />
      </div>

      {/* Version and Collapse Toggle */}
      <div className="mt-auto border-t border-border">
        <VersionFooter collapsed={collapsed} />
        <div className="p-4 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="rounded-full hover:bg-accent h-8 w-8"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default MainSidebar;
