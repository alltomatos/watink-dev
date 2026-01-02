import Client from "../../models/Client";
import ClientContact from "../../models/ClientContact";
import ClientAddress from "../../models/ClientAddress";
import AppError from "../../errors/AppError";

interface UpdateClientData {
    id: number;
    companyId: number;
    type?: string;
    name?: string;
    document?: string;
    email?: string;
    phone?: string;
    notes?: string;
    isActive?: boolean;
    contacts?: Array<{
        id?: number;
        name: string;
        role?: string;
        phone?: string;
        email?: string;
        contactId?: number;
        isPrimary?: boolean;
    }>;
    addresses?: Array<{
        id?: number;
        label?: string;
        zipCode?: string;
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        isPrimary?: boolean;
    }>;
}

const UpdateClientService = async (data: UpdateClientData): Promise<Client> => {
    const { id, companyId, contacts, addresses, ...updateData } = data;

    const client = await Client.findOne({ where: { id, companyId } });

    if (!client) {
        throw new AppError("ERR_CLIENT_NOT_FOUND", 404);
    }

    await client.update(updateData);

    // Update contacts - delete old and create new
    if (contacts !== undefined) {
        await ClientContact.destroy({ where: { clientId: id } });
        if (contacts.length > 0) {
            const contactsWithClientId = contacts.map(c => ({
                ...c,
                clientId: id
            }));
            await ClientContact.bulkCreate(contactsWithClientId);
        }
    }

    // Update addresses - delete old and create new
    if (addresses !== undefined) {
        await ClientAddress.destroy({ where: { clientId: id } });
        if (addresses.length > 0) {
            const addressesWithClientId = addresses.map(a => ({
                ...a,
                clientId: id
            }));
            await ClientAddress.bulkCreate(addressesWithClientId);
        }
    }

    const fullClient = await Client.findByPk(id, {
        include: [
            { model: ClientContact, as: "contacts" },
            { model: ClientAddress, as: "addresses" }
        ]
    });

    return fullClient!;
};

export default UpdateClientService;
