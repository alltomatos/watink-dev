"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Message_1 = __importDefault(require("../../models/Message"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const ShowUserService_1 = __importDefault(require("../UserServices/ShowUserService"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const ListTicketsService = async ({ searchParam = "", pageNumber = "1", queueIds, status, date, showAll, userId, withUnreadMessages, isGroup }) => {
    let whereCondition = {
        [sequelize_1.Op.or]: [{ userId }, { status: "pending" }],
        queueId: { [sequelize_1.Op.or]: [queueIds, null] }
    };
    let includeCondition;
    includeCondition = [
        {
            model: Contact_1.default,
            as: "contact",
            attributes: ["id", "name", "number", "profilePicUrl", "isGroup"]
        },
        {
            model: Queue_1.default,
            as: "queue",
            attributes: ["id", "name", "color"]
        },
        {
            model: Whatsapp_1.default,
            as: "whatsapp",
            attributes: ["name"]
        }
    ];
    if (showAll === "true") {
        whereCondition = { queueId: { [sequelize_1.Op.or]: [queueIds, null] } };
    }
    if (status) {
        whereCondition = {
            ...whereCondition,
            status
        };
    }
    if (searchParam) {
        const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();
        includeCondition = [
            ...includeCondition,
            {
                model: Message_1.default,
                as: "messages",
                attributes: ["id", "body"],
                where: {
                    body: (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("body")), "LIKE", `%${sanitizedSearchParam}%`)
                },
                required: false,
                duplicating: false
            }
        ];
        whereCondition = {
            ...whereCondition,
            [sequelize_1.Op.or]: [
                {
                    "$contact.name$": (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("contact.name")), "LIKE", `%${sanitizedSearchParam}%`)
                },
                { "$contact.number$": { [sequelize_1.Op.iLike]: `%${sanitizedSearchParam}%` } },
                {
                    "$message.body$": (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("body")), "LIKE", `%${sanitizedSearchParam}%`)
                }
            ]
        };
    }
    if (date) {
        whereCondition = {
            ...whereCondition,
            createdAt: {
                [sequelize_1.Op.between]: [+(0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(date)), +(0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(date))]
            }
        };
    }
    if (withUnreadMessages === "true") {
        const user = await (0, ShowUserService_1.default)(userId);
        const userQueueIds = user.queues.map(queue => queue.id);
        whereCondition = {
            [sequelize_1.Op.or]: [{ userId }, { status: "pending" }],
            queueId: { [sequelize_1.Op.or]: [userQueueIds, null] },
            unreadMessages: { [sequelize_1.Op.gt]: 0 }
        };
    }
    if (isGroup) {
        if (isGroup === "false") {
            whereCondition = {
                ...whereCondition,
                isGroup: false,
                "$contact.isGroup$": false
            };
        }
        else {
            // Para grupos, ignorar filtros de status/userId e buscar todos os tickets de grupo
            whereCondition = {
                queueId: { [sequelize_1.Op.or]: [queueIds, null] },
                [sequelize_1.Op.or]: [
                    { isGroup: true },
                    { "$contact.isGroup$": true }
                ]
            };
        }
    }
    const limit = 40;
    const offset = limit * (+pageNumber - 1);
    const { count, rows: tickets } = await Ticket_1.default.findAndCountAll({
        where: whereCondition,
        include: includeCondition,
        distinct: true,
        limit,
        offset,
        order: [["updatedAt", "DESC"]]
    });
    const hasMore = count > offset + tickets.length;
    return {
        tickets,
        count,
        hasMore
    };
};
exports.default = ListTicketsService;
