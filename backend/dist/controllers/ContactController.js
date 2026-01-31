"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.getSampleCsv = exports.importCsv = exports.batchEnrich = exports.sync = exports.remove = exports.update = exports.show = exports.store = exports.getContact = exports.index = void 0;
const Yup = __importStar(require("yup"));
const socket_1 = require("../libs/socket");
const uuid_1 = require("uuid");
const RabbitMQService_1 = __importDefault(require("../services/RabbitMQService"));
const BatchEnrichContactsService_1 = __importDefault(require("../services/ContactServices/BatchEnrichContactsService"));
const ListContactsService_1 = __importDefault(require("../services/ContactServices/ListContactsService"));
const CreateContactService_1 = __importDefault(require("../services/ContactServices/CreateContactService"));
const ShowContactService_1 = __importDefault(require("../services/ContactServices/ShowContactService"));
const UpdateContactService_1 = __importDefault(require("../services/ContactServices/UpdateContactService"));
const DeleteContactService_1 = __importDefault(require("../services/ContactServices/DeleteContactService"));
const ImportContactsService_1 = __importStar(require("../services/ContactServices/ImportContactsService"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const GetContactService_1 = __importDefault(require("../services/ContactServices/GetContactService"));
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { searchParam, pageNumber, tags } = req.query;
    const { tenantId } = req.user;
    // Converter tags para array de números se vier como string ou array
    let tagIds = [];
    if (tags) {
        if (Array.isArray(tags)) {
            tagIds = tags.map((t) => +t);
        }
        else {
            tagIds = [+tags];
        }
    }
    const { contacts, count, hasMore } = yield (0, ListContactsService_1.default)({
        searchParam,
        pageNumber,
        tags: tagIds.length > 0 ? tagIds : undefined,
        tenantId
    });
    return res.json({ contacts, count, hasMore });
});
exports.index = index;
const getContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, number } = req.body;
    const contact = yield (0, GetContactService_1.default)({
        name,
        number
    });
    return res.status(200).json(contact);
});
exports.getContact = getContact;
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    console.log(`[ContactController.store] Creating contact for user: ${JSON.stringify(req.user)}, tenantId: ${tenantId}, type: ${typeof tenantId}`);
    const newContact = req.body;
    newContact.number = newContact.number.replace("-", "").replace(" ", "");
    const schema = Yup.object().shape({
        name: Yup.string().required(),
        number: Yup.string()
            .required()
            .matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
    });
    try {
        yield schema.validate(newContact);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const validNumber = newContact.number;
    const profilePicUrl = "";
    let name = newContact.name;
    let number = validNumber;
    let email = newContact.email;
    let walletUserId = newContact.walletUserId;
    let extraInfo = newContact.extraInfo;
    let tags = newContact.tags;
    try {
        const contact = yield (0, CreateContactService_1.default)({
            name,
            number,
            email,
            extraInfo,
            profilePicUrl,
            walletUserId,
            tenantId,
            waitEnrichment: true,
            tags
        });
        const io = (0, socket_1.getIO)();
        io.emit("contact", {
            action: "create",
            contact
        });
        return res.status(200).json(contact);
    }
    catch (err) {
        console.error("Error in ContactController.store:", err);
        throw new AppError_1.default("INTERNAL_ERR_CREATING_CONTACT: " + err.message, 500);
    }
});
exports.store = store;
const show = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { contactId } = req.params;
    const contact = yield (0, ShowContactService_1.default)(contactId);
    return res.status(200).json(contact);
});
exports.show = show;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const contactData = req.body;
    const schema = Yup.object().shape({
        name: Yup.string(),
        number: Yup.string().matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
    });
    try {
        yield schema.validate(contactData);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { contactId } = req.params;
    const contact = yield (0, UpdateContactService_1.default)({ contactData, contactId });
    const io = (0, socket_1.getIO)();
    io.emit("contact", {
        action: "update",
        contact
    });
    return res.status(200).json(contact);
});
exports.update = update;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { contactId } = req.params;
    yield (0, DeleteContactService_1.default)(contactId);
    const io = (0, socket_1.getIO)();
    io.emit("contact", {
        action: "delete",
        contactId
    });
    return res.status(200).json({ message: "Contact deleted" });
});
exports.remove = remove;
const sync = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { contactId } = req.params;
    const { tenantId } = req.user;
    try {
        const contact = yield (0, ShowContactService_1.default)(contactId);
        yield RabbitMQService_1.default.publishCommand("wbot.global.contact.sync", {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            type: "contact.sync",
            payload: {
                contactId: +contactId,
                number: contact.number,
                lid: contact.lid || undefined,
                sessionId: 1
            },
            tenantId
        });
        return res.status(200).json({ message: "Contact sync scheduled via RabbitMQ." });
    }
    catch (error) {
        throw new AppError_1.default(error.message);
    }
});
exports.sync = sync;
const batchEnrich = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    if (!tenantId) {
        throw new AppError_1.default("Tenant ID not found in request", 400);
    }
    const { count } = yield (0, BatchEnrichContactsService_1.default)(tenantId);
    return res.status(200).json({ message: `Enrichment scheduled for ${count} contacts.` });
});
exports.batchEnrich = batchEnrich;
/**
 * Import contacts from CSV file
 * POST /contacts/import-csv
 *
 * Expects multipart/form-data with:
 * - file: CSV file with columns: name, number, email, walletEmail
 * - delimiter: Optional, defaults to ";" (semicolon)
 */
const importCsv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    if (!tenantId) {
        throw new AppError_1.default("Tenant ID not found in request", 400);
    }
    // Check if file was uploaded
    const file = req.file;
    if (!file) {
        throw new AppError_1.default("No file uploaded. Please provide a CSV file.", 400);
    }
    // Get delimiter from body (default to semicolon for Brazilian CSVs)
    const delimiter = req.body.delimiter || ";";
    try {
        const result = yield ImportContactsService_1.default.importFromBuffer(file.buffer, {
            tenantId,
            delimiter,
            skipHeader: true,
            batchSize: 500
        });
        const io = (0, socket_1.getIO)();
        io.emit("contact", {
            action: "import",
            result
        });
        return res.status(200).json(Object.assign({ message: `Import completed: ${result.success} of ${result.total} contacts processed` }, result));
    }
    catch (error) {
        console.error("[ContactController.importCsv] Error:", error);
        throw new AppError_1.default(`Import failed: ${error.message}`, 500);
    }
});
exports.importCsv = importCsv;
/**
 * Get sample CSV format for reference
 * GET /contacts/import-csv/sample
 */
const getSampleCsv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sampleCsv = ImportContactsService_1.ImportContactsService.getSampleCsv();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=contacts_sample.csv");
    return res.status(200).send(sampleCsv);
});
exports.getSampleCsv = getSampleCsv;
