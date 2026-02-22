/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import { Grid, Paper, Typography, makeStyles } from "@material-ui/core";
import {
  Speed,
  AccessTime
} from "@material-ui/icons";

import api from "../../../services/api";
import MetricCard from "../../../components/MetricCard";

const useStyles = makeStyles((theme) => ({
  metricsTitle: {
    fontWeight: 700,
    marginBottom: theme.spacing(2),
    color: "#333",
  }
}));

const PerformanceMetrics = () => {
  const classes = useStyles();
  const [data, setData] = useState({ metrics: { avgResponseTime: 0, avgWaitTime: 0 } });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get("/dashboard");
        setData(data);
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      }
    };
    fetchData();
  }, []);

  const formatTime = (minutes) => {
    if (!minutes) return "0m";
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes > 60) {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h}h ${m}m`;
    }
    return `${Math.round(minutes)}m`;
  };

  return (
    <React.Fragment>
      <Grid item xs={12} sm={6}>
        <MetricCard
          label="TMR (Tempo Médio de Resposta)"
          value={formatTime(data.metrics.avgResponseTime)}
          icon={<Speed />}
          color="info"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <MetricCard
          label="TME (Tempo Médio de Espera)"
          value={formatTime(data.metrics.avgWaitTime)}
          icon={<AccessTime />}
          color="secondary"
        />
      </Grid>
    </React.Fragment>
  );
};

export default PerformanceMetrics;
