import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Send,
    Bot,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MainContainer from "@/components/MainContainer";
import MainHeader from "@/components/MainHeader";
import Title from "@/components/Title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import api from "../../services/api";
import { toast } from "react-toastify";

// Stage colors logic mapping from kanban
const stageColors = [
    { bg: "var(--status-info-bg)", border: "var(--status-info)", text: "var(--status-info)" },
    { bg: "var(--status-warning-bg)", border: "var(--status-warning)", text: "var(--status-warning)" },
    { bg: "var(--status-success-bg)", border: "var(--status-success)", text: "var(--status-success)" },
    { bg: "var(--status-error-bg)", border: "var(--status-error)", text: "var(--status-error)" },
    { bg: "var(--status-default-bg)", border: "var(--status-default-text)", text: "var(--status-default-text)" },
    { bg: "var(--status-info-bg)", border: "var(--status-info)", text: "var(--status-info)" },
    { bg: "var(--status-warning-bg)", border: "var(--status-warning)", text: "var(--status-warning)" },
    { bg: "var(--status-default-bg)", border: "var(--status-default-text)", text: "var(--status-default-text)" },
    { bg: "var(--status-info-bg)", border: "var(--status-info)", text: "var(--status-info)" },
    { bg: "var(--status-error-bg)", border: "var(--status-error)", text: "var(--status-error)" },
];

const getStageColor = (index: number) => stageColors[index % stageColors.length];

interface FormData {
    name: string;
    description: string;
    type: "kanban" | "funnel";
    stages: string[];
}

interface Message {
    role: "ai" | "user" | "assistant"; // assistant is same as ai for API
    content: string;
}

