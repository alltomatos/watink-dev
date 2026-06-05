/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import PaperCard from "../../components/PaperCard";
import { Grid, Typography, CircularProgress, Box } from "@material-ui/core";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import api from "../../services/api";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";

const COLORS = ["var(--status-info)", "var(--status-success)", "var(--status-warning)", "var(--status-error)", "var(--status-default-text)", "var(--status-success-bg)"];

const HelpdeskReports = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        statusCounts: [],
        priorityCounts: [],
        categoryCounts: [],
        slaStatus: { onTime: 0, overdue: 0 },
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data } = await api.get("/protocols/dashboard");
                setData(data);
            } catch (err) {
                toast.error("Erro ao carregar relatórios");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
                <CircularProgress />
            </Box>
        );
    }

    const slaData = [
        { name: "No Prazo", value: data.slaStatus.onTime },
        { name: "Atrasado", value: data.slaStatus.overdue },
    ];

    const translateStatus = (status) => {
        // Simple translation map, could use i18n
        const map = {
            open: "Aberto",
            in_progress: "Em Andamento",
            resolved: "Resolvido",
            closed: "Fechado"
        };
        return map[status] || status;
    };

    const translatePriority = (priority) => {
        const map = {
            low: "Baixa",
            medium: "Média",
            high: "Alta",
            urgent: "Urgente"
        };
        return map[priority] || priority;
    };

    const formattedStatusData = data.statusCounts.map(item => ({
        ...item,
        status: translateStatus(item.status)
    }));

    const formattedPriorityData = data.priorityCounts.map(item => ({
        ...item,
        priority: translatePriority(item.priority)
    }));

    return (
        <div style={{ padding: 16 }}>
            <Grid container spacing={3}>
                {/* Status Chart */}
                <Grid item xs={12} md={6}>
                    <PaperCard>
                        <Typography variant="h6" gutterBottom>
                            Protocolos por Status
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={formattedStatusData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="status" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="var(--status-default-text)" name="Quantidade" />
                            </BarChart>
                        </ResponsiveContainer>
                    </PaperCard>
                </Grid>

                {/* Priority Chart */}
                <Grid item xs={12} md={6}>
                    <PaperCard>
                        <Typography variant="h6" gutterBottom>
                            Protocolos por Prioridade
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={formattedPriorityData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    fill="var(--status-default-text)"
                                    dataKey="count"
                                    nameKey="priority"
                                    label
                                >
                                    {formattedPriorityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </PaperCard>
                </Grid>

                {/* SLA Chart */}
                <Grid item xs={12} md={6}>
                    <PaperCard>
                        <Typography variant="h6" gutterBottom>
                            Conformidade de SLA (Abertos/Em Andamento)
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={slaData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    fill="var(--status-success-bg)"
                                    dataKey="value"
                                    label
                                >
                                    <Cell fill="var(--status-success)" /> {/* No Prazo */}
                                    <Cell fill="var(--status-error)" /> {/* Atrasado */}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </PaperCard>
                </Grid>

                {/* Categories Chart */}
                <Grid item xs={12} md={6}>
                    <PaperCard>
                        <Typography variant="h6" gutterBottom>
                            Top 10 Categorias
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.categoryCounts} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="category" type="category" width={100} />
                                <Tooltip />
                                <Bar dataKey="count" fill="var(--status-warning)" name="Quantidade" />
                            </BarChart>
                        </ResponsiveContainer>
                    </PaperCard>
                </Grid>
            </Grid>
        </div>
    );
};

export default HelpdeskReports;
