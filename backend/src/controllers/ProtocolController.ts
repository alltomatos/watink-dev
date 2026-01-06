import { Request, Response } from "express";
import CreateProtocolService from "../services/ProtocolServices/CreateProtocolService";
import ListProtocolsService from "../services/ProtocolServices/ListProtocolsService";
import ShowProtocolService from "../services/ProtocolServices/ShowProtocolService";
import UpdateProtocolService from "../services/ProtocolServices/UpdateProtocolService";

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId: tenantId, id: userId } = req.user;
    const { searchParam, pageNumber, status, priority, contactId, ticketId } = req.query;

    const { protocols, count, hasMore } = await ListProtocolsService({
        tenantId,
        searchParam: searchParam as string,
        pageNumber: pageNumber as string,
        status: status as string,
        priority: priority as string,
        contactId: contactId ? Number(contactId) : undefined,
        ticketId: ticketId ? Number(ticketId) : undefined
    });

    return res.json({ protocols, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId: tenantId, id: userId } = req.user;
    const protocolData = req.body;

    const protocol = await CreateProtocolService(
        {
            ...protocolData,
            tenantId
        },
        Number(userId)
    );

    return res.status(201).json(protocol);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId: tenantId } = req.user;
    const { protocolId } = req.params;

    const protocol = await ShowProtocolService(Number(protocolId), tenantId);

    return res.json(protocol);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId: tenantId, id: userId } = req.user;
    const { protocolId } = req.params;
    const protocolData = req.body;

    const protocol = await UpdateProtocolService(
        {
            ...protocolData,
            id: Number(protocolId),
            tenantId
        },
        Number(userId)
    );

    return res.json(protocol);
};

// Endpoint para criar protocolo diretamente de um contato (usado pelo botão no drawer)
export const createFromContact = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId: tenantId, id: userId } = req.user;
    const { contactId } = req.params;
    const { subject, description, priority, ticketId } = req.body;

    const protocol = await CreateProtocolService(
        {
            tenantId,
            contactId: Number(contactId),
            ticketId: ticketId ? Number(ticketId) : undefined,
            subject: subject || "Novo Protocolo de Atendimento",
            description,
            priority
        },
        Number(userId)
    );

    return res.status(201).json(protocol);
};