const PipelineCreator: React.FC = () => {
    const navigate = useNavigate();
    const { pipelineId } = useParams<{ pipelineId: string }>();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [data, setData] = useState<FormData>({
        name: "",
        description: "",
        type: "kanban",
        stages: ["Novo", "Em Andamento", "Concluído"],
    });

    const [loading, setLoading] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "ai",
            content: "Olá! Eu sou o assistente de IA do Watink. \nDescreva o processo que você deseja gerenciar (ex: Vendas de Imóveis, Suporte Técnico) e eu criarei as etapas ideais para você.",
        },
    ]);
    const [input, setInput] = useState("");
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data: settings } = await api.get("/settings");
                const aiEnabledSetting = settings.find((s: { key: string; value: string }) => s.key === "aiEnabled");
                const aiPipelineSetting = settings.find((s: { key: string; value: string }) => s.key === "aiPipelineEnabled");
                setAiEnabled(aiEnabledSetting?.value === "true" && aiPipelineSetting?.value === "true");
            } catch {
                // Ignore silent config errors
            }
        };

        const fetchPipeline = async () => {
            if (!pipelineId) return;
            try {
                const { data: pipelines } = await api.get("/pipelines");
                const pipeline = pipelines.find((p: any) => p.id === Number(pipelineId));
                if (pipeline) {
                    setData({
                        name: pipeline.name,
                        description: pipeline.description || "",
                        type: pipeline.type || "kanban",
                        stages: pipeline.stages.map((s: any) => s.name),
                    });
                    setMessages((prev) => [
                        ...prev,
                        { role: "ai", content: `Estou pronto para ajudar a editar o pipeline "${pipeline.name}".` },
                    ]);
                }
            } catch {
                toast.error("Erro ao carregar pipeline para edição");
            }
        };

        fetchSettings();
        fetchPipeline();
    }, [pipelineId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSave = async () => {
        if (!data.name) {
            toast.error("O nome do pipeline é obrigatório");
            return;
        }
        setLoading(true);
        try {
            const payload = {
                ...data,
                stages: data.stages.map((stage) => ({ name: stage })),
            };

            if (pipelineId) {
                await api.put(`/pipelines/${pipelineId}`, payload);
                toast.success("Pipeline atualizado com sucesso!");
            } else {
                await api.post("/pipelines", payload);
                toast.success("Pipeline criado com sucesso!");
            }
            navigate("/pipelines");
        } catch {
            toast.error("Erro ao salvar pipeline");
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

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: "user", content: input };
        const newHistory = [...messages, userMsg];

        setMessages(newHistory);
        setInput("");
        setAiLoading(true);

        try {
            const apiMessages = newHistory.map((m) => ({
                role: m.role === "ai" ? "assistant" : m.role,
                content: m.content,
            }));

            const { data: aiData } = await api.post("/pipelines/ai-suggest", {
                messages: apiMessages,
            });

            if (aiData.message) {
                setMessages((prev) => [...prev, { role: "ai", content: aiData.message }]);
            }

            if (aiData.stages && Array.isArray(aiData.stages) && aiData.stages.length > 0) {
                setData((prev) => ({ ...prev, stages: aiData.stages }));
                toast.success("Etapas geradas e aplicadas!");
            }
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.response?.data?.error || err.message || "Erro desconhecido";
            let helpfulTip = "";
            if (
                errorMessage.includes("ERR_NO_AI_API_KEY") ||
                errorMessage.includes("ERR_AI_SERVICE_FAILED") ||
                err.response?.status === 400
            ) {
                helpfulTip =
                    "\n\nDica: Verifique em Configurações > Inteligência Artificial se a API Key, Modelo e Provedor estão corretos.";
            }

            setMessages((prev) => [
                ...prev,
                { role: "ai", content: `Ocorreu um erro: ${errorMessage}.${helpfulTip}` },
            ]);
        }
        setAiLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <MainContainer className="flex flex-col h-full">
            <MainHeader>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/pipelines")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Title>{pipelineId ? "Editar Pipeline" : "Novo Pipeline"}</Title>
                </div>
            </MainHeader>

            <div className="flex flex-1 overflow-hidden gap-4 p-4">
                {/* Left Side: Form */}
                <Card className="flex-[2] overflow-y-auto p-6 flex flex-col gap-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Definições</h3>
                        <div className="flex flex-col gap-4">
                            <div className="space-y-1.5">
                                <Label>Nome do Pipeline</Label>
                                <Input
                                    value={data.name}
                                    onChange={(e) => setData({ ...data, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Descrição</Label>
                                <Textarea
                                    rows={2}
                                    value={data.description}
                                    onChange={(e) => setData({ ...data, description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
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
                                                {type === "kanban" ? "Kanban (Colunas)" : "Funil (Lista)"}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Etapas ({data.stages.length})</h3>
                            <Button variant="outline" size="sm" onClick={handleAddStage}>
                                <Plus className="mr-1 h-4 w-4" />
                                Adicionar
                            </Button>
                        </div>

                        <div className="flex flex-col gap-2">
                            {data.stages.map((stage, index) => {
                                const color = getStageColor(index);
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center p-2 rounded-md transition-shadow hover:shadow-md bg-card"
                                        style={{
                                            backgroundColor: color.bg,
                                            borderLeft: `4px solid ${color.border}`,
                                            borderTop: `1px solid ${color.border}`,
                                            borderRight: `1px solid ${color.border}`,
                                            borderBottom: `1px solid ${color.border}`,
                                        }}
                                    >
                                        <div
                                            className="w-6 font-semibold shrink-0"
                                            style={{ color: color.border }}
                                        >
                                            {index + 1}.
                                        </div>
                                        <input
                                            className="flex-1 bg-transparent border-none outline-none font-medium px-2 text-sm"
                                            style={{ color: color.text }}
                                            value={stage}
                                            onChange={(e) => handleStageChange(index, e.target.value)}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 hover:bg-black/5"
                                            onClick={() => handleRemoveStage(index)}
                                        >
                                            <Trash2
                                                className="h-4 w-4"
                                                style={{ color: color.border }}
                                            />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-auto pt-4 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => navigate("/pipelines")}>
                            Cancelar
                        </Button>
                        <Button disabled={loading || !data.name} onClick={handleSave}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                "Salvar Pipeline"
                            )}
                        </Button>
                    </div>
                </Card>

                {/* Right Side: Chat Area */}
                {aiEnabled && (
                    <Card className="flex-1 flex flex-col overflow-hidden bg-card">
                        <div className="p-3 border-b flex items-center gap-2 bg-muted/30">
                            <Bot className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-sm">IA Assistant</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "p-3 rounded-xl max-w-[90%] break-words text-sm",
                                        msg.role === "user"
                                            ? "self-end bg-primary text-primary-foreground rounded-br-none"
                                            : "self-start bg-muted text-foreground rounded-bl-none"
                                    )}
                                >
                                    <span className="whitespace-pre-wrap">{msg.content}</span>
                                </div>
                            ))}
                            {aiLoading && (
                                <div className="self-start bg-muted p-3 rounded-xl rounded-bl-none flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Pensando...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-3 border-t bg-muted/30">
                            <div className="relative">
                                <Input
                                    placeholder="Descreva seu processo..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={aiLoading}
                                    className="pr-10"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1 h-8 w-8"
                                    disabled={!input.trim() || aiLoading}
                                    onClick={handleSendMessage}
                                >
                                    <Send className="h-4 w-4 text-primary" />
                                </Button>
                            </div>
                            <span className="text-[10px] text-muted-foreground block text-center mt-2">
                                A IA atualizará as etapas automaticamente.
                            </span>
                        </div>
                    </Card>
                )}
            </div>
        </MainContainer>
    );
};

export default PipelineCreator;
