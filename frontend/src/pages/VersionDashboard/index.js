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
  online: {
    color: theme.palette.success?.main || "#4caf50",
    fontWeight: 500,
  },
  offline: {
    color: theme.palette.error.main,
    fontWeight: 500,
  },
}));

import { getBackendUrl } from "../../helpers/urlUtils";

const endpoints = [
  { key: "frontend", url: "/version.json", displayName: "frontend" },
  { key: "backend", url: getBackendUrl("/api/version"), displayName: "backend" },
  { key: "plugin-manager", url: getBackendUrl("/plugins/version"), displayName: "marketplace" },
  { key: "whaileys-engine", url: getBackendUrl("/api/engine/version"), displayName: "whaileys-engine" },
  { key: "webchat-engine", url: getBackendUrl("/api/webchat/version"), displayName: "webchat-engine" },
  { key: "postgres", url: getBackendUrl("/api/postgres/version"), displayName: "pgvectorgis" },
  { key: "rabbitmq", url: getBackendUrl("/api/rabbitmq/version"), displayName: "rabbitmq" },
  { key: "redis", url: getBackendUrl("/api/redis/version"), displayName: "redis" },
];

// Extrai apenas a versão do PostgreSQL (ex: "PostgreSQL 16.11 (Debian...)" => "16.11")
const extractPostgresVersion = (version) => {
  if (!version || version === "-") return "-";
  const match = version.match(/PostgreSQL\s+([\d.]+)/i);
  return match ? match[1] : version;
};

export default function VersionDashboard() {
  const classes = useStyles();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    const results = {};
    const fetchOne = async (endpoint) => {
      const { key, url, displayName } = endpoint;
      const start = performance.now();
      try {
        const urlWithCacheBuster = `${url}?t=${Date.now()}`;
        const res = await fetch(urlWithCacheBuster);
        const elapsed = performance.now() - start;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        let version = json.version || "-";

        // Para postgres, extrair apenas a versão numérica
        if (key === "postgres") {
          version = extractPostgresVersion(version);
        }

        results[key] = {
          service: displayName,
          version,
          latencyMs: Math.round(elapsed),
          isOnline: true,
        };
      } catch (e) {
        const elapsed = performance.now() - start;
        results[key] = {
          service: displayName,
          version: "-",
          latencyMs: Math.round(elapsed),
          isOnline: false,
        };
      }
    };

    await Promise.all(endpoints.map((e) => fetchOne(e)));
    setData(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVersions();
    const id = setInterval(fetchVersions, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchVersions]);

  const rows = endpoints.map((e) => data[e.key] || { service: e.displayName, version: "-", latencyMs: 0, isOnline: false });

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
            <th className={classes.th}>Latência (ms)</th>
            <th className={classes.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.service}>
              <td className={classes.td}>{r.service}</td>
              <td className={classes.td}>{r.version}</td>
              <td className={classes.td}>{r.latencyMs}</td>
              <td className={classes.td}>
                {r.isOnline ? (
                  <span className={classes.online}>Online</span>
                ) : (
                  <span className={classes.offline}>Offline</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <Typography variant="body2">Atualizando...</Typography>}
    </Container>
  );
}
