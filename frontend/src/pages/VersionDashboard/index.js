import React, { useEffect, useState, useCallback } from "react";
import { Container, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(3),
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    borderBottom: "1px solid #ddd",
    padding: "8px",
  },
  td: {
    borderBottom: "1px solid #f0f0f0",
    padding: "8px",
  },
  error: {
    color: theme.palette.error.main,
  },
}));

const endpoints = [
  { key: "frontend", url: "/version.json" },
  { key: "backend", url: "/api/version" },
  { key: "plugin-manager", url: "/plugins/version" },
  { key: "whaileys-engine", url: "/api/engine/version" },
  { key: "flow-worker", url: "/api/flow/version" },
  { key: "pgvectorgis", url: "/api/postgres/version" },
  { key: "rabbitmq", url: "/api/rabbitmq/version" },
  { key: "redis", url: "/api/redis/version" },
];

export default function VersionDashboard() {
  const classes = useStyles();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    const results = {};
    const fetchOne = async (key, url) => {
      const start = performance.now();
      try {
        const urlWithCacheBuster = `${url}?t=${Date.now()}`;
        const res = await fetch(urlWithCacheBuster, { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } });
        const elapsed = performance.now() - start;
        if (!res.ok) throw new Error(`HTTP ${res.status} `);
        const json = await res.json();
        results[key] = {
          service: json.service || key,
          version: json.version || "-",
          lastUpdated: json.lastUpdated || "-",
          latencyMs: Math.round(elapsed),
          error: null,
        };
      } catch (e) {
        const elapsed = performance.now() - start;
        results[key] = {
          service: key,
          version: "-",
          lastUpdated: "-",
          latencyMs: Math.round(elapsed),
          error: e.message,
        };
      }
    };

    await Promise.all(endpoints.map((e) => fetchOne(e.key, e.url)));
    setData(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVersions();
    const id = setInterval(fetchVersions, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchVersions]);

  const rows = endpoints.map((e) => data[e.key] || { service: e.key, version: "-", lastUpdated: "-", latencyMs: 0, error: null });

  return (
    <Container maxWidth="md" className={classes.root}>
      <Typography variant="h5" gutterBottom>
        Versões dos Serviços
      </Typography>
      <table className={classes.table}>
        <thead>
          <tr>
            <th className={classes.th}>Serviço</th>
            <th className={classes.th}>Versão</th>
            <th className={classes.th}>Última Atualização</th>
            <th className={classes.th}>Latência (ms)</th>
            <th className={classes.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.service}>
              <td className={classes.td}>{r.service}</td>
              <td className={classes.td}>{r.version}</td>
              <td className={classes.td}>{r.lastUpdated}</td>
              <td className={classes.td}>{r.latencyMs}</td>
              <td className={classes.td}>
                {r.error ? <span className={classes.error}>Erro: {r.error}</span> : "OK"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <Typography variant="body2">Atualizando...</Typography>}
    </Container>
  );
}
