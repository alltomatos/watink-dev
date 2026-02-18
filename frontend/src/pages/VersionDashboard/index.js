/* @jsxImportSource react */
import React, { useEffect, useState, useCallback, useContext } from "react";
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
  TableBody
} from "@material-ui/core";
import { SystemUpdate as UpdateIcon, MenuBook as MenuBookIcon } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
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
  title: {
    marginBottom: theme.spacing(2),
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
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600*24));
  const h = Math.floor(seconds % (3600*24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};

export default function VersionDashboard() {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const isSuperAdmin = (user?.profile || "").toLowerCase() === "superadmin";
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/system/stats");
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
    setOpenUpdateModal(false);
    try {
      await api.post("/system/update", { version: "2.1.0" });
      toast.info("Processo de atualização iniciado. O sistema entrará em manutenção.");
      
      // Monitorar manutenção
      const checkInterval = setInterval(async () => {
        try {
          const { data } = await api.get("/system/maintenance");
          if (data.enabled) {
            window.location.reload(); // Vai cair no SplashScreen/StatusCheck
          }
        } catch (e) {
          // Servidor pode estar reiniciando
        }
      }, 2000);
    } catch (err) {
      toast.error("Erro ao iniciar atualização");
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 5000); // Atualiza a cada 5 segundos
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
        <Typography variant="h5">
          Monitor do Sistema (Business)
        </Typography>
        <Box display="flex" gridGap={8}>
          {isSuperAdmin && (
            <Button
              variant="outlined"
              color="default"
              startIcon={<MenuBookIcon />}
              component="a"
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Swagger
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={updating ? <CircularProgress size={20} color="inherit" /> : <UpdateIcon />}
            disabled={updating}
            onClick={() => setOpenUpdateModal(true)}
          >
            {updating ? "Atualizando..." : "Verificar Atualização"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Typography color="error" gutterBottom>
          Erro: {error}
        </Typography>
      )}

      <Grid container spacing={3}>
        {/* CPU Geral */}
        <Grid item xs={12} md={4}>
          <Paper className={classes.paper}>
            <Typography variant="subtitle1" gutterBottom>CPU do Sistema</Typography>
            <Typography className={classes.statValue}>{stats?.cpuUsage?.toFixed(1)}%</Typography>
            <Box className={classes.progressBox}>
              <LinearProgress variant="determinate" value={stats?.cpuUsage || 0} color={stats?.cpuUsage > 80 ? "secondary" : "primary"} />
            </Box>
          </Paper>
        </Grid>

        {/* Memória Geral */}
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

        {/* Uptime */}
        <Grid item xs={12} md={4}>
          <Paper className={classes.paper}>
            <Typography variant="subtitle1" gutterBottom>Uptime do Backend</Typography>
            <Typography className={classes.statValue}>{formatUptime(stats?.uptime || 0)}</Typography>
            <Typography variant="caption" style={{ marginTop: 'auto' }}>Desde: {new Date((stats?.timestamp - stats?.uptime) * 1000).toLocaleString()}</Typography>
          </Paper>
        </Grid>

        {/* Processo Go */}
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
            <Typography variant="h6" gutterBottom>Fila de Mensagens (RabbitMQ)</Typography>
            <Typography variant="body2" color="textSecondary">
              Status: {stats?.rabbitmq?.connected ? "Online" : "Offline"}
            </Typography>
            <Box mt={2}>
              {(stats?.rabbitmq?.queues || []).map((q) => (
                <Box key={q.name} mb={1.5}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption">{q.name}</Typography>
                    <Typography variant="caption">
                      msgs: {q.messages || 0} • consumers: {q.consumers || 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (q.messages || 0) * 5)}
                    color={(q.messages || 0) > 20 ? "secondary" : "primary"}
                    style={{ marginTop: 4 }}
                  />
                  {!!q.error && (
                    <Typography variant="caption" color="error">{q.error}</Typography>
                  )}
                </Box>
              ))}
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

      <div className={classes.footer}>
        <Typography variant="caption">
          Watink Business v2.0 • Build ID: {stats?.timestamp}
        </Typography>
      </div>

      <Dialog open={openUpdateModal} onClose={() => setOpenUpdateModal(false)}>
        <DialogTitle>🚀 Nova Atualização Disponível</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Uma nova versão (v2.1.0) está disponível. Ao clicar em atualizar, o sistema irá:
            <br /><br />
            1. Entrar em <b>Modo Manutenção</b> (deslogando usuários).<br />
            2. Realizar um <b>Backup Automático</b> do banco de dados.<br />
            3. Aplicar os novos arquivos e reiniciar os serviços.<br /><br />
            Deseja prosseguir agora?
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
