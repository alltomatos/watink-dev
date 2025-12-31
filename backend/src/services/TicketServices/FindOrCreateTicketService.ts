import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  tenantId: number | string,
  groupContact?: Contact,
  isOldMessage?: boolean
): Promise<Ticket> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      tenantId,
      contactId: groupContact ? groupContact.id : contact.id,
      whatsappId: whatsappId
    }
  });

  if (ticket) {
    if (!isOldMessage) {
      await ticket.update({ unreadMessages });
    }
    return await ShowTicketService(ticket.id);
  }

  // Logic for Old Messages (History Sync)
  // If it's an old message and no open ticket exists, we try to find ANY ticket (including closed)
  // to avoid creating spam tickets. If none found, we create a CLOSED one.
  if (isOldMessage) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact ? groupContact.id : contact.id,
        whatsappId: whatsappId,
        tenantId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (!ticket) {
      ticket = await Ticket.create({
        contactId: groupContact ? groupContact.id : contact.id,
        status: "closed",
        isGroup: !!groupContact,
        unreadMessages: 0,
        whatsappId,
        tenantId
      });
    }

    return await ShowTicketService(ticket.id);
  }

  if (!ticket && groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id,
        whatsappId: whatsappId,
        tenantId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages
      });
    }
  }

  if (!ticket && !groupContact) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        contactId: contact.id,
        whatsappId: whatsappId,
        tenantId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages
      });
    }
  }

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId,
      tenantId
    });
  }

  ticket = await ShowTicketService(ticket.id);

  return ticket;
};

export default FindOrCreateTicketService;
