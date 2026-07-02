import { test, expect } from "../../fixtures/auth.fixture";

/**
 * G1 — Módulo Clientes (CRM), ADR 0023 / docs/agents/clients.md.
 *
 * Segue o padrão de e2e/tests/admin/permissions.spec.ts: bate direto na API
 * via `authedApi` (Playwright APIRequestContext já autenticado como admin),
 * dados de teste com timestamp único (Date.now()) para evitar colisão entre
 * execuções, teardown em `finally`.
 *
 * Contrato exercitado (business/internal/controllers/client.go,
 * client_contact_link.go, client_address.go, client_history.go):
 *   - Client: soft-delete (DeletedAt), document cifrado at-rest (documentEnc
 *     nunca sai em JSON — json:"-" no model), SocialName exclusivo de PF.
 *   - LinkContact: 409 + requiresConfirmation quando o Contact já pertence a
 *     outro Client e confirmReassign não foi enviado; 200 com
 *     confirmReassign=true.
 *   - History: agrega Tickets/Deals transitivamente via Contact.ClientID.
 */

const API = process.env.E2E_API_URL || "http://localhost:8082/api/v1/";

test.describe("API — Clientes (CRM, ADR 0023)", () => {
  test("soft-delete: DELETE /clients/:id -> GET 404 e some da listagem", async ({ authedApi }) => {
    const stamp = Date.now();
    const uniqueName = `Cliente SoftDelete E2E ${stamp}`;
    let clientId: number | undefined;

    try {
      const createResp = await authedApi.post("clients", {
        data: { type: "pf", name: uniqueName, email: "", phone: "", notes: "" },
      });
      expect(createResp.status(), `criar client: ${await createResp.text()}`).toBe(201);
      const created = await createResp.json();
      clientId = created.id;
      expect(clientId).toBeTruthy();

      const deleteResp = await authedApi.delete(`clients/${clientId}`);
      expect(deleteResp.status(), `deletar client: ${await deleteResp.text()}`).toBe(200);

      const showResp = await authedApi.get(`clients/${clientId}`);
      expect(showResp.status(), "GET /clients/:id após delete deve ser 404").toBe(404);

      const listResp = await authedApi.get(`clients?searchParam=${encodeURIComponent(uniqueName)}`);
      expect(listResp.status()).toBe(200);
      const listBody = await listResp.json();
      const stillPresent = (listBody.clients as Array<{ id: number }>).some((cl) => cl.id === clientId);
      expect(stillPresent, "cliente soft-deletado não deve aparecer na busca por nome único").toBe(false);
    } finally {
      // Já deletado no fluxo — chamada extra é inofensiva (idempotência do teardown).
      if (clientId) await authedApi.delete(`clients/${clientId}`);
    }
  });

  test("document nunca em texto plano na chave 'documentEnc' da resposta", async ({ authedApi }) => {
    const stamp = Date.now();
    let clientId: number | undefined;

    try {
      const plainDocument = `111.444.777-${String(stamp).slice(-2)}`;
      const createResp = await authedApi.post("clients", {
        data: { type: "pf", name: `Cliente Documento E2E ${stamp}`, document: plainDocument },
      });
      expect(createResp.status(), `criar client: ${await createResp.text()}`).toBe(201);
      const body = await createResp.json();
      clientId = body.id;
      expect(clientId).toBeTruthy();

      // "document" (texto plano, o que foi enviado) deve existir na resposta.
      expect(body).toHaveProperty("document");
      expect(body.document).toBe(plainDocument);

      // "documentEnc" (ciphertext) NUNCA deve aparecer em lugar nenhum do JSON.
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain("documentEnc");
    } finally {
      if (clientId) await authedApi.delete(`clients/${clientId}`);
    }
  });

  test("PJ + socialName preenchido é rejeitado (400)", async ({ authedApi }) => {
    const stamp = Date.now();
    const resp = await authedApi.post("clients", {
      data: {
        type: "pj",
        name: `Empresa E2E ${stamp}`,
        socialName: "Nome Social Indevido",
      },
    });
    expect(resp.status(), `POST /clients PJ+socialName deve ser 400: ${await resp.text()}`).toBe(400);
    // Nada foi persistido — não há id de client para limpar neste caso.
  });

  test("fluxo de confirmação de link/unlink entre dois Clients", async ({ authedApi }) => {
    const stamp = Date.now();
    let clientAId: number | undefined;
    let clientBId: number | undefined;
    let contactId: number | undefined;

    try {
      const clientAResp = await authedApi.post("clients", {
        data: { type: "pf", name: `Cliente A E2E ${stamp}` },
      });
      expect(clientAResp.status(), `criar client A: ${await clientAResp.text()}`).toBe(201);
      clientAId = (await clientAResp.json()).id;
      expect(clientAId).toBeTruthy();

      const clientBResp = await authedApi.post("clients", {
        data: { type: "pf", name: `Cliente B E2E ${stamp}` },
      });
      expect(clientBResp.status(), `criar client B: ${await clientBResp.text()}`).toBe(201);
      clientBId = (await clientBResp.json()).id;
      expect(clientBId).toBeTruthy();

      const contactResp = await authedApi.post("contacts", {
        data: { name: `Contato Link E2E ${stamp}`, number: `55119${String(stamp).slice(-8)}` },
      });
      expect(contactResp.status(), `criar contact: ${await contactResp.text()}`).toBe(200);
      contactId = (await contactResp.json()).id;
      expect(contactId).toBeTruthy();

      // Vincula ao Client A — primeiro vínculo, sem confirmReassign, deve ser 200.
      const linkAResp = await authedApi.post(`clients/${clientAId}/contacts/${contactId}/link`);
      expect(linkAResp.status(), `link ao Client A: ${await linkAResp.text()}`).toBe(200);

      // Tenta vincular ao Client B sem confirmReassign -> 409 com dados do Client atual.
      const linkBNoConfirmResp = await authedApi.post(`clients/${clientBId}/contacts/${contactId}/link`);
      expect(linkBNoConfirmResp.status(), "link ao Client B sem confirmReassign deve ser 409").toBe(409);
      const conflictBody = await linkBNoConfirmResp.json();
      expect(conflictBody.requiresConfirmation).toBe(true);
      expect(conflictBody.currentClientId).toBe(clientAId);

      // Vincula ao Client B COM confirmReassign=true -> 200.
      const linkBConfirmResp = await authedApi.post(`clients/${clientBId}/contacts/${contactId}/link`, {
        data: { confirmReassign: true },
      });
      expect(linkBConfirmResp.status(), `link ao Client B com confirmReassign: ${await linkBConfirmResp.text()}`).toBe(
        200,
      );

      // Confirma que o Contact agora pertence ao Client B. LinkContact
      // devolve o models.Contact atualizado direto no corpo (com "clientId"
      // em JSON) — GET /contacts/:contactId NÃO serve para essa asserção
      // porque o read-path desse endpoint passa por domain.Contact
      // (business/internal/domain/models.go), que não tem campo ClientID/
      // clientId, então nunca exporia o vínculo mesmo que ele exista no banco.
      const linkedContact = await linkBConfirmResp.json();
      expect(linkedContact.clientId).toBe(clientBId);
    } finally {
      if (contactId) await authedApi.delete(`contacts/${contactId}`);
      if (clientAId) await authedApi.delete(`clients/${clientAId}`);
      if (clientBId) await authedApi.delete(`clients/${clientBId}`);
    }
  });

  // Histórico transitivo (item 5 do spec): não há POST /tickets no backend —
  // Ticket só nasce como efeito colateral do pipeline de mensagens recebidas
  // via WhatsApp (engine-go -> AMQP -> business), não existe rota de criação
  // direta e simples via API que um teste e2e possa chamar sem simular todo o
  // fluxo de mensageria. Forçar isso aqui criaria um teste frágil e acoplado
  // a infraestrutura fora do escopo deste spec (RabbitMQ/engine). Cobrimos a
  // metade estática do contrato — GET /clients/:id/history responde 200 com
  // as chaves "tickets"/"deals" (arrays), mesmo sem Tickets reais — e deixamos
  // a agregação transitiva completa (Contact -> Ticket/Deal) para um teste de
  // integração no próprio backend Go (business/internal/controllers), onde o
  // Ticket pode ser inserido diretamente via GORM sem depender do pipeline de
  // mensageria.
  test("GET /clients/:id/history responde 200 com tickets/deals (shape), sem Tickets reais", async ({
    authedApi,
  }) => {
    const stamp = Date.now();
    let clientId: number | undefined;
    let contactId: number | undefined;

    try {
      const clientResp = await authedApi.post("clients", {
        data: { type: "pf", name: `Cliente Historico E2E ${stamp}` },
      });
      expect(clientResp.status(), `criar client: ${await clientResp.text()}`).toBe(201);
      clientId = (await clientResp.json()).id;
      expect(clientId).toBeTruthy();

      const contactResp = await authedApi.post("contacts", {
        data: { name: `Contato Historico E2E ${stamp}`, number: `55129${String(stamp).slice(-8)}` },
      });
      expect(contactResp.status(), `criar contact: ${await contactResp.text()}`).toBe(200);
      contactId = (await contactResp.json()).id;
      expect(contactId).toBeTruthy();

      const linkResp = await authedApi.post(`clients/${clientId}/contacts/${contactId}/link`);
      expect(linkResp.status(), `link contact: ${await linkResp.text()}`).toBe(200);

      const historyResp = await authedApi.get(`clients/${clientId}/history`);
      expect(historyResp.status(), `history: ${await historyResp.text()}`).toBe(200);
      const historyBody = await historyResp.json();
      expect(historyBody).toHaveProperty("tickets");
      expect(historyBody).toHaveProperty("deals");
      expect(Array.isArray(historyBody.tickets)).toBe(true);
      expect(Array.isArray(historyBody.deals)).toBe(true);
      // Sem pipeline de mensageria neste teste, o Contact vinculado não tem
      // Tickets/Deals reais — a lista fica vazia, o que já valida o shape e a
      // ausência de erro na resolução transitiva quando não há histórico.
      expect(historyBody.tickets.length).toBe(0);
      expect(historyBody.deals.length).toBe(0);
    } finally {
      if (contactId) await authedApi.delete(`contacts/${contactId}`);
      if (clientId) await authedApi.delete(`clients/${clientId}`);
    }
  });

  test("POST /clients sem token retorna 401 (IsAuth roda antes do RequirePermission)", async ({ playwright }) => {
    const anon = await playwright.request.newContext({ baseURL: API });
    try {
      const resp = await anon.post("clients", {
        data: { type: "pf", name: "Não Autorizado" },
      });
      // middleware.IsAuth (business/internal/middleware/auth.go) responde 401
      // "Authorization header required" ANTES de RequirePermission rodar —
      // mesmo comportamento confirmado em tests/tickets/tickets.spec.ts para
      // GET /tickets sem auth.
      expect(resp.status(), "POST /clients sem Authorization deve ser 401").toBe(401);
    } finally {
      await anon.dispose();
    }
  });
});
