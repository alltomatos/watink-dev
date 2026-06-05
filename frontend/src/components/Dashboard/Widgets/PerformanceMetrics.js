/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import { Typography } from "@material-ui/core";
import { Speed, AccessTime } from "@material-ui/icons";
import api from "../../../services/api";
import MetricCard from "../../../components/MetricCard";

const PerformanceMetrics = () => {
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
    <div className="col-span-12 sm:col-span-6">
      <MetricCard
        label="TMR (Tempo Médio de Resposta)"
        value={formatTime(data.metrics.avgResponseTime)}
        icon={<Speed />}
        color="info"
      />
      <MetricCard
        label="TME (Tempo Médio de Espera)"
        value={formatTime(data.metrics.avgWaitTime)}
        icon={<AccessTime />}
        color="secondary"
      />
    </div>
  );
};

export default PerformanceMetrics;