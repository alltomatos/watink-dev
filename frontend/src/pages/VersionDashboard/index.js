/* @jsxImportSource react */
import React, { useEffect, useState, useCallback, useContext, useRef } from "react";
import {
  Container,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  LinearProgress,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip
} from "@material-ui/core";
import { SystemUpdate as UpdateIcon, MenuBook as MenuBookIcon } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { Link as RouterLink } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(3),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  statLabel: {
    color: theme.palette.text.secondary,
    fontSize: "0.875rem",
  },
  statValue: {
    fontSize: "1.25rem",
    fontWeight: "bold",
  },
  progressBox: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  footer: {
    marginTop: theme.spacing(4),
    textAlign: "center",
    color: theme.palette.text.secondary,
  }
}));

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};

function queueAlert(queue, prevMessages) {
  if (queue?.error) return { level: "error", label: "Erro" };
  if ((queue?.consumers || 0) === 0 && (queue?.messages || 0) > 0) {
    return { level: "error", label: "Sem consumidor" };
  }
  if ((queue?.messages || 0) >= 50) return { level: "error", label: "Fila alta" };
  if ((queue?.messages || 0) >= 20) return { level: "warning", label: "Atenção" };
  if ((queue?.messages || 0) > (prevMessages || 0) && (queue?.messages || 0) >= 10) {
    return { level: "warning", label: "Subindo" };
  }
  return { level: "ok", label: "OK" };
}

