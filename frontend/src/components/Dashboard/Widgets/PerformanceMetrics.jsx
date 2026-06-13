/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import { Gauge, Clock } from "lucide-react";
import api from "../../../services/api";
import MetricCard from "../../../components/ui/metric-card";

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
    <div className="col-span-12 sm:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <MetricCard
        label="TMR (Tempo Médio de Resposta)"
        value={formatTime(data.metrics.avgResponseTime)}
        icon={<Gauge className="h-5 w-5" />}
        color="info"
      />
      <MetricCard
        label="TME (Tempo Médio de Espera)"
        value={formatTime(data.metrics.avgWaitTime)}
        icon={<Clock className="h-5 w-5" />}
        color="secondary"
      />
    </div>
  );
};

export default PerformanceMetrics;
