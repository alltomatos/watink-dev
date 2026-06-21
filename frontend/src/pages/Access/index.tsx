import React from "react";
import {
  ClipboardList,
  Users,
  KeyRound,
  History,
} from "lucide-react";

import { PageLayout, PageHeader, PageContent } from "../../components/ui/page-layout";
import { i18n } from "../../translate/i18n";
import { useAccess } from "./hooks/useAccess";
import AccessKpiGrid from "./components/AccessKpiGrid";
import AccessNavCards from "./components/AccessNavCards";
import AccessLegacyCards from "./components/AccessLegacyCards";
import type { NavCardDef, LegacyCardDef, KpiDef } from "./accessTypes";

const NAV_CARDS: NavCardDef[] = [
  {
    key: "roles",
    icon: <ClipboardList className="h-5 w-5" />,
    color: "var(--status-info)",
    getTitle: () => i18n.t("role.title") || "Funções",
    getDescription: () =>
      "Conjuntos de permissões que definem o que cada perfil pode fazer no sistema",
    getButtonLabel: () => i18n.t("access.buttons.manageRoles"),
    getSubtitle: (s) => `${s.totalRoles} funções criadas`,
    route: "/roles",
  },
  {
    key: "users",
    icon: <Users className="h-5 w-5" />,
    color: "var(--status-error)",
    getTitle: () => i18n.t("users.title") || "Usuários",
    getDescription: () =>
      "Pessoas que recebem funções e permissões de acesso ao sistema",
    getButtonLabel: () => i18n.t("access.buttons.manageUsers"),
    getSubtitle: (s) =>
      `${s.totalUsers} usuários · ${s.usersWithoutRole} sem função`,
    route: "/users",
  },
  {
    key: "permissions",
    icon: <KeyRound className="h-5 w-5" />,
    color: "var(--status-warning)",
    getTitle: () => "Permissões",
    getDescription: () =>
      "Visão geral das permissões disponíveis — gerenciadas via Funções",
    getButtonLabel: () => i18n.t("access.buttons.managePermissions"),
    getSubtitle: () => "Atribuídas através de Funções",
    route: "/roles",
  },
];

const LEGACY_CARDS: LegacyCardDef[] = [
  {
    key: "groups",
    icon: <History className="h-5 w-5" />,
    color: "var(--text-muted)",
    getTitle: () => i18n.t("access.buttons.legacyGroups"),
    getDescription: () =>
      "Funcionalidade anterior de agrupamento — migre para Funções quando possível",
    getButtonLabel: () => i18n.t("access.buttons.legacyGroups"),
    route: "/groups",
  },
];

const KPI_CONFIG: KpiDef[] = [
  {
    key: "totalRoles",
    getValue: (s) => s.totalRoles,
    labelKey: "access.metrics.roles",
    color: "primary",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    key: "usersWithoutRole",
    getValue: (s) => s.usersWithoutRole,
    labelKey: "access.metrics.noRole",
    color: "error",
    icon: <Users className="h-4 w-4" />,
  },
  {
    key: "totalUsers",
    getValue: (s) => s.totalUsers,
    labelKey: "access.metrics.total",
    color: "info",
    icon: <Users className="h-4 w-4" />,
  },
];

const Access: React.FC = () => {
  const { stats, loading } = useAccess();

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Carregando métricas...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={i18n.t("access.title")}
        description="Gerencie usuários, funções e permissões do sistema"
      />
      <PageContent>
        <AccessKpiGrid kpis={KPI_CONFIG} stats={stats} />
        <AccessNavCards cards={NAV_CARDS} stats={stats} />
        <AccessLegacyCards cards={LEGACY_CARDS} />
      </PageContent>
    </PageLayout>
  );
};

export default Access;
