"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const CreateContactService_1 = __importDefault(require("./CreateContactService"));
const GetContactService = async ({ name, number }) => {
    const numberExists = await Contact_1.default.findOne({
        where: { number }
    });
    if (!numberExists) {
        const contact = await (0, CreateContactService_1.default)({
            name,
            number
        });
        if (contact == null)
            throw new AppError_1.default("CONTACT_NOT_FIND");
        else
            return contact;
    }
    return numberExists;
};
exports.default = GetContactService;
