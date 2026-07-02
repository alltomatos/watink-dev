import { test, expect } from "../../fixtures/auth.fixture";

/**
 * P3-4 — Checklist pós-login (estado derivado).
 *
 * ESCOPO / HONESTIDADE:
 * O checklist é um CARD do Dashboard (comportamento visual — fora do escopo
 * deste harness API-first). O que É testável determinísticamente é o contrato
 * dos endpoints que o hook do checklist consome para DERIVAR o estado "done":
 *
 *   - GET /setores → array de setores (item "criar setor" fica done quando a
 *     contagem excede o que o initial-setup criou automaticamente, i.e. > 1);
 *   - GET /users   → { users: [...] } (item "criar usuário" fica done com > 1).
 *
 * O estado é DERIVADO em tempo real (nunca persistido — sem flag de
 * "onboarding completo" no banco, ADR/onboarding). Aqui garantimos apenas que
 * os endpoints retornam 200 com o SHAPE esperado para o admin (alcance=tenant,
 * único que vê o checklist). A lógica de "> 1 = done" é derivação do frontend
 * e é asserida como propriedade de contagem, não como estado do card.
 */

test.describe("API — Checklist (endpoints do estado derivado)", () => {
  test("GET /setores retorna array (fonte da contagem de setores)", async ({ authedApi }) => {
    const resp = await authedApi.get("setores");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body), "GET /setores deve retornar um array").toBe(true);
    // Cada item precisa ter o shape mínimo que o hook lê para contar.
    for (const s of body) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("name");
    }
  });

  test("GET /users retorna { users: [...] } (fonte da contagem de usuários)", async ({ authedApi }) => {
    const resp = await authedApi.get("users");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty("users");
    expect(Array.isArray(body.users), "users deve ser um array").toBe(true);
    // O setup cria ao menos o Administrador → contagem >= 1.
    expect(body.users.length).toBeGreaterThanOrEqual(1);
  });

  test("derivação done: contagem cruza o limiar > 1 ao criar um segundo recurso", async ({ authedApi }) => {
    // Valida a REGRA de derivação (não o card): criar um setor adicional leva a
    // contagem de setores para > 1, que é o gatilho de "done" no frontend.
    const before = await authedApi.get("setores");
    const beforeCount = (await before.json()).length as number;

    const stamp = Date.now();
    const created = await authedApi.post("setores", { data: { name: `Checklist E2E ${stamp}` } });
    expect(created.ok(), `criar setor: ${await created.text()}`).toBeTruthy();
    const setorId = (await created.json()).id;

    try {
      const after = await authedApi.get("setores");
      const afterCount = (await after.json()).length as number;
      expect(afterCount).toBe(beforeCount + 1);
      expect(afterCount, "com >= 1 setor extra a contagem cruza o limiar > 1").toBeGreaterThan(1);
    } finally {
      await authedApi.delete(`setores/${setorId}`);
    }
  });
});
