"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const Tag_1 = __importDefault(require("../../models/Tag"));
const ListTicketsService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ searchParam = "", pageNumber = "1", queueIds, status, date, showAll, userId, withUnreadMessages, isGroup, tags, tenantId, profile }) {
    let whereCondition = {
        [sequelize_1.Op.or]: [{ userId }, { status: "pending" }],
        tenantId
    };
    // Only filter by queueId if filtering, or if user is NOT admin
    // Admins with empty queueIds should see tickets from all queues (or no queue)
    if (profile !== "admin" || (queueIds && queueIds.length > 0)) {
        whereCondition.queueId = { [sequelize_1.Op.or]: [queueIds, null] };
    }
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
        },
        {
            model: Tag_1.default,
            as: "tags",
            attributes: ["id", "name", "color", "icon"],
            required: false
        }
    ];
    if (tags && tags.length > 0) {
        includeCondition.push({
            model: Tag_1.default,
            as: "tags",
            attributes: ["id", "name", "color", "icon"],
            required: true,
            where: {
                id: {
                    [sequelize_1.Op.in]: tags
                }
            }
        });
        // Remove o include duplicado de tags (o default required: false) se houver filtro
        includeCondition = includeCondition.filter(i => !i.model || i.model.name !== "Tag" || i.required === true);
    }
    if (showAll === "true") {
        whereCondition = { queueId: { [sequelize_1.Op.or]: [queueIds, null] } };
    }
    if (status) {
        whereCondition = Object.assign(Object.assign({}, whereCondition), { status });
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
        whereCondition = Object.assign(Object.assign({}, whereCondition), { [sequelize_1.Op.or]: [
                {
                    "$contact.name$": (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("contact.name")), "LIKE", `%${sanitizedSearchParam}%`)
                },
                { "$contact.number$": { [sequelize_1.Op.iLike]: `%${sanitizedSearchParam}%` } },
                {
                    "$messages.body$": (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("messages.body")), "LIKE", `%${sanitizedSearchParam}%`)
                }
            ] });
    }
    if (date) {
        whereCondition = Object.assign(Object.assign({}, whereCondition), { createdAt: {
                [sequelize_1.Op.between]: [+(0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(date)), +(0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(date))]
            } });
    }
    if (withUnreadMessages === "true") {
        const user = yield (0, ShowUserService_1.default)(userId);
        const userQueueIds = user.queues.map(queue => queue.id);
        whereCondition = {
            [sequelize_1.Op.or]: [{ userId }, { status: "pending" }],
            queueId: { [sequelize_1.Op.or]: [userQueueIds, null] },
            unreadMessages: { [sequelize_1.Op.gt]: 0 }
        };
    }
    if (isGroup) {
        if (isGroup === "false") {
            whereCondition = Object.assign(Object.assign({}, whereCondition), { isGroup: false, "$contact.isGroup$": false });
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
    const { count, rows: tickets } = yield Ticket_1.default.findAndCountAll({
        where: whereCondition,
        include: includeCondition,
        distinct: true,
        limit,
        offset,
        order: [["updatedAt", "DESC"]],
        subQuery: false
    });
    const hasMore = count > offset + tickets.length;
    return {
        tickets,
        count,
        hasMore
    };
});
exports.default = ListTicketsService;
