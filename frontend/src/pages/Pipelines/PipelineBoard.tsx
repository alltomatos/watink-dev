import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { DropResult } from "react-beautiful-dnd";
import { Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "../../services/api";
import { toast } from "react-toastify";
import PipelineKanban from "./PipelineKanban";
import PipelineFunnelView from "./PipelineFunnelView";

interface Contact {
    name?: string;
}

interface Deal {
    id: number;
    title: string;
    stageId: number;
    contact?: Contact;
    value?: number | string;
    updatedAt?: string;
    createdAt: string;
}

interface Stage {
    id: number;
    name: string;
}

interface ColumnData {
    items: Deal[];
}

interface Pipeline {
    id: number;
    name: string;
    type: "kanban" | "funnel" | "funil";
    stages: Stage[];
}

const PipelineBoard: React.FC = () => {
    const { pipelineId } = useParams<{ pipelineId: string }>();
    const [pipeline, setPipeline] = useState<Pipeline | null>(null);
    const [columns, setColumns] = useState<Record<string | number, ColumnData>>({});
    const [loading, setLoading] = useState(true);
    const [deals, setDeals] = useState<Deal[]>([]);

    useEffect(() => {
        fetchPipelineData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pipelineId]);

    const fetchPipelineData = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/pipelines`);
            const selectedPipeline = data.find((p: Pipeline) => p.id === Number(pipelineId));

            if (selectedPipeline) {
                setPipeline(selectedPipeline);

                const { data: dealData } = await api.get(`/deals`, {
                    params: { pipelineId },
                });

                setDeals(dealData.deals);

                const stageMap: Record<string | number, ColumnData> = {};
                selectedPipeline.stages.forEach((stage: Stage) => {
                    stageMap[stage.id] = {
                        ...stage,
                        items: dealData.deals.filter((d: Deal) => d.stageId === stage.id),
                    };
                });

                setColumns(stageMap);
            }
            setLoading(false);
        } catch {
            toast.error("Erro ao carregar pipeline");
            setLoading(false);
        }
    };

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;

        if (source.droppableId !== destination.droppableId) {
            const sourceColumn = columns[source.droppableId];
            const destColumn = columns[destination.droppableId];
            const sourceItems = [...sourceColumn.items];
            const destItems = [...destColumn.items];
            const [removed] = sourceItems.splice(source.index, 1);

            // Speculatively update UI
            destItems.splice(destination.index, 0, removed);

            // Update item locally (stageId change) for other views
            removed.stageId = Number(destination.droppableId);

            setColumns({
                ...columns,
                [source.droppableId]: { ...sourceColumn, items: sourceItems },
                [destination.droppableId]: { ...destColumn, items: destItems },
            });

            // Also update deals list state for other tabs
            setDeals((prev) => prev.map((d) => (d.id === removed.id ? removed : d)));

            // API Call
            try {
                await api.put(`/deals/${draggableId}`, {
                    stageId: Number(destination.droppableId),
                    pipelineId: Number(pipelineId),
                });
            } catch {
                toast.error("Erro ao mover card");
                fetchPipelineData(); // Revert on error
            }
        }
    };

    const exportPipeline = async () => {
        try {
            const { data } = await api.get(`/pipelines/export/${pipelineId}`);
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const href = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = href;
            link.download = `${data.name.replace(/\s+/g, "_")}_pipeline.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            toast.error("Erro ao exportar");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!pipeline) {
        return <div className="p-4 text-center">Pipeline não encontrado</div>;
    }

    const isEnterprise = pipeline.type === "funnel" || pipeline.type === "funil";

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between z-10 bg-card">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">{pipeline.name}</h2>
                    <Badge variant={pipeline.type === "kanban" ? "default" : "secondary"}>
                        {pipeline.type === "kanban" ? "Kanban" : "Funil"}
                    </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={exportPipeline}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
            </div>

            <div className="flex-1 overflow-hidden">
                {isEnterprise ? (
                    <PipelineFunnelView
                        pipeline={pipeline}
                        columns={columns}
                        setColumns={setColumns}
                        onDragEnd={handleDragEnd}
                        deals={deals}
                    />
                ) : (
                    <PipelineKanban
                        pipeline={pipeline}
                        columns={columns}
                        setColumns={setColumns}
                        onDragEnd={handleDragEnd}
                        isEnterprise={false}
                    />
                )}
            </div>
        </div>
    );
};

export default PipelineBoard;
