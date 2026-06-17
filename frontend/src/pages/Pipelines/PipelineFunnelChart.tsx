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
    Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stage {
    id: number;
    name: string;
}

interface Deal {
    stageId: number;
}

interface Pipeline {
    stages: Stage[];
}

interface PipelineFunnelChartProps {
    pipeline?: Pipeline;
    deals?: Deal[];
}

const PipelineFunnelChart: React.FC<PipelineFunnelChartProps> = ({ pipeline, deals }) => {
    if (!pipeline || !deals) return <div className="p-4 text-muted-foreground">Carregando...</div>;

    // Funnel logic: show deal count per stage with decreasing opacity to visualise drop-off
    const funnelData = pipeline.stages.map((stage, index) => ({
        name: stage.name,
        count: deals.filter((d) => d.stageId === stage.id).length,
        // dynamic opacity per stage to reinforce the funnel metaphor
        opacity: Math.max(0.3, 1 - index * 0.1),
    }));

    return (
        <Card className="m-4">
            <CardHeader>
                <CardTitle>Análise de Funil</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={funnelData} layout="vertical" barCategoryGap="10%">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={150} />
                        <Tooltip cursor={{ fill: "transparent" }} />
                        <Legend />
                        <Bar dataKey="count" name="Deals">
                            {funnelData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={`rgba(33, 150, 243, ${entry.opacity})`}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default PipelineFunnelChart;
