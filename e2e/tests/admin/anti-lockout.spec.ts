import { test, expect } from "../../fixtures/auth.fixture";

/**
 * P2-10 — Anti-lockout (ADR 0022).
 *
 * O tenant nunca pode ser deixado sem administração:
 *  - o dono do tenant (Tenant.OwnerID) não pode ser excluído (409);
 *  - o último Administrador não pode ser rebaixado para um Cargo não-Administrador (409).
 *
 * O admin do global-setup É o dono do tenant de teste (o setup cria
 * Tenant + Administrador e aponta OwnerID para ele). Descobrimos o id via
 * GET /me. Nada é criado permanentemente aqui além de um Cargo auxiliar
 * "não-Administrador" usado na tentativa de rebaixamento — limpo no teardown.
 */

test.describe("API — Anti-lockout (dono/último Administrador)", () => {
  test("não é possível excluir o dono do tenant (409)", async ({ authedApi }) => {
    const me = await authedApi.get("me");
    expect(me.status()).toBe(200);
    const ownerId = (await me.json()).id;
    expect(ownerId).toBeTruthy();

    const del = await authedApi.delete(`users/${ownerId}`);
    expect(del.status(), `DELETE dono deve ser 409, veio ${del.status()}: ${await del.text()}`).toBe(409);

    // Confirma que o dono continua listado (não foi excluído).
    const list = await authedApi.get("users");
    expect(list.status()).toBe(200);
    const body: { users: { id: number }[] } = await list.json();
    const users = Array.isArray(body) ? body : body.users ?? [];
    expect(users.some((u) => u.id === ownerId)).toBe(true);
  });

  test("não é possível rebaixar o último Administrador para outro cargo (409)", async ({ authedApi }) => {
    const me = await authedApi.get("me");
    expect(me.status()).toBe(200);
    const adminId = (await me.json()).id;

    let cargoId: number | undefined;
    try {
      // Cargo auxiliar "não-Administrador" para tentar o rebaixamento.
      const cargoResp = await authedApi.post("cargos", {
        data: { name: `Rebaixamento E2E ${Date.now()}`, description: "cargo não-Administrador", permissionIds: [] },
      });
      expect(cargoResp.status(), `criar cargo: ${await cargoResp.text()}`).toBe(201);
      cargoId = (await cargoResp.json()).id;

      // Tenta trocar o cargo do dono/último Administrador para o cargo comum → 409.
      const put = await authedApi.put(`users/${adminId}`, { data: { cargoId } });
      expect(
        put.status(),
        `PUT rebaixar último Administrador deve ser 409, veio ${put.status()}: ${await put.text()}`
      ).toBe(409);
    } finally {
      // O cargo auxiliar não chegou a ser vinculado (o UPDATE foi barrado),
      // então pode ser removido sem reatribuir usuários.
      if (cargoId) await authedApi.delete(`cargos/${cargoId}`);
    }
  });
});
