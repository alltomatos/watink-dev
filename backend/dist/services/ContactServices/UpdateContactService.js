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
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const ContactCustomField_1 = __importDefault(require("../../models/ContactCustomField"));
const RabbitMQService_1 = __importDefault(require("../../services/RabbitMQService"));
const uuid_1 = require("uuid");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const logger_1 = require("../../utils/logger");
const UpdateContactService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ contactData, contactId }) {
    const { email, name, number, extraInfo } = contactData;
    const contact = yield Contact_1.default.findOne({
        where: { id: contactId },
        attributes: ["id", "name", "number", "email", "profilePicUrl", "tenantId"],
        include: ["extraInfo"]
    });
    if (!contact) {
        throw new AppError_1.default("ERR_NO_CONTACT_FOUND", 404);
    }
    if (extraInfo) {
        yield Promise.all(extraInfo.map((info) => __awaiter(void 0, void 0, void 0, function* () {
            yield ContactCustomField_1.default.upsert(Object.assign(Object.assign({}, info), { contactId: contact.id }));
        })));
        yield Promise.all(contact.extraInfo.map((oldInfo) => __awaiter(void 0, void 0, void 0, function* () {
            const stillExists = extraInfo.findIndex(info => info.id === oldInfo.id);
            if (stillExists === -1) {
                yield ContactCustomField_1.default.destroy({ where: { id: oldInfo.id } });
            }
        })));
    }
    const { email: newEmail, name: newName, number: newNumber, extraInfo: newExtraInfo, lid } = contactData;
    yield contact.update({
        name: newName,
        number: newNumber,
        email: newEmail,
        lid
    });
    yield contact.reload({
        attributes: ["id", "name", "number", "email", "profilePicUrl", "tenantId"],
        include: ["extraInfo"]
    });
    try {
        const tenantId = contact.tenantId || 1;
        const whatsapp = yield Whatsapp_1.default.findOne({
            where: { status: "CONNECTED", tenantId }
        });
        if (whatsapp) {
            yield RabbitMQService_1.default.publishCommand("wbot.global.contact.sync", {
                id: (0, uuid_1.v4)(),
                timestamp: Date.now(),
                type: "contact.sync",
                payload: {
                    contactId: contact.id,
                    number: contact.number,
                    sessionId: whatsapp.id
                },
                tenantId
            });
            logger_1.logger.info(`[UpdateContactService] Sent contact.sync command for contact ${contact.id}`);
        }
    }
    catch (err) {
        logger_1.logger.error(`[UpdateContactService] Error sending sync command: ${err}`);
    }
    return contact;
});
exports.default = UpdateContactService;
