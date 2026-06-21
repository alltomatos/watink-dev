export interface PipelineFormData {
    name: string;
    description: string;
    type: "kanban" | "funnel";
    stages: string[];
}

export interface ChatMessage {
    role: "ai" | "user" | "assistant";
    content: string;
}

export const STAGE_COLORS = [
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
] as const;

export const getStageColor = (index: number) => STAGE_COLORS[index % STAGE_COLORS.length];

export const INITIAL_FORM_DATA: PipelineFormData = {
    name: "",
    description: "",
    type: "kanban",
    stages: ["Novo", "Em Andamento", "Concluído"],
};

export const INITIAL_CHAT_MESSAGE: ChatMessage = {
    role: "ai",
    content:
        "Olá! Eu sou o assistente de IA do Watink. \nDescreva o processo que você deseja gerenciar (ex: Vendas de Imóveis, Suporte Técnico) e eu criarei as etapas ideais para você.",
};
