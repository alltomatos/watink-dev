import Setting from "../../models/Setting";
import AppError from "../../errors/AppError";
// Checking package.json from previous turns, backend is Node 20-alpine. Global fetch is available in Node 20.
// But wait, the previous code snippet for AIService.ts used `fetch` directly without import, implying global fetch or ts-node setup allows it.
// Let's stick to global fetch as seen in AIService.ts reference.

interface AIResponse {
    nodes: any[];
    edges: any[];
    message: string;
}

class FlowAIService {

    public async generateFlowFromPrompt(prompt: string, tenantId: number | string): Promise<AIResponse> {

        // 1. Buscar Configurações
        const apiKeySetting = await Setting.findOne({ where: { key: "aiApiKey", tenantId } });
        const providerSetting = await Setting.findOne({ where: { key: "aiProvider", tenantId } });
        const modelSetting = await Setting.findOne({ where: { key: "aiModel", tenantId } });
        const guidePromptSetting = await Setting.findOne({ where: { key: "aiGuidePrompt", tenantId } });

        let apiKey = apiKeySetting?.value;
        let provider = providerSetting?.value || "openai";
        let model = modelSetting?.value || "gpt-4o-mini";

        // Fallback env
        if (!apiKey && process.env.OPENAI_API_KEY) {
            apiKey = process.env.OPENAI_API_KEY;
            provider = "openai";
        }

        if (!apiKey) {
            throw new AppError("Não há API Key de IA configurada (Settings ou ENV).", 400);
        }

        // 2. Configurar Endpoint
        let baseURL = "https://api.openai.com/v1";
        if (provider === "grok") {
            baseURL = "https://api.x.ai/v1";
            model = model || "grok-beta";
        }

        // 3. Montar Prompt
        const businessContext = guidePromptSetting?.value
            ? `CONTEXTO DO NEGÓCIO:\n${guidePromptSetting.value}\n---\n`
            : "";

        const systemPrompt = `
            ${businessContext}
            Você é um especialista em criação de fluxos de conversação para WhatsApp (Chatbot).
            Seu objetivo é converter a solicitação do usuário em uma estrutura JSON para a biblioteca React Flow.

            REGRAS DE RESPOSTA (JSON ONLY):
            Retorne APENAS um objeto JSON válido, sem markdown (\`\`\`), sem explicações extras fora do JSON.
            
            Estrutura Obrigatória:
            {
                "nodes": [ { "id": "1", "type": "input", "data": { "label": "Olá" }, "position": { "x": 250, "y": 0 } } ],
                "edges": [ { "id": "e1-2", "source": "1", "target": "2", "label": "Opção A" } ],
                "message": "Explicação curta do que foi criado."
            }

            Diretrizes de Design:
            1. Use IDs únicos (strings).
            2. 'type': 'input' p/ inicio, 'output' p/ fim, 'default' p/ meio.
            3. Organize posições (x, y) para não sobrepor. Desça Y a cada passo de conversa.
        `;

        // 4. Chamada API
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
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`FlowAIService Error [${provider}]:`, errText);
                throw new AppError(`Erro na API de IA (${provider}): ${response.statusText}`, 500);
            }

            const data: any = await response.json();
            const content = data.choices[0].message.content;

            // 5. Parse JSON
            let cleanContent = content.replace(/```json/gi, "").replace(/```/g, "").trim();
            // Remove prefixos eventuais
            if (cleanContent.startsWith("JSON:")) cleanContent = cleanContent.substring(5).trim();

            try {
                const json = JSON.parse(cleanContent);
                return json;
            } catch (err) {
                console.error("JSON Parse Fail:", content);
                throw new AppError("A IA não retornou um JSON válido. Tente reformular o pedido.", 500);
            }

        } catch (error) {
            console.error("FlowAIService Fatal:", error);
            if (error instanceof AppError) throw error;
            throw new AppError("Falha interna no serviço de IA.", 500);
        }
    }
}

export default new FlowAIService();
