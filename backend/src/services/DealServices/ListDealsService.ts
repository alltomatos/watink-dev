import { Op, Filterable } from "sequelize";
import Deal from "../../models/Deal";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";

interface Request {
    tenantId: number | string;
    searchParam?: string;
    pageNumber?: string;
    pipelineId?: number | string;
    stageId?: number | string;
}

interface Response {
    deals: Deal[];
    count: number;
    hasMore: boolean;
}

const ListDealsService = async ({
    tenantId,
    searchParam = "",
    pageNumber = "1",
    pipelineId,
    stageId
}: Request): Promise<Response> => {
    const whereCondition: Filterable["where"] = {
        tenantId
    };

    if (searchParam) {
        const titleFilter: any = {};
        // @ts-ignore
        titleFilter[Op.iLike] = `%${searchParam}%`;

        (whereCondition as any)[Op.or] = [
            { title: titleFilter }
        ];
    }

    if (pipelineId) {
        whereCondition.pipelineId = pipelineId;
    }

    if (stageId) {
        whereCondition.stageId = stageId;
    }

    const limit = 20;
    const offset = limit * (+pageNumber - 1);

    const { count, rows: deals } = await Deal.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        include: [
            { model: Contact, as: "contact", attributes: ["id", "name", "number", "profilePicUrl"] },
            { model: Ticket, as: "ticket", attributes: ["id", "status"] }
        ],
        order: [["updatedAt", "DESC"]]
    });

    const hasMore = count > offset + deals.length;

    return {
        deals,
        count,
        hasMore
    };
};

export default ListDealsService;
