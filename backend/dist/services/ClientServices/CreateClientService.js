"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Client_1 = __importDefault(require("../../models/Client"));
const ClientContact_1 = __importDefault(require("../../models/ClientContact"));
const ClientAddress_1 = __importDefault(require("../../models/ClientAddress"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const CreateClientService = async (data) => {
    const { contacts, addresses, ...clientData } = data;
    const client = await Client_1.default.create(clientData);
    if (contacts && contacts.length > 0) {
        const contactsWithClientId = [];
        for (const contact of contacts) {
            let contactId = contact.contactId;
            if (!contactId && contact.phone) {
                const existingContact = await Contact_1.default.findOne({
                    where: { number: contact.phone, tenantId: clientData.tenantId }
                });
                if (existingContact) {
                    contactId = existingContact.id;
                }
                else {
                    const newContact = await Contact_1.default.create({
                        name: contact.name,
                        number: contact.phone,
                        email: contact.email || "",
                        tenantId: clientData.tenantId
                    });
                    contactId = newContact.id;
                }
            }
            contactsWithClientId.push({
                ...contact,
                contactId,
                clientId: client.id
            });
        }
        await ClientContact_1.default.bulkCreate(contactsWithClientId);
    }
    if (addresses && addresses.length > 0) {
        const addressesWithClientId = addresses.map(a => ({
            ...a,
            clientId: client.id
        }));
        await ClientAddress_1.default.bulkCreate(addressesWithClientId);
    }
    const fullClient = await Client_1.default.findByPk(client.id, {
        include: [
            { model: ClientContact_1.default, as: "contacts" },
            { model: ClientAddress_1.default, as: "addresses" }
        ]
    });
    return fullClient;
};
exports.default = CreateClientService;
