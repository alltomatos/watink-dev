import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Pencil, Upload } from "lucide-react";
import MainContainer from "@/components/MainContainer";
import MainHeader from "@/components/MainHeader";
import MainHeaderButtonsWrapper from "@/components/MainHeaderButtonsWrapper";
import Title from "@/components/Title";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "../../services/api";

interface Pipeline {
    id: number;
    name: string;
    description: string;
    type: "kanban" | "funnel" | "funil";
}

const Pipelines: React.FC = () => {
    const navigate = useNavigate();
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPipelines();
    }, []);

    const fetchPipelines = async () => {
        try {
            const { data } = await api.get("/pipelines");
            setPipelines(Array.isArray(data) ? data : []);
        } catch {
            toast.error("Erro ao carregar pipelines");
        }
        setLoading(false);
    };

    const handleOpenWizard = () => {
        navigate("/pipelines/new");
    };

    const handleOpenPipeline = (id: number) => {
        navigate(`/pipelines/${id}`);
    };

    const handleEditPipeline = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        navigate(`/pipelines/${id}/edit`);
    };

    const handleImportPipeline = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (readerEvent) => {
            try {
                if (!readerEvent.target?.result) throw new Error("File empty");
                const json = JSON.parse(readerEvent.target.result as string);
                await api.post("/pipelines/import", json);
                toast.success("Pipeline importado com sucesso!");
                fetchPipelines();
            } catch (err: any) {
                toast.error("Erro ao importar pipeline: " + (err.message || "Erro desconhecido"));
            }
        };
        reader.readAsText(file);
        e.target.value = ""; // Reset input value so same file can be selected again
    };

    return (
        <MainContainer className="flex-1">
            <MainHeader>
                <Title>Pipelines</Title>
                <MainHeaderButtonsWrapper>
                    <Button onClick={handleOpenWizard}>
                        Adicionar Pipeline
                    </Button>
                    <input
                        style={{ display: "none" }}
                        id="import-pipeline"
                        type="file"
                        accept=".json"
                        onChange={handleImportPipeline}
                    />
                    <label htmlFor="import-pipeline">
                        <Button
                            variant="secondary"
                            className="ml-2 cursor-pointer"
                            asChild
                        >
                            <span>
                                <Upload className="mr-2 h-4 w-4" />
                                Importar Pipeline
                            </span>
                        </Button>
                    </label>
                </MainHeaderButtonsWrapper>
            </MainHeader>

            <div className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {!loading && pipelines.length === 0 && (
                        <div className="col-span-full text-center p-8 text-muted-foreground">
                            Nenhum pipeline encontrado. Crie o seu primeiro pipeline.
                        </div>
                    )}
                    {pipelines.map((pipeline) => (
                        <Card
                            key={pipeline.id}
                            className="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md relative"
                            onClick={() => handleOpenPipeline(pipeline.id)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-lg line-clamp-1">
                                        {pipeline.name}
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 -mt-2 -mr-2 text-primary hover:bg-primary/10"
                                        onClick={(e) => handleEditPipeline(e, pipeline.id)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>
                                {pipeline.description && (
                                    <CardDescription className="line-clamp-2">
                                        {pipeline.description}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent>
                                <Badge
                                    variant="outline"
                                    className={
                                        pipeline.type === "kanban"
                                            ? "bg-[var(--status-info-bg)] text-[var(--status-info)] border-transparent"
                                            : "bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-transparent"
                                    }
                                >
                                    {pipeline.type === "kanban" ? "Kanban" : "Funil de Vendas"}
                                </Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </MainContainer>
    );
};

export default Pipelines;
