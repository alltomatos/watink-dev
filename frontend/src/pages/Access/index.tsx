import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Users,
  KeyRound,
  ArrowRight,
  History,
} from "lucide-react";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import PaperCard from "../../components/PaperCard";
import MetricCard from "../../components/ui/metric-card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

interface AccessStats {
  totalRoles: number;
  totalUsers: number;
  usersWithoutRole: number;
}

interface NavCardDef {
  key: string;
  icon: React.ReactNode;
  color: string;
  getTitle: () => string;
  getDescription: () => string;
  getButtonLabel: () => string;
  getSubtitle: (stats: AccessStats) => string;
  route: string;
}

interface LegacyCardDef {
  key: string;
  icon: React.ReactNode;
  color: string;
  getTitle: () => string;
  getDescription: () => string;
  getButtonLabel: () => string;
  route: string;
}

interface KpiDef {
  key: keyof AccessStats;
  getValue: (stats: AccessStats) => number;
  labelKey: string;
  color: "primary" | "error" | "info";
  icon: React.ReactNode;
}

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
  const navigate = useNavigate();
  const [stats, setStats] = React.useState<AccessStats>({
    totalRoles: 0,
    totalUsers: 0,
    usersWithoutRole: 0,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const [rolesRes, usersRes] = await Promise.all([
          api.get("/roles"),
          api.get("/users?limit=1"),
        ]);
        const roles = Array.isArray(rolesRes.data)
          ? rolesRes.data
          : rolesRes.data?.roles || [];
        const users = Array.isArray(usersRes.data)
          ? usersRes.data
          : usersRes.data?.users || [];

        setStats({
          totalRoles: roles.length,
          totalUsers: users.length,
          usersWithoutRole: users.filter((u: { roleId?: string }) => !u.roleId).length,
        });
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <MainContainer>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Carregando métricas...</p>
        </div>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <MainHeader>
        <Title>{i18n.t("access.title")}</Title>
      </MainHeader>

      <div className="p-6">
        {/* KPIs */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {KPI_CONFIG.map((kpi) => (
            <MetricCard
              key={kpi.key}
              label={i18n.t(kpi.labelKey)}
              value={kpi.getValue(stats)}
              icon={kpi.icon}
              color={kpi.color}
            />
          ))}
        </div>

        {/* Nav cards */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {NAV_CARDS.map((card) => (
            <PaperCard key={card.key} variant="outlined" padding="default" hoverEffect>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: card.color }}
                >
                  {card.icon}
                </span>
                <span className="text-base font-semibold">{card.getTitle()}</span>
              </div>
              <p className="mb-1 text-sm text-muted-foreground">
                {card.getDescription()}
              </p>
              <p className="text-xs text-muted-foreground">
                {card.getSubtitle(stats)}
              </p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(card.route)}
                >
                  {card.getButtonLabel()}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </PaperCard>
          ))}
        </div>

        {/* Legacy cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {LEGACY_CARDS.map((card) => (
            <PaperCard
              key={card.key}
              variant="outlined"
              style={{ opacity: 0.7, borderStyle: "dashed" } as React.CSSProperties}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: card.color }}
                >
                  {card.icon}
                </span>
                <span className="flex items-center gap-2 text-base font-semibold">
                  {card.getTitle()}
                  <Badge variant="secondary" className="text-xs">
                    Legado
                  </Badge>
                </span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                {card.getDescription()}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => navigate(card.route)}
              >
                {card.getButtonLabel()}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </PaperCard>
          ))}
        </div>
      </div>
    </MainContainer>
  );
};

export default Access;
