import Setting from "../../models/Setting";
import AppError from "../../errors/AppError";

interface AIResponse {
    stages: string[];
}

const AIService = async (prompt: string, tenantId: number | string, currentStages: string[] = []): Promise<AIResponse> => {
    // Buscar API Key nas configurações do tenant
    const apiKeySetting = await Setting.findOne({
        where: { key: "aiApiKey", tenantId }
    });

    const providerSetting = await Setting.findOne({
        where: { key: "aiProvider", tenantId }
    });

    const modelSetting = await Setting.findOne({
        where: { key: "aiModel", tenantId }
    });

    let apiKey = apiKeySetting?.value;
    let provider = providerSetting?.value || "openai";

    // Fallback para variáveis de ambiente se não houver no banco
    if (!apiKey) {
        if (process.env.OPENAI_API_KEY) {
            apiKey = process.env.OPENAI_API_KEY;
            provider = "openai";
        }
    }

    if (!apiKey) {
        console.error("AIService: No API Key found in Settings or ENV.");
        throw new AppError("ERR_NO_AI_API_KEY");
    }

    // Configurar endpoint base
    let baseURL = "https://api.openai.com/v1";
    let model = "gpt-4o-mini"; // Better default for OpenAI

    if (provider === "grok") {
        baseURL = "https://api.x.ai/v1";
        model = "grok-beta";
    }

    if (modelSetting?.value) {
        model = modelSetting.value;
    }

    const guidePromptSetting = await Setting.findOne({
        where: { key: "aiGuidePrompt", tenantId }
    });
    const guidePrompt = guidePromptSetting?.value ? `\n\nCONTEXTO DO NEGÓCIO (IMPORTANTE):\n${guidePromptSetting.value}\n` : "";

    const systemPrompt = `
    Atue como um especialista em CRM e Gestão de Processos.
    ${guidePrompt}
    O usuário solicitará a criação ou melhoria de um Pipeline (Funil).
    
    Contexto Atual das Etapas (se houver): ${currentStages.length > 0 ? JSON.stringify(currentStages) : "Nenhum (Novo Pipeline)"}

    Instruções:
    1. Se o usuário pedir para criar um processo novo, ignore as etapas atuais e sugira novas.
    2. Se o usuário pedir para adicionar/remover/alterar, use as etapas atuais como base e retorne a lista atualizada.
    3. Se o input for genérico (ex: "oi", "ajuda"), sugira um pipeline de vendas padrão ou explique o que fazer (mas SEMPRE retornando JSON com etapas).
    
    Retorne ESTRITAMENTE um JSON com a seguinte estrutura:
    {
      "stages": ["Nome da Etapa 1", "Nome da Etapa 2", "Etapa 3", ...]
    }

    Regras:
    - Retorne APENAS o JSON.
    - Se não conseguir entender, retorne etapas padrão de Vendas: ["Prospecção", "Qualificação", "Proposta", "Fechamento"].
    `;

    try {
        const response = await fetch(`${baseURL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Contexto do Processo: ${prompt}` }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("AI API Error:", response.status, errText);
            throw new Error(`Integration error: ${response.status} ${response.statusText}`);
        }

        const data: any = await response.json();
        const content = data.choices[0].message.content;

        // Tentar limpar json
        const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const json = JSON.parse(cleaned);
            if (json.stages && Array.isArray(json.stages)) {
                return json;
            }
            throw new Error("Invalid JSON structure returned by AI");
        } catch (e) {
            console.error("JSON Parse Error:", e, "Content:", content);
            // Fallback simples se falhar o parse
            return {
                stages: ["Etapa 1 (Erro na IA)", "Etapa 2", "Etapa 3"]
            };
        }

    } catch (err) {
        console.error("AI Service Component Error:", err);
        throw new AppError("ERR_AI_SERVICE_FAILED");
    }
};

export default AIService;
