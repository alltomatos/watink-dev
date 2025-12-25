import Flow from "../../models/Flow";
import AppError from "../../errors/AppError";
import FlowTrigger from "../../models/FlowTrigger";

interface Request {
    name: string;
    nodes: object[];
    edges: object[];
    tenantId: string | number;
    userId: number;
}

const CreateFlowService = async ({
    name,
    nodes,
    edges,
    tenantId,
    userId
}: Request): Promise<Flow> => {
    const flow = await Flow.create({
        name,
        nodes,
        edges,
        tenantId,
        userId
    });

    return flow;
};

const ListFlowsService = async ({ tenantId }: { tenantId: string | number }): Promise<Flow[]> => {
    const flows = await Flow.findAll({
        where: { tenantId },
        order: [["updatedAt", "DESC"]]
    });
    return flows;
};

const UpdateFlowService = async ({
    id,
    flowData,
    tenantId
}: {
    id: number;
    flowData: Partial<Request>;
    tenantId: string | number;
}): Promise<Flow> => {
    const flow = await Flow.findOne({
        where: { id, tenantId }
    });

    if (!flow) {
        throw new AppError("Flow not found", 404);
    }

    await flow.update(flowData);

    // Sync Triggers based on Start Node
    if (flowData.nodes) {
        const startNode = (flowData.nodes as any[]).find((n: any) => n.type === "input");
        if (startNode && startNode.data && startNode.data.trigger) {
            const { type, condition } = startNode.data.trigger;
            
            // Upsert Trigger
            const existingTrigger = await FlowTrigger.findOne({ where: { flowId: id } });
            if (existingTrigger) {
                await existingTrigger.update({ type, condition, isActive: true });
            } else {
                await FlowTrigger.create({
                    flowId: id,
                    type,
                    condition,
                    tenantId,
                    isActive: true
                });
            }
        }
    }

    return flow;
};

const ShowFlowService = async ({ id, tenantId }: { id: number; tenantId: string | number }): Promise<Flow> => {
    const flow = await Flow.findOne({
        where: { id, tenantId }
    });

    if (!flow) {
        throw new AppError("Flow not found", 404);
    }

    return flow;
};

export { CreateFlowService, ListFlowsService, UpdateFlowService, ShowFlowService };
