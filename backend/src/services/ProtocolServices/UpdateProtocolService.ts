import Protocol from "../../models/Protocol";
import ProtocolHistory from "../../models/ProtocolHistory";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";

interface UpdateProtocolData {
    id: number;
    companyId: number;
    userId?: number;
    subject?: string;
    description?: string;
    status?: string;
    priority?: string;
    category?: string;
    dueDate?: Date;
    resolvedAt?: Date;
    closedAt?: Date;
    comment?: string;
}

const UpdateProtocolService = async (
    data: UpdateProtocolData,
    updatedByUserId?: number
): Promise<Protocol> => {
    const { id, companyId, comment, ...updateData } = data;

    const protocol = await Protocol.findOne({ where: { id, companyId } });

    if (!protocol) {
        throw new AppError("ERR_PROTOCOL_NOT_FOUND", 404);
    }

    const previousStatus = protocol.status;
    const previousPriority = protocol.priority;

    // Handle status changes
    if (updateData.status && updateData.status !== previousStatus) {
        if (updateData.status === "resolved") {
            updateData["resolvedAt"] = new Date();
        }
        if (updateData.status === "closed") {
            updateData["closedAt"] = new Date();
        }
    }

    await protocol.update(updateData);

    // Create history entries for changes
    if (updateData.status && updateData.status !== previousStatus) {
        await ProtocolHistory.create({
            protocolId: id,
            userId: updatedByUserId,
            action: "status_changed",
            previousValue: previousStatus,
            newValue: updateData.status,
            comment: comment || `Status alterado de ${previousStatus} para ${updateData.status}`
        });
    }

    if (updateData.priority && updateData.priority !== previousPriority) {
        await ProtocolHistory.create({
            protocolId: id,
            userId: updatedByUserId,
            action: "priority_changed",
            previousValue: previousPriority,
            newValue: updateData.priority
        });
    }

    if (comment && !updateData.status) {
        await ProtocolHistory.create({
            protocolId: id,
            userId: updatedByUserId,
            action: "commented",
            comment
        });
    }

    const fullProtocol = await Protocol.findByPk(id, {
        include: [
            { model: Contact, as: "contact" },
            { model: User, as: "user" },
            { model: Ticket, as: "ticket" },
            { model: ProtocolHistory, as: "history", include: [{ model: User, as: "user" }] }
        ]
    });

    return fullProtocol!;
};

export default UpdateProtocolService;
