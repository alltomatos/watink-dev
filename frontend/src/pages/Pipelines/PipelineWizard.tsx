import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "../../services/api";
import { toast } from "react-toastify";

interface PipelineWizardProps {
    open: boolean;
    onClose: () => void;
}

interface FormData {
    name: string;
    description: string;
    type: "kanban" | "funnel";
    stages: string[];
}

const STEPS = ["Definições Básicas", "Configurar Etapas"];

// Minimal stepper built with Tailwind — no MUI dependency
const StepIndicator: React.FC<{ steps: string[]; activeStep: number }> = ({ steps, activeStep }) => (
    <div className="flex items-center w-full mb-6">
        {steps.map((label, index) => (
            <React.Fragment key={label}>
                <div className="flex flex-col items-center">
                    <div
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                            index < activeStep
                                ? "bg-primary border-primary text-primary-foreground"
                                : index === activeStep
                                ? "border-primary text-primary bg-background"
                                : "border-muted-foreground text-muted-foreground bg-background"
                        )}
                    >
                        {index + 1}
                    </div>
                    <span className="text-xs mt-1 text-muted-foreground whitespace-nowrap">{label}</span>
                </div>
                {index < steps.length - 1 && (
                    <div
                        className={cn(
                            "flex-1 h-0.5 mx-2 transition-colors",
                            index < activeStep ? "bg-primary" : "bg-muted"
                        )}
                    />
                )}
            </React.Fragment>
        ))}
    </div>
);

const PipelineWizard: React.FC<PipelineWizardProps> = ({ open, onClose }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FormData>({
        name: "",
        description: "",
        type: "kanban",
        stages: ["Novo", "Em Andamento", "Concluído"],
    });

    // AI state
    const [aiTab, setAiTab] = useState<string>("manual");
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data: settings } = await api.get("/settings");
                const aiEnabledSetting = settings.find((s: { key: string; value: string }) => s.key === "aiEnabled");
                const aiPipelineSetting = settings.find((s: { key: string; value: string }) => s.key === "aiPipelineEnabled");
                setAiEnabled(aiEnabledSetting?.value === "true" && aiPipelineSetting?.value === "true");
            } catch {
                // non-critical — silently ignore
            }
        };
        fetchSettings();
    }, []);

    const handleNext = () => {
        if (activeStep === STEPS.length - 1) {
            handleFinish();
        } else {
            setActiveStep((prev) => prev + 1);
        }
    };

    const handleBack = () => setActiveStep((prev) => prev - 1);

    const handleFinish = async () => {
        setLoading(true);
        try {
            const payload = { ...data, stages: data.stages.map((stage) => ({ name: stage })) };
            await api.post("/pipelines", payload);
            toast.success("Pipeline criado com sucesso!");
            onClose();
        } catch {
            toast.error("Erro ao criar pipeline");
        }
        setLoading(false);
    };

    const handleStageChange = (index: number, value: string) => {
        const newStages = [...data.stages];
        newStages[index] = value;
        setData({ ...data, stages: newStages });
    };

    const handleAddStage = () => setData({ ...data, stages: [...data.stages, "Nova Etapa"] });

    const handleRemoveStage = (index: number) =>
        setData({ ...data, stages: data.stages.filter((_, i) => i !== index) });

    const handleAiSuggest = async () => {
        if (!aiPrompt) return;
        setAiLoading(true);
        try {
            const { data: aiData } = await api.post("/pipelines/ai-suggest", { prompt: aiPrompt });
            if (aiData.stages && Array.isArray(aiData.stages)) {
                setData((prev) => ({ ...prev, stages: aiData.stages }));
                toast.success("Sugestões aplicadas!");
            }
        } catch {
            toast.error("Erro ao gerar sugestões da IA. Verifique sua API Key.");
        }
        setAiLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={loading ? undefined : onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Novo Pipeline</DialogTitle>
                </DialogHeader>

                <StepIndicator steps={STEPS} activeStep={activeStep} />

                {/* Step 0 — Definições Básicas */}
                {activeStep === 0 && (
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="pipeline-name">Nome do Pipeline</Label>
                            <Input
                                id="pipeline-name"
                                value={data.name}
                                onChange={(e) => setData({ ...data, name: e.target.value })}
                                placeholder="Ex: Vendas B2B"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="pipeline-desc">Descrição</Label>
                            <Textarea
                                id="pipeline-desc"
                                value={data.description}
                                rows={2}
                                onChange={(e) => setData({ ...data, description: e.target.value })}
                                placeholder="Descrição opcional do pipeline"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Tipo de Visualização</Label>
                            <div className="flex gap-4">
                                {(["kanban", "funnel"] as const).map((type) => (
                                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="pipeline-type"
                                            value={type}
                                            checked={data.type === type}
                                            onChange={() => setData({ ...data, type })}
                                            className="accent-primary"
                                        />
                                        <span className="text-sm">
                                            {type === "kanban" ? "Kanban (Colunas)" : "Funil de Vendas (Lista)"}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 1 — Configurar Etapas */}
                {activeStep === 1 && (
                    <Tabs value={aiTab} onValueChange={setAiTab}>
                        <TabsList className={cn("w-full", !aiEnabled && "grid-cols-1")}>
                            <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
                            {aiEnabled && (
                                <TabsTrigger value="ai" className="flex-1 flex items-center gap-1">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Assistente de IA
                                </TabsTrigger>
                            )}
                        </TabsList>

                        {/* Manual tab */}
                        <TabsContent value="manual" className="pt-3">
                            <div className="flex flex-col gap-2">
                                {data.stages.map((stage, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground w-6 text-right shrink-0">
                                            {index + 1}.
                                        </span>
                                        <Input
                                            value={stage}
                                            onChange={(e) => handleStageChange(index, e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveStage(index)}
                                            className="shrink-0"
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-2 w-fit"
                                    onClick={handleAddStage}
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Adicionar Etapa
                                </Button>
                            </div>
                        </TabsContent>

                        {/* AI tab */}
                        {aiEnabled && (
                            <TabsContent value="ai" className="pt-3">
                                <div className="rounded-lg border p-4 flex flex-col gap-3 bg-muted/40">
                                    <p className="text-sm text-muted-foreground">
                                        Descreva seu processo para a IA sugerir as etapas ideais.
                                    </p>
                                    <Textarea
                                        rows={3}
                                        placeholder="Ex: Processo de vendas de carros usados, desde o lead até a entrega."
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        disabled={aiLoading}
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            onClick={handleAiSuggest}
                                            disabled={aiLoading || !aiPrompt}
                                        >
                                            {aiLoading ? (
                                                <>
                                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                    Gerando...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="mr-1.5 h-4 w-4" />
                                                    Gerar Sugestões
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Preview of current stages */}
                                <div className="mt-3">
                                    <p className="text-xs text-muted-foreground mb-1">Etapas Atuais:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {data.stages.map((s, i) => (
                                            <span
                                                key={i}
                                                className="bg-border/60 px-2 py-0.5 rounded text-xs"
                                            >
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                )}

                <DialogFooter className="pt-4 gap-2">
                    <Button
                        variant="outline"
                        disabled={activeStep === 0 || loading}
                        onClick={handleBack}
                    >
                        Voltar
                    </Button>
                    <Button
                        onClick={handleNext}
                        disabled={loading || (activeStep === 0 && !data.name)}
                    >
                        {activeStep === STEPS.length - 1 ? (
                            loading ? (
                                <>
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                "Criar Pipeline"
                            )
                        ) : (
                            "Próximo"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PipelineWizard;
