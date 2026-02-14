import "./src/database";
import Contact from "./src/models/Contact";
import Ticket from "./src/models/Ticket";
import SendWhatsAppInteractive from "./src/services/WbotServices/SendWhatsAppInteractive";
import SendWhatsAppCarousel from "./src/services/WbotServices/SendWhatsAppCarousel";
import ShowTicketService from "./src/services/TicketServices/ShowTicketService";
import CreateTicketService from "./src/services/TicketServices/CreateTicketService";

async function main() {
  const tenantId = "9de8b03a-638a-4e97-bace-6f2a0f49f0ee";
  const number = "5585998490991";

  const contact = await Contact.findOne({ where: { tenantId, number } });
  if (!contact) throw new Error("Contato não encontrado para teste");

  let ticket = await Ticket.findOne({ where: { tenantId, contactId: contact.id, status: "open" } });
  if (!ticket) {
    ticket = await CreateTicketService({ contactId: contact.id, status: "open", userId: undefined as any });
  }

  const fullTicket = await ShowTicketService(String(ticket.id));

  await SendWhatsAppInteractive({
    ticket: fullTicket as any,
    body: "[TESTE PAYLOAD] Escolha uma opção (botões)",
    buttons: [
      { id: "opt_1", label: "Opção 1" },
      { id: "opt_2", label: "Opção 2" }
    ]
  });

  await SendWhatsAppInteractive({
    ticket: fullTicket as any,
    body: "[TESTE PAYLOAD] Escolha uma opção (lista)",
    list: {
      title: "Menu de teste",
      buttonText: "Abrir lista",
      sections: [
        {
          title: "Seção principal",
          rows: [
            { id: "row_1", title: "Item 1", description: "Descrição 1" },
            { id: "row_2", title: "Item 2", description: "Descrição 2" }
          ]
        }
      ]
    }
  });

  await SendWhatsAppCarousel({
    ticket: fullTicket as any,
    body: "[TESTE PAYLOAD] Carrossel",
    cards: [
      {
        title: "Card 1",
        subtitle: "Sub 1",
        body: "Conteúdo do card 1",
        footer: "Rodapé 1",
        buttons: [
          { type: "reply", text: "Escolher", buttonId: "c1_choose" },
          { type: "url", text: "Site", url: "https://watink.com" }
        ]
      }
    ]
  });

  console.log("SENT_OK", { ticketId: ticket.id, contactId: contact.id, number });
}

main().then(() => process.exit(0)).catch((e) => { console.error("SENT_FAIL", e); process.exit(1); });
