import Activity from "../../models/Activity";
import ActivityItem from "../../models/ActivityItem";
import ActivityMaterial from "../../models/ActivityMaterial";
import ActivityTemplate from "../../models/ActivityTemplate";
import User from "../../models/User";
import Protocol from "../../models/Protocol";
import AppError from "../../errors/AppError";

const ShowActivityService = async (
    id: number,
    tenantId: string
): Promise<Activity> => {
    const activity = await Activity.findOne({
        where: { id, tenantId },
        include: [
            {
                model: ActivityItem,
                as: "items",
                separate: true,
                order: [["order", "ASC"]]
            },
            {
                model: ActivityMaterial,
                as: "materials"
            },
            {
                model: ActivityTemplate,
                as: "template"
            },
            {
                model: User,
                as: "user",
                attributes: ["id", "name", "email"]
            },
            {
                model: Protocol,
                as: "protocol",
                attributes: ["id", "protocolNumber", "subject", "status"]
            }
        ]
    });

    if (!activity) {
        throw new AppError("ERR_ACTIVITY_NOT_FOUND", 404);
    }

    return activity;
};

export default ShowActivityService;
