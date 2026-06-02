import React from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
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
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: theme.shadows[6],
    },
  },
  legacyCard: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    opacity: 0.7,
    border: `1px dashed ${theme.palette.divider}`,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  cardIcon: {
    padding: theme.spacing(1),
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--bg-surface)",
  },
  cardTitle: {
    fontWeight: 600,
  },
  cardContent: {
    flex: 1,
  },
  cardButton: {
    width: "100%",
    justifyContent: "flex-start",
  },
  metricCard: {
    padding: theme.spacing(2),
    textAlign: "center",
    borderRadius: 12,
    marginBottom: theme.spacing(2),
  },
  metricValue: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: theme.palette.primary.main,
  },
  metricLabel: {
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  legacyChip: {
    marginLeft: theme.spacing(1),
  },
}));

const NAV_CARDS = [
  {
    key: "roles",
    icon: Assignment,
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
    icon: PeopleOutline,
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
    icon: VpnKey,
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
    icon: History,
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
  },
  {
    key: "usersWithoutRole",
    getValue: (stats) => stats.usersWithoutRole,
    labelKey: "access.metrics.noRole",
  },
  {
    key: "totalUsers",
    getValue: (stats) => stats.totalUsers,
    labelKey: "access.metrics.total",
  },
];

const Access = () => {
  const classes = useStyles();
  const history = useHistory();

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

  const handleNavigate = (path) => history.push(path);

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

      <Box className={classes.root}>
        <Grid container spacing={3}>
          {KPI_CONFIG.map((kpi) => (
            <Grid item xs={12} md={4} key={kpi.key}>
              <Paper className={classes.metricCard}>
                <Typography variant="h3" className={classes.metricValue}>
                  {kpi.getValue(stats)}
                </Typography>
                <Typography variant="body1" className={classes.metricLabel}>
                  {i18n.t(kpi.labelKey)}
                </Typography>
              </Paper>
            </Grid>
          ))}

          {NAV_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Grid item xs={12} md={4} key={card.key}>
                <Card className={classes.card}>
                  <CardContent className={classes.cardContent}>
                    <div className={classes.cardHeader}>
                      <div
                        className={classes.cardIcon}
                        style={{ backgroundColor: card.color }}
                      >
                        <Icon style={{ color: "var(--bg-surface)" }} />
                      </div>
                      <Typography variant="h6" className={classes.cardTitle}>
                        {card.getTitle()}
                      </Typography>
                    </div>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      gutterBottom
                    >
                      {card.getDescription()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {card.getSubtitle(stats)}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      variant="outlined"
                      className={classes.cardButton}
                      endIcon={<ArrowForward />}
                      onClick={() => handleNavigate(card.route)}
                    >
                      {card.getButtonLabel()}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}

          {LEGACY_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Grid item xs={12} md={4} key={card.key}>
                <Card className={classes.legacyCard}>
                  <CardContent className={classes.cardContent}>
                    <div className={classes.cardHeader}>
                      <div
                        className={classes.cardIcon}
                        style={{ backgroundColor: card.color }}
                      >
                        <Icon style={{ color: "var(--bg-surface)" }} />
                      </div>
                      <Typography variant="h6" className={classes.cardTitle}>
                        {card.getTitle()}
                        <Chip
                          size="small"
                          label="Legado"
                          className={classes.legacyChip}
                        />
                      </Typography>
                    </div>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      gutterBottom
                    >
                      {card.getDescription()}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      className={classes.cardButton}
                      endIcon={<ArrowForward />}
                      onClick={() => handleNavigate(card.route)}
                    >
                      {card.getButtonLabel()}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </MainContainer>
  );
};

export default Access;
