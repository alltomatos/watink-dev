"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Client_1 = __importDefault(require("../../models/Client"));
const ClientContact_1 = __importDefault(require("../../models/ClientContact"));
const ClientAddress_1 = __importDefault(require("../../models/ClientAddress"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const UpdateClientService = async (data) => {
    const { id, tenantId, contacts, addresses, ...updateData } = data;
    const client = await Client_1.default.findOne({ where: { id, tenantId } });
    if (!client) {
        throw new AppError_1.default("ERR_CLIENT_NOT_FOUND", 404);
    }
    await client.update(updateData);
    // Update contacts - delete old and create new
    if (contacts !== undefined) {
        await ClientContact_1.default.destroy({ where: { clientId: id } });
        if (contacts.length > 0) {
            const contactsWithClientId = [];
            for (const contact of contacts) {
                let contactId = contact.contactId;
                if (!contactId && contact.phone) {
                    const existingContact = await Contact_1.default.findOne({
                        where: { number: contact.phone, tenantId }
                    });
                    if (existingContact) {
                        contactId = existingContact.id;
                    }
                    else {
                        const newContact = await Contact_1.default.create({
                            name: contact.name,
                            number: contact.phone,
                            email: contact.email || "",
                            tenantId
                        });
                        contactId = newContact.id;
                    }
                }
                contactsWithClientId.push({
                    ...contact,
                    contactId,
                    clientId: id
                });
            }
            await ClientContact_1.default.bulkCreate(contactsWithClientId);
        }
    }
    // Update addresses - delete old and create new
    if (addresses !== undefined) {
        await ClientAddress_1.default.destroy({ where: { clientId: id } });
        if (addresses.length > 0) {
            const addressesWithClientId = addresses.map(a => ({
                ...a,
                clientId: id
            }));
            await ClientAddress_1.default.bulkCreate(addressesWithClientId);
        }
    }
    const fullClient = await Client_1.default.findByPk(id, {
        include: [
            { model: ClientContact_1.default, as: "contacts" },
            { model: ClientAddress_1.default, as: "addresses" }
        ]
    });
    return fullClient;
};
exports.default = UpdateClientService;