export default function VersionDashboard() {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const isSuperAdmin = (user?.profile || "").toLowerCase() === "superadmin";
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [error, setError] = useState(null);
  const [queueAlerts, setQueueAlerts] = useState({});
  const [frontendVersion, setFrontendVersion] = useState("-");
  const [frontendUpdatedAt, setFrontendUpdatedAt] = useState(null);
  const [changelog, setChangelog] = useState([]);
  const [updateStatus, setUpdateStatus] = useState(() => (localStorage.getItem("watink_update_ok") === "1" ? "ok" : "idle"));
  const prevQueueMessagesRef = useRef({});

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/system/stats");

      const nextAlerts = {};
      (data?.rabbitmq?.queues || []).forEach((q) => {
        const prev = prevQueueMessagesRef.current[q.name] || 0;
        nextAlerts[q.name] = queueAlert(q, prev);
        prevQueueMessagesRef.current[q.name] = q.messages || 0;
      });
      setQueueAlerts(nextAlerts);

      const pending = localStorage.getItem("watink_update_pending") === "1";
      if (pending && (data?.uptime || 999999) < 180) {
        setUpdateStatus("ok");
        localStorage.removeItem("watink_update_pending");
        localStorage.setItem("watink_update_ok", "1");
        toast.success("✅ Atualização concluída com sucesso");
      }

      setStats(data);
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Falha ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateStatus("updating");
    localStorage.setItem("watink_update_pending", "1");
    localStorage.setItem("watink_update_ok", "0");
    setOpenUpdateModal(false);
    try {
      await api.post("/system/update", { version: frontendVersion !== "-" ? frontendVersion : "latest" });
      toast.info("Processo de atualização iniciado. O sistema entrará em manutenção.");

      const checkInterval = setInterval(async () => {
        try {
          const { data } = await api.get("/system/maintenance");
          if (data.enabled) {
            clearInterval(checkInterval);
            window.location.reload();
          }
        } catch (e) {
          // servidor reiniciando
        }
      }, 2000);
    } catch (err) {
      toast.error("Erro ao iniciar atualização");
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 5000);

    fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((v) => {
        if (v?.version) setFrontendVersion(v.version);
        if (v?.lastUpdated) setFrontendUpdatedAt(v.lastUpdated);
        if (Array.isArray(v?.changelog)) {
          setChangelog(v.changelog.filter(Boolean));
        } else if (typeof v?.changelog === "string" && v.changelog.trim()) {
          setChangelog([v.changelog.trim()]);
        } else {
          setChangelog([]);
        }
      })
      .catch(() => {});

    return () => clearInterval(id);
  }, [fetchStats]);

  if (!isSuperAdmin) {
    return (
      <Container className={classes.root}>
        <Typography color="error">Acesso restrito ao superadmin.</Typography>
      </Container>
    );
  }

  if (loading && !stats) {
    return (
      <Container className={classes.root}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className={classes.root}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Monitor do Sistema (Business)</Typography>
        <Box display="flex" gridGap={8}>
          <Button
            variant="outlined"
            color="default"
            startIcon={<MenuBookIcon />}
            component={RouterLink}
            to="/swagger"
          >
            Swagger
          </Button>
          <Button
            variant="contained"
            color={updateStatus === "ok" ? "default" : "primary"}
            startIcon={updating ? <CircularProgress size={20} color="inherit" /> : <UpdateIcon />}
            disabled={updating || updateStatus === "ok"}
            onClick={() => setOpenUpdateModal(true)}
            style={updateStatus === "ok" ? { backgroundColor: "#2e7d32", color: "#fff" } : undefined}
          >
            {updateStatus === "ok" ? "Atualização OK" : updating ? "Atualizando..." : "Verificar Atualização"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Typography color="error" gutterBottom>
          Erro: {error}
        </Typography>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper className={classes.paper}>
            <Typography variant="subtitle1" gutterBottom>CPU do Sistema</Typography>
            <Typography className={classes.statValue}>{stats?.cpuUsage?.toFixed(1)}%</Typography>
            <Box className={classes.progressBox}>
              <LinearProgress variant="determinate" value={stats?.cpuUsage || 0} color={stats?.cpuUsage > 80 ? "secondary" : "primary"} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper className={classes.paper}>
            <Typography variant="subtitle1" gutterBottom>Memória RAM</Typography>
            <Typography className={classes.statValue}>
              {formatBytes(stats?.memoryUsed)} / {formatBytes(stats?.memoryTotal)}
            </Typography>
            <Box className={classes.progressBox}>
              <LinearProgress
                variant="determinate"
                value={(stats?.memoryUsed / stats?.memoryTotal) * 100 || 0}
                color={(stats?.memoryUsed / stats?.memoryTotal) > 0.8 ? "secondary" : "primary"}
              />
            </Box>
            <Typography variant="caption">{((stats?.memoryUsed / stats?.memoryTotal) * 100).toFixed(1)}% em uso</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper className={classes.paper}>
            <Typography variant="subtitle1" gutterBottom>Uptime do Backend</Typography>
            <Typography className={classes.statValue}>{formatUptime(stats?.uptime || 0)}</Typography>
            <Typography variant="caption" style={{ marginTop: "auto" }}>
              Desde: {new Date((stats?.timestamp - stats?.uptime) * 1000).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>Processo Backend (Go)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography className={classes.statLabel}>Uso de CPU (Proc)</Typography>
                <Typography className={classes.statValue}>{stats?.process?.cpuUsage?.toFixed(2)}%</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography className={classes.statLabel}>Memória (Heap)</Typography>
                <Typography className={classes.statValue}>{formatBytes(stats?.process?.memoryUsed)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography className={classes.statLabel}>Goroutines</Typography>
                <Typography className={classes.statValue}>{stats?.process?.numGoroutine}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography className={classes.statLabel}>Threads do SO</Typography>
                <Typography className={classes.statValue}>-</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper className={classes.paper}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" gutterBottom>Fila de Mensagens (RabbitMQ)</Typography>
              <Button size="small" component={RouterLink} to="/monitor/queues">Ver filas</Button>
            </Box>
            <Typography variant="body2" color="textSecondary">
              Status: {stats?.rabbitmq?.connected ? "Online" : "Offline"} • exibindo {Math.min((stats?.rabbitmq?.queues || []).length, 8)} de {(stats?.rabbitmq?.queues || []).length}
            </Typography>
            <Box mt={2}>
              {(stats?.rabbitmq?.queues || []).slice(0, 8).map((q) => {
                const alert = queueAlerts[q.name] || { level: "ok", label: "OK" };
                const chipColor = alert.level === "error" ? "secondary" : alert.level === "warning" ? "default" : "primary";
                return (
                  <Box key={q.name} mb={1.5}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption">{q.name}</Typography>
                      <Box display="flex" alignItems="center" gridGap={8}>
                        <Typography variant="caption">msgs: {q.messages || 0} • consumers: {q.consumers || 0}</Typography>
                        <Chip size="small" label={alert.label} color={chipColor} />
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (q.messages || 0) * 5)}
                      color={alert.level === "error" || alert.level === "warning" ? "secondary" : "primary"}
                      style={{ marginTop: 4 }}
                    />
                    {!!q.error && <Typography variant="caption" color="error">{q.error}</Typography>}
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>Consumo por Tenant</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tenant</TableCell>
                  <TableCell align="right">Usuários</TableCell>
                  <TableCell align="right">Contatos</TableCell>
                  <TableCell align="right">Tickets</TableCell>
                  <TableCell align="right">Tickets Abertos</TableCell>
                  <TableCell align="right">WhatsApps</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(stats?.tenantConsumption || []).slice(0, 20).map((t) => (
                  <TableRow key={t.tenantId}>
                    <TableCell>{t.tenantName}</TableCell>
                    <TableCell align="right">{t.users}</TableCell>
                    <TableCell align="right">{t.contacts}</TableCell>
                    <TableCell align="right">{t.tickets}</TableCell>
                    <TableCell align="right">{t.openTickets}</TableCell>
                    <TableCell align="right">{t.whatsapps}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      {updateStatus === "ok" && (
        <Box mt={2}>
          <Typography style={{ color: "#2e7d32", fontWeight: 600 }}>
            ✅ Atualização concluída com sucesso. Sistema 100% atualizado.
          </Typography>
        </Box>
      )}

      <div className={classes.footer}>
        <Typography variant="caption">Watink Business v{frontendVersion} • Build ID: {stats?.timestamp} {frontendUpdatedAt ? `• Updated: ${new Date(frontendUpdatedAt).toLocaleString()}` : ""}</Typography>
      </div>

      <Dialog open={openUpdateModal} onClose={() => setOpenUpdateModal(false)}>
        <DialogTitle>🚀 Verificar Atualização</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" gutterBottom>
              Versão disponível: <b>v{frontendVersion !== "-" ? frontendVersion : "latest"}</b>
            </Typography>

            {changelog.length > 0 ? (
              <>
                <Typography variant="body2" gutterBottom style={{ marginTop: 8 }}>
                  Changelog desta versão:
                </Typography>
                <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                  {changelog.map((item, idx) => (
                    <li key={`${idx}-${item}`}>
                      <Typography variant="body2">{item}</Typography>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Changelog não informado para esta versão.
              </Typography>
            )}

            <Typography variant="body2" style={{ marginTop: 12 }}>
              Ao atualizar, o sistema irá entrar em manutenção e reiniciar os serviços.
            </Typography>
            <Typography variant="body2" style={{ marginTop: 8 }}>
              Deseja prosseguir agora?
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpdateModal(false)}>Agora não</Button>
          <Button onClick={handleUpdate} color="primary" variant="contained">Sim, Atualizar Agora</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
