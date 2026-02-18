/* @jsxImportSource react */
import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button
} from "@material-ui/core";
import { ArrowBack } from "@material-ui/icons";
import { Link as RouterLink } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: { marginTop: theme.spacing(3), paddingBottom: theme.spacing(4) },
  paper: { padding: theme.spacing(2) }
}));

export default function MonitorQueues() {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const isSuperAdmin = (user?.profile || "").toLowerCase() === "superadmin";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ connected: false, queues: [], total: 0 });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/system/rabbitmq/queues");
      setData(data || { connected: false, queues: [], total: 0 });
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Falha ao carregar filas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  if (!isSuperAdmin) {
    return <Container className={classes.root}><Typography color="error">Acesso restrito ao superadmin.</Typography></Container>;
  }

  return (
    <Container maxWidth="lg" className={classes.root}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">RabbitMQ • Todas as Filas</Typography>
        <Button component={RouterLink} to="/monitor" startIcon={<ArrowBack />}>Voltar ao Monitor</Button>
      </Box>

      <Paper className={classes.paper}>
        {loading && <Box display="flex" justifyContent="center"><CircularProgress /></Box>}
        {error && <Typography color="error">Erro: {error}</Typography>}
        {!loading && !error && (
          <>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Status: {data.connected ? "Online" : "Offline"} • Total de filas: {data.total || 0}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fila</TableCell>
                  <TableCell>VHost</TableCell>
                  <TableCell align="right">Msgs</TableCell>
                  <TableCell align="right">Ready</TableCell>
                  <TableCell align="right">Unacked</TableCell>
                  <TableCell align="right">Consumers</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.queues || []).map((q) => (
                  <TableRow key={`${q.vhost || "/"}:${q.name}`}>
                    <TableCell>{q.name}</TableCell>
                    <TableCell>{q.vhost || "/"}</TableCell>
                    <TableCell align="right">{q.messages || 0}</TableCell>
                    <TableCell align="right">{q.ready || 0}</TableCell>
                    <TableCell align="right">{q.unacknowledged || 0}</TableCell>
                    <TableCell align="right">{q.consumers || 0}</TableCell>
                    <TableCell>{q.error || q.state || "ok"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Paper>
    </Container>
  );
}
