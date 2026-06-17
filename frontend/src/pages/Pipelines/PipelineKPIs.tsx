import React from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stage {
    id: number;
    name: string;
}

interface Deal {
    stageId: number;
    value?: number | string;
}

interface Pipeline {
    stages: Stage[];
}

interface PipelineKPIsProps {
    pipeline?: Pipeline;
    deals?: Deal[];
}

const COLORS = [
    "var(--color-info)",
    "var(--color-success)",
    "var(--color-warning)",
    "var(--color-error)",
    "var(--muted-foreground)",
    "var(--color-success)",
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const PipelineKPIs: React.FC<PipelineKPIsProps> = ({ pipeline, deals }) => {
    if (!pipeline || !deals) return <div className="p-4 text-muted-foreground">Carregando...</div>;

    const dealsByStage = pipeline.stages.map((stage) => {
        const stageDeals = deals.filter((d) => d.stageId === stage.id);
        const totalValue = stageDeals.reduce(
            (acc, d) => acc + (parseFloat(String(d.value)) || 0),
            0
        );
        return { name: stage.name, count: stageDeals.length, value: totalValue };
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {/* Deals por Etapa — bar chart */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="text-base">Deals por Etapa</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dealsByStage}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Quantidade" fill="var(--muted-foreground)" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Valor Total por Etapa — pie chart */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="text-base">Valor Total por Etapa</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={dealsByStage}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) =>
                                    `${name} ${(percent * 100).toFixed(0)}%`
                                }
                                outerRadius={80}
                                dataKey="value"
                            >
                                {dealsByStage.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

export default PipelineKPIs;
