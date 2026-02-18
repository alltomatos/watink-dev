"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const Flow_1 = __importDefault(require("../../models/Flow"));
const FlowSession_1 = __importDefault(require("../../models/FlowSession"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const logger_1 = require("../../utils/logger");
const SendWhatsAppMessage_1 = __importDefault(require("../WbotServices/SendWhatsAppMessage"));
const SendWhatsAppInteractive_1 = __importDefault(require("../WbotServices/SendWhatsAppInteractive"));
const SendWhatsAppMedia_1 = __importDefault(require("../WbotServices/SendWhatsAppMedia"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const upload_1 = __importDefault(require("../../config/upload"));
const uuid_1 = require("uuid");
const ShowTicketService_1 = __importDefault(require("../TicketServices/ShowTicketService"));
const UpdateTicketService_1 = __importDefault(require("../TicketServices/UpdateTicketService"));
// Models para Database Node
const Contact_1 = __importDefault(require("../../models/Contact"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Message_1 = __importDefault(require("../../models/Message"));
const User_1 = __importDefault(require("../../models/User"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const QuickAnswer_1 = __importDefault(require("../../models/QuickAnswer"));
const Pipeline_1 = __importDefault(require("../../models/Pipeline"));
const Deal_1 = __importDefault(require("../../models/Deal"));
const PipelineStage_1 = __importDefault(require("../../models/PipelineStage"));
const Protocol_1 = __importDefault(require("../../models/Protocol"));
const VectorService_1 = __importDefault(require("../VectorService"));
const sequelize_1 = require("sequelize");
class FlowExecutorService {
    async start(flowId, context) {
        const flow = await Flow_1.default.findByPk(flowId);
        if (!flow)
            throw new AppError_1.default("Flow not found", 404);
        const nodes = flow.nodes;
        // 1. Create Session
        const session = await FlowSession_1.default.create({
            flowId,
            status: "active",
            context,
            entityId: context.ticketId,
            entityType: "ticket"
        });
        // 2. Find Start Node
        const startNode = nodes.find((n) => n.type === "input" || n.type === "trigger");
        if (!startNode) {
            await session.update({ status: "failed" });
            throw new AppError_1.default("Flow has no start node", 400);
        }
        // 3. Execute Start Node
        return this.runNode(session, flow, startNode);
    }
    async next(sessionId, input) {
        const session = await FlowSession_1.default.findByPk(sessionId);
        if (!session || session.status !== "active") {
            throw new AppError_1.default("Session not active", 400);
        }
        const flow = await Flow_1.default.findByPk(session.flowId);
        if (!flow)
            throw new AppError_1.default("Flow not found", 404);
        const nodes = flow.nodes;
        const edges = flow.edges;
        const currentNode = nodes.find((n) => n.id === session.currentStepId);
        if (!currentNode) {
            await session.update({ status: "failed" });
            return session;
        }
        // Update context with input
        const newContext = { ...session.context, lastInput: input };
        await session.update({ context: newContext });
        // Determine Logic Next Step
        // If it was a menu, we need to match the input to the correct option index or id to find the right handle
        let selectedHandle = null;
        if (currentNode.type === "menu") {
            const options = currentNode.data.options || [];
            // Try to find exact match on label or id (for list/buttons)
            // Input can be the text of the button or the ID if we parse correctly upstream. Assuming text for now.
            const match = options.find((o) => o.label.toLowerCase() === input.toLowerCase() || o.id === input);
            if (match) {
                selectedHandle = match.id;
            }
            else {
                // Fallback: Check if input is a number matching the index (1, 2, 3...)
                const index = parseInt(input) - 1;
                if (!isNaN(index) && options[index]) {
                    selectedHandle = options[index].id;
                }
            }
        }
        // Find next node via edges
        let nextEdges = edges.filter((e) => e.source === currentNode.id);
        if (selectedHandle) {
            // If we have a specific handle (option chosen), filter edges by sourceHandle
            const specificEdge = nextEdges.find(e => e.sourceHandle === selectedHandle);
            if (specificEdge) {
                nextEdges = [specificEdge];
            }
        }
        if (nextEdges.length === 0) {
            await session.update({ status: "completed", currentStepId: null });
            return session;
        }
        const nextNodeId = nextEdges[0].target;
        // Default to first edge if no specific handle matched or logic not implemented for other types
        const nextNode = nodes.find((n) => n.id === nextNodeId);
        return this.runNode(session, flow, nextNode);
    }
    async runNode(session, flow, node) {
        logger_1.logger.info(`FlowExecutor: Running node ${node.id} (${node.type}) for Session ${session.id}`);
        // Update Session Pointer
        await session.update({ currentStepId: node.id });
        // Execute Logic based on Type
        try {
            switch (node.type) {
                case "input":
                case "trigger":
                    // Start node, just proceed
                    return this.proceedToNext(session, flow, node);
                case "output":
                    // End node
                    await session.update({ status: "completed", currentStepId: null });
                    return session;
                case "default": // "Mensagem"
                case "message":
                case "textUpdater": // "Pergunta"
                    // Passar node.data para sendMessage processar contentType e variáveis
                    await this.sendMessage(session, node.data.content || node.data.label || '', node.data);
                    if (node.type === "textUpdater" || node.data.waitForInput) {
                        return session; // Stop and wait for user reply
                    }
                    else {
                        return this.proceedToNext(session, flow, node);
                    }
                case "menu":
                    await this.sendMenu(session, node.data);
                    return session; // Stop and wait for user reply
                case "knowledge":
                    // Integração com RAG (VectorService)
                    const knowledgeQuery = session.context.lastInput || "";
                    await this.processKnowledgeNode(session, node.data, knowledgeQuery);
                    return this.proceedToNext(session, flow, node);
                // Integração Kanban/CRM
                case "pipeline":
                    await this.processKanbanAction(session, node.data);
                    return this.proceedToNext(session, flow, node);
                case "ticket":
                    await this.updateTicket(session, node.data);
                    return this.proceedToNext(session, flow, node);
                case "webhook":
                    await this.processWebhookNode(session, node.data);
                    return this.proceedToNext(session, flow, node);
                case "switch":
                    return this.evaluateSwitch(session, flow, node);
                case "database":
                    return this.executeDatabase(session, flow, node);
                case "filter":
                    return this.executeFilter(session, flow, node);
                case "api":
                    await this.processAPINode(session, node.data);
                    return this.proceedToNext(session, flow, node);
                case "helpdesk":
                    await this.processHelpdeskNode(session, node.data);
                    return this.proceedToNext(session, flow, node);
                default:
                    logger_1.logger.warn(`Unknown node type: ${node.type}`);
                    return this.proceedToNext(session, flow, node);
            }
        }
        catch (err) {
            logger_1.logger.error(`Error executing node ${node.id}: ${err}`);
            await session.update({ status: "failed" });
            throw err;
        }
    }
    async proceedToNext(session, flow, currentNode, sourceHandle) {
        const nodes = flow.nodes;
        const edges = flow.edges;
        // Filter edges by source and optionally sourceHandle
        const nextEdges = edges.filter((e) => {
            if (e.source !== currentNode.id)
                return false;
            if (sourceHandle && e.sourceHandle !== sourceHandle)
                return false;
            return true;
        });
        if (nextEdges.length === 0) {
            await session.update({ status: "completed", currentStepId: null });
            return session;
        }
        const nextNodeId = nextEdges[0].target;
        const nextNode = nodes.find((n) => n.id === nextNodeId);
        // Recursive call
        return this.runNode(session, flow, nextNode);
    }
    async sendMessage(session, text, nodeData) {
        const context = session.context;
        if (!context.ticketId)
            return;
        const ticket = await (0, ShowTicketService_1.default)(context.ticketId);
        if (!ticket)
            return;
        // Se não houver nodeData ou o tipo for texto, usar lógica simples
        const contentType = nodeData?.contentType || 'text';
        if (contentType === 'text') {
            // Substituir variáveis no texto
            const processedText = this.replaceVariables(text, context);
            await (0, SendWhatsAppMessage_1.default)({
                body: processedText,
                ticket: ticket,
                quotedMsg: null
            });
        }
        else {
            // Processar mídia (image, video, audio, file)
            const mediaUrl = nodeData?.mediaUrl;
            if (!mediaUrl) {
                logger_1.logger.warn(`FlowExecutor: Media node without mediaUrl`);
                return;
            }
            const processedUrl = this.replaceVariables(mediaUrl, context);
            const caption = nodeData?.content ? this.replaceVariables(nodeData.content, context) : undefined;
            try {
                // Baixar mídia da URL e criar arquivo temporário
                const mediaFile = await this.downloadMedia(processedUrl, Number(ticket.tenantId));
                if (mediaFile) {
                    await (0, SendWhatsAppMedia_1.default)({
                        media: mediaFile,
                        ticket: ticket,
                        body: caption
                    });
                }
            }
            catch (err) {
                logger_1.logger.error(`FlowExecutor: Error sending media: ${err}`);
            }
        }
    }
    async downloadMedia(url, tenantId) {
        try {
            const response = await axios_1.default.get(url, { responseType: 'arraybuffer' });
            const contentType = response.headers['content-type'] || 'application/octet-stream';
            const extension = this.getExtensionFromMimetype(contentType);
            const filename = `${(0, uuid_1.v4)()}.${extension}`;
            // Criar diretório temporário se não existir
            const tempDir = path_1.default.join(upload_1.default.directory, 'temp');
            if (!fs_1.default.existsSync(tempDir)) {
                fs_1.default.mkdirSync(tempDir, { recursive: true });
            }
            const filePath = path_1.default.join(tempDir, filename);
            fs_1.default.writeFileSync(filePath, response.data);
            // Retornar objeto compatível com Multer
            return {
                fieldname: 'medias',
                originalname: filename,
                encoding: '7bit',
                mimetype: contentType,
                destination: tempDir,
                filename: filename,
                path: filePath,
                size: response.data.length,
                buffer: response.data,
                stream: null
            };
        }
        catch (err) {
            logger_1.logger.error(`FlowExecutor: Failed to download media from ${url}: ${err}`);
            return null;
        }
    }
    getExtensionFromMimetype(mimetype) {
        const mimeMap = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'video/mp4': 'mp4',
            'video/webm': 'webm',
            'audio/mpeg': 'mp3',
            'audio/ogg': 'ogg',
            'audio/wav': 'wav',
            'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
        };
        return mimeMap[mimetype] || 'bin';
    }
    async sendMenu(session, nodeData) {
        const context = session.context;
        if (!context.ticketId)
            return;
        const ticket = await (0, ShowTicketService_1.default)(context.ticketId);
        if (!ticket)
            return;
        const options = nodeData.options || [];
        const text = nodeData.label || "Escolha uma opção:";
        if (options.length === 0) {
            await this.sendMessage(session, text);
            return;
        }
        // Determine Buttons vs List
        if (options.length <= 3) {
            await (0, SendWhatsAppInteractive_1.default)({
                body: text,
                ticket,
                buttons: options.map((o) => ({ label: o.label, id: o.id }))
            });
        }
        else {
            await (0, SendWhatsAppInteractive_1.default)({
                body: text,
                ticket,
                list: {
                    title: "Opções",
                    buttonText: "Abrir Menu",
                    sections: [
                        {
                            title: "Escolha uma opção",
                            rows: options.map((o) => ({
                                id: o.id,
                                title: o.label,
                                description: ""
                            }))
                        }
                    ]
                }
            });
        }
    }
    async updateTicket(session, nodeData) {
        const context = session.context;
        if (!context.ticketId)
            return;
        const updateData = {};
        // Map nodeData fields to Ticket fields
        if (nodeData.queueId)
            updateData.queueId = nodeData.queueId;
        if (nodeData.status)
            updateData.status = nodeData.status; // open, pending, closed
        // if (nodeData.userId) updateData.userId = nodeData.userId; 
        if (Object.keys(updateData).length > 0) {
            await (0, UpdateTicketService_1.default)({
                ticketData: updateData,
                ticketId: context.ticketId
            });
            logger_1.logger.info(`Flow: Ticket ${context.ticketId} updated via Ticket Node`, updateData);
        }
    }
    async processAPINode(session, nodeData) {
        const context = session.context;
        let { url, method, headers, body, resultVariable } = nodeData;
        try {
            if (!url) {
                logger_1.logger.warn("FlowExecutor: API Node missing URL");
                return;
            }
            url = this.replaceVariables(url, context);
            method = method || 'GET';
            let parsedHeaders = {};
            if (headers) {
                try {
                    const headersStr = this.replaceVariables(headers, context);
                    parsedHeaders = JSON.parse(headersStr);
                }
                catch (e) {
                    logger_1.logger.warn("FlowExecutor: Invalid API Node headers JSON", e);
                }
            }
            let parsedBody = undefined;
            if (body) {
                const bodyStr = this.replaceVariables(body, context);
                try {
                    parsedBody = JSON.parse(bodyStr);
                }
                catch (e) {
                    parsedBody = bodyStr; // Send as string if not valid JSON
                }
            }
            logger_1.logger.info(`FlowExecutor: Executing API Node ${method} ${url}`);
            const response = await (0, axios_1.default)({
                method,
                url,
                headers: parsedHeaders,
                data: parsedBody
            });
            logger_1.logger.info(`FlowExecutor: API Node success status: ${response.status}`);
            if (resultVariable) {
                // Store full response data or just data? Usually data is what users want.
                // Let's store data.
                const newContext = { ...context, [resultVariable]: response.data };
                await session.update({ context: newContext });
                logger_1.logger.info(`FlowExecutor: API Result stored in variable ${resultVariable}`);
            }
        }
        catch (err) {
            logger_1.logger.error(`FlowExecutor: API Node failed: ${err.message}`);
            // Store error info if possible so flow can verify success/fail if needed?
            // For now, let's store null or error message in the variable so user knows it failed?
            if (resultVariable) {
                const newContext = {
                    ...context,
                    [resultVariable]: { error: true, message: err.message, status: err.response?.status }
                };
                await session.update({ context: newContext });
            }
        }
    }
    async processWebhookNode(session, nodeData) {
        const context = session.context;
        let { url, method, headers, body } = nodeData;
        try {
            url = this.replaceVariables(url, context);
            method = method || 'POST';
            let parsedHeaders = {};
            if (headers) {
                try {
                    const headersStr = this.replaceVariables(headers, context);
                    parsedHeaders = JSON.parse(headersStr);
                }
                catch (e) {
                    logger_1.logger.warn("FlowExecutor: Invalid headers JSON", e);
                }
            }
            let parsedBody = {};
            if (body) {
                try {
                    const bodyStr = this.replaceVariables(body, context);
                    parsedBody = JSON.parse(bodyStr);
                }
                catch (e) {
                    // If not JSON, send as string or ignore? simpler to assume JSON for now or just log warning
                    logger_1.logger.warn("FlowExecutor: Body is not valid JSON, sending as is or empty", e);
                    // Fallback: try to send as raw string if useful, but axios data usually expects object for JSON
                }
            }
            // Injeção de Dados do Sistema
            // Injeção de Dados do Sistema
            if (nodeData.fullData && context.ticketId) {
                const ticket = await (0, ShowTicketService_1.default)(context.ticketId);
                if (ticket) {
                    parsedBody = { ...parsedBody, ticket };
                    if (ticket.contact) {
                        parsedBody = { ...parsedBody, contact: ticket.contact };
                    }
                    try {
                        const deal = await Deal_1.default.findOne({
                            where: { ticketId: context.ticketId },
                            include: [
                                { model: Pipeline_1.default, as: 'pipeline' },
                                { model: PipelineStage_1.default, as: 'stage' }
                            ]
                        });
                        if (deal)
                            parsedBody = { ...parsedBody, pipeline: deal };
                    }
                    catch (err) { }
                }
            }
            else {
                // Granular Fields Logic
                if (nodeData.contactFields && nodeData.contactFields.length > 0 && context.ticketId) {
                    const ticket = await (0, ShowTicketService_1.default)(context.ticketId);
                    if (ticket && ticket.contact) {
                        const filteredContact = {};
                        nodeData.contactFields.forEach((field) => {
                            if (ticket.contact[field] !== undefined)
                                filteredContact[field] = ticket.contact[field];
                        });
                        parsedBody = { ...parsedBody, contact: filteredContact };
                    }
                }
                else if (nodeData.includeContact && context.ticketId) {
                    const ticket = await (0, ShowTicketService_1.default)(context.ticketId);
                    if (ticket && ticket.contact) {
                        parsedBody = { ...parsedBody, contact: ticket.contact };
                    }
                }
                if (nodeData.ticketFields && nodeData.ticketFields.length > 0 && context.ticketId) {
                    const ticket = await (0, ShowTicketService_1.default)(context.ticketId);
                    const filteredTicket = {};
                    nodeData.ticketFields.forEach((field) => {
                        if (ticket[field] !== undefined)
                            filteredTicket[field] = ticket[field];
                    });
                    parsedBody = { ...parsedBody, ticket: filteredTicket };
                }
                else if (nodeData.includeTicket && context.ticketId) {
                    const ticket = await (0, ShowTicketService_1.default)(context.ticketId);
                    parsedBody = { ...parsedBody, ticket };
                }
                // Injeção de Dados do Pipeline (CRM)
                if (nodeData.pipelineFields && nodeData.pipelineFields.length > 0 && context.ticketId) {
                    try {
                        const deal = await Deal_1.default.findOne({
                            where: { ticketId: context.ticketId },
                            include: [
                                { model: Pipeline_1.default, as: 'pipeline' },
                                { model: PipelineStage_1.default, as: 'stage' }
                            ]
                        });
                        if (deal) {
                            const filteredPipeline = {};
                            nodeData.pipelineFields.forEach((field) => {
                                if (field === 'dealTitle')
                                    filteredPipeline.dealTitle = deal.title;
                                if (field === 'dealValue')
                                    filteredPipeline.dealValue = deal.value;
                                if (field === 'priority')
                                    filteredPipeline.priority = deal.priority;
                                if (field === 'dealId')
                                    filteredPipeline.dealId = deal.id;
                                if (field === 'pipelineName' && deal.pipeline)
                                    filteredPipeline.pipelineName = deal.pipeline.name;
                                if (field === 'stageName' && deal.stage)
                                    filteredPipeline.stageName = deal.stage.name;
                            });
                            parsedBody = { ...parsedBody, pipeline: filteredPipeline };
                        }
                    }
                    catch (err) {
                        logger_1.logger.warn(`FlowExecutor: Error fetching deal for webhook injection: ${err}`);
                    }
                }
            }
            if (nodeData.includeContext) {
                parsedBody = { ...parsedBody, context };
            }
            logger_1.logger.info(`FlowExecutor: Sending Webhook ${method} ${url}`);
            const response = await (0, axios_1.default)({
                method,
                url,
                headers: parsedHeaders,
                data: parsedBody
            });
            logger_1.logger.info(`FlowExecutor: Webhook success`, response.data);
            // Optional: Store response in context? context.webhookResponse = response.data;
            // await session.update({ context }); // if we want to persist
        }
        catch (err) {
            logger_1.logger.error(`FlowExecutor: Webhook failed`, err.message);
        }
    }
    async processKanbanAction(session, nodeData) {
        const context = session.context;
        if (!context.ticketId)
            return;
        // Recuperar Ticket para obter TenantId (necessário para Deal)
        const ticket = await (0, ShowTicketService_1.default)(context.ticketId);
        if (!ticket) {
            logger_1.logger.warn(`FlowExecutor: Ticket ${context.ticketId} not found for Kanban action`);
            return;
        }
        const { kanbanAction, pipelineId, stageId, dealTitle, dealValue, dealPriority } = nodeData;
        try {
            const pId = this.replaceVariables(pipelineId, context);
            const sId = this.replaceVariables(stageId, context);
            if (!pId || !sId) {
                logger_1.logger.warn(`FlowExecutor: Missing PipelineID or StageID for Kanban action`);
                return;
            }
            if (kanbanAction === 'createDeal') {
                const title = this.replaceVariables(dealTitle || 'Nova Oportunidade', context);
                const valStr = this.replaceVariables(dealValue || '0', context);
                const value = parseFloat(valStr.replace(',', '.')); // Tratamento básico de float
                const priority = parseInt(this.replaceVariables(dealPriority || '1', context));
                await Deal_1.default.create({
                    title,
                    value,
                    priority,
                    pipelineId: parseInt(pId),
                    stageId: parseInt(sId),
                    contactId: ticket.contactId,
                    ticketId: ticket.id,
                    tenantId: ticket.tenantId
                });
                logger_1.logger.info(`FlowExecutor: Deal created for ticket ${ticket.id} in pipeline ${pId}`);
            }
            else if (kanbanAction === 'moveDeal') {
                // Busca deal associado ao ticket
                const deal = await Deal_1.default.findOne({ where: { ticketId: ticket.id } });
                if (deal) {
                    await deal.update({ stageId: parseInt(sId) });
                    logger_1.logger.info(`FlowExecutor: Deal ${deal.id} moved to stage ${sId}`);
                }
                else {
                    logger_1.logger.warn(`FlowExecutor: No deal found for ticket ${ticket.id} to move`);
                }
            }
        }
        catch (err) {
            logger_1.logger.error(`FlowExecutor: Error processing Kanban action: ${err}`);
        }
    }
    async evaluateSwitch(session, flow, node) {
        // NOCODE: Processamento seguro de condições estruturadas
        const context = session.context;
        const conditionsA = node.data.conditionsA || [];
        let matchedHandle = 'b'; // Default to B (False/Fail)
        if (conditionsA.length === 0) {
            // Se não há condições, vai para A se houver input
            const lastInput = context.lastInput || "";
            if (lastInput && lastInput.length > 0) {
                matchedHandle = 'a';
            }
        }
        else {
            // Avalia condições NOCODE
            const result = this.evaluateNoCodeConditions(conditionsA, context);
            if (result) {
                matchedHandle = 'a';
            }
        }
        logger_1.logger.info(`FlowExecutor: Switch evaluated to handle ${matchedHandle}`);
        return this.proceedToNext(session, flow, node, matchedHandle);
    }
    // NOCODE: Avaliador seguro de condições
    evaluateNoCodeConditions(conditions, context) {
        if (!conditions || conditions.length === 0)
            return true;
        let result = true;
        let currentLogic = 'AND';
        for (const cond of conditions) {
            const fieldValue = this.getContextValue(cond.field, context);
            const condValue = this.replaceVariables(cond.value || '', context);
            const condResult = this.evaluateSingleCondition(fieldValue, cond.operator, condValue);
            if (cond.logic === 'OR') {
                result = result || condResult;
            }
            else {
                result = result && condResult;
            }
            currentLogic = cond.logic || 'AND';
        }
        return result;
    }
    // NOCODE: Obtém valor do contexto por nome do campo
    getContextValue(fieldName, context) {
        const valueMap = {
            'lastInput': context.lastInput || context.messageBody || '',
            'contactName': context.contactName || '',
            'contactNumber': context.contactNumber || '',
            'ticketStatus': context.ticketStatus || '',
            'queueName': context.queueName || '',
            'tagName': context.tagName || '',
            'dayOfWeek': new Date().getDay().toString(),
            'currentHour': new Date().getHours().toString()
        };
        return String(valueMap[fieldName] || context[fieldName] || '');
    }
    // NOCODE: Avalia uma única condição com whitelist de operadores
    evaluateSingleCondition(fieldValue, operator, condValue) {
        const normalizedField = (fieldValue || '').toLowerCase().trim();
        const normalizedCond = (condValue || '').toLowerCase().trim();
        // Whitelist de operadores seguros
        switch (operator) {
            case 'equals':
                return normalizedField === normalizedCond;
            case 'notEquals':
                return normalizedField !== normalizedCond;
            case 'contains':
                return normalizedField.includes(normalizedCond);
            case 'notContains':
                return !normalizedField.includes(normalizedCond);
            case 'startsWith':
                return normalizedField.startsWith(normalizedCond);
            case 'endsWith':
                return normalizedField.endsWith(normalizedCond);
            case 'isEmpty':
                return normalizedField.length === 0;
            case 'isNotEmpty':
                return normalizedField.length > 0;
            case 'greaterThan':
                return parseFloat(fieldValue) > parseFloat(condValue);
            case 'lessThan':
                return parseFloat(fieldValue) < parseFloat(condValue);
            default:
                logger_1.logger.warn(`FlowExecutor: Unknown operator ${operator}, defaulting to false`);
                return false;
        }
    }
    getModelByName(tableName) {
        const models = {
            'Contacts': Contact_1.default,
            'Contact': Contact_1.default,
            'Tickets': Ticket_1.default,
            'Ticket': Ticket_1.default,
            'Messages': Message_1.default,
            'Message': Message_1.default,
            'Users': User_1.default,
            'User': User_1.default,
            'Queues': Queue_1.default,
            'Queue': Queue_1.default,
            'Whatsapps': Whatsapp_1.default,
            'Whatsapp': Whatsapp_1.default,
            'QuickAnswers': QuickAnswer_1.default,
            'QuickAnswer': QuickAnswer_1.default,
            'Pipelines': Pipeline_1.default,
            'Pipeline': Pipeline_1.default
        };
        return models[tableName] || null;
    }
    replaceVariables(str, context) {
        if (!str)
            return str;
        return str.replace(/\{\{([\w\.]+)\}\}/g, (match, key) => {
            const keys = key.split('.');
            let value = context;
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                }
                else {
                    return match; // Variable not found or path invalid
                }
            }
            return value !== undefined && value !== null ? String(value) : match;
        });
    }
    // NOCODE: Parser seguro de filtros estruturados
    parseNoCodeFilters(filters, tableName, context) {
        if (!filters || filters.length === 0)
            return {};
        // Whitelist de campos por tabela
        const allowedFields = {
            'Contacts': ['id', 'name', 'number', 'email', 'isGroup', 'profilePicUrl', 'createdAt'],
            'Tickets': ['id', 'status', 'queueId', 'userId', 'contactId', 'isGroup', 'createdAt', 'updatedAt'],
            'Messages': ['id', 'body', 'fromMe', 'mediaType', 'ticketId', 'createdAt'],
            'Users': ['id', 'name', 'email', 'profile', 'createdAt'],
            'Queues': ['id', 'name', 'color', 'createdAt'],
            'Whatsapps': ['id', 'name', 'status', 'isDefault', 'createdAt'],
            'QuickAnswers': ['id', 'shortcut', 'message', 'createdAt'],
            'Pipelines': ['id', 'name', 'createdAt']
        };
        // Whitelist de operadores
        const allowedOperators = ['=', '!=', '>', '<', '>=', '<=', 'like'];
        const tableFields = allowedFields[tableName] || [];
        const where = {};
        for (const filter of filters) {
            // Validar campo está na whitelist
            if (!tableFields.includes(filter.field)) {
                logger_1.logger.warn(`FlowExecutor: Field ${filter.field} not allowed for table ${tableName}`);
                continue;
            }
            // Validar operador está na whitelist
            if (!allowedOperators.includes(filter.operator)) {
                logger_1.logger.warn(`FlowExecutor: Operator ${filter.operator} not allowed`);
                continue;
            }
            // Resolver variáveis no valor
            let cleanValue = this.replaceVariables(filter.value || '', context);
            // Sanitizar valor - remover caracteres perigosos
            cleanValue = this.sanitizeValue(cleanValue);
            switch (filter.operator) {
                case '=':
                    where[filter.field] = cleanValue;
                    break;
                case '!=':
                    where[filter.field] = { [sequelize_1.Op.ne]: cleanValue };
                    break;
                case '>':
                    where[filter.field] = { [sequelize_1.Op.gt]: cleanValue };
                    break;
                case '<':
                    where[filter.field] = { [sequelize_1.Op.lt]: cleanValue };
                    break;
                case '>=':
                    where[filter.field] = { [sequelize_1.Op.gte]: cleanValue };
                    break;
                case '<=':
                    where[filter.field] = { [sequelize_1.Op.lte]: cleanValue };
                    break;
                case 'like':
                    where[filter.field] = { [sequelize_1.Op.like]: `%${cleanValue}%` };
                    break;
            }
        }
        return where;
    }
    // NOCODE: Sanitiza valores para prevenir injection
    sanitizeValue(value) {
        if (!value)
            return '';
        // Remove caracteres perigosos para SQL injection
        return value
            .replace(/[;'"\\]/g, '') // Remove aspas, ponto-vírgula, barra
            .replace(/--/g, '') // Remove comentários SQL
            .replace(/\/\*/g, '') // Remove comentários bloco
            .replace(/\*\//g, '')
            .trim()
            .substring(0, 500); // Limita tamanho
    }
    // NOCODE: Construir dados para CREATE/UPDATE a partir de estrutura NOCODE
    buildNoCodeData(dataFields, tableName, context) {
        if (!dataFields || dataFields.length === 0)
            return null;
        // Whitelist de campos editáveis por tabela
        const editableFields = {
            'Contacts': ['name', 'email', 'profilePicUrl'],
            'Tickets': ['status', 'queueId', 'userId'],
            'Messages': ['body', 'read'],
            'Users': ['name', 'email'],
            'Queues': ['name', 'color'],
            'Whatsapps': ['name', 'isDefault'],
            'QuickAnswers': ['shortcut', 'message'],
            'Pipelines': ['name']
        };
        const tableEditableFields = editableFields[tableName] || [];
        const result = {};
        for (const df of dataFields) {
            // Validar campo está na whitelist de editáveis
            if (!tableEditableFields.includes(df.field)) {
                logger_1.logger.warn(`FlowExecutor: Field ${df.field} not editable for table ${tableName}`);
                continue;
            }
            let value = df.value;
            // Resolver variáveis
            if (df.useVariable || (typeof value === 'string' && value.startsWith('{{'))) {
                value = this.replaceVariables(value, context);
            }
            // Sanitizar
            value = this.sanitizeValue(String(value));
            result[df.field] = value;
        }
        return Object.keys(result).length > 0 ? result : null;
    }
    // Mantém parseFilter para compatibilidade (deprecated)
    parseFilter(filterStr, context) {
        if (!filterStr || filterStr.trim() === '')
            return {};
        const resolvedFilter = this.replaceVariables(filterStr, context);
        const where = {};
        const conditions = resolvedFilter.split(/\s+and\s+/i);
        for (const condition of conditions) {
            const match = condition.match(/(\w+)\s*(=|!=|>|<|>=|<=|like)\s*["']?([^"']+)["']?/i);
            if (match) {
                const [, field, operator, value] = match;
                const cleanValue = this.sanitizeValue(value.trim());
                switch (operator.toLowerCase()) {
                    case '=':
                        where[field] = cleanValue;
                        break;
                    case '!=':
                        where[field] = { [sequelize_1.Op.ne]: cleanValue };
                        break;
                    case '>':
                        where[field] = { [sequelize_1.Op.gt]: cleanValue };
                        break;
                    case '<':
                        where[field] = { [sequelize_1.Op.lt]: cleanValue };
                        break;
                    case '>=':
                        where[field] = { [sequelize_1.Op.gte]: cleanValue };
                        break;
                    case '<=':
                        where[field] = { [sequelize_1.Op.lte]: cleanValue };
                        break;
                    case 'like':
                        where[field] = { [sequelize_1.Op.like]: `%${cleanValue}%` };
                        break;
                }
            }
        }
        return where;
    }
    async executeDatabase(session, flow, node) {
        const nodeData = node.data;
        const context = session.context;
        const { operation, tableName, 
        // NOCODE: Novos campos estruturados
        filters, // Array de filtros NOCODE
        dataFields, // Array de campos para CREATE/UPDATE
        selectedFields, // Array de campos para READ
        limit, orderByField, orderByDir, outputVariable, 
        // Legacy (deprecated)
        filter, data, fields, orderBy } = nodeData;
        logger_1.logger.info(`FlowExecutor: Database node - ${operation} on ${tableName}`);
        // Validar tabela está na whitelist
        const allowedTables = ['Contacts', 'Tickets', 'Messages', 'Users', 'Queues', 'Whatsapps', 'QuickAnswers', 'Pipelines'];
        if (!allowedTables.includes(tableName)) {
            logger_1.logger.error(`FlowExecutor: Table ${tableName} not allowed`);
            await this.sendMessage(session, `Erro: Tabela "${tableName}" não permitida.`);
            return this.proceedToNext(session, flow, node);
        }
        const Model = this.getModelByName(tableName);
        if (!Model) {
            logger_1.logger.error(`FlowExecutor: Unknown table ${tableName}`);
            await this.sendMessage(session, `Erro: Tabela "${tableName}" não encontrada.`);
            return this.proceedToNext(session, flow, node);
        }
        let result = null;
        try {
            switch (operation) {
                case 'read': {
                    // NOCODE: Usa filtros estruturados se disponíveis, senão legacy
                    const where = Array.isArray(filters) && filters.length > 0
                        ? this.parseNoCodeFilters(filters, tableName, context)
                        : this.parseFilter(filter || '', context);
                    const queryOptions = { where };
                    // NOCODE: Campos selecionados via checkbox
                    if (Array.isArray(selectedFields) && selectedFields.length > 0) {
                        queryOptions.attributes = selectedFields;
                    }
                    else if (fields && fields.trim()) {
                        queryOptions.attributes = fields.split(',').map((f) => f.trim());
                    }
                    // Limit com validação
                    const parsedLimit = parseInt(limit) || 10;
                    queryOptions.limit = Math.min(parsedLimit, 100); // Máximo 100 registros
                    // NOCODE: Ordenação via selects
                    if (orderByField) {
                        queryOptions.order = [[orderByField, (orderByDir || 'DESC').toUpperCase()]];
                    }
                    else if (orderBy && orderBy.trim()) {
                        const [field, direction] = orderBy.trim().split(/\s+/);
                        queryOptions.order = [[field, (direction || 'ASC').toUpperCase()]];
                    }
                    result = await Model.findAll(queryOptions);
                    logger_1.logger.info(`FlowExecutor: Database READ returned ${result.length} records`);
                    break;
                }
                case 'update': {
                    // NOCODE: Usa filtros estruturados
                    const where = Array.isArray(filters) && filters.length > 0
                        ? this.parseNoCodeFilters(filters, tableName, context)
                        : this.parseFilter(filter || '', context);
                    if (Object.keys(where).length === 0) {
                        logger_1.logger.error(`FlowExecutor: UPDATE without filter is not allowed`);
                        await this.sendMessage(session, `Erro: UPDATE sem filtro não é permitido.`);
                        return this.proceedToNext(session, flow, node);
                    }
                    // NOCODE: Usa dataFields estruturados se disponíveis
                    let updateData;
                    if (Array.isArray(dataFields) && dataFields.length > 0) {
                        updateData = this.buildNoCodeData(dataFields, tableName, context);
                    }
                    else if (typeof data === 'string') {
                        const resolvedData = this.replaceVariables(data, context);
                        try {
                            updateData = JSON.parse(resolvedData);
                        }
                        catch (e) {
                            logger_1.logger.error(`FlowExecutor: Invalid JSON for UPDATE: ${data}`);
                            await this.sendMessage(session, `Erro: JSON inválido para atualizar registro.`);
                            return this.proceedToNext(session, flow, node);
                        }
                    }
                    else {
                        updateData = data;
                    }
                    if (!updateData || Object.keys(updateData).length === 0) {
                        await this.sendMessage(session, `Erro: Nenhum dado para atualizar.`);
                        return this.proceedToNext(session, flow, node);
                    }
                    const [affectedRows] = await Model.update(updateData, { where });
                    result = { affectedRows };
                    logger_1.logger.info(`FlowExecutor: Database UPDATE - ${affectedRows} records affected`);
                    break;
                }
                default:
                    logger_1.logger.warn(`FlowExecutor: Unknown/disabled database operation: ${operation}`);
                    await this.sendMessage(session, `Operação ${operation} não permitida no modo NOCODE.`);
            }
            // Store result in context variable (sanitizado)
            const sanitizedOutputVar = (outputVariable || 'dbResult').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);
            if (result !== null) {
                const newContext = {
                    ...context,
                    [sanitizedOutputVar]: Array.isArray(result)
                        ? result.map(r => r.get ? r.get({ plain: true }) : r)
                        : (result.get ? result.get({ plain: true }) : result)
                };
                await session.update({ context: newContext });
                logger_1.logger.info(`FlowExecutor: Result stored in context.${sanitizedOutputVar}`);
            }
        }
        catch (err) {
            logger_1.logger.error(`FlowExecutor: Database error - ${err.message}`);
            await this.sendMessage(session, `Erro na operação de banco de dados: ${err.message}`);
        }
        return this.proceedToNext(session, flow, node);
    }
    // NOCODE: Executor do Filter Node - filtra dados de uma variável
    async executeFilter(session, flow, node) {
        const nodeData = node.data;
        const context = session.context;
        const { inputVariable, filterConditions, outputVariable } = nodeData;
        logger_1.logger.info(`FlowExecutor: Filter node - filtering ${inputVariable}`);
        // Sanitizar nome das variáveis
        const sanitizedInput = (inputVariable || '').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);
        const sanitizedOutput = (outputVariable || 'filtrado').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);
        // Obter dados da variável de entrada
        const inputData = context[sanitizedInput];
        if (!inputData) {
            logger_1.logger.warn(`FlowExecutor: Filter node - input variable '${sanitizedInput}' is empty or not found`);
            // Armazena array vazio
            const newContext = { ...context, [sanitizedOutput]: [] };
            await session.update({ context: newContext });
            return this.proceedToNext(session, flow, node);
        }
        // Garantir que temos um array para filtrar
        let dataToFilter = Array.isArray(inputData) ? inputData : [inputData];
        // Se não há condições, passa os dados sem filtrar
        if (!filterConditions || filterConditions.length === 0) {
            const newContext = { ...context, [sanitizedOutput]: dataToFilter };
            await session.update({ context: newContext });
            logger_1.logger.info(`FlowExecutor: Filter node - no conditions, passed ${dataToFilter.length} items`);
            return this.proceedToNext(session, flow, node);
        }
        // Aplicar filtros
        const filteredData = dataToFilter.filter(item => {
            return this.evaluateFilterConditions(filterConditions, item, context);
        });
        // Armazenar resultado
        const newContext = { ...context, [sanitizedOutput]: filteredData };
        await session.update({ context: newContext });
        logger_1.logger.info(`FlowExecutor: Filter node - filtered ${dataToFilter.length} -> ${filteredData.length} items`);
        return this.proceedToNext(session, flow, node);
    }
    // NOCODE: Avalia condições de filtro em um item
    evaluateFilterConditions(conditions, item, context) {
        if (!conditions || conditions.length === 0)
            return true;
        let result = true;
        for (let i = 0; i < conditions.length; i++) {
            const cond = conditions[i];
            const itemValue = String(item[cond.field] || '');
            const condValue = this.replaceVariables(cond.value || '', context);
            const condResult = this.evaluateSingleCondition(itemValue, cond.operator, condValue);
            if (i === 0) {
                result = condResult;
            }
            else if (cond.logic === 'OR') {
                result = result || condResult;
            }
            else {
                result = result && condResult;
            }
        }
        return result;
    }
    // Simulador de fluxo - executa sem enviar mensagens reais
    async simulateFlow(flow, testMessage) {
        const nodes = flow.nodes;
        const edges = flow.edges;
        const simulationLog = [];
        const responses = []; // Mensagens para exibir no chat
        const simulatedContext = {
            ticketId: 9999,
            contactId: 1234,
            contactName: "Contato Simulado",
            contactNumber: "5511999999999",
            lastInput: testMessage,
            messageBody: testMessage
        };
        // Encontrar nó inicial para detectar tipo de fluxo
        const startNode = nodes.find(n => n.type === "input" || n.type === "start" || n.type === "trigger");
        const triggerType = startNode?.data?.triggerType || "message";
        // Detectar tipo de fluxo baseado no gatilho
        const chatTriggers = ["message", "keyword", "firstContact"];
        const flowType = chatTriggers.includes(triggerType) ? "chat" : "automation";
        logger_1.logger.info(`FlowExecutor: Starting simulation for flow ${flow.id} (type: ${flowType})`);
        // Adicionar mensagem do usuário simulado
        if (flowType === "chat") {
            responses.push({
                type: "user",
                content: testMessage,
                timestamp: new Date().toISOString()
            });
        }
        simulationLog.push({
            step: 0,
            type: "start",
            status: "success",
            nodeLabel: "Gatilho",
            message: `Tipo: ${triggerType}`,
            timestamp: new Date().toISOString()
        });
        if (!startNode) {
            return {
                success: false,
                flowType,
                error: "Nenhum nó inicial encontrado no fluxo",
                log: simulationLog,
                responses
            };
        }
        let currentNodeId = startNode.id;
        let step = 1;
        const maxSteps = 50; // Limite para evitar loops infinitos
        const visitedNodes = [];
        while (currentNodeId && step <= maxSteps) {
            const node = nodes.find(n => n.id === currentNodeId);
            if (!node) {
                simulationLog.push({
                    step,
                    type: "error",
                    status: "error",
                    nodeLabel: "Desconhecido",
                    message: `Nó ${currentNodeId} não encontrado`,
                    timestamp: new Date().toISOString()
                });
                break;
            }
            // Checar loop infinito
            if (visitedNodes.filter(v => v === currentNodeId).length > 3) {
                simulationLog.push({
                    step,
                    type: "warning",
                    status: "warning",
                    nodeLabel: node.data?.label || node.type,
                    message: `Possível loop detectado`,
                    timestamp: new Date().toISOString()
                });
                break;
            }
            visitedNodes.push(currentNodeId);
            // Simular execução do nó
            const nodeResult = this.simulateNode(node, simulatedContext);
            simulationLog.push({
                step,
                type: node.type,
                status: nodeResult.error ? "error" : "success",
                nodeId: node.id,
                nodeLabel: node.data?.label || node.type,
                action: nodeResult.action,
                message: nodeResult.message,
                timestamp: new Date().toISOString()
            });
            // Adicionar resposta ao chat se houver
            if (nodeResult.wouldSend && flowType === "chat") {
                responses.push({
                    type: "bot",
                    content: nodeResult.message,
                    nodeType: node.type,
                    options: nodeResult.options,
                    timestamp: new Date().toISOString()
                });
            }
            // Atualizar contexto simulado
            if (nodeResult.contextUpdate) {
                Object.assign(simulatedContext, nodeResult.contextUpdate);
            }
            // Encontrar próximo nó
            const sourceHandle = nodeResult.sourceHandle || null;
            const edge = edges.find(e => {
                if (sourceHandle) {
                    return e.source === currentNodeId && e.sourceHandle === sourceHandle;
                }
                return e.source === currentNodeId;
            });
            if (!edge) {
                simulationLog.push({
                    step: step + 1,
                    type: "end",
                    status: "success",
                    nodeLabel: "Fim",
                    message: "Fluxo concluído",
                    timestamp: new Date().toISOString()
                });
                break;
            }
            currentNodeId = edge.target;
            step++;
        }
        if (step > maxSteps) {
            simulationLog.push({
                step,
                type: "error",
                status: "error",
                nodeLabel: "Sistema",
                message: "Limite de passos atingido (possível loop infinito)",
                timestamp: new Date().toISOString()
            });
        }
        return {
            success: true,
            flowId: flow.id,
            flowName: flow.name,
            flowType,
            triggerType,
            totalSteps: step,
            testMessage,
            log: simulationLog,
            responses,
            finalContext: simulatedContext
        };
    }
    // Simula execução de um nó individual
    simulateNode(node, context) {
        switch (node.type) {
            case "start":
            case "input":
            case "trigger":
                return {
                    action: "Gatilho disparado",
                    message: `Tipo: ${node.data?.triggerType || 'message'}`,
                    contextUpdate: {}
                };
            case "message":
                const msgContent = this.replaceVariables(node.data?.content || "Mensagem", context);
                return {
                    action: "Enviar mensagem",
                    message: msgContent,
                    wouldSend: true
                };
            case "menu":
                const menuOptions = node.data?.options || [];
                return {
                    action: "Exibir menu",
                    message: node.data?.menuTitle || "Menu",
                    options: menuOptions.map((o) => o.label),
                    wouldSend: true
                };
            case "switch":
                const conditionsA = node.data?.conditionsA || [];
                const result = this.evaluateNoCodeConditions(conditionsA, context);
                return {
                    action: "Avaliar condição",
                    message: `Condições: ${conditionsA.length}, Resultado: ${result ? 'A (verde)' : 'B (vermelho)'}`,
                    sourceHandle: result ? 'a' : 'b'
                };
            case "database":
                return {
                    action: `Database ${node.data?.operation || 'read'}`,
                    message: `Tabela: ${node.data?.tableName || 'N/A'}`,
                    contextUpdate: node.data?.outputVariable ? { [node.data.outputVariable]: "[Dados simulados]" } : {}
                };
            case "filter":
                const inputVar = node.data?.inputVariable || 'dados';
                const outputVar = node.data?.outputVariable || 'filtrado';
                const filterCount = (node.data?.filterConditions || []).length;
                return {
                    action: "Filtrar dados",
                    message: `Entrada: ${inputVar}, Saída: ${outputVar}, Filtros: ${filterCount}`,
                    contextUpdate: { [outputVar]: "[Dados filtrados simulados]" }
                };
            case "pipeline":
                return {
                    action: `Pipeline: ${node.data?.pipelineAction || 'ação'}`,
                    message: `Status: ${node.data?.newStatus || 'N/A'}`,
                    wouldUpdate: true
                };
            case "knowledge":
                return {
                    action: "Consultar conhecimento (IA)",
                    message: `Modo: ${node.data?.responseMode || 'auto'}`,
                    wouldSend: true
                };
            case "end":
            case "output":
                return {
                    action: "Finalizar fluxo",
                    message: `Ação: ${node.data?.endAction || 'none'}`
                };
            default:
                return {
                    action: `Nó desconhecido: ${node.type}`,
                    message: "Não simulado"
                };
        }
    }
    // Processamento do Nó de Conhecimento (RAG)
    async processKnowledgeNode(session, nodeData, query) {
        const context = session.context;
        if (!context.ticketId)
            return;
        const ticket = await (0, ShowTicketService_1.default)(context.ticketId);
        if (!ticket)
            return;
        const tenantId = String(ticket.tenantId);
        const knowledgeBaseId = nodeData.knowledgeBaseId;
        const responseMode = nodeData.responseMode || 'auto';
        try {
            if (!query || query.trim().length === 0) {
                await this.sendMessage(session, "Desculpe, não recebi sua pergunta. Poderia reformular?");
                return;
            }
            // Buscar chunks relevantes via VectorService
            const results = await VectorService_1.default.similaritySearch(query, tenantId, 5);
            if (results.length === 0) {
                await this.sendMessage(session, "Não encontrei informações relevantes sobre sua pergunta. Gostaria de falar com um atendente?");
                return;
            }
            // Montar contexto a partir dos chunks encontrados
            const contextText = results.map(r => r.content).join("\n\n---\n\n");
            if (responseMode === 'search') {
                // Apenas retornar os trechos encontrados (sem LLM)
                await this.sendMessage(session, `📚 *Informações encontradas:*\n\n${contextText.substring(0, 1000)}...`);
            }
            else {
                // Modo 'auto' ou 'suggest': Enviar resposta baseada no contexto
                // Em produção, chamaria um LLM aqui para gerar uma resposta humanizada
                // Por agora, enviar o contexto diretamente
                await this.sendMessage(session, `Com base nas informações disponíveis:\n\n${contextText.substring(0, 1500)}`);
            }
            // Atualizar contexto com resultado
            const newContext = { ...context, knowledgeResult: contextText.substring(0, 500) };
            await session.update({ context: newContext });
        }
        catch (err) {
            logger_1.logger.error(`FlowExecutor: Error in Knowledge Node: ${err}`);
            await this.sendMessage(session, "Houve um erro ao consultar a base de conhecimento. Tente novamente.");
        }
    }
    // Processamento do Nó de Helpdesk (Criar/Consultar Protocolo)
    async processHelpdeskNode(session, nodeData) {
        const context = session.context;
        if (!context.ticketId)
            return;
        const ticket = await (0, ShowTicketService_1.default)(context.ticketId);
        if (!ticket)
            return;
        const action = nodeData.helpdeskAction || 'createProtocol';
        const tenantId = ticket.tenantId;
        try {
            if (action === 'createProtocol') {
                // Gerar número de protocolo único
                const timestamp = Date.now();
                const random = Math.floor(Math.random() * 1000);
                const protocolNumber = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${timestamp.toString().slice(-6)}${random}`;
                // Criar protocolo
                const protocol = await Protocol_1.default.create({
                    tenantId: tenantId,
                    protocolNumber: protocolNumber,
                    ticketId: context.ticketId,
                    contactId: ticket.contactId,
                    subject: this.replaceVariables(nodeData.subject || "Protocolo via Fluxo", context),
                    description: this.replaceVariables(nodeData.description || context.lastInput || "", context),
                    status: "open",
                    priority: nodeData.priority || "medium",
                    category: nodeData.category || "Fluxo Automatizado"
                });
                logger_1.logger.info(`FlowExecutor: Protocol ${protocolNumber} created for ticket ${context.ticketId}`);
                // Atualizar contexto com número do protocolo
                const newContext = {
                    ...context,
                    protocol: protocolNumber,
                    protocolId: protocol.id
                };
                await session.update({ context: newContext });
                // Mensagem de confirmação (se configurado)
                if (nodeData.sendConfirmation !== false) {
                    await this.sendMessage(session, `✅ Protocolo criado com sucesso!\n\n📋 *Número:* ${protocolNumber}`);
                }
            }
            else if (action === 'checkStatus') {
                // Buscar protocolo mais recente do contato
                const existingProtocol = await Protocol_1.default.findOne({
                    where: {
                        contactId: ticket.contactId,
                        tenantId: tenantId
                    },
                    order: [['createdAt', 'DESC']]
                });
                if (existingProtocol) {
                    const statusMap = {
                        'open': 'Aberto',
                        'in_progress': 'Em Andamento',
                        'pending': 'Pendente',
                        'resolved': 'Resolvido',
                        'closed': 'Fechado'
                    };
                    await this.sendMessage(session, `📋 *Protocolo:* ${existingProtocol.protocolNumber}\n📊 *Status:* ${statusMap[existingProtocol.status] || existingProtocol.status}`);
                }
                else {
                    await this.sendMessage(session, "Não encontrei protocolos anteriores associados ao seu contato.");
                }
            }
        }
        catch (err) {
            logger_1.logger.error(`FlowExecutor: Error in Helpdesk Node: ${err}`);
            await this.sendMessage(session, "Houve um erro ao processar sua solicitação de protocolo.");
        }
    }
}
exports.default = new FlowExecutorService();
