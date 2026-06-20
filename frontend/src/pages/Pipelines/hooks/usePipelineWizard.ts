import { useState, useEffect } from "react";
import api from "../../../services/api";
import { toast } from "react-toastify";

export interface WizardFormData {
    name: string;
    description: string;
    type: "kanban" | "funnel";
    stages: string[];
}

export const WIZARD_STEPS = ["Definições Básicas", "Configurar Etapas"];

const DEFAULT_FORM: WizardFormData = {
    name: "",
    description: "",
    type: "kanban",
    stages: ["Novo", "Em Andamento", "Concluído"],
};

interface UsePipelineWizardOptions {
    onClose: () => void;
}

export function usePipelineWizard({ onClose }: UsePipelineWizardOptions) {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<WizardFormData>(DEFAULT_FORM);

    // AI state
    const [aiTab, setAiTab] = useState<string>("manual");
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data: settings } = await api.get("/settings");
                const aiEnabledSetting = settings.find(
                    (s: { key: string; value: string }) => s.key === "aiEnabled"
                );
                const aiPipelineSetting = settings.find(
                    (s: { key: string; value: string }) => s.key === "aiPipelineEnabled"
                );
                setAiEnabled(
                    aiEnabledSetting?.value === "true" && aiPipelineSetting?.value === "true"
                );
            } catch {
                // non-critical — silently ignore
            }
        };
        void fetchSettings();
    }, []);

    const handleNext = () => {
        if (activeStep === WIZARD_STEPS.length - 1) {
            void handleFinish();
        } else {
            setActiveStep((prev) => prev + 1);
        }
    };

    const handleBack = () => setActiveStep((prev) => prev - 1);

    const handleFinish = async () => {
        setLoading(true);
        try {
            const payload = {
                ...data,
                stages: data.stages.map((stage) => ({ name: stage })),
            };
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

    const handleAddStage = () =>
        setData({ ...data, stages: [...data.stages, "Nova Etapa"] });

    const handleRemoveStage = (index: number) =>
        setData({ ...data, stages: data.stages.filter((_, i) => i !== index) });

    const handleAiSuggest = async () => {
        if (!aiPrompt) return;
        setAiLoading(true);
        try {
            const { data: aiData } = await api.post("/pipelines/ai-suggest", {
                prompt: aiPrompt,
            });
            if (aiData.stages && Array.isArray(aiData.stages)) {
                setData((prev) => ({ ...prev, stages: aiData.stages as string[] }));
                toast.success("Sugestões aplicadas!");
            }
        } catch {
            toast.error("Erro ao gerar sugestões da IA. Verifique sua API Key.");
        }
        setAiLoading(false);
    };

    const isNextDisabled = loading || (activeStep === 0 && !data.name);

    return {
        activeStep,
        loading,
        data,
        setData,
        aiTab,
        setAiTab,
        aiPrompt,
        setAiPrompt,
        aiLoading,
        aiEnabled,
        handleNext,
        handleBack,
        handleStageChange,
        handleAddStage,
        handleRemoveStage,
        handleAiSuggest,
        isNextDisabled,
    };
}
