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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Client_1 = __importDefault(require("../../models/Client"));
const ClientContact_1 = __importDefault(require("../../models/ClientContact"));
const ClientAddress_1 = __importDefault(require("../../models/ClientAddress"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const CreateClientService = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const { contacts, addresses } = data, clientData = __rest(data, ["contacts", "addresses"]);
    const client = yield Client_1.default.create(clientData);
    if (contacts && contacts.length > 0) {
        const contactsWithClientId = [];
        for (const contact of contacts) {
            let contactId = contact.contactId;
            if (!contactId && contact.phone) {
                const existingContact = yield Contact_1.default.findOne({
                    where: { number: contact.phone, tenantId: clientData.tenantId }
                });
                if (existingContact) {
                    contactId = existingContact.id;
                }
                else {
                    const newContact = yield Contact_1.default.create({
                        name: contact.name,
                        number: contact.phone,
                        email: contact.email || "",
                        tenantId: clientData.tenantId
                    });
                    contactId = newContact.id;
                }
            }
            contactsWithClientId.push(Object.assign(Object.assign({}, contact), { contactId, clientId: client.id }));
        }
        yield ClientContact_1.default.bulkCreate(contactsWithClientId);
    }
    if (addresses && addresses.length > 0) {
        const addressesWithClientId = addresses.map(a => (Object.assign(Object.assign({}, a), { clientId: client.id })));
        yield ClientAddress_1.default.bulkCreate(addressesWithClientId);
    }
    const fullClient = yield Client_1.default.findByPk(client.id, {
        include: [
            { model: ClientContact_1.default, as: "contacts" },
            { model: ClientAddress_1.default, as: "addresses" }
        ]
    });
    return fullClient;
});
exports.default = CreateClientService;
