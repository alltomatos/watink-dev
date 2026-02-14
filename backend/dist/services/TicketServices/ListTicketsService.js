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
const Tag_1 = __importDefault(require("../../models/Tag"));
const ListTicketsService = async ({ searchParam = "", pageNumber = "1", queueIds, status, date, showAll, userId, withUnreadMessages, isGroup, tags, tenantId, profile }) => {
    const ctx = require("../../libs/context").default.getStore();
    const effectiveTenantId = tenantId || ctx?.tenantId;
    let whereCondition = {
        [sequelize_1.Op.or]: [{ userId }, { status: "pending" }],
        tenantId: effectiveTenantId
    };
    // --- Strict Queue Filtering Fix ---
    // Fetch user to check roles and assigned queues securely
    const user = await (0, ShowUserService_1.default)(userId);
    const userQueueIds = user.queues.map(queue => queue.id);
    const isAdmin = user.roles?.some(r => r.name === "admin") || profile === "admin"; // Check both role and profile (legacy)
    if (isAdmin) {
        // Admins can see everything based on request params
        if (queueIds && queueIds.length > 0) {
            whereCondition.queueId = { [sequelize_1.Op.or]: [queueIds, null] };
        }
        // If no queueIds, admin sees all (standard behavior)
    }
    else {
        // Non-admin users are strictly limited to their assigned queues
        let effectiveQueueIds = [];
        if (queueIds && queueIds.length > 0) {
            // Intersection: Only allow requested queues that the user actually belongs to
            effectiveQueueIds = queueIds.filter(qId => userQueueIds.includes(+qId));
        }
        else {
            // Default: All user's queues
            effectiveQueueIds = userQueueIds;
        }
        // If effective queues is empty (user has no queues or requested invalid ones), 
        // they should see nothing (or only their own tickets explicitly). 
        // Existing logic implies queueId match OR null. 
        // We'll enforce the effective list. 
        // Note: [Op.or]: [effectiveQueueIds, null] allows unassigned tickets if standard behavior desires it.
        // Usually "null" means 'no queue', often handled by admins or initial flow.
        // If regular users shouldn't see 'null' queue tickets unless assigned, we might remove null.
        // However, preserving existing logic pattern:
        whereCondition.queueId = { [sequelize_1.Op.or]: [effectiveQueueIds.length > 0 ? effectiveQueueIds : [-1], null] };
    }
    // ----------------------------------
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
                },
                tenantId: effectiveTenantId
            }
        });
        // Remove o include duplicado de tags (o default required: false) se houver filtro
        includeCondition = includeCondition.filter(i => !i.model || i.model.name !== "Tag" || i.required === true);
    }
    if (showAll === "true") {
        // Maintain strict filter even when showAll is true
        if (!isAdmin) {
            whereCondition.queueId = { [sequelize_1.Op.or]: [userQueueIds.length > 0 ? userQueueIds : [-1], null] };
        }
        else {
            whereCondition = { queueId: { [sequelize_1.Op.or]: [queueIds, null] }, tenantId: effectiveTenantId };
        }
    }
    if (status) {
        whereCondition = {
            ...whereCondition,
            status,
            tenantId: effectiveTenantId
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
                    "$messages.body$": (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("messages.body")), "LIKE", `%${sanitizedSearchParam}%`)
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
        // User already fetched above
        whereCondition = {
            [sequelize_1.Op.or]: [{ userId }, { status: "pending" }],
            queueId: { [sequelize_1.Op.or]: [userQueueIds, null] },
            unreadMessages: { [sequelize_1.Op.gt]: 0 },
            tenantId: effectiveTenantId
        };
    }
    if (isGroup) {
        if (isGroup === "false") {
            whereCondition = {
                ...whereCondition,
                isGroup: false,
                "$contact.isGroup$": false,
                tenantId: effectiveTenantId
            };
        }
        else {
            // Para grupos, ignorar filtros de status/userId e buscar todos os tickets de grupo
            // AND maintain strict queue filter
            whereCondition = {
                queueId: isAdmin
                    ? { [sequelize_1.Op.or]: [queueIds, null] }
                    : { [sequelize_1.Op.or]: [userQueueIds, null] },
                [sequelize_1.Op.or]: [
                    { isGroup: true },
                    { "$contact.isGroup$": true }
                ],
                tenantId: effectiveTenantId
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
        order: [["updatedAt", "DESC"]],
        subQuery: false
    });
    const hasMore = count > offset + tickets.length;
    return {
        tickets,
        count,
        hasMore
    };
};
exports.default = ListTicketsService;
