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
import { useThemeContext } from "../../context/DarkMode";

interface MainSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Pré-computa classes fora do JSX para evitar ambiguidade do parser TSX com hsl(var(--...))
const getSidebarClass = (isLight: boolean, collapsed: boolean): string =>
  cn(
    "flex flex-col h-full transition-all duration-300 relative z-20",
    isLight
      ? "bg-[hsl(var(--bg-sidebar))] border-r border-[hsl(var(--border-sidebar))]"
      : "bg-[var(--slate-800)] border-r border-[var(--slate-700)]",
    collapsed ? "w-[70px]" : "w-[200px]"
  );

const getHeaderClass = (isLight: boolean): string =>
  cn(
    "flex items-center h-16 min-h-16 border-b px-3 gap-2",
    isLight ? "border-[hsl(var(--border-sidebar))]" : "border-[var(--slate-700)]"
  );

const getToggleClass = (isLight: boolean): string =>
  cn(
    "shrink-0 rounded-full h-8 w-8",
    isLight
      ? "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-black/5"
      : "text-[var(--slate-400)] hover:text-white hover:bg-white/10"
  );

const getDividerClass = (isLight: boolean): string =>
  cn("my-4 border-t mx-2", isLight ? "border-[hsl(var(--border-sidebar))]" : "border-border/50");

const getFooterClass = (isLight: boolean): string =>
  cn(
    "mt-auto border-t flex items-center justify-center px-3 py-2 min-h-[44px]",
    isLight ? "border-[hsl(var(--border-sidebar))]" : "border-[var(--slate-700)]"
  );

const MainSidebar: React.FC<MainSidebarProps> = ({ collapsed, onToggle }) => {
  const { user } = useContext(AuthContext);
  const { appTheme } = useThemeContext();
  const isLightSidebar = appTheme === "whatsapp";
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
    <aside className={getSidebarClass(isLightSidebar, collapsed)}>
      {/* Header: logo + toggle */}
      <div className={getHeaderClass(isLightSidebar)}>
        {/* Logo / título */}
        <div className={cn("flex flex-1 items-center overflow-hidden", collapsed ? "justify-center" : "justify-start pl-1")}>
          {collapsed ? (
            <div className="w-8 h-8 bg-primary rounded-full shrink-0" />
          ) : logoEnabled && systemLogo ? (
            <img src={getBackendUrl(systemLogo)} alt={systemTitle} className="h-8 w-auto object-contain brightness-0 invert opacity-90" />
          ) : (
            <h1 className={cn("text-lg font-bold truncate", isLightSidebar ? "text-[hsl(var(--text-primary))]" : "text-white")}>{systemTitle}</h1>
          )}
        </div>

        {/* Botão toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={getToggleClass(isLightSidebar)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
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

        <div className={getDividerClass(isLightSidebar)} />

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

      {/* Footer: apenas Monitor */}
      <div className={getFooterClass(isLightSidebar)}>
        <VersionFooter collapsed={collapsed} />
      </div>
    </aside>
  );
};

export default MainSidebar;
