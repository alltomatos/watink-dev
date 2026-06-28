/* @jsxImportSource react */
import React, { useContext } from "react";
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
  Workflow,
  UsersRound,
  Building2,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { Can } from "../../../components/Can";
import { i18n } from "../../../translate/i18n";
import SidebarItem from "../../SidebarItem";
import ComingSoonItem from "./ComingSoonItem";
import type { SidebarNavProps } from "../mainSidebarTypes";

const getDividerClass = (isLight: boolean): string =>
  cn("my-4 border-t mx-2", isLight ? "border-[var(--border-sidebar)]" : "border-border/50");

const SidebarNav: React.FC<SidebarNavProps> = ({ collapsed, isLightSidebar, activePlugins }) => {
  const { user } = useContext(AuthContext);

  return (
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

      <Can
        user={user}
        perform="flows:read"
        yes={() => (
          <SidebarItem
            to="/flowbuilder"
            label={i18n.t("mainDrawer.listItems.flowBuilder")}
            icon={<Workflow size={20} />}
            collapsed={collapsed}
            activeColor="var(--nav-icon-teal)"
          />
        )}
      />

      <div className={getDividerClass(isLightSidebar)} />

      {!collapsed && (
        <p className={cn("px-3 pb-1 text-[0.625rem] font-semibold uppercase tracking-widest", isLightSidebar ? "text-[var(--text-muted)]" : "text-[var(--slate-500)]")}>
          Em breve
        </p>
      )}

      <ComingSoonItem icon={<UsersRound size={20} />} label="Grupos" collapsed={collapsed} isLightSidebar={isLightSidebar} />
      <ComingSoonItem icon={<Building2 size={20} />} label="Comunidades" collapsed={collapsed} isLightSidebar={isLightSidebar} />
      <ComingSoonItem icon={<Radio size={20} />} label="Canais" collapsed={collapsed} isLightSidebar={isLightSidebar} />

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
  );
};

export default SidebarNav;
