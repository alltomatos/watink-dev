import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
} from "@material-ui/core";
import {
  PeopleOutline,
  Assignment,
  VpnKey,
  ArrowForward,
  History,
} from "@material-ui/icons";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import PaperCard from "../../components/PaperCard";
import MetricCard from "../../components/MetricCard";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const NAV_CARDS = [
  {
    key: "roles",
    icon: <Assignment />,
    color: "var(--status-info)",
    getTitle: () => i18n.t("role.title") || "Funções",
    getDescription: () =>
      "Conjuntos de permissões que definem o que cada perfil pode fazer no sistema",
    getButtonLabel: () => i18n.t("access.buttons.manageRoles"),
    getSubtitle: (stats) => `${stats.totalRoles} funções criadas`,
    route: "/roles",
  },
  {
    key: "users",
    icon: <PeopleOutline />,
    color: "var(--status-error)",
    getTitle: () => i18n.t("users.title") || "Usuários",
    getDescription: () =>
      "Pessoas que recebem funções e permissões de acesso ao sistema",
    getButtonLabel: () => i18n.t("access.buttons.manageUsers"),
    getSubtitle: (stats) =>
      `${stats.totalUsers} usuários · ${stats.usersWithoutRole} sem função`,
    route: "/users",
  },
  {
    key: "permissions",
    icon: <VpnKey />,
    color: "var(--status-warning)",
    getTitle: () => "Permissões",
    getDescription: () =>
      "Visão geral das permissões disponíveis — gerenciadas via Funções",
    getButtonLabel: () => i18n.t("access.buttons.managePermissions"),
    getSubtitle: () => "Atribuídas através de Funções",
    route: "/roles",
  },
];

const LEGACY_CARDS = [
  {
    key: "groups",
    icon: <History />,
    color: "var(--text-muted)",
    getTitle: () => i18n.t("access.buttons.legacyGroups"),
    getDescription: () =>
      "Funcionalidade anterior de agrupamento — migre para Funções quando possível",
    getButtonLabel: () => i18n.t("access.buttons.legacyGroups"),
    route: "/groups",
  },
];

const KPI_CONFIG = [
  {
    key: "totalRoles",
    getValue: (stats) => stats.totalRoles,
    labelKey: "access.metrics.roles",
    color: "primary",
    icon: <Assignment />,
  },
  {
    key: "usersWithoutRole",
    getValue: (stats) => stats.usersWithoutRole,
    labelKey: "access.metrics.noRole",
    color: "error",
    icon: <PeopleOutline />,
  },
  {
    key: "totalUsers",
    getValue: (stats) => stats.totalUsers,
    labelKey: "access.metrics.total",
    color: "info",
    icon: <PeopleOutline />,
  },
];

const Access = () => {
  const navigate = useNavigate();

  const [stats, setStats] = React.useState({
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
          usersWithoutRole: users.filter((u) => !u.roleId).length,
        });
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleNavigate = (path) => navigate(path);

  if (loading) {
    return (
      <MainContainer>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={400}
        >
          <Typography>Carregando métricas...</Typography>
        </Box>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <MainHeader>
        <Title>{i18n.t("access.title")}</Title>
      </MainHeader>

      <Box p={3}>
        <Grid container spacing={3}>
          {KPI_CONFIG.map((kpi) => (
            <Grid item xs={12} md={4} key={kpi.key}>
              <MetricCard
                label={i18n.t(kpi.labelKey)}
                value={kpi.getValue(stats)}
                icon={kpi.icon}
                color={kpi.color}
              />
            </Grid>
          ))}

          {NAV_CARDS.map((card) => (
            <Grid item xs={12} md={4} key={card.key}>
              <PaperCard variant="outlined" padding="default" hoverEffect>
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                  <Box
                    p={1}
                    borderRadius={12}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bgcolor={card.color}
                    color="white"
                  >
                    {card.icon}
                  </Box>
                  <Typography variant="h6" style={{ fontWeight: 600 }}>
                    {card.getTitle()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {card.getDescription()}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {card.getSubtitle(stats)}
                </Typography>
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    fullWidth
                    endIcon={<ArrowForward />}
                    onClick={() => handleNavigate(card.route)}
                  >
                    {card.getButtonLabel()}
                  </Button>
                </Box>
              </PaperCard>
            </Grid>
          ))}

          {LEGACY_CARDS.map((card) => (
            <Grid item xs={12} md={4} key={card.key}>
              <PaperCard
                variant="outlined"
                style={{ opacity: 0.7, borderStyle: "dashed" }}
              >
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                  <Box
                    p={1}
                    borderRadius={12}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bgcolor={card.color}
                    color="white"
                  >
                    {card.icon}
                  </Box>
                  <Typography variant="h6" style={{ fontWeight: 600 }}>
                    {card.getTitle()}
                    <Chip size="small" label="Legado" style={{ marginLeft: 8 }} />
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {card.getDescription()}
                </Typography>
                <Box mt={2}>
                  <Button
                    size="small"
                    fullWidth
                    endIcon={<ArrowForward />}
                    onClick={() => handleNavigate(card.route)}
                  >
                    {card.getButtonLabel()}
                  </Button>
                </Box>
              </PaperCard>
            </Grid>
          ))}
        </Grid>
      </Box>
    </MainContainer>
  );
};

export default Access;
